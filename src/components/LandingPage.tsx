import React from 'react';
import {
  FileSearch,
  BookCheck,
  Tag,
  MessageSquareText,
  Languages,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Clock,
  SearchSlash,
  ShieldCheck,
  Upload,
  Cpu,
  Compass,
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../locales/translations';

interface LandingPageProps {
  language: Language;
  onStartAnalyzing: () => void;
  onLoadSample: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  language,
  onStartAnalyzing,
  onLoadSample,
}) => {
  const t = translations[language];
  const isAr = language === 'ar';

  const featureIcons: Record<string, React.ReactNode> = {
    structured: <FileSearch className="w-6 h-6 text-[#3F3D9E] dark:text-indigo-400" />,
    page_evidence: <BookCheck className="w-6 h-6 text-[#14B8A6] dark:text-teal-400" />,
    labels: <Tag className="w-6 h-6 text-amber-500 dark:text-amber-400" />,
    qa: <MessageSquareText className="w-6 h-6 text-[#3F3D9E] dark:text-indigo-400" />,
    bilingual: <Languages className="w-6 h-6 text-[#14B8A6] dark:text-teal-400" />,
    export: <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
  };

  const stepIcons = [
    <Upload className="w-6 h-6 text-[#3F3D9E] dark:text-indigo-400" />,
    <Cpu className="w-6 h-6 text-[#14B8A6] dark:text-teal-400" />,
    <Compass className="w-6 h-6 text-amber-500 dark:text-amber-400" />,
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-indigo-50/60 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(#3F3D9E_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] dark:opacity-[0.08]" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100/80 dark:bg-indigo-950/80 border border-indigo-200/70 dark:border-indigo-800 text-xs sm:text-sm font-semibold text-[#3F3D9E] dark:text-indigo-300 mb-6 shadow-xs animate-fade-in">
            <Sparkles className="w-4 h-4 text-[#14B8A6]" />
            <span>{isAr ? 'منصة الفحص الأكاديمي والتحكيم المنهجي' : 'Next-Gen Academic Peer-Review Platform'}</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-5 leading-tight sm:leading-tight">
            {t.appName}
            <span className="block text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#3F3D9E] via-[#343285] to-[#14B8A6] dark:from-indigo-400 dark:to-teal-300 bg-clip-text text-transparent mt-2">
              {t.tagline}
            </span>
          </h1>

          {/* One-sentence description */}
          <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed font-normal">
            {t.heroDescription}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
            <button
              onClick={onStartAnalyzing}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-[#3F3D9E] hover:bg-[#343285] text-white text-base sm:text-lg font-bold shadow-lg shadow-[#3F3D9E]/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <span>{t.startAnalyzing}</span>
              {isAr ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            </button>

            <button
              onClick={onLoadSample}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-sm sm:text-base font-semibold shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#14B8A6]" />
              <span>{t.trySamplePaper}</span>
            </button>
          </div>

          {/* Quick stats or assurance pill */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#14B8A6]" />
              <span>{isAr ? 'أدلة موثقة بنص واقتباس الصفحة' : 'Page-level verified citations'}</span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'فصل صريح بين النص والاستنتاج' : 'Explicit vs. Inferred tags'}</span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-[#3F3D9E] dark:text-indigo-400" />
              <span>{isAr ? 'عربي بالكامل ومطابق للأكاديمية' : 'Full Arabic & English support'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
              {t.problemTitle}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
              {t.problemSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {t.problemPoints.map((point, index) => {
              const icons = [
                <Clock className="w-6 h-6 text-rose-500" />,
                <SearchSlash className="w-6 h-6 text-amber-500" />,
                <ShieldCheck className="w-6 h-6 text-indigo-500" />,
              ];
              return (
                <div
                  key={index}
                  className="p-6 sm:p-7 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:shadow-md transition-shadow duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-700 shadow-xs flex items-center justify-center mb-5">
                    {icons[index % icons.length]}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2.5">
                    {point.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {point.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid (6 Cards) */}
      <section className="py-16 md:py-24 bg-slate-50/70 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
              {t.featuresTitle}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
              {t.featuresSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {t.features.map((feature) => (
              <div
                key={feature.id}
                className="group p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
                  {featureIcons[feature.id]}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works (3 Steps) */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
              {t.howItWorksTitle}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
              {t.howItWorksSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {t.steps.map((step, idx) => (
              <div
                key={step.num}
                className="relative p-6 sm:p-7 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col items-center text-center shadow-xs"
              >
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-700 shadow-md flex items-center justify-center mb-5 text-[#3F3D9E] dark:text-teal-400">
                  {stepIcons[idx]}
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#3F3D9E]/10 dark:bg-indigo-950 text-[#3F3D9E] dark:text-indigo-300 mb-3">
                  {step.num}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <button
              onClick={onStartAnalyzing}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#3F3D9E] hover:bg-[#343285] text-white font-bold text-base shadow-md shadow-[#3F3D9E]/25 transition-all cursor-pointer hover:shadow-lg"
            >
              <span>{t.startAnalyzing}</span>
              {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-900 text-slate-400 border-t border-slate-800 text-center text-xs sm:text-sm no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#3F3D9E] flex items-center justify-center text-white text-xs font-bold">
              P
            </div>
            <span className="font-bold text-white">PaperMind AI</span>
          </div>
          <p className="text-slate-400 font-medium">
            {t.footerNote}
          </p>
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} PaperMind AI
          </div>
        </div>
      </footer>
    </div>
  );
};
