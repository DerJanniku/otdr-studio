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

c = c.replace("""    if (window.api?.getCustomers) {
      const list = await window.api.getCustomers();
      setCustomers(list);
    }""", "")


# 4. View Rendering
start_idx = c.find("{view === 'dashboard' ? (")
end_idx = c.find("{/* PREVIEW & EDIT MODAL */}")

view_render = """
      {view === 'dashboard' && (
        <ProjectDashboard
          projects={projects}
          activeProjectId={activeProject?.id || ''}
          onSelectProject={async (id) => {
            const res = await window.api?.setActiveProject?.(id);
            if (res?.success && res.project) {
              setActiveProject(res.project);
              await loadAusbaugebiete(id);
              setView('ausbaugebiet');
            }
          }}
          onCreateProject={async (data) => {
            await window.api?.createProject?.(data);
            await loadProjects();
          }}
          onUpdateProject={async (p) => {
            await window.api?.updateProject?.(p);
            await loadProjects();
          }}
          onDeleteProject={async (id) => {
            await window.api?.deleteProject?.(id);
            await loadProjects();
          }}
          onOpenSettings={() => setShowSettings(true)}
          accentColor={settings.accentColor}
        />
      )}

      {view === 'ausbaugebiet' && activeProject && (
        <AusbaugebietDashboard
          parentProjectId={activeProject.id}
          onBack={() => setView('dashboard')}
          ausbaugebiets={ausbaugebiete}
          activeAusbaugebietId={activeAusbaugebiet?.id || ''}
          onSelectAusbaugebiet={async (id) => {
            const ag = ausbaugebiete.find(a => a.id === id);
            if (ag) {
              setActiveAusbaugebiet(ag);
              await loadKvzs(id);
              setView('kvz');
            }
          }}
          onCreateAusbaugebiet={async (data) => {
            if (window.api?.createAusbaugebiet) {
               await window.api.createAusbaugebiet(activeProject.id, data.name || '');
               await loadAusbaugebiete(activeProject.id);
            }
          }}
          onUpdateAusbaugebiet={async () => {}}
          onDeleteAusbaugebiet={async () => {}}
          onOpenSettings={() => setShowSettings(true)}
          accentColor={settings.accentColor}
        />
      )}

      {view === 'kvz' && activeAusbaugebiet && (
        <KvzDashboard
          parentAusbaugebietId={activeAusbaugebiet.id}
          onBack={() => setView('ausbaugebiet')}
          kvzs={kvzs}
          activeKvzId={activeKvz?.id || ''}
          onSelectKVZ={async (id) => {
            const k = kvzs.find(x => x.id === id);
            if (k) {
              setActiveKvz(k);
              await loadKvzCustomers(id);
              setView('customer');
            }
          }}
          onCreateKVZ={async (data) => {
            if (window.api?.createKVZ) {
               await window.api.createKVZ(activeAusbaugebiet.id, data.name || '');
               await loadKvzs(activeAusbaugebiet.id);
            }
          }}
          onUpdateKVZ={async () => {}}
          onDeleteKVZ={async () => {}}
          onOpenSettings={() => setShowSettings(true)}
          accentColor={settings.accentColor}
        />
      )}

      {view === 'customer' && activeKvz && (
"""

# The dashboard and customer view from original
# Original customer view starts at `) : (`
mid_idx = c.find(") : (", start_idx, end_idx)
cust_view_code = c[mid_idx+5:end_idx].strip()
# cust_view_code ends with `)}`
if cust_view_code.endswith(")}"):
    cust_view_code = cust_view_code[:-2]

# Add a back button to customer view
# <div style={styles.header}> -> add back button inside
cust_view_code = cust_view_code.replace("<div style={styles.header}>", 
  "<div style={styles.header}>\n          <button onClick={() => setView('kvz')} style={{ ...styles.btnSecondary, marginRight: '1rem', height: 'fit-content' }}>← Zurück zu KVZs</button>")

# The Excel Import logic is in Customer View: `handleImportExcel`
# We need to change `handleImportExcel` to `window.api.importKvzExcel(activeKvz.id)`
import_logic = """
  const handleImportExcel = async () => {
    if (!activeKvz) return;
    setIsImportingExcel(true);
    try {
      if (window.api?.importKvzExcel) {
        const res = await window.api.importKvzExcel(activeKvz.id);
        if (res?.success) {
          showToast(`Erfolgreich importiert.`);
          await loadKvzCustomers(activeKvz.id);
        } else if (res?.error) {
          alert('Import Fehler: ' + res.error);
        }
      }
    } finally {
      setIsImportingExcel(false);
    }
  };
"""
# Find handleImportExcel and replace it
c = re.sub(r'const handleImportExcel = async \(\) => \{.*?(?=\s*const handleSaveSettings)', import_logic, c, flags=re.DOTALL)

# Assemble everything
new_c = c[:start_idx] + view_render + cust_view_code + "\n      )}\n\n      " + c[end_idx:]

with open("src/App.tsx", "w") as f:
    f.write(new_c)

