import React from 'react';
import { BookOpen, Sparkles, Moon, Sun, Globe, ArrowRight, ArrowLeft } from 'lucide-react';
import { Language, PageView } from '../types';
import { translations } from '../locales/translations';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  hasActivePaper: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  darkMode,
  onToggleDarkMode,
  currentPage,
  onNavigate,
  hasActivePaper,
}) => {
  const t = translations[language];
  const isAr = language === 'ar';

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-200 bg-white/90 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 text-left rtl:text-right group cursor-pointer focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3F3D9E] to-[#14B8A6] flex items-center justify-center text-white shadow-md shadow-[#3F3D9E]/20 group-hover:scale-105 transition-transform duration-200">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                PaperMind
              </span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-[#14B8A6] border border-teal-200 dark:border-teal-800">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              {language === 'ar' ? 'فهم عميق للأوراق العلمية بالدليل' : 'Deep evidence-based paper analysis'}
            </p>
          </div>
        </button>

        {/* Center Navigation if on other pages */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl text-sm font-medium">
          <button
            onClick={() => onNavigate('landing')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              currentPage === 'landing'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isAr ? 'الرئيسية' : 'Home'}
          </button>
          <button
            onClick={() => onNavigate('upload')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              currentPage === 'upload'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isAr ? 'رفع ورقة بحثية' : 'Upload Paper'}
          </button>
          {hasActivePaper && (
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                currentPage === 'dashboard'
                  ? 'bg-white dark:bg-slate-700 text-[#3F3D9E] dark:text-teal-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
              {isAr ? 'لوحة التحليل' : 'Dashboard'}
            </button>
          )}
        </nav>

        {/* Right side controls: Language toggle & Dark mode */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Toggle */}
          <button
            onClick={() => onLanguageChange(language === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all cursor-pointer shadow-xs"
            title={language === 'ar' ? 'Switch to English' : 'التحويل إلى اللغة العربية'}
          >
            <Globe className="w-4 h-4 text-[#14B8A6]" />
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all cursor-pointer shadow-xs"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Start CTA if on landing */}
          {currentPage === 'landing' && (
            <button
              onClick={() => onNavigate('upload')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3F3D9E] hover:bg-[#343285] text-white font-medium text-xs sm:text-sm shadow-md shadow-[#3F3D9E]/20 transition-all cursor-pointer hover:shadow-lg"
            >
              <span>{t.startAnalyzing}</span>
              {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
