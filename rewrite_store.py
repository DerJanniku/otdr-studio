import os

code = """import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import ExcelJS from 'exceljs';
import { getFiberColorInfo } from './fiberColors';
import { Project, Cluster, KVZ, CustomerItem, AppSettings, ExcelColumnMapping } from '../src/types';

export interface SettingsPreset {
  id: number;
  name: string;
  settings: AppSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'Firma Muster GmbH',
  companyDept: 'Glasfaserausbau',
  companyContact: 'Max Mustermann',
  defaultTechnician: 'M. Mustermann',
  providerName: 'Provider GmbH',
  projectCluster: 'Projektgebiet Nord',
  launchFiber: '1000 m Vorlauf',
  receiveFiber: '500 m Nachlauf',
  normTitle: 'DIN EN 50346:2010-04 / DIN EN 60793-1-40',
  maxLossSplice: 0.15,
  maxLossConnector: 0.50,
  minOrl: 45.0,
  otdrDeviceModel: '',
  accentColor: '#3b82f6',
  themeMode: 'dark',
};

export class CustomerStore {
  private dataDir: string;
  private settingsFile: string;
  private presetsFile: string;
  
  private projectsFile: string;
  private clustersFile: string;
  private kvzsFile: string;
  
  private activeProjectId: string = '';
  private activeClusterId: string = '';
  private activeKvzId: string = '';
  
  private settings: AppSettings = DEFAULT_SETTINGS;
  private presets: SettingsPreset[] = [];
  
  private projects: Project[] = [];
  private clusters: Cluster[] = [];
  private kvzs: KVZ[] = [];
  private customers: CustomerItem[] = [];
  
  public readonly isFirstRun: boolean;

  constructor() {
    this.dataDir = path.join(app.getPath('userData'), 'OtdrBatchStudioData');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    this.settingsFile = path.join(this.dataDir, 'settings.json');
    this.presetsFile = path.join(this.dataDir, 'presets.json');
    this.projectsFile = path.join(this.dataDir, 'projects.json');
    this.clustersFile = path.join(this.dataDir, 'clusters.json');
    this.kvzsFile = path.join(this.dataDir, 'kvzs.json');
    
    this.isFirstRun = !fs.existsSync(this.settingsFile);
    this.loadSettings();
    this.loadPresets();
    this.loadDataFiles();
  }

  private loadSettings() {
    if (fs.existsSync(this.settingsFile)) {
      try {
        const raw = fs.readFileSync(this.settingsFile, 'utf-8');
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    } else {
      this.saveSettings(this.settings);
    }
  }

  public saveSettings(newSettings: AppSettings): boolean {
    this.settings = { ...this.settings, ...newSettings };
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('Error saving settings:', e);
      return false;
    }
  }

  public getSettings(): AppSettings {
    return this.settings;
  }

  private loadPresets() {
    if (fs.existsSync(this.presetsFile)) {
      try {
        this.presets = JSON.parse(fs.readFileSync(this.presetsFile, 'utf-8'));
      } catch (e) {
        console.error('Failed to load presets:', e);
      }
    }
  }

  public getPresets(): SettingsPreset[] {
    return this.presets;
  }

  public savePreset(name: string, settings: AppSettings): SettingsPreset[] {
    const id = Date.now();
    this.presets.push({ id, name, settings });
    fs.writeFileSync(this.presetsFile, JSON.stringify(this.presets, null, 2), 'utf-8');
    return this.presets;
  }

  public deletePreset(id: number): SettingsPreset[] {
    this.presets = this.presets.filter(p => p.id !== id);
    fs.writeFileSync(this.presetsFile, JSON.stringify(this.presets, null, 2), 'utf-8');
    return this.presets;
  }

  private loadDataFiles() {
    if (fs.existsSync(this.projectsFile)) {
      try { this.projects = JSON.parse(fs.readFileSync(this.projectsFile, 'utf-8')); } catch (e) {}
    }
    if (fs.existsSync(this.clustersFile)) {
      try { this.clusters = JSON.parse(fs.readFileSync(this.clustersFile, 'utf-8')); } catch (e) {}
    }
    if (fs.existsSync(this.kvzsFile)) {
      try { this.kvzs = JSON.parse(fs.readFileSync(this.kvzsFile, 'utf-8')); } catch (e) {}
    }
  }
  
  // PROJECTS
  public getProjects(): Project[] {
    return this.projects;
  }
  
  public getActiveProjectId(): string {
    return this.activeProjectId;
  }

  public getActiveProject(): Project | null {
    return this.projects.find(p => p.id === this.activeProjectId) || null;
  }

  public setActiveProject(id: string): { success: boolean; project: Project | null } {
    const p = this.projects.find(x => x.id === id);
    if (!p) {
      this.activeProjectId = '';
      return { success: false, project: null };
    }
    this.activeProjectId = p.id;
    return { success: true, project: p };
  }

  public createProject(data: Partial<Project>): Project {
    const newProj: Project = {
      id: Date.now().toString(),
      name: data.name || 'Neues Projekt',
      providerName: data.providerName || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.push(newProj);
    fs.writeFileSync(this.projectsFile, JSON.stringify(this.projects, null, 2), 'utf-8');
    return newProj;
  }

  public updateProject(updated: Project): Project {
    const idx = this.projects.findIndex(p => p.id === updated.id);
    if (idx !== -1) {
      this.projects[idx] = { ...updated, updatedAt: new Date().toISOString() };
      fs.writeFileSync(this.projectsFile, JSON.stringify(this.projects, null, 2), 'utf-8');
      return this.projects[idx];
    }
    return updated;
  }

  public deleteProject(id: string): boolean {
    this.projects = this.projects.filter(p => p.id !== id);
    fs.writeFileSync(this.projectsFile, JSON.stringify(this.projects, null, 2), 'utf-8');
    // Also cleanup cascaded files, optional but nice.
    return true;
  }

  // CLUSTERS
  public getClusters(projectId: string): Cluster[] {
    return this.clusters.filter(c => c.projectId === projectId);
  }
  
  public createCluster(projectId: string, data: Partial<Cluster>): Cluster {
    const newCluster: Cluster = {
      id: Date.now().toString(),
      projectId,
      name: data.name || 'Neues Ausbaugebiet',
      sharepointPath: data.sharepointPath || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.clusters.push(newCluster);
    fs.writeFileSync(this.clustersFile, JSON.stringify(this.clusters, null, 2), 'utf-8');
    return newCluster;
  }

  public updateCluster(updated: Cluster): Cluster {
    const idx = this.clusters.findIndex(c => c.id === updated.id);
    if (idx !== -1) {
      this.clusters[idx] = { ...updated, updatedAt: new Date().toISOString() };
      fs.writeFileSync(this.clustersFile, JSON.stringify(this.clusters, null, 2), 'utf-8');
      return this.clusters[idx];
    }
    return updated;
  }
  
  public deleteCluster(id: string): boolean {
    this.clusters = this.clusters.filter(c => c.id !== id);
    fs.writeFileSync(this.clustersFile, JSON.stringify(this.clusters, null, 2), 'utf-8');
    return true;
  }

  // KVZs
  public getKvzs(clusterId: string): KVZ[] {
    return this.kvzs.filter(k => k.clusterId === clusterId);
  }
  
  public createKvz(clusterId: string, data: Partial<KVZ>): KVZ {
    const newKvz: KVZ = {
      id: Date.now().toString(),
      clusterId,
      name: data.name || 'Neuer KVZ / NVT',
      measurements: data.measurements || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.kvzs.push(newKvz);
    fs.writeFileSync(this.kvzsFile, JSON.stringify(this.kvzs, null, 2), 'utf-8');
    return newKvz;
  }
  
  public updateKvz(updated: KVZ): KVZ {
    const idx = this.kvzs.findIndex(k => k.id === updated.id);
    if (idx !== -1) {
      this.kvzs[idx] = { ...updated, updatedAt: new Date().toISOString() };
      fs.writeFileSync(this.kvzsFile, JSON.stringify(this.kvzs, null, 2), 'utf-8');
      return this.kvzs[idx];
    }
    return updated;
  }
  
  public deleteKvz(id: string): boolean {
    this.kvzs = this.kvzs.filter(k => k.id !== id);
    fs.writeFileSync(this.kvzsFile, JSON.stringify(this.kvzs, null, 2), 'utf-8');
    return true;
  }

  // CUSTOMERS
  private getCustomersFile(kvzId: string): string {
    return path.join(this.dataDir, `customers_${kvzId}.json`);
  }

  public getCustomers(kvzId: string): CustomerItem[] {
    const file = this.getCustomersFile(kvzId);
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch (e) {
        console.error('Error loading customers:', e);
      }
    }
    return [];
  }

  public saveCustomers(kvzId: string, customers: CustomerItem[]): boolean {
    const file = this.getCustomersFile(kvzId);
    try {
      fs.writeFileSync(file, JSON.stringify(customers, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('Error saving customers:', e);
      return false;
    }
  }

  public updateCustomer(kvzId: string, updated: CustomerItem): boolean {
    const customers = this.getCustomers(kvzId);
    const idx = customers.findIndex(c => c.id === updated.id);
    if (idx !== -1) {
      customers[idx] = updated;
      return this.saveCustomers(kvzId, customers);
    }
    return false;
  }

  // EXCEL IMPORT
  public static detectColumns(
    headerRow: string[],
    userOverrides?: Partial<ExcelColumnMapping>
  ): { colMap: Record<string, number>; score: number } {
    const colMap: Record<string, number> = {};
    const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const aliases = {
      id: ['id', 'nr', 'job', 'vorgang', 'kunde', 'knd', 'kundenid', 'auftrag'],
      customerName: ['name', 'kunde', 'auftraggeber', 'anschlussinhaber'],
      firstName: ['vorname', 'vor'],
      lastName: ['nachname', 'nach'],
      street: ['strasse', 'straße', 'str', 'adresse', 'anschrift'],
      zip: ['plz', 'postleitzahl'],
      city: ['ort', 'stadt', 'city'],
      segment: ['segment', 'bereich', 'nvt', 'gebiet', 'cluster', 'verteiler'],
      cableId: ['kabel', 'cable', 'kabelid', 'stammkabel'],
      fiberNumber: ['faser', 'fiber', 'fasernr', 'fasernummer', 'ader'],
      orderId: ['auftrag', 'order', 'bestellung', 'projekt'],
    };

    let vornameCol = -1;
    let nachnameCol = -1;

    headerRow.forEach((cellRaw, idx) => {
      const cell = norm(cellRaw);
      if (!cell) return;
      const substringMatch = (list: string[]) => list.some(a => cell.includes(a));
      const hasNumberWord = cell.includes('nr') || cell.includes('nummer') || cell.includes('id');
      const isTelefonOrHaus = cell.includes('telefon') || cell.includes('haus') || cell.includes('mail') || cell.includes('bemerkung');

      if (isTelefonOrHaus) return;

      if (userOverrides) {
        if (userOverrides.customerName && norm(userOverrides.customerName) === cell) { colMap['name'] = idx; return; }
        if (userOverrides.firstName && norm(userOverrides.firstName) === cell) { vornameCol = idx; return; }
        if (userOverrides.lastName && norm(userOverrides.lastName) === cell) { nachnameCol = idx; return; }
        if (userOverrides.street && norm(userOverrides.street) === cell) { colMap['street'] = idx; return; }
        if (userOverrides.zip && norm(userOverrides.zip) === cell) { colMap['zip'] = idx; return; }
        if (userOverrides.city && norm(userOverrides.city) === cell) { colMap['city'] = idx; return; }
        if (userOverrides.segment && norm(userOverrides.segment) === cell) { colMap['segment'] = idx; return; }
        if (userOverrides.cableId && norm(userOverrides.cableId) === cell) { colMap['cableId'] = idx; return; }
        if (userOverrides.fiberNumber && norm(userOverrides.fiberNumber) === cell) { colMap['fiberNumber'] = idx; return; }
        if (userOverrides.orderId && norm(userOverrides.orderId) === cell) { colMap['orderId'] = idx; return; }
        if (userOverrides.id && norm(userOverrides.id) === cell) { colMap['id'] = idx; return; }
      }

      if (colMap['cableId'] === undefined && substringMatch(aliases.cableId)) colMap['cableId'] = idx;
      else if (colMap['fiberNumber'] === undefined && substringMatch(aliases.fiberNumber)) colMap['fiberNumber'] = idx;
      else if (colMap['segment'] === undefined && substringMatch(aliases.segment)) colMap['segment'] = idx;
      else if (colMap['orderId'] === undefined && substringMatch(aliases.orderId) && !substringMatch(aliases.id)) colMap['orderId'] = idx;
      else if (colMap['street'] === undefined && substringMatch(aliases.street)) colMap['street'] = idx;
      else if (colMap['zip'] === undefined && substringMatch(aliases.zip)) colMap['zip'] = idx;
      else if (colMap['city'] === undefined && substringMatch(aliases.city)) colMap['city'] = idx;
      else if (vornameCol === -1 && substringMatch(aliases.firstName)) vornameCol = idx;
      else if (nachnameCol === -1 && substringMatch(aliases.lastName) && !hasNumberWord) nachnameCol = idx;
      else if (colMap['name'] === undefined && substringMatch(aliases.customerName) && !hasNumberWord) colMap['name'] = idx;
      else if (colMap['id'] === undefined && !isTelefonOrHaus && (substringMatch(aliases.id) || hasNumberWord || cell.includes('job'))) colMap['id'] = idx;
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
    kvzId: string,
    get: (key: string) => string,
    existing: CustomerItem | undefined
  ): CustomerItem {
    const vorname = get('vorname');
    const nachname = get('nachname');
    const combinedName = [vorname, nachname].filter(Boolean).join(' ').trim();
    const name = combinedName || get('name') || `Kunde #${id}`;
    const street = get('street') || 'Musterstraße 1';
    const city = [get('zip'), get('city')].filter(Boolean).join(' ').trim() || '98248 Ort';
    const segment = get('segment') || `NVt ➔ HÜP ${name}`;
    const cableId = get('cableId') || `K-JOB-${id}`;
    const fiberNrRaw = get('fiberNumber');
    const fiberNr = fiberNrRaw ? (parseInt(fiberNrRaw.replace(/[^\d]/g, ''), 10) || 1) : 1;
    const orderId = get('orderId') || `AUFTRAG-${id}`;
    const fiberInfo = getFiberColorInfo(fiberNr);

    return {
      id,
      kvzId,
      customerName: name.trim(),
      street: street.trim(),
      city: city.trim(),
      segment: segment.trim(),
      cableId: cableId.trim(),
      fiberNumber: fiberNr,
      fiberType: existing?.fiberType || 'Singlemode ITU-T G.657.A1 (9/125 µm)',
      colorCode: fiberInfo.label,
      orderId: orderId.trim(),
      notes: existing?.notes,
      status: existing?.status || 'pending',
      sorFileName: existing?.sorFileName,
      sorFilePath: existing?.sorFilePath,
      sorData: existing?.sorData,
      secondarySorData: existing?.secondarySorData,
      macrobendWarning: existing?.macrobendWarning,
      measuredAt: existing?.measuredAt,
      technicianName: existing?.technicianName,
      customOverrides: existing?.customOverrides,
    };
  }

  public async importExcelFile(kvzId: string, filePath: string): Promise<{ success: boolean; count: number; warning?: string; error?: string }> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      let imported: CustomerItem[] = [];
      let warning: string | undefined;

      let customers = this.getCustomers(kvzId);

      if (ext === '.xlsx' || ext === '.xls') {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) throw new Error('Kein Tabellenblatt gefunden.');

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
          const { colMap, score } = CustomerStore.detectColumns(cells, this.settings.columnMapping);
          if (colMap['id'] !== undefined && score > bestScore) {
            bestScore = score;
            bestColMap = colMap;
            headerRowIdx = r;
          }
        }

        if (bestScore === 0) {
          warning = 'Konnte keine eindeutige Kopfzeile erkennen (Spalten "ID"/"Nr." fehlen) - bitte Spaltenüberschriften prüfen.';
        } else if (bestScore < 3) {
          warning = 'Nur wenige Spalten erkannt - bitte importierte Liste kurz prüfen.';
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

          const existing = customers.find(c => c.id === id);
          const get = (key: string) => cellAt(colMap[key]);
          imported.push(CustomerStore.buildCustomer(id, kvzId, get, existing));
        }
      } else if (ext === '.csv') {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\\n').map(l => l.trim()).filter(Boolean);
        const delimiter = (lines[0]?.match(/;/g)?.length || 0) >= (lines[0]?.match(/,/g)?.length || 0) ? ';' : ',';
        const splitLine = (line: string) => line.split(delimiter).map(p => p.replace(/^["']|["']$/g, '').trim());

        const headerCells = lines.length > 0 ? splitLine(lines[0]) : [];
        const { colMap, score } = CustomerStore.detectColumns(headerCells, this.settings.columnMapping);

        const useFallback = colMap['id'] === undefined;
        if (useFallback) {
          colMap['id'] = 0; colMap['name'] = 1; colMap['street'] = 2; colMap['city'] = 3;
          colMap['segment'] = 4; colMap['cableId'] = 5; colMap['fiberNumber'] = 6; colMap['orderId'] = 7;
          warning = 'Keine Kopfzeile mit "ID"/"Nr." erkannt - CSV wurde in der Standard-Spaltenreihenfolge importiert.';
        } else if (score < 3) {
          warning = 'Nur wenige Spalten in der CSV-Kopfzeile erkannt - bitte importierte Liste kurz prüfen.';
        }

        const startRow = useFallback ? 0 : 1;
        for (let i = startRow; i < lines.length; i++) {
          const parts = splitLine(lines[i]);
          const rawId = parts[colMap['id']] || '';
          const id = parseInt(rawId.replace(/[^\d]/g, ''), 10);
          if (isNaN(id) || id <= 0) continue;

          const existing = customers.find(c => c.id === id);
          const get = (key: string) => (colMap[key] !== undefined ? (parts[colMap[key]] || '') : '');
          imported.push(CustomerStore.buildCustomer(id, kvzId, get, existing));
        }
      }

      if (imported.length > 0) {
        const byId = new Map<number, CustomerItem>();
        for (const c of imported) byId.set(c.id, c);
        const duplicateCount = imported.length - byId.size;
        imported = Array.from(byId.values()).sort((a, b) => a.id - b.id);
        if (duplicateCount > 0) {
          warning = `${duplicateCount} doppelte Job-ID(s) in der Liste gefunden - jeweils die letzte Zeile wurde übernommen.${warning ? ' ' + warning : ''}`;
        }

        this.saveCustomers(kvzId, imported);
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
"""

with open('electron/CustomerStore.ts', 'w') as f:
    f.write(code)
