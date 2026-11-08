export type Language = 'ar' | 'en';

export type EvidenceType = 'explicit' | 'inferred';

export type PointCategory = 'general' | 'strength' | 'weakness';

export type EvidenceStatus = 'verified' | 'page_corrected' | 'not_found' | 'no_quote';

/** Server-side check of a point against the real text of the PDF. */
export interface EvidenceCheck {
  status: EvidenceStatus;
  citedPage?: number;
  unmatchedNumbers?: string[];
}

export interface AnalysisPoint {
  id: string;
  text: string;
  page: number;
  type: EvidenceType;
  quote?: string;
  category?: PointCategory;
  evidence?: EvidenceCheck;
}

export interface AnalysisSection {
  id: number;
  key: string;
  title: string;
  points: AnalysisPoint[];
  isNotStated?: boolean;
}

export interface PaperOverview {
  title: string;
  authors: string[];
  year: string;
  venue: string;
  field: string;
  summary: string;
}

export interface AnalysisResult {
  overview: PaperOverview;
  sections: AnalysisSection[];
  fileName: string;
  fileSize: string;
  analyzedAt: string;
  language: Language;
  pageCount?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  citations?: number[];
  isNotMentioned?: boolean;
  timestamp: string;
}

export type PageView = 'landing' | 'upload' | 'dashboard';
