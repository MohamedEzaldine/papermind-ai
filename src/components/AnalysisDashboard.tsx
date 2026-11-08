import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  MessageSquare,
  RefreshCw,
  BookOpen,
  Calendar,
  Building,
  GraduationCap,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Tag,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { AnalysisResult, Language, AnalysisPoint } from '../types';
import { translations } from '../locales/translations';
import { exportToExcel } from '../utils/exportExcel';

interface AnalysisDashboardProps {
  data: AnalysisResult;
  language: Language;
  onOpenAskDrawer: () => void;
  onAnalyzeAnother: () => void;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  data,
  language,
  onOpenAskDrawer,
  onAnalyzeAnother,
}) => {
  const t = translations[language];
  const isAr = language === 'ar';

  const [activeSectionId, setActiveSectionId] = useState<number>(1);
  const [expandedQuotes, setExpandedQuotes] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Toggle quote visibility
  const toggleQuote = (pointId: string) => {
    setExpandedQuotes((prev) => ({
      ...prev,
      [pointId]: !prev[pointId],
    }));
  };

  // Copy quote or text
  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle PDF Export via window.print()
  const handleExportPdf = () => {
    window.print();
  };

  // Scroll to section
  const scrollToSection = (id: number) => {
    setActiveSectionId(id);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Observe active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = data.sections.map((sec) =>
        document.getElementById(`section-${sec.id}`)
      );

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 180) {
            setActiveSectionId(data.sections[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [data.sections]);

  // Render a single analytical point
  const renderPoint = (point: AnalysisPoint) => {
    const isExpanded = !!expandedQuotes[point.id];
    const isCopied = copiedId === point.id;

    return (
      <div
        key={point.id}
        className="p-4 sm:p-5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-150 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Metadata Badges: Page and Type */}
          <div className="flex items-center gap-2">
            {/* Page Badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#3F3D9E]/10 dark:bg-indigo-950/80 text-[#3F3D9E] dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
              <FileText className="w-3 h-3" />
              <span>
                {t.pageBadge} {point.page}
              </span>
            </span>

            {/* Evidence Type Badge */}
            {point.type === 'explicit' ? (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                title={t.explicitDesc}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{t.explicitBadge}</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100/80 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                title={t.inferredDesc}
              >
                <HelpCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>{t.inferredBadge}</span>
              </span>
            )}
          </div>

          {/* Copy Button */}
          <button
            onClick={() => copyText(point.text, point.id)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer text-xs flex items-center gap-1"
            title="Copy point text"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Main Point Text */}
        <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
          {point.text}
        </p>

        {/* Supporting Quote (Collapsible) */}
        {point.quote && (
          <div className="pt-1">
            <button
              onClick={() => toggleQuote(point.id)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14B8A6] dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors cursor-pointer"
            >
              <span>{isExpanded ? t.hideQuote : t.showQuote}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isExpanded && (
              <div className="mt-2.5 p-3 sm:p-3.5 rounded-lg bg-teal-50/70 dark:bg-teal-950/30 border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#14B8A6] text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic relative">
                <p className="leading-relaxed font-serif">"{point.quote}"</p>
                <div className="mt-1 text-[11px] not-italic text-teal-700 dark:text-teal-400 font-sans font-semibold">
                  — {isAr ? 'اقتباس مباشر من الورقة' : 'Direct quote from manuscript'} ({t.pageBadge} {point.page})
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Action Bar (Buttons) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 no-print">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isAr ? 'التقرير الأكاديمي' : 'Paper Dossier'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
            {data.fileName}
          </span>
        </div>

        {/* 4 Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Export Excel */}
          <button
            onClick={() => exportToExcel(data, language)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
            title="Download multi-sheet Excel spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.exportExcel}</span>
          </button>

          {/* Export PDF (Print) */}
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
            title="Print-friendly PDF view"
          >
            <Printer className="w-4 h-4" />
            <span>{t.exportPdf}</span>
          </button>

          {/* Ask the Paper */}
          <button
            onClick={onOpenAskDrawer}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3F3D9E] hover:bg-[#343285] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#3F3D9E]/20 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-[#14B8A6]" />
            <span>{t.askPaper}</span>
          </button>

          {/* Analyze Another */}
          <button
            onClick={onAnalyzeAnother}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.analyzeAnother}</span>
          </button>
        </div>
      </div>

      {/* Top Summary Bar (Paper Dossier Card) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md p-6 sm:p-8 mb-8 print-break-inside-avoid">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight mb-4">
          {data.overview.title}
        </h1>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4 border-y border-slate-100 dark:border-slate-700/80 mb-5 text-xs sm:text-sm">
          {/* Authors */}
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-[#3F3D9E] dark:text-indigo-400" />
              {t.authorsLabel}
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              {data.overview.authors && data.overview.authors.length > 0
                ? data.overview.authors.join(', ')
                : isAr ? 'غير محدد' : 'Not specified'}
            </p>
          </div>

          {/* Year */}
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#14B8A6]" />
              {t.yearLabel}
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              {data.overview.year || (isAr ? 'غير محدد' : 'N/A')}
            </p>
          </div>

          {/* Venue / Journal */}
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-amber-500" />
              {t.venueLabel}
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              {data.overview.venue || (isAr ? 'غير محدد' : 'Preprint / Unknown')}
            </p>
          </div>

          {/* Discipline / Field */}
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-purple-500" />
              {t.fieldLabel}
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              {data.overview.field || (isAr ? 'علوم الحاسب والذكاء الاصطناعي' : 'Computer Science')}
            </p>
          </div>
        </div>

        {/* 2-3 sentence executive summary */}
        <div>
          <span className="text-xs font-bold text-[#3F3D9E] dark:text-indigo-400 uppercase tracking-wide block mb-1.5">
            {t.summaryLabel}
          </span>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            {data.overview.summary}
          </p>
        </div>
      </div>

      {/* Main Layout: Sidebar Navigation + 10 Section Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Navigation (Desktop) / Tab Bar (Mobile) */}
        <aside className="lg:col-span-3 sticky top-20 z-20 no-print">
          {/* Mobile horizontal scrollable tabs */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
            {data.sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeSectionId === sec.id
                    ? 'bg-[#3F3D9E] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {sec.id}. {sec.title}
              </button>
            ))}
          </div>

          {/* Desktop vertical sidebar card */}
          <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 px-2">
              {t.sectionsTitle}
            </h3>
            <nav className="space-y-1">
              {data.sections.map((sec) => {
                const isActive = activeSectionId === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-between group ${
                      isActive
                        ? 'bg-gradient-to-r from-[#3F3D9E] to-[#343285] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-mono text-xs opacity-75 mr-1.5 rtl:mr-0 rtl:ml-1.5">
                        {sec.id}.
                      </span>
                      {sec.title}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-slate-200'
                      }`}
                    >
                      {sec.points.length}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* 10 Section Cards */}
        <main className="lg:col-span-9 space-y-6">
          {data.sections.map((section) => {
            const isCriticalEval = section.id === 9;
            const strengths = isCriticalEval
              ? section.points.filter((p) => p.category === 'strength')
              : [];
            const weaknesses = isCriticalEval
              ? section.points.filter((p) => p.category === 'weakness')
              : [];

            return (
              <section
                key={section.id}
                id={`section-${section.id}`}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-6 sm:p-7 scroll-mt-24 print-break-inside-avoid"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-700/80">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-[#3F3D9E] dark:text-indigo-400 font-extrabold text-sm flex items-center justify-center shrink-0">
                      {section.id}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      {section.title}
                    </h2>
                  </div>

                  <span className="text-xs text-slate-400 font-medium">
                    {section.points.length} {isAr ? 'أدلة / نقاط' : 'evidence points'}
                  </span>
                </div>

                {/* Section Content */}
                {section.isNotStated || section.points.length === 0 ? (
                  /* Not stated fallback */
                  <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start gap-3.5 text-slate-600 dark:text-slate-400">
                    <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {t.notStated}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.notStatedDesc}
                      </p>
                    </div>
                  </div>
                ) : isCriticalEval && (strengths.length > 0 || weaknesses.length > 0) ? (
                  /* Section 9: Critical Evaluation (Strengths & Weaknesses as two distinct lists) */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths List */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold text-sm">
                        <ThumbsUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{t.strengths} ({strengths.length})</span>
                      </div>
                      <div className="space-y-3">
                        {strengths.length > 0 ? (
                          strengths.map(renderPoint)
                        ) : (
                          <p className="text-xs text-slate-400 italic p-3">
                            {isAr ? 'لم تسجل نقاط قوة مستقلة' : 'No distinct strengths specified'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Weaknesses List */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-bold text-sm">
                        <ThumbsDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>{t.weaknesses} ({weaknesses.length})</span>
                      </div>
                      <div className="space-y-3">
                        {weaknesses.length > 0 ? (
                          weaknesses.map(renderPoint)
                        ) : (
                          <p className="text-xs text-slate-400 italic p-3">
                            {isAr ? 'لم تسجل نقاط ضعف أو قيود إضافية' : 'No distinct weaknesses specified'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard 1-8 and 10 Sections */
                  <div className="space-y-3.5">
                    {section.points.map(renderPoint)}
                  </div>
                )}
              </section>
            );
          })}
        </main>
      </div>
    </div>
  );
};
