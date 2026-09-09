import * as fs from 'fs';
import * as path from 'path';
import { parseSor } from 'sor-reader';
import type { CustomerItem } from './CustomerStore';

export class SorMatcher {
  public static scanAndMatch(dirPath: string, customers: CustomerItem[]): {
    matchedCount: number;
    matchedIds: number[];
    errors: string[];
    updatedCustomers: CustomerItem[];
  } {
    const matchedIds: number[] = [];
    const errors: string[] = [];
    const customerList = [...customers];

    // Skip OS-generated housekeeping folders - on a real USB stick .Spotlight-V100
    // alone can contain tens of thousands of files and make the recursive walk
    // effectively never reach the actual job folders.
    const SKIP_DIRS = new Set(['System Volume Information', '$RECYCLE.BIN', 'RECYCLER']);
    const isSkippableDir = (name: string) => name.startsWith('.') || SKIP_DIRS.has(name);

    const findSorFiles = (dir: string): string[] => {
      let results: string[] = [];
      try {
        const list = fs.readdirSync(dir);
        for (const file of list) {
          if (isSkippableDir(file)) continue;
          const full = path.join(dir, file);
          const stat = fs.statSync(full);
          if (stat && stat.isDirectory()) {
            results = results.concat(findSorFiles(full));
          } else if (file.toLowerCase().endsWith('.sor')) {
            results.push(full);
          }
        }
      } catch {
        // ignore unreadable
      }
      return results;
    };

    const scanRoot = path.resolve(dirPath);
    const sorFiles = findSorFiles(dirPath);

    const matchFolderId = (folderName: string): number | null => {
      const folderMatches = folderName.match(/(?:job|kunde|nr)?_?(\d+)/i);
      if (folderMatches && folderMatches[1]) {
        const parsedId = parseInt(folderMatches[1], 10);
        if (parsedId >= 1) return parsedId;
      }
      return null;
    };

    // OTDR devices often name every file "Fiber001_1310nm.sor" regardless of job
    // (001 = fiber/strand index, not a job id) and instead put each job's files
    // into its own subfolder (e.g. a folder just called "3"). So when a file is
    // nested one or more levels below the scanned root, the folder name is the
    // more reliable signal and is tried before the filename.
    const matchFileId = (fileName: string): number | null => {
      const fileMatches = fileName.match(/(?:job|kunde|nr|faser|k|c)?_?(\d+)/i);
      if (fileMatches && fileMatches[1]) {
        const parsedId = parseInt(fileMatches[1], 10);
        if (parsedId >= 1) return parsedId;
      }
      return null;
    };

    for (const filePath of sorFiles) {
      try {
        const fileName = path.basename(filePath);
        const folderName = path.basename(path.dirname(filePath));
        const isNested = path.resolve(path.dirname(filePath)) !== scanRoot;
        const buf = fs.readFileSync(filePath);
        const parsed = parseSor(new Uint8Array(buf));

        let candidateId: number | null = isNested
          ? matchFolderId(folderName) ?? matchFileId(fileName)
          : matchFileId(fileName) ?? matchFolderId(folderName);

        // Fall back to the SOR header ('cable ID', 'fiber ID', comments) if neither matched
        if (!candidateId && parsed.GenParams) {
          const combinedHeader = `${parsed.GenParams['cable ID'] || ''} ${parsed.GenParams['fiber ID'] || ''} ${parsed.GenParams.comments || ''}`;
          const headerMatches = combinedHeader.match(/(?:job|kunde|nr|id|faser)?_?\s*(\d+)/i);
          if (headerMatches && headerMatches[1]) {
            const parsedId = parseInt(headerMatches[1], 10);
            if (parsedId >= 1) candidateId = parsedId;
          }
        }

        if (candidateId) {
          const customer = customerList.find(c => c.id === candidateId);
          if (customer) {
            customer.status = 'matched';
            customer.sorFileName = fileName;
            customer.sorFilePath = filePath;
            customer.sorData = this.formatParsedSor(parsed);
            customer.measuredAt = parsed.FxdParams?.['date/time'] || new Date().toISOString();
            // Leave technicianName unset when the SOR file has no operator - the PDF export
            // falls back to the Settings default technician, which the user can edit freely.
            if (parsed.GenParams?.operator) {
              customer.technicianName = parsed.GenParams.operator;
            }
            if (!matchedIds.includes(candidateId)) matchedIds.push(candidateId);
          }
        }
      } catch (err: any) {
        errors.push(`Fehler bei ${path.basename(filePath)}: ${err.message}`);
      }
    }

    return {
      matchedCount: matchedIds.length,
      matchedIds,
      errors,
      updatedCustomers: customerList
    };
  }

  public static formatParsedSor(parsed: any): any {
    const fxd = parsed.FxdParams || {};
    const summary = parsed.KeyEvents?.Summary || {};
    const numEvents = parsed.KeyEvents?.['num events'] || 0;

    const events = [];
    let prevDist = 0;
    for (let i = 1; i <= numEvents; i++) {
      const ev = parsed.KeyEvents[`event ${i}`];
      if (!ev) continue;
      const distance = parseFloat(ev.distance) || 0;
      const rawLoss = parseFloat(ev['splice loss']) || 0;
      const loss = Math.abs(rawLoss);
      const reflectance = parseFloat(ev['refl loss']) || 0;
      const slope = parseFloat(ev.slope) || 0;

      let type = 'Fusionsspleiß';
      if (i === 1) type = distance === 0 ? 'Start (NVt)' : 'Steckverbinder (Vorlauf ➔ NVt)';
      else if (i === numEvents) type = 'Faserende (HÜP SC/APC)';
      else if (ev.type?.toLowerCase().includes('reflection')) type = 'Steckverbinder';

      const isPass = loss <= (type.includes('Steck') ? 0.5 : 0.15) && (reflectance === 0 || reflectance <= -40);

      events.push({
        nr: i,
        distance,
        loss,
        reflectance: reflectance !== 0 ? reflectance : null,
        slope,
        sectionKm: i === 1 ? distance : distance - prevDist,
        type,
        status: isPass ? 'PASS' : 'FAIL'
      });
      prevDist = distance;
    }

    const trace = parsed.trace || [];
    const step = Math.max(1, Math.ceil(trace.length / 250));
    const downsampledTrace = [];
    for (let i = 0; i < trace.length; i += step) {
      downsampledTrace.push(trace[i].power);
    }

    const launchOffset = events[0]?.distance || 0;
    const lengthMeters = Math.max(0, (summary['loss end'] || events[events.length - 1]?.distance || 0) - launchOffset) * 1000;
    const totalLossDb = summary['total loss'] || 0;

    // Ein Abnahmeprotokoll darf ausschliesslich gemessene Werte zeigen. Fruehere Fassungen haben
    // fehlende Felder mit Platzhaltern (1428.5 m, 0.684 dB, 54.2 dB, erfundene Muffen) aufgefuellt -
    // das erzeugt ein "BESTANDEN"-Protokoll aus einer Messung ohne jede Auswertung. Stattdessen
    // wird die Datenlage jetzt bewertet und fehlende Werte bleiben null.
    const rawTrace = trace.map((t: any) => t?.power).filter((v: any) => typeof v === 'number');
    const zeroCount = rawTrace.filter((v: number) => v === 0).length;
    const zeroRatio = rawTrace.length > 0 ? zeroCount / rawTrace.length : 1;
    let rises = 0;
    let falls = 0;
    for (let i = 1; i < rawTrace.length; i++) {
      if (rawTrace[i] > rawTrace[i - 1]) rises++;
      else if (rawTrace[i] < rawTrace[i - 1]) falls++;
    }
    // Eine echte OTDR-Kurve verlaeuft nahezu monoton. Liegt das Verhaeltnis nahe 50:50, ist der
    // Trace Rauschen (z. B. Messung gegen ein aktives Signal) und als Nachweis unbrauchbar.
    const monotonicity = (rises + falls) > 0 ? Math.abs(rises - falls) / (rises + falls) : 0;

    const warnings: string[] = [];
    const hasSummary = (summary['total loss'] || 0) > 0 && (summary['loss end'] || 0) > 0;
    if (!hasSummary) warnings.push('Die SOR-Datei enthaelt keine Auswertung (Summary leer): keine Streckendaempfung, keine Laenge, kein ORL.');
    if (events.length === 0) warnings.push('Keine Ereignisse in der SOR-Datei gefunden.');
    if (zeroRatio > 0.05) warnings.push(`Messkurve unbrauchbar: ${(zeroRatio * 100).toFixed(1)} % der Messpunkte sind 0.`);
    if (monotonicity < 0.5 && rawTrace.length > 50) warnings.push('Messkurve verlaeuft nicht monoton (Rauschen statt Rueckstreukurve).');

    return {
      wavelength: fxd.wavelength || null,
      pulseWidth: fxd['pulse width'] || null,
      refractiveIndex: fxd.index || null,
      backscatter: fxd.BC || null,
      resolution: fxd.resolution || null,
      lengthMeters: lengthMeters > 0 ? lengthMeters : null,
      totalLossDb: totalLossDb > 0 ? totalLossDb : null,
      // Gesamtdaempfung/Laenge ist die Streckendaempfung pro km (inkl. Ereignisse) - nicht die
      // per LSA bestimmte reine Faserdaempfung. Entsprechend wird sie im Protokoll benannt.
      avgLossDbPerKm: (lengthMeters > 0 && totalLossDb > 0) ? (totalLossDb / (lengthMeters / 1000)) : null,
      orlDb: summary.ORL > 0 ? summary.ORL : null,
      events,
      tracePoints: downsampledTrace,
      dataQuality: {
        usable: warnings.length === 0,
        hasSummary,
        zeroRatio,
        monotonicity,
        warnings
      }
    };
  }
}
