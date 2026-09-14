with open('electron/main.ts', 'r') as f:
    code = f.read()

kvz_pdf = """
  ipcMain.handle('generate-kvz-pdf', async (_e, kvzId: string) => {
    // Placeholder implementation for KVZ PDF generation
    const { dialog } = require('electron');
    dialog.showMessageBox({
      type: 'info',
      title: 'KVZ PDF',
      message: 'KVZ PDF Protokoll (POP -> KVZ) wird in Kürze in PdfExporter implementiert.',
    });
    return { success: true };
  });
"""

code = code.replace("ipcMain.handle('generate-pdf-protocol',", kvz_pdf + "\n  ipcMain.handle('generate-pdf-protocol',")
with open('electron/main.ts', 'w') as f:
    f.write(code)

with open('src/vite-env.d.ts', 'r') as f:
    code = f.read()

code = code.replace("generatePdfProtocol:", "generateKvzPdf: (kvzId: string) => Promise<{ success: boolean; pdfPath?: string; error?: string }>;\n    generatePdfProtocol:")
with open('src/vite-env.d.ts', 'w') as f:
    f.write(code)

with open('src/components/DrilldownDashboard.tsx', 'r') as f:
    code = f.read()

code = code.replace("alert('Wird implementiert: KVZ PDF Generierung')", "window.api?.generateKvzPdf?.(k.id)")
with open('src/components/DrilldownDashboard.tsx', 'w') as f:
    f.write(code)
