import re

for file in ['electron/PdfExporter.ts', 'electron/SorMatcher.ts']:
    with open(file, 'r') as f:
        code = f.read()
    code = re.sub(r"import \{(.*?)\} from './CustomerStore';", r"import type {\1} from '../src/types';", code)
    with open(file, 'w') as f:
        f.write(code)

with open('electron/main.ts', 'r') as f:
    code = f.read()
code = re.sub(r"import \{ CustomerStore(.*?)\} from './CustomerStore';", r"import { CustomerStore } from './CustomerStore';\nimport type {\1} from '../src/types';", code)
with open('electron/main.ts', 'w') as f:
    f.write(code)

