import { exec } from "child_process";

export function openBrowser(url: string): void {
  const p = process.platform;
  const cmd =
    p === "win32" ? `start "" "${url}"` :
    p === "darwin" ? `open "${url}"` :
    `xdg-open "${url}" 2>/dev/null || sensible-browser "${url}" 2>/dev/null || true`;
  exec(cmd, () => {});
}
