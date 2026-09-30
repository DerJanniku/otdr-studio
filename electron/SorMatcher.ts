import * as fs from 'fs';
import * as path from 'path';
import { parseSor } from 'sor-reader';
import type { CustomerItem } from './CustomerStore';

export class SorMatcher {
  public static scanAndMatch(dirPath: string, customers: CustomerItem[]): {
    matchedCount: number;
    matchedIds: number[];
    errors: string[];
    unmatched: string[];
    updatedCustomers: CustomerItem[];
  } {
    const matchedIds: number[] = [];
    const errors: string[] = [];
    const customerList = customers.map(c => ({ ...c }));

    // Skip OS-generated housekeeping folders - on a real USB stick .Spotlight-V100
    // alone can contain tens of thousands of files and make the recursive walk
    // effectively never reach the actual job folders.
    const SKIP_DIRS = new Set(['System Volume Information', '$RECYCLE.BIN', 'RECYCLER']);
    const isSkippableDir = (name: string) => name.startsWith('.') || SKIP_DIRS.has(name) || name.toUpperCase() === '_ARCHIV';

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
    const sorFiles = findSorFiles(dirPath).sort();

    // Only folder names that clearly are a job id count ("145", "Job_12", "12_Musterfrau").
    // A free-text folder like "Musterdorf Hauptstraße 1" must not be read as job 1.
    const matchFolderId = (folderName: string): number | null => {
      const m = folderName.trim().match(/^(?:job|kunde|nr|id)?[\s_-]*(\d+)(?:[\s_-].*)?$/i);
      const id = m ? parseInt(m[1], 10) : NaN;
      return id >= 1 ? id : null;
    };

    // The MTS-2000 names every file "Fiber001_1310OE.sor" - 001 is the fiber index, not a job
    // id - so a filename only counts when it starts with the id or an explicit job prefix.
    const matchFileId = (fileName: string): number | null => {
      const m = fileName.match(/^(?:job|kunde|nr|id)?[\s_-]*(\d+)(?=[\s_.-]|$)/i);
      const id = m ? parseInt(m[1], 10) : NaN;
      return id >= 1 ? id : null;
    };

    const fiberIndexOf = (fileName: string): number | null => {
      const m = fileName.match(/fiber[\s_-]*(\d+)/i);
      return m ? parseInt(m[1], 10) : null;
    };

    type Measurement = { filePath: string; fileName: string; parsed: any; sor: any; wl: number; fiberIndex: number | null };
    const byCustomer = new Map<number, Measurement[]>();
    const unmatched: string[] = [];

    for (const filePath of sorFiles) {
      const rel = path.relative(scanRoot, filePath);
      try {
        const fileName = path.basename(filePath);
        const folderName = path.basename(path.dirname(filePath));
        const isNested = path.resolve(path.dirname(filePath)) !== scanRoot;
        const parsed = parseSor(new Uint8Array(fs.readFileSync(filePath)));

        let candidateId: number | null = matchFileId(fileName) ?? (isNested ? matchFolderId(folderName) : null);

        // Fall back to the SOR header ('cable ID', 'fiber ID', comments) if neither matched
        if (!candidateId && parsed.GenParams) {
          const combinedHeader = `${parsed.GenParams['cable ID'] || ''} ${parsed.GenParams['fiber ID'] || ''} ${parsed.GenParams.comments || ''}`;
          const headerMatches = combinedHeader.match(/(?:job|kunde|nr|id)[\s_:-]*(\d+)/i);
          if (headerMatches) {
            const parsedId = parseInt(headerMatches[1], 10);
            if (parsedId >= 1) candidateId = parsedId;
          }
        }

        if (!candidateId || !customerList.some(c => c.id === candidateId)) {
          unmatched.push(rel);
          continue;
        }
        const sor = this.formatParsedSor(parsed);
        const wl = parseFloat(String(sor.wavelength ?? '').replace(/[^0-9.]/g, '')) || 0;
        const list = byCustomer.get(candidateId) || [];
        list.push({ filePath, fileName, parsed, sor, wl, fiberIndex: fiberIndexOf(fileName) });
        byCustomer.set(candidateId, list);
      } catch (err: any) {
        errors.push(`Fehler bei ${rel}: ${err.message}`);
      }
    }

    // Primary = usable measurement at the longest wavelength (1550 nm reacts to macrobends).
    // Latest file per wavelength wins when a fiber was measured twice.
    const evaluate = (group: Measurement[]) => {
      const perWl = new Map<number, Measurement>();
      for (const m of group) perWl.set(m.wl, m);
      const ranked = [...perWl.values()].sort((a, b) =>
        Number(!!b.sor.dataQuality?.usable) - Number(!!a.sor.dataQuality?.usable) || b.wl - a.wl);
      const primary = ranked[0];
      const secondary = ranked.find(m => m !== primary && Math.abs(m.wl - primary.wl) > 100);
      let macrobendWarning: string | undefined;
      if (secondary) {
        const [low, high] = primary.wl < secondary.wl ? [primary, secondary] : [secondary, primary];
        const lossLow = low.sor.totalLossDb;
        const lossHigh = high.sor.totalLossDb;
        if (typeof lossLow === 'number' && typeof lossHigh === 'number' && lossHigh - lossLow > 0.5) {
          macrobendWarning = `Verdacht auf Makrobiegung / Faserknick in Kassette: Dämpfung bei ${high.wl.toFixed(0)} nm (${lossHigh.toFixed(2)} dB) ist um ${(lossHigh - lossLow).toFixed(2)} dB höher als bei ${low.wl.toFixed(0)} nm (${lossLow.toFixed(2)} dB).`;
        }
      }
      return { primary, secondary, macrobendWarning };
    };

    for (const [id, all] of byCustomer) {
      const customer = customerList.find(c => c.id === id)!;

      // A job folder can hold several strands (Fiber001 + Fiber002, e.g. two dwelling units).
      // Each strand gets its own protocol; the one matching the list's fiber number (else the
      // lowest) is the primary one - strands are never mixed within one protocol.
      const indices = [...new Set(all.map(m => m.fiberIndex ?? 0))].sort((a, b) => a - b);
      const chosenIndex = indices.includes(customer.fiberNumber) ? customer.fiberNumber : indices[0];
      if (indices.length > 1) {
        errors.push(`Job #${id}: ${indices.length} Fasern gemessen (${indices.join(', ')}) - für jede Faser wird ein eigenes Protokoll erstellt. Bitte prüfen, ob das zur Zahl der Wohneinheiten passt.`);
      }

      const main = evaluate(all.filter(m => (m.fiberIndex ?? 0) === chosenIndex));
      customer.macrobendWarning = main.macrobendWarning;
      customer.secondarySorData = main.secondary?.sor;
      customer.status = 'matched';
      customer.sorFileName = main.primary.fileName;
      customer.sorFilePath = main.primary.filePath;
      customer.sorData = main.primary.sor;
      customer.measuredAt = this.plausibleDate(main.primary.parsed.FxdParams?.['date/time']);
      if (main.primary.parsed.GenParams?.operator) {
        customer.technicianName = main.primary.parsed.GenParams.operator;
      }
      // Without a fiber column the list says nothing about the strand - the device's strand number is real data.
      if (!customer.fiberNumberFromList && chosenIndex > 0) customer.fiberNumber = chosenIndex;

      customer.additionalFibers = indices.filter(i => i !== chosenIndex).map(i => {
        const ev = evaluate(all.filter(m => (m.fiberIndex ?? 0) === i));
        return {
          fiberNumber: i,
          sorFileName: ev.primary.fileName,
          sorFilePath: ev.primary.filePath,
          sorData: ev.primary.sor,
          secondarySorData: ev.secondary?.sor,
          macrobendWarning: ev.macrobendWarning,
        };
      });
      if (customer.additionalFibers.length === 0) customer.additionalFibers = undefined;
      matchedIds.push(id);
    }

    return {
      matchedCount: matchedIds.length,
      matchedIds: matchedIds.sort((a, b) => a - b),
      errors,
      unmatched,
      updatedCustomers: customerList
    };
  }

  // The MTS-2000 writes its own clock into the file; with an unset clock that is January 2000.
  // Such a date must not end up in an acceptance report, so the import time is used instead.
  public static plausibleDate(raw: unknown): string {
    const d = new Date(String(raw ?? '').replace(/\s*\(.*\)\s*$/, ''));
    return !isNaN(d.getTime()) && d.getFullYear() >= 2015 ? d.toISOString() : new Date().toISOString();
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
    // Only the fiber itself (launch event to end event) is judged. Behind the fiber end the
    // trace is the noise floor and legitimately full of zeros.
    const firstKm = events[0]?.distance ?? 0;
    const endKm = events.length >= 2 ? events[events.length - 1].distance : 0;
    const fiberTrace = trace
      .filter((t: any) => typeof t?.power === 'number' && t.distance >= firstKm && t.distance <= endKm)
      .map((t: any) => t.power as number);
    const zeroRatio = fiberTrace.length > 0 ? fiberTrace.filter((v: number) => v === 0).length / fiberTrace.length : 0;

    const warnings: string[] = [];
    const hasSummary = (summary['total loss'] || 0) > 0 && (summary['loss end'] || 0) > 0;
    if (!hasSummary) warnings.push('Die SOR-Datei enthält keine Auswertung (Summary leer): keine Streckendämpfung, keine Länge.');
    if (events.length < 2) warnings.push('Kein Faserende erkannt - die Messung enthält nur ein Ereignis.');
    else if (endKm - firstKm < 0.005) warnings.push('Faserende liegt direkt am Startereignis - Strecke nicht gemessen.');
    // A measurement against an active (lit) fiber shows up as dropouts inside the fiber section.
    if (zeroRatio > 0.05) warnings.push(`Messkurve unbrauchbar: ${(zeroRatio * 100).toFixed(1)} % der Messpunkte innerhalb der Faser sind 0.`);

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
        warnings
      }
    };
  }
}
