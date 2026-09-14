with open("src/components/AusbaugebietDashboard.tsx", "r") as f:
    c = f.read()
c = c.replace("export function AusbaugebietDashboard({", "export function AusbaugebietDashboard({\n  parentProjectId,\n  onBack,")
with open("src/components/AusbaugebietDashboard.tsx", "w") as f:
    f.write(c)

with open("src/components/KvzDashboard.tsx", "r") as f:
    c2 = f.read()
c2 = c2.replace("export function KvzDashboard({", "export function KvzDashboard({\n  parentAusbaugebietId,\n  onBack,")
with open("src/components/KvzDashboard.tsx", "w") as f:
    f.write(c2)
