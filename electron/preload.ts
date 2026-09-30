const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getCustomers: () => ipcRenderer.invoke('get-customers'),

  getAusbaugebiete: (projectId: string) => ipcRenderer.invoke('get-ausbaugebiete', projectId),
  createAusbaugebiet: (projectId: string, data: any) => ipcRenderer.invoke('create-ausbaugebiet', projectId, data),
  updateAusbaugebiet: (a: any) => ipcRenderer.invoke('update-ausbaugebiet', a),
  deleteAusbaugebiet: (id: string) => ipcRenderer.invoke('delete-ausbaugebiet', id),
  getKVZs: (ausbaugebietId: string) => ipcRenderer.invoke('get-kvzs', ausbaugebietId),
  createKVZ: (ausbaugebietId: string, data: any) => ipcRenderer.invoke('create-kvz', ausbaugebietId, data),
  updateKVZ: (k: any) => ipcRenderer.invoke('update-kvz', k),
  deleteKVZ: (id: string) => ipcRenderer.invoke('delete-kvz', id),
  openKvz: (kvzId: string) => ipcRenderer.invoke('open-kvz', kvzId),
  closeKvz: () => ipcRenderer.invoke('close-kvz'),
  addPopMeasurement: (kvzId: string, fiberName: string) => ipcRenderer.invoke('add-pop-measurement', kvzId, fiberName),
  deletePopMeasurement: (kvzId: string, pmId: string) => ipcRenderer.invoke('delete-pop-measurement', kvzId, pmId),
  generateKvzPdf: (kvzId: string, pmId: string) => ipcRenderer.invoke('generate-kvz-pdf', kvzId, pmId),

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
  getProjects: () => ipcRenderer.invoke('get-projects'),
  createProject: (data: any) => ipcRenderer.invoke('create-project', data),
  updateProject: (project: any) => ipcRenderer.invoke('update-project', project),
  deleteProject: (id: string) => ipcRenderer.invoke('delete-project', id),
  getActiveProject: () => ipcRenderer.invoke('get-active-project'),
  setActiveProject: (id: string) => ipcRenderer.invoke('set-active-project', id),
  chooseDirectory: () => ipcRenderer.invoke('choose-directory'),
  renderProtocolHtml: (customer: any, settings?: any) => ipcRenderer.invoke('render-protocol-html', customer, settings),
  generatePdfProtocol: (customer: any, settings?: any, openAfter: boolean = true) => 
    ipcRenderer.invoke('generate-pdf-protocol', customer, settings, openAfter),
  batchExportPdfs: (customerIds?: number[], settings?: any) => 
    ipcRenderer.invoke('batch-export-pdfs', customerIds, settings),
  openPath: (targetPath: string) => ipcRenderer.invoke('open-path', targetPath),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isFirstRun: () => ipcRenderer.invoke('is-first-run'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  updaterGetState: () => ipcRenderer.invoke('updater-get-state'),
  updaterCheck: () => ipcRenderer.invoke('updater-check'),
  updaterDownload: () => ipcRenderer.invoke('updater-download'),
  updaterInstall: () => ipcRenderer.invoke('updater-install'),
  onUpdateState: (callback: (state: any) => void) => {
    const listener = (_event: unknown, state: any) => callback(state);
    ipcRenderer.on('update-state', listener);
    return () => ipcRenderer.removeListener('update-state', listener);
  },
  onUsbDetected: (callback: (data: any) => void) => {
    const listener = (_event: unknown, data: any) => callback(data);
    ipcRenderer.on('usb-scan-result', listener);
    return () => ipcRenderer.removeListener('usb-scan-result', listener);
  },
});
