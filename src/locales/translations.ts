import { Language } from '../types';

export interface Translations {
  appName: string;
  tagline: string;
  heroDescription: string;
  startAnalyzing: string;
  trySamplePaper: string;
  featuresTitle: string;
  featuresSubtitle: string;
  problemTitle: string;
  problemSubtitle: string;
  problemPoints: { title: string; desc: string }[];
  features: { id: string; title: string; desc: string }[];
  howItWorksTitle: string;
  howItWorksSubtitle: string;
  steps: { num: string; title: string; desc: string }[];
  footerNote: string;
  
  // Upload page
  uploadTitle: string;
  uploadSubtitle: string;
  dragDropText: string;
  orBrowse: string;
  selectPdfBtn: string;
  pdfOnlyNote: string;
  removeFile: string;
  analyzeBtn: string;
  analyzingBtn: string;
  stages: {
    stage1: string;
    stage2: string;
    stage3: string;
  };
  samplePrompt: string;
  sampleBadge: string;
  
  // Dashboard
  summaryBarTitle: string;
  authorsLabel: string;
  yearLabel: string;
  venueLabel: string;
  fieldLabel: string;
  summaryLabel: string;
  
  exportExcel: string;
  exportPdf: string;
  askPaper: string;
  analyzeAnother: string;
  
  sectionsTitle: string;
  sections: Record<number, string>;
  
  pageBadge: string;
  explicitBadge: string;
  inferredBadge: string;
  explicitDesc: string;
  inferredDesc: string;
  supportingQuote: string;
  hideQuote: string;
  showQuote: string;
  notStated: string;
  notStatedDesc: string;
  strengths: string;
  weaknesses: string;
  allPoints: string;
  
  // Ask the Paper
  askDrawerTitle: string;
  askDrawerSubtitle: string;
  askPaperNotice: string;
  suggestedQuestionsTitle: string;
  suggestedQuestions: string[];
  chatPlaceholder: string;
  send: string;
  clearchat: string;
  notMentionedNotice: string;
  basedOnPaperNotice: string;
  close: string;
  
  // Errors
  errorInvalidType: string;
  errorTooLarge: string;
  errorScannedPdf: string;
  errorApiFailure: string;
  tryAgain: string;
  backToHome: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    appName: 'PaperMind AI',
    tagline: 'افهم أي ورقة بحثية — بعمق، وبالدليل الموثق.',
    heroDescription: 'منصة ذكية متخصصة للباحثين وطلاب الدراسات العليا لتحليل الأوراق العلمية ونقدها منهجياً، مع توثيق كل استنتاج برقم الصفحة والاقتباس المباشر.',
    startAnalyzing: 'ابدأ التحليل الآن',
    trySamplePaper: 'تجربة ورقة بحثية نموذجية (Transformer)',
    featuresTitle: 'أدوات بحثية متقدمة لقراءة علمية فاحصة',
    featuresSubtitle: 'صُمم النظام لتجاوز الملخصات السطحية والوصول إلى جوهر البنية العلمية بدقة متناهية.',
    problemTitle: 'تحديات القراءة والتقييم النقدي للأوراق العلمية',
    problemSubtitle: 'يقضي الباحثون عشرات الساعات في محاولة استيعاب الأوراق المعقدة وفرز المنهجيات والنتائج، مما يؤدي إلى:',
    problemPoints: [
      {
        title: 'استنزاف الوقت والجهد',
        desc: 'قراءة الأوراق وفك شفرات الجداول والملحقات تستغرق ساعات طويلة تعيق وتيرة البحث والتطوير.'
      },
      {
        title: 'صعوبة رصد الفجوات والمحددات',
        desc: 'غالباً ما يدمج المؤلفون القيود ونقاط الضعف في ثنايا النقاش، مما يجعل اكتشافها سريعاً أمراً عسيراً.'
      },
      {
        title: 'غياب التوثيق الموضعي',
        desc: 'أغلب أدوات الذكاء الاصطناعي العامة تقدم ملخصات عامة قد تخلط بين ادعاءات المؤلفين والنتائج الفعلية دون ذكر أرقام الصفحات.'
      }
    ],
    features: [
      {
        id: 'structured',
        title: 'تحليل هيكلي عميق',
        desc: 'تفكيك الورقة إلى 10 أقسام علمية شاملة تبدأ من الفجوة المعرفية وحتى التوجهات المستقبلية.'
      },
      {
        id: 'page_evidence',
        title: 'أدلة موثقة برقم الصفحة',
        desc: 'كل معلومة واستنتاج مدعومة برقم الصفحة الدقيق في ملف الـ PDF واقتباس مباشر.'
      },
      {
        id: 'labels',
        title: 'تمييز الصريح والمستنتج',
        desc: 'تصنيف بصري صارم يميز بين ما ذكره المؤلفون نصاً (صريح) وما استخلصه التحليل (مستنتج).'
      },
      {
        id: 'qa',
        title: 'حاور الورقة البحثية (Q&A)',
        desc: 'اطرح أي سؤال متخصص واحصل على إجابة محددة مستخرجة حصرياً من نص الورقة وموثقة بالصفحات.'
      },
      {
        id: 'bilingual',
        title: 'ثنائي اللغة (العربية والإنجليزية)',
        desc: 'واجهة وتحليل كامل باللغة العربية مع دعم RTL أو الإنجليزية بدقة أكاديمية رفيعة.'
      },
      {
        id: 'export',
        title: 'تصدير شامل لـ Excel و PDF',
        desc: 'تصدير منظم إلى جداول إكسل متعددة الصفحات أو تقرير PDF قابل للطباعة مصمم بعناية.'
      }
    ],
    howItWorksTitle: 'كيف يعمل PaperMind AI؟',
    howItWorksSubtitle: 'ثلاث خطوات يسيرة تنقلك من ملف PDF إلى تقرير تحليلي نقدي شامل.',
    steps: [
      {
        num: '01',
        title: 'رفع ملف الورقة البحثية',
        desc: 'اسحب ملف الـ PDF (حتى 20 ميجابايت). نقبل ورقة بحثية واحدة في كل جلسة للتركيز والعمق.'
      },
      {
        num: '02',
        title: 'المعالجة واستخراج الأدلة',
        desc: 'يحلل النموذج الورقة بعين المحكم الأكاديمي، مستخرجاً الفرضيات والأرقام والقيود مع تحديد الصفحات.'
      },
      {
        num: '03',
        title: 'الاستكشاف، الحوار والتصدير',
        desc: 'تصفح الأقسام العشرة، اسأل عن أي تفاصيل غامضة، وصدّر التقرير بضغطة زر إلى Excel أو PDF.'
      }
    ],
    footerNote: 'PaperMind AI – مشروع تخرج – برنامج سفراء الذكاء الاصطناعي (AI Ambassadors Program)',
    
    // Upload
    uploadTitle: 'رفع وتحليل ورقة بحثية',
    uploadSubtitle: 'قم برفع ورقة علمية بصيغة PDF للحصول على تشريح منهجي كامل وموثق بالأدلة.',
    dragDropText: 'اسحب وأفلت ملف الـ PDF هنا، أو انقر للاختيار',
    orBrowse: 'أو تصفح جهازك',
    selectPdfBtn: 'اختيار ملف PDF',
    pdfOnlyNote: 'نقبل ملفات PDF فقط (الحد الأقصى: 20 ميجابايت - ورقة واحدة)',
    removeFile: 'حذف الملف',
    analyzeBtn: 'تحليل الورقة البحثية',
    analyzingBtn: 'جاري التحليل العلمي…',
    stages: {
      stage1: 'جاري قراءة وتحليل ملف الـ PDF…',
      stage2: 'جاري استخراج الهيكل والبيانات والأدلة الموضعية…',
      stage3: 'جاري صياغة التقييم الأكاديمي وتوثيق الصفحات…'
    },
    samplePrompt: 'لا تملك ملفاً جاهزاً حالياً؟',
    sampleBadge: 'جرب ورقة بحثية شهيرة جاهزة للتحليل فوراً',
    
    // Dashboard
    summaryBarTitle: 'بطاقة الورقة البحثية',
    authorsLabel: 'المؤلفون',
    yearLabel: 'سنة النشر',
    venueLabel: 'جهة / مؤتمر النشر',
    fieldLabel: 'المجال العلمي',
    summaryLabel: 'الملخص الأكاديمي الموجز',
    
    exportExcel: 'تصدير إكسل (Excel)',
    exportPdf: 'تصدير تقرير (PDF)',
    askPaper: 'حاور الورقة البحثية',
    analyzeAnother: 'تحليل ورقة أخرى',
    
    sectionsTitle: 'الأقسام المنهجية العشرة',
    sections: {
      1: 'نظرة عامة على الورقة',
      2: 'المشكلة البحثية والفجوة المعرفية',
      3: 'الأهداف، الأسئلة البحثية والفرضيات',
      4: 'المساهمات العلمية الرئيسية',
      5: 'المنهجية العلمية',
      6: 'البيانات، الأدوات، والنماذج',
      7: 'النتائج والمناقشة',
      8: 'محددات وقصور البحث',
      9: 'التقييم النقدي (نقاط القوة والضعف)',
      10: 'آفاق وتوجهات البحث المستقبلي'
    },
    
    pageBadge: 'ص.',
    explicitBadge: 'صريح في النص',
    inferredBadge: 'استنتاج تحليلي',
    explicitDesc: 'مذكور بنصه مباشرة في صفحات الورقة',
    inferredDesc: 'استخلاص تحليلي مستند إلى قرائن الورقة',
    supportingQuote: 'الاقتباس الداعم من الورقة',
    hideQuote: 'إخفاء الاقتباس',
    showQuote: 'عرض الاقتباس المباشر',
    notStated: 'غير مذكور في الورقة البحثية',
    notStatedDesc: 'لم يتطرق مؤلفو الورقة إلى هذا المحور صراحة أو ضمناً.',
    strengths: 'نقاط القوة المنهجية',
    weaknesses: 'نقاط الضعف والمآخذ',
    allPoints: 'كافة النقاط',
    
    // Chat
    askDrawerTitle: 'حاور الورقة البحثية',
    askDrawerSubtitle: 'إجابات علمية موثقة مستخرجة حصرياً من نص هذه الورقة',
    askPaperNotice: 'ملاحظة: يجيب المساعد الأكاديمي بناءً على محتوى الورقة المرفوعة فقط، ويحدد أرقام الصفحات لكل معلومة.',
    suggestedQuestionsTitle: 'أسئلة مقترحة للبدء:',
    suggestedQuestions: [
      'ما هي المساهمة العلمية الرئيسية للورقة؟',
      'ما هي مجموعة البيانات (Dataset) المستخدمة في التجربة؟',
      'ما هي أبرز نقاط الضعف أو القيود في المنهجية؟'
    ],
    chatPlaceholder: 'اطرح سؤالاً محدداً حول الورقة (مثل: ما هي المقاييس الإحصائية المعتمدة؟)...',
    send: 'إرسال',
    clearchat: 'مسح المحادثة',
    notMentionedNotice: 'غير مذكور في الورقة',
    basedOnPaperNotice: 'موثق من الورقة',
    close: 'إغلاق',
    
    // Errors
    errorInvalidType: 'صيغة الملف غير مدعومة. يرجى رفع ملف PDF فقط.',
    errorTooLarge: 'حجم الملف يتجاوز الحد الأقصى المسموح به (20 ميجابايت).',
    errorScannedPdf: 'تعذر استخراج النص من الملف. يرجى التأكد من أن ملف الـ PDF يحتوي على نصوص قابلة للقراءة.',
    errorApiFailure: 'تعذر إتمام التحليل في الوقت الحالي. يرجى التأكد من اتصال الإنترنت أو مفتاح API والمحاولة مجدداً.',
    tryAgain: 'إعادة المحاولة',
    backToHome: 'العودة للرئيسية'
  },
  
  en: {
    appName: 'PaperMind AI',
    tagline: 'Understand any research paper — deeply, with evidence.',
    heroDescription: 'A specialized platform for researchers and graduate students to systematically evaluate and peer-review scientific papers, with every insight linked to an exact page number and direct quote.',
    startAnalyzing: 'Start Analyzing Now',
    trySamplePaper: 'Try Sample Paper (Transformer / Attention)',
    featuresTitle: 'Rigorous Academic Tools for In-Depth Reading',
    featuresSubtitle: 'Built to move past surface-level summaries and penetrate the scientific core with page-level rigor.',
    problemTitle: 'The Critical Burden of Scientific Evaluation',
    problemSubtitle: 'Researchers spend endless hours deciphering dense manuscripts, parsing experimental details, and searching for limitations:',
    problemPoints: [
      {
        title: 'Hours of Exhaustive Reading',
        desc: 'Extracting key methods, benchmark setups, and ablation studies from complex papers drains precious research momentum.'
      },
      {
        title: 'Easy to Miss Gaps & Limitations',
        desc: 'Authors often bury assumptions, caveats, and computational constraints deep within lengthy discussion sections.'
      },
      {
        title: 'Lack of Page-Level Traceability',
        desc: 'Generic AI tools hallucinate or blur the lines between author claims and real data without citing specific page numbers.'
      }
    ],
    features: [
      {
        id: 'structured',
        title: 'Deep Structured Analysis',
        desc: 'Breaks the manuscript down into 10 peer-review sections, from the knowledge gap to future research horizons.'
      },
      {
        id: 'page_evidence',
        title: 'Page-Level Evidence',
        desc: 'Every key finding and analytical point is verified with an exact page number badge and supporting quote.'
      },
      {
        id: 'labels',
        title: 'Explicit vs. Inferred Labels',
        desc: 'A strict visual taxonomy clearly distinguishes verbatim author claims (Explicit) from synthesized insights (Inferred).'
      },
      {
        id: 'qa',
        title: 'Ask the Paper (Q&A)',
        desc: 'Ask specialized questions and get precision answers drawn exclusively from the text with exact page citations.'
      },
      {
        id: 'bilingual',
        title: 'Arabic & English Bilingual',
        desc: 'Full native bilingual interface with right-to-left layout and Cairo font for Arabic, and Inter for English.'
      },
      {
        id: 'export',
        title: 'Export to Excel & PDF',
        desc: 'Download a clean multi-sheet Excel spreadsheet or print an elegant, publication-ready PDF evaluation report.'
      }
    ],
    howItWorksTitle: 'How PaperMind AI Works',
    howItWorksSubtitle: 'Three seamless steps from raw PDF to comprehensive peer-review intelligence.',
    steps: [
      {
        num: '01',
        title: 'Upload Research Paper',
        desc: 'Drag & drop a single PDF (up to 20 MB). Focused one-paper-at-a-time processing ensures deep analytical precision.'
      },
      {
        num: '02',
        title: 'Evidence Extraction Engine',
        desc: 'The model analyzes the manuscript with peer-reviewer rigor, extracting hypotheses, metrics, and limitations.'
      },
      {
        num: '03',
        title: 'Explore, Ask & Export',
        desc: 'Review the 10 evidence cards, interrogate the paper through targeted Q&A, and export to Excel or printable PDF.'
      }
    ],
    footerNote: 'PaperMind AI – Graduation Project – AI Ambassadors Program',
    
    // Upload
    uploadTitle: 'Upload & Analyze Paper',
    uploadSubtitle: 'Upload any scientific paper in PDF format for an evidence-backed, page-attributed peer review.',
    dragDropText: 'Drag and drop your research PDF here, or click to browse',
    orBrowse: 'or browse your computer',
    selectPdfBtn: 'Choose PDF File',
    pdfOnlyNote: 'PDF files only (max 20 MB — one paper per session)',
    removeFile: 'Remove File',
    analyzeBtn: 'Analyze Paper',
    analyzingBtn: 'Analyzing Paper…',
    stages: {
      stage1: 'Reading and parsing PDF document…',
      stage2: 'Extracting methodology, evidence & page loci…',
      stage3: 'Synthesizing academic evaluation & citations…'
    },
    samplePrompt: 'Do not have a paper on hand?',
    sampleBadge: 'Test with a classic seminal research paper instantly',
    
    // Dashboard
    summaryBarTitle: 'Paper Dossier',
    authorsLabel: 'Authors',
    yearLabel: 'Publication Year',
    venueLabel: 'Venue / Journal',
    fieldLabel: 'Scientific Field',
    summaryLabel: 'Executive Academic Summary',
    
    exportExcel: 'Export Excel',
    exportPdf: 'Export PDF',
    askPaper: 'Ask the Paper',
    analyzeAnother: 'Analyze Another Paper',
    
    sectionsTitle: '10 Structured Evaluation Sections',
    sections: {
      1: 'Paper Overview',
      2: 'Research Problem & Gap',
      3: 'Objectives, Research Questions & Hypotheses',
      4: 'Main Contributions',
      5: 'Methodology',
      6: 'Data, Tools & Models',
      7: 'Results & Discussion',
      8: 'Limitations',
      9: 'Critical Evaluation (Strengths & Weaknesses)',
      10: 'Future Research Directions'
    },
    
    pageBadge: 'p.',
    explicitBadge: 'Explicit',
    inferredBadge: 'Inferred',
    explicitDesc: 'Directly stated in the paper text',
    inferredDesc: 'Analytical synthesis deduced from the paper',
    supportingQuote: 'Supporting Paper Quote',
    hideQuote: 'Hide Quote',
    showQuote: 'Show Verbatim Quote',
    notStated: 'Not stated in the paper',
    notStatedDesc: 'The authors did not address this aspect either explicitly or implicitly in the paper.',
    strengths: 'Methodological Strengths',
    weaknesses: 'Weaknesses & Caveats',
    allPoints: 'All Points',
    
    // Chat
    askDrawerTitle: 'Ask the Paper',
    askDrawerSubtitle: 'Precise evidence-grounded answers citing exact page numbers',
    askPaperNotice: 'Notice: Answers are strictly confined to the uploaded paper. If information is absent, the model will explicitly state that it is not mentioned.',
    suggestedQuestionsTitle: 'Suggested Starter Questions:',
    suggestedQuestions: [
      'What is the main contribution?',
      'What dataset was used?',
      'What are the weaknesses?'
    ],
    chatPlaceholder: 'Ask a specific question about the paper (e.g., What baseline models were compared?)...',
    send: 'Send',
    clearchat: 'Clear History',
    notMentionedNotice: 'Not mentioned in paper',
    basedOnPaperNotice: 'Documented from paper',
    close: 'Close',
    
    // Errors
    errorInvalidType: 'Unsupported file type. Please upload a PDF file only.',
    errorTooLarge: 'File exceeds maximum allowed size of 20 MB.',
    errorScannedPdf: 'Unable to extract text. Please ensure the PDF is not an unreadable low-resolution scan.',
    errorApiFailure: 'Analysis failed. Please verify your internet connection or API settings and try again.',
    tryAgain: 'Try Again',
    backToHome: 'Back to Home'
  }
};
