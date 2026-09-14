with open("src/components/AusbaugebietDashboard.tsx", "r") as f:
    c = f.read()

back_ag = """<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} style={{ padding: '0.4rem 0.8rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← Zurück zu Projekten</button>
          <h1 style={styles.title}>"""
c = c.replace("<h1 style={styles.title}>", back_ag)
with open("src/components/AusbaugebietDashboard.tsx", "w") as f:
    f.write(c)

with open("src/components/KvzDashboard.tsx", "r") as f:
    c2 = f.read()

back_kvz = """<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} style={{ padding: '0.4rem 0.8rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← Zurück zu Ausbaugebieten</button>
          <h1 style={styles.title}>"""
c2 = c2.replace("<h1 style={styles.title}>", back_kvz)
with open("src/components/KvzDashboard.tsx", "w") as f:
    f.write(c2)

