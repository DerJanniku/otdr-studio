import re

# 1. Remove Firmeneinstellungen button from ProjectDashboard.tsx
with open("src/components/ProjectDashboard.tsx", "r") as f:
    c = f.read()

c = re.sub(r'<button[^>]*onClick=\{onOpenSettings\}[^>]*>.*?⚙️ Firmeneinstellungen\s*</button>', '', c, flags=re.DOTALL)
with open("src/components/ProjectDashboard.tsx", "w") as f:
    f.write(c)

# 2. Change 'Einstellungen & Vorlage' to ⚙️ in App.tsx
with open("src/App.tsx", "r") as f:
    c = f.read()

c = c.replace("Einstellungen & Vorlage", "⚙️")
with open("src/App.tsx", "w") as f:
    f.write(c)

