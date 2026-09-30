import { useState } from 'react';
import type { KVZ } from '../types';

interface PopMeasurementsPanelProps {
  kvz: KVZ;
  onKvzChanged: (kvz: KVZ) => void;
  onToast: (msg: string) => void;
}

// Feeder measurements POP -> KVZ. Each one gets its own acceptance protocol.
export function PopMeasurementsPanel({ kvz, onKvzChanged, onToast }: PopMeasurementsPanelProps) {
  const [fiberName, setFiberName] = useState('');
  const [busy, setBusy] = useState(false);
  const list = kvz.popMeasurements || [];

  const handleAdd = async () => {
    if (!window.api?.addPopMeasurement) return;
    setBusy(true);
    try {
      const res = await window.api.addPopMeasurement(kvz.id, fiberName.trim());
      if (res.success && res.kvz) {
        onKvzChanged(res.kvz);
        setFiberName('');
        onToast('Zuleitungsmessung hinzugefügt.');
      } else if (!res.canceled && res.error) {
        alert(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePdf = async (pmId: string) => {
    if (!window.api?.generateKvzPdf) return;
    setBusy(true);
    try {
      const res = await window.api.generateKvzPdf(kvz.id, pmId);
      if (res.success) {
        onToast('Zuleitungsprotokoll erstellt und geöffnet.');
        const kvzs = await window.api.getKVZs?.(kvz.ausbaugebietId);
        const fresh = kvzs?.find(k => k.id === kvz.id);
        if (fresh) onKvzChanged(fresh);
      } else {
        alert(`Fehler beim Erstellen des Protokolls:\n${res.error}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (pmId: string, name: string) => {
    if (!window.api?.deletePopMeasurement) return;
    if (!window.confirm(`Zuleitungsmessung „${name}“ entfernen? Ein bereits erzeugtes PDF bleibt erhalten.`)) return;
    const updated = await window.api.deletePopMeasurement(kvz.id, pmId);
    if (updated) onKvzChanged(updated);
  };

  return (
    <section style={styles.panel} aria-label="Zuleitungen POP zu KVZ">
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Zuleitung POP ➔ {kvz.name}</h2>
          <span style={styles.hint}>Messungen der Zuleitungsfasern, je Faser ein eigenes Protokoll.</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Faser / Bezeichnung, z. B. Faser 01"
            value={fiberName}
            onChange={e => setFiberName(e.target.value)}
            style={styles.input}
            aria-label="Bezeichnung der Zuleitungsfaser"
          />
          <button style={styles.btn} onClick={handleAdd} disabled={busy}>+ .sor hinzufügen</button>
        </div>
      </div>

      {list.length === 0 ? (
        <p style={styles.empty}>Noch keine Zuleitungsmessung hinterlegt.</p>
      ) : (
        <table style={styles.table}>
          <tbody>
            {list.map(pm => {
              const dq = pm.sorData?.dataQuality;
              const usable = !dq || dq.usable;
              return (
                <tr key={pm.id} style={styles.row}>
                  <td style={styles.cell}><strong>{pm.fiberName}</strong></td>
                  <td style={{ ...styles.cell, fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{pm.sorFileName}</td>
                  <td style={styles.cell}>{pm.sorData?.wavelength || '–'}</td>
                  <td style={styles.cell}>
                    {pm.sorData?.lengthMeters ? `${(pm.sorData.lengthMeters / 1000).toFixed(3)} km` : '–'}
                    {' · '}
                    {typeof pm.sorData?.totalLossDb === 'number' ? `${pm.sorData.totalLossDb.toFixed(2)} dB` : '–'}
                  </td>
                  <td style={styles.cell}>
                    {usable
                      ? (pm.pdfPath ? <span style={{ color: '#a855f7' }}>PDF erstellt</span> : <span style={{ color: '#22c55e' }}>Bereit</span>)
                      : <span style={{ color: '#ef4444' }} title={dq.warnings.join('\n')}>Messung unbrauchbar</span>}
                  </td>
                  <td style={{ ...styles.cell, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button style={styles.btnSmall} onClick={() => handlePdf(pm.id)} disabled={busy || !usable}>PDF</button>
                    <button style={{ ...styles.btnSmall, color: '#ef4444' }} onClick={() => handleDelete(pm.id, pm.fiberName)} aria-label="Zuleitung entfernen">🗑️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    margin: '0 1.5rem 0.9rem 1.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
  },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  title: { fontSize: '0.9rem', fontWeight: 700, margin: 0 },
  hint: { fontSize: '0.72rem', color: 'var(--color-text-secondary)' },
  input: {
    padding: '0.4rem 0.7rem',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: '4px',
    fontSize: '0.78rem',
    width: '230px',
  },
  btn: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '0.4rem 0.8rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSmall: {
    background: 'none',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: '4px',
    padding: '0.2rem 0.55rem',
    fontSize: '0.72rem',
    cursor: 'pointer',
    marginLeft: '0.35rem',
  },
  empty: { fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0.6rem 0 0' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '0.6rem', fontSize: '0.78rem' },
  row: { borderTop: '1px solid var(--color-border)' },
  cell: { padding: '0.4rem 0.5rem' },
};
