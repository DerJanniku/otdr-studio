import re
with open("src/App.tsx", "r") as f: c = f.read()
# Fix back button in App.tsx Customer view
old_back = """          {view === 'project' && (
            <button
              style={styles.btnBack}
              onClick={() => {
                loadProjects();
                setView('dashboard');
              }}
            >
              ← Zurück zu Projekten
            </button>
          )}"""
new_back = """          {view === 'project' && (
            <button
              style={styles.btnBack}
              onClick={() => {
                setView('kvz');
              }}
            >
              ← Zurück zu KVZs
            </button>
          )}"""
c = c.replace(old_back, new_back)
with open("src/App.tsx", "w") as f: f.write(c)

