// PaperMind AI desktop app: starts the bundled server on this computer and opens it in a window.
import { app, BrowserWindow, dialog, shell } from 'electron';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Run fully local: Ollama engine, server reachable only from this machine, random free port.
process.env.NODE_ENV = 'production';
process.env.AI_PROVIDER = process.env.AI_PROVIDER || 'ollama';
process.env.HOST = '127.0.0.1';
process.env.PORT = '0';
process.env.PAPERMIND_DIST = path.join(here, '..', 'dist');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

async function ollamaRunning() {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

/** Find ollama.exe in its default install folder or on PATH. */
function ollamaExecutable() {
  const local = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe');
  if (local && existsSync(local)) return local;
  return 'ollama';
}

/** Start Ollama in the background if it is installed but not running. */
async function ensureOllama() {
  if (await ollamaRunning()) return true;
  try {
    const child = spawn(ollamaExecutable(), ['serve'], { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    return false;
  }
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await ollamaRunning()) return true;
  }
  return false;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win;
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    const ollamaOk = await ensureOllama();
    const { serverReady } = await import('./server.mjs');
    const port = await serverReady;

    win = new BrowserWindow({
      width: 1360,
      height: 900,
      minWidth: 900,
      minHeight: 600,
      title: 'PaperMind AI',
      icon: path.join(here, '..', 'build', 'icon.png'),
      autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, sandbox: true },
    });
    // Open external links in the user's browser, not inside the app.
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
    await win.loadURL(`http://127.0.0.1:${port}/`);

    if (!ollamaOk) {
      dialog.showMessageBox(win, {
        type: 'warning',
        title: 'PaperMind AI',
        message: 'تعذر تشغيل Ollama (النموذج المحلي).\nCould not start Ollama (the local AI engine).',
        detail:
          'أعد تثبيت البرنامج أو ثبّت Ollama من ollama.com ثم أعد فتح PaperMind AI.\nReinstall PaperMind AI, or install Ollama from ollama.com, then reopen the app.',
      });
    }
  });

  app.on('window-all-closed', () => app.quit());
}
