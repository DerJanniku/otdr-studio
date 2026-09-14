import os

with open("src/components/ProjectDashboard.tsx", "r") as f:
    orig = f.read()

# We keep ProjectDashboard for Projects.
# Now create AusbaugebietDashboard
ag_code = orig.replace("ProjectDashboard", "AusbaugebietDashboard")
ag_code = ag_code.replace("Project", "Ausbaugebiet")
ag_code = ag_code.replace("project", "ausbaugebiet")
ag_code = ag_code.replace("Projekte", "Ausbaugebiete")
ag_code = ag_code.replace("Ausbaugebiet anlegen", "Ausbaugebiet erstellen")
ag_code = ag_code.replace("Neues Ausbaugebiet", "Neues Ausbaugebiet")
# Fix the interface
ag_code = ag_code.replace("interface Props {", "interface Props {\n  parentProjectId: string;\n  onBack: () => void;")
ag_code = ag_code.replace("activeAusbaugebietId: string;", "activeAusbaugebietId?: string;")
ag_code = ag_code.replace("onSubmit={e => {\n                e.preventDefault();\n                if (editingAusbaugebiet) {\n                  // edit not fully implemented in UI\n                } else {\n                  onAusbaugebietCreated(formData);\n                }\n                setShowModal(false);\n              }}", "onSubmit={e => {\n                e.preventDefault();\n                onAusbaugebietCreated({ ...formData, projectId: parentProjectId });\n                setShowModal(false);\n              }}")

# We need to add a "Zurück" button
back_btn = """
      <div style={styles.header}>
        <div>
          <button onClick={onBack} style={{ ...styles.btnSecondary, marginBottom: '1rem' }}>← Zurück zu Projekten</button>
          <h2 style={styles.title}>Ausbaugebiete</h2>
"""
ag_code = ag_code.replace("""      <div style={styles.header}>\n        <div>\n          <h2 style={styles.title}>Ausbaugebiete</h2>""", back_btn)

with open("src/components/AusbaugebietDashboard.tsx", "w") as f:
    f.write(ag_code)


# Now create KvzDashboard
kvz_code = orig.replace("ProjectDashboard", "KvzDashboard")
kvz_code = kvz_code.replace("Project", "KVZ")
kvz_code = kvz_code.replace("project", "kvz")
kvz_code = kvz_code.replace("Projekte", "KVZs (NVTs)")
kvz_code = kvz_code.replace("Ausbaugebiet anlegen", "KVZ anlegen")
kvz_code = kvz_code.replace("Neues Ausbaugebiet", "Neuer KVZ")
kvz_code = kvz_code.replace("Cluster / Trassen-Bez. (optional)", "Beschreibung")

kvz_code = kvz_code.replace("interface Props {", "interface Props {\n  parentAusbaugebietId: string;\n  onBack: () => void;")
kvz_code = kvz_code.replace("activeKvzId: string;", "activeKvzId?: string;")
kvz_code = kvz_code.replace("onSubmit={e => {\n                e.preventDefault();\n                if (editingKVZ) {\n                  // edit not fully implemented in UI\n                } else {\n                  onKVZCreated(formData);\n                }\n                setShowModal(false);\n              }}", "onSubmit={e => {\n                e.preventDefault();\n                onKVZCreated({ ...formData, ausbaugebietId: parentAusbaugebietId });\n                setShowModal(false);\n              }}")

back_btn2 = """
      <div style={styles.header}>
        <div>
          <button onClick={onBack} style={{ ...styles.btnSecondary, marginBottom: '1rem' }}>← Zurück zu Ausbaugebieten</button>
          <h2 style={styles.title}>KVZs (NVTs)</h2>
"""
kvz_code = kvz_code.replace("""      <div style={styles.header}>\n        <div>\n          <h2 style={styles.title}>KVZs (NVTs)</h2>""", back_btn2)

with open("src/components/KvzDashboard.tsx", "w") as f:
    f.write(kvz_code)

