with open("electron/main.ts", "r") as f:
    content = f.read()

ipc_handlers = """
  ipcMain.handle('get-ausbaugebiete', (_e, projectId) => store.getAusbaugebiete(projectId));
  ipcMain.handle('create-ausbaugebiet', (_e, projectId, name) => store.createAusbaugebiet(projectId, name));
  ipcMain.handle('get-kvzs', (_e, ausbaugebietId) => store.getKVZs(ausbaugebietId));
  ipcMain.handle('create-kvz', (_e, ausbaugebietId, name) => store.createKVZ(ausbaugebietId, name));
  ipcMain.handle('get-kvz-customers', (_e, kvzId) => store.getKvzCustomers(kvzId));
  ipcMain.handle('import-kvz-excel', async (_e, kvzId) => {
    const { dialog } = require('electron');
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Excel / CSV importieren',
      properties: ['openFile'],
      filters: [
        { name: 'Tabellen', extensions: ['xlsx', 'xls', 'csv'] },
        { name: 'Alle Dateien', extensions: ['*'] }
      ]
    });
    if (canceled || filePaths.length === 0) return { canceled: true };
    return await store.importKvzCustomers(kvzId, filePaths[0]);
  });
"""

# inject before ipcMain.handle('get-customers'
content = content.replace("ipcMain.handle('get-customers',", ipc_handlers + "\n  ipcMain.handle('get-customers',")
with open("electron/main.ts", "w") as f:
    f.write(content)
