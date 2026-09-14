with open('electron/main.ts', 'r') as f:
    code = f.read()
import_start = code.find("ipcMain.handle('import-customer-file'")
import_end = code.find("});", import_start) + 3
# It may have multiple lines, so find the next ipcMain
next_ipc = code.find("ipcMain.handle(", import_start + 1)
# we can just use simple string replacement since we have Python string operations
code = code[:import_start] + """ipcMain.handle('import-customer-file', async (_e, kvzId: string) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Excel / CSV', extensions: ['xlsx', 'xls', 'csv'] }],
      title: 'Kundenliste importieren'
    });
    if (canceled || filePaths.length === 0) return { success: false, canceled: true };
    const result = await store.importExcelFile(kvzId, filePaths[0]);
    if (result.success) {
      return { ...result, customers: store.getCustomers(kvzId) };
    }
    return result;
  });
  """ + code[next_ipc:]

with open('electron/main.ts', 'w') as f:
    f.write(code)
