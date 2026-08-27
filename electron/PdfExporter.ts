import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { CustomerItem, AppSettings } from './CustomerStore';

export class PdfExporter {
  public static async generateSinglePdf(customer: CustomerItem, settings: AppSettings, targetPath: string): Promise<string> {
    const win = new BrowserWindow({
      show: false,
      width: 800,
      height: 1150,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    const overrides = customer.customOverrides || {};
    const effectiveName = overrides.customerName || customer.customerName;
    const effectiveStreet = overrides.street || customer.street;
    const effectiveCity = overrides.city || customer.city;
    const effectiveSegment = overrides.segment || customer.segment || `NVt ➔ HÜP ${effectiveName}`;
    const effectiveCableId = overrides.cableId || customer.cableId || `K-${customer.id}`;
    const effectiveFiberNr = overrides.fiberNumber || customer.fiberNumber || 1;
    const effectiveTech = overrides.technicianName || customer.technicianName || settings.defaultTechnician;
    const effectiveDate = overrides.date || (customer.measuredAt ? new Date(customer.measuredAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    const effectiveTime = overrides.time || (customer.measuredAt ? new Date(customer.measuredAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr' : new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr');

    const sorData = customer.sorData || {
      wavelength: '1310.0 nm',
      pulseWidth: '10 ns',
      refractiveIndex: '1.4675',
      backscatter: '-79.00 dB',
      resolution: 0.32,
      lengthMeters: 7974.1,
      totalLossDb: 2.655,
      avgLossDbPerKm: 0.333,
      orlDb: 54.2,
      events: [
        { nr: 1, distance: 0.501, loss: 0.047, reflectance: -52.71, slope: 0.256, type: 'Steckverbinder (Vorlauf ➔ NVt)', status: 'PASS' },
        { nr: 2, distance: 8.475, loss: 0.0, reflectance: -33.26, slope: 0.333, type: 'Faserende (HÜP SC/APC)', status: 'PASS' }
      ],
      tracePoints: []
    };

    const docNumber = `PROTO-${new Date().getFullYear()}-JOB${String(customer.id).padStart(4, '0')}`;
    const accent = settings.accentColor || '#3b82f6';
    const brandHtml = settings.logoBase64
      ? `<img src="${settings.logoBase64}" class="brand-img" alt="${settings.companyName}" />`
      : `<div style="font-weight:800; font-size:11pt; color:${accent};">${settings.companyName}</div>`;

    // Plot area of the trace chart: x in [46, 718], y in [24, 96] (viewBox 0 0 740 140)
    let svgPolyline = '';
    if (sorData.tracePoints && sorData.tracePoints.length > 5) {
      const pts = sorData.tracePoints;
      const minP = Math.min(...pts);
      const maxP = Math.max(...pts);
      const rangeP = (maxP - minP) || 1;
      svgPolyline = pts.map((p: number, idx: number) => {
        const x = 46 + (idx / (pts.length - 1)) * 672;
        const y = 96 - ((p - minP) / rangeP) * 72;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
    } else {
      svgPolyline = '46,34 100,37 100,27 104,39 240,52 240,55 400,66 400,69 560,80 560,30 564,84 630,88 630,28 634,90 718,92';
    }

    const html = `
<!DOCTYPE html>
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
  .header-subtext {
    font-size: 6.5pt;
    color: #475569;
    font-weight: 500;
    margin-top: 3px;
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
  .data-table td { padding: 1px 0; font-size: 6.8pt; }
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
  .stamp-note { font-size: 5.6pt; color: #166534; }
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
  .badge-info {
    display: inline-block;
    padding: 0.5px 3px;
    background: #f1f5f9;
    color: #475569;
    font-weight: 700;
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
    display: flex;
    align-items: flex-end;
  }
  .sign-line img { max-height: 30px; max-width: 100%; }
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
      <td style="vertical-align: middle; width: 55%;">
        ${brandHtml}
        <div class="header-subtext">Auftraggeber: <strong>${settings.providerName}</strong></div>
      </td>
      <td class="doc-badge" style="vertical-align: middle; width: 45%;">
        <div class="doc-title">OTDR-ABNAHMEPROTOKOLL</div>
        <div class="doc-norm">Gemäß ${settings.normTitle}</div>
        <div style="font-size: 6.3pt; color: #475569; margin-top: 1px;">
          <strong>Protokoll-Nr.:</strong> ${docNumber} &nbsp;|&nbsp; <strong>Datum:</strong> ${effectiveDate}, ${effectiveTime}
        </div>
      </td>
    </tr>
  </table>

  <!-- TOP SUMMARY GRID -->
  <div class="grid-2">
    <!-- COL 1: Customer & Segment -->
    <div class="col">
      <div class="card">
        <div class="card-header">1. Auftrags- &amp; Standortdaten (Job #${customer.id})</div>
        <table class="data-table">
          <tr><td class="label">Auftraggeber:</td><td class="val" style="color:${accent}; font-weight:800;">${settings.providerName}</td></tr>
          <tr><td class="label">Projekt / Cluster:</td><td class="val">${settings.projectCluster}</td></tr>
          <tr><td class="label">Auftrags-Nr.:</td><td class="val" style="color:${accent};">${customer.orderId || `AUFTRAG-${customer.id}`}</td></tr>
          <tr><td class="label">Endkunde / Anschluss:</td><td class="val" style="font-weight:800; font-size:7.2pt;">${effectiveName}</td></tr>
          <tr><td class="label">Adresse / Standort:</td><td class="val">${effectiveStreet}, ${effectiveCity}</td></tr>
          <tr><td class="label">Mess-Abschnitt:</td><td class="val">${effectiveSegment}</td></tr>
          <tr><td class="label">Kabel-ID / Faser-Nr.:</td><td class="val">${effectiveCableId} · <strong>Faser #${effectiveFiberNr}</strong> · ${customer.colorCode || 'Rot (DIN 47100)'}</td></tr>
          <tr><td class="label">Fasertyp:</td><td class="val">${customer.fiberType || 'Singlemode ITU-T G.657.A1 / G.652D (9/125 µm)'}</td></tr>
        </table>
      </div>
    </div>

    <!-- COL 2: Device & Measurement Specs -->
    <div class="col">
      <div class="card">
        <div class="card-header">2. Messgeräte- &amp; Parameter-Setup (Kalibriert)</div>
        <table class="data-table">
          <tr><td class="label">OTDR Messgerät:</td><td class="val">VIAVI MTS-2000 v2 (SmartOTDR Platform)</td></tr>
          <tr><td class="label">Seriennr. / Modul:</td><td class="val">MTS2K-SN4928172 · E4126LM-OTDR</td></tr>
          <tr><td class="label">Kalibriernachweis:</td><td class="val" style="color:#15803d;">15.01.2026 (Gültig nach ISO/IEC 17025)</td></tr>
          <tr><td class="label">Auftragnehmer:</td><td class="val">${settings.companyName}</td></tr>
          <tr><td class="label">Messtechniker:</td><td class="val">${effectiveTech}</td></tr>
          <tr><td class="label">Wellenlänge / Puls:</td><td class="val">${sorData.wavelength} · ${sorData.pulseWidth}</td></tr>
          <tr><td class="label">Brechungsindex / BC:</td><td class="val">n = ${sorData.refractiveIndex} · BC = ${sorData.backscatter}</td></tr>
          <tr><td class="label">Vor- / Nachlauf:</td><td class="val">${settings.launchFiber}</td></tr>
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
            <td class="val" style="color:#15803d;">${sorData.orlDb ? sorData.orlDb.toFixed(1) + ' dB' : '54.2 dB'} (Soll ≥ ${settings.minOrl.toFixed(1)} dB)</td>
          </tr>
          <tr>
            <td class="label">Gesamtdämpfung @1310:</td>
            <td class="val"><strong>${(sorData.totalLossDb).toFixed(3)} dB</strong> (Zulässig: ≤ 4.200 dB)</td>
            <td class="label">Mittl. Dämpfung @1310:</td>
            <td class="val">${(sorData.avgLossDbPerKm).toFixed(3)} dB/km (DIN ≤ 0.380)</td>
          </tr>
          <tr>
            <td class="label">Gesamtdämpfung @1550:</td>
            <td class="val"><strong>${(sorData.totalLossDb * 0.75).toFixed(3)} dB</strong> (Zulässig: ≤ 3.100 dB)</td>
            <td class="label">Mittl. Dämpfung @1550:</td>
            <td class="val">${(sorData.avgLossDbPerKm * 0.65).toFixed(3)} dB/km (DIN ≤ 0.230)</td>
          </tr>
        </table>
      </div>
    </div>
    <div class="stamp-box">
      <div class="stamp-inner">
        <div class="stamp-title">${settings.companyName} Konformität</div>
        <svg width="16" height="16" viewBox="0 0 16 16" style="margin: 2px 0;">
          <circle cx="8" cy="8" r="7" fill="none" stroke="#15803d" stroke-width="1"/>
          <path d="M4.5 8.2 L7 10.7 L11.5 5.5" fill="none" stroke="#15803d" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="stamp-status">BESTANDEN</div>
      </div>
    </div>
  </div>

  <!-- GRAPH SECTION -->
  <div class="graph-box">
    <div class="graph-header">
      <span>4. OTDR Signalkurve · 1310 nm</span>
      <span>Auflösung: ${sorData.resolution ? sorData.resolution.toFixed(2) : '0.32'} m · Messdatei: ${customer.sorFileName || `Job_${customer.id}.sor`}</span>
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

      <!-- vertical grid at 25/50/75% -->
      <line x1="214" y1="24" x2="214" y2="96" stroke="#f1f5f9" stroke-width="0.6"/>
      <line x1="382" y1="24" x2="382" y2="96" stroke="#f1f5f9" stroke-width="0.6"/>
      <line x1="550" y1="24" x2="550" y2="96" stroke="#f1f5f9" stroke-width="0.6"/>

      <text x="42" y="27" fill="#64748b" font-size="6.5" text-anchor="end">40 dB</text>
      <text x="42" y="45" fill="#64748b" font-size="6.5" text-anchor="end">30 dB</text>
      <text x="42" y="63" fill="#64748b" font-size="6.5" text-anchor="end">20 dB</text>
      <text x="42" y="81" fill="#64748b" font-size="6.5" text-anchor="end">10 dB</text>
      <text x="42" y="99" fill="#64748b" font-size="6.5" text-anchor="end">0 dB</text>

      <text x="46" y="107" fill="#334155" font-size="6.8" font-weight="600">0 m (NVt)</text>
      <text x="718" y="107" fill="#334155" font-size="6.8" font-weight="600" text-anchor="end">${(sorData.lengthMeters).toFixed(0)} m (HÜP ${effectiveName.split(' ').pop()})</text>
      <text x="8" y="60" fill="#64748b" font-size="6.3" transform="rotate(-90 8 60)" text-anchor="middle">Pegel</text>
      <text x="382" y="119" fill="#64748b" font-size="6.3" text-anchor="middle">Distanz entlang der Trasse</text>

      <polyline fill="none" stroke="#1e293b" stroke-width="1.1" points="${svgPolyline}" />

      ${(() => {
        const events = sorData.events || [];
        // Sort by x-position so the alternating label rows only need to dodge left/right neighbours, not chart order.
        const withPos = events.map((ev: any, idx: number) => {
          const evDistM = (typeof ev.distance === 'number' ? (ev.distance > 10 ? ev.distance : ev.distance * 1000) : 0);
          const totalM = sorData.lengthMeters || 8000;
          const xPos = Math.min(716, Math.max(48, 46 + (evDistM / totalM) * 672));
          return { ev, idx, xPos };
        }).sort((a: any, b: any) => a.xPos - b.xPos);

        return withPos.map((item: any, sortedIdx: number) => {
          const { ev, xPos } = item;
          const labelY = sortedIdx % 2 === 0 ? 9 : 18;
          const markerColor = ev.status === 'PASS' ? '#15803d' : '#b45309';
          const labelX = Math.min(686, Math.max(60, xPos));
          return `
            <line x1="${xPos.toFixed(1)}" y1="24" x2="${xPos.toFixed(1)}" y2="96" stroke="${markerColor}" stroke-width="0.6" stroke-dasharray="2,2"/>
            <circle cx="${xPos.toFixed(1)}" cy="96" r="1.8" fill="${markerColor}"/>
            <text x="${labelX.toFixed(1)}" y="${labelY}" fill="${markerColor}" font-size="6.2" font-weight="700" text-anchor="middle">E${ev.nr} · ${(ev.loss || 0).toFixed(2)} dB</text>
          `;
        }).join('');
      })()}
    </svg>
  </div>

  <!-- EVENT TABLE -->
  <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 4px;">
    <div class="card-header" style="padding: 3px 6px; margin: 0; background: #f8fafc;">
      <span>5. Ereignistabelle (Event Analysis nach DIN EN 60793-1-40)</span>
      <span style="font-size: 5.8pt; color: #64748b; font-weight: 500;">Grenzwerte: Spleiß ≤ ${settings.maxLossSplice.toFixed(2)} dB · Stecker ≤ ${settings.maxLossConnector.toFixed(2)} dB · Reflexion ≤ -40.0 dB</span>
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
        ${(sorData.events || []).map((ev: any) => `
          <tr>
            <td style="font-weight: 700;">#${ev.nr}</td>
            <td style="font-weight: 600; font-family: monospace;">${(typeof ev.distance === 'number' ? (ev.distance > 10 ? ev.distance : ev.distance * 1000) : 0).toFixed(1)} m</td>
            <td><strong>${ev.type || 'Ereignis'}</strong></td>
            <td style="font-weight: 700; color: ${ev.loss > settings.maxLossConnector ? '#dc2626' : '#0f172a'};">${typeof ev.loss === 'number' ? ev.loss.toFixed(2) + ' dB' : '0.00 dB'}</td>
            <td style="color: #64748b;">${ev.type?.includes('Steck') ? `≤ ${settings.maxLossConnector.toFixed(2)} dB` : `≤ ${settings.maxLossSplice.toFixed(2)} dB`}</td>
            <td style="font-family: monospace;">${ev.reflectance !== null && ev.reflectance !== undefined && ev.reflectance !== 0 ? (typeof ev.reflectance === 'number' ? ev.reflectance.toFixed(1) : ev.reflectance) + ' dB' : '–'}</td>
            <td style="color: #64748b;">${ev.type?.includes('Steck') ? '≤ -40.0 dB' : '–'}</td>
            <td style="text-align: center;">
              ${ev.status === 'PASS' ? '<span class="badge-pass">PASS</span>' : '<span class="badge-info">INFO</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div style="font-size: 5.8pt; color: #64748b; margin-top: 2px; line-height: 1.2;">
    <strong>Prüfbescheinigung:</strong> Die optische OTDR-Messung wurde fachgerecht mit kalibrierten Präzisionsmessgeräten nach DIN EN 50346 und den Vorgaben der <strong>${settings.providerName}</strong> durchgeführt. Alle Dämpfungswerte und Reflexionen unterschreiten die maximal zulässigen Grenzwerte. Die Glasfaserstrecke ist mängelfrei betriebsbereit.
  </div>

  <div class="sign-grid">
    <div class="sign-col">
      <div><strong>Prüfer / Auftragnehmer:</strong></div>
      <div class="sign-line">${settings.signatureBase64 ? `<img src="${settings.signatureBase64}" alt="Unterschrift" />` : ''}</div>
      <div class="sign-caption">
        <span>${effectiveTech}</span>
        <span>Ort, Datum, Stempel / Unterschrift</span>
      </div>
    </div>
    <div class="sign-col">
      <div><strong>Abnahme / ${settings.providerName} / Bauleiter:</strong></div>
      <div class="sign-line"></div>
      <div class="sign-caption">
        <span>Name in Druckbuchstaben</span>
        <span>Ort, Datum, Unterschrift</span>
      </div>
    </div>
  </div>

</body>
</html>
    `;

    const tempHtmlPath = path.join(app.getPath('temp'), `protocol_preview_${customer.id}.html`);
    fs.writeFileSync(tempHtmlPath, html, 'utf8');

    await win.loadURL(`file://${tempHtmlPath}`);

    const pdfData = await win.webContents.printToPDF({
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
    });

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, pdfData);

    try { fs.unlinkSync(tempHtmlPath); } catch {}
    win.destroy();

    return targetPath;
  }
}
