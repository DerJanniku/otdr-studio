with open("electron/main.ts", "r") as f: c = f.read()

new_ipc = """
  ipcMain.handle('select-sor-file', async () => {
    const { dialog } = require('electron');
    const res = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [{ name: 'SOR Dateien', extensions: ['sor'] }]
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('generate-kvz-pdf', async (_e, kvzId, pmId) => {
    try {
      const kvzs = JSON.parse(fs.readFileSync(path.join(customerStore.userDir, 'kvzs.json'), 'utf-8'));
      const kvz = kvzs.find((k: any) => k.id === kvzId);
      if (!kvz) return { success: false, error: 'KVZ not found' };
      const pm = kvz.popMeasurements?.find((p: any) => p.id === pmId);
      if (!pm || !pm.sorFilePath) return { success: false, error: 'Measurement or sor file not found' };

      const activeProj = customerStore.getActiveProject();
      const buffer = fs.readFileSync(pm.sorFilePath);
      const { parseSor } = require('./sorParser');
      const sorData = parseSor(buffer);

      const fakeCustomer = {
         id: 999999,
         jobId: kvz.name,
         customerName: pm.fiberName,
         city: activeProj?.name || '',
         street: "POP Zuleitung",
         status: 'matched' as any,
         sorFilePath: pm.sorFilePath,
         sorData: sorData
      };

      const settings = customerStore.getSettings();
      let deliveryDir = path.join(app.getPath('documents'), 'OTDR_Protokolle');
      if (activeProj?.sharepointPath && fs.existsSync(activeProj.sharepointPath)) {
        deliveryDir = path.join(activeProj.sharepointPath, kvz.name, 'Zuleitungen');
      }
      fs.mkdirSync(deliveryDir, { recursive: true });
      
      const fileName = `MTS2000_DIN_Protokoll_${kvz.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${pm.fiberName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      const targetPath = path.join(deliveryDir, fileName);

      await PdfExporter.generateSinglePdf(fakeCustomer, settings, targetPath);

      const { shell } = require('electron');
      await shell.openPath(targetPath);
      return { success: true };
    } catch(err: any) {
       return { success: false, error: err.message };
    }
  });
"""

c = c.replace("ipcMain.handle('delete-kvz', (_e, id) => customerStore.deleteKVZ(id));", "ipcMain.handle('delete-kvz', (_e, id) => customerStore.deleteKVZ(id));\n" + new_ipc)
with open("electron/main.ts", "w") as f: f.write(c)

with open("electron/preload.ts", "r") as f: c2 = f.read()
new_preload = """
  selectSorFile: () => ipcRenderer.invoke('select-sor-file'),
  generateKvzPdf: (kvzId: string, pmId: string) => ipcRenderer.invoke('generate-kvz-pdf', kvzId, pmId),
"""
c2 = c2.replace("deleteKVZ: (id: string) => ipcRenderer.invoke('delete-kvz', id),", "deleteKVZ: (id: string) => ipcRenderer.invoke('delete-kvz', id),\n" + new_preload)
with open("electron/preload.ts", "w") as f: f.write(c2)

with open("src/vite-env.d.ts", "r") as f: c3 = f.read()
new_env = """
    selectSorFile: () => Promise<string | null>;
    generateKvzPdf: (kvzId: string, pmId: string) => Promise<{success: boolean, error?: string}>;
"""
c3 = c3.replace("deleteKVZ: (id: string) => Promise<void>;", "deleteKVZ: (id: string) => Promise<void>;\n" + new_env)
with open("src/vite-env.d.ts", "w") as f: f.write(c3)

