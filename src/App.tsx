import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { UploadPage } from './components/UploadPage';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { AskPaperDrawer } from './components/AskPaperDrawer';
import { Language, PageView, AnalysisResult, ChatMessage } from './types';

export default function App() {
  // 1. Language state: default Arabic ('ar') as required
  const [language, setLanguage] = useState<Language>('ar');

  // 2. Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('papermind_dark') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
    return false;
  });

  // 3. Navigation and Analysis states
  const [currentPage, setCurrentPage] = useState<PageView>('landing');
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [rawPdfBase64, setRawPdfBase64] = useState<string | null>(null);

  // 4. Q&A Chat drawer state & history
  const [isAskDrawerOpen, setIsAskDrawerOpen] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Sync language and RTL/LTR direction
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title =
      language === 'ar'
        ? 'PaperMind AI — افهم أي ورقة بحثية بعمق، وبالدليل الموثق'
        : 'PaperMind AI — Understand any research paper — deeply, with evidence';
  }, [language]);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('papermind_dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('papermind_dark', 'false');
    }
  }, [darkMode]);

  // Toggle language handler
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
  };

  // Toggle dark mode handler
  const handleToggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Analysis complete handler from real PDF upload
  const handleAnalysisComplete = (result: AnalysisResult, base64?: string) => {
    setAnalysisData(result);
    setRawPdfBase64(base64 || null);
    setChatHistory([]); // Reset chat for new paper
    setCurrentPage('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Analyze another paper
  const handleAnalyzeAnother = () => {
    setCurrentPage('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${
        language === 'ar' ? 'font-cairo' : 'font-inter'
      }`}
    >
      {/* Global Header */}
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        currentPage={currentPage}
        onNavigate={(page) => {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        hasActivePaper={!!analysisData}
      />

      {/* Main Pages */}
      <main>
        {currentPage === 'landing' && (
          <LandingPage
            language={language}
            onStartAnalyzing={() => setCurrentPage('upload')}
          />
        )}

        {currentPage === 'upload' && (
          <UploadPage
            language={language}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {currentPage === 'dashboard' && analysisData && (
          <AnalysisDashboard
            data={analysisData}
            language={language}
            onOpenAskDrawer={() => setIsAskDrawerOpen(true)}
            onAnalyzeAnother={handleAnalyzeAnother}
          />
        )}
      </main>

      {/* Ask the Paper Q&A Side Drawer */}
      <AskPaperDrawer
        isOpen={isAskDrawerOpen}
        onClose={() => setIsAskDrawerOpen(false)}
        language={language}
        paperTitle={analysisData?.overview?.title || ''}
        pdfBase64={rawPdfBase64}
        chatHistory={chatHistory}
        onUpdateChatHistory={setChatHistory}
      />
    </div>
  );
}
