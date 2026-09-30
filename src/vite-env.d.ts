/// <reference types="vite/client" />

interface UpdateState {
  phase: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error';
  version?: string;
  percent?: number;
  bytesPerSecond?: number;
  message?: string;
  canSelfUpdate: boolean;
}

interface Window {
  api?: {
    getCustomers: () => Promise<any[]>;

    getAusbaugebiete: (projectId: string) => Promise<import('./types').Ausbaugebiet[]>;
    createAusbaugebiet: (projectId: string, data: import('./types').LevelInput) => Promise<import('./types').Ausbaugebiet>;
    updateAusbaugebiet: (a: import('./types').Ausbaugebiet) => Promise<import('./types').Ausbaugebiet | null>;
    deleteAusbaugebiet: (id: string) => Promise<boolean>;
    getKVZs: (ausbaugebietId: string) => Promise<import('./types').KVZ[]>;
    createKVZ: (ausbaugebietId: string, data: import('./types').LevelInput) => Promise<import('./types').KVZ>;
    updateKVZ: (k: import('./types').KVZ) => Promise<import('./types').KVZ | null>;
    deleteKVZ: (id: string) => Promise<boolean>;
    openKvz: (kvzId: string) => Promise<{ success: boolean; customers: any[]; kvz: import('./types').KVZ | null }>;
    closeKvz: () => Promise<void>;
    addPopMeasurement: (kvzId: string, fiberName: string) => Promise<{ success: boolean; kvz?: import('./types').KVZ; canceled?: boolean; error?: string }>;
    deletePopMeasurement: (kvzId: string, pmId: string) => Promise<import('./types').KVZ | null>;
    generateKvzPdf: (kvzId: string, pmId: string) => Promise<{ success: boolean; pdfPath?: string; error?: string }>;

    saveCustomers: (customers: any[]) => Promise<boolean>;
    updateCustomer: (customer: any) => Promise<boolean>;
    importCustomerFile: () => Promise<{ success: boolean; count?: number; filePath?: string; customers?: any[]; canceled?: boolean; error?: string; warning?: string }>;
    chooseUsbFolder: () => Promise<{ success: boolean; folderPath?: string; matchedCount?: number; matchedIds?: number[]; errors?: string[]; unmatched?: string[]; customers?: any[]; canceled?: boolean; error?: string }>;
    scanUsbFolder: (folderPath?: string) => Promise<{ success: boolean; folderPath?: string; matchedCount?: number; matchedIds?: number[]; errors?: string[]; customers?: any[]; error?: string }>;
    getAppSettings: () => Promise<any>;
    saveAppSettings: (settings: any) => Promise<boolean>;
    getSettingPresets: () => Promise<{ id: number; name: string; settings: any }[]>;
    saveSettingPreset: (name: string, settings: any) => Promise<{ id: number; name: string; settings: any }[]>;
    deleteSettingPreset: (id: number) => Promise<{ id: number; name: string; settings: any }[]>;
    getProjects: () => Promise<any[]>;
    createProject: (data: any) => Promise<any>;
    updateProject: (project: any) => Promise<any | null>;
    deleteProject: (id: string) => Promise<boolean>;
    getActiveProject: () => Promise<any | null>;
    setActiveProject: (id: string) => Promise<{ success: boolean; customers: any[]; project: any | null }>;
    chooseDirectory: () => Promise<string | null>;
    renderProtocolHtml: (customer: any, settings?: any) => Promise<{ success: boolean; html?: string; error?: string }>;
    generatePdfProtocol: (customer: any, settings?: any, openAfter?: boolean) => Promise<{ success: boolean; pdfPath?: string; error?: string }>;
    batchExportPdfs: (customerIds?: number[], settings?: any) => Promise<{ success: boolean; count?: number; folderPath?: string; error?: string }>;
    openPath: (targetPath: string) => Promise<boolean>;
    openExternal: (url: string) => Promise<boolean>;
    getAppVersion: () => Promise<string>;
    isFirstRun: () => Promise<boolean>;
    checkForUpdates: () => Promise<{ hasUpdate: boolean; latestVersion?: string; url?: string; canSelfUpdate?: boolean }>;
    updaterGetState: () => Promise<UpdateState>;
    updaterCheck: () => Promise<UpdateState>;
    updaterDownload: () => Promise<UpdateState>;
    updaterInstall: () => Promise<void>;
    onUpdateState: (callback: (state: UpdateState) => void) => () => void;
    onUsbDetected: (callback: (data: { volumeName: string; matchedCount: number; matchedIds: number[]; errors?: string[]; unmatched?: string[]; customers: any[] }) => void) => () => void;
  };
}
