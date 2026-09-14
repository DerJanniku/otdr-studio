with open('electron/main.ts', 'r') as f:
    code = f.read()

code = code.replace("import type {, type AppSettings, type CustomerItem } from '../src/types';", "import type { AppSettings, CustomerItem, Project } from '../src/types';")
with open('electron/main.ts', 'w') as f:
    f.write(code)
