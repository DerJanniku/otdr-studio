import re
with open("src/components/ProjectDashboard.tsx", "r") as f:
    orig = f.read()

# Make Ausbaugebiet
c = orig.replace("ProjectDashboard", "AusbaugebietDashboard")
c = c.replace("Project", "Ausbaugebiet").replace("project", "ausbaugebiet")
c = c.replace("Projekte", "Ausbaugebiete")
c = c.replace("Ausbaugebiet anlegen", "Bereich anlegen")
c = c.replace("Neues Ausbaugebiet", "Neues Ausbaugebiet")
c = c.replace("interface AusbaugebietDashboardProps {", "interface AusbaugebietDashboardProps {\n  parentProjectId: string;\n  onBack: () => void;")
c = c.replace("activeAusbaugebietId: string;", "activeAusbaugebietId?: string;")
c = c.replace("export function AusbaugebietDashboard({\n  ausbaugebiets,", "export function AusbaugebietDashboard({\n  parentProjectId,\n  onBack,\n  ausbaugebiets,")
c = c.replace("onCreateAusbaugebiet(formData)", "onCreateAusbaugebiet({ ...formData, projectId: parentProjectId })")
c = c.replace("Ausbaugebiete & Ausbaugebiete", "Ausbaugebiete")
# Add back button and remove settings button
back_btn = """      <div style={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={onBack} style={{ width: 'fit-content', padding: '0.4rem 0.8rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← Zurück zu Projekten</button>
          <h2 style={styles.title}>Ausbaugebiete</h2>"""
c = re.sub(r'      <div style=\{styles\.header\}>\s*<div>\s*<h2 style=\{styles\.title\}>Ausbaugebiete</h2>', back_btn, c)
c = re.sub(r'<button[^>]*onClick=\{onOpenSettings\}[^>]*>.*?⚙️ Firmeneinstellungen\s*</button>', '', c, flags=re.DOTALL)
with open("src/components/AusbaugebietDashboard.tsx", "w") as f: f.write(c)

# Make KVZ
c2 = orig.replace("ProjectDashboard", "KvzDashboard")
c2 = c2.replace("Project", "KVZ").replace("project", "kvz")
c2 = c2.replace("Projekte", "KVZs (NVTs)")
c2 = c2.replace("Ausbaugebiet anlegen", "KVZ anlegen").replace("Neues Ausbaugebiet", "Neuer KVZ")
c2 = c2.replace("Cluster / Trassen-Bez. (optional)", "Beschreibung")
c2 = c2.replace("interface KvzDashboardProps {", "interface KvzDashboardProps {\n  parentAusbaugebietId: string;\n  onBack: () => void;")
c2 = c2.replace("activeKvzId: string;", "activeKVZId?: string;")
c2 = c2.replace("activeKvzId={", "activeKVZId={")
c2 = c2.replace("export function KvzDashboard({\n  kvzs,", "export function KvzDashboard({\n  parentAusbaugebietId,\n  onBack,\n  kvzs,")
c2 = c2.replace("onCreateKVZ(formData)", "onCreateKVZ({ ...formData, ausbaugebietId: parentAusbaugebietId })")
back_btn2 = """      <div style={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={onBack} style={{ width: 'fit-content', padding: '0.4rem 0.8rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← Zurück zu Ausbaugebieten</button>
          <h2 style={styles.title}>KVZs (NVTs)</h2>"""
c2 = re.sub(r'      <div style=\{styles\.header\}>\s*<div>\s*<h2 style=\{styles\.title\}>KVZs \(NVTs\)</h2>', back_btn2, c2)
c2 = re.sub(r'<button[^>]*onClick=\{onOpenSettings\}[^>]*>.*?⚙️ Firmeneinstellungen\s*</button>', '', c2, flags=re.DOTALL)
with open("src/components/KvzDashboard.tsx", "w") as f: f.write(c2)

