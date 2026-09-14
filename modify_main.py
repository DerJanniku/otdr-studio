import re

with open('electron/main.ts', 'r') as f:
    code = f.read()

# I will simply find the string blocks and replace them.
code = code.replace("ipcMain.handle('get-customers', async () => {\n    return store.getCustomers();\n  });",
                    "ipcMain.handle('get-customers', async (_e, kvzId: string) => { return store.getCustomers(kvzId); });")

code = code.replace("ipcMain.handle('save-customers', async (_e, customers) => {\n    return store.saveCustomers(customers);\n  });",
                    "ipcMain.handle('save-customers', async (_e, kvzId: string, customers) => { return store.saveCustomers(kvzId, customers); });")

code = code.replace("ipcMain.handle('update-customer', async (_e, customer) => {\n    return store.updateCustomer(customer);\n  });",
                    "ipcMain.handle('update-customer', async (_e, kvzId: string, customer) => { return store.updateCustomer(kvzId, customer); });")

# import-customer-file
import_re = r"ipcMain\.handle\('import-customer-file', async \(\) => \{.*?(?:return result;\n    \}\n  \}\);|return result;\n  \}\);)"
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
code = re.sub(import_re, import_block, code, flags=re.DOTALL)

# Add cluster/kvz IPC after delete-project
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
code = code.replace("ipcMain.handle('delete-project', async (_e, id: string) => {\n    return store.deleteProject(id);\n  });", "ipcMain.handle('delete-project', async (_e, id: string) => {\n    return store.deleteProject(id);\n  });" + cluster_kvz_ipc)

with open('electron/main.ts', 'w') as f:
    f.write(code)
