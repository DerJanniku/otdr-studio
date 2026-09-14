with open("src/vite-env.d.ts", "r") as f:
    content = f.read()

new_types = """
    getAusbaugebiete: (projectId: string) => Promise<any[]>;
    createAusbaugebiet: (projectId: string, name: string) => Promise<any>;
    getKVZs: (ausbaugebietId: string) => Promise<any[]>;
    createKVZ: (ausbaugebietId: string, name: string) => Promise<any>;
    getKvzCustomers: (kvzId: string) => Promise<any[]>;
    importKvzExcel: (kvzId: string) => Promise<{success?: boolean; error?: string; canceled?: boolean}>;
"""

content = content.replace("getCustomers: () => Promise<CustomerItem[]>;", "getCustomers: () => Promise<CustomerItem[]>;\n" + new_types)
with open("src/vite-env.d.ts", "w") as f:
    f.write(content)
