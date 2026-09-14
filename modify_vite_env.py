import re

with open('src/vite-env.d.ts', 'r') as f:
    code = f.read()

code = re.sub(r"getCustomers: \(\) => Promise<any\[\]>;", 
              "getCustomers: (kvzId: string) => Promise<any[]>;", code)
code = re.sub(r"saveCustomers: \(customers: any\[\]\) => Promise<boolean>;",
              "saveCustomers: (kvzId: string, customers: any[]) => Promise<boolean>;", code)
code = re.sub(r"updateCustomer: \(customer: any\) => Promise<boolean>;",
              "updateCustomer: (kvzId: string, customer: any) => Promise<boolean>;", code)
code = re.sub(r"importCustomerFile: \(\) => Promise<\{.*?}>;",
              "importCustomerFile: (kvzId: string) => Promise<{ success: boolean; count?: number; filePath?: string; customers?: any[]; canceled?: boolean; error?: string; warning?: string }>;", code)

# add cluster/KVZ
cluster_kvz_types = """
    getClusters: (projectId: string) => Promise<any[]>;
    createCluster: (projectId: string, data: any) => Promise<any>;
    updateCluster: (cluster: any) => Promise<any>;
    deleteCluster: (id: string) => Promise<boolean>;

    getKvzs: (clusterId: string) => Promise<any[]>;
    createKvz: (clusterId: string, data: any) => Promise<any>;
    updateKvz: (kvz: any) => Promise<any>;
    deleteKvz: (id: string) => Promise<boolean>;
"""
code = code.replace("deleteProject: (id: string) => Promise<boolean>;", "deleteProject: (id: string) => Promise<boolean>;" + cluster_kvz_types)

with open('src/vite-env.d.ts', 'w') as f:
    f.write(code)
