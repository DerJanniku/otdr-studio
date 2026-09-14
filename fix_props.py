with open("src/components/AusbaugebietDashboard.tsx", "r") as f:
    c = f.read()
c = c.replace("interface AusbaugebietDashboardProps {", "interface AusbaugebietDashboardProps { parentProjectId: string; onBack: () => void; ")
c = c.replace("  accentColor: string;\n}: AusbaugebietDashboardProps) {", "  accentColor: string;\n  parentProjectId: string;\n  onBack: () => void;\n}: AusbaugebietDashboardProps) {")
with open("src/components/AusbaugebietDashboard.tsx", "w") as f: f.write(c)

with open("src/components/KvzDashboard.tsx", "r") as f:
    c = f.read()
c = c.replace("interface KvzDashboardProps {", "interface KvzDashboardProps { parentAusbaugebietId: string; onBack: () => void; ")
c = c.replace("  accentColor: string;\n}: KvzDashboardProps) {", "  accentColor: string;\n  parentAusbaugebietId: string;\n  onBack: () => void;\n}: KvzDashboardProps) {")
with open("src/components/KvzDashboard.tsx", "w") as f: f.write(c)

