# OTDR Studio

Freie, quelloffene Desktop-App zur automatisierten Zuordnung von OTDR-Messungen (`.sor`-Dateien) zu
Kundendatensätzen und zum Erzeugen fertiger Abnahmeprotokolle nach **DIN EN 50346** als PDF.

Läuft auf **macOS, Windows und Linux**. Die App ist für keine bestimmte Firma gebaut - im
Einrichtungsassistenten trägst du dein eigenes Firmenprofil ein (Name, Logo, Ansprechpartner,
Grenzwerte). Es können beliebig viele Firmenprofile angelegt und gewechselt werden.

## Funktionsumfang

- Kundenliste per SharePoint-Excel oder CSV importieren
- USB-Stick / Messordner mit `.sor`-Dateien einlesen - automatischer Abgleich per Job-ID
- Live-Vorschau des DIN-Protokolls, Werte pro Kunde manuell nachbearbeiten
- Einzel- oder Stapel-PDF-Export
- Mehrere Firmenprofile (Presets) zum schnellen Wechseln, z. B. bei mehreren Auftraggebern
- Helles/dunkles Design, freie Akzentfarbe, eigenes Firmenlogo
- Prüft beim Start automatisch auf neue Versionen (GitHub Releases)

## Installation

Fertige Installer für macOS (`.dmg`), Windows (`.exe`) und Linux (`.AppImage` / `.deb`) findest du unter
[Releases](https://github.com/DerJanniku/otdr-studio/releases). Einfach die passende Datei herunterladen
und ausführen.

> **Hinweis (macOS/Windows):** Die App ist aktuell nicht kostenpflichtig code-signiert. Beim ersten
> Start warnt das Betriebssystem ggf. vor einer "nicht verifizierten" App - das ist normal bei
> quelloffener Software ohne teures Signaturzertifikat. Auf dem Mac: Rechtsklick auf die App →
> "Öffnen" → "Öffnen" bestätigen. Unter Windows: "Weitere Informationen" → "Trotzdem ausführen".

Beim allerersten Start öffnet sich automatisch ein **Einrichtungsassistent**, der dich durch die
Firmenprofil-Einrichtung führt (Firmenname, Kontakt, Standard-Messtechniker, Farbschema, optionales
Logo). Diesen Assistenten kannst du jederzeit über den Button "Setup-Assistent" in der oberen
Menüleiste erneut öffnen, z. B. um ein weiteres Firmenprofil anzulegen.

## Selbst bauen (Entwicklung)

Voraussetzung: [Node.js](https://nodejs.org) 20+.

```bash
git clone https://github.com/DerJanniku/otdr-studio.git
cd otdr-studio
npm install

# Entwicklungsmodus (Hot Reload)
npm run dev

# Produktions-Build für die eigene Plattform
npm run build:mac    # macOS -> release/*.dmg
npm run build:win    # Windows -> release/*.exe
npm run build:linux  # Linux -> release/*.AppImage, *.deb

# Typprüfung
npm run typecheck
```

## Automatische Updates

Die App prüft beim Start über die GitHub-Releases-API, ob eine neuere Version veröffentlicht wurde,
und zeigt in dem Fall einen Hinweis-Banner mit Download-Link an. Es wird nichts automatisch im
Hintergrund installiert - du entscheidest selbst, wann du aktualisierst.

Abhängigkeiten werden im Repository über [Dependabot](.github/dependabot.yml) automatisch aktuell
gehalten: Dependabot öffnet Pull Requests für veraltete npm-Pakete, die CI-Pipeline baut und prüft sie
automatisch, und bei grünem Ergebnis werden sie automatisch gemergt (siehe
[.github/workflows](.github/workflows)).

## Mitmachen (Contributing)

Issues und Pull Requests sind willkommen. Bitte kurz beschreiben, was geändert wurde und warum.

## Lizenz

Veröffentlicht unter der [GNU General Public License v3.0](LICENSE). Du darfst die Software frei
nutzen, verändern und weitergeben - abgeleitete Werke müssen ebenfalls unter der GPLv3 stehen.
