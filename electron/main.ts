import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { CustomerStore, type AppSettings } from './CustomerStore';
import { SorMatcher } from './SorMatcher';
import { PdfExporter } from './PdfExporter';
import { UsbWatcher } from './UsbWatcher';

app.setName('OTDR Studio');

let mainWindow: BrowserWindow | null = null;
const customerStore = new CustomerStore();

const usbWatcher = new UsbWatcher((volumePath, volumeName) => {
  const scanRes = SorMatcher.scanAndMatch(volumePath, customerStore.getCustomers());
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
    customerStore.saveCustomers(customers);
    return true;
  });

  ipcMain.handle('update-customer', async (_e, customer) => {
    customerStore.updateCustomer(customer);
    return true;
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
    customerStore.saveSettings(settings);
    return true;
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
      const targetCustomers = customerIds && customerIds.length > 0
        ? allCustomers.filter(c => customerIds.includes(c.id))
        : allCustomers.filter(c => c.status === 'matched' || c.status === 'exported');

      let exportedCount = 0;
      for (const cust of targetCustomers) {
        const nameSafe = (cust.customOverrides?.customerName || cust.customerName).replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `MTS2000_DIN_Protokoll_Job${String(cust.id).padStart(3, '0')}_${nameSafe}.pdf`;
        const targetPath = path.join(deliveryDir, fileName);

        await PdfExporter.generateSinglePdf(cust, settings, targetPath);
        cust.status = 'exported';
        customerStore.updateCustomer(cust);
        exportedCount++;
      }

      await shell.openPath(deliveryDir);

      return { success: true, count: exportedCount, folderPath: deliveryDir };
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
    } catch (err) {
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
