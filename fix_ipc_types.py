with open("electron/main.ts", "r") as f: c = f.read()

c = c.replace("path.join(customerStore.userDir, 'kvzs.json')", "path.join(app.getPath('userData'), 'otdr-studio', 'kvzs.json')")
c = c.replace("status: 'matched' as any,", "status: 'matched' as any,\n         fiberNumber: 1,")

with open("electron/main.ts", "w") as f: f.write(c)
