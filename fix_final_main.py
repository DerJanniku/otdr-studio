with open('electron/main.ts', 'r') as f:
    code = f.read()

# Fix saveCustomers 1 arg -> 2 args
code = code.replace("customerStore.saveCustomers(scanRes.updatedCustomers)", "customerStore.saveCustomers(customerStore.getActiveKvzId(), scanRes.updatedCustomers)")
code = code.replace("customerStore.saveCustomers(allCustomers)", "customerStore.saveCustomers(customerStore.getActiveKvzId(), allCustomers)")
code = code.replace("customerStore.updateCustomer(customer)", "customerStore.updateCustomer(customerStore.getActiveKvzId(), customer)")

# Fix sharepointPath
code = code.replace("activeProj?.sharepointPath", "undefined")
code = code.replace("activeProj.sharepointPath", "''")

with open('electron/main.ts', 'w') as f:
    f.write(code)
