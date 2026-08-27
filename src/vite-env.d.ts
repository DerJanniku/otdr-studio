/// <reference types="vite/client" />

interface Window {
  api?: {
    getCustomers: () => Promise<any[]>;
    saveCustomers: (customers: any[]) => Promise<boolean>;
    updateCustomer: (customer: any) => Promise<boolean>;
    importCustomerFile: () => Promise<{ success: boolean; count?: number; filePath?: string; customers?: any[]; canceled?: boolean; error?: string; warning?: string }>;
    chooseUsbFolder: () => Promise<{ success: boolean; folderPath?: string; matchedCount?: number; matchedIds?: number[]; errors?: string[]; customers?: any[]; canceled?: boolean; error?: string }>;
    scanUsbFolder: (folderPath?: string) => Promise<{ success: boolean; folderPath?: string; matchedCount?: number; matchedIds?: number[]; errors?: string[]; customers?: any[]; error?: string }>;
    getAppSettings: () => Promise<any>;
    saveAppSettings: (settings: any) => Promise<boolean>;
    getSettingPresets: () => Promise<{ id: number; name: string; settings: any }[]>;
    saveSettingPreset: (name: string, settings: any) => Promise<{ id: number; name: string; settings: any }[]>;
    deleteSettingPreset: (id: number) => Promise<{ id: number; name: string; settings: any }[]>;
    generatePdfProtocol: (customer: any, settings?: any, openAfter?: boolean) => Promise<{ success: boolean; pdfPath?: string; error?: string }>;
    batchExportPdfs: (customerIds?: number[], settings?: any) => Promise<{ success: boolean; count?: number; folderPath?: string; error?: string }>;
    openPath: (targetPath: string) => Promise<boolean>;
    openExternal: (url: string) => Promise<boolean>;
    getAppVersion: () => Promise<string>;
    isFirstRun: () => Promise<boolean>;
    checkForUpdates: () => Promise<{ hasUpdate: boolean; latestVersion?: string; url?: string }>;
  };
}
