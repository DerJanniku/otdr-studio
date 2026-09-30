import { useState } from 'react';
import type { LevelInput } from '../types';

export interface LevelItem {
  id: string;
  name: string;
  clusterName?: string;
  providerName?: string;
  sharepointPath?: string;
  totalCustomers?: number;
  matchedCustomers?: number;
}

export interface LevelLabels {
  /** Singular, e.g. "Ausbaugebiet" */
  one: string;
  /** Accusative with article, e.g. "Neues Ausbaugebiet", "Neuen KVZ" */
  newOne: string;
  title: string;
  subtitle: string;
  namePlaceholder: string;
  clusterLabel: string;
  clusterPlaceholder: string;
  folderHelp: string;
}

interface LevelDashboardProps<T extends LevelItem> {
  labels: LevelLabels;
  items: T[];
  activeId?: string;
  /** The top level (projects) always keeps one entry; lower levels may be emptied. */
  keepLast?: boolean;
  onOpen: (id: string) => void;
  onCreate: (data: LevelInput) => Promise<void>;
  onUpdate: (item: T) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  accentColor: string;
}

const EMPTY_FORM = { name: '', clusterName: '', providerName: '', sharepointPath: '' };

export function LevelDashboard<T extends LevelItem>({
  labels,
  items,
  activeId,
  keepLast = false,
  onOpen,
  onCreate,
  onUpdate,
  onDelete,
  accentColor,
}: LevelDashboardProps<T>) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const openCreateModal = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (item: T, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(item);
    setFormData({
      name: item.name,
      clusterName: item.clusterName || '',
      providerName: item.providerName || '',
      sharepointPath: item.sharepointPath || '',
    });
    setShowModal(true);
  };

  const handleChooseFolder = async () => {
    if (!window.api?.chooseDirectory) return;
    const folder = await window.api.chooseDirectory();
    if (folder) setFormData(prev => ({ ...prev, sharepointPath: folder }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const data = {
      name: formData.name.trim(),
      clusterName: formData.clusterName.trim(),
      providerName: formData.providerName.trim(),
      sharepointPath: formData.sharepointPath.trim(),
    };
    if (!data.name) {
      alert(`Bitte einen Namen für ${labels.one === 'KVZ' ? 'den KVZ' : `das ${labels.one}`} eingeben.`);
      return;
    }
    setSaving(true);
    try {
      if (editing) await onUpdate({ ...editing, ...data });
      else await onCreate(data);
      setShowModal(false);
    } catch (err: any) {
      alert(`Speichern fehlgeschlagen: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: T, e: React.MouseEvent) => {
    e.stopPropagation();
    const scope = labels.one === 'Projekt'
      ? 'alle Ausbaugebiete, KVZs, Kundenlisten und Messzuordnungen dieses Projekts'
      : labels.one === 'Ausbaugebiet'
        ? 'alle KVZs, Kundenlisten und Messzuordnungen dieses Ausbaugebiets'
        : 'die Kundenliste und alle Messzuordnungen dieses KVZ';
    const ok = window.confirm(`„${item.name}“ wirklich löschen?\n\nDabei werden ${scope} aus OTDR Studio entfernt. Bereits erzeugte PDFs und archivierte .sor-Dateien bleiben erhalten.`);
    if (ok) await onDelete(item.id);
  };

  const canDelete = !keepLast || items.length > 1;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{labels.title}</h1>
          <p style={styles.subtitle}>{labels.subtitle}</p>
        </div>
        <button style={{ ...styles.btnPrimary, backgroundColor: accentColor }} onClick={openCreateModal}>
          + {labels.newOne} anlegen
        </button>
      </div>

      {items.length === 0 && (
        <div style={styles.emptyState}>
          <p style={{ margin: 0, fontWeight: 600 }}>Hier gibt es noch keine Einträge.</p>
          <p style={{ margin: '0.4rem 0 1rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
            Lege {labels.one === 'KVZ' ? 'den ersten KVZ' : `das erste ${labels.one}`} an, um weiterzumachen.
          </p>
          <button style={{ ...styles.btnPrimary, backgroundColor: accentColor }} onClick={openCreateModal}>
            + {labels.newOne} anlegen
          </button>
        </div>
      )}

      <div style={styles.grid}>
        {items.map(item => {
          const total = item.totalCustomers || 0;
          const matched = item.matchedCustomers || 0;
          const pct = total > 0 ? Math.round((matched / total) * 100) : 0;
          const isActive = item.id === activeId;

          return (
            <div
              key={item.id}
              style={{
                ...styles.card,
                borderColor: isActive ? accentColor : 'var(--color-border)',
                boxShadow: isActive ? `0 0 0 1.5px ${accentColor}` : undefined,
              }}
              onClick={() => onOpen(item.id)}
            >
              <div style={styles.cardHeader}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={styles.cardTitle}>{item.name}</h3>
                    {isActive && <span style={{ ...styles.activeBadge, backgroundColor: accentColor }}>Zuletzt geöffnet</span>}
                  </div>
                  {item.clusterName && <span style={styles.clusterTag}>{labels.clusterLabel}: {item.clusterName}</span>}
                </div>
                <div style={styles.actionIcons} onClick={e => e.stopPropagation()}>
                  <button style={styles.iconBtn} onClick={e => openEditModal(item, e)} title={`${labels.one} bearbeiten`} aria-label={`${labels.one} bearbeiten`}>
                    ✏️
                  </button>
                  {canDelete && (
                    <button style={{ ...styles.iconBtn, color: '#ef4444' }} onClick={e => handleDelete(item, e)} title={`${labels.one} löschen`} aria-label={`${labels.one} löschen`}>
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              <div style={styles.cardBody}>
                {item.providerName && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Auftraggeber:</span>
                    <span style={styles.detailValue}>{item.providerName}</span>
                  </div>
                )}
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>SharePoint-Ordner:</span>
                  <span style={styles.detailValue}>
                    {item.sharepointPath ? (
                      <span style={{ color: '#15803d', fontWeight: 600 }}>✓ Eigener Ordner</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>{labels.one === 'Projekt' ? 'Lokal (Dokumente)' : 'Vom übergeordneten Eintrag'}</span>
                    )}
                  </span>
                </div>
                {item.sharepointPath && (
                  <div style={styles.pathPreview} title={item.sharepointPath}>📂 {item.sharepointPath}</div>
                )}

                <div style={styles.progressSection}>
                  <div style={styles.progressHeader}>
                    <span style={styles.progressLabel}>Messfortschritt:</span>
                    <span style={{ ...styles.progressPct, color: pct === 100 ? '#15803d' : 'var(--color-text-primary)' }}>
                      {pct}% ({matched} von {total} Anschlüssen)
                    </span>
                  </div>
                  <div style={styles.progressTrack}>
                    <div style={{ ...styles.progressBar, width: `${pct}%`, backgroundColor: pct === 100 ? '#15803d' : accentColor }} />
                  </div>
                </div>
              </div>

              <div style={styles.cardFooter}>
                <button style={{ ...styles.btnOpen, backgroundColor: accentColor }} onClick={e => { e.stopPropagation(); onOpen(item.id); }}>
                  Öffnen →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                {editing ? `${labels.one} bearbeiten` : `${labels.newOne} anlegen`}
              </h2>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)} aria-label="Schließen">✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={styles.formLabel}>Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={labels.namePlaceholder}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={styles.formInput}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={styles.formLabel}>{labels.clusterLabel} (optional)</label>
                  <input
                    type="text"
                    placeholder={labels.clusterPlaceholder}
                    value={formData.clusterName}
                    onChange={e => setFormData({ ...formData, clusterName: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.formLabel}>Auftraggeber (optional)</label>
                  <input
                    type="text"
                    placeholder="z. B. Deutsche Telekom"
                    value={formData.providerName}
                    onChange={e => setFormData({ ...formData, providerName: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div>
                <label style={styles.formLabel}>SharePoint- / OneDrive-Sync-Ordner (optional)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Pfad zum lokal synchronisierten SharePoint-Ordner"
                    value={formData.sharepointPath}
                    onChange={e => setFormData({ ...formData, sharepointPath: e.target.value })}
                    style={{ ...styles.formInput, flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                  />
                  <button type="button" style={styles.btnSecondary} onClick={handleChooseFolder}>Ordner wählen</button>
                </div>
                <span style={styles.formHelp}>{labels.folderHelp}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowModal(false)}>Abbrechen</button>
                <button type="submit" disabled={saving} style={{ ...styles.btnPrimary, backgroundColor: accentColor, opacity: saving ? 0.6 : 1 }}>
                  {editing ? 'Änderungen speichern' : `${labels.one} anlegen`}
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
  emptyState: {
    border: '1px dashed var(--color-border)',
    borderRadius: '10px',
    padding: '2rem',
    textAlign: 'center',
    marginBottom: '1.25rem',
  },
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
