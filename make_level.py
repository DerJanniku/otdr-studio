with open("src/components/ProjectDashboard.tsx", "r") as f:
    content = f.read()

# I will write a simple python script to copy ProjectDashboard to AusbaugebietDashboard and KvzDashboard
content_ag = content.replace("Project", "Ausbaugebiet").replace("project", "ausbaugebiet").replace("Projekte", "Ausbaugebiete").replace("Ausbaugebiet anlegen", "Ausbaugebiet erstellen")
# wait, the original ProjectDashboard says "Ausbaugebiet anlegen". Because the user was using "Project" for Ausbaugebiet.
content_ag = content.replace("Project", "Ausbaugebiet").replace("project", "ausbaugebiet").replace("Ausbaugebiet anlegen", "Bereich anlegen")

with open("src/components/AusbaugebietDashboard.tsx", "w") as f:
    f.write(content_ag)

content_kvz = content.replace("Project", "KVZ").replace("project", "kvz").replace("Projekte", "KVZs").replace("Ausbaugebiet anlegen", "KVZ anlegen").replace("Cluster / Trassen-Bez.", "Beschreibung")
with open("src/components/KvzDashboard.tsx", "w") as f:
    f.write(content_kvz)

