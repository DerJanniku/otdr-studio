import re

with open('electron/preload.ts', 'r') as f:
    code = f.read()

# Replace getCustomers etc.
code = re.sub(r"getCustomers: \(\) => ipcRenderer\.invoke\('get-customers'\),", 
              "getCustomers: (kvzId: string) => ipcRenderer.invoke('get-customers', kvzId),", code)
code = re.sub(r"saveCustomers: \(customers\) => ipcRenderer\.invoke\('save-customers', customers\),",
              "saveCustomers: (kvzId: string, customers: any) => ipcRenderer.invoke('save-customers', kvzId, customers),", code)
code = re.sub(r"updateCustomer: \(customer\) => ipcRenderer\.invoke\('update-customer', customer\),",
              "updateCustomer: (kvzId: string, customer: any) => ipcRenderer.invoke('update-customer', kvzId, customer),", code)
code = re.sub(r"importCustomerFile: \(\) => ipcRenderer\.invoke\('import-customer-file'\),",
              "importCustomerFile: (kvzId: string) => ipcRenderer.invoke('import-customer-file', kvzId),", code)

# Add cluster/KVZ
cluster_kvz_preload = """
  getClusters: (projectId: string) => ipcRenderer.invoke('get-clusters', projectId),
  createCluster: (projectId: string, data: any) => ipcRenderer.invoke('create-cluster', projectId, data),
  updateCluster: (cluster: any) => ipcRenderer.invoke('update-cluster', cluster),
  deleteCluster: (id: string) => ipcRenderer.invoke('delete-cluster', id),

  getKvzs: (clusterId: string) => ipcRenderer.invoke('get-kvzs', clusterId),
  createKvz: (clusterId: string, data: any) => ipcRenderer.invoke('create-kvz', clusterId, data),
  updateKvz: (kvz: any) => ipcRenderer.invoke('update-kvz', kvz),
  deleteKvz: (id: string) => ipcRenderer.invoke('delete-kvz', id),
"""
code = code.replace("deleteProject: (id) => ipcRenderer.invoke('delete-project', id),", "deleteProject: (id) => ipcRenderer.invoke('delete-project', id)," + cluster_kvz_preload)

with open('electron/preload.ts', 'w') as f:
    f.write(code)
