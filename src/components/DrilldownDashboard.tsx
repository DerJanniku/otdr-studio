
import { useState, useEffect } from 'react';
import type { Project, Cluster, KVZ } from '../types';

export function DrilldownDashboard({ onSelectKvz, }: { onSelectKvz: (k: KVZ) => void,} ) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [kvzs, setKvzs] = useState<KVZ[]>([]);

  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeCluster, setActiveCluster] = useState<Cluster | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    if (window.api?.getProjects) {
      setProjects(await window.api.getProjects());
    }
  };

  const loadClusters = async (projId: string) => {
    if (window.api?.getClusters) {
      setClusters(await window.api.getClusters(projId));
    }
  };

  const loadKvzs = async (clusterId: string) => {
    if (window.api?.getKvzs) {
      setKvzs(await window.api.getKvzs(clusterId));
    }
  };

  const handleCreateProject = async () => {
    const name = prompt('Projektname:');
    if (name && window.api?.createProject) {
      await window.api.createProject({ name });
      loadProjects();
    }
  };

  const handleCreateCluster = async () => {
    if (!activeProject) return;
    const name = prompt('Ausbaugebiet Name:');
    if (name && window.api?.createCluster) {
      await window.api.createCluster(activeProject.id, { name });
      loadClusters(activeProject.id);
    }
  };

  const handleCreateKvz = async () => {
    if (!activeCluster) return;
    const name = prompt('KVZ Name:');
    if (name && window.api?.createKvz) {
      await window.api.createKvz(activeCluster.id, { name });
      loadKvzs(activeCluster.id);
    }
  };

  const handleImportKvz = async (kvz: KVZ) => {
    if (window.api?.importCustomerFile) {
      const res = await window.api.importCustomerFile(kvz.id);
      if (res.success) {
        alert(`${res.count} Kunden importiert!`);
      } else if (!res.canceled) {
        alert('Import Fehler: ' + res.error);
      }
    }
  };

  const handleDeleteKvz = async (id: string) => {
    if (confirm('Wirklich löschen?') && window.api?.deleteKvz) {
      await window.api.deleteKvz(id);
      if (activeCluster) loadKvzs(activeCluster.id);
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '2rem', height: '100%', overflowY: 'auto' }}>
      {/* PROJECTS COL */}
      <div style={{ flex: 1, borderRight: '1px solid var(--color-border)', paddingRight: '1rem' }}>
        <h3>Projekte <button onClick={handleCreateProject}>+</button></h3>
        {projects.map(p => (
          <div 
            key={p.id} 
            onClick={() => { setActiveProject(p); setActiveCluster(null); loadClusters(p.id); }}
            style={{ padding: '0.5rem', cursor: 'pointer', background: activeProject?.id === p.id ? 'var(--color-bg-secondary)' : 'transparent' }}
          >
            {p.name}
          </div>
        ))}
      </div>

      {/* CLUSTERS COL */}
      {activeProject && (
        <div style={{ flex: 1, borderRight: '1px solid var(--color-border)', paddingRight: '1rem' }}>
          <h3>Gebiete (Cluster) <button onClick={handleCreateCluster}>+</button></h3>
          {clusters.map(c => (
            <div 
              key={c.id} 
              onClick={() => { setActiveCluster(c); loadKvzs(c.id); }}
              style={{ padding: '0.5rem', cursor: 'pointer', background: activeCluster?.id === c.id ? 'var(--color-bg-secondary)' : 'transparent' }}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}

      {/* KVZ COL */}
      {activeCluster && (
        <div style={{ flex: 1 }}>
          <h3>KVZ (NVT) <button onClick={handleCreateKvz}>+</button></h3>
          {kvzs.map(k => (
            <div key={k.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', marginBottom: '1rem', borderRadius: '4px' }}>
              <h4>{k.name}</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={() => onSelectKvz(k)}>Öffnen (Kundenliste)</button>
                <button onClick={() => handleImportKvz(k)}>Excel Importieren</button>
                <button onClick={() => handleDeleteKvz(k.id)} style={{ color: 'red' }}>Löschen</button>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'var(--color-bg-base)' }}>
                <h5>POP zu KVZ Messungen (.sor Upload)</h5>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Hier können .sor Dateien für die Fasern vom POP zum KVZ hochgeladen werden.</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={() => alert('Wird implementiert: SOR Upload / USB Scan für KVZ')}>SOR Dateien (POP-&gt;KVZ) hinzufügen</button>
                  <button onClick={() => window.api?.generateKvzPdf?.(k.id)}>KVZ PDF Protokoll generieren</button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
