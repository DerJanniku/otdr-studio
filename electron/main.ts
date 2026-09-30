import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { CustomerStore, type AppSettings, type CustomerItem } from './CustomerStore';
import { SorMatcher } from './SorMatcher';
import { parseSor } from 'sor-reader';
import { PdfExporter } from './PdfExporter';
import { UsbWatcher } from './UsbWatcher';
import { Updater } from './Updater';

app.setName('OTDR Studio');

// File/folder names from customer data: keep umlauts, drop characters Windows/SharePoint reject.
function protocolFileName(customer: CustomerItem): string {
  const name = customer.customOverrides?.customerName || customer.customerName;
  return `MTS2000_DIN_Protokoll_Job${String(customer.id).padStart(3, '0')}_${safeName(name)}.pdf`;
}

// SharePoint layout: <Ordner>/<Job-ID>/Messungen. An existing folder that starts with the job id
// ("145_Mustermann") is reused, so PDFs land next to the customer's other documents.
function customerFolder(root: string, customer: CustomerItem): string {
  const id = String(customer.id);
  let folder = id;
  try {
    const existing = fs.readdirSync(root, { withFileTypes: true })
      .find(d => d.isDirectory() && (d.name === id || new RegExp(`^0*${id}(?:[\\s_-]|$)`).test(d.name)));
    if (existing) folder = existing.name;
  } catch {}
  return path.join(root, folder, 'Messungen');
}

function safeName(value: string): string {
  // oxlint-disable-next-line no-control-regex
  return String(value || '').replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_').replace(/\s+/g, '_').replace(/^[._]+|[._]+$/g, '').slice(0, 80) || 'unbenannt';
}

let mainWindow: BrowserWindow | null = null;
const customerStore = new CustomerStore();

// Copies each newly matched job's raw .sor file(s) into a local archive folder and
// repoints sorFilePath at that copy, so the USB stick can be wiped/reused for the
// next site without losing the original measurement file.
function archiveRawSorFiles(customers: CustomerItem[], matchedIds: number[]) {
  const archiveRoot = path.join(app.getPath('documents'), 'OTDR_Protokolle', 'Rohdaten');
  for (const id of matchedIds) {
    const customer = customers.find(c => c.id === id);
    if (!customer?.sorFilePath || !fs.existsSync(customer.sorFilePath)) continue;
    try {
      const jobDir = path.join(archiveRoot, `Job_${String(id).padStart(3, '0')}`);
      fs.mkdirSync(jobDir, { recursive: true });
      const destPath = path.join(jobDir, path.basename(customer.sorFilePath));
      fs.copyFileSync(customer.sorFilePath, destPath);
      customer.sorFilePath = destPath;
    } catch (err) {
      console.error(`Failed to archive raw SOR file for job ${id}:`, err);
    }
  }
}

// Scans a folder against the customers of the opened KVZ and persists the matches.
function scanFolder(folderPath: string) {
  const scanRes = SorMatcher.scanAndMatch(folderPath, customerStore.getCustomers());
  archiveRawSorFiles(scanRes.updatedCustomers, scanRes.matchedIds);
  customerStore.saveCustomers(scanRes.updatedCustomers);
  return {
    success: true,
    folderPath,
    matchedCount: scanRes.matchedCount,
    matchedIds: scanRes.matchedIds,
    errors: scanRes.errors,
    unmatched: scanRes.unmatched,
    customers: customerStore.getCustomers(),
  };
}

const NO_KVZ_ERROR = 'Bitte zuerst einen KVZ öffnen - Kundenlisten und Messungen gehören immer zu einem KVZ.';

const usbWatcher = new UsbWatcher((volumePath, volumeName) => {
  // Without an opened KVZ there is no customer list to match against.
  if (!customerStore.getActiveKvzId()) return;
  const res = scanFolder(volumePath);
  mainWindow?.webContents.send('usb-scan-result', { volumeName, ...res });
});

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'OTDR Studio',
    backgroundColor: '#0a0a0a',
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  Updater.init(() => mainWindow);
  usbWatcher.start();

  // IPC Handlers
  
  ipcMain.handle('get-ausbaugebiete', (_e, projectId: string) => customerStore.getAusbaugebiete(projectId));
  ipcMain.handle('create-ausbaugebiet', (_e, projectId: string, data) => customerStore.createAusbaugebiet(projectId, data || {}));
  ipcMain.handle('update-ausbaugebiet', (_e, a) => customerStore.updateAusbaugebiet(a));
  ipcMain.handle('delete-ausbaugebiet', (_e, id: string) => customerStore.deleteAusbaugebiet(id));
  ipcMain.handle('get-kvzs', (_e, ausbaugebietId: string) => customerStore.getKVZs(ausbaugebietId));
  ipcMain.handle('create-kvz', (_e, ausbaugebietId: string, data) => customerStore.createKVZ(ausbaugebietId, data || {}));
  ipcMain.handle('update-kvz', (_e, k) => customerStore.updateKVZ(k));
  ipcMain.handle('delete-kvz', (_e, id: string) => customerStore.deleteKVZ(id));
  ipcMain.handle('open-kvz', (_e, kvzId: string) => customerStore.openKvz(kvzId));
  ipcMain.handle('close-kvz', () => customerStore.closeKvz());

  // POP -> KVZ feeder measurements live on the KVZ and get their own protocol.
  ipcMain.handle('add-pop-measurement', async (_e, kvzId: string, fiberName: string) => {
    if (!mainWindow) return { success: false, error: 'No window' };
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Zuleitungsmessung POP → KVZ auswählen (.sor)',
      properties: ['openFile'],
      filters: [{ name: 'SOR Dateien', extensions: ['sor'] }],
    });
    if (res.canceled || !res.filePaths[0]) return { success: false, canceled: true };
    try {
      const srcPath = res.filePaths[0];
      const parsed = parseSor(new Uint8Array(fs.readFileSync(srcPath)));
      const pmId = `pm_${Date.now()}`;
      const archiveDir = path.join(app.getPath('documents'), 'OTDR_Protokolle', 'Rohdaten', 'Zuleitungen', kvzId);
      fs.mkdirSync(archiveDir, { recursive: true });
      const archived = path.join(archiveDir, `${pmId}_${path.basename(srcPath)}`);
      fs.copyFileSync(srcPath, archived);
      const kvz = customerStore.addPopMeasurement(kvzId, {
        id: pmId,
        fiberName: String(fiberName || '').trim() || path.basename(srcPath, '.sor'),
        sorFileName: path.basename(srcPath),
        sorFilePath: archived,
        sorData: SorMatcher.formatParsedSor(parsed),
        measuredAt: SorMatcher.plausibleDate(parsed.FxdParams?.['date/time']),
        technicianName: parsed.GenParams?.operator || undefined,
      });
      if (!kvz) return { success: false, error: 'KVZ nicht gefunden.' };
      return { success: true, kvz };
    } catch (err: any) {
      return { success: false, error: `SOR-Datei konnte nicht gelesen werden: ${err.message}` };
    }
  });

  ipcMain.handle('delete-pop-measurement', (_e, kvzId: string, pmId: string) => customerStore.deletePopMeasurement(kvzId, pmId));

  ipcMain.handle('generate-kvz-pdf', async (_e, kvzId: string, pmId: string) => {
    try {
      const kvz = customerStore.getKVZ(kvzId);
      if (!kvz) return { success: false, error: 'KVZ nicht gefunden.' };
      const pm = kvz.popMeasurements?.find(p => p.id === pmId);
      if (!pm?.sorData) return { success: false, error: 'Für diese Zuleitung liegt keine Messung vor.' };

      const pseudoCustomer: CustomerItem = {
        id: 0,
        customerName: `Zuleitung POP ➔ ${kvz.name}`,
        street: pm.fiberName,
        city: customerStore.getActiveProject()?.name || '',
        segment: `POP ➔ ${kvz.name} (${pm.fiberName})`,
        cableId: pm.fiberName,
        fiberNumber: 1,
        orderId: '',
        status: 'matched',
        sorFileName: pm.sorFileName,
        sorFilePath: pm.sorFilePath,
        sorData: pm.sorData,
        measuredAt: pm.measuredAt,
        technicianName: pm.technicianName,
      };

      const root = customerStore.resolveDeliveryRoot(kvzId);
      const deliveryDir = root
        ? path.join(root, safeName(kvz.name), 'Zuleitungen')
        : path.join(app.getPath('documents'), 'OTDR_Protokolle', 'Zuleitungen', safeName(kvz.name));
      fs.mkdirSync(deliveryDir, { recursive: true });
      const targetPath = path.join(deliveryDir, `MTS2000_DIN_Protokoll_POP_${safeName(kvz.name)}_${safeName(pm.fiberName)}.pdf`);

      await PdfExporter.generateSinglePdf(pseudoCustomer, customerStore.getSettings(), targetPath);
      customerStore.updatePopMeasurement(kvzId, pmId, { pdfPath: targetPath });
      await shell.openPath(targetPath);
      return { success: true, pdfPath: targetPath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('get-customers', async () => {
    return customerStore.getCustomers();
  });

  ipcMain.handle('save-customers', async (_e, customers) => {
    return customerStore.saveCustomers(customers);
  });

  ipcMain.handle('update-customer', async (_e, customer) => {
    return customerStore.updateCustomer(customer);
  });

  ipcMain.handle('import-customer-file', async () => {
    if (!mainWindow) return { success: false, error: 'No window' };
    if (!customerStore.getActiveKvzId()) return { success: false, error: NO_KVZ_ERROR };
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'SharePoint Kundenliste importieren (Excel / CSV)',
      filters: [{ name: 'Excel / CSV', extensions: ['xlsx', 'csv'] }],
      properties: ['openFile'],
    });

    if (res.canceled || !res.filePaths[0]) {
      return { success: false, canceled: true };
    }

    const filePath = res.filePaths[0];
    const importRes = await customerStore.importExcelFile(filePath);
    return { ...importRes, filePath, customers: customerStore.getCustomers() };
  });

  ipcMain.handle('choose-usb-folder', async () => {
    if (!mainWindow) return { success: false, error: 'No window' };
    if (!customerStore.getActiveKvzId()) return { success: false, error: NO_KVZ_ERROR };
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'USB-Stick oder OTDR Messordner auswählen',
      properties: ['openDirectory'],
    });

    if (res.canceled || !res.filePaths[0]) {
      return { success: false, canceled: true };
    }
    return scanFolder(res.filePaths[0]);
  });

  ipcMain.handle('scan-usb-folder', async (_e, folderPath) => {
    if (!customerStore.getActiveKvzId()) return { success: false, error: NO_KVZ_ERROR };
    if (!folderPath || !fs.existsSync(folderPath)) {
      return { success: false, error: `Ordner existiert nicht: ${folderPath}` };
    }
    return scanFolder(folderPath);
  });

  ipcMain.handle('get-app-settings', async () => {
    return customerStore.getSettings();
  });

  ipcMain.handle('save-app-settings', async (_e, settings: AppSettings) => {
    return customerStore.saveSettings(settings);
  });

  ipcMain.handle('get-setting-presets', async () => {
    return customerStore.getPresets();
  });

  ipcMain.handle('save-setting-preset', async (_e, name: string, settings: AppSettings) => {
    return customerStore.savePreset(name, settings);
  });

  ipcMain.handle('delete-setting-preset', async (_e, id: number) => {
    return customerStore.deletePreset(id);
  });

  ipcMain.handle('get-projects', async () => {
    return customerStore.getProjects();
  });

  ipcMain.handle('create-project', async (_e, data) => {
    return customerStore.createProject(data);
  });

  ipcMain.handle('update-project', async (_e, project) => {
    return customerStore.updateProject(project);
  });

  ipcMain.handle('delete-project', async (_e, id: string) => {
    return customerStore.deleteProject(id);
  });

  ipcMain.handle('get-active-project', async () => {
    return customerStore.getActiveProject();
  });

  ipcMain.handle('set-active-project', async (_e, id: string) => {
    return customerStore.setActiveProject(id);
  });

  ipcMain.handle('choose-directory', async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'SharePoint- / Projektordner auswählen',
    });
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('render-protocol-html', async (_e, customer: CustomerItem, customSettings) => {
    try {
      return { success: true, html: PdfExporter.buildProtocolHtml(customer, customSettings || customerStore.getSettings()) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('generate-pdf-protocol', async (_e, customer, customSettings, openAfter = true) => {
    if (!customer.sorData) {
      return { success: false, error: 'Für diesen Kunden liegt noch keine OTDR-Messung vor. Bitte zuerst eine passende .sor-Datei zuordnen (USB-Stick scannen).' };
    }
    try {
      const settings = customSettings || customerStore.getSettings();
      const fileName = protocolFileName(customer);
      const root = customerStore.resolveDeliveryRoot();
      const deliveryDir = root
        ? customerFolder(root, customer)
        : path.join(app.getPath('documents'), 'OTDR_Protokolle');
      fs.mkdirSync(deliveryDir, { recursive: true });
      const targetPath = path.join(deliveryDir, fileName);

      await PdfExporter.generateSinglePdf(customer, settings, targetPath);

      // Copy raw .sor file alongside if available
      if (customer.sorFilePath && fs.existsSync(customer.sorFilePath)) {
        try {
          const rawDest = path.join(deliveryDir, path.basename(customer.sorFilePath));
          if (!fs.existsSync(rawDest)) {
            fs.copyFileSync(customer.sorFilePath, rawDest);
          }
        } catch {}
      }

      if (openAfter) {
        await shell.openPath(targetPath);
      }

      customer.status = 'exported';
      customerStore.updateCustomer(customer);

      return { success: true, pdfPath: targetPath };
    } catch (err: any) {
      console.error('Failed to generate PDF protocol:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('batch-export-pdfs', async (_e, customerIds: number[], customSettings) => {
    try {
      const settings = customSettings || customerStore.getSettings();
      const root = customerStore.resolveDeliveryRoot();
      const hasSharepoint = !!root;
      const timestamp = new Date().toISOString().slice(0, 10);
      const defaultDeliveryDir = path.join(app.getPath('documents'), 'OTDR_Protokolle', `Export_${timestamp}`);
      if (!hasSharepoint) {
        fs.mkdirSync(defaultDeliveryDir, { recursive: true });
      }

      const allCustomers = customerStore.getCustomers();
      const targetCustomers = (customerIds && customerIds.length > 0
        ? allCustomers.filter(c => customerIds.includes(c.id))
        : allCustomers.filter(c => c.status === 'matched' || c.status === 'exported')
      ).filter(c => !!c.sorData);

      let exportedCount = 0;
      const failures: string[] = [];
      for (const cust of targetCustomers) {
        try {
          const fileName = protocolFileName(cust);
          const targetDir = root ? customerFolder(root, cust) : defaultDeliveryDir;
          fs.mkdirSync(targetDir, { recursive: true });
          const targetPath = path.join(targetDir, fileName);

          await PdfExporter.generateSinglePdf(cust, settings, targetPath);

          if (cust.sorFilePath && fs.existsSync(cust.sorFilePath)) {
            try {
              const rawDest = path.join(targetDir, path.basename(cust.sorFilePath));
              if (!fs.existsSync(rawDest)) {
                fs.copyFileSync(cust.sorFilePath, rawDest);
              }
            } catch {}
          }

          cust.status = 'exported';
          customerStore.updateCustomer(cust);
          exportedCount++;
        } catch (custErr: any) {
          console.error(`Failed to export PDF for job ${cust.id}:`, custErr);
          failures.push(`Job #${cust.id}: ${custErr.message}`);
        }
      }

      const openTarget = root || defaultDeliveryDir;
      if (exportedCount > 0) await shell.openPath(openTarget);

      return { success: exportedCount > 0, count: exportedCount, folderPath: openTarget, error: failures.length > 0 ? failures.join('; ') : undefined };
    } catch (err: any) {
      console.error('Batch export failed:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('open-path', async (_e, targetPath) => {
    await shell.openPath(targetPath);
    return true;
  });

  ipcMain.handle('open-external', async (_e, url: string) => {
    if (/^https?:\/\//i.test(url)) await shell.openExternal(url);
    return true;
  });

  ipcMain.handle('get-app-version', async () => {
    return app.getVersion();
  });

  ipcMain.handle('is-first-run', async () => {
    return customerStore.isFirstRun;
  });

  // Version check against the GitHub release feed. This stays in place because it also
  // works on macOS and in development, where the in-app updater is unavailable; there
  // the renderer falls back to opening the release page.
  ipcMain.handle('check-for-updates', async () => {
    try {
      const res = await fetch('https://api.github.com/repos/DerJanniku/otdr-studio/releases/latest');
      if (!res.ok) return { hasUpdate: false, canSelfUpdate: Updater.canSelfUpdate };
      const data: any = await res.json();
      const latestVersion = String(data.tag_name || '').replace(/^v/, '');
      const currentVersion = app.getVersion();
      const hasUpdate = latestVersion !== '' && compareVersions(latestVersion, currentVersion) > 0;
      return { hasUpdate, latestVersion, url: data.html_url, canSelfUpdate: Updater.canSelfUpdate };
    } catch {
      return { hasUpdate: false, canSelfUpdate: Updater.canSelfUpdate };
    }
  });

  ipcMain.handle('updater-get-state', async () => Updater.getState());

  ipcMain.handle('updater-check', async () => Updater.check());

  ipcMain.handle('updater-download', async () => {
    await Updater.download();
    return Updater.getState();
  });

  ipcMain.handle('updater-install', async () => {
    Updater.install();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  usbWatcher.stop();
  if (process.platform !== 'darwin') app.quit();
});
