with open("electron/CustomerStore.ts", "r") as f:
    content = f.read()

# Add getAusbaugebiete, createAusbaugebiet, getKVZs, createKVZ
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
    // We will just do a standard import but save to kvzId
    // To make it simple, we use the active project logic but point it to kvzId.
    const oldId = this.activeProjectId;
    this.activeProjectId = kvzId;
    const customersPath = this.getCustomersPath(kvzId);
    // we need to inject kvzId to CustomerItem
    let res = { success: false, error: 'Not implemented' };
    try {
      res = this.importFromExcel(filePath) as any;
    } finally {
      this.activeProjectId = oldId;
    }
    return res;
  }
"""

content = content.replace("public getActiveProjectId()", new_methods + "\n  public getActiveProjectId()")
with open("electron/CustomerStore.ts", "w") as f:
    f.write(content)
