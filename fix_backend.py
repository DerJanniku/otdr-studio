with open("electron/CustomerStore.ts", "r") as f: c = f.read()
store_methods = """
  public updateAusbaugebiet(a: any): any {
    const p = path.join(this.userDir, 'ausbaugebiete.json');
    if (!fs.existsSync(p)) return;
    let data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    data = data.map((x:any) => x.id === a.id ? { ...x, ...a } : x);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  }
  public deleteAusbaugebiet(id: string): any {
    const p = path.join(this.userDir, 'ausbaugebiete.json');
    if (!fs.existsSync(p)) return;
    let data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    data = data.filter((x:any) => x.id !== id);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  }
  public updateKVZ(k: any): any {
    const p = path.join(this.userDir, 'kvzs.json');
    if (!fs.existsSync(p)) return;
    let data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    data = data.map((x:any) => x.id === k.id ? { ...x, ...k } : x);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  }
  public deleteKVZ(id: string): any {
    const p = path.join(this.userDir, 'kvzs.json');
    if (!fs.existsSync(p)) return;
    let data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    data = data.filter((x:any) => x.id !== id);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  }
"""
c = c.replace("public getAusbaugebiete(projectId: string): any[] {", store_methods + "\n  public getAusbaugebiete(projectId: string): any[] {")
with open("electron/CustomerStore.ts", "w") as f: f.write(c)

with open("electron/main.ts", "r") as f: c2 = f.read()
ipc_handlers = """
  ipcMain.handle('update-ausbaugebiet', (_e, a) => customerStore.updateAusbaugebiet(a));
  ipcMain.handle('delete-ausbaugebiet', (_e, id) => customerStore.deleteAusbaugebiet(id));
  ipcMain.handle('update-kvz', (_e, k) => customerStore.updateKVZ(k));
  ipcMain.handle('delete-kvz', (_e, id) => customerStore.deleteKVZ(id));
"""
c2 = c2.replace("ipcMain.handle('create-ausbaugebiet',", ipc_handlers + "\n  ipcMain.handle('create-ausbaugebiet',")
with open("electron/main.ts", "w") as f: f.write(c2)

with open("electron/preload.ts", "r") as f: c3 = f.read()
preload_methods = """
  updateAusbaugebiet: (a: any) => ipcRenderer.invoke('update-ausbaugebiet', a),
  deleteAusbaugebiet: (id: string) => ipcRenderer.invoke('delete-ausbaugebiet', id),
  updateKVZ: (k: any) => ipcRenderer.invoke('update-kvz', k),
  deleteKVZ: (id: string) => ipcRenderer.invoke('delete-kvz', id),
"""
c3 = c3.replace("createAusbaugebiet:", preload_methods + "\n  createAusbaugebiet:")
with open("electron/preload.ts", "w") as f: f.write(c3)

with open("src/vite-env.d.ts", "r") as f: c4 = f.read()
c4 = c4.replace("createAusbaugebiet: (projectId: string, name: string) => Promise<any>;", "createAusbaugebiet: (projectId: string, name: string) => Promise<any>;\n    updateAusbaugebiet: (a: any) => Promise<void>;\n    deleteAusbaugebiet: (id: string) => Promise<void>;\n    updateKVZ: (k: any) => Promise<void>;\n    deleteKVZ: (id: string) => Promise<void>;")
with open("src/vite-env.d.ts", "w") as f: f.write(c4)

