with open("src/components/AusbaugebietDashboard.tsx", "r") as f:
    c = f.read()

c = c.replace("Ausbaugebiete & Ausbaugebiete", "Ausbaugebiete")
c = c.replace("Ausbaugebiete & KVZs", "Ausbaugebiete")
c = c.replace("KVZs (NVTs) & Ausbaugebiete", "KVZs (NVTs)")

# Remove the Firmeneinstellungen button from both
import re
# The button looks like:
# <button style={styles.btnSecondary} onClick={onOpenSettings}>
#   ⚙️ Firmeneinstellungen
# </button>
c = re.sub(r'<button[^>]*onClick=\{onOpenSettings\}[^>]*>.*?⚙️ Firmeneinstellungen\s*</button>', '', c, flags=re.DOTALL)
# Also fix if I broke it with sed
c = re.sub(r'<!--\s*-->', '', c, flags=re.DOTALL)

with open("src/components/AusbaugebietDashboard.tsx", "w") as f:
    f.write(c)

with open("src/components/KvzDashboard.tsx", "r") as f:
    c2 = f.read()
c2 = c2.replace("KVZs (NVTs) & Ausbaugebiete", "KVZs (NVTs)")
c2 = c2.replace("KVZ & Ausbaugebiete", "KVZs (NVTs)")
c2 = c2.replace("KVZs (NVTs) & KVZs", "KVZs (NVTs)")
c2 = c2.replace("KVZ & KVZ", "KVZs (NVTs)")
c2 = re.sub(r'<button[^>]*onClick=\{onOpenSettings\}[^>]*>.*?⚙️ Firmeneinstellungen\s*</button>', '', c2, flags=re.DOTALL)
with open("src/components/KvzDashboard.tsx", "w") as f:
    f.write(c2)

