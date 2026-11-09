import React, { useEffect, useState } from 'react';
import { Zap, Scale, Target, Download, Check, Cpu, Loader2 } from 'lucide-react';
import { Language } from '../types';

type TierId = 'fast' | 'balanced' | 'accurate';

interface Tier {
  id: TierId;
  model: string;
  sizeGB: number;
  minRamGB: number;
  installed: boolean;
}

interface ModelsInfo {
  provider: string;
  running?: boolean;
  hardware?: { ramGB: number; cpuCores: number; gpu: { name: string; vramGB: number } | null };
  recommended?: TierId;
  current?: string;
  tiers: Tier[];
}

interface Props {
  language: Language;
  disabled: boolean;
  selectedModel: string;
  onSelect: (model: string) => void;
}

const LABELS: Record<TierId, { ar: string; en: string; arDesc: string; enDesc: string; icon: React.ElementType }> = {
  fast: { ar: 'سريع', en: 'Fast', arDesc: 'للأجهزة الضعيفة — تحليل مختصر', enDesc: 'For modest PCs — brief analysis', icon: Zap },
  balanced: { ar: 'متوازن', en: 'Balanced', arDesc: 'أغلب الأجهزة — توازن بين السرعة والجودة', enDesc: 'Most PCs — speed and quality balanced', icon: Scale },
  accurate: { ar: 'دقيق', en: 'Accurate', arDesc: 'أجهزة بكارت شاشة — أعمق وأبطأ', enDesc: 'PCs with a graphics card — deeper, slower', icon: Target },
};

/**
 * Lets the user choose how the local AI analyzes papers: fast, balanced or accurate.
 * Recommends the mode that suits this computer, and downloads a mode's model on request.
 */
export const AnalysisModePicker: React.FC<Props> = ({ language, disabled, selectedModel, onSelect }) => {
  const isAr = language === 'ar';
  const [info, setInfo] = useState<ModelsInfo | null>(null);
  const [pulling, setPulling] = useState<{ tier: TierId; percent: number; doneMB?: number; totalMB?: number } | null>(null);
  const [pullError, setPullError] = useState<string | null>(null);

  const load = () =>
    fetch('/api/models')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ModelsInfo | null) => {
        if (!d || d.provider !== 'ollama') return;
        setInfo(d);
        // Pick a sensible default: the saved choice if installed, else the recommended mode, else any installed mode.
        const installed = d.tiers.filter((t) => t.installed);
        const saved = installed.find((t) => t.model === selectedModel);
        if (!saved && installed.length > 0) {
          const rec = installed.find((t) => t.id === d.recommended);
          onSelect((rec || installed[0]).model);
        }
      })
      .catch(() => {});

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async (tier: Tier) => {
    setPullError(null);
    setPulling({ tier: tier.id, percent: 0 });
    try {
      const res = await fetch('/api/models/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tier.id, language }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === 'progress') setPulling({ tier: tier.id, percent: ev.percent, doneMB: ev.doneMB, totalMB: ev.totalMB });
          if (ev.type === 'error') throw new Error(ev.error);
          if (ev.type === 'done') done = true;
        }
      }
      if (!done) throw new Error();
      onSelect(tier.model);
      await load();
    } catch (e: any) {
      setPullError(e?.message || (isAr ? 'تعذر تنزيل النموذج.' : 'Could not download the model.'));
    } finally {
      setPulling(null);
    }
  };

  if (!info || !info.running) return null;
  const hw = info.hardware;

  return (
    <div className="mt-5 max-w-3xl mx-auto text-start">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{isAr ? 'وضع التحليل' : 'Analysis mode'}</h2>
        {hw && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Cpu className="w-3.5 h-3.5" />
            {isAr ? `جهازك: ذاكرة ${Math.round(hw.ramGB)} جيجا` : `Your PC: ${Math.round(hw.ramGB)} GB RAM`}
            {' · '}
            {hw.gpu
              ? isAr
                ? `كارت شاشة ${hw.gpu.name} (${hw.gpu.vramGB} جيجا)`
                : `GPU ${hw.gpu.name} (${hw.gpu.vramGB} GB)`
              : isAr
                ? 'بدون كارت شاشة مدعوم'
                : 'no supported graphics card'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {info.tiers.map((tier) => {
          const L = LABELS[tier.id];
          const Icon = L.icon;
          const selected = tier.installed && tier.model === selectedModel;
          const recommended = tier.id === info.recommended;
          const tooBig = hw ? hw.ramGB < tier.minRamGB : false;
          const isPulling = pulling?.tier === tier.id;
          return (
            <div
              key={tier.id}
              role={tier.installed ? 'button' : undefined}
              tabIndex={tier.installed ? 0 : -1}
              aria-pressed={selected}
              onClick={() => tier.installed && !disabled && onSelect(tier.model)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && tier.installed && !disabled) onSelect(tier.model);
              }}
              className={`relative p-3 rounded-xl border text-xs transition-all ${
                selected
                  ? 'border-[#3F3D9E] bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-[#3F3D9E]/30'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              } ${tier.installed && !disabled ? 'cursor-pointer hover:border-[#3F3D9E]/60' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white">
                  <Icon className="w-4 h-4 text-[#14B8A6]" />
                  {isAr ? L.ar : L.en}
                </span>
                {selected && <Check className="w-4 h-4 text-[#3F3D9E] dark:text-indigo-300" />}
              </div>
              {recommended && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-bold text-[10px]">
                  {isAr ? 'موصى به لجهازك' : 'Recommended for your PC'}
                </span>
              )}
              <p className="mt-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">{isAr ? L.arDesc : L.enDesc}</p>
              <p className="mt-1 text-[10px] text-slate-400 font-mono" dir="ltr">
                {tier.model} · {tier.sizeGB} GB
              </p>

              {!tier.installed && (
                <div className="mt-2">
                  {isPulling ? (
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#3F3D9E] dark:text-indigo-300">
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {isAr ? 'جارِ التنزيل' : 'Downloading'}
                        </span>
                        <span className="tabular-nums">{pulling!.percent}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full bg-[#14B8A6] transition-all" style={{ width: `${pulling!.percent}%` }} />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={disabled || !!pulling}
                      onClick={(e) => {
                        e.stopPropagation();
                        download(tier);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isAr ? `تنزيل (${tier.sizeGB} جيجا)` : `Download (${tier.sizeGB} GB)`}
                    </button>
                  )}
                  {tooBig && !isPulling && (
                    <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400">
                      {isAr ? 'قد يكون بطيئاً جداً على هذا الجهاز' : 'May be very slow on this PC'}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {pullError && <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">{pullError}</p>}
    </div>
  );
};
