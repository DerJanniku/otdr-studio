import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import ExcelJS from 'exceljs';
import { getFiberColorInfo } from './fiberColors';

export interface Project {
  id: string;
  name: string;
  clusterName?: string;
  providerName?: string;
  sharepointPath?: string;
  createdAt: string;
  updatedAt: string;
  totalCustomers?: number;
  matchedCustomers?: number;
  legacyMigrated?: boolean;
}

export interface Ausbaugebiet {
  id: string;
  projectId: string;
  name: string;
  clusterName?: string;
  providerName?: string;
  sharepointPath?: string;
  createdAt: string;
  updatedAt: string;
  totalCustomers?: number;
  matchedCustomers?: number;
}

export interface PopMeasurement {
  id: string;
  fiberName: string;
  sorFileName?: string;
  sorFilePath?: string;
  sorData?: any;
  measuredAt?: string;
  technicianName?: string;
  pdfPath?: string;
}

export interface KVZ {
  id: string;
  ausbaugebietId: string;
  name: string;
  clusterName?: string;
  providerName?: string;
  sharepointPath?: string;
  popMeasurements?: PopMeasurement[];
  createdAt: string;
  updatedAt: string;
  totalCustomers?: number;
  matchedCustomers?: number;
}

type LevelInput = { name?: string; clusterName?: string; providerName?: string; sharepointPath?: string };

const LEGACY_DEMO_NOTE = 'Beispiel-Datensatz (Demo)';

/** A further strand measured for the same connection (e.g. two dwelling units). */
export interface FiberMeasurement {
  fiberNumber: number;
  sorFileName?: string;
  sorFilePath?: string;
  sorData?: any;
  secondarySorData?: any;
  macrobendWarning?: string;
}

export interface CustomerItem {
  id: number;
  customerName: string;
  street: string;
  city: string;
  segment?: string;
  cableId?: string;
  fiberNumber: number;
  /** False when the list has no fiber column - the measured strand number is used instead. */
  fiberNumberFromList?: boolean;
  additionalFibers?: FiberMeasurement[];
  fiberType?: string;
  colorCode?: string;
  orderId?: string;
  notes?: string;
  
  status: 'pending' | 'matched' | 'exported';
  sorFileName?: string;
  sorFilePath?: string;
  sorData?: any;
  secondarySorData?: any;
  macrobendWarning?: string;
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

export interface ExcelColumnMapping {
  id: string;
  customerName: string;
  firstName: string;
  lastName: string;
  street: string;
  houseNumber: string;
  zip: string;
  city: string;
  district: string;
  segment: string;
  cableId: string;
  fiberNumber: string;
  orderId: string;
}

export const DEFAULT_COLUMN_MAPPING: ExcelColumnMapping = {
  id: 'id, id-job, job-id, kunden-nr, kundennr, job, nr, nummer, no, client-id',
  customerName: 'kunde, name, kundenname, client, teilnehmer, anschlussinhaber',
  firstName: 'vorname, firstname, first name',
  lastName: 'nachname, lastname, last name, familienname, surname',
  street: 'straße, strasse, street, adresse, anschrift, address',
  houseNumber: 'hausnr, hausnummer, haus-nr, hnr, house number',
  zip: 'plz, postleitzahl, zip, zip-code, postal, postalcode',
  city: 'ort, stadt, wohnort, gemeinde, city, town',
  district: 'ortsteil, ot, district',
  segment: 'nvt, kvz, segment, strecke, trasse, abschnitt, cluster, route, section',
  cableId: 'kabel, cable, kabel-id, kabelbezeichnung, cable-id',
  fiberNumber: 'faser, faser-nr, fasernummer, fiber, strand, fiber-no',
  orderId: 'auftrag, auftrags-nr, auftragsnummer, ticket, order, bestellung, vorgang, order-id',
};

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
  hideProvider?: boolean;
  hideContractor?: boolean;
  hideOrderId?: boolean;
  launchFiberOnly?: boolean;
  columnMapping?: Partial<ExcelColumnMapping>;
}

export interface SettingsPreset {
  id: number;
  name: string;
  settings: AppSettings;
}

export class CustomerStore {
  private userDir: string;
  private settingsPath: string;
  private presetsPath: string;
  private projectsPath: string;
  private activeProjectPath: string;
  private ausbaugebietePath: string;
  private kvzsPath: string;
  private projects: Project[] = [];
  private activeProjectId: string = 'default';
  private activeKvzId: string | null = null;
  private customers: CustomerItem[] = [];
  private settings: AppSettings;
  private presets: SettingsPreset[] = [];
  public readonly isFirstRun: boolean;

  constructor() {
    this.userDir = path.join(app.getPath('userData'), 'otdr-studio');
    fs.mkdirSync(this.userDir, { recursive: true });
    this.settingsPath = path.join(this.userDir, 'settings.json');
    this.presetsPath = path.join(this.userDir, 'settings_presets.json');
    this.projectsPath = path.join(this.userDir, 'projects.json');
    this.activeProjectPath = path.join(this.userDir, 'active_project.txt');
    this.ausbaugebietePath = path.join(this.userDir, 'ausbaugebiete.json');
    this.kvzsPath = path.join(this.userDir, 'kvzs.json');

    this.isFirstRun = !fs.existsSync(this.settingsPath);
    this.settings = this.loadSettings();
    this.presets = this.loadPresets();
    this.initProjects();
    this.migrateLegacyProjectCustomers();
  }

  private initProjects() {
    if (fs.existsSync(this.projectsPath)) {
      try {
        const raw = fs.readFileSync(this.projectsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.projects = parsed;
        }
      } catch (e) {
        console.error('Failed to parse projects.json:', e);
      }
    }

    if (this.projects.length === 0) {
      const defaultProj: Project = {
        id: 'default',
        name: this.settings.projectCluster || 'Standard-Ausbaugebiet',
        clusterName: this.settings.projectCluster || 'Standard-Ausbaugebiet',
        providerName: this.settings.providerName || '',
        sharepointPath: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.projects = [defaultProj];
      this.saveProjectsToDisk();

      // Migrate existing legacy customers.json if it exists
      const legacyPath = path.join(this.userDir, 'customers.json');
      const targetPath = this.getCustomersPath('default');
      if (fs.existsSync(legacyPath) && !fs.existsSync(targetPath)) {
        try {
          fs.copyFileSync(legacyPath, targetPath);
        } catch {}
      }
    }

    if (fs.existsSync(this.activeProjectPath)) {
      try {
        const savedId = fs.readFileSync(this.activeProjectPath, 'utf-8').trim();
        if (this.projects.some(p => p.id === savedId)) {
          this.activeProjectId = savedId;
        }
      } catch {}
    }

    if (!this.projects.some(p => p.id === this.activeProjectId)) {
      this.activeProjectId = this.projects[0].id;
    }
  }

  private getCustomersPath(scopeId: string): string {
    return path.join(this.userDir, `customers_${scopeId}.json`);
  }

  private readJsonArray<T>(filePath: string): T[] {
    if (!fs.existsSync(filePath)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error(`Failed to parse ${path.basename(filePath)}:`, e);
      return [];
    }
  }

  // Write to a temp file first so a crash mid-write never leaves a truncated JSON behind.
  private writeJson(filePath: string, data: unknown): boolean {
    try {
      const tmp = `${filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmp, filePath);
      return true;
    } catch (e) {
      console.error(`Failed to write ${path.basename(filePath)}:`, e);
      return false;
    }
  }

  private saveProjectsToDisk() {
    this.writeJson(this.projectsPath, this.projects);
  }

  private newId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  private static cleanLevelInput(data: LevelInput) {
    return {
      clusterName: data.clusterName?.trim() || '',
      providerName: data.providerName?.trim() || '',
      sharepointPath: data.sharepointPath?.trim() || '',
    };
  }

  private static countCustomers(custs: CustomerItem[]) {
    return {
      totalCustomers: custs.length,
      matchedCustomers: custs.filter(c => c.status === 'matched' || c.status === 'exported').length,
    };
  }

  // Before 1.4 customers lived directly on the project. The drill-down UI only shows customers
  // inside a KVZ, so such lists are copied into a "Bestand" area/KVZ once. The original file stays.
  private migrateLegacyProjectCustomers() {
    let changed = false;
    for (const proj of this.projects) {
      if (proj.legacyMigrated) continue;
      const legacy = this.readJsonArray<CustomerItem>(this.getCustomersPath(proj.id))
        .filter(c => c.notes !== LEGACY_DEMO_NOTE);
      if (legacy.length > 0) {
        const ag = this.createAusbaugebiet(proj.id, { name: 'Bestand (vor Version 1.4)' });
        const kvz = this.createKVZ(ag.id, { name: 'Kundenliste aus Projekt' });
        this.writeJson(this.getCustomersPath(kvz.id), legacy);
      }
      proj.legacyMigrated = true;
      changed = true;
    }
    if (changed) this.saveProjectsToDisk();
  }

  public getProjects(): Project[] {
    const ags = this.readJsonArray<Ausbaugebiet>(this.ausbaugebietePath);
    const kvzs = this.readJsonArray<KVZ>(this.kvzsPath);
    return this.projects.map(p => {
      const agIds = new Set(ags.filter(a => a.projectId === p.id).map(a => a.id));
      const custs = kvzs.filter(k => agIds.has(k.ausbaugebietId)).flatMap(k => this.getKvzCustomers(k.id));
      return { ...p, ...CustomerStore.countCustomers(custs) };
    });
  }

  public getAusbaugebiete(projectId: string): Ausbaugebiet[] {
    const kvzs = this.readJsonArray<KVZ>(this.kvzsPath);
    return this.readJsonArray<Ausbaugebiet>(this.ausbaugebietePath)
      .filter(a => a.projectId === projectId)
      .map(a => {
        const custs = kvzs.filter(k => k.ausbaugebietId === a.id).flatMap(k => this.getKvzCustomers(k.id));
        return { ...a, ...CustomerStore.countCustomers(custs) };
      });
  }

  public createAusbaugebiet(projectId: string, data: LevelInput): Ausbaugebiet {
    const all = this.readJsonArray<Ausbaugebiet>(this.ausbaugebietePath);
    const now = new Date().toISOString();
    const a: Ausbaugebiet = {
      id: this.newId('ag'),
      projectId,
      name: data.name?.trim() || 'Neues Ausbaugebiet',
      ...CustomerStore.cleanLevelInput(data),
      createdAt: now,
      updatedAt: now,
    };
    all.push(a);
    this.writeJson(this.ausbaugebietePath, all);
    return a;
  }

  public updateAusbaugebiet(updated: Ausbaugebiet): Ausbaugebiet | null {
    const all = this.readJsonArray<Ausbaugebiet>(this.ausbaugebietePath);
    const idx = all.findIndex(a => a.id === updated.id);
    if (idx === -1) return null;
    all[idx] = {
      ...all[idx],
      name: updated.name?.trim() || all[idx].name,
      ...CustomerStore.cleanLevelInput(updated),
      updatedAt: new Date().toISOString(),
    };
    this.writeJson(this.ausbaugebietePath, all);
    return all[idx];
  }

  public deleteAusbaugebiet(id: string): boolean {
    const all = this.readJsonArray<Ausbaugebiet>(this.ausbaugebietePath);
    if (!all.some(a => a.id === id)) return false;
    for (const k of this.getKVZs(id)) this.deleteKVZ(k.id);
    return this.writeJson(this.ausbaugebietePath, all.filter(a => a.id !== id));
  }

  public getKVZs(ausbaugebietId: string): KVZ[] {
    return this.readJsonArray<KVZ>(this.kvzsPath)
      .filter(k => k.ausbaugebietId === ausbaugebietId)
      .map(k => ({ ...k, ...CustomerStore.countCustomers(this.getKvzCustomers(k.id)) }));
  }

  public getKVZ(kvzId: string): KVZ | null {
    return this.readJsonArray<KVZ>(this.kvzsPath).find(k => k.id === kvzId) || null;
  }

  public createKVZ(ausbaugebietId: string, data: LevelInput): KVZ {
    const all = this.readJsonArray<KVZ>(this.kvzsPath);
    const now = new Date().toISOString();
    const k: KVZ = {
      id: this.newId('kvz'),
      ausbaugebietId,
      name: data.name?.trim() || 'Neuer KVZ',
      ...CustomerStore.cleanLevelInput(data),
      popMeasurements: [],
      createdAt: now,
      updatedAt: now,
    };
    all.push(k);
    this.writeJson(this.kvzsPath, all);
    return k;
  }

  public updateKVZ(updated: KVZ): KVZ | null {
    const all = this.readJsonArray<KVZ>(this.kvzsPath);
    const idx = all.findIndex(k => k.id === updated.id);
    if (idx === -1) return null;
    all[idx] = {
      ...all[idx],
      name: updated.name?.trim() || all[idx].name,
      ...CustomerStore.cleanLevelInput(updated),
      updatedAt: new Date().toISOString(),
    };
    this.writeJson(this.kvzsPath, all);
    return all[idx];
  }

  private patchKVZ(kvzId: string, patch: (k: KVZ) => void): KVZ | null {
    const all = this.readJsonArray<KVZ>(this.kvzsPath);
    const k = all.find(x => x.id === kvzId);
    if (!k) return null;
    patch(k);
    k.updatedAt = new Date().toISOString();
    return this.writeJson(this.kvzsPath, all) ? k : null;
  }

  public deleteKVZ(id: string): boolean {
    const all = this.readJsonArray<KVZ>(this.kvzsPath);
    if (!all.some(k => k.id === id)) return false;
    const cPath = this.getCustomersPath(id);
    if (fs.existsSync(cPath)) {
      try { fs.unlinkSync(cPath); } catch {}
    }
    if (this.activeKvzId === id) {
      this.activeKvzId = null;
      this.customers = [];
    }
    return this.writeJson(this.kvzsPath, all.filter(k => k.id !== id));
  }

  public getKvzCustomers(kvzId: string): CustomerItem[] {
    return this.readJsonArray<CustomerItem>(this.getCustomersPath(kvzId));
  }

  // All customer operations (import, USB scan, PDF export, edits) act on the opened KVZ.
  public openKvz(kvzId: string): { success: boolean; customers: CustomerItem[]; kvz: KVZ | null } {
    const kvz = this.getKVZ(kvzId);
    if (!kvz) return { success: false, customers: [], kvz: null };
    this.activeKvzId = kvzId;
    this.customers = this.getKvzCustomers(kvzId);
    return { success: true, customers: this.customers, kvz };
  }

  public closeKvz() {
    this.activeKvzId = null;
    this.customers = [];
  }

  public getActiveKvzId(): string | null {
    return this.activeKvzId;
  }

  public addPopMeasurement(kvzId: string, pm: PopMeasurement): KVZ | null {
    return this.patchKVZ(kvzId, k => {
      k.popMeasurements = [...(k.popMeasurements || []), pm];
    });
  }

  public updatePopMeasurement(kvzId: string, pmId: string, patch: Partial<PopMeasurement>): KVZ | null {
    return this.patchKVZ(kvzId, k => {
      k.popMeasurements = (k.popMeasurements || []).map(p => (p.id === pmId ? { ...p, ...patch, id: p.id } : p));
    });
  }

  public deletePopMeasurement(kvzId: string, pmId: string): KVZ | null {
    return this.patchKVZ(kvzId, k => {
      k.popMeasurements = (k.popMeasurements || []).filter(p => p.id !== pmId);
    });
  }

  // Delivery folder: the closest SharePoint folder set on KVZ, Ausbaugebiet or project that exists.
  public resolveDeliveryRoot(kvzId: string | null = this.activeKvzId): string | null {
    const candidates: (string | undefined)[] = [];
    const kvz = kvzId ? this.getKVZ(kvzId) : null;
    if (kvz) {
      candidates.push(kvz.sharepointPath);
      const ag = this.readJsonArray<Ausbaugebiet>(this.ausbaugebietePath).find(a => a.id === kvz.ausbaugebietId);
      if (ag) {
        candidates.push(ag.sharepointPath);
        candidates.push(this.projects.find(p => p.id === ag.projectId)?.sharepointPath);
      }
    } else {
      candidates.push(this.getActiveProject()?.sharepointPath);
    }
    return candidates.find(c => !!c && fs.existsSync(c)) || null;
  }

  // Protocol header fields taken from the hierarchy instead of the global settings.
  public getProtocolContext(kvzId: string | null = this.activeKvzId): { projectCluster?: string; providerName?: string } {
    const kvz = kvzId ? this.getKVZ(kvzId) : null;
    if (!kvz) return {};
    const ag = this.readJsonArray<Ausbaugebiet>(this.ausbaugebietePath).find(a => a.id === kvz.ausbaugebietId);
    const proj = ag ? this.projects.find(p => p.id === ag.projectId) : undefined;
    const projectCluster = [proj?.name, ag?.name, kvz.name].filter(Boolean).join(' · ');
    const providerName = kvz.providerName || ag?.providerName || proj?.providerName || undefined;
    return { projectCluster, ...(providerName ? { providerName } : {}) };
  }

  public getActiveProjectId(): string {
    return this.activeProjectId;
  }

  public getActiveProject(): Project | null {
    return this.projects.find(p => p.id === this.activeProjectId) || null;
  }

  public setActiveProject(id: string): { success: boolean; customers: CustomerItem[]; project: Project | null } {
    const proj = this.projects.find(p => p.id === id);
    if (!proj) return { success: false, customers: this.customers, project: null };
    this.activeProjectId = id;
    try {
      fs.writeFileSync(this.activeProjectPath, id, 'utf-8');
    } catch {}
    this.closeKvz();
    return { success: true, customers: this.customers, project: proj };
  }

  public createProject(data: Partial<Project>): Project {
    const now = new Date().toISOString();
    const newProj: Project = {
      id: this.newId('proj'),
      name: data.name?.trim() || 'Neues Projekt',
      clusterName: data.clusterName?.trim() || '',
      providerName: data.providerName?.trim() || '',
      sharepointPath: data.sharepointPath?.trim() || '',
      createdAt: now,
      updatedAt: now,
      legacyMigrated: true,
    };
    this.projects.push(newProj);
    this.saveProjectsToDisk();
    return newProj;
  }

  public updateProject(updated: Project): Project | null {
    const idx = this.projects.findIndex(p => p.id === updated.id);
    if (idx === -1) return null;
    this.projects[idx] = {
      ...this.projects[idx],
      name: updated.name?.trim() || this.projects[idx].name,
      ...CustomerStore.cleanLevelInput(updated),
      updatedAt: new Date().toISOString(),
    };
    this.saveProjectsToDisk();
    return this.projects[idx];
  }

  public deleteProject(id: string): boolean {
    if (this.projects.length <= 1 || !this.projects.some(p => p.id === id)) return false;
    for (const a of this.getAusbaugebiete(id)) this.deleteAusbaugebiet(a.id);
    this.projects = this.projects.filter(p => p.id !== id);
    this.saveProjectsToDisk();
    if (this.activeProjectId === id) {
      this.setActiveProject(this.projects[0].id);
    }
    return true;
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

  public saveCustomers(customers: CustomerItem[]): boolean {
    if (!this.activeKvzId) return false;
    this.customers = customers;
    return this.writeJson(this.getCustomersPath(this.activeKvzId), customers);
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

  private static normalizeHeader(str: string): string {
    return (str || '')
      .toLowerCase()
      .trim()
      .replace(/ß/g, 'ss')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/[\s\-_.:/\\()[\]{}]+/g, '');
  }

  public static detectColumns(
    headerCells: string[],
    customMapping?: Partial<ExcelColumnMapping>
  ): { colMap: Record<string, number>; score: number } {
    const colMap: Record<string, number> = {};
    let vornameCol = -1;
    let nachnameCol = -1;

    const mapping: ExcelColumnMapping = {
      id: customMapping?.id ?? DEFAULT_COLUMN_MAPPING.id,
      customerName: customMapping?.customerName ?? DEFAULT_COLUMN_MAPPING.customerName,
      firstName: customMapping?.firstName ?? DEFAULT_COLUMN_MAPPING.firstName,
      lastName: customMapping?.lastName ?? DEFAULT_COLUMN_MAPPING.lastName,
      street: customMapping?.street ?? DEFAULT_COLUMN_MAPPING.street,
      houseNumber: customMapping?.houseNumber ?? DEFAULT_COLUMN_MAPPING.houseNumber,
      district: customMapping?.district ?? DEFAULT_COLUMN_MAPPING.district,
      zip: customMapping?.zip ?? DEFAULT_COLUMN_MAPPING.zip,
      city: customMapping?.city ?? DEFAULT_COLUMN_MAPPING.city,
      segment: customMapping?.segment ?? DEFAULT_COLUMN_MAPPING.segment,
      cableId: customMapping?.cableId ?? DEFAULT_COLUMN_MAPPING.cableId,
      fiberNumber: customMapping?.fiberNumber ?? DEFAULT_COLUMN_MAPPING.fiberNumber,
      orderId: customMapping?.orderId ?? DEFAULT_COLUMN_MAPPING.orderId,
    };

    const parseAliases = (rawList: string) => {
      if (!rawList || rawList.trim() === '') return [];
      return rawList
        .split(',')
        .map(a => a.trim().toLowerCase())
        .filter(Boolean);
    };

    const aliases = {
      fiberNumber: parseAliases(mapping.fiberNumber),
      cableId: parseAliases(mapping.cableId),
      orderId: parseAliases(mapping.orderId),
      segment: parseAliases(mapping.segment),
      zip: parseAliases(mapping.zip),
      city: parseAliases(mapping.city),
      street: parseAliases(mapping.street),
      houseNumber: parseAliases(mapping.houseNumber),
      district: parseAliases(mapping.district),
      firstName: parseAliases(mapping.firstName),
      lastName: parseAliases(mapping.lastName),
      customerName: parseAliases(mapping.customerName),
      id: parseAliases(mapping.id),
    };

    // Pass 1: Exact matches
    headerCells.forEach((rawHeader, idx) => {
      const norm = CustomerStore.normalizeHeader(rawHeader);
      if (!norm) return;

      const exactMatch = (arr: string[]) => arr.length > 0 && arr.some(a => norm === CustomerStore.normalizeHeader(a));
      const hasNumberWord = norm.includes('nr') || norm.includes('nummer') || norm.includes('num');

      if (exactMatch(aliases.fiberNumber)) colMap['fiberNumber'] = idx;
      else if (exactMatch(aliases.cableId)) colMap['cableId'] = idx;
      else if (exactMatch(aliases.orderId)) colMap['orderId'] = idx;
      else if (exactMatch(aliases.houseNumber)) colMap['houseNumber'] = idx;
      else if (exactMatch(aliases.id)) colMap['id'] = idx;
      else if (exactMatch(aliases.street)) colMap['street'] = idx;
      else if (exactMatch(aliases.zip)) colMap['zip'] = idx;
      else if (exactMatch(aliases.district)) colMap['district'] = idx;
      // "Stadt | Ort" in one list: the first is the town, the second its district (Ortsteil).
      else if (exactMatch(aliases.city) && colMap['city'] !== undefined && colMap['district'] === undefined) colMap['district'] = idx;
      else if (exactMatch(aliases.city)) colMap['city'] = idx;
      else if (exactMatch(aliases.segment)) colMap['segment'] = idx;
      else if (exactMatch(aliases.firstName)) vornameCol = idx;
      else if (exactMatch(aliases.lastName) && !hasNumberWord) nachnameCol = idx;
      else if (exactMatch(aliases.customerName) && !hasNumberWord) colMap['name'] = idx;
    });

    // Pass 2: Substring matches for unmapped columns
    headerCells.forEach((rawHeader, idx) => {
      if (Object.values(colMap).includes(idx) || vornameCol === idx || nachnameCol === idx) return;

      const norm = CustomerStore.normalizeHeader(rawHeader);
      if (!norm) return;

      const substringMatch = (arr: string[]) => arr.length > 0 && arr.some(a => {
        const n = CustomerStore.normalizeHeader(a);
        return norm.includes(n) || n.includes(norm);
      });

      const hasNumberWord = norm.includes('nr') || norm.includes('nummer') || norm.includes('num');
      const isTelefonOrHaus = norm.includes('telefon') || norm.includes('tel') || norm.includes('haus');

      if (colMap['houseNumber'] === undefined && substringMatch(aliases.houseNumber)) colMap['houseNumber'] = idx;
      else if (colMap['fiberNumber'] === undefined && substringMatch(aliases.fiberNumber)) colMap['fiberNumber'] = idx;
      else if (colMap['cableId'] === undefined && substringMatch(aliases.cableId)) colMap['cableId'] = idx;
      else if (colMap['orderId'] === undefined && substringMatch(aliases.orderId)) colMap['orderId'] = idx;
      else if (colMap['street'] === undefined && substringMatch(aliases.street)) colMap['street'] = idx;
      else if (colMap['segment'] === undefined && substringMatch(aliases.segment)) colMap['segment'] = idx;
      else if (colMap['zip'] === undefined && substringMatch(aliases.zip)) colMap['zip'] = idx;
      else if (colMap['city'] === undefined && substringMatch(aliases.city)) colMap['city'] = idx;
      else if (vornameCol === -1 && substringMatch(aliases.firstName)) vornameCol = idx;
      else if (nachnameCol === -1 && substringMatch(aliases.lastName) && !hasNumberWord) nachnameCol = idx;
      else if (colMap['name'] === undefined && substringMatch(aliases.customerName) && !hasNumberWord) colMap['name'] = idx;
      else if (colMap['id'] === undefined && !isTelefonOrHaus && (substringMatch(aliases.id) || hasNumberWord || norm.includes('job'))) colMap['id'] = idx;
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
    // Missing fields stay empty - an acceptance report must not show invented addresses or ids.
    const street = [get('street'), get('houseNumber')].filter(Boolean).join(' ').trim();
    const town = [get('zip'), get('city')].filter(Boolean).join(' ').trim();
    const district = get('district');
    const city = district && !town.toLowerCase().includes(district.toLowerCase())
      ? [town, district].filter(Boolean).join(' OT ')
      : town;
    // Lists without a name column (address lists) use the address as connection name.
    const name = combinedName || get('name') || street || `Anschluss #${id}`;
    const segmentRaw = get('segment');
    const segment = segmentRaw ? (segmentRaw.includes('➔') ? segmentRaw : `${segmentRaw} ➔ HÜP`) : '';
    const cableId = get('cableId');
    const fiberNrRaw = get('fiberNumber');
    const fiberNr = fiberNrRaw ? (parseInt(fiberNrRaw.replace(/[^\d]/g, ''), 10) || 1) : 1;
    const orderId = get('orderId');
    const fiberInfo = getFiberColorInfo(fiberNr);

    return {
      id,
      customerName: name.trim(),
      street: street.trim(),
      city: city.trim(),
      segment: segment.trim(),
      cableId: cableId.trim(),
      fiberNumber: existing?.fiberNumberFromList === false && !fiberNrRaw ? existing.fiberNumber : fiberNr,
      fiberNumberFromList: !!fiberNrRaw,
      additionalFibers: existing?.additionalFibers,
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

  public async importExcelFile(filePath: string): Promise<{ success: boolean; count: number; warning?: string; error?: string }> {
    return this.importFromExcel(filePath);
  }

  public async importFromExcel(filePath: string): Promise<{ success: boolean; count: number; warning?: string; error?: string }> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      let imported: CustomerItem[] = [];
      let warning: string | undefined;

      if (ext === '.xls') {
        return { success: false, count: 0, error: 'Das alte Excel-Format .xls wird nicht unterstützt. Bitte die Datei in Excel als .xlsx speichern und erneut importieren.' };
      }
      if (ext === '.xlsx') {
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
        let emptyStreak = 0;
        for (let r = headerRowIdx + 1; r <= worksheet.rowCount; r++) {
          // Sheets formatted down to row 1,048,576 would otherwise take minutes to walk.
          if (emptyStreak > 200) break;
          const row = worksheet.getRow(r);
          if (!row.hasValues) { emptyStreak++; continue; }
          emptyStreak = 0;
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
        const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
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

          const existing = this.customers.find(c => c.id === id);
          const get = (key: string) => (colMap[key] !== undefined ? (parts[colMap[key]] || '') : '');
          imported.push(CustomerStore.buildCustomer(id, get, existing));
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

        // Customers that already carry a measurement but are missing from the new list are kept,
        // otherwise re-importing a filtered or shortened list would silently delete measurements.
        const importedIds = new Set(imported.map(c => c.id));
        const keptMeasured = this.customers.filter(c => !importedIds.has(c.id) && c.status !== 'pending');
        if (keptMeasured.length > 0) {
          imported = [...imported, ...keptMeasured].sort((a, b) => a.id - b.id);
          warning = `${keptMeasured.length} bereits gemessene Kunden stehen nicht in der neuen Liste und wurden behalten (Job ${keptMeasured.map(c => '#' + c.id).join(', ')}).${warning ? ' ' + warning : ''}`;
        }

        if (!this.saveCustomers(imported)) {
          return { success: false, count: 0, error: 'Kundenliste konnte nicht gespeichert werden (kein KVZ geöffnet oder Schreibfehler).' };
        }
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
