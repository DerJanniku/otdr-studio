import re
with open("src/App.tsx", "r") as f:
    app_tsx = f.read()

# Imports
app_tsx = app_tsx.replace("import type { CustomerItem, AppSettings, Project } from './types';", "import type { CustomerItem, AppSettings, Project, Ausbaugebiet, KVZ } from './types';")
app_tsx = app_tsx.replace("import { ProjectDashboard } from './components/ProjectDashboard';", "import { ProjectDashboard } from './components/ProjectDashboard';\nimport { AusbaugebietDashboard } from './components/AusbaugebietDashboard';\nimport { KvzDashboard } from './components/KvzDashboard';")

# States
states_to_add = """
  const [view, setView] = useState<'dashboard' | 'ausbaugebiet' | 'kvz' | 'customer'>('dashboard');
  const [ausbaugebiete, setAusbaugebiete] = useState<Ausbaugebiet[]>([]);
  const [activeAusbaugebiet, setActiveAusbaugebiet] = useState<Ausbaugebiet | null>(null);
  const [kvzs, setKvzs] = useState<KVZ[]>([]);
  const [activeKvz, setActiveKvz] = useState<KVZ | null>(null);
"""
app_tsx = re.sub(r'const \[view, setView\] = useState<\'dashboard\' \| \'project\'>\(\'dashboard\'\);', states_to_add.strip(), app_tsx)

# loadData logic
load_data_add = """
  const loadAusbaugebiete = async (projId: string) => {
    if (window.api?.getAusbaugebiete) {
      const ags = await window.api.getAusbaugebiete(projId);
      setAusbaugebiete(ags);
    }
  };
  const loadKvzs = async (agId: string) => {
    if (window.api?.getKVZs) {
      const ks = await window.api.getKVZs(agId);
      setKvzs(ks);
    }
  };
  const loadKvzCustomers = async (kId: string) => {
    if (window.api?.getKvzCustomers) {
      const list = await window.api.getKvzCustomers(kId);
      setCustomers(list);
    }
  };
"""
app_tsx = app_tsx.replace("const loadData = async () => {", load_data_add + "\n  const loadData = async () => {")

# Instead of loading customers in loadData, we only load them when viewing a KVZ!
# Actually, let's remove loadCustomers from loadData.
app_tsx = app_tsx.replace("if (window.api?.getCustomers) {\n      const list = await window.api.getCustomers();\n      setCustomers(list);\n    }", "")

# Views rendering
# Replace the huge `{view === 'dashboard' ? ( ... ) : ( ... )}` with a switch-like rendering
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

app_tsx = re.sub(r'\{view === \'dashboard\' \? \(.*?(?=\{view === \'project\')', view_render, app_tsx, flags=re.DOTALL)
app_tsx = app_tsx.replace("{view === 'project' && activeProject && (", "")
app_tsx = app_tsx.replace("""            </header>\n\n            <CustomerTable""", """            </header>\n            <div style={{ marginBottom: '1rem' }}>\n              <button onClick={() => setView('kvz')} style={{ padding: '0.5rem 1rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← Zurück zu KVZs</button>\n            </div>\n            <CustomerTable""")
# We need to make sure the closing tag for view === 'customer' is correct.
# At the very end before `<SettingsModal`, there is the closing `)}` for the ternary or conditional.
# I will just write a specific replacement script for the bottom parts.
with open("src/App.tsx", "w") as f:
    f.write(app_tsx)

