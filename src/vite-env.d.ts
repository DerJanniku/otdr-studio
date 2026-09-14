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
    getCustomers: (kvzId: string) => Promise<any[]>;
    saveCustomers: (kvzId: string, customers: any[]) => Promise<boolean>;
    updateCustomer: (kvzId: string, customer: any) => Promise<boolean>;
    importCustomerFile: (kvzId: string) => Promise<{ success: boolean; count?: number; filePath?: string; customers?: any[]; canceled?: boolean; error?: string; warning?: string }>;
    chooseUsbFolder: () => Promise<{ success: boolean; folderPath?: string; matchedCount?: number; matchedIds?: number[]; errors?: string[]; customers?: any[]; canceled?: boolean; error?: string }>;
    scanUsbFolder: (folderPath?: string) => Promise<{ success: boolean; folderPath?: string; matchedCount?: number; matchedIds?: number[]; errors?: string[]; customers?: any[]; error?: string }>;
    getAppSettings: () => Promise<any>;
    saveAppSettings: (settings: any) => Promise<boolean>;
    getSettingPresets: () => Promise<{ id: number; name: string; settings: any }[]>;
    saveSettingPreset: (name: string, settings: any) => Promise<{ id: number; name: string; settings: any }[]>;
    deleteSettingPreset: (id: number) => Promise<{ id: number; name: string; settings: any }[]>;
    getProjects: () => Promise<any[]>;
    createProject: (data: any) => Promise<any>;
    updateProject: (project: any) => Promise<any>;
    deleteProject: (id: string) => Promise<boolean>;
    getClusters: (projectId: string) => Promise<any[]>;
    createCluster: (projectId: string, data: any) => Promise<any>;
    updateCluster: (cluster: any) => Promise<any>;
    deleteCluster: (id: string) => Promise<boolean>;

    getKvzs: (clusterId: string) => Promise<any[]>;
    createKvz: (clusterId: string, data: any) => Promise<any>;
    updateKvz: (kvz: any) => Promise<any>;
    deleteKvz: (id: string) => Promise<boolean>;

    getActiveProject: () => Promise<any | null>;
    setActiveProject: (id: string) => Promise<{ success: boolean; customers: any[]; project: any | null }>;
    chooseDirectory: () => Promise<string | null>;
    generateKvzPdf: (kvzId: string) => Promise<{ success: boolean; pdfPath?: string; error?: string }>;
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
    onUsbDetected: (callback: (data: { volumeName: string; matchedCount: number; matchedIds: number[]; customers: any[] }) => void) => () => void;
  };
}
