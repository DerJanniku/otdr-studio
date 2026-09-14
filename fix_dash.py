import re

with open("src/components/AusbaugebietDashboard.tsx", "r") as f:
    c = f.read()
c = c.replace("interface AusbaugebietDashboardProps {", "interface AusbaugebietDashboardProps {\n  parentProjectId: string;\n  onBack: () => void;")
c = c.replace("activeAusbaugebietId: string;", "activeAusbaugebietId?: string;")
# Add the back button
back_btn = """      <div style={styles.header}>
        <div>
          <button onClick={onBack} style={{ ...styles.btnSecondary, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>←</span> Zurück zu Projekten
          </button>
          <h2 style={styles.title}>Ausbaugebiete</h2>"""
c = re.sub(r'<div style=\{styles\.header\}>\s*<div>\s*<h2 style=\{styles\.title\}>Ausbaugebiete</h2>', back_btn, c)
# Fix onCreateAusbaugebiet usage
c = re.sub(r'onCreateAusbaugebiet\s*\(\s*formData\s*\)', 'onCreateAusbaugebiet({ ...formData, projectId: parentProjectId })', c)
with open("src/components/AusbaugebietDashboard.tsx", "w") as f:
    f.write(c)


with open("src/components/KvzDashboard.tsx", "r") as f:
    c2 = f.read()
c2 = c2.replace("interface KvzDashboardProps {", "interface KvzDashboardProps {\n  parentAusbaugebietId: string;\n  onBack: () => void;")
c2 = c2.replace("activeKvzId: string;", "activeKvzId?: string;")
back_btn2 = """      <div style={styles.header}>
        <div>
          <button onClick={onBack} style={{ ...styles.btnSecondary, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>←</span> Zurück zu Ausbaugebieten
          </button>
          <h2 style={styles.title}>KVZs (NVTs)</h2>"""
c2 = re.sub(r'<div style=\{styles\.header\}>\s*<div>\s*<h2 style=\{styles\.title\}>KVZs \(NVTs\)</h2>', back_btn2, c2)
c2 = re.sub(r'onCreateKVZ\s*\(\s*formData\s*\)', 'onCreateKVZ({ ...formData, ausbaugebietId: parentAusbaugebietId })', c2)
with open("src/components/KvzDashboard.tsx", "w") as f:
    f.write(c2)

