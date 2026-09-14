import re

with open("src/components/AusbaugebietDashboard.tsx", "r") as f: c = f.read()
# Replace form fields
c = c.replace("Name des Ausbaugebiets / Projekts *", "Name des Ausbaugebiets *")
c = c.replace("z. B. Herrieden, Neunstetten, Bernau", "z. B. Rauenzell")

# Remove "Auftraggeber" and "SharePoint" completely from the modal
# We can just use a regex to remove the divs
c = re.sub(r'<div style=\{\{ display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: \'1rem\' \}\}>.*?</div>\s*</div>', '', c, flags=re.DOTALL)
c = re.sub(r'<div>\s*<label style=\{styles\.formLabel\}>\s*Lokaler SharePoint.*?</span>\s*</div>', '', c, flags=re.DOTALL)

with open("src/components/AusbaugebietDashboard.tsx", "w") as f: f.write(c)

with open("src/components/KvzDashboard.tsx", "r") as f: c2 = f.read()
c2 = c2.replace("Name des Ausbaugebiets / Projekts *", "Name des KVZs *")
c2 = c2.replace("z. B. Herrieden, Neunstetten, Bernau", "z. B. KVZ 1")

c2 = re.sub(r'<div style=\{\{ display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: \'1rem\' \}\}>.*?</div>\s*</div>', '', c2, flags=re.DOTALL)
c2 = re.sub(r'<div>\s*<label style=\{styles\.formLabel\}>\s*Lokaler SharePoint.*?</span>\s*</div>', '', c2, flags=re.DOTALL)

with open("src/components/KvzDashboard.tsx", "w") as f: f.write(c2)

