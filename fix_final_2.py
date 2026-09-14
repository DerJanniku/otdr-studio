with open('electron/main.ts', 'r') as f:
    code = f.read()

code = code.replace("ipcMain.handle('save-customers', async (_e, customers) => {\n    return customerStore.saveCustomers(customers);\n  });",
                    "ipcMain.handle('save-customers', async (_e, kvzId: string, customers) => {\n    return customerStore.saveCustomers(kvzId, customers);\n  });")
code = code.replace("ipcMain.handle('update-customer', async (_e, customer) => {\n    return customerStore.updateCustomer(customerStore.getActiveKvzId(), customer);\n  });",
                    "ipcMain.handle('update-customer', async (_e, kvzId: string, customer) => {\n    return customerStore.updateCustomer(kvzId, customer);\n  });")
code = code.replace("activeProj!.sharepointPath!", "''")
code = code.replace("activeProj?.sharepointPath", "undefined")
code = code.replace("activeProj.sharepointPath", "''")

with open('electron/main.ts', 'w') as f:
    f.write(code)
