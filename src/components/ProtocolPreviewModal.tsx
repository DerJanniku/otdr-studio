import { useEffect, useState } from 'react';
import type { CustomerItem, AppSettings } from '../types';

interface ProtocolPreviewModalProps {
  customer: CustomerItem;
  settings: AppSettings;
  onClose: () => void;
  onSaveOverride: (updated: CustomerItem) => Promise<void>;
  onGeneratePdf: (customer: CustomerItem) => Promise<void>;
}

export function ProtocolPreviewModal({ customer, settings, onClose, onSaveOverride, onGeneratePdf }: ProtocolPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [formData, setFormData] = useState({
    customerName: customer.customOverrides?.customerName ?? customer.customerName,
    street: customer.customOverrides?.street ?? customer.street,
    city: customer.customOverrides?.city ?? customer.city,
    technicianName: customer.customOverrides?.technicianName ?? customer.technicianName ?? settings.defaultTechnician,
    date: customer.customOverrides?.date ?? (customer.measuredAt ? new Date(customer.measuredAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })),
    time: customer.customOverrides?.time ?? (customer.measuredAt ? new Date(customer.measuredAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr' : new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr'),
    segment: customer.customOverrides?.segment ?? customer.segment ?? `NVt ➔ HÜP ${customer.customerName}`,
    cableId: customer.customOverrides?.cableId ?? customer.cableId ?? `K-${customer.id}`,
    fiberNumber: customer.customOverrides?.fiberNumber ?? customer.fiberNumber ?? 1,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    const updated: CustomerItem = {
      ...customer,
      customOverrides: {
        ...formData
      }
    };
    onSaveOverride(updated);
  };

  const sor = customer.sorData;
  const [preview, setPreview] = useState<{ html?: string; error?: string }>({});

  useEffect(() => {
    if (!sor || activeTab !== 'preview' || !window.api?.renderProtocolHtml) return;
    let cancelled = false;
    window.api.renderProtocolHtml({ ...customer, customOverrides: formData }, settings).then(res => {
      if (!cancelled) setPreview(res.success ? { html: res.html } : { error: res.error });
    });
    return () => { cancelled = true; };
  }, [activeTab, customer, settings, sor, formData]);

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.container}>
        {/* HEADER BAR */}
        <div style={styles.header}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={styles.jobBadge}>JOB #{String(customer.id).padStart(3, '0')}</span>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                {formData.customerName}
              </h2>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {formData.street}, {formData.city} · Auftrags-ID: {customer.orderId}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={styles.tabToggle}>
              <button 
                style={{ ...styles.tabBtn, ...(activeTab === 'preview' ? styles.tabBtnActive : {}) }}
                onClick={() => {
                  if (activeTab === 'edit') handleSave();
                  setActiveTab('preview');
                }}
              >
                DIN Vorschau
              </button>
              <button 
                style={{ ...styles.tabBtn, ...(activeTab === 'edit' ? styles.tabBtnActive : {}) }}
                onClick={() => setActiveTab('edit')}
              >
                Parameter anpassen
              </button>
            </div>
            <button
              style={customer.sorData ? styles.btnPdf : { ...styles.btnPdf, opacity: 0.4, cursor: 'not-allowed' }}
              onClick={async () => {
                if (!customer.sorData) return;
                // Save first, then export - running both at once let the save overwrite the "exported" status.
                const updated: CustomerItem = { ...customer, customOverrides: formData };
                await onSaveOverride(updated);
                await onGeneratePdf(updated);
              }}
              disabled={!customer.sorData}
              title={customer.sorData ? undefined : 'Erst möglich, sobald eine OTDR-Messung (.sor) zugeordnet wurde'}
            >
              PDF exportieren &amp; öffnen
            </button>
            <button style={styles.btnClose} onClick={onClose} aria-label="Schließen">✕</button>
          </div>
        </div>

        {/* BODY */}
        <div style={styles.body}>
          {activeTab === 'edit' ? (
            <div style={styles.editFormCard}>
              <h3 style={styles.sectionTitle}>Parameter für Abnahmeprotokoll anpassen</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                Manuell geänderte Felder überschreiben die Stamm- bzw. Messdaten für das finale DIN EN 50346 PDF.
              </p>

              <div style={styles.formGrid}>
                <div>
                  <label style={styles.label}>Endkunde / Anschlussinhaber:</label>
                  <input 
                    style={styles.input} 
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <label style={styles.label}>Straße &amp; Hausnummer:</label>
                  <input 
                    style={styles.input} 
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  />
                </div>
                <div>
                  <label style={styles.label}>PLZ &amp; Ort:</label>
                  <input 
                    style={styles.input} 
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <label style={styles.label}>Zertifizierter Messtechniker:</label>
                  <input 
                    style={styles.input} 
                    value={formData.technicianName}
                    onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
                  />
                </div>
                <div>
                  <label style={styles.label}>Messdatum:</label>
                  <input 
                    style={styles.input} 
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label style={styles.label}>Uhrzeit:</label>
                  <input 
                    style={styles.input} 
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
                <div>
                  <label style={styles.label}>Mess-Abschnitt (Trasse):</label>
                  <input 
                    style={styles.input} 
                    value={formData.segment}
                    onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                  />
                </div>
                <div>
                  <label style={styles.label}>Kabel-ID:</label>
                  <input 
                    style={styles.input} 
                    value={formData.cableId}
                    onChange={(e) => setFormData({ ...formData, cableId: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                <button style={styles.btnSave} onClick={handleSave}>
                  Änderungen speichern
                </button>
              </div>
            </div>
          ) : !sor ? (
            <div style={styles.noDataPlaceholder}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Noch keine OTDR-Messung zugeordnet
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem', maxWidth: '340px' }}>
                Für diesen Kunden liegt noch keine .sor-Datei vor. Bitte zuerst den USB-Stick / Messordner
                scannen - eine Protokoll-Vorschau oder ein PDF kann erst danach mit echten Messwerten erstellt werden.
              </p>
            </div>
          ) : (
            /* Same HTML as the PDF, rendered without scripts. */
            <div style={styles.previewContainer}>
              {preview.error ? (
                <div style={styles.noDataPlaceholder}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444' }}>Kein Protokoll möglich</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem', maxWidth: '460px', whiteSpace: 'pre-line' }}>
                    {preview.error}
                  </p>
                </div>
              ) : preview.html ? (
                <iframe title="Protokoll-Vorschau" sandbox="" srcDoc={preview.html} style={styles.previewFrame} />
              ) : (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>Vorschau wird erstellt …</p>
              )}
            </div>
          )}
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
    borderRadius: '8px',
    width: '95%',
    maxWidth: '1000px',
    height: '92vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
    overflow: 'hidden',
  },
  header: {
    padding: '0.75rem 1.25rem',
    backgroundColor: 'var(--color-bg-surface-elevated)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobBadge: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.15)',
    padding: '0.15rem 0.45rem',
    borderRadius: '3px',
    fontSize: '0.7rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.04em',
  },
  tabToggle: {
    display: 'flex',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: '4px',
    padding: '2px',
    border: '1px solid var(--color-border)',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-secondary)',
    padding: '0.35rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: '3px',
    cursor: 'pointer',
  },
  tabBtnActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
  },
  btnPdf: {
    backgroundColor: '#15803d',
    color: '#ffffff',
    border: 'none',
    padding: '0.45rem 0.9rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnClose: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-secondary)',
    fontSize: '1.1rem',
    cursor: 'pointer',
    padding: '0 0.3rem',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'center',
  },
  editFormCard: {
    width: '100%',
    maxWidth: '750px',
    backgroundColor: 'var(--color-bg-surface-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    padding: '1.25rem',
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
    color: 'var(--color-text-primary)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.85rem',
  },
  label: {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '0.2rem',
  },
  input: {
    width: '100%',
    padding: '0.5rem 0.7rem',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: '4px',
    fontSize: '0.8rem',
  },
  btnSave: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    padding: '0.55rem 1rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  previewFrame: {
    width: '210mm',
    maxWidth: '100%',
    height: '297mm',
    border: 'none',
    backgroundColor: '#ffffff',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    flexShrink: 0,
  },
  previewContainer: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  noDataPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '4rem 2rem',
    width: '100%',
  },
  badgePass: {
    display: 'inline-block',
    padding: '0.5px 3px',
    backgroundColor: '#dcfce7',
    color: '#15803d',
    fontWeight: 800,
    borderRadius: '2px',
    fontSize: '5.5pt',
  },
};

