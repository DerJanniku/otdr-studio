with open("src/App.tsx", "r") as f:
    orig = f.read()

# 1. Imports
c = orig.replace("import type { CustomerItem, AppSettings, Project } from './types';", "import type { CustomerItem, AppSettings, Project, Ausbaugebiet, KVZ } from './types';")
c = c.replace("import { ProjectDashboard } from './components/ProjectDashboard';", "import { ProjectDashboard } from './components/ProjectDashboard';\nimport { AusbaugebietDashboard } from './components/AusbaugebietDashboard';\nimport { KvzDashboard } from './components/KvzDashboard';")

# 2. States
c = c.replace("const [view, setView] = useState<'dashboard' | 'project'>('dashboard');", 
"""const [view, setView] = useState<'dashboard' | 'ausbaugebiet' | 'kvz' | 'customer'>('dashboard');
  const [ausbaugebiete, setAusbaugebiete] = useState<Ausbaugebiet[]>([]);
  const [activeAusbaugebiet, setActiveAusbaugebiet] = useState<Ausbaugebiet | null>(null);
  const [kvzs, setKvzs] = useState<KVZ[]>([]);
  const [activeKvz, setActiveKvz] = useState<KVZ | null>(null);""")

# 3. Loaders
loaders = """
  const loadAusbaugebiete = async (projId: string) => {
    if (window.api?.getAusbaugebiete) {
      setAusbaugebiete(await window.api.getAusbaugebiete(projId));
    }
  };
  const loadKvzs = async (agId: string) => {
    if (window.api?.getKVZs) {
      setKvzs(await window.api.getKVZs(agId));
    }
  };
  const loadKvzCustomers = async (kId: string) => {
    if (window.api?.getKvzCustomers) {
      setCustomers(await window.api.getKvzCustomers(kId));
    }
  };
"""
c = c.replace("const loadData = async () => {", loaders + "\n  const loadData = async () => {")

# Remove getCustomers from loadData because we only load customers in KVZ
c = c.replace("""    if (window.api?.getCustomers) {
      const list = await window.api.getCustomers();
      setCustomers(list);
    }""", "")


# 4. View Rendering
# We have a ternary: `{view === 'dashboard' ? ( ... ) : ( ... )}`
# Let's just find the entire block and replace it manually.

import re
# The dashboard part starts at `{view === 'dashboard' ? (` and ends at the middle `) : (`
# And then the project part starts and ends at `)}` before `<ProtocolPreviewModal`

match = re.search(r'\{view === \'dashboard\' \? \(.*?(?=\s*\{/\* PREVIEW & EDIT MODAL \*/\})', c, flags=re.DOTALL)
if match:
    # Instead of full regex replace, let's just do precise string splitting.
    pass

