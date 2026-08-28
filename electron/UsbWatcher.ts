import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Polls OS-specific removable-media mount points and reports any volume that
// wasn't there on the previous tick, so a freshly inserted USB stick is
// picked up without the user having to open a folder picker.
export class UsbWatcher {
  private known = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private onNewVolume: (volumePath: string, volumeName: string) => void) {}

  public start(intervalMs = 2000) {
    this.known = new Set(this.listVolumes());
    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  public stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick() {
    const current = this.listVolumes();
    for (const volumePath of current) {
      if (!this.known.has(volumePath)) {
        this.onNewVolume(volumePath, path.basename(volumePath));
      }
    }
    this.known = new Set(current);
  }

  private listVolumes(): string[] {
    const results: string[] = [];
    try {
      if (process.platform === 'darwin') {
        const volumesDir = '/Volumes';
        if (fs.existsSync(volumesDir)) {
          for (const name of fs.readdirSync(volumesDir)) {
            if (name === 'Macintosh HD') continue;
            results.push(path.join(volumesDir, name));
          }
        }
      } else if (process.platform === 'win32') {
        for (let code = 65; code <= 90; code++) {
          const drive = `${String.fromCharCode(code)}:\\`;
          if (drive.toUpperCase() === 'C:\\') continue;
          if (fs.existsSync(drive)) results.push(drive);
        }
      } else {
        const username = os.userInfo().username;
        const candidateDirs = [`/media/${username}`, `/run/media/${username}`, '/media'];
        for (const dir of candidateDirs) {
          if (!fs.existsSync(dir)) continue;
          for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            try {
              if (fs.statSync(full).isDirectory()) results.push(full);
            } catch {
              // race during (un)mount - skip this entry for this tick
            }
          }
        }
      }
    } catch {
      // permission or race errors while listing - just skip this tick
    }
    return results;
  }
}
