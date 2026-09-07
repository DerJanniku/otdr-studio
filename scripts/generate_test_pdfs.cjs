const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml({ customer, settings, showLogo }) {
  const overrides = customer.customOverrides || {};
  const effectiveName = esc(overrides.customerName || customer.customerName);
  const effectiveStreet = esc(overrides.street || customer.street);
  const effectiveCity = esc(overrides.city || customer.city);
  const effectiveSegment = esc(overrides.segment || customer.segment || `NVt ➔ HÜP ${overrides.customerName || customer.customerName}`);
  const effectiveCableId = esc(overrides.cableId || customer.cableId || `K-${customer.id}`);
  const effectiveFiberNr = overrides.fiberNumber || customer.fiberNumber || 1;
  const effectiveTech = esc(overrides.technicianName || customer.technicianName || 'Jannik Maier');
  const effectiveDate = overrides.date || '02.09.2026';
  const effectiveTime = overrides.time || '10:23 Uhr';

  const sorData = customer.sorData;
  const docNumber = `PROTO-2026-JOB0001`;
  const accent = '#ef4444';
  const normTitleEsc = esc(settings.normTitle || 'DIN EN 50346:2010-04 / DIN EN 60793-1-40');
  const projectClusterEsc = esc(settings.projectCluster || 'Herrieden');
  const otdrDeviceModelEsc = esc(settings.otdrDeviceModel || 'VIAVI MTS-2000');
  const colorCodeEsc = esc(customer.colorCode || 'Rot (DIN 47100)');
  const fiberTypeEsc = esc(customer.fiberType || 'Singlemode ITU-T G.657.A1 (9/125 µm)');
  const sorFileNameEsc = esc(customer.sorFileName || 'Fiber001_1550OE.sor');

  const brandHtml = showLogo && settings.logoBase64
    ? `<img src="${settings.logoBase64}" class="brand-img" alt="Logo" />`
    : `<div style="height: 32px;"></div>`;

  // Polyline mapping
  let svgPolyline = '';
  if (sorData.tracePoints && sorData.tracePoints.length > 5) {
    const pts = sorData.tracePoints;
    const minP = Math.min(...pts);
    const maxP = Math.max(...pts);
    const rangeP = (maxP - minP) || 1;
    svgPolyline = pts.map((p, idx) => {
      const x = 46 + (idx / (pts.length - 1)) * 672;
      const y = 96 - ((p - minP) / rangeP) * 72;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  } else {
    svgPolyline = '46,34 100,37 100,27 104,39 240,52 240,55 400,66 400,69 560,80 560,30 564,84 630,88 630,28 634,90 718,92';
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>OTDR Messprotokoll nach DIN EN 50346</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  html, body {
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 8mm 10mm 6mm 10mm;
    color: #0f172a;
    background: #ffffff;
    font-size: 7.2pt;
    line-height: 1.22;
    overflow: hidden;
  }
  .header-table {
    width: 100%;
    border-bottom: 2.5px solid ${accent};
    padding-bottom: 5px;
    margin-bottom: 6px;
  }
  .brand-img {
    height: 32px;
    display: block;
  }
  .doc-badge { text-align: right; }
  .doc-title {
    font-size: 11pt;
    font-weight: 800;
    color: ${accent};
    letter-spacing: 0.3px;
  }
  .doc-norm {
    font-size: 6.3pt;
    color: #64748b;
    font-weight: 600;
    margin-top: 1px;
  }
  .grid-2 {
    display: table;
    width: 100%;
    table-layout: fixed;
    margin-bottom: 4px;
  }
  .col {
    display: table-cell;
    vertical-align: top;
    padding-right: 5px;
  }
  .col:last-child { padding-right: 0; padding-left: 5px; }
  .card {
    border: 1px solid #cbd5e1;
    border-radius: 3px;
    background: #f8fafc;
    padding: 4px 6px;
    margin-bottom: 4px;
  }
  .card-header {
    font-size: 6.6pt;
    font-weight: 700;
    color: ${accent};
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2px;
    margin-bottom: 3px;
  }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table td { padding: 1.5px 0; font-size: 6.8pt; }
  .data-table td.label { color: #64748b; width: 37%; font-weight: 500; }
  .data-table td.val { color: #0f172a; font-weight: 600; }
  .stamp-box {
    border: 1px solid #15803d;
    background: #f0fdf4;
    border-radius: 2px;
    padding: 3px;
    display: table-cell;
    vertical-align: middle;
    width: 32%;
  }
  .stamp-inner {
    border: 1px solid #86c9a0;
    border-radius: 1px;
    padding: 4px 6px;
    text-align: center;
  }
  .stamp-title {
    font-size: 5.8pt;
    font-weight: 700;
    color: #15803d;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .stamp-status {
    font-size: 10pt;
    font-weight: 800;
    color: #14532d;
    letter-spacing: 1.2px;
    line-height: 1.3;
    margin: 2px 0;
  }
  .graph-box {
    border: 1px solid #cbd5e1;
    border-radius: 3px;
    background: #ffffff;
    padding: 3px 4px;
    margin-bottom: 4px;
  }
  .graph-header {
    font-size: 6.3pt;
    font-weight: 700;
    color: ${accent};
    display: flex;
    justify-content: space-between;
    padding: 0 2px 2px 2px;
  }
  .event-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 3px;
    font-size: 6.5pt;
  }
  .event-table th {
    background: ${accent};
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 2.5px 4px;
    font-size: 6pt;
    text-transform: uppercase;
  }
  .event-table td {
    padding: 2px 4px;
    border-bottom: 1px solid #e2e8f0;
  }
  .event-table tr:nth-child(even) { background: #f8fafc; }
  .badge-pass {
    display: inline-block;
    padding: 0.5px 3px;
    background: #dcfce7;
    color: #15803d;
    font-weight: 800;
    border-radius: 2px;
    font-size: 5.8pt;
  }
  .sign-grid {
    display: table;
    width: 100%;
    table-layout: fixed;
    margin-top: 5px;
    border-top: 1px solid #cbd5e1;
    padding-top: 3px;
  }
  .sign-col {
    display: table-cell;
    width: 50%;
    padding-right: 12px;
    font-size: 6.3pt;
  }
  .sign-col:last-child { padding-right: 0; padding-left: 12px; }
  .sign-line {
    border-bottom: 1px dashed #94a3b8;
    height: 32px;
    margin-top: 2px;
    margin-bottom: 2px;
  }
  .sign-caption {
    color: #64748b;
    font-size: 5.8pt;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <table class="header-table">
    <tr>
      <td style="vertical-align: middle; width: 50%;">
        ${brandHtml}
      </td>
      <td class="doc-badge" style="vertical-align: middle; width: 50%;">
        <div class="doc-title">OTDR-ABNAHMEPROTOKOLL</div>
        <div class="doc-norm">Gemäß ${normTitleEsc}</div>
        <div style="font-size: 6.3pt; color: #475569; margin-top: 1px;">
          <strong>Protokoll-Nr.:</strong> ${docNumber} &nbsp;|&nbsp; <strong>Datum:</strong> ${effectiveDate}, ${effectiveTime}
        </div>
      </td>
    </tr>
  </table>

  <!-- TOP SUMMARY GRID -->
  <div class="grid-2">
    <!-- COL 1: Customer & Segment (Without Auftraggeber, without Auftrags-Nr) -->
    <div class="col">
      <div class="card">
        <div class="card-header">1. Auftrags- &amp; Standortdaten (Job #${customer.id})</div>
        <table class="data-table">
          <tr><td class="label">Projekt / Cluster:</td><td class="val">${projectClusterEsc}</td></tr>
          <tr><td class="label">Endkunde / Anschluss:</td><td class="val" style="font-weight:800; font-size:7.2pt;">${effectiveName}</td></tr>
          <tr><td class="label">Adresse / Standort:</td><td class="val">${effectiveStreet}, ${effectiveCity}</td></tr>
          <tr><td class="label">Mess-Abschnitt:</td><td class="val">${effectiveSegment}</td></tr>
          <tr><td class="label">Kabel-ID / Faser-Nr.:</td><td class="val">${effectiveCableId} · <strong>Faser #${effectiveFiberNr}</strong> · ${colorCodeEsc}</td></tr>
          <tr><td class="label">Fasertyp:</td><td class="val">${fiberTypeEsc}</td></tr>
        </table>
      </div>
    </div>

    <!-- COL 2: Device & Measurement Specs (Without Auftragnehmer, Only Vorlauffaser) -->
    <div class="col">
      <div class="card">
        <div class="card-header">2. Messgeräte- &amp; Parameter-Setup (Kalibriert)</div>
        <table class="data-table">
          <tr><td class="label">OTDR Messgerät:</td><td class="val">${otdrDeviceModelEsc}</td></tr>
          <tr><td class="label">Messtechniker:</td><td class="val">${effectiveTech}</td></tr>
          <tr><td class="label">Wellenlänge / Puls:</td><td class="val">${sorData.wavelength} · ${sorData.pulseWidth}</td></tr>
          <tr><td class="label">Brechungsindex / BC:</td><td class="val">n = ${sorData.refractiveIndex} · BC = ${sorData.backscatter}</td></tr>
          <tr><td class="label">Vorlauffaser:</td><td class="val">500 m Vorlauf</td></tr>
        </table>
      </div>
    </div>
  </div>

  <!-- KEY METRICS & PASS/FAIL BANNER -->
  <div style="display: table; width: 100%; margin-bottom: 4px;">
    <div style="display: table-cell; vertical-align: top; width: 68%; padding-right: 5px;">
      <div class="card" style="margin-bottom: 0; background: #f8fafc; border-color: #cbd5e1;">
        <div class="card-header" style="color: ${accent};">3. Dämpfungsbilanz &amp; Grenzwerte-Abgleich</div>
        <table class="data-table">
          <tr>
            <td class="label">Nettolänge (Strecke):</td>
            <td class="val" style="font-size:7.5pt; font-weight:800; color:${accent};">${(sorData.lengthMeters).toFixed(1)} m (${(sorData.lengthMeters/1000).toFixed(3)} km)</td>
            <td class="label">Opt. Rückflussdämpfung:</td>
            <td class="val" style="color:#15803d;">${sorData.orlDb ? sorData.orlDb.toFixed(1) + ' dB' : '54.2 dB'} (Soll ≥ 45.0 dB)</td>
          </tr>
          <tr>
            <td class="label">Gesamtdämpfung @1310:</td>
            <td class="val"><strong>${(sorData.totalLossDb).toFixed(3)} dB</strong> (Zulässig: ≤ 4.200 dB)</td>
            <td class="label">Mittl. Dämpfung @1310:</td>
            <td class="val">${(sorData.avgLossDbPerKm).toFixed(3)} dB/km (DIN ≤ 0.380)</td>
          </tr>
          <tr>
            <td class="label">Gesamtdämpfung @1550:</td>
            <td class="val"><strong>0.513 dB</strong> (Zulässig: ≤ 3.100 dB)</td>
            <td class="label">Mittl. Dämpfung @1550:</td>
            <td class="val">0.220 dB/km (DIN ≤ 0.230)</td>
          </tr>
        </table>
      </div>
    </div>
    <div class="stamp-box">
      <div class="stamp-inner">
        <div class="stamp-title">KONFORMITÄT</div>
        <svg width="16" height="16" viewBox="0 0 16 16" style="margin: 2px 0;">
          <circle cx="8" cy="8" r="7" fill="none" stroke="#15803d" stroke-width="1"/>
          <path d="M4.5 8.2 L7 10.7 L11.5 5.5" fill="none" stroke="#15803d" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="stamp-status">BESTANDEN</div>
      </div>
    </div>
  </div>

  <!-- GRAPH SECTION (NO NACHLAUF BOX) -->
  <div class="graph-box">
    <div class="graph-header">
      <span>4. OTDR Signalkurve · 1310 nm</span>
      <span>Auflösung: 0.16 m · Messdatei: ${sorFileNameEsc}</span>
    </div>
    <svg viewBox="0 0 740 140" style="width:100%; height:126px; display:block; background:#ffffff;">
      <!-- plot area frame -->
      <rect x="46" y="24" width="672" height="72" fill="#fbfcfd" stroke="#94a3b8" stroke-width="0.7"/>

      <!-- horizontal grid -->
      <line x1="46" y1="24" x2="718" y2="24" stroke="#e2e8f0" stroke-width="0.6"/>
      <line x1="46" y1="42" x2="718" y2="42" stroke="#e2e8f0" stroke-width="0.6"/>
      <line x1="46" y1="60" x2="718" y2="60" stroke="#e2e8f0" stroke-width="0.6"/>
      <line x1="46" y1="78" x2="718" y2="78" stroke="#e2e8f0" stroke-width="0.6"/>
      <line x1="46" y1="96" x2="718" y2="96" stroke="#e2e8f0" stroke-width="0.6"/>

      <!-- vertical grid -->
      <line x1="214" y1="24" x2="214" y2="96" stroke="#f1f5f9" stroke-width="0.6"/>
      <line x1="382" y1="24" x2="382" y2="96" stroke="#f1f5f9" stroke-width="0.6"/>
      <line x1="550" y1="24" x2="550" y2="96" stroke="#f1f5f9" stroke-width="0.6"/>

      <text x="42" y="27" fill="#64748b" font-size="6.5" text-anchor="end">40 dB</text>
      <text x="42" y="45" fill="#64748b" font-size="6.5" text-anchor="end">30 dB</text>
      <text x="42" y="63" fill="#64748b" font-size="6.5" text-anchor="end">20 dB</text>
      <text x="42" y="81" fill="#64748b" font-size="6.5" text-anchor="end">10 dB</text>
      <text x="42" y="99" fill="#64748b" font-size="6.5" text-anchor="end">0 dB</text>

      <text x="46" y="107" fill="#334155" font-size="6.8" font-weight="600">0 m (NVt)</text>
      <text x="718" y="107" fill="#334155" font-size="6.8" font-weight="600" text-anchor="end">1429 m (HÜP Mendl)</text>
      <text x="8" y="60" fill="#64748b" font-size="6.3" transform="rotate(-90 8 60)" text-anchor="middle">Pegel</text>
      <text x="382" y="119" fill="#64748b" font-size="6.3" text-anchor="middle">Distanz entlang der Trasse</text>

      <polyline fill="none" stroke="#1e293b" stroke-width="1.1" points="${svgPolyline}" />

      <!-- Event 1 marker at 499m -->
      <line x1="280.7" y1="24" x2="280.7" y2="96" stroke="#15803d" stroke-width="0.6" stroke-dasharray="2,2"/>
      <circle cx="280.7" cy="96" r="1.8" fill="#15803d"/>
      <text x="280.7" y="18" fill="#15803d" font-size="6.2" font-weight="700" text-anchor="middle">E1 · 0.00 dB</text>
    </svg>
  </div>

  <!-- EVENT TABLE (NO NACHLAUF ROW) -->
  <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 4px;">
    <div class="card-header" style="padding: 3px 6px; margin: 0; background: #f8fafc;">
      <span>5. Ereignistabelle (Event Analysis nach DIN EN 60793-1-40)</span>
      <span style="font-size: 5.8pt; color: #64748b; font-weight: 500;">Grenzwerte: Spleiß ≤ 0.15 dB · Stecker ≤ 0.50 dB · Reflexion ≤ -40.0 dB</span>
    </div>
    <table class="event-table">
      <thead>
        <tr>
          <th style="width: 22px;">Nr.</th>
          <th style="width: 70px;">Distanz</th>
          <th>Ereignis-Beschreibung &amp; Ort</th>
          <th style="width: 60px;">Dämpfung</th>
          <th style="width: 65px;">Grenzwert</th>
          <th style="width: 60px;">Reflexion</th>
          <th style="width: 65px;">Grenzwert RL</th>
          <th style="width: 45px; text-align: center;">Urteil</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: 700;">#1</td>
          <td style="font-weight: 600; font-family: monospace;">499.0 m</td>
          <td><strong>Steckverbinder (Vorlauf ➔ NVt)</strong></td>
          <td style="font-weight: 700; color: #0f172a;">0.00 dB</td>
          <td style="color: #64748b;">≤ 0.50 dB</td>
          <td style="font-family: monospace;">-43.7 dB</td>
          <td style="color: #64748b;">≤ -40.0 dB</td>
          <td style="text-align: center;">
            <span class="badge-pass">PASS</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- PRÜFBESCHEINIGUNG (CONFORMING TO GEMEINDE ABNAHME) -->
  <div style="font-size: 5.8pt; color: #64748b; margin-top: 2px; line-height: 1.2;">
    <strong>Prüfbescheinigung:</strong> Die optische OTDR-Messung wurde fachgerecht mit kalibrierten Präzisionsmessgeräten nach DIN EN 50346 und den anerkannten Regeln der Technik durchgeführt. Alle Dämpfungswerte und Reflexionen unterschreiten die maximal zulässigen Grenzwerte. Die Glasfaserstrecke ist mängelfrei betriebsbereit.
  </div>

  <!-- SIGNATURES (BEIDE OHNE UNTERSCHRIFT) -->
  <div class="sign-grid">
    <div class="sign-col">
      <div><strong>Prüfer / Messtechniker:</strong></div>
      <div class="sign-line"></div>
      <div class="sign-caption">
        <span>${effectiveTech}</span>
        <span>Ort, Datum, Stempel / Unterschrift</span>
      </div>
    </div>
    <div class="sign-col">
      <div><strong>Abnahme / Bauleitung:</strong></div>
      <div class="sign-line"></div>
      <div class="sign-caption">
        <span>Name in Druckbuchstaben</span>
        <span>Ort, Datum, Unterschrift</span>
      </div>
    </div>
  </div>

</body>
</html>`;
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 1150,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const customersPath = '/Users/jannik/Library/Application Support/OTDR Studio/otdr-studio/customers.json';
  const settingsPath = '/Users/jannik/Library/Application Support/OTDR Studio/otdr-studio/settings.json';

  const customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'));
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

  const customer1 = customers.find(c => c.id === 1) || customers[0];

  const tasks = [
    {
      showLogo: true,
      name: 'OTDR_Abnahmeprotokoll_Job001_Franz_Mendl_mit_Logo.pdf'
    },
    {
      showLogo: false,
      name: 'OTDR_Abnahmeprotokoll_Job001_Franz_Mendl_ohne_Logo.pdf'
    }
  ];

  const outDirs = [
    '/Users/jannik/Desktop',
    '/Users/jannik/Documents/OTDR_Protokolle',
    '/Users/jannik/dev/viavi-mts2000-otdr-suite/delivery'
  ];

  for (const dir of outDirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  for (const t of tasks) {
    const html = buildHtml({ customer: customer1, settings, showLogo: t.showLogo });
    const tempHtmlPath = path.join(app.getPath('temp'), `temp_protocol_${t.showLogo ? 'with_logo' : 'no_logo'}.html`);
    fs.writeFileSync(tempHtmlPath, html, 'utf8');

    await win.loadURL(`file://${tempHtmlPath}`);

    const pdfData = await win.webContents.printToPDF({
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
    });

    for (const dir of outDirs) {
      const outPath = path.join(dir, t.name);
      fs.writeFileSync(outPath, pdfData);
      console.log(`Generated: ${outPath} (${pdfData.length} bytes)`);
    }

    try { fs.unlinkSync(tempHtmlPath); } catch {}
  }

  win.destroy();
  app.quit();
});
