import { useState } from 'react';
import type { Project } from '../types';

interface ProjectDashboardProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (data: Partial<Project>) => Promise<void>;
  onUpdateProject: (project: Project) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onOpenSettings: () => void;
  accentColor: string;
}

export function ProjectDashboard({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onOpenSettings,
  accentColor,
}: ProjectDashboardProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    clusterName: '',
    providerName: '',
    sharepointPath: '',
  });

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      clusterName: '',
      providerName: '',
      sharepointPath: '',
    });
    setShowModal(true);
  };

  const openEditModal = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(proj);
    setFormData({
      name: proj.name,
      clusterName: proj.clusterName || '',
      providerName: proj.providerName || '',
      sharepointPath: proj.sharepointPath || '',
    });
    setShowModal(true);
  };

  const handleChooseFolder = async () => {
    if (!window.api?.chooseDirectory) return;
    const folder = await window.api.chooseDirectory();
    if (folder) {
      setFormData(prev => ({ ...prev, sharepointPath: folder }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Bitte einen Namen für das Ausbaugebiet eingeben.');
      return;
    }

    if (editingProject) {
      await onUpdateProject({
        ...editingProject,
        name: formData.name.trim(),
        clusterName: formData.clusterName.trim(),
        providerName: formData.providerName.trim(),
        sharepointPath: formData.sharepointPath.trim(),
      });
    } else {
      await onCreateProject({
        name: formData.name.trim(),
        clusterName: formData.clusterName.trim(),
        providerName: formData.providerName.trim(),
        sharepointPath: formData.sharepointPath.trim(),
      });
    }
    setShowModal(false);
  };

  const handleDelete = async (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length <= 1) {
      alert('Das letzte verbleibende Ausbaugebiet kann nicht gelöscht werden.');
      return;
    }
    const ok = window.confirm(`Möchtest du das Ausbaugebiet "${proj.name}" wirklich löschen? Alle zugehörigen Kunden- und Messdaten für dieses Gebiet werden entfernt.`);
    if (ok) {
      await onDeleteProject(proj.id);
    }
  };

  return (
    <div style={styles.container}>
      {/* HEADER BAR */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Ausbaugebiete &amp; Projekte</h1>
          <p style={styles.subtitle}>
            Wähle ein Ausbaugebiet aus, um Messungen zuzuordnen und DIN EN 50346 Protokolle zu erstellen.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={styles.btnSecondary} onClick={onOpenSettings}>
            ⚙️ Firmeneinstellungen
          </button>
          <button style={{ ...styles.btnPrimary, backgroundColor: accentColor }} onClick={openCreateModal}>
            + Neues Ausbaugebiet anlegen
          </button>
        </div>
      </div>

      {/* GRID OF PROJECTS */}
      <div style={styles.grid}>
        {projects.map(proj => {
          const total = proj.totalCustomers || 0;
          const matched = proj.matchedCustomers || 0;
          const pct = total > 0 ? Math.round((matched / total) * 100) : 0;
          const isActive = proj.id === activeProjectId;

          return (
            <div
              key={proj.id}
              style={{
                ...styles.card,
                borderColor: isActive ? accentColor : 'var(--color-border)',
                boxShadow: isActive ? `0 0 0 1.5px ${accentColor}` : undefined,
              }}
              onClick={() => onSelectProject(proj.id)}
            >
              <div style={styles.cardHeader}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={styles.cardTitle}>{proj.name}</h3>
                    {isActive && (
                      <span style={{ ...styles.activeBadge, backgroundColor: accentColor }}>Aktiv</span>
                    )}
                  </div>
                  {proj.clusterName && (
                    <span style={styles.clusterTag}>Cluster: {proj.clusterName}</span>
                  )}
                </div>
                <div style={styles.actionIcons} onClick={e => e.stopPropagation()}>
                  <button
                    style={styles.iconBtn}
                    onClick={e => openEditModal(proj, e)}
                    title="Gebiet bearbeiten"
                  >
                    ✏️
                  </button>
                  {projects.length > 1 && (
                    <button
                      style={{ ...styles.iconBtn, color: '#ef4444' }}
                      onClick={e => handleDelete(proj, e)}
                      title="Gebiet löschen"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* DETAILS */}
              <div style={styles.cardBody}>
                {proj.providerName && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Auftraggeber:</span>
                    <span style={styles.detailValue}>{proj.providerName}</span>
                  </div>
                )}
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>SharePoint-Sync:</span>
                  <span style={styles.detailValue}>
                    {proj.sharepointPath ? (
                      <span style={{ color: '#15803d', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        ✓ Verknüpft
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>Lokales Standard-Verzeichnis</span>
                    )}
                  </span>
                </div>
                {proj.sharepointPath && (
                  <div style={styles.pathPreview} title={proj.sharepointPath}>
                    📂 {proj.sharepointPath}
                  </div>
                )}

                {/* PROGRESS BAR */}
                <div style={styles.progressSection}>
                  <div style={styles.progressHeader}>
                    <span style={styles.progressLabel}>Messfortschritt:</span>
                    <span style={{ ...styles.progressPct, color: pct === 100 ? '#15803d' : 'var(--color-text-primary)' }}>
                      {pct}% ({matched} von {total} Anschlüssen)
                    </span>
                  </div>
                  <div style={styles.progressTrack}>
                    <div
                      style={{
                        ...styles.progressBar,
                        width: `${pct}%`,
                        backgroundColor: pct === 100 ? '#15803d' : accentColor,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* CARD FOOTER */}
              <div style={styles.cardFooter}>
                <button
                  style={{ ...styles.btnOpen, backgroundColor: accentColor }}
                  onClick={() => onSelectProject(proj.id)}
                >
                  Gebiet öffnen &amp; bearbeiten →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                {editingProject ? 'Ausbaugebiet bearbeiten' : 'Neues Ausbaugebiet anlegen'}
              </h2>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={styles.formLabel}>Name des Ausbaugebiets / Projekts *</label>
                <input
                  type="text"
                  required
                  placeholder="z. B. Herrieden, Neunstetten, Bernau"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={styles.formInput}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={styles.formLabel}>Cluster / Trassen-Bez. (optional)</label>
                  <input
                    type="text"
                    placeholder="z. B. NVt 01 bis 08"
                    value={formData.clusterName}
                    onChange={e => setFormData({ ...formData, clusterName: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.formLabel}>Auftraggeber (optional)</label>
                  <input
                    type="text"
                    placeholder="z. B. Deutsche Telekom, Bisping"
                    value={formData.providerName}
                    onChange={e => setFormData({ ...formData, providerName: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div>
                <label style={styles.formLabel}>
                  Lokaler SharePoint / OneDrive Sync-Ordner (optional)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Pfad zum lokal synchronisierten SharePoint-Ordner"
                    value={formData.sharepointPath}
                    onChange={e => setFormData({ ...formData, sharepointPath: e.target.value })}
                    style={{ ...styles.formInput, flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                  />
                  <button
                    type="button"
                    style={styles.btnSecondary}
                    onClick={handleChooseFolder}
                  >
                    Ordner wählen
                  </button>
                </div>
                <span style={styles.formHelp}>
                  Tipp: Wähle deinen synchronisierten OneDrive-Ordner. OTDR Studio legt fertige PDFs dann vollautomatisch unter <code>/Job_XXX/Messungen/</code> ab.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  style={styles.btnSecondary}
                  onClick={() => setShowModal(false)}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  style={{ ...styles.btnPrimary, backgroundColor: accentColor }}
                >
                  {editingProject ? 'Änderungen speichern' : 'Ausbaugebiet anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem',
    maxWidth: '1280px',
    margin: '0 auto',
    height: '100%',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    paddingBottom: '1.25rem',
    borderBottom: '1px solid var(--color-border)',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: 'var(--color-text-primary)',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.88rem',
    color: 'var(--color-text-secondary)',
    marginTop: '0.4rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '1.25rem',
  },
  card: {
    backgroundColor: 'var(--color-card)',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, border-color 0.15s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  cardTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    margin: 0,
  },
  clusterTag: {
    fontSize: '0.72rem',
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-bg-secondary)',
    padding: '2px 6px',
    borderRadius: '4px',
    marginTop: '4px',
    display: 'inline-block',
  },
  activeBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#ffffff',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  actionIcons: {
    display: 'flex',
    gap: '0.35rem',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '4px',
    borderRadius: '4px',
    opacity: 0.7,
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    marginBottom: '1.25rem',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.78rem',
  },
  detailLabel: {
    color: 'var(--color-text-secondary)',
  },
  detailValue: {
    color: 'var(--color-text-primary)',
    fontWeight: 500,
  },
  pathPreview: {
    fontSize: '0.7rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-secondary)',
    padding: '4px 6px',
    borderRadius: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  progressSection: {
    marginTop: '0.5rem',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.72rem',
    marginBottom: '4px',
  },
  progressLabel: {
    color: 'var(--color-text-secondary)',
  },
  progressPct: {
    fontWeight: 700,
  },
  progressTrack: {
    height: '6px',
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  cardFooter: {
    borderTop: '1px solid var(--color-border)',
    paddingTop: '0.85rem',
  },
  btnOpen: {
    width: '100%',
    padding: '0.55rem',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
  btnPrimary: {
    padding: '0.55rem 1rem',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '0.55rem 0.9rem',
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text-primary)',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'var(--color-card)',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
  },
  formLabel: {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: '0.35rem',
  },
  formInput: {
    width: '100%',
    padding: '0.55rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    fontSize: '0.85rem',
    boxSizing: 'border-box',
  },
  formHelp: {
    display: 'block',
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
    marginTop: '0.35rem',
    lineHeight: 1.35,
  },
};
