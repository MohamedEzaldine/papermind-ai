import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  Sparkles,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileSearch,
  Layers,
  Award,
} from 'lucide-react';
import { Language, AnalysisResult } from '../types';
import { translations } from '../locales/translations';
import { AnalysisModePicker } from './AnalysisModePicker';

interface UploadPageProps {
  language: Language;
  onAnalysisComplete: (result: AnalysisResult, rawBase64?: string) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({
  language,
  onAnalysisComplete,
}) => {
  const t = translations[language];
  const isAr = language === 'ar';

  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  // Real progress streamed by the server while the model works.
  const [progress, setProgress] = useState<{
    stage: 'extract' | 'reading' | 'writing';
    percent: number;
    etaSeconds: number | null;
    sectionsDone: number;
    pages?: number;
  }>({ stage: 'extract', percent: 2, etaSeconds: null, sectionsDone: 0 });
  // Which installed local model to use (remembered on this device; also used by Ask the Paper).
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      return localStorage.getItem('papermind_model') || '';
    } catch {
      return '';
    }
  });

  // Elapsed-time counter while analyzing, so long local runs never look frozen.
  useEffect(() => {
    if (!isAnalyzing) return;
    setElapsed(0);
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isAnalyzing]);

  const [engine, setEngine] = useState<{ provider: string; model: string; ready: boolean; running?: boolean; models?: string[] } | null>(null);

  // Ask the server which AI engine is active (local Ollama or Gemini) so the user knows what to expect.
  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setEngine(d))
      .catch(() => {});
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageTimerRef = useRef<any>(null);

  const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage(null);

    // Validate type: must be PDF
    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      setErrorMessage(t.errorInvalidType);
      return;
    }

    // Validate size: max 20 MB
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(t.errorTooLarge);
      return;
    }

    setFile(selectedFile);

    // Read as base64
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileBase64(result);
    };
    reader.onerror = () => {
      setErrorMessage(t.errorApiFailure);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileBase64(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleStartAnalysis = async () => {
    if (!file || !fileBase64) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setCurrentStage(1);
    setProgress({ stage: 'extract', percent: 2, etaSeconds: null, sectionsDone: 0 });

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64: fileBase64,
          language,
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          model: engine?.provider === 'ollama' && selectedModel ? selectedModel : undefined,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t.errorApiFailure);
      }

      // The server streams one JSON event per line: stage / progress / result / error.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result: AnalysisResult | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === 'stage') {
            setCurrentStage(ev.stage === 'extract' ? 1 : ev.stage === 'reading' ? 2 : 3);
            setProgress((p) => ({
              ...p,
              stage: ev.stage,
              pages: ev.pages ?? p.pages,
              percent: ev.stage === 'reading' ? 6 : ev.stage === 'writing' ? Math.max(p.percent, 10) : p.percent,
            }));
          } else if (ev.type === 'progress') {
            setCurrentStage(3);
            setProgress((p) => ({
              ...p,
              stage: 'writing',
              percent: ev.percent,
              etaSeconds: ev.etaSeconds,
              sectionsDone: ev.sectionsDone,
            }));
          } else if (ev.type === 'result') {
            result = ev.data;
          } else if (ev.type === 'error') {
            throw new Error(ev.error || t.errorApiFailure);
          }
        }
      }

      if (!result) throw new Error(t.errorApiFailure);
      setProgress((p) => ({ ...p, percent: 100, etaSeconds: 0 }));
      setIsAnalyzing(false);
      onAnalysisComplete(result, fileBase64);
    } catch (err: any) {
      setIsAnalyzing(false);
      console.error('Analysis error:', err);
      setErrorMessage(err.message || t.errorApiFailure);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (language === 'ar') return m > 0 ? `${m} دقيقة${sec >= 30 ? ' ونصف' : ''}` : `${sec} ثانية`;
    return m > 0 ? `${m} min${sec >= 30 ? ' 30 s' : ''}` : `${sec} s`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      {/* Title & Subtitle */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
          {t.uploadTitle}
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          {t.uploadSubtitle}
        </p>
        {engine && (
          <div
            className={`mt-4 inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
              engine.ready
                ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${engine.ready ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {engine.provider === 'ollama'
              ? language === 'ar'
                ? engine.ready
                  ? `يعمل محلياً على جهازك (Ollama · ${selectedModel || engine.model})`
                  : engine.running === false
                  ? 'محرك الذكاء الاصطناعي المحلي (Ollama) لا يعمل — افتحه من قائمة ابدأ'
                  : `لا يوجد نموذج مثبت في Ollama — ثبّت ${engine.model}`
                : engine.ready
                  ? `Running locally on your device (Ollama · ${selectedModel || engine.model})`
                  : engine.running === false
                    ? 'The local AI engine (Ollama) is not running — open it from the Start menu'
                    : `No model installed in Ollama — install ${engine.model}`
              : language === 'ar'
                ? `محرك التحليل: Gemini (${engine.model})`
                : `Analysis engine: Gemini (${engine.model})`}
          </div>
        )}
        {engine?.provider === 'ollama' && (
          <AnalysisModePicker
            language={language}
            disabled={isAnalyzing}
            selectedModel={selectedModel}
            onSelect={(m) => {
              setSelectedModel(m);
              try {
                localStorage.setItem('papermind_model', m);
              } catch {
                /* storage unavailable */
              }
            }}
          />
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-xs animate-shake">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{errorMessage}</p>
          </div>
          <button
            onClick={() => {
              setErrorMessage(null);
              if (file && fileBase64) handleStartAnalysis();
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.tryAgain}</span>
          </button>
        </div>
      )}

      {/* Upload Zone Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md p-6 sm:p-10 mb-8 transition-all">
        {!file ? (
          /* Dropzone */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
              isDragging
                ? 'border-[#14B8A6] bg-teal-50/60 dark:bg-teal-950/30 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-600 hover:border-[#3F3D9E] dark:hover:border-indigo-400 bg-slate-50/60 dark:bg-slate-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#3F3D9E] dark:text-indigo-400 flex items-center justify-center mb-5 shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {t.dragDropText}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
              {t.pdfOnlyNote}
            </p>

            <button
              type="button"
              className="px-6 py-2.5 rounded-xl bg-[#3F3D9E] hover:bg-[#343285] text-white font-semibold text-sm shadow-md shadow-[#3F3D9E]/20 transition-all pointer-events-none"
            >
              {t.selectPdfBtn}
            </button>
          </div>
        ) : (
          /* Selected File Card */
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatFileSize(file.size)} • PDF Document
                  </p>
                </div>
              </div>

              {!isAnalyzing && (
                <button
                  onClick={handleRemoveFile}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0"
                  title={t.removeFile}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Analysis Progress (when analyzing) */}
            {isAnalyzing && (
              <div className="p-6 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-4">
                <div className="flex items-center justify-between text-sm font-semibold text-[#3F3D9E] dark:text-indigo-300">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#14B8A6]" />
                    {progress.stage === 'extract' && t.stages.stage1}
                    {progress.stage === 'reading' &&
                      (isAr
                        ? `النموذج يقرأ الورقة${progress.pages ? ` (${progress.pages} صفحات)` : ''}…`
                        : `The model is reading the paper${progress.pages ? ` (${progress.pages} pages)` : ''}…`)}
                    {progress.stage === 'writing' &&
                      (isAr
                        ? `جارِ كتابة التحليل — القسم ${Math.min(10, progress.sectionsDone + 1)} من 10`
                        : `Writing the analysis — section ${Math.min(10, progress.sectionsDone + 1)} of 10`)}
                  </span>
                  <span className="text-sm font-extrabold text-[#3F3D9E] dark:text-indigo-300 tabular-nums">
                    {progress.percent}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r from-[#3F3D9E] to-[#14B8A6] rounded-full transition-all duration-700 ease-out ${
                      progress.stage === 'reading' ? 'animate-pulse' : ''
                    }`}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>

                {/* Stage Indicators */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                  <div
                    className={`flex items-center gap-1.5 font-medium ${
                      currentStage >= 1 ? 'text-[#3F3D9E] dark:text-indigo-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <FileSearch className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{isAr ? 'قراءة الملف' : 'Read PDF'}</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 font-medium ${
                      currentStage >= 2 ? 'text-[#3F3D9E] dark:text-indigo-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{isAr ? 'استخراج الأدلة' : 'Extract Loci'}</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 font-medium ${
                      currentStage >= 3 ? 'text-[#3F3D9E] dark:text-indigo-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{isAr ? 'التقييم الأكاديمي' : 'Peer Review'}</span>
                  </div>
                </div>

                {/* Elapsed time, with a reassurance note for the local engine */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="tabular-nums">
                    {isAr ? 'المنقضي: ' : 'Elapsed: '}
                    <span className="font-mono" dir="ltr">
                      {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
                    </span>
                  </span>
                  <span className="font-semibold text-[#3F3D9E] dark:text-indigo-300">
                    {progress.stage === 'writing' && progress.etaSeconds != null
                      ? isAr
                        ? `المتبقي تقريباً: ${formatDuration(progress.etaSeconds)}`
                        : `About ${formatDuration(progress.etaSeconds)} left`
                      : progress.stage === 'reading' && engine?.provider === 'ollama' && elapsed >= 20
                        ? isAr
                          ? 'قراءة الورقة قد تستغرق بضع دقائق على الأجهزة بدون كارت شاشة'
                          : 'Reading can take a few minutes on computers without a graphics card'
                        : progress.stage === 'writing'
                          ? isAr
                            ? 'جارِ حساب الوقت المتبقي…'
                            : 'Estimating time left…'
                          : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div>
              <button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className={`w-full py-4 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer ${
                  isAnalyzing
                    ? 'bg-slate-400 cursor-not-allowed text-white shadow-none'
                    : 'bg-[#3F3D9E] hover:bg-[#343285] text-white shadow-[#3F3D9E]/30 hover:shadow-xl'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{t.analyzingBtn}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-[#14B8A6]" />
                    <span>{t.analyzeBtn}</span>
                    {isAr ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
