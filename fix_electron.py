import re

for file in ['electron/PdfExporter.ts', 'electron/SorMatcher.ts', 'electron/main.ts']:
    with open(file, 'r') as f:
        code = f.read()
    code = code.replace("import { CustomerItem, AppSettings } from './CustomerStore';", "import type { CustomerItem, AppSettings } from '../src/types';")
    code = code.replace("import { CustomerItem } from './CustomerStore';", "import type { CustomerItem } from '../src/types';")
    code = code.replace("import { AppSettings, CustomerItem, Project } from './CustomerStore';", "import type { AppSettings, CustomerItem, Project } from '../src/types';")
    with open(file, 'w') as f:
        f.write(code)

with open('electron/CustomerStore.ts', 'r') as f:
    code = f.read()
code = code.replace("import { Project, Cluster, KVZ, CustomerItem, AppSettings, ExcelColumnMapping } from '../src/types';", "import type { Project, Cluster, KVZ, CustomerItem, AppSettings, ExcelColumnMapping } from '../src/types';")
with open('electron/CustomerStore.ts', 'w') as f:
    f.write(code)
