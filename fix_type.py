import re

for file in ['electron/PdfExporter.ts', 'electron/SorMatcher.ts']:
    with open(file, 'r') as f:
        code = f.read()
    code = code.replace("import type { CustomerItem, AppSettings } from './CustomerStore';", "import type { CustomerItem, AppSettings } from '../src/types';")
    code = code.replace("import type { CustomerItem } from './CustomerStore';", "import type { CustomerItem } from '../src/types';")
    with open(file, 'w') as f:
        f.write(code)
