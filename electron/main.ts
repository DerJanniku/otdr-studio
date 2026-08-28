import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { CustomerStore, type AppSettings, type CustomerItem } from './CustomerStore';
import { SorMatcher } from './SorMatcher';
import { PdfExporter } from './PdfExporter';
import { UsbWatcher } from './UsbWatcher';

app.setName('OTDR Studio');

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

const usbWatcher = new UsbWatcher((volumePath, volumeName) => {
  const scanRes = SorMatcher.scanAndMatch(volumePath, customerStore.getCustomers());
  archiveRawSorFiles(scanRes.updatedCustomers, scanRes.matchedIds);
  customerStore.saveCustomers(scanRes.updatedCustomers);
  mainWindow?.webContents.send('usb-scan-result', {
    volumeName,
    matchedCount: scanRes.matchedCount,
    matchedIds: scanRes.matchedIds,
    customers: customerStore.getCustomers(),
  });
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
  usbWatcher.start();

  // IPC Handlers
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
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'SharePoint Kundenliste importieren (Excel / CSV)',
      filters: [{ name: 'Excel / CSV', extensions: ['xlsx', 'xls', 'csv'] }],
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
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'USB-Stick oder OTDR Messordner auswählen',
      properties: ['openDirectory'],
    });

    if (res.canceled || !res.filePaths[0]) {
      return { success: false, canceled: true };
    }

    const folderPath = res.filePaths[0];
    const scanRes = SorMatcher.scanAndMatch(folderPath, customerStore.getCustomers());
    archiveRawSorFiles(scanRes.updatedCustomers, scanRes.matchedIds);
    customerStore.saveCustomers(scanRes.updatedCustomers);

    return {
      success: true,
      folderPath,
      matchedCount: scanRes.matchedCount,
      matchedIds: scanRes.matchedIds,
      errors: scanRes.errors,
      customers: customerStore.getCustomers(),
    };
  });

  ipcMain.handle('scan-usb-folder', async (_e, folderPath) => {
    if (!folderPath || !fs.existsSync(folderPath)) {
      return { success: false, error: `Ordner existiert nicht: ${folderPath}` };
    }
    const scanRes = SorMatcher.scanAndMatch(folderPath, customerStore.getCustomers());
    archiveRawSorFiles(scanRes.updatedCustomers, scanRes.matchedIds);
    customerStore.saveCustomers(scanRes.updatedCustomers);

    return {
      success: true,
      folderPath,
      matchedCount: scanRes.matchedCount,
      matchedIds: scanRes.matchedIds,
      errors: scanRes.errors,
      customers: customerStore.getCustomers(),
    };
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

  ipcMain.handle('generate-pdf-protocol', async (_e, customer, customSettings, openAfter = true) => {
    if (!customer.sorData) {
      return { success: false, error: 'Für diesen Kunden liegt noch keine OTDR-Messung vor. Bitte zuerst eine passende .sor-Datei zuordnen (USB-Stick scannen).' };
    }
    try {
      const settings = customSettings || customerStore.getSettings();
      const nameSafe = (customer.customOverrides?.customerName || customer.customerName).replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `MTS2000_DIN_Protokoll_Job${String(customer.id).padStart(3, '0')}_${nameSafe}.pdf`;
      const deliveryDir = path.join(app.getPath('documents'), 'OTDR_Protokolle');
      fs.mkdirSync(deliveryDir, { recursive: true });
      const targetPath = path.join(deliveryDir, fileName);

      await PdfExporter.generateSinglePdf(customer, settings, targetPath);

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
      const timestamp = new Date().toISOString().slice(0, 10);
      const deliveryDir = path.join(app.getPath('documents'), 'OTDR_Protokolle', `Export_${timestamp}`);
      fs.mkdirSync(deliveryDir, { recursive: true });

      const allCustomers = customerStore.getCustomers();
      const targetCustomers = (customerIds && customerIds.length > 0
        ? allCustomers.filter(c => customerIds.includes(c.id))
        : allCustomers.filter(c => c.status === 'matched' || c.status === 'exported')
      ).filter(c => !!c.sorData);

      let exportedCount = 0;
      const failures: string[] = [];
      for (const cust of targetCustomers) {
        try {
          const nameSafe = (cust.customOverrides?.customerName || cust.customerName).replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `MTS2000_DIN_Protokoll_Job${String(cust.id).padStart(3, '0')}_${nameSafe}.pdf`;
          const targetPath = path.join(deliveryDir, fileName);

          await PdfExporter.generateSinglePdf(cust, settings, targetPath);
          cust.status = 'exported';
          customerStore.updateCustomer(cust);
          exportedCount++;
        } catch (custErr: any) {
          console.error(`Failed to export PDF for job ${cust.id}:`, custErr);
          failures.push(`Job #${cust.id}: ${custErr.message}`);
        }
      }

      if (exportedCount > 0) await shell.openPath(deliveryDir);

      return { success: exportedCount > 0, count: exportedCount, folderPath: deliveryDir, error: failures.length > 0 ? failures.join('; ') : undefined };
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

  ipcMain.handle('check-for-updates', async () => {
    try {
      const res = await fetch('https://api.github.com/repos/DerJanniku/otdr-studio/releases/latest');
      if (!res.ok) return { hasUpdate: false };
      const data: any = await res.json();
      const latestVersion = String(data.tag_name || '').replace(/^v/, '');
      const currentVersion = app.getVersion();
      const hasUpdate = latestVersion !== '' && compareVersions(latestVersion, currentVersion) > 0;
      return { hasUpdate, latestVersion, url: data.html_url };
    } catch {
      return { hasUpdate: false };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  usbWatcher.stop();
  if (process.platform !== 'darwin') app.quit();
});
