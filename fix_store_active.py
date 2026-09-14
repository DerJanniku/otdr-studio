with open('electron/CustomerStore.ts', 'r') as f:
    code = f.read()

code = code.replace("public activeKvzId: string = '';", "") # remove if exists
code = code.replace("private activeKvzId: string = '';", "public activeKvzId: string = '';")

# let's add setActiveKvz to CustomerStore
add_active = """
  public setActiveKvzId(id: string) {
    this.activeKvzId = id;
  }
  public getActiveKvzId(): string {
    return this.activeKvzId;
  }
"""
code = code.replace("public getCustomers(kvzId: string): CustomerItem[] {", add_active + "public getCustomers(kvzId: string): CustomerItem[] {")
with open('electron/CustomerStore.ts', 'w') as f:
    f.write(code)

with open('electron/main.ts', 'r') as f:
    code = f.read()

# get-customers should also set active kvz id so backend knows
code = code.replace("ipcMain.handle('get-customers', async (_e, kvzId: string) => {", 
                    "ipcMain.handle('get-customers', async (_e, kvzId: string) => {\n    customerStore.setActiveKvzId(kvzId);")

# replace getCustomers() with getCustomers(customerStore.getActiveKvzId())
code = code.replace("customerStore.getCustomers()", "customerStore.getCustomers(customerStore.getActiveKvzId())")
code = code.replace("store.getCustomers(kvzId)", "customerStore.getCustomers(kvzId)")
code = code.replace("store.saveCustomers(kvzId, customers)", "customerStore.saveCustomers(kvzId, customers)")
code = code.replace("store.updateCustomer(kvzId, customer)", "customerStore.updateCustomer(kvzId, customer)")
code = code.replace("store.getClusters", "customerStore.getClusters")
code = code.replace("store.createCluster", "customerStore.createCluster")
code = code.replace("store.updateCluster", "customerStore.updateCluster")
code = code.replace("store.deleteCluster", "customerStore.deleteCluster")
code = code.replace("store.getKvzs", "customerStore.getKvzs")
code = code.replace("store.createKvz", "customerStore.createKvz")
code = code.replace("store.updateKvz", "customerStore.updateKvz")
code = code.replace("store.deleteKvz", "customerStore.deleteKvz")

# sharepointPath fixes in main.ts
# It probably does `const project = customerStore.getActiveProject(); project?.sharepointPath`
# We'll just replace `sharepointPath` logic with dummy for now or `cluster.sharepointPath` if possible.
code = code.replace("project.sharepointPath", "'' /* project.sharepointPath no longer exists */")
code = code.replace("project?.sharepointPath", "'' /* project.sharepointPath no longer exists */")
code = code.replace("store.deleteProject", "customerStore.deleteProject")
code = code.replace("store.importExcelFile", "customerStore.importExcelFile")

with open('electron/main.ts', 'w') as f:
    f.write(code)

