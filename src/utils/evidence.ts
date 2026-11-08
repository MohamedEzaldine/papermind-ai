import { AnalysisResult, EvidenceCheck, Language } from '../types';

export function evidenceLabel(e: EvidenceCheck | undefined, lang: Language): { label: string; detail: string } | null {
  if (!e) return null;
  const ar = lang === 'ar';
  switch (e.status) {
    case 'verified':
      return {
        label: ar ? 'اقتباس موثّق' : 'Quote verified',
        detail: ar ? 'تم العثور على الاقتباس حرفياً في الصفحة المذكورة' : 'The quote was found on the cited page of the PDF',
      };
    case 'page_corrected':
      return {
        label: ar ? `تم تصحيح الصفحة (كانت ${e.citedPage})` : `Page corrected (was ${e.citedPage})`,
        detail: ar
          ? 'وُجد الاقتباس في صفحة أخرى غير التي ذكرها الذكاء الاصطناعي، وتم تصحيح رقم الصفحة تلقائياً'
          : 'The quote was found on a different page than the AI cited; the page number was corrected automatically',
      };
    case 'not_found':
      return {
        label: ar ? 'تحقق يدوياً' : 'Check manually',
        detail: ar
          ? 'لم يُعثر على هذا الاقتباس حرفياً في نص الملف. قد يكون معاد الصياغة أو من جدول/شكل؛ راجع الصفحة بنفسك'
          : 'This quote was not found verbatim in the PDF text. It may be paraphrased or come from a table/figure; review the page yourself',
      };
    default:
      return null;
  }
}

export function numbersWarning(e: EvidenceCheck | undefined, lang: Language): string | null {
  if (!e?.unmatchedNumbers?.length) return null;
  const nums = e.unmatchedNumbers.join('، ');
  return lang === 'ar'
    ? `أرقام لم تظهر في نص الورقة: ${nums} — راجعها قبل الاعتماد عليها`
    : `Numbers not found in the paper text: ${e.unmatchedNumbers.join(', ')} — double-check before relying on them`;
}

export function verificationSummary(data: AnalysisResult) {
  let checked = 0, verified = 0, corrected = 0, notFound = 0, numberFlags = 0;
  for (const s of data.sections) {
    for (const p of s.points) {
      if (!p.evidence) continue;
      if (p.evidence.unmatchedNumbers?.length) numberFlags++;
      if (p.evidence.status === 'no_quote') continue;
      checked++;
      if (p.evidence.status === 'verified') verified++;
      else if (p.evidence.status === 'page_corrected') corrected++;
      else notFound++;
    }
  }
  return { checked, verified, corrected, notFound, numberFlags };
}
