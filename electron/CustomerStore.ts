import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import ExcelJS from 'exceljs';

export interface CustomerItem {
  id: number; // 1 to 350
  customerName: string;
  street: string;
  city: string;
  segment?: string;
  cableId?: string;
  fiberNumber: number;
  fiberType?: string;
  colorCode?: string;
  orderId?: string;
  notes?: string;
  
  status: 'pending' | 'matched' | 'exported';
  sorFileName?: string;
  sorFilePath?: string;
  sorData?: any;
  measuredAt?: string;
  technicianName?: string;
  
  customOverrides?: {
    customerName?: string;
    street?: string;
    city?: string;
    technicianName?: string;
    date?: string;
    time?: string;
    segment?: string;
    cableId?: string;
    fiberNumber?: number;
  };
}

export interface AppSettings {
  companyName: string;
  companyDept: string;
  companyContact: string;
  defaultTechnician: string;
  providerName: string;
  projectCluster: string;
  launchFiber: string;
  receiveFiber: string;
  normTitle: string;
  maxLossSplice: number;
  maxLossConnector: number;
  minOrl: number;
  otdrDeviceModel: string;
  logoBase64?: string;
  signatureBase64?: string;
  accentColor: string;
  themeMode: 'dark' | 'light';
}

export interface SettingsPreset {
  id: number;
  name: string;
  settings: AppSettings;
}

export class CustomerStore {
  private dataPath: string;
  private settingsPath: string;
  private presetsPath: string;
  private customers: CustomerItem[] = [];
  private settings: AppSettings;
  private presets: SettingsPreset[] = [];
  public readonly isFirstRun: boolean;

  constructor() {
    const userDir = path.join(app.getPath('userData'), 'otdr-studio');
    fs.mkdirSync(userDir, { recursive: true });
    this.dataPath = path.join(userDir, 'customers.json');
    this.settingsPath = path.join(userDir, 'settings.json');
    this.presetsPath = path.join(userDir, 'settings_presets.json');

    this.isFirstRun = !fs.existsSync(this.settingsPath);
    this.settings = this.loadSettings();
    this.presets = this.loadPresets();
    this.customers = this.loadCustomers();
  }

  private loadSettings(): AppSettings {
    const defaults: AppSettings = {
      companyName: 'Musterfirma GmbH',
      companyDept: 'Netzabnahme & OTDR-Qualitätsprüfung',
      companyContact: 'kontakt@musterfirma.de · Tel: +49 (0) 170 0000000',
      defaultTechnician: '',
      providerName: 'Ihr Auftraggeber / Netzbetreiber',
      projectCluster: 'Beispiel-Ausbaugebiet',
      launchFiber: '500 m Vorlauf · 500 m Nachlauf',
      receiveFiber: '500 m Nachlauf',
      normTitle: 'DIN EN 50346:2010-04 / DIN EN 60793-1-40',
      maxLossSplice: 0.15,
      maxLossConnector: 0.50,
      minOrl: 45.0,
      otdrDeviceModel: '',
      accentColor: '#3b82f6',
      themeMode: 'dark',
    };

    if (fs.existsSync(this.settingsPath)) {
      try {
        const raw = fs.readFileSync(this.settingsPath, 'utf-8');
        return { ...defaults, ...JSON.parse(raw) };
      } catch {
        return defaults;
      }
    }
    return defaults;
  }

  public saveSettings(newSettings: AppSettings): boolean {
    this.settings = newSettings;
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('Failed to save settings.json:', e);
      return false;
    }
  }

  public getSettings(): AppSettings {
    return this.settings;
  }

  private loadPresets(): SettingsPreset[] {
    if (fs.existsSync(this.presetsPath)) {
      try {
        const raw = fs.readFileSync(this.presetsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse settings_presets.json:', e);
      }
    }
    return [];
  }

  private savePresetsToDisk() {
    try {
      fs.writeFileSync(this.presetsPath, JSON.stringify(this.presets, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save settings_presets.json:', e);
    }
  }

  public getPresets(): SettingsPreset[] {
    return this.presets;
  }

  // Saving under a name that already exists overwrites that preset instead of duplicating it,
  // so a colleague's preset can just be re-saved after tweaking it.
  public savePreset(name: string, settings: AppSettings): SettingsPreset[] {
    const trimmedName = name.trim();
    const existing = this.presets.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      existing.settings = { ...settings };
    } else {
      const nextId = this.presets.reduce((max, p) => Math.max(max, p.id), 0) + 1;
      this.presets.push({ id: nextId, name: trimmedName, settings: { ...settings } });
    }
    this.savePresetsToDisk();
    return this.presets;
  }

  public deletePreset(id: number): SettingsPreset[] {
    this.presets = this.presets.filter(p => p.id !== id);
    this.savePresetsToDisk();
    return this.presets;
  }

  private loadCustomers(): CustomerItem[] {
    if (fs.existsSync(this.dataPath)) {
      try {
        const raw = fs.readFileSync(this.dataPath, 'utf-8');
        const parsed = JSON.parse(raw);
        // If it's the old dummy 350 customers list, reset to clean initial customer
        if (Array.isArray(parsed) && parsed.length === 350 && parsed[349]?.customerName?.includes('Zimmermann')) {
          const cleanInit = this.getDefaultInitialCustomers();
          this.saveCustomers(cleanInit);
          return cleanInit;
        }
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse customers.json:', e);
      }
    }
    const def = this.getDefaultInitialCustomers();
    this.saveCustomers(def);
    return def;
  }

  public saveCustomers(customers: CustomerItem[]): boolean {
    this.customers = customers;
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.customers, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('Failed to save customers.json:', e);
      return false;
    }
  }

  public getCustomers(): CustomerItem[] {
    return this.customers;
  }

  public updateCustomer(updated: CustomerItem): boolean {
    const idx = this.customers.findIndex(c => c.id === updated.id);
    if (idx === -1) return false;
    this.customers[idx] = updated;
    return this.saveCustomers(this.customers);
  }

  public getDefaultInitialCustomers(): CustomerItem[] {
    const demoSorData = {
      wavelength: '1310.0 nm',
      pulseWidth: '10 ns',
      refractiveIndex: '1.4675',
      backscatter: '-79.00 dB',
      resolution: 0.32,
      lengthMeters: 7974.1,
      totalLossDb: 2.655,
      avgLossDbPerKm: 0.333,
      orlDb: 54.2,
      events: [
        { nr: 1, distance: 0.501, loss: 0.047, reflectance: -52.71, slope: 0.256, type: 'Steckverbinder (Vorlauf ➔ NVt)', status: 'PASS' },
        { nr: 2, distance: 8.475, loss: 0.0, reflectance: -33.26, slope: 0.333, type: 'Faserende (HÜP SC/APC)', status: 'PASS' }
      ],
      tracePoints: []
    };

    const demoCustomer: CustomerItem = {
      id: 1,
      customerName: 'Max Mustermann',
      street: 'Am Stadtpark 14',
      city: '91567 Musterstadt',
      segment: 'NVt 01 (KVz-1) ➔ HÜP Mustermann (WE 01)',
      cableId: 'K-91567-NVT01-HUEP01',
      fiberNumber: 1,
      fiberType: 'Singlemode ITU-T G.657.A1 (9/125 µm)',
      colorCode: 'Rot (DIN 47100)',
      orderId: 'AUFTRAG-91567-10001',
      notes: 'Beispiel-Datensatz (Demo)',
      status: 'matched',
      sorFileName: 'Faser_001.sor',
      sorData: demoSorData,
      measuredAt: new Date().toISOString(),
    };

    return [demoCustomer];
  }

  // Reads keyword rules in priority order (specific -> generic) so a header like
  // "Faser-Nr." lands on fiberNumber, not on id, and "Kunden-Nr." lands on id, not on name.
  // Keyword lists are deliberately broad (German + English + common abbreviations) since
  // the app has to recognize whatever column headers a given company's export happens to use.
  private static detectColumns(headerCells: string[]): { colMap: Record<string, number>; score: number } {
    const colMap: Record<string, number> = {};
    let vornameCol = -1;
    let nachnameCol = -1;

    headerCells.forEach((raw, idx) => {
      const val = (raw || '').trim().toLowerCase();
      if (!val) return;
      const hasNumberWord = /\bnr\b|nr\.|nummer|\bid\b|\bnumber\b|\bno\.?\b/.test(val);

      if (val.includes('faser') || val.includes('fiber') || val.includes('strand')) {
        colMap['fiberNumber'] = idx;
      } else if (val.includes('kabel') || val.includes('cable')) {
        colMap['cableId'] = idx;
      } else if (val.includes('auftrag') || val.includes('ticket') || val.includes('order') || val.includes('bestellung') || val.includes('vorgang')) {
        colMap['orderId'] = idx;
      } else if (val.includes('nvt') || val.includes('segment') || val.includes('strecke') || val.includes('trasse') || val.includes('abschnitt') || val.includes('route') || val.includes('section')) {
        colMap['segment'] = idx;
      } else if (val.includes('plz') || val.includes('postleitzahl') || val.includes('zip') || val.includes('postal')) {
        // Separate postal-code column - combined with the city column (if any) when building the record.
        colMap['zip'] = idx;
      } else if (val.includes('ort') || val.includes('stadt') || val.includes('wohnort') || val.includes('city') || val.includes('gemeinde') || val.includes('town')) {
        colMap['city'] = idx;
      } else if (val.includes('stra') || val.includes('street') || val.includes('adresse') || val.includes('address')) {
        colMap['street'] = idx;
      } else if (val.includes('vorname') || val.includes('firstname') || val.includes('first name')) {
        vornameCol = idx;
      } else if ((val.includes('nachname') || val.includes('lastname') || val.includes('last name') || val.includes('surname')) && !hasNumberWord) {
        nachnameCol = idx;
      } else if ((val.includes('name') || val.includes('kunde') || val.includes('customer') || val.includes('client') || val.includes('kontakt') || val.includes('contact')) && !hasNumberWord) {
        // generic "Name"/"Kunde" column, but not "Kunden-Nr." (that's the job id)
        colMap['name'] = idx;
      } else if (hasNumberWord || val.includes('job')) {
        colMap['id'] = idx;
      }
    });

    if (vornameCol >= 0 || nachnameCol >= 0) {
      colMap['vorname'] = vornameCol;
      colMap['nachname'] = nachnameCol;
    }

    const score = Object.values(colMap).filter(v => v >= 0).length;
    return { colMap, score };
  }

  private static excelCellText(cell: ExcelJS.Cell): string {
    const v: any = cell.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
      if (Array.isArray(v.richText)) return v.richText.map((t: any) => t.text).join('');
      if (v.result !== undefined) return String(v.result);
      if (v.text !== undefined) return String(v.text);
      if (v instanceof Date) return v.toISOString();
      return '';
    }
    return String(v);
  }

  private static buildCustomer(
    id: number,
    get: (key: string) => string,
    existing: CustomerItem | undefined
  ): CustomerItem {
    const vorname = get('vorname');
    const nachname = get('nachname');
    const combinedName = [vorname, nachname].filter(Boolean).join(' ').trim();
    const name = combinedName || get('name') || `Kunde #${id}`;
    const street = get('street') || 'Musterstraße 1';
    // zip and city may be separate columns (e.g. "PLZ" + "Ort") or one combined column -
    // either way this ends up as "12345 Musterstadt".
    const city = [get('zip'), get('city')].filter(Boolean).join(' ').trim() || '98248 Ort';
    const segment = get('segment') || `NVt ➔ HÜP ${name}`;
    const cableId = get('cableId') || `K-JOB-${id}`;
    const fiberNrRaw = get('fiberNumber');
    const fiberNr = fiberNrRaw ? (parseInt(fiberNrRaw.replace(/[^\d]/g, ''), 10) || 1) : 1;
    const orderId = get('orderId') || `AUFTRAG-${id}`;

    return {
      id,
      customerName: name.trim(),
      street: street.trim(),
      city: city.trim(),
      segment: segment.trim(),
      cableId: cableId.trim(),
      fiberNumber: fiberNr,
      fiberType: 'Singlemode ITU-T G.657.A1 (9/125 µm)',
      colorCode: 'Rot (DIN 47100)',
      orderId: orderId.trim(),
      status: existing?.status || 'pending',
      sorFileName: existing?.sorFileName,
      sorFilePath: existing?.sorFilePath,
      sorData: existing?.sorData,
      measuredAt: existing?.measuredAt,
      technicianName: existing?.technicianName
    };
  }

  public async importExcelFile(filePath: string): Promise<{ success: boolean; count: number; error?: string; warning?: string }> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      let imported: CustomerItem[] = [];
      let warning: string | undefined;

      if (ext === '.xlsx' || ext === '.xls') {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) throw new Error('Kein Tabellenblatt gefunden.');

        // Scan the first rows for the real header row (there may be a title/tag row above it),
        // and pick whichever row recognizes the most columns - not just the first "id-ish" hit.
        let headerRowIdx = 1;
        let bestColMap: Record<string, number> = {};
        let bestScore = 0;
        const scanLimit = Math.min(25, worksheet.rowCount);

        for (let r = 1; r <= scanLimit; r++) {
          const row = worksheet.getRow(r);
          const cells: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cells[colNumber] = CustomerStore.excelCellText(cell);
          });
          const { colMap, score } = CustomerStore.detectColumns(cells);
          if (colMap['id'] !== undefined && score > bestScore) {
            bestScore = score;
            bestColMap = colMap;
            headerRowIdx = r;
          }
        }

        if (bestScore === 0) {
          warning = 'Konnte keine eindeutige Kopfzeile erkennen (Spalten "ID"/"Nr." fehlen) - bitte Spaltenüberschriften prüfen.';
        } else if (bestScore < 3) {
          warning = 'Nur wenige Spalten erkannt - bitte importierte Liste kurz prüfen (fehlende Felder wurden mit Platzhaltern gefüllt).';
        }

        const colMap = bestColMap;
        for (let r = headerRowIdx + 1; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          const cellAt = (colIdx: number | undefined) => {
            if (colIdx === undefined || colIdx < 0) return '';
            return CustomerStore.excelCellText(row.getCell(colIdx)).trim();
          };

          const rawId = colMap['id'] !== undefined ? cellAt(colMap['id']) : String(r - headerRowIdx);
          const id = parseInt(rawId.replace(/[^\d]/g, ''), 10);
          if (isNaN(id) || id <= 0) continue;

          const existing = this.customers.find(c => c.id === id);
          const get = (key: string) => cellAt(colMap[key]);
          imported.push(CustomerStore.buildCustomer(id, get, existing));
        }
      } else if (ext === '.csv') {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        const delimiter = (lines[0]?.match(/;/g)?.length || 0) >= (lines[0]?.match(/,/g)?.length || 0) ? ';' : ',';
        const splitLine = (line: string) => line.split(delimiter).map(p => p.replace(/^["']|["']$/g, '').trim());

        const headerCells = lines.length > 0 ? splitLine(lines[0]) : [];
        const { colMap, score } = CustomerStore.detectColumns(headerCells);

        // Fall back to the legacy fixed column order if the header row isn't recognized,
        // so older exports without a header still import.
        const useFallback = colMap['id'] === undefined;
        if (useFallback) {
          colMap['id'] = 0; colMap['name'] = 1; colMap['street'] = 2; colMap['city'] = 3;
          colMap['segment'] = 4; colMap['cableId'] = 5; colMap['fiberNumber'] = 6; colMap['orderId'] = 7;
          warning = 'Keine Kopfzeile mit "ID"/"Nr." erkannt - CSV wurde in der Standard-Spaltenreihenfolge (ID, Name, Straße, Ort, ...) importiert.';
        } else if (score < 3) {
          warning = 'Nur wenige Spalten in der CSV-Kopfzeile erkannt - bitte importierte Liste kurz prüfen.';
        }

        const startRow = useFallback ? 0 : 1;
        for (let i = startRow; i < lines.length; i++) {
          const parts = splitLine(lines[i]);
          const rawId = parts[colMap['id']] || '';
          const id = parseInt(rawId.replace(/[^\d]/g, ''), 10);
          if (isNaN(id) || id <= 0) continue;

          const existing = this.customers.find(c => c.id === id);
          const get = (key: string) => (colMap[key] !== undefined ? (parts[colMap[key]] || '') : '');
          imported.push(CustomerStore.buildCustomer(id, get, existing));
        }
      }

      if (imported.length > 0) {
        // A duplicate job ID in the source file would otherwise silently orphan one of the
        // rows (only the first match ever gets looked up again) - keep the last occurrence,
        // matching how a spreadsheet correction further down the sheet is usually meant to win.
        const byId = new Map<number, CustomerItem>();
        for (const c of imported) byId.set(c.id, c);
        const duplicateCount = imported.length - byId.size;
        imported = Array.from(byId.values()).sort((a, b) => a.id - b.id);
        if (duplicateCount > 0) {
          warning = `${duplicateCount} doppelte Job-ID(s) in der Liste gefunden - jeweils die letzte Zeile wurde übernommen.${warning ? ' ' + warning : ''}`;
        }

        this.saveCustomers(imported);
        return { success: true, count: imported.length, warning };
      } else {
        return { success: false, count: 0, error: 'Keine gültigen Kundendaten gefunden.' };
      }
    } catch (e: any) {
      console.error('Import error:', e);
      return { success: false, count: 0, error: e.message || 'Import fehlgeschlagen.' };
    }
  }
}
