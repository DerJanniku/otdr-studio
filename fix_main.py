with open('electron/main.ts', 'r') as f:
    code = f.read()

code = code.replace("import { CustomerStore, AppSettings, CustomerItem, Project } from './CustomerStore';", 
                    "import { CustomerStore } from './CustomerStore';\nimport type { AppSettings, CustomerItem, Project } from '../src/types';")

# get-customers
code = code.replace("ipcMain.handle('get-customers', async () => {\n    return store.getCustomers();\n  });",
                    "ipcMain.handle('get-customers', async (_e, kvzId: string) => {\n    return store.getCustomers(kvzId);\n  });")
# save-customers
code = code.replace("ipcMain.handle('save-customers', async (_e, customers) => {\n    return store.saveCustomers(customers);\n  });",
                    "ipcMain.handle('save-customers', async (_e, kvzId: string, customers) => {\n    return store.saveCustomers(kvzId, customers);\n  });")
# update-customer
code = code.replace("ipcMain.handle('update-customer', async (_e, customer) => {\n    return store.updateCustomer(customer);\n  });",
                    "ipcMain.handle('update-customer', async (_e, kvzId: string, customer) => {\n    return store.updateCustomer(kvzId, customer);\n  });")

# import-customer-file
import_start = code.find("ipcMain.handle('import-customer-file'")
import_end = code.find("});", import_start) + 3
next_ipc = code.find("ipcMain.handle('choose-usb-folder'", import_start)
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
  });

  """
code = code[:import_start] + import_block + code[next_ipc:]

# delete-project and then clusters
del_proj_start = code.find("ipcMain.handle('delete-project'")
del_proj_end = code.find("});", del_proj_start) + 3
next_ipc_after_del = code.find("ipcMain.handle('get-active-project'", del_proj_end)

cluster_kvz_ipc = """
  // CLUSTERS
  ipcMain.handle('get-clusters', async (_e, projectId: string) => store.getClusters(projectId));
  ipcMain.handle('create-cluster', async (_e, projectId: string, data: any) => store.createCluster(projectId, data));
  ipcMain.handle('update-cluster', async (_e, cluster: any) => store.updateCluster(cluster));
  ipcMain.handle('delete-cluster', async (_e, id: string) => store.deleteCluster(id));

  // KVZs
  ipcMain.handle('get-kvzs', async (_e, clusterId: string) => store.getKvzs(clusterId));
  ipcMain.handle('create-kvz', async (_e, clusterId: string, data: any) => store.createKvz(clusterId, data));
  ipcMain.handle('update-kvz', async (_e, kvz: any) => store.updateKvz(kvz));
  ipcMain.handle('delete-kvz', async (_e, id: string) => store.deleteKvz(id));

  """
code = code[:del_proj_end] + cluster_kvz_ipc + code[next_ipc_after_del:]

# Wait, `getActiveProject` is missing from CustomerStore, I should add it back or remove the IPC handle.
# The user wants drilldown, so I should just leave `getActiveProject` in `CustomerStore` and `setActiveProject` as well.
# I already have `getActiveProject` in `CustomerStore`! But the `getActiveProject` returns null instead of a project. Ah wait, let's check `CustomerStore.ts`.

with open('electron/main.ts', 'w') as f:
    f.write(code)
