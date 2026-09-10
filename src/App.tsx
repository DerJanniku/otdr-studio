import { useState, useEffect } from 'react';
import type { CustomerItem, AppSettings, Project } from './types';
import { CustomerTable } from './components/CustomerTable';
import { ProtocolPreviewModal } from './components/ProtocolPreviewModal';
import { SettingsModal } from './components/SettingsModal';
import { SetupWizard } from './components/SetupWizard';
import { ProjectDashboard } from './components/ProjectDashboard';

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'Musterfirma GmbH',
  companyDept: 'Netzabnahme & OTDR-Qualitätsprüfung',
  companyContact: 'kontakt@musterfirma.de · Tel: +49 (0) 170 0000000',
  defaultTechnician: '',
  providerName: 'Ihr Auftraggeber / Netzbetreiber',
  projectCluster: 'Beispiel-Ausbaugebiet',
  launchFiber: '500 m Vorlauf · 500 m Nachlauf',
  receiveFiber: '500 m Nachlauf',
  normTitle: 'DIN EN 50346:2010-04 / DIN EN 60793-1-40',
  maxLossSplice: 0.15,
  maxLossConnector: 0.50,
  minOrl: 45.0,
  otdrDeviceModel: '',
  accentColor: '#3b82f6',
  themeMode: 'dark',
};

export function App() {
  const [view, setView] = useState<'dashboard' | 'project'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'matched' | 'pending' | 'exported'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [updateInfo, setUpdateInfo] = useState<{ latestVersion?: string; url?: string; canSelfUpdate?: boolean } | null>(null);
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const loadProjects = async () => {
    if (window.api?.getProjects) {
      const projs = await window.api.getProjects();
      setProjects(projs);
    }
    if (window.api?.getActiveProject) {
      const active = await window.api.getActiveProject();
      setActiveProject(active);
    }
  };

  const loadData = async () => {
    await loadProjects();
    if (window.api?.getCustomers) {
      const list = await window.api.getCustomers();
      setCustomers(list);
    }
    if (window.api?.getAppSettings) {
      const s = await window.api.getAppSettings();
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
    }
  };

  useEffect(() => {
    loadData();

    window.api?.isFirstRun?.().then((isFirst) => {
      if (isFirst) setShowWizard(true);
    });

    window.api?.checkForUpdates?.().then((res) => {
      if (res?.hasUpdate) {
        setUpdateInfo({ latestVersion: res.latestVersion, url: res.url, canSelfUpdate: res.canSelfUpdate });
        if (res.canSelfUpdate) window.api?.updaterCheck?.();
      }
    });

    const unsubscribeUpdate = window.api?.onUpdateState?.((state) => setUpdateState(state));

    const unsubscribeUsb = window.api?.onUsbDetected?.((data) => {
      setCustomers(data.customers);
      loadProjects();
      showToast(
        data.matchedCount > 0
          ? `USB-Stick "${data.volumeName}" erkannt: ${data.matchedCount} OTDR-Messung(en) automatisch zugeordnet.`
          : `USB-Stick "${data.volumeName}" erkannt, aber keine passenden Job-IDs gefunden.`
      );
    });
    return () => {
      unsubscribeUsb?.();
      unsubscribeUpdate?.();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.themeMode);
    document.documentElement.style.setProperty('--color-primary', settings.accentColor);
    document.documentElement.style.setProperty('--color-primary-hover', darkenHex(settings.accentColor, 0.15));
  }, [settings.themeMode, settings.accentColor]);

  const handleSelectProject = async (projectId: string) => {
    if (!window.api?.setActiveProject) return;
    setLoading(true);
    try {
      const res = await window.api.setActiveProject(projectId);
      if (res.success) {
        setCustomers(res.customers);
        setActiveProject(res.project);
        setView('project');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (data: Partial<Project>) => {
    if (!window.api?.createProject) return;
    const newProj = await window.api.createProject(data);
    await loadProjects();
    await handleSelectProject(newProj.id);
  };

  const handleUpdateProject = async (proj: Project) => {
    if (!window.api?.updateProject) return;
    await window.api.updateProject(proj);
    await loadProjects();
    if (activeProject?.id === proj.id) {
      setActiveProject(proj);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.api?.deleteProject) return;
    await window.api.deleteProject(id);
    await loadProjects();
  };

  const handleWizardFinish = async (newSettings: AppSettings) => {
    if (window.api?.saveAppSettings) {
      const ok = await window.api.saveAppSettings(newSettings);
      if (!ok) {
        alert('Einstellungen konnten nicht gespeichert werden (Schreibfehler). Bitte erneut versuchen.');
        return;
      }
    }
    if (window.api?.saveSettingPreset && newSettings.companyName.trim()) {
      await window.api.saveSettingPreset(newSettings.companyName.trim(), newSettings);
    }
    setSettings(newSettings);
    setShowWizard(false);
  };

  const handleImportExcel = async () => {
    if (!window.api?.importCustomerFile) return;
    setLoading(true);
    try {
      const res = await window.api.importCustomerFile();
      if (res.success && res.customers) {
        setCustomers(res.customers);
        await loadProjects();
        showToast(
          res.warning
            ? `${res.count} Kunden importiert. Hinweis: ${res.warning}`
            : `${res.count} Kunden erfolgreich aus SharePoint Excel importiert.`
        );
      } else if (!res.canceled && res.error) {
        alert(`Fehler beim Import: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Import fehlgeschlagen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScanUsb = async () => {
    if (!window.api?.chooseUsbFolder) return;
    setLoading(true);
    try {
      const res = await window.api.chooseUsbFolder();
      if (res.success && res.customers) {
        setCustomers(res.customers);
        await loadProjects();
        if (res.matchedCount && res.matchedCount > 0) {
          showToast(`${res.matchedCount} OTDR-Messungen (.sor) automatisch den Job-IDs zugeordnet.`);
        } else {
          showToast(`Keine passenden Job-IDs im ausgewählten Ordner gefunden.`);
        }
      } else if (!res.canceled && res.error) {
        alert(`Fehler beim Scannen: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Scan fehlgeschlagen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchExport = async () => {
    if (!window.api?.batchExportPdfs) return;
    const readyCustomers = customers.filter(c => c.status === 'matched' || c.status === 'exported');
    if (readyCustomers.length === 0) {
      alert('Es sind noch keine gemessenen Kunden mit passenden .sor-Dateien vorhanden. Bitte zuerst den USB-Stick scannen.');
      return;
    }

    setLoading(true);
    try {
      const res = await window.api.batchExportPdfs(readyCustomers.map(c => c.id), settings);
      if (res.success) {
        showToast(`${res.count} DIN EN 50346 Protokolle erfolgreich exportiert. Zielordner geöffnet.`);
        await loadData();
      } else {
        alert(`Fehler beim Batch-Export: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Export fehlgeschlagen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSinglePdf = async (customer: CustomerItem) => {
    if (!window.api?.generatePdfProtocol) return;
    try {
      const res = await window.api.generatePdfProtocol(customer, settings, true);
      if (res.success) {
        showToast(`PDF für ${customer.customOverrides?.customerName || customer.customerName} (Job #${customer.id}) geöffnet.`);
        await loadData();
      } else {
        alert(`Fehler beim Erstellen des PDFs: ${res.error}`);
      }
    } catch (err: any) {
      alert(`PDF-Erstellung fehlgeschlagen: ${err.message}`);
    }
  };

  const handleSaveCustomerOverride = async (updated: CustomerItem) => {
    if (window.api?.updateCustomer) {
      const ok = await window.api.updateCustomer(updated);
      if (!ok) {
        alert('Änderungen konnten nicht gespeichert werden (Schreibfehler). Bitte erneut versuchen.');
        return;
      }
      await loadData();
      setSelectedCustomer(updated);
      showToast('Änderungen gespeichert.');
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    if (window.api?.saveAppSettings) {
      const ok = await window.api.saveAppSettings(newSettings);
      if (!ok) {
        alert('Einstellungen konnten nicht gespeichert werden (Schreibfehler). Bitte erneut versuchen.');
        return;
      }
      if (window.api?.saveSettingPreset && newSettings.companyName.trim()) {
        await window.api.saveSettingPreset(newSettings.companyName.trim(), newSettings);
      }
      setSettings(newSettings);
      setShowSettings(false);
      showToast('Einstellungen gespeichert.');
    }
  };

  // Filter & Search Logic
  const filteredCustomers = customers.filter(c => {
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'matched' && (c.status === 'matched' || c.status === 'exported')) ||
      (filterStatus === 'pending' && c.status === 'pending') ||
      (filterStatus === 'exported' && c.status === 'exported');

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus;

    const matchesQuery =
      String(c.id).includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      c.street.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      (c.orderId && c.orderId.toLowerCase().includes(q)) ||
      (c.sorFileName && c.sorFileName.toLowerCase().includes(q));

    return matchesStatus && matchesQuery;
  });

  const totalCount = customers.length;
  const matchedCount = customers.filter(c => c.status === 'matched' || c.status === 'exported').length;
  const exportedCount = customers.filter(c => c.status === 'exported').length;
  const pendingCount = customers.filter(c => c.status === 'pending').length;

  return (
    <div style={styles.layout}>
      {/* NAVBAR */}
      <header style={styles.navbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={styles.brandLogo}>OTDR STUDIO</div>
          {view === 'project' && (
            <button
              style={styles.btnBack}
              onClick={() => {
                loadProjects();
                setView('dashboard');
              }}
            >
              ← Alle Ausbaugebiete
            </button>
          )}
          {view === 'project' && activeProject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={styles.activeProjectBadge}>
                📍 {activeProject.name}
              </span>
              {activeProject.sharepointPath && (
                <span style={styles.sharepointBadge} title={activeProject.sharepointPath}>
                  📂 SharePoint Ingest
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button style={styles.btnSecondary} onClick={() => setShowWizard(true)}>
            Setup-Assistent
          </button>
          <button style={styles.btnSecondary} onClick={() => setShowSettings(true)}>
            Einstellungen &amp; Vorlage
          </button>
        </div>
      </header>

      {/* UPDATE BANNER */}
      {updateInfo && (
        <div style={styles.updateBanner}>
          <span>
            {updateState?.phase === 'downloading'
              ? `Version ${updateState.version || updateInfo.latestVersion} wird geladen … ${updateState.percent ?? 0} %`
              : updateState?.phase === 'downloaded'
              ? `Version ${updateState.version || updateInfo.latestVersion} ist bereit zur Installation.`
              : updateState?.phase === 'error'
              ? `Update fehlgeschlagen: ${updateState.message || 'unbekannter Fehler'}`
              : `Neue Version ${updateInfo.latestVersion} von OTDR Studio ist verfügbar.`}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {updateState?.phase === 'downloading' && (
              <div style={styles.updateProgressTrack} aria-label="Download-Fortschritt">
                <div style={{ ...styles.updateProgressBar, width: `${updateState.percent ?? 0}%` }} />
              </div>
            )}

            {updateInfo.canSelfUpdate && updateState?.phase === 'downloaded' ? (
              <button style={styles.btnUpdateAction} onClick={() => window.api?.updaterInstall?.()}>
                Neu starten &amp; installieren
              </button>
            ) : updateInfo.canSelfUpdate && updateState?.phase !== 'downloading' ? (
              <button style={styles.btnUpdateAction} onClick={() => window.api?.updaterDownload?.()}>
                Jetzt aktualisieren
              </button>
            ) : !updateInfo.canSelfUpdate ? (
              <button
                style={styles.btnUpdateAction}
                onClick={() => updateInfo.url && window.api?.openExternal?.(updateInfo.url)}
              >
                Herunterladen
              </button>
            ) : null}

            <button style={styles.btnUpdateDismiss} onClick={() => setUpdateInfo(null)} aria-label="Schließen">✕</button>
          </div>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div style={styles.toast}>
          {toastMessage}
        </div>
      )}

      {/* MAIN VIEW CONTENT */}
      {view === 'dashboard' ? (
        <ProjectDashboard
          projects={projects}
          activeProjectId={activeProject?.id || ''}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onOpenSettings={() => setShowSettings(true)}
          accentColor={settings.accentColor}
        />
      ) : (
        <>
          {/* STATS BANNER */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <span style={styles.statTitle}>Kundenliste (SharePoint)</span>
              <span style={styles.statNum}>{totalCount}</span>
            </div>
            <div style={{ ...styles.statCard, borderColor: 'rgba(34, 197, 94, 0.3)', backgroundColor: 'rgba(34, 197, 94, 0.05)' }}>
              <span style={{ ...styles.statTitle, color: '#22c55e' }}>OTDR gemessen (.sor)</span>
              <span style={{ ...styles.statNum, color: '#22c55e' }}>{matchedCount}</span>
            </div>
            <div style={{ ...styles.statCard, borderColor: 'rgba(168, 85, 247, 0.3)', backgroundColor: 'rgba(168, 85, 247, 0.05)' }}>
              <span style={{ ...styles.statTitle, color: '#a855f7' }}>PDFs exportiert</span>
              <span style={{ ...styles.statNum, color: '#a855f7' }}>{exportedCount}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statTitle}>Offene Messungen</span>
              <span style={styles.statNum}>{pendingCount}</span>
            </div>
          </div>

          {/* ACTION BAR */}
          <div style={styles.actionBar}>
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                style={{ ...styles.btnPrimary, backgroundColor: 'var(--color-primary)' }}
                onClick={handleImportExcel}
                disabled={loading}
              >
                📥 Kundenliste importieren (.xlsx / .csv)
              </button>
              <button
                style={{ ...styles.btnPrimary, backgroundColor: '#059669' }}
                onClick={handleScanUsb}
                disabled={loading}
              >
                🔌 USB / Messordner einlesen (.sor)
              </button>
              <button
                style={{ ...styles.btnPrimary, backgroundColor: '#7c3aed' }}
                onClick={handleBatchExport}
                disabled={loading || matchedCount === 0}
              >
                📑 Stapel-Export ({matchedCount} PDFs)
              </button>
            </div>

            {/* SEARCH & FILTER */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Suche nach Name, Adresse, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              <div style={styles.tabContainer}>
                <button
                  style={{ ...styles.tabBtn, ...(filterStatus === 'all' ? styles.tabBtnActive : {}) }}
                  onClick={() => setFilterStatus('all')}
                >
                  Alle ({totalCount})
                </button>
                <button
                  style={{ ...styles.tabBtn, ...(filterStatus === 'matched' ? styles.tabBtnActive : {}) }}
                  onClick={() => setFilterStatus('matched')}
                >
                  Bereit ({matchedCount})
                </button>
                <button
                  style={{ ...styles.tabBtn, ...(filterStatus === 'pending' ? styles.tabBtnActive : {}) }}
                  onClick={() => setFilterStatus('pending')}
                >
                  Offen ({pendingCount})
                </button>
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <main style={styles.mainContent}>
            <CustomerTable 
              customers={filteredCustomers}
              onSelectCustomer={(c) => setSelectedCustomer(c)}
              onGeneratePdf={(c) => handleGenerateSinglePdf(c)}
            />
          </main>
        </>
      )}

      {/* PREVIEW & EDIT MODAL */}
      {selectedCustomer && (
        <ProtocolPreviewModal 
          customer={selectedCustomer}
          settings={settings}
          onClose={() => setSelectedCustomer(null)}
          onSaveOverride={handleSaveCustomerOverride}
          onGeneratePdf={handleGenerateSinglePdf}
        />
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      )}

      {/* SETUP WIZARD (first run, or reopened via navbar) */}
      {showWizard && (
        <SetupWizard initialSettings={settings} onFinish={handleWizardFinish} />
      )}
    </div>
  );
}

function darkenHex(hex: string, amount: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const num = parseInt(match[1], 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-primary)',
    overflow: 'hidden',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.85rem 1.5rem',
    backgroundColor: 'var(--color-bg-surface)',
    borderBottom: '1px solid var(--color-border)',
  },
  brandLogo: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '0.8rem',
    padding: '0.35rem 0.65rem',
    borderRadius: '4px',
    letterSpacing: '0.06em',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  btnBack: {
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '0.4rem 0.75rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  activeProjectBadge: {
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '0.35rem 0.65rem',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  sharepointBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#16a34a',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '4px',
    padding: '0.35rem 0.65rem',
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '0.45rem 0.85rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
    padding: '0.9rem 1.5rem',
  },
  statCard: {
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  statTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  statNum: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: 'var(--color-text-primary)',
    lineHeight: 1.1,
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 1.5rem 0.9rem 1.5rem',
    flexWrap: 'wrap',
    gap: '0.8rem',
  },
  btnPrimary: {
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '0.5rem 0.9rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
  },
  tabContainer: {
    display: 'flex',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  tabBtn: {
    padding: '0.45rem 0.8rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--color-text-secondary)',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabBtnActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
  },
  searchInput: {
    padding: '0.5rem 0.8rem',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: '4px',
    fontSize: '0.8rem',
    width: '240px',
  },
  toast: {
    margin: '0 1.5rem 0.8rem 1.5rem',
    padding: '0.55rem 1rem',
    backgroundColor: 'var(--color-primary)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 600,
    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
  },
  updateBanner: {
    margin: '0 1.5rem 0.8rem 1.5rem',
    padding: '0.55rem 1rem',
    backgroundColor: 'var(--color-bg-surface-elevated)',
    border: '1px solid var(--color-primary)',
    color: 'var(--color-text-primary)',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 600,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.75rem',
  },
  updateProgressTrack: {
    width: '120px',
    height: '5px',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  updateProgressBar: {
    height: '100%',
    backgroundColor: 'var(--color-primary)',
    transition: 'width 0.2s linear',
  },
  btnUpdateAction: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnUpdateDismiss: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-secondary)',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  mainContent: {
    flex: 1,
    margin: '0 1.5rem 1.5rem 1.5rem',
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
};
