with open('src/components/DrilldownDashboard.tsx', 'r') as f:
    code = f.read()

kvz_section = """
              <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'var(--color-bg-base)' }}>
                <h5>POP zu KVZ Messungen (.sor Upload)</h5>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Hier können .sor Dateien für die Fasern vom POP zum KVZ hochgeladen werden.</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={() => alert('Wird implementiert: SOR Upload / USB Scan für KVZ')}>SOR Dateien (POP->KVZ) hinzufügen</button>
                  <button onClick={() => alert('Wird implementiert: KVZ PDF Generierung')}>KVZ PDF Protokoll generieren</button>
                </div>
              </div>
"""

# Insert it before the end of the KVZ item.
# Find `</div>\n          ))}`
import re
code = re.sub(r'(<button onClick=\{\(\) => handleDeleteKvz\(k\.id\)\} style=\{\{ color: \'red\' \}\}>Löschen</button>\n\s*</div>)', r'\1' + kvz_section, code)

with open('src/components/DrilldownDashboard.tsx', 'w') as f:
    f.write(code)
