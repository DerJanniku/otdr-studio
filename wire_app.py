with open("src/App.tsx", "r") as f: c = f.read()

c = c.replace("onUpdateAusbaugebiet={async () => {}}", "onUpdateAusbaugebiet={async (a) => {\n            if(window.api?.updateAusbaugebiet) await window.api.updateAusbaugebiet(a);\n            await loadAusbaugebiete(activeProject!.id);\n          }}")
c = c.replace("onDeleteAusbaugebiet={async () => {}}", "onDeleteAusbaugebiet={async (id) => {\n            if(window.api?.deleteAusbaugebiet) await window.api.deleteAusbaugebiet(id);\n            await loadAusbaugebiete(activeProject!.id);\n          }}")

c = c.replace("onUpdateKVZ={async () => {}}", "onUpdateKVZ={async (k) => {\n            if(window.api?.updateKVZ) await window.api.updateKVZ(k);\n            await loadKvzs(activeAusbaugebiet!.id);\n          }}")
c = c.replace("onDeleteKVZ={async () => {}}", "onDeleteKVZ={async (id) => {\n            if(window.api?.deleteKVZ) await window.api.deleteKVZ(id);\n            await loadKvzs(activeAusbaugebiet!.id);\n          }}")

with open("src/App.tsx", "w") as f: f.write(c)

