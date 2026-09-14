with open('electron/main.ts', 'r') as f:
    code = f.read()

code = code.replace("if (undefined && fs.existsSync('')) {", "if (false) {")
code = code.replace("const hasSharepoint = !!(undefined && fs.existsSync(''));", "const hasSharepoint = false;")
code = code.replace("customerStore.updateCustomer(cust);", "customerStore.updateCustomer(customerStore.getActiveKvzId(), cust);")

with open('electron/main.ts', 'w') as f:
    f.write(code)
