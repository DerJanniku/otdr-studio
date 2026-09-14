with open('src/components/DrilldownDashboard.tsx', 'r') as f:
    text = f.read()

text = text.replace("import type { Project, Cluster, KVZ, AppSettings } from '../types';", "import type { Project, Cluster, KVZ } from '../types';")
text = text.replace("export function DrilldownDashboard({ onSelectKvz, settings }: { onSelectKvz: (k: KVZ) => void, settings: any }) {", "export function DrilldownDashboard({ onSelectKvz }: { onSelectKvz: (k: KVZ) => void }) {")
text = text.replace("export function DrilldownDashboard({ onSelectKvz  { onSelectKvz: (k: KVZ) => void }) {", "export function DrilldownDashboard({ onSelectKvz }: { onSelectKvz: (k: KVZ) => void }) {")

with open('src/components/DrilldownDashboard.tsx', 'w') as f:
    f.write(text)

with open('src/App.tsx', 'r') as f:
    text = f.read()
text = text.replace("<DrilldownDashboard onSelectKvz={handleKvzSelect} settings={settings} />", "<DrilldownDashboard onSelectKvz={handleKvzSelect} />")
with open('src/App.tsx', 'w') as f:
    f.write(text)
