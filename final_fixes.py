import re

with open("src/components/AusbaugebietDashboard.tsx", "r") as f: c = f.read()
# Fix title
c = c.replace("Ausbaugebiete & Ausbaugebiete", "Ausbaugebiete")
# Add back button
back_ag = """<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={onBack} style={{ width: 'fit-content', padding: '0.4rem 0.8rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← Zurück zu Projekten</button>
          <h2 style={styles.title}>Ausbaugebiete</h2>"""
c = c.replace("""<div>
          <h2 style={styles.title}>Ausbaugebiete</h2>""", back_ag)
with open("src/components/AusbaugebietDashboard.tsx", "w") as f: f.write(c)

with open("src/components/KvzDashboard.tsx", "r") as f: c2 = f.read()
# Fix title
c2 = c2.replace("KVZs (NVTs) & KVZs (NVTs)", "KVZs (NVTs)")
c2 = c2.replace("KVZs (NVTs) & Ausbaugebiete", "KVZs (NVTs)")
c2 = c2.replace("KVZs (NVTs) & Projekte", "KVZs (NVTs)")
# Add back button
back_kvz = """<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={onBack} style={{ width: 'fit-content', padding: '0.4rem 0.8rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← Zurück zu Ausbaugebieten</button>
          <h2 style={styles.title}>KVZs (NVTs)</h2>"""
c2 = c2.replace("""<div>
          <h2 style={styles.title}>KVZs (NVTs)</h2>""", back_kvz)

# Re-apply POP->KVZ Measurements UI!
c2 = c2.replace("name: '',", "name: '',\n    popMeasurements: [] as PopMeasurement[],")
c2 = c2.replace("name: proj.name,", "name: proj.name,\n      popMeasurements: proj.popMeasurements || [],")
if "import type { KVZ, PopMeasurement }" not in c2:
    c2 = c2.replace("import type { KVZ } from '../types';", "import type { KVZ, PopMeasurement } from '../types';")

ui_add = """            </div>
            
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <h4 style={{ color: '#fff', marginBottom: '1rem' }}>POP ➔ KVZ Zuleitungsmessungen</h4>
              {formData.popMeasurements.map(pm => (
                <div key={pm.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '6px' }}>
                  <input
                    type="text"
                    value={pm.fiberName}
                    onChange={(e) => {
                      const newPm = [...formData.popMeasurements];
                      const idx = newPm.findIndex(x => x.id === pm.id);
                      newPm[idx].fiberName = e.target.value;
                      setFormData({ ...formData, popMeasurements: newPm });
                    }}
                    placeholder="z.B. Faser 3"
                    style={{ ...styles.formInput, width: '150px' }}
                  />
                  <div style={{ flex: 1, color: pm.sorFilePath ? '#22c55e' : '#a1a1aa', fontSize: '0.85rem' }}>
                    {pm.sorFilePath ? pm.sorFilePath.split('/').pop()?.split('\\\\').pop() : 'Keine .sor Datei'}
                  </div>
                  <button type="button" onClick={async () => {
                     if (window.api?.selectSorFile) {
                        const file = await window.api.selectSorFile();
                        if (file) {
                          const newPm = [...formData.popMeasurements];
                          const idx = newPm.findIndex(x => x.id === pm.id);
                          newPm[idx].sorFilePath = file;
                          setFormData({ ...formData, popMeasurements: newPm });
                        }
                     }
                  }} style={{ padding: '0.3rem 0.6rem', background: 'var(--color-bg-tertiary)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>.sor wählen</button>
                  {pm.sorFilePath && (
                     <button type="button" onClick={async () => {
                       if (window.api?.generateKvzPdf) {
                         const res = await window.api.generateKvzPdf(editingKVZ!.id, pm.id);
                         if (res.success) alert("PDF erfolgreich erstellt!");
                         else alert("Fehler: " + res.error);
                       }
                     }} style={{ padding: '0.3rem 0.6rem', background: '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>PDF erstellen</button>
                  )}
                  <button type="button" onClick={() => {
                      const newPm = formData.popMeasurements.filter(x => x.id !== pm.id);
                      setFormData({ ...formData, popMeasurements: newPm });
                  }} style={{ padding: '0.3rem 0.6rem', background: '#ef4444', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>X</button>
                </div>
              ))}
              <button type="button" onClick={() => {
                const newPm = [...formData.popMeasurements, { id: 'pm_' + Date.now(), fiberName: '' }];
                setFormData({ ...formData, popMeasurements: newPm });
              }} style={{ marginTop: '0.5rem', background: 'transparent', color: accentColor, border: '1px dashed ' + accentColor, padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>+ Faser hinzufügen</button>
            </div>
"""
c2 = re.sub(r'            </div>\s*<div style=\{\{ display: \'flex\', justifyContent: \'flex-end\', gap: \'1rem\' \}\}>', ui_add + r'\n            <div style={{ display: \'flex\', justifyContent: \'flex-end\', gap: \'1rem\' }}>', c2, flags=re.DOTALL)

with open("src/components/KvzDashboard.tsx", "w") as f: f.write(c2)
