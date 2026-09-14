import re

with open('electron/main.ts', 'r') as f:
    code = f.read()

def replace_block(pattern, repl, text):
    return re.sub(pattern, repl, text, flags=re.DOTALL)

code = replace_block(r"ipcMain\.handle\('get-customers', async \(\) => \{.*?\}\);", "ipcMain.handle('get-customers', async (_e, kvzId: string) => store.getCustomers(kvzId));", code)
code = replace_block(r"ipcMain\.handle\('save-customers', async \(_e, customers\) => \{.*?\}\);", "ipcMain.handle('save-customers', async (_e, kvzId: string, customers) => store.saveCustomers(kvzId, customers));", code)
code = replace_block(r"ipcMain\.handle\('update-customer', async \(_e, customer\) => \{.*?\}\);", "ipcMain.handle('update-customer', async (_e, kvzId: string, customer) => store.updateCustomer(kvzId, customer));", code)

import_block = """ipcMain.handle('import-customer-file', async (_e, kvzId: string) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Excel / CSV', extensions: ['xlsx', 'xls', 'csv'] }],
      title: 'Kundenliste importieren'
    });
    if (canceled || filePaths.length === 0) return { success: false, canceled: true };
    const result = await store.importExcelFile(kvzId, filePaths[0]);
    if (result.success) {
      return { ...result, customers: store.getCustomers(kvzId) };
    }
    return result;
  });"""
code = replace_block(r"ipcMain\.handle\('import-customer-file', async \(\) => \{.*?(?:return result;\n    \}\n  \}\);|return result;\n  \}\);|return result;\n  \}\);)", import_block, code)

# add cluster/kvz IPC
if "ipcMain.handle('get-clusters'" not in code:
    cluster_kvz_ipc = """
  // CLUSTERS
  ipcMain.handle('get-clusters', async (_e, projectId: string) => store.getClusters(projectId));
  ipcMain.handle('create-cluster', async (_e, projectId: string, data) => store.createCluster(projectId, data));
  ipcMain.handle('update-cluster', async (_e, cluster) => store.updateCluster(cluster));
  ipcMain.handle('delete-cluster', async (_e, id: string) => store.deleteCluster(id));

  // KVZs
  ipcMain.handle('get-kvzs', async (_e, clusterId: string) => store.getKvzs(clusterId));
  ipcMain.handle('create-kvz', async (_e, clusterId: string, data) => store.createKvz(clusterId, data));
  ipcMain.handle('update-kvz', async (_e, kvz) => store.updateKvz(kvz));
  ipcMain.handle('delete-kvz', async (_e, id: string) => store.deleteKvz(id));
"""
    code = replace_block(r"ipcMain\.handle\('delete-project', async \(_e, id: string\) => \{.*?\}\);", "ipcMain.handle('delete-project', async (_e, id: string) => { return store.deleteProject(id); });" + cluster_kvz_ipc, code)

with open('electron/main.ts', 'w') as f:
    f.write(code)
