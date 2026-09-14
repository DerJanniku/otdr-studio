import re

with open("src/components/AusbaugebietDashboard.tsx", "r") as f:
    c = f.read()

correct_header = """      <div style={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={onBack} style={{ width: 'fit-content', padding: '0.4rem 0.8rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← Zurück zu Projekten</button>
          <h1 style={styles.title}>Ausbaugebiete</h1>
          <p style={styles.subtitle}>
            Wähle ein Ausbaugebiet aus, um Messungen zuzuordnen und DIN EN 50346 Protokolle zu erstellen.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={{ ...styles.btnPrimary, backgroundColor: accentColor }} onClick={openCreateModal}>
            + Neues Ausbaugebiet erstellen
          </button>
        </div>
      </div>"""

c = re.sub(r'      <div style=\{styles\.header\}>.*?</div>\s*</div>\s*</div>', correct_header, c, flags=re.DOTALL)
with open("src/components/AusbaugebietDashboard.tsx", "w") as f:
    f.write(c)


with open("src/components/KvzDashboard.tsx", "r") as f:
    c2 = f.read()

correct_header2 = """      <div style={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={onBack} style={{ width: 'fit-content', padding: '0.4rem 0.8rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← Zurück zu Ausbaugebieten</button>
          <h1 style={styles.title}>KVZs (NVTs)</h1>
          <p style={styles.subtitle}>
            Wähle ein KVZ aus, um Messungen zuzuordnen und DIN EN 50346 Protokolle zu erstellen.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={{ ...styles.btnPrimary, backgroundColor: accentColor }} onClick={openCreateModal}>
            + Neuer KVZ erstellen
          </button>
        </div>
      </div>"""

c2 = re.sub(r'      <div style=\{styles\.header\}>.*?</div>\s*</div>\s*</div>', correct_header2, c2, flags=re.DOTALL)
with open("src/components/KvzDashboard.tsx", "w") as f:
    f.write(c2)

