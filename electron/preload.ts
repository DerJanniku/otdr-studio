const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  saveCustomers: (customers: any[]) => ipcRenderer.invoke('save-customers', customers),
  updateCustomer: (customer: any) => ipcRenderer.invoke('update-customer', customer),
  importCustomerFile: () => ipcRenderer.invoke('import-customer-file'),
  chooseUsbFolder: () => ipcRenderer.invoke('choose-usb-folder'),
  scanUsbFolder: (folderPath?: string) => ipcRenderer.invoke('scan-usb-folder', folderPath),
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  saveAppSettings: (settings: any) => ipcRenderer.invoke('save-app-settings', settings),
  getSettingPresets: () => ipcRenderer.invoke('get-setting-presets'),
  saveSettingPreset: (name: string, settings: any) => ipcRenderer.invoke('save-setting-preset', name, settings),
  deleteSettingPreset: (id: number) => ipcRenderer.invoke('delete-setting-preset', id),
  generatePdfProtocol: (customer: any, settings?: any, openAfter: boolean = true) => 
    ipcRenderer.invoke('generate-pdf-protocol', customer, settings, openAfter),
  batchExportPdfs: (customerIds?: number[], settings?: any) => 
    ipcRenderer.invoke('batch-export-pdfs', customerIds, settings),
  openPath: (targetPath: string) => ipcRenderer.invoke('open-path', targetPath),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isFirstRun: () => ipcRenderer.invoke('is-first-run'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUsbDetected: (callback: (data: any) => void) => {
    const listener = (_event: unknown, data: any) => callback(data);
    ipcRenderer.on('usb-scan-result', listener);
    return () => ipcRenderer.removeListener('usb-scan-result', listener);
  },
});
