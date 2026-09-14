with open("src/components/AusbaugebietDashboard.tsx", "r") as f: c = f.read()
# Find <h1 style={styles.title}>Ausbaugebiete</h1>
replace_ag = """<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={onBack} style={{ width: 'fit-content', padding: '0.4rem 0.8rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← Zurück zu Projekten</button>
          <h1 style={styles.title}>Ausbaugebiete</h1>"""
c = c.replace("""<div>
          <h1 style={styles.title}>Ausbaugebiete</h1>""", replace_ag)
with open("src/components/AusbaugebietDashboard.tsx", "w") as f: f.write(c)

with open("src/components/KvzDashboard.tsx", "r") as f: c2 = f.read()
replace_kvz = """<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={onBack} style={{ width: 'fit-content', padding: '0.4rem 0.8rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← Zurück zu Ausbaugebieten</button>
          <h1 style={styles.title}>KVZs (NVTs)</h1>"""
c2 = c2.replace("""<div>
          <h1 style={styles.title}>KVZs (NVTs)</h1>""", replace_kvz)
with open("src/components/KvzDashboard.tsx", "w") as f: f.write(c2)
