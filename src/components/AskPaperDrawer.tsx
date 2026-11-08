import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Sparkles,
  BookOpen,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  CornerDownLeft,
} from 'lucide-react';
import { Language, ChatMessage } from '../types';
import { translations } from '../locales/translations';

interface AskPaperDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  paperTitle: string;
  pdfBase64?: string | null;
  chatHistory: ChatMessage[];
  onUpdateChatHistory: (messages: ChatMessage[]) => void;
}

export const AskPaperDrawer: React.FC<AskPaperDrawerProps> = ({
  isOpen,
  onClose,
  language,
  paperTitle,
  pdfBase64,
  chatHistory,
  onUpdateChatHistory,
}) => {
  const t = translations[language];
  const isAr = language === 'ar';

  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen, chatHistory]);

  if (!isOpen) return null;

  const handleSendMessage = async (questionText?: string) => {
    const textToSend = (questionText || inputQuestion).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const newHistory = [...chatHistory, userMessage];
    onUpdateChatHistory(newHistory);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64: pdfBase64 || undefined,
          language,
          question: textToSend,
          messages: chatHistory.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();

      const modelMessage: ChatMessage = {
        id: `msg_model_${Date.now()}`,
        role: 'model',
        text: data.text,
        citations: data.citations || [],
        isNotMentioned: data.isNotMentioned || false,
        timestamp: new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      onUpdateChatHistory([...newHistory, modelMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'model',
        text: isAr
          ? 'عذراً، حدث خطأ أثناء فحص الورقة. يرجى إعادة المحاولة.'
          : 'Sorry, an error occurred while searching the paper. Please try again.',
        timestamp: new Date().toLocaleTimeString(),
      };
      onUpdateChatHistory([...newHistory, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    onUpdateChatHistory([]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden no-print">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 max-w-full flex">
        <div className="w-screen max-w-md sm:max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full border-l rtl:border-l-0 rtl:border-r border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#3F3D9E] text-white flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {t.askDrawerTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {paperTitle || t.askDrawerSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {chatHistory.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title={t.clearchat}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title={t.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Academic Grounding Notice */}
          <div className="px-4 py-2.5 bg-teal-50 dark:bg-teal-950/40 border-b border-teal-100 dark:border-teal-900/50 text-[12px] text-teal-800 dark:text-teal-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
            <p className="leading-snug">{t.askPaperNotice}</p>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* If no messages yet, show starter questions */}
            {chatHistory.length === 0 ? (
              <div className="py-6 space-y-5 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-[#3F3D9E] dark:text-indigo-400 flex items-center justify-center">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    {t.askDrawerTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    {t.askDrawerSubtitle}
                  </p>
                </div>

                <div className="pt-2 text-left rtl:text-right">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 px-1">
                    {t.suggestedQuestionsTitle}
                  </p>
                  <div className="space-y-2">
                    {t.suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(q)}
                        className="w-full text-left rtl:text-right p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer flex items-center justify-between group"
                      >
                        <span>{q}</span>
                        <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#3F3D9E] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
                      msg.role === 'user'
                        ? 'bg-[#3F3D9E] text-white rounded-br-xs rtl:rounded-br-2xl rtl:rounded-bl-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-bl-xs rtl:rounded-bl-2xl rtl:rounded-br-xs'
                    }`}
                  >
                    {/* Model tag header if not mentioned or cites */}
                    {msg.role === 'model' && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                        {msg.isNotMentioned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                            <AlertCircle className="w-3 h-3" />
                            {t.notMentionedNotice}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            {t.basedOnPaperNotice}
                          </span>
                        )}

                        {/* Citations pill */}
                        {msg.citations && msg.citations.length > 0 && (
                          <span className="text-slate-500 dark:text-slate-400 font-semibold">
                            {isAr ? 'الصفحات:' : 'Pages:'}{' '}
                            {msg.citations.map((p) => `${isAr ? 'ص. ' : 'p. '}${p}`).join(', ')}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="whitespace-pre-line">{msg.text}</p>

                    <div
                      className={`text-[10px] mt-2 text-right rtl:text-left ${
                        msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Loading animation */}
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3F3D9E] animate-bounce" />
                  <div
                    className="w-2 h-2 rounded-full bg-[#14B8A6] animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                    {isAr ? 'جاري استخراج الإجابة من صفحات الورقة...' : 'Searching paper text...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative flex items-center">
              <textarea
                ref={textareaRef}
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.chatPlaceholder}
                rows={2}
                disabled={isLoading}
                className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#3F3D9E] focus:outline-none focus:ring-1 focus:ring-[#3F3D9E] pr-12 rtl:pr-3.5 rtl:pl-12"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputQuestion.trim() || isLoading}
                className={`absolute right-2.5 rtl:right-auto rtl:left-2.5 p-2 rounded-lg transition-all cursor-pointer ${
                  inputQuestion.trim() && !isLoading
                    ? 'bg-[#3F3D9E] text-white hover:bg-[#343285] shadow-xs'
                    : 'text-slate-400 bg-slate-200 dark:bg-slate-700 cursor-not-allowed'
                }`}
                title={t.send}
              >
                <Send className="w-4 h-4 rtl:-scale-x-100" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              {isAr ? 'اضغط Enter للإرسال، Shift + Enter لسطر جديد' : 'Press Enter to send, Shift + Enter for newline'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
