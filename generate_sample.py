import json
import os
import time

user_dir = os.path.expanduser("~/Library/Application Support/OTDR Studio/otdr-studio")

# 1. Create Project "Herrieden"
p_path = os.path.join(user_dir, "projects.json")
projects = []
if os.path.exists(p_path):
    projects = json.load(open(p_path))

herrieden_id = "proj_" + str(int(time.time()*1000))
for p in projects:
    if p["name"] == "Herrieden":
        herrieden_id = p["id"]
        break
else:
    projects.append({
        "id": herrieden_id,
        "name": "Herrieden",
        "createdAt": "2026-09-14T10:00:00.000Z",
        "updatedAt": "2026-09-14T10:00:00.000Z"
    })
    with open(p_path, "w") as f:
        json.dump(projects, f)

# 2. Create Ausbaugebiet "Rauenzell"
a_path = os.path.join(user_dir, "ausbaugebiete.json")
ags = []
if os.path.exists(a_path):
    try: ags = json.load(open(a_path))
    except: pass

rauenzell_id = "ag_" + str(int(time.time()*1000))
for a in ags:
    if a["name"] == "Rauenzell" and a["projectId"] == herrieden_id:
        rauenzell_id = a["id"]
        break
else:
    ags.append({
        "id": rauenzell_id,
        "projectId": herrieden_id,
        "name": "Rauenzell",
        "createdAt": "2026-09-14T10:00:00.000Z"
    })
    with open(a_path, "w") as f:
        json.dump(ags, f)

# 3. Create KVZ "KVZ 1"
k_path = os.path.join(user_dir, "kvzs.json")
kvzs = []
if os.path.exists(k_path):
    try: kvzs = json.load(open(k_path))
    except: pass

kvz1_id = "kvz_" + str(int(time.time()*1000))
for k in kvzs:
    if k["name"] == "KVZ 1" and k["ausbaugebietId"] == rauenzell_id:
        kvz1_id = k["id"]
        break
else:
    kvzs.append({
        "id": kvz1_id,
        "ausbaugebietId": rauenzell_id,
        "name": "KVZ 1",
        "createdAt": "2026-09-14T10:00:00.000Z"
    })
    with open(k_path, "w") as f:
        json.dump(kvzs, f)

