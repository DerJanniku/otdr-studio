import re

with open("src/components/AusbaugebietDashboard.tsx", "r") as f:
    c = f.read()
c = c.replace("Ausbaugebiete &amp; Ausbaugebiete", "Ausbaugebiete")
c = re.sub(r'<button[^>]*onClick=\{onOpenSettings\}[^>]*>.*?⚙️ Firmeneinstellungen\s*</button>', '', c, flags=re.DOTALL)
with open("src/components/AusbaugebietDashboard.tsx", "w") as f:
    f.write(c)

with open("src/components/KvzDashboard.tsx", "r") as f:
    c2 = f.read()
c2 = c2.replace("KVZs (NVTs) &amp; Ausbaugebiete", "KVZs (NVTs)")
c2 = c2.replace("KVZs (NVTs) &amp; KVZs", "KVZs (NVTs)")
c2 = c2.replace("KVZ &amp; Ausbaugebiete", "KVZs (NVTs)")
c2 = re.sub(r'<button[^>]*onClick=\{onOpenSettings\}[^>]*>.*?⚙️ Firmeneinstellungen\s*</button>', '', c2, flags=re.DOTALL)
with open("src/components/KvzDashboard.tsx", "w") as f:
    f.write(c2)

