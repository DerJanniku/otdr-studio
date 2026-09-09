import { app, BrowserWindow } from 'electron';
import { autoUpdater, type NsisUpdater } from 'electron-updater';

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'up-to-date'
  | 'error';

export interface UpdateState {
  phase: UpdatePhase;
  version?: string;
  percent?: number;
  bytesPerSecond?: number;
  message?: string;
  /** False on macOS and in development - the renderer then only offers the download link. */
  canSelfUpdate: boolean;
}

export class Updater {
  private static getWindow: (() => BrowserWindow | null) | null = null;
  private static state: UpdateState = { phase: 'idle', canSelfUpdate: false };

  // In-app updates only work on Windows here: Squirrel.Mac refuses to apply an update
  // unless the app carries a Developer ID signature, and our macOS builds are ad-hoc
  // signed. On macOS the renderer keeps offering the GitHub release link instead.
  // In development there is no update feed at all, so the updater stays off.
  public static get canSelfUpdate(): boolean {
    return app.isPackaged && process.platform === 'win32';
  }

  public static init(getWindow: () => BrowserWindow | null): void {
    this.getWindow = getWindow;
    this.state = { phase: 'idle', canSelfUpdate: this.canSelfUpdate };
    if (!this.canSelfUpdate) return;

    // The user decides when to download - a silent background download would eat the
    // mobile data of a technician working from a hotspot on site.
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Our Windows installers are not code-signed (no OV certificate), so there is no
    // publisherName to verify against. electron-updater currently skips verification in
    // that case, but that fail-open path is deprecated and becomes a hard failure in
    // electron-builder v28 - which would silently break updates for the field team.
    // Skipping explicitly keeps the behaviour stable across that upgrade.
    // Trade-off: anything published to the release feed is installed as-is, so the
    // GitHub account that publishes releases must stay protected (2FA).
    // Once an OV/EV certificate is available, drop this line and set `certificateFile`
    // in the electron-builder `win` config instead.
    (autoUpdater as NsisUpdater).verifyUpdateCodeSignature = async () => null;

    autoUpdater.on('checking-for-update', () => this.push({ phase: 'checking' }));

    autoUpdater.on('update-available', (info) =>
      this.push({ phase: 'available', version: info.version })
    );

    autoUpdater.on('update-not-available', () => this.push({ phase: 'up-to-date' }));

    autoUpdater.on('download-progress', (progress) =>
      this.push({
        phase: 'downloading',
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
      })
    );

    autoUpdater.on('update-downloaded', (info) =>
      this.push({ phase: 'downloaded', version: info.version })
    );

    autoUpdater.on('error', (err) => {
      console.error('Update error:', err);
      this.push({ phase: 'error', message: err?.message || String(err) });
    });
  }

  public static getState(): UpdateState {
    return this.state;
  }

  public static async check(): Promise<UpdateState> {
    if (!this.canSelfUpdate) return this.state;
    try {
      await autoUpdater.checkForUpdates();
    } catch (err: any) {
      this.push({ phase: 'error', message: err?.message || String(err) });
    }
    return this.state;
  }

  public static async download(): Promise<void> {
    if (!this.canSelfUpdate) return;
    try {
      await autoUpdater.downloadUpdate();
    } catch (err: any) {
      this.push({ phase: 'error', message: err?.message || String(err) });
    }
  }

  // Closes the app and runs the downloaded installer. Only call this once the state
  // reports 'downloaded', otherwise there is nothing on disk to install.
  public static install(): void {
    if (!this.canSelfUpdate || this.state.phase !== 'downloaded') return;
    autoUpdater.quitAndInstall();
  }

  private static push(partial: Partial<UpdateState>): void {
    this.state = { ...this.state, ...partial, canSelfUpdate: this.canSelfUpdate };
    this.getWindow?.()?.webContents.send('update-state', this.state);
  }
}
