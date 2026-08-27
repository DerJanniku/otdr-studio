import { useEffect, useState } from 'react';
import type { AppSettings } from '../types';

interface SettingsPreset {
  id: number;
  name: string;
  settings: AppSettings;
}

interface SettingsModalProps {
  settings: AppSettings;
  onClose: () => void;
  onSave: (newSettings: AppSettings) => void;
}

export function SettingsModal({ settings, onClose, onSave }: SettingsModalProps) {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [presets, setPresets] = useState<SettingsPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<number | ''>('');
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    if (window.api?.getSettingPresets) {
      window.api.getSettingPresets().then(setPresets);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleLoadPreset = () => {
    const preset = presets.find(p => p.id === selectedPresetId);
    if (preset) setFormData({ ...preset.settings });
  };

  const handleSaveAsPreset = async () => {
    const name = newPresetName.trim();
    if (!name || !window.api?.saveSettingPreset) return;
    const updated = await window.api.saveSettingPreset(name, formData);
    setPresets(updated);
    setNewPresetName('');
  };

  const handleDeletePreset = async () => {
    if (selectedPresetId === '' || !window.api?.deleteSettingPreset) return;
    const preset = presets.find(p => p.id === selectedPresetId);
    if (!preset || !confirm(`Preset "${preset.name}" wirklich löschen?`)) return;
    const updated = await window.api.deleteSettingPreset(preset.id);
    setPresets(updated);
    setSelectedPresetId('');
  };

  const handleLogoUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormData({ ...formData, logoBase64: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormData({ ...formData, signatureBase64: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const ACCENT_PRESETS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ef4444', '#0ea5e9'];

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Globale Einstellungen &amp; TAB-Parameter
          </h3>
          <button style={styles.btnClose} onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.presetBar}>
            <div style={styles.presetRow}>
              <select
                style={styles.presetSelect}
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Preset wählen (z.B. Kollege)...</option>
                {presets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button style={styles.btnPresetAction} onClick={handleLoadPreset} disabled={selectedPresetId === ''}>
                Laden
              </button>
              <button style={styles.btnPresetDanger} onClick={handleDeletePreset} disabled={selectedPresetId === ''}>
                Löschen
              </button>
            </div>
            <div style={styles.presetRow}>
              <input
                style={styles.presetSelect}
                placeholder="Name für neues Preset (z.B. 'Kollege Max')"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
              />
              <button style={styles.btnPresetAction} onClick={handleSaveAsPreset} disabled={!newPresetName.trim()}>
                Als Preset speichern
              </button>
            </div>
            <p style={styles.presetHint}>
              Presets speichern die aktuell im Formular unten stehenden Werte (Techniker, Firma, Grenzwerte, ...) unter einem Namen -
              praktisch, wenn mehrere Kollegen die App mit eigenen Angaben nutzen. "Laden" füllt nur das Formular, erst "Einstellungen speichern" macht es aktiv.
            </p>
          </div>

          <div style={styles.grid}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={styles.label}>Auftragnehmer (Messtechnik-Fachbetrieb):</label>
              <input 
                style={styles.input}
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Abteilung / Fachbereich:</label>
              <input 
                style={styles.input}
                value={formData.companyDept}
                onChange={(e) => setFormData({ ...formData, companyDept: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Kontakt / Telefon / E-Mail:</label>
              <input 
                style={styles.input}
                value={formData.companyContact}
                onChange={(e) => setFormData({ ...formData, companyContact: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Standard-Messtechniker:</label>
              <input 
                style={styles.input}
                value={formData.defaultTechnician}
                onChange={(e) => setFormData({ ...formData, defaultTechnician: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Auftraggeber (Netzbetreiber):</label>
              <input 
                style={styles.input}
                value={formData.providerName}
                onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Projektname / Ausbau-Cluster:</label>
              <input 
                style={styles.input}
                value={formData.projectCluster}
                onChange={(e) => setFormData({ ...formData, projectCluster: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>OTDR-Messgerät (Modell):</label>
              <input
                style={styles.input}
                placeholder="z. B. VIAVI MTS-2000, EXFO FTB-1, ..."
                value={formData.otdrDeviceModel}
                onChange={(e) => setFormData({ ...formData, otdrDeviceModel: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Vorlauf- &amp; Nachlauffaser:</label>
              <input
                style={styles.input}
                value={formData.launchFiber}
                onChange={(e) => setFormData({ ...formData, launchFiber: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Max. Spleißdämpfung (dB):</label>
              <input 
                type="number"
                step="0.01"
                style={styles.input}
                value={formData.maxLossSplice}
                onChange={(e) => setFormData({ ...formData, maxLossSplice: parseFloat(e.target.value) || 0.15 })}
              />
            </div>
            <div>
              <label style={styles.label}>Max. Steckerdämpfung (dB):</label>
              <input
                type="number"
                step="0.01"
                style={styles.input}
                value={formData.maxLossConnector}
                onChange={(e) => setFormData({ ...formData, maxLossConnector: parseFloat(e.target.value) || 0.50 })}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.6rem' }}>
              Darstellung
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setFormData({ ...formData, accentColor: c })}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: formData.accentColor === c ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                  aria-label={`Akzentfarbe ${c}`}
                />
              ))}
              <input
                type="color"
                value={formData.accentColor}
                onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                style={{ width: '30px', height: '26px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '0.5rem' }}>
                <button
                  style={{ ...styles.btnPresetAction, ...(formData.themeMode === 'dark' ? {} : { backgroundColor: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }) }}
                  onClick={() => setFormData({ ...formData, themeMode: 'dark' })}
                >
                  Dunkel
                </button>
                <button
                  style={{ ...styles.btnPresetAction, ...(formData.themeMode === 'light' ? {} : { backgroundColor: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }) }}
                  onClick={() => setFormData({ ...formData, themeMode: 'light' })}
                >
                  Hell
                </button>
              </div>
            </div>

            <label style={styles.label}>Firmenlogo (optional, erscheint auf dem PDF-Protokoll):</label>
            <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)} />
            {formData.logoBase64 && (
              <div style={{ marginTop: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <img src={formData.logoBase64} alt="Logo-Vorschau" style={{ maxHeight: '36px', maxWidth: '180px' }} />
                <button style={styles.btnPresetDanger} onClick={() => setFormData({ ...formData, logoBase64: undefined })}>
                  Logo entfernen
                </button>
              </div>
            )}

            <label style={{ ...styles.label, marginTop: '0.75rem' }}>
              Eigene Unterschrift (optional - wird automatisch bei "Prüfer / Auftragnehmer" ins PDF eingesetzt):
            </label>
            <input type="file" accept="image/png,image/jpeg" onChange={(e) => handleSignatureUpload(e.target.files?.[0] || null)} />
            <p style={styles.presetHint}>
              Am besten ein Foto/Scan deiner Unterschrift auf weißem Hintergrund oder ein PNG mit transparentem
              Hintergrund. Die Abnahme-Unterschrift des Auftraggebers bleibt weiterhin ein leeres Feld zum
              manuellen Unterschreiben - die kann die App nicht für jemand anderen leisten.
            </p>
            {formData.signatureBase64 && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <img src={formData.signatureBase64} alt="Unterschrift-Vorschau" style={{ maxHeight: '36px', maxWidth: '180px', backgroundColor: '#fff', borderRadius: '4px', padding: '2px 6px' }} />
                <button style={styles.btnPresetDanger} onClick={() => setFormData({ ...formData, signatureBase64: undefined })}>
                  Unterschrift entfernen
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.btnCancel} onClick={onClose}>Abbrechen</button>
          <button style={styles.btnSave} onClick={() => onSave(formData)}>Einstellungen speichern</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  container: {
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '650px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
    overflow: 'hidden',
  },
  header: {
    padding: '1rem 1.25rem',
    backgroundColor: 'var(--color-bg-surface-elevated)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btnClose: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-secondary)',
    fontSize: '1.2rem',
    cursor: 'pointer',
  },
  body: {
    padding: '1.25rem',
    overflowY: 'auto',
    flex: 1,
  },
  presetBar: {
    backgroundColor: 'var(--color-bg-surface-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '0.85rem',
    marginBottom: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  presetRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  presetSelect: {
    flex: 1,
    padding: '0.5rem 0.65rem',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: '6px',
    fontSize: '0.8rem',
  },
  btnPresetAction: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 0.85rem',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnPresetDanger: {
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    padding: '0.5rem 0.85rem',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  presetHint: {
    fontSize: '0.7rem',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.4,
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '0.25rem',
  },
  input: {
    width: '100%',
    padding: '0.55rem 0.75rem',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: '6px',
    fontSize: '0.85rem',
  },
  footer: {
    padding: '1rem 1.25rem',
    backgroundColor: 'var(--color-bg-surface-elevated)',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
  },
  btnCancel: {
    background: 'none',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  btnSave: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1.2rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
