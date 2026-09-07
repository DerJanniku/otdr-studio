import { useEffect, useState } from 'react';
import type { AppSettings, ExcelColumnMapping } from '../types';

export const DEFAULT_COLUMN_MAPPING: ExcelColumnMapping = {
  id: 'id, id-job, job-id, kunden-nr, kundennr, job, nr, nummer, no, client-id',
  customerName: 'kunde, name, kundenname, client, teilnehmer, anschlussinhaber',
  firstName: 'vorname, firstname, first name',
  lastName: 'nachname, lastname, last name, familienname, surname',
  street: 'straße, strasse, street, adresse, anschrift, address',
  zip: 'plz, postleitzahl, zip, zip-code, postal, postalcode',
  city: 'ort, stadt, wohnort, gemeinde, city, town',
  segment: 'nvt, segment, strecke, trasse, abschnitt, cluster, route, section',
  cableId: 'kabel, cable, kabel-id, kabelbezeichnung, cable-id',
  fiberNumber: 'faser, faser-nr, fasernummer, fiber, strand, fiber-no',
  orderId: 'auftrag, auftrags-nr, auftragsnummer, ticket, order, bestellung, vorgang, order-id',
};

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
  const [activeTab, setActiveTab] = useState<'general' | 'excel'>('general');
  const [formData, setFormData] = useState<AppSettings>({
    ...settings,
    columnMapping: {
      ...DEFAULT_COLUMN_MAPPING,
      ...(settings.columnMapping || {}),
    },
  });
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Einstellungen
            </h3>
            <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--color-bg-base)', padding: '3px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <button
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'general' ? styles.tabBtnActive : {})
                }}
                onClick={() => setActiveTab('general')}
              >
                Allgemein &amp; TAB
              </button>
              <button
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'excel' ? styles.tabBtnActive : {})
                }}
                onClick={() => setActiveTab('excel')}
              >
                📊 Excel-Spalten-Editor
              </button>
            </div>
          </div>
          <button style={styles.btnClose} onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        <div style={styles.body}>
          {activeTab === 'general' && (
            <>
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
                  Protokoll-Optionen (Felder ausblenden &amp; Vorlauffaser)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={!!formData.hideProvider}
                      onChange={(e) => setFormData({ ...formData, hideProvider: e.target.checked })}
                    />
                    Auftraggeber auf Protokoll ausblenden
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={!!formData.hideContractor}
                      onChange={(e) => setFormData({ ...formData, hideContractor: e.target.checked })}
                    />
                    Auftragnehmer auf Protokoll ausblenden
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={!!formData.hideOrderId}
                      onChange={(e) => setFormData({ ...formData, hideOrderId: e.target.checked })}
                    />
                    Auftrags-Nr. auf Protokoll ausblenden
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={!!formData.launchFiberOnly}
                      onChange={(e) => setFormData({ ...formData, launchFiberOnly: e.target.checked })}
                    />
                    Nur Vorlauffaser (keine Nachlauffaser)
                  </label>
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
            </>
          )}

          {activeTab === 'excel' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    📊 Konfigurierbare Spaltennamen für Excel / CSV
                  </h4>
                  <p style={{ ...styles.presetHint, marginTop: '0.35rem' }}>
                    Definiere hier, wie die Spalten in deinen SharePoint- oder Firmen-Listen heißen dürfen.
                    <br />
                    <strong>Hinweis:</strong> Groß-/Kleinschreibung, Bindestriche (`-`), Unterstriche (`_`) und Leerzeichen werden <em>automatisch ignoriert</em> (z.B. matcht <code>ID-Job</code> auch <code>id-job</code> oder <code>Id Job</code>). Mehrere alternative Bezeichnungen einfach mit <strong>Komma trennen</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  style={{ ...styles.btnPresetAction, backgroundColor: '#334155' }}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      columnMapping: { ...DEFAULT_COLUMN_MAPPING }
                    });
                  }}
                  title="Setzt alle Aliase auf die erprobten Standard-Begriffe zurück"
                >
                  Standard wiederherstellen
                </button>
              </div>

              <div style={styles.grid}>
                <div>
                  <label style={styles.label}>Job-ID (Spalte):</label>
                  <input
                    style={styles.input}
                    placeholder="id, id-job, job-id, kunden-nr, nr"
                    value={formData.columnMapping?.id ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      columnMapping: { ...formData.columnMapping, id: e.target.value }
                    })}
                  />
                  <span style={styles.fieldHint}>Eindeutige fortlaufende Nummerierung / Job-ID</span>
                </div>

                <div>
                  <label style={styles.label}>Kunde / Vollständiger Name:</label>
                  <input
                    style={styles.input}
                    placeholder="kunde, name, kundenname, client"
                    value={formData.columnMapping?.customerName ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      columnMapping: { ...formData.columnMapping, customerName: e.target.value }
                    })}
                  />
                  <span style={styles.fieldHint}>Falls Vor- und Nachname in einer Spalte stehen</span>
                </div>

                <div>
                  <label style={styles.label}>Vorname (optional):</label>
                  <input
                    style={styles.input}
                    placeholder="vorname, firstname"
                    value={formData.columnMapping?.firstName ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      columnMapping: { ...formData.columnMapping, firstName: e.target.value }
                    })}
                  />
                  <span style={styles.fieldHint}>Wird bei getrennten Spalten automatisch kombiniert</span>
                </div>

                <div>
                  <label style={styles.label}>Nachname (optional):</label>
                  <input
                    style={styles.input}
                    placeholder="nachname, lastname, familienname"
                    value={formData.columnMapping?.lastName ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      columnMapping: { ...formData.columnMapping, lastName: e.target.value }
                    })}
                  />
                  <span style={styles.fieldHint}>Wird bei getrennten Spalten automatisch kombiniert</span>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={styles.label}>Straße &amp; Hausnummer:</label>
                  <input
                    style={styles.input}
                    placeholder="straße, strasse, street, adresse, anschrift"
                    value={formData.columnMapping?.street ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      columnMapping: { ...formData.columnMapping, street: e.target.value }
                    })}
                  />
                  <span style={styles.fieldHint}>Straßenname und Hausnummer</span>
                </div>

                <div>
                  <label style={styles.label}>Postleitzahl (PLZ):</label>
                  <input
                    style={styles.input}
                    placeholder="plz, postleitzahl, zip, postal"
                    value={formData.columnMapping?.zip ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      columnMapping: { ...formData.columnMapping, zip: e.target.value }
                    })}
                  />
                  <span style={styles.fieldHint}>Falls PLZ eine eigene Spalte hat</span>
                </div>

                <div>
                  <label style={styles.label}>Wohnort / Stadt / Gemeinde:</label>
                  <input
                    style={styles.input}
                    placeholder="ort, stadt, wohnort, gemeinde, city"
                    value={formData.columnMapping?.city ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      columnMapping: { ...formData.columnMapping, city: e.target.value }
                    })}
                  />
                  <span style={styles.fieldHint}>Ortsname oder kombinierte PLZ+Ort Spalte</span>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={styles.label}>NVt / Segment / Trassenabschnitt:</label>
                  <input
                    style={styles.input}
                    placeholder="nvt, segment, strecke, trasse, abschnitt, cluster"
                    value={formData.columnMapping?.segment ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      columnMapping: { ...formData.columnMapping, segment: e.target.value }
                    })}
                  />
                  <span style={styles.fieldHint}>Netzknoten, NVt-Bezeichnung, Cluster oder Trassenverlauf</span>
                </div>

                <div>
                  <label style={styles.label}>Kabel-ID / Kabelbezeichnung:</label>
                  <input
                    style={styles.input}
                    placeholder="kabel, cable, kabel-id, kabelbezeichnung"
                    value={formData.columnMapping?.cableId ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      columnMapping: { ...formData.columnMapping, cableId: e.target.value }
                    })}
                  />
                  <span style={styles.fieldHint}>Kennung des Haupt- oder Verteilkabels</span>
                </div>

                <div>
                  <label style={styles.label}>Faser-Nr. / Fiber:</label>
                  <input
                    style={styles.input}
                    placeholder="faser, faser-nr, fiber, strand, fiber-no"
                    value={formData.columnMapping?.fiberNumber ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      columnMapping: { ...formData.columnMapping, fiberNumber: e.target.value }
                    })}
                  />
                  <span style={styles.fieldHint}>Fasernummer im Bündel / Kabel</span>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={styles.label}>Auftrags-Nr. / Vorgang / Ticket:</label>
                  <input
                    style={styles.input}
                    placeholder="auftrag, auftrags-nr, ticket, order, vorgang"
                    value={formData.columnMapping?.orderId ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      columnMapping: { ...formData.columnMapping, orderId: e.target.value }
                    })}
                  />
                  <span style={styles.fieldHint}>Auftragsnummer des Netzbetreibers / Kunden</span>
                </div>
              </div>
            </div>
          )}
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
  tabBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--color-text-secondary)',
    padding: '0.35rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    backgroundColor: 'var(--color-bg-surface-elevated)',
    color: 'var(--color-text-primary)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  fieldHint: {
    display: 'block',
    fontSize: '0.68rem',
    color: 'var(--color-text-muted)',
    marginTop: '0.2rem',
  },
};

