with open("electron/preload.ts", "r") as f:
    c = f.read()

new_methods = """
  getAusbaugebiete: (projectId: string) => ipcRenderer.invoke('get-ausbaugebiete', projectId),
  createAusbaugebiet: (projectId: string, name: string) => ipcRenderer.invoke('create-ausbaugebiet', projectId, name),
  getKVZs: (ausbaugebietId: string) => ipcRenderer.invoke('get-kvzs', ausbaugebietId),
  createKVZ: (ausbaugebietId: string, name: string) => ipcRenderer.invoke('create-kvz', ausbaugebietId, name),
  getKvzCustomers: (kvzId: string) => ipcRenderer.invoke('get-kvz-customers', kvzId),
  importKvzExcel: (kvzId: string) => ipcRenderer.invoke('import-kvz-excel', kvzId),
"""

c = c.replace("getCustomers: () => ipcRenderer.invoke('get-customers'),", "getCustomers: () => ipcRenderer.invoke('get-customers'),\n" + new_methods)

with open("electron/preload.ts", "w") as f:
    f.write(c)
