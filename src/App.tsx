import { useState, useEffect, useRef } from 'react';
import type { CustomerItem, AppSettings, Project, Ausbaugebiet, KVZ } from './types';
import { CustomerTable } from './components/CustomerTable';
import { ProtocolPreviewModal } from './components/ProtocolPreviewModal';
import { SettingsModal } from './components/SettingsModal';
import { SetupWizard } from './components/SetupWizard';
import { LevelDashboard, type LevelLabels } from './components/LevelDashboard';
import { PopMeasurementsPanel } from './components/PopMeasurementsPanel';

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

type View = 'projects' | 'ausbaugebiete' | 'kvzs' | 'customers';

const PROJECT_LABELS: LevelLabels = {
  one: 'Projekt',
  newOne: 'Neues Projekt',
  title: 'Projekte',
  subtitle: 'Wähle ein Projekt. Darunter liegen Ausbaugebiete, KVZs und die Kundenlisten.',
  namePlaceholder: 'z. B. Musterstadt',
  clusterLabel: 'Cluster',
  clusterPlaceholder: 'z. B. Cluster Nord',
  folderHelp: 'Synchronisierter SharePoint-Ordner des Projekts. Fertige PDFs landen dort unter <Job-ID>/Messungen/. Ein bestehender Kundenordner wie „145_Mustermann“ wird automatisch verwendet.',
};

const AUSBAUGEBIET_LABELS: LevelLabels = {
  one: 'Ausbaugebiet',
  newOne: 'Neues Ausbaugebiet',
  title: 'Ausbaugebiete',
  subtitle: 'Wähle ein Ausbaugebiet, um seine KVZs zu sehen.',
  namePlaceholder: 'z. B. Musterdorf',
  clusterLabel: 'Beschreibung',
  clusterPlaceholder: 'z. B. Bauabschnitt 2',
  folderHelp: 'Nur ausfüllen, wenn dieses Ausbaugebiet einen eigenen SharePoint-Ordner hat. Sonst gilt der Ordner des Projekts.',
};

const KVZ_LABELS: LevelLabels = {
  one: 'KVZ',
  newOne: 'Neuen KVZ',
  title: 'KVZs',
  subtitle: 'Wähle einen KVZ, um Kundenliste, Messungen und Protokolle zu bearbeiten.',
  namePlaceholder: 'z. B. KVZ 1',
  clusterLabel: 'Beschreibung',
  clusterPlaceholder: 'z. B. NVt 01 bis 08',
  folderHelp: 'Nur ausfüllen, wenn dieser KVZ einen eigenen SharePoint-Ordner hat. Sonst gilt der Ordner des Ausbaugebiets bzw. Projekts.',
};

export function App() {
  const [view, setView] = useState<View>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [ausbaugebiete, setAusbaugebiete] = useState<Ausbaugebiet[]>([]);
  const [activeAusbaugebiet, setActiveAusbaugebiet] = useState<Ausbaugebiet | null>(null);
  const [kvzs, setKvzs] = useState<KVZ[]>([]);
  const [activeKvz, setActiveKvz] = useState<KVZ | null>(null);

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'matched' | 'pending' | 'exported'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [scanReport, setScanReport] = useState<{ errors: string[]; unmatched: string[] } | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{ latestVersion?: string; url?: string; canSelfUpdate?: boolean } | null>(null);
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewRef = useRef<View>(view);
  viewRef.current = view;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(''), 4500);
  };

  const loadProjects = async () => {
    if (window.api?.getProjects) setProjects(await window.api.getProjects());
    if (window.api?.getActiveProject) setActiveProject(await window.api.getActiveProject());
  };

  const loadAusbaugebiete = async (projId: string) => {
    if (window.api?.getAusbaugebiete) setAusbaugebiete(await window.api.getAusbaugebiete(projId));
  };

  const loadKvzs = async (agId: string) => {
    if (window.api?.getKVZs) setKvzs(await window.api.getKVZs(agId));
  };

  const reloadCustomers = async () => {
    if (window.api?.getCustomers) setCustomers(await window.api.getCustomers());
  };

  useEffect(() => {
    loadProjects();
    window.api?.getAppSettings?.().then((s) => {
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
    });

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

    // The main process only scans a new stick while a KVZ is open.
    const unsubscribeUsb = window.api?.onUsbDetected?.((data) => {
      if (viewRef.current !== 'customers') return;
      setCustomers(data.customers);
      reportScan(data.errors, data.unmatched);
      showToast(
        data.matchedCount > 0
          ? `USB-Stick "${data.volumeName}" erkannt: ${data.matchedCount} Kunden eine OTDR-Messung zugeordnet.`
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

  const reportScan = (errors: string[] = [], unmatched: string[] = []) => {
    setScanReport(errors.length > 0 || unmatched.length > 0 ? { errors, unmatched } : null);
  };

  // Navigation
  const goProjects = async () => {
    await window.api?.closeKvz?.();
    setActiveKvz(null);
    setSelectedCustomer(null);
    await loadProjects();
    setView('projects');
  };

  const openProject = async (id: string) => {
    const res = await window.api?.setActiveProject?.(id);
    if (res?.success && res.project) {
      setActiveProject(res.project);
      setActiveAusbaugebiet(null);
      setActiveKvz(null);
      await loadAusbaugebiete(id);
      setView('ausbaugebiete');
    }
  };

  const goAusbaugebiete = async () => {
    if (!activeProject) return goProjects();
    await window.api?.closeKvz?.();
    setActiveKvz(null);
    setSelectedCustomer(null);
    await loadAusbaugebiete(activeProject.id);
    setView('ausbaugebiete');
  };

  const openAusbaugebiet = async (id: string) => {
    const ag = ausbaugebiete.find(a => a.id === id);
    if (!ag) return;
    setActiveAusbaugebiet(ag);
    setActiveKvz(null);
    await loadKvzs(id);
    setView('kvzs');
  };

  const goKvzs = async () => {
    if (!activeAusbaugebiet) return goAusbaugebiete();
    await window.api?.closeKvz?.();
    setActiveKvz(null);
    setSelectedCustomer(null);
    await loadKvzs(activeAusbaugebiet.id);
    setView('kvzs');
  };

  const openKvz = async (id: string) => {
    const res = await window.api?.openKvz?.(id);
    if (!res?.success || !res.kvz) {
      alert('Der KVZ konnte nicht geöffnet werden.');
      return;
    }
    setActiveKvz(res.kvz);
    setCustomers(res.customers);
    setSearchQuery('');
    setFilterStatus('all');
    setScanReport(null);
    setView('customers');
  };

  const goBack = () => {
    if (view === 'customers') return goKvzs();
    if (view === 'kvzs') return goAusbaugebiete();
    if (view === 'ausbaugebiete') return goProjects();
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
    setIsImportingExcel(true);
    try {
      const res = await window.api.importCustomerFile();
      if (res.success && res.customers) {
        setCustomers(res.customers);
        showToast(
          res.warning
            ? `${res.count} Kunden importiert. Hinweis: ${res.warning}`
            : `${res.count} Kunden erfolgreich importiert.`
        );
      } else if (!res.canceled && res.error) {
        alert(`Fehler beim Import: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Import fehlgeschlagen: ${err.message}`);
    } finally {
      setLoading(false);
      setIsImportingExcel(false);
    }
  };

  const handleScanUsb = async () => {
    if (!window.api?.chooseUsbFolder) return;
    setLoading(true);
    try {
      const res = await window.api.chooseUsbFolder();
      if (res.success && res.customers) {
        setCustomers(res.customers);
        reportScan(res.errors, res.unmatched);
        if (res.matchedCount && res.matchedCount > 0) {
          showToast(`${res.matchedCount} Kunden eine OTDR-Messung (.sor) zugeordnet.`);
        } else {
          showToast('Keine passenden Job-IDs im ausgewählten Ordner gefunden.');
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
      await reloadCustomers();
      if (res.success) {
        showToast(`${res.count} DIN EN 50346 Protokolle exportiert. Zielordner geöffnet.`);
        if (res.error) alert(`Einige Protokolle konnten nicht erstellt werden:\n\n${res.error.split('; ').join('\n\n')}`);
      } else {
        alert(`Fehler beim Stapel-Export:\n\n${(res.error || 'unbekannter Fehler').split('; ').join('\n\n')}`);
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
        await reloadCustomers();
        setSelectedCustomer(prev => (prev && prev.id === customer.id ? { ...prev, status: 'exported' } : prev));
      } else {
        alert(`Fehler beim Erstellen des PDFs:\n${res.error}`);
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
      await reloadCustomers();
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

    const name = c.customOverrides?.customerName || c.customerName || '';
    const street = c.customOverrides?.street || c.street || '';
    const city = c.customOverrides?.city || c.city || '';
    const matchesQuery =
      String(c.id).includes(q) ||
      name.toLowerCase().includes(q) ||
      street.toLowerCase().includes(q) ||
      city.toLowerCase().includes(q) ||
      (c.orderId && c.orderId.toLowerCase().includes(q)) ||
      (c.sorFileName && c.sorFileName.toLowerCase().includes(q));

    return matchesStatus && matchesQuery;
  });

  const totalCount = customers.length;
  const matchedCount = customers.filter(c => c.status === 'matched' || c.status === 'exported').length;
  const exportedCount = customers.filter(c => c.status === 'exported').length;
  const pendingCount = customers.filter(c => c.status === 'pending').length;

  const crumbs: { label: string; onClick?: () => void }[] = [{ label: 'Projekte', onClick: view !== 'projects' ? goProjects : undefined }];
  if (view !== 'projects' && activeProject) crumbs.push({ label: activeProject.name, onClick: view !== 'ausbaugebiete' ? goAusbaugebiete : undefined });
  if ((view === 'kvzs' || view === 'customers') && activeAusbaugebiet) crumbs.push({ label: activeAusbaugebiet.name, onClick: view !== 'kvzs' ? goKvzs : undefined });
  if (view === 'customers' && activeKvz) crumbs.push({ label: activeKvz.name });

  return (
    <div style={styles.layout}>
      {/* NAVBAR */}
      <header style={styles.navbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
          <div style={styles.brandLogo}>OTDR STUDIO</div>
          {view !== 'projects' && (
            <button style={styles.btnBack} onClick={goBack}>← Zurück</button>
          )}
          <nav aria-label="Navigationspfad" style={styles.breadcrumbs}>
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                {i > 0 && <span style={{ color: 'var(--color-text-muted)' }}>›</span>}
                {c.onClick ? (
                  <button style={styles.crumbLink} onClick={c.onClick}>{c.label}</button>
                ) : (
                  <span style={styles.crumbCurrent}>{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button style={styles.btnSecondary} onClick={() => setShowWizard(true)}>
            Setup-Assistent
          </button>
          <button style={styles.btnSecondary} onClick={() => setShowSettings(true)} title="Einstellungen & Protokoll-Vorlage">
            ⚙︎ Einstellungen
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
      {view === 'projects' ? (
        <LevelDashboard
          labels={PROJECT_LABELS}
          items={projects}
          activeId={activeProject?.id}
          keepLast
          onOpen={openProject}
          onCreate={async (data) => {
            await window.api?.createProject?.(data);
            await loadProjects();
          }}
          onUpdate={async (p) => {
            await window.api?.updateProject?.(p);
            await loadProjects();
          }}
          onDelete={async (id) => {
            const ok = await window.api?.deleteProject?.(id);
            if (ok === false) alert('Das letzte Projekt kann nicht gelöscht werden.');
            await loadProjects();
          }}
          accentColor={settings.accentColor}
        />
      ) : view === 'ausbaugebiete' && activeProject ? (
        <LevelDashboard
          labels={AUSBAUGEBIET_LABELS}
          items={ausbaugebiete}
          activeId={activeAusbaugebiet?.id}
          onOpen={openAusbaugebiet}
          onCreate={async (data) => {
            await window.api?.createAusbaugebiet?.(activeProject.id, data);
            await loadAusbaugebiete(activeProject.id);
          }}
          onUpdate={async (a) => {
            const saved = await window.api?.updateAusbaugebiet?.(a);
            if (saved && activeAusbaugebiet?.id === saved.id) setActiveAusbaugebiet(saved);
            await loadAusbaugebiete(activeProject.id);
          }}
          onDelete={async (id) => {
            await window.api?.deleteAusbaugebiet?.(id);
            if (activeAusbaugebiet?.id === id) setActiveAusbaugebiet(null);
            await loadAusbaugebiete(activeProject.id);
          }}
          accentColor={settings.accentColor}
        />
      ) : view === 'kvzs' && activeAusbaugebiet ? (
        <LevelDashboard
          labels={KVZ_LABELS}
          items={kvzs}
          activeId={activeKvz?.id}
          onOpen={openKvz}
          onCreate={async (data) => {
            await window.api?.createKVZ?.(activeAusbaugebiet.id, data);
            await loadKvzs(activeAusbaugebiet.id);
          }}
          onUpdate={async (k) => {
            await window.api?.updateKVZ?.(k);
            await loadKvzs(activeAusbaugebiet.id);
          }}
          onDelete={async (id) => {
            await window.api?.deleteKVZ?.(id);
            await loadKvzs(activeAusbaugebiet.id);
          }}
          accentColor={settings.accentColor}
        />
      ) : view === 'customers' && activeKvz ? (
        <>
          {/* STATS BANNER */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <span style={styles.statTitle}>Kunden im KVZ</span>
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
                {isImportingExcel ? '⏳ Lese Excel... Bitte warten' : '📥 Kundenliste importieren (.xlsx / .csv)'}
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

          {scanReport && (
            <div style={styles.scanReport} role="status">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Hinweise zum letzten Scan</strong>
                <button style={styles.btnUpdateDismiss} onClick={() => setScanReport(null)} aria-label="Hinweise schließen">✕</button>
              </div>
              {scanReport.errors.length > 0 && (
                <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                  {scanReport.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
              {scanReport.unmatched.length > 0 && (
                <details style={{ marginTop: '0.35rem' }}>
                  <summary>{scanReport.unmatched.length} .sor-Datei(en) keinem Kunden dieses KVZ zugeordnet</summary>
                  <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                    {scanReport.unmatched.map((u, i) => <li key={i}>{u}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}

          <PopMeasurementsPanel kvz={activeKvz} onKvzChanged={setActiveKvz} onToast={showToast} />

          {/* TABLE CONTAINER */}
          <main style={styles.mainContent}>
            <CustomerTable 
              customers={filteredCustomers}
              onSelectCustomer={(c) => setSelectedCustomer(c)}
              onGeneratePdf={(c) => handleGenerateSinglePdf(c)}
            />
          </main>
        </>
      ) : null}

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
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.8rem',
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  crumbLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    color: 'var(--color-text-secondary)',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
  },
  crumbCurrent: {
    color: 'var(--color-text-primary)',
    fontWeight: 700,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  scanReport: {
    margin: '0 1.5rem 0.8rem 1.5rem',
    padding: '0.55rem 1rem',
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    border: '1px solid rgba(234, 179, 8, 0.4)',
    color: 'var(--color-text-primary)',
    borderRadius: '4px',
    fontSize: '0.78rem',
    maxHeight: '160px',
    overflowY: 'auto',
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
