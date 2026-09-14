with open("src/App.tsx", "r") as f:
    c = f.read()

# Imports
c = c.replace("import type { CustomerItem, AppSettings, Project } from './types';", "import type { CustomerItem, AppSettings, Project, Ausbaugebiet, KVZ } from './types';")
c = c.replace("import { ProjectDashboard } from './components/ProjectDashboard';", "import { ProjectDashboard } from './components/ProjectDashboard';\nimport { AusbaugebietDashboard } from './components/AusbaugebietDashboard';\nimport { KvzDashboard } from './components/KvzDashboard';")

# States
c = c.replace("const [view, setView] = useState<'dashboard' | 'project'>('dashboard');", 
"""const [view, setView] = useState<'dashboard' | 'ausbaugebiet' | 'kvz' | 'project'>('dashboard');
  const [ausbaugebiete, setAusbaugebiete] = useState<Ausbaugebiet[]>([]);
  const [activeAusbaugebiet, setActiveAusbaugebiet] = useState<Ausbaugebiet | null>(null);
  const [kvzs, setKvzs] = useState<KVZ[]>([]);
  const [activeKvz, setActiveKvz] = useState<KVZ | null>(null);""")

# Loaders
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

view_render = """
      {view === 'dashboard' ? (
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
      ) : view === 'ausbaugebiet' && activeProject ? (
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
      ) : view === 'kvz' && activeAusbaugebiet ? (
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
              setView('project');
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
      ) : ("""

# Replace `{view === 'dashboard' ? (` until `) : (` which is exactly the dashboard part!
# The original code looks like:
# {view === 'dashboard' ? (
#   <ProjectDashboard ... />
# ) : (
start_idx = c.find("{view === 'dashboard' ? (")
mid_idx = c.find(") : (", start_idx)

c = c[:start_idx] + view_render + c[mid_idx+5:]

old_import = """  const handleImportExcel = async () => {
    try {
      if (window.api?.importCustomerFile) {
        setIsImportingExcel(true);
        const res = await window.api.importCustomerFile();
        if (res?.success) {
          showToast(`Erfolgreich ${res.count} Kunden importiert.`);
          if (window.api?.getCustomers) setCustomers(await window.api.getCustomers());
        } else if (res?.error) {
          alert('Import Fehler: ' + res.error);
        }
      }
    } finally {
      setIsImportingExcel(false);
    }
  };"""

new_import = """  const handleImportExcel = async () => {
    try {
      if (window.api?.importKvzExcel && activeKvz) {
        setIsImportingExcel(true);
        const res = await window.api.importKvzExcel(activeKvz.id);
        if (res?.success) {
          showToast(`Erfolgreich importiert.`);
          await loadKvzCustomers(activeKvz.id);
        } else if (res?.error) {
          alert('Import Fehler: ' + res.error);
        }
      } else {
        if (window.api?.importCustomerFile) {
          setIsImportingExcel(true);
          const res = await window.api.importCustomerFile();
          if (res?.success && window.api?.getCustomers) setCustomers(await window.api.getCustomers());
        }
      }
    } finally {
      setIsImportingExcel(false);
    }
  };"""
c = c.replace(old_import, new_import)

c = c.replace("<div style={styles.header}>", "<div style={styles.header}>\n          <button onClick={() => setView('kvz')} style={{ ...styles.btnSecondary, marginRight: '1rem', height: 'fit-content' }}>← Zurück zu KVZs</button>")

with open("src/App.tsx", "w") as f:
    f.write(c)
