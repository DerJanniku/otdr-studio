with open("src/components/KvzDashboard.tsx", "r") as f: c2 = f.read()
c2 = c2.replace("popMeasurements: [] as PopMeasurement[],\n    popMeasurements: [] as PopMeasurement[],", "popMeasurements: [] as PopMeasurement[],")
c2 = c2.replace("popMeasurements: proj.popMeasurements || [],\n      popMeasurements: proj.popMeasurements || [],", "popMeasurements: proj.popMeasurements || [],")

# Also, because I ran the UI append again, it probably added the UI block twice!
import re
c2 = re.sub(r'(<div style=\{\{ marginTop: \'1\.5rem\', borderTop: \'1px solid var\(--color-border\)\', paddingTop: \'1rem\' \}\}>\s*<h4 style=\{\{ color: \'#fff\', marginBottom: \'1rem\' \}\}>POP ➔ KVZ Zuleitungsmessungen</h4>.*?</div>\s*){2,}', r'\1', c2, flags=re.DOTALL)

with open("src/components/KvzDashboard.tsx", "w") as f: f.write(c2)
