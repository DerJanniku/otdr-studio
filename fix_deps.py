import re

for file in ['electron/PdfExporter.ts', 'electron/SorMatcher.ts']:
    with open(file, 'r') as f:
        code = f.read()
    # It says it imports from './CustomerStore'. We need to change that.
    code = re.sub(r"import\s*\{(.*?)\}\s*from\s*['\"](\./CustomerStore)['\"];", r"import type {\1} from '../src/types';", code)
    with open(file, 'w') as f:
        f.write(code)

