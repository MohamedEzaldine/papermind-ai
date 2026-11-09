/**
 * Picks the right local AI model for the computer the app runs on.
 *
 * Analysis speed depends mostly on whether a graphics card (GPU) can run the model.
 * Without one, a 7B model can take an hour per paper on a typical laptop, so the
 * recommendation favors smaller models on CPU-only machines.
 */
import { execFile } from 'node:child_process';
import os from 'node:os';

export type TierId = 'fast' | 'balanced' | 'accurate';

export interface Tier {
  id: TierId;
  model: string;
  /** Approximate download size in GB. */
  sizeGB: number;
  /** Minimum RAM in GB to run it comfortably. */
  minRamGB: number;
}

/** The three analysis modes offered to users, from fastest to most accurate. */
export const TIERS: Tier[] = [
  { id: 'fast', model: 'qwen2.5:1.5b', sizeGB: 1.0, minRamGB: 4 },
  { id: 'balanced', model: 'qwen2.5:3b', sizeGB: 1.9, minRamGB: 8 },
  { id: 'accurate', model: 'qwen2.5:7b', sizeGB: 4.7, minRamGB: 12 },
];

export interface Hardware {
  ramGB: number;
  cpuCores: number;
  gpu: { name: string; vramGB: number } | null;
}

let cached: Promise<Hardware> | null = null;

/** Detect RAM, CPU cores and an NVIDIA GPU (via nvidia-smi). Apple Silicon counts as a GPU. */
export function detectHardware(): Promise<Hardware> {
  if (cached) return cached;
  cached = (async () => {
    const ramGB = Math.round((os.totalmem() / 1024 ** 3) * 10) / 10;
    const cpuCores = os.cpus().length;
    let gpu: Hardware['gpu'] = null;
    if (process.platform === 'darwin' && process.arch === 'arm64') {
      gpu = { name: 'Apple Silicon', vramGB: Math.round(ramGB * 0.6) };
    } else {
      gpu = await new Promise((resolve) => {
        execFile(
          'nvidia-smi',
          ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'],
          { timeout: 4000, windowsHide: true },
          (err, stdout) => {
            if (err || !stdout.trim()) return resolve(null);
            const [name, mem] = stdout.trim().split('\n')[0].split(',').map((x) => x.trim());
            const vramGB = Math.round((Number(mem) / 1024) * 10) / 10;
            resolve(Number.isFinite(vramGB) ? { name, vramGB } : null);
          }
        );
      });
    }
    return { ramGB, cpuCores, gpu };
  })();
  return cached;
}

/** Recommend a mode for this computer. */
export function recommendTier(hw: Hardware): TierId {
  if (hw.gpu && hw.gpu.vramGB >= 6 && hw.ramGB >= 12) return 'accurate';
  if (hw.ramGB >= 8) return 'balanced';
  return 'fast';
}

/** Models to try, best match for this computer first. */
export function preferredModels(hw: Hardware): string[] {
  const rec = recommendTier(hw);
  const order: TierId[] = rec === 'accurate' ? ['accurate', 'balanced', 'fast'] : rec === 'balanced' ? ['balanced', 'fast', 'accurate'] : ['fast', 'balanced', 'accurate'];
  return order.map((id) => TIERS.find((t) => t.id === id)!.model);
}
