import re
with open("src/components/AusbaugebietDashboard.tsx", "r") as f:
    c = f.read()

# fix imports
c = c.replace("import type { Ausbaugebiet } from '../types';", "import type { Ausbaugebiet } from '../types';")
# wait, it says `activeAusbaugebietId: string;`
# let's just make it compile.
