import type { CustomerItem } from '../types';

interface CustomerTableProps {
  customers: CustomerItem[];
  onSelectCustomer: (customer: CustomerItem) => void;
  onGeneratePdf: (customer: CustomerItem) => void;
}

export function CustomerTable({ customers, onSelectCustomer, onGeneratePdf }: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <div style={styles.emptyState}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Keine Kunden gefunden</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          Bitte Filter anpassen oder eine SharePoint Excel-Liste (.xlsx / .csv) importieren.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.tableScroll}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '85px' }}>Job-ID</th>
            <th style={{ width: '230px' }}>Kunde &amp; Standort</th>
            <th>Kabel-ID / Trassenabschnitt</th>
            <th style={{ width: '190px' }}>OTDR-Messung</th>
            <th style={{ width: '130px' }}>Werte (@1310 nm)</th>
            <th style={{ width: '220px', textAlign: 'right' }}>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(c => {
            const isMatched = c.status === 'matched' || c.status === 'exported';
            const isExported = c.status === 'exported';
            const name = c.customOverrides?.customerName || c.customerName;
            const street = c.customOverrides?.street || c.street;
            const city = c.customOverrides?.city || c.city;
            const cableId = c.customOverrides?.cableId || c.cableId || `K-${c.id}`;
            const segment = c.customOverrides?.segment || c.segment || `NVt ➔ HÜP ${name}`;
            const loss = c.sorData?.totalLossDb ? `${c.sorData.totalLossDb.toFixed(3)} dB` : '–';
            const length = c.sorData?.lengthMeters ? `${(c.sorData.lengthMeters).toFixed(0)} m` : '–';

            return (
              <tr 
                key={c.id} 
                style={{ 
                  backgroundColor: isExported ? 'rgba(168, 85, 247, 0.04)' : isMatched ? 'rgba(34, 197, 94, 0.04)' : undefined 
                }}
              >
                <td>
                  <span style={{ ...styles.jobBadge, backgroundColor: isMatched ? 'var(--color-primary)' : '#1e293b' }}>
                    JOB #{String(c.id).padStart(3, '0')}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{street}, {city}</div>
                </td>
                <td>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{cableId} · Faser #{c.fiberNumber}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{segment}</div>
                </td>
                <td>
                  {isMatched ? (
                    <div>
                      <span style={styles.badgeSuccess}>BEREIT: {c.sorFileName || `Job_${c.id}.sor`}</span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {c.measuredAt ? new Date(c.measuredAt).toLocaleDateString('de-DE') : 'Messung verknüpft'}
                      </div>
                    </div>
                  ) : (
                    <span style={styles.badgePending}>OFFEN</span>
                  )}
                </td>
                <td>
                  {isMatched ? (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.8rem' }}>{loss}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>Länge: {length}</div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>–</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <button 
                      style={styles.btnAction}
                      onClick={() => onSelectCustomer(c)}
                      title="Protokoll-Vorschau ansehen oder Daten anpassen"
                    >
                      Vorschau / Edit
                    </button>
                    <button 
                      style={{ ...styles.btnAction, backgroundColor: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
                      onClick={() => onGeneratePdf(c)}
                      title="Offizielles 1-Seiten DIN-PDF direkt erstellen &amp; öffnen"
                    >
                      PDF öffnen
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tableScroll: {
    flex: 1,
    overflowY: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.82rem',
    textAlign: 'left',
  },
  emptyState: {
    padding: '4rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobBadge: {
    display: 'inline-block',
    padding: '0.15rem 0.45rem',
    color: '#ffffff',
    borderRadius: '3px',
    fontWeight: 700,
    fontSize: '0.7rem',
    fontFamily: 'var(--font-mono)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  badgeSuccess: {
    display: 'inline-block',
    padding: '0.15rem 0.45rem',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    color: '#22c55e',
    borderRadius: '3px',
    fontSize: '0.7rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  badgePending: {
    display: 'inline-block',
    padding: '0.15rem 0.45rem',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    color: '#94a3b8',
    borderRadius: '3px',
    fontSize: '0.7rem',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
  },
  btnAction: {
    padding: '0.35rem 0.65rem',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
