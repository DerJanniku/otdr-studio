with open("src/components/AusbaugebietDashboard.tsx", "r") as f: c = f.read()
# We need to add </div> after the <p> tag!
c = c.replace("Wähle ein Ausbaugebiet aus, um Messungen zuzuordnen und DIN EN 50346 Protokolle zu erstellen.\n          </p>", "Wähle ein Ausbaugebiet aus, um Messungen zuzuordnen und DIN EN 50346 Protokolle zu erstellen.\n          </p></div>")
with open("src/components/AusbaugebietDashboard.tsx", "w") as f: f.write(c)

with open("src/components/KvzDashboard.tsx", "r") as f: c = f.read()
c = c.replace("Wähle ein KVZ aus, um Messungen zuzuordnen und DIN EN 50346 Protokolle zu erstellen.\n          </p>", "Wähle ein KVZ aus, um Messungen zuzuordnen und DIN EN 50346 Protokolle zu erstellen.\n          </p></div>")
with open("src/components/KvzDashboard.tsx", "w") as f: f.write(c)

