import { useState } from 'react';
import type { AppSettings } from '../types';

interface SetupWizardProps {
  initialSettings: AppSettings;
  onFinish: (settings: AppSettings) => void;
}

const ACCENT_PRESETS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ef4444', '#0ea5e9'];

export function SetupWizard({ initialSettings, onFinish }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AppSettings>({ ...initialSettings });

  const handleLogoUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, logoBase64: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const steps = [
    {
      title: 'Willkommen bei OTDR Studio',
      body: (
        <div style={styles.introText}>
          <p>
            OTDR Studio hilft dir, OTDR-Messungen (.sor-Dateien) automatisch Kundendatensätzen zuzuordnen
            und daraus fertige Abnahmeprotokolle nach DIN EN 50346 als PDF zu erzeugen.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            Kurzer Ablauf:
          </p>
          <ol style={styles.introList}>
            <li>Kundenliste als Excel/CSV importieren (z.B. aus SharePoint).</li>
            <li>USB-Stick bzw. Messordner mit .sor-Dateien einlesen lassen — die App ordnet sie automatisch zu.</li>
            <li>Protokolle einzeln oder als Stapel als PDF exportieren.</li>
          </ol>
          <p style={{ marginTop: '0.75rem' }}>
            Im nächsten Schritt richtest du dein Firmenprofil ein. Du kannst später jederzeit weitere Profile
            anlegen (z.B. für unterschiedliche Auftraggeber) und über die Einstellungen wechseln.
          </p>
        </div>
      ),
    },
    {
      title: 'Firmenprofil',
      body: (
        <div style={styles.grid}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={styles.label}>Firmenname (dein Betrieb):</label>
            <input style={styles.input} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>Abteilung / Fachbereich:</label>
            <input style={styles.input} value={form.companyDept} onChange={(e) => setForm({ ...form, companyDept: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>Kontakt (E-Mail / Telefon):</label>
            <input style={styles.input} value={form.companyContact} onChange={(e) => setForm({ ...form, companyContact: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>Standard-Messtechniker:</label>
            <input style={styles.input} value={form.defaultTechnician} onChange={(e) => setForm({ ...form, defaultTechnician: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>Auftraggeber / Netzbetreiber:</label>
            <input style={styles.input} value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })} />
          </div>
        </div>
      ),
    },
    {
      title: 'Darstellung',
      body: (
        <div>
          <label style={styles.label}>Akzentfarbe:</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => setForm({ ...form, accentColor: c })}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: form.accentColor === c ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                }}
                aria-label={`Akzentfarbe ${c}`}
              />
            ))}
            <input
              type="color"
              value={form.accentColor}
              onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
              style={{ width: '32px', height: '28px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            />
          </div>

          <label style={styles.label}>Design:</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button
              style={{ ...styles.themeBtn, ...(form.themeMode === 'dark' ? styles.themeBtnActive : {}) }}
              onClick={() => setForm({ ...form, themeMode: 'dark' })}
            >
              Dunkel
            </button>
            <button
              style={{ ...styles.themeBtn, ...(form.themeMode === 'light' ? styles.themeBtnActive : {}) }}
              onClick={() => setForm({ ...form, themeMode: 'light' })}
            >
              Hell
            </button>
          </div>

          <label style={styles.label}>Firmenlogo (optional, erscheint auf dem PDF-Protokoll):</label>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)} />
          {form.logoBase64 && (
            <div style={{ marginTop: '0.6rem' }}>
              <img src={form.logoBase64} alt="Logo-Vorschau" style={{ maxHeight: '48px', maxWidth: '220px' }} />
            </div>
          )}
        </div>
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>{steps[step].title}</h2>
          <span style={styles.stepIndicator}>Schritt {step + 1} / {steps.length}</span>
        </div>
        <div style={styles.body}>{steps[step].body}</div>
        <div style={styles.footer}>
          {step > 0 && (
            <button style={styles.btnSecondary} onClick={() => setStep(step - 1)}>Zurück</button>
          )}
          <div style={{ flex: 1 }} />
          {!isLast ? (
            <button style={styles.btnPrimary} onClick={() => setStep(step + 1)}>Weiter</button>
          ) : (
            <button style={styles.btnPrimary} onClick={() => onFinish(form)}>Einrichtung abschließen</button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  container: {
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '560px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
    overflow: 'hidden',
  },
  header: {
    padding: '1.1rem 1.4rem',
    backgroundColor: 'var(--color-bg-surface-elevated)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  },
  stepIndicator: {
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    fontWeight: 600,
  },
  body: {
    padding: '1.4rem',
    minHeight: '220px',
    overflowY: 'auto',
    flex: 1,
    color: 'var(--color-text-primary)',
    fontSize: '0.85rem',
    lineHeight: 1.5,
  },
  introText: {
    color: 'var(--color-text-secondary)',
  },
  introList: {
    marginTop: '0.4rem',
    paddingLeft: '1.2rem',
    color: 'var(--color-text-secondary)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '0.3rem',
  },
  input: {
    width: '100%',
    padding: '0.55rem 0.75rem',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: '6px',
    fontSize: '0.85rem',
  },
  themeBtn: {
    padding: '0.45rem 0.9rem',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  themeBtnActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    borderColor: 'var(--color-primary)',
  },
  footer: {
    padding: '1rem 1.4rem',
    backgroundColor: 'var(--color-bg-surface-elevated)',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  btnSecondary: {
    background: 'none',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  btnPrimary: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    padding: '0.55rem 1.2rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
