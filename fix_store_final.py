with open("electron/CustomerStore.ts", "r") as f:
    content = f.read()

new_methods = """
  public getAusbaugebiete(projectId: string): any[] {
    const p = path.join(this.userDir, 'ausbaugebiete.json');
    if (!fs.existsSync(p)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return data.filter((a: any) => a.projectId === projectId);
    } catch { return []; }
  }

  public createAusbaugebiet(projectId: string, name: string): any {
    const p = path.join(this.userDir, 'ausbaugebiete.json');
    let data: any[] = [];
    if (fs.existsSync(p)) {
      try { data = JSON.parse(fs.readFileSync(p, 'utf-8')); } catch {}
    }
    const a = { id: 'ag_' + Date.now(), projectId, name, createdAt: new Date().toISOString() };
    data.push(a);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    return a;
  }

  public getKVZs(ausbaugebietId: string): any[] {
    const p = path.join(this.userDir, 'kvzs.json');
    if (!fs.existsSync(p)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return data.filter((k: any) => k.ausbaugebietId === ausbaugebietId);
    } catch { return []; }
  }

  public createKVZ(ausbaugebietId: string, name: string): any {
    const p = path.join(this.userDir, 'kvzs.json');
    let data: any[] = [];
    if (fs.existsSync(p)) {
      try { data = JSON.parse(fs.readFileSync(p, 'utf-8')); } catch {}
    }
    const k = { id: 'kvz_' + Date.now(), ausbaugebietId, name, measurements: [], createdAt: new Date().toISOString() };
    data.push(k);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    return k;
  }

  public getKvzCustomers(kvzId: string): any[] {
    const p = path.join(this.userDir, `customers_${kvzId}.json`);
    if (!fs.existsSync(p)) return [];
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; }
  }

  public importKvzCustomers(kvzId: string, filePath: string): any {
    const oldId = this.activeProjectId;
    this.activeProjectId = kvzId;
    let res = { success: false, error: 'Not implemented' } as any;
    try {
      // It is asynchronous? No, importFromExcel is async, but wait, the store method was async?
      // Yes, importFromExcel is async.
      // We will make importKvzCustomers async!
    } finally {
      this.activeProjectId = oldId;
    }
    return res;
  }

  public async importKvzCustomersAsync(kvzId: string, filePath: string): Promise<any> {
    const oldId = this.activeProjectId;
    this.activeProjectId = kvzId;
    let res = { success: false, error: 'Not implemented' };
    try {
      res = await this.importFromExcel(filePath);
    } finally {
      this.activeProjectId = oldId;
    }
    return res;
  }
"""

content = content.replace("public getActiveProjectId()", new_methods + "\n  public getActiveProjectId()")
with open("electron/CustomerStore.ts", "w") as f:
    f.write(content)

with open("electron/main.ts", "r") as f:
    c = f.read()

ipc_handlers = """
  ipcMain.handle('get-ausbaugebiete', (_e, projectId) => customerStore.getAusbaugebiete(projectId));
  ipcMain.handle('create-ausbaugebiet', (_e, projectId, name) => customerStore.createAusbaugebiet(projectId, name));
  ipcMain.handle('get-kvzs', (_e, ausbaugebietId) => customerStore.getKVZs(ausbaugebietId));
  ipcMain.handle('create-kvz', (_e, ausbaugebietId, name) => customerStore.createKVZ(ausbaugebietId, name));
  ipcMain.handle('get-kvz-customers', (_e, kvzId) => customerStore.getKvzCustomers(kvzId));
  ipcMain.handle('import-kvz-excel', async (_e, kvzId) => {
    const { dialog } = require('electron');
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
      title: 'Excel / CSV importieren',
      properties: ['openFile'],
      filters: [
        { name: 'Tabellen', extensions: ['xlsx', 'xls', 'csv'] },
        { name: 'Alle Dateien', extensions: ['*'] }
      ]
    });
    if (canceled || filePaths.length === 0) return { canceled: true };
    return await customerStore.importKvzCustomersAsync(kvzId, filePaths[0]);
  });
"""
c = c.replace("ipcMain.handle('get-customers',", ipc_handlers + "\n  ipcMain.handle('get-customers',")
with open("electron/main.ts", "w") as f:
    f.write(c)

