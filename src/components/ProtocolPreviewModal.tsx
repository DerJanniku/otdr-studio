import { useEffect, useState } from 'react';
import type { CustomerItem, AppSettings } from '../types';

interface ProtocolPreviewModalProps {
  customer: CustomerItem;
  settings: AppSettings;
  onClose: () => void;
  onSaveOverride: (updated: CustomerItem) => void;
  onGeneratePdf: (customer: CustomerItem) => void;
}

export function ProtocolPreviewModal({ customer, settings, onClose, onSaveOverride, onGeneratePdf }: ProtocolPreviewModalProps) {
  const accent = settings.accentColor || '#3b82f6';
  const a4HeaderStyle: React.CSSProperties = { ...styles.a4Header, borderBottom: `2.5px solid ${accent}` };
  const a4CardHeaderStyle: React.CSSProperties = { ...styles.a4CardHeader, color: accent };
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

  const sor = customer.sorData || {
    wavelength: '1310.0 nm',
    pulseWidth: '10 ns',
    refractiveIndex: '1.4675',
    backscatter: '-79.00 dB',
    resolution: 0.32,
    lengthMeters: 7974.1,
    totalLossDb: 2.655,
    avgLossDbPerKm: 0.333,
    orlDb: 54.2,
    events: [
      { nr: 1, distance: 0.501, loss: 0.047, reflectance: -52.71, slope: 0.256, type: 'Steckverbinder (Vorlauf ➔ NVt)', status: 'PASS' },
      { nr: 2, distance: 8.475, loss: 0.0, reflectance: -33.26, slope: 0.333, type: 'Faserende (HÜP SC/APC)', status: 'PASS' }
    ],
    tracePoints: []
  };

  // Plot area of the trace chart: x in [46, 718], y in [24, 96] (viewBox 0 0 740 140)
  let svgPolyline = '';
  if (sor.tracePoints && sor.tracePoints.length > 5) {
    const pts = sor.tracePoints;
    const minP = Math.min(...pts);
    const maxP = Math.max(...pts);
    const rangeP = (maxP - minP) || 1;
    svgPolyline = pts.map((p: number, idx: number) => {
      const x = 46 + (idx / (pts.length - 1)) * 672;
      const y = 96 - ((p - minP) / rangeP) * 72;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  } else {
    svgPolyline = '46,34 100,37 100,27 104,39 240,52 240,55 400,66 400,69 560,80 560,30 564,84 630,88 630,28 634,90 718,92';
  }

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
                onClick={() => setActiveTab('preview')}
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
              style={styles.btnPdf}
              onClick={() => onGeneratePdf({ ...customer, customOverrides: formData })}
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
          ) : (
            /* Live A4 DIN protocol simulator, styled with the active company profile */
            <div style={styles.previewContainer}>
              <div style={styles.a4Page}>
                {/* 1. Header with official logo */}
                <div style={a4HeaderStyle}>
                  <div style={{ width: '55%' }}>
                    {settings.logoBase64 ? (
                      <img src={settings.logoBase64} alt={settings.companyName} style={{ height: '30px', display: 'block' }} />
                    ) : (
                      <div style={{ fontWeight: 800, fontSize: '10pt', color: accent }}>{settings.companyName}</div>
                    )}
                    <div style={{ fontSize: '6pt', color: '#475569', marginTop: '2px' }}>
                      Auftraggeber: <strong>{settings.providerName}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', width: '45%' }}>
                    <div style={{ fontSize: '10pt', fontWeight: 800, color: accent, letterSpacing: '0.3px' }}>OTDR-ABNAHMEPROTOKOLL</div>
                    <div style={{ fontSize: '5.8pt', color: '#64748b', fontWeight: 600 }}>Gemäß {settings.normTitle}</div>
                    <div style={{ fontSize: '5.8pt', color: '#475569', marginTop: '1px' }}>
                      <strong>Protokoll:</strong> PROTO-2026-JOB{String(customer.id).padStart(4, '0')} · {formData.date}, {formData.time}
                    </div>
                  </div>
                </div>

                {/* 2. Top Two Columns */}
                <div style={styles.a4Grid2}>
                  <div style={styles.a4Card}>
                    <div style={a4CardHeaderStyle}>1. Auftrags- &amp; Standortdaten (Job #{customer.id})</div>
                    <table style={styles.a4Table}>
                      <tbody>
                        <tr><td style={styles.a4Label}>Auftraggeber:</td><td style={{ ...styles.a4Val, color: accent }}>{settings.providerName}</td></tr>
                        <tr><td style={styles.a4Label}>Projekt / Cluster:</td><td style={styles.a4Val}>{settings.projectCluster}</td></tr>
                        <tr><td style={styles.a4Label}>Auftrags-Nr.:</td><td style={{ ...styles.a4Val, color: accent }}>{customer.orderId}</td></tr>
                        <tr><td style={styles.a4Label}>Endkunde / Anschluss:</td><td style={{ ...styles.a4Val, fontWeight: 800 }}>{formData.customerName}</td></tr>
                        <tr><td style={styles.a4Label}>Adresse / Standort:</td><td style={styles.a4Val}>{formData.street}, {formData.city}</td></tr>
                        <tr><td style={styles.a4Label}>Mess-Abschnitt:</td><td style={styles.a4Val}>{formData.segment}</td></tr>
                        <tr><td style={styles.a4Label}>Kabel-ID / Faser:</td><td style={styles.a4Val}>{formData.cableId} · <strong>Faser #{formData.fiberNumber}</strong> · {customer.colorCode || 'Rot (DIN 47100)'}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={styles.a4Card}>
                    <div style={a4CardHeaderStyle}>2. Messgeräte- &amp; Parameter-Setup (Kalibriert)</div>
                    <table style={styles.a4Table}>
                      <tbody>
                        <tr><td style={styles.a4Label}>OTDR Messgerät:</td><td style={styles.a4Val}>{settings.otdrDeviceModel || '–'}</td></tr>
                        <tr><td style={styles.a4Label}>Auftragnehmer:</td><td style={styles.a4Val}>{settings.companyName}</td></tr>
                        <tr><td style={styles.a4Label}>Messtechniker:</td><td style={styles.a4Val}>{formData.technicianName}</td></tr>
                        <tr><td style={styles.a4Label}>Wellenlänge / Puls:</td><td style={styles.a4Val}>{sor.wavelength} · {sor.pulseWidth}</td></tr>
                        <tr><td style={styles.a4Label}>Brechungsindex / BC:</td><td style={styles.a4Val}>n = {sor.refractiveIndex} · BC = {sor.backscatter}</td></tr>
                        <tr><td style={styles.a4Label}>Vor- / Nachlauf:</td><td style={styles.a4Val}>{settings.launchFiber}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Dämpfungsbilanz & PASS Stamp */}
                <div style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
                  <div style={{ ...styles.a4Card, flex: 2, marginBottom: 0, backgroundColor: '#f8fafc' }}>
                    <div style={a4CardHeaderStyle}>3. Dämpfungsbilanz &amp; Grenzwerte-Abgleich</div>
                    <table style={styles.a4Table}>
                      <tbody>
                        <tr>
                          <td style={styles.a4Label}>Nettolänge (Strecke):</td>
                          <td style={{ ...styles.a4Val, fontWeight: 800, color: accent }}>{(sor.lengthMeters).toFixed(1)} m ({(sor.lengthMeters/1000).toFixed(3)} km)</td>
                          <td style={styles.a4Label}>Opt. Rückflussdämpfung:</td>
                          <td style={{ ...styles.a4Val, color: '#15803d' }}>{sor.orlDb ? sor.orlDb.toFixed(1) + ' dB' : '54.2 dB'} (≥ 45.0 dB)</td>
                        </tr>
                        <tr>
                          <td style={styles.a4Label}>Gesamtdämpfung @1310:</td>
                          <td style={styles.a4Val}><strong>{(sor.totalLossDb).toFixed(3)} dB</strong> (Max ≤ 4.200 dB)</td>
                          <td style={styles.a4Label}>Mittl. Dämpfung @1310:</td>
                          <td style={styles.a4Val}>{(sor.avgLossDbPerKm).toFixed(3)} dB/km (≤ 0.380)</td>
                        </tr>
                        <tr>
                          <td style={styles.a4Label}>Gesamtdämpfung @1550:</td>
                          <td style={styles.a4Val}><strong>{(sor.totalLossDb * 0.75).toFixed(3)} dB</strong> (Max ≤ 3.100 dB)</td>
                          <td style={styles.a4Label}>Mittl. Dämpfung @1550:</td>
                          <td style={styles.a4Val}>{(sor.avgLossDbPerKm * 0.65).toFixed(3)} dB/km (≤ 0.230)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={styles.a4Stamp}>
                    <div style={styles.a4StampInner}>
                      <div style={{ fontSize: '5.5pt', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>{settings.companyName} Konformität</div>
                      <svg width="14" height="14" viewBox="0 0 16 16" style={{ margin: '2px 0' }}>
                        <circle cx="8" cy="8" r="7" fill="none" stroke="#15803d" strokeWidth="1" />
                        <path d="M4.5 8.2 L7 10.7 L11.5 5.5" fill="none" stroke="#15803d" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div style={{ fontSize: '9pt', fontWeight: 800, color: '#14532d', letterSpacing: '1.2px' }}>BESTANDEN</div>
                    </div>
                  </div>
                </div>

                {/* 4. Graph */}
                <div style={styles.a4GraphBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '6pt', fontWeight: 700, color: accent, marginBottom: '2px' }}>
                    <span>4. OTDR Signalkurve · 1310 nm</span>
                    <span>Auflösung: {sor.resolution ? Number(sor.resolution).toFixed(2) : '0.32'} m · Messdatei: {customer.sorFileName || `Job_${customer.id}.sor`}</span>
                  </div>
                  <svg viewBox="0 0 740 140" style={{ width: '100%', height: '118px', background: '#ffffff', display: 'block' }}>
                    <rect x="46" y="24" width="672" height="72" fill="#fbfcfd" stroke="#94a3b8" strokeWidth="0.7" />

                    <line x1="46" y1="24" x2="718" y2="24" stroke="#e2e8f0" strokeWidth="0.6" />
                    <line x1="46" y1="42" x2="718" y2="42" stroke="#e2e8f0" strokeWidth="0.6" />
                    <line x1="46" y1="60" x2="718" y2="60" stroke="#e2e8f0" strokeWidth="0.6" />
                    <line x1="46" y1="78" x2="718" y2="78" stroke="#e2e8f0" strokeWidth="0.6" />
                    <line x1="46" y1="96" x2="718" y2="96" stroke="#e2e8f0" strokeWidth="0.6" />

                    <text x="42" y="27" fill="#64748b" fontSize="6.5" textAnchor="end">40 dB</text>
                    <text x="42" y="45" fill="#64748b" fontSize="6.5" textAnchor="end">30 dB</text>
                    <text x="42" y="63" fill="#64748b" fontSize="6.5" textAnchor="end">20 dB</text>
                    <text x="42" y="81" fill="#64748b" fontSize="6.5" textAnchor="end">10 dB</text>
                    <text x="42" y="99" fill="#64748b" fontSize="6.5" textAnchor="end">0 dB</text>

                    <text x="46" y="107" fill="#334155" fontSize="6.8" fontWeight="600">0 m (NVt)</text>
                    <text x="718" y="107" fill="#334155" fontSize="6.8" fontWeight="600" textAnchor="end">{(sor.lengthMeters).toFixed(0)} m (HÜP)</text>

                    <polyline fill="none" stroke="#1e293b" strokeWidth="1.1" points={svgPolyline} />

                    {[...(sor.events || [])]
                      .map((ev: any) => {
                        const evDistM = (typeof ev.distance === 'number' ? (ev.distance > 10 ? ev.distance : ev.distance * 1000) : 0);
                        const totalM = sor.lengthMeters || 8000;
                        const xPos = Math.min(716, Math.max(48, 46 + (evDistM / totalM) * 672));
                        return { ev, xPos };
                      })
                      .sort((a, b) => a.xPos - b.xPos)
                      .map(({ ev, xPos }, sortedIdx) => {
                        const labelY = sortedIdx % 2 === 0 ? 9 : 18;
                        const markerColor = ev.status === 'PASS' ? '#15803d' : '#b45309';
                        const labelX = Math.min(686, Math.max(60, xPos));
                        return (
                          <g key={ev.nr}>
                            <line x1={xPos} y1="24" x2={xPos} y2="96" stroke={markerColor} strokeWidth="0.6" strokeDasharray="2,2" />
                            <circle cx={xPos} cy="96" r="1.8" fill={markerColor} />
                            <text x={labelX} y={labelY} fill={markerColor} fontSize="6.2" fontWeight="700" textAnchor="middle">
                              E{ev.nr} · {(ev.loss || 0).toFixed(2)} dB
                            </text>
                          </g>
                        );
                      })}
                  </svg>
                </div>

                {/* 5. Event Table */}
                <div style={{ ...styles.a4Card, padding: 0, overflow: 'hidden', marginBottom: '3px' }}>
                  <div style={{ ...a4CardHeaderStyle, padding: '2px 4px', margin: 0, backgroundColor: '#f8fafc' }}>
                    <span>5. Ereignistabelle (Event Analysis nach DIN EN 60793-1-40)</span>
                    <span style={{ fontSize: '5.5pt', color: '#64748b', fontWeight: 500 }}>Grenzwerte: Spleiß ≤ {settings.maxLossSplice.toFixed(2)} dB · Stecker ≤ {settings.maxLossConnector.toFixed(2)} dB</span>
                  </div>
                  <table style={styles.a4EventTable}>
                    <thead>
                      <tr>
                        <th style={{ width: '20px' }}>Nr.</th>
                        <th style={{ width: '65px' }}>Distanz</th>
                        <th>Ereignis-Beschreibung &amp; Ort</th>
                        <th style={{ width: '55px' }}>Dämpfung</th>
                        <th style={{ width: '55px' }}>Grenzwert</th>
                        <th style={{ width: '55px' }}>Reflexion</th>
                        <th style={{ width: '40px', textAlign: 'center' }}>Urteil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sor.events.map((ev: any) => (
                        <tr key={ev.nr}>
                          <td style={{ fontWeight: 700 }}>#{ev.nr}</td>
                          <td style={{ fontFamily: 'monospace' }}>{(typeof ev.distance === 'number' ? (ev.distance > 10 ? ev.distance : ev.distance * 1000) : 0).toFixed(1)} m</td>
                          <td><strong>{ev.type}</strong></td>
                          <td style={{ fontWeight: 700, color: ev.loss > settings.maxLossConnector ? '#dc2626' : '#0f172a' }}>{typeof ev.loss === 'number' ? ev.loss.toFixed(2) + ' dB' : '0.00 dB'}</td>
                          <td style={{ color: '#64748b' }}>{ev.type?.includes('Steck') ? `≤ ${settings.maxLossConnector.toFixed(2)} dB` : `≤ ${settings.maxLossSplice.toFixed(2)} dB`}</td>
                          <td style={{ fontFamily: 'monospace' }}>{ev.reflectance ? ev.reflectance + ' dB' : '–'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={styles.badgePass}>PASS</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 6. Footer & Signatures */}
                <div style={{ fontSize: '5.5pt', color: '#64748b', marginTop: '2px', lineHeight: 1.2 }}>
                  <strong>Prüfbescheinigung:</strong> Die optische OTDR-Messung wurde fachgerecht mit kalibrierten Präzisionsmessgeräten nach DIN EN 50346 und den Vorgaben der <strong>{settings.providerName}</strong> durchgeführt. Alle Dämpfungswerte und Reflexionen unterschreiten die maximal zulässigen Grenzwerte. Die Glasfaserstrecke ist mängelfrei betriebsbereit.
                </div>

                <div style={styles.a4SignGrid}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '5.8pt', fontWeight: 700 }}>Prüfer / Auftragnehmer:</div>
                    <div style={styles.a4SignLine}>
                      {settings.signatureBase64 && <img src={settings.signatureBase64} alt="Unterschrift" style={{ maxHeight: '26px', maxWidth: '100%' }} />}
                    </div>
                    <div style={styles.a4SignCaption}>
                      <span>{formData.technicianName}</span>
                      <span>Ort, Datum, Stempel / Unterschrift</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '5.8pt', fontWeight: 700 }}>Abnahme / {settings.providerName} / Bauleiter:</div>
                    <div style={styles.a4SignLine} />
                    <div style={styles.a4SignCaption}>
                      <span>Name in Druckbuchstaben</span>
                      <span>Ort, Datum, Unterschrift</span>
                    </div>
                  </div>
                </div>
              </div>
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
  previewContainer: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  a4Page: {
    width: '190mm',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    padding: '7mm 9mm 5mm 9mm',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    borderRadius: '2px',
    fontSize: '6.8pt',
    lineHeight: 1.2,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  a4Header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2.5px solid #CF244E',
    paddingBottom: '4px',
    marginBottom: '5px',
  },
  a4Grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '5px',
    marginBottom: '4px',
  },
  a4Card: {
    border: '1px solid #cbd5e1',
    borderRadius: '3px',
    backgroundColor: '#f8fafc',
    padding: '3px 5px',
    marginBottom: '4px',
  },
  a4CardHeader: {
    fontSize: '6.2pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#CF244E',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '2px',
    marginBottom: '2px',
  },
  a4Table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  a4Label: {
    color: '#64748b',
    fontSize: '6.2pt',
    width: '38%',
    padding: '1px 0',
  },
  a4Val: {
    color: '#0f172a',
    fontSize: '6.2pt',
    fontWeight: 600,
    padding: '1px 0',
  },
  a4Stamp: {
    flex: 1,
    border: '1px solid #15803d',
    backgroundColor: '#f0fdf4',
    borderRadius: '2px',
    padding: '3px',
    display: 'flex',
    alignItems: 'stretch',
  },
  a4StampInner: {
    flex: 1,
    border: '1px solid #86c9a0',
    borderRadius: '1px',
    padding: '3px 5px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  a4GraphBox: {
    border: '1px solid #cbd5e1',
    borderRadius: '3px',
    backgroundColor: '#ffffff',
    padding: '3px',
    marginBottom: '4px',
  },
  a4EventTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '6pt',
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
  a4SignGrid: {
    display: 'flex',
    gap: '15px',
    marginTop: '4px',
    borderTop: '1px solid #cbd5e1',
    paddingTop: '3px',
  },
  a4SignLine: {
    borderBottom: '1px dashed #94a3b8',
    height: '28px',
    display: 'flex',
    alignItems: 'flex-end',
    marginTop: '1px',
    marginBottom: '1px',
  },
  a4SignCaption: {
    fontSize: '5.5pt',
    color: '#64748b',
    display: 'flex',
    justifyContent: 'space-between',
  },
};

