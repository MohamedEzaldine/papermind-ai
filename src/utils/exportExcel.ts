import * as XLSX from 'xlsx';
import { AnalysisResult, Language } from '../types';
import { evidenceLabel, numbersWarning } from './evidence';

export function exportToExcel(data: AnalysisResult, lang: Language) {
  const isAr = lang === 'ar';

  // 1. Overview Sheet Data
  const overviewRows = [
    {
      [isAr ? 'الحقل' : 'Field']: isAr ? 'عنوان الورقة' : 'Title',
      [isAr ? 'القيمة' : 'Value']: data.overview.title,
    },
    {
      [isAr ? 'الحقل' : 'Field']: isAr ? 'المؤلفون' : 'Authors',
      [isAr ? 'القيمة' : 'Value']: data.overview.authors.join(', '),
    },
    {
      [isAr ? 'الحقل' : 'Field']: isAr ? 'سنة النشر' : 'Year',
      [isAr ? 'القيمة' : 'Value']: data.overview.year,
    },
    {
      [isAr ? 'الحقل' : 'Field']: isAr ? 'جهة / مؤتمر النشر' : 'Venue / Journal',
      [isAr ? 'القيمة' : 'Value']: data.overview.venue,
    },
    {
      [isAr ? 'الحقل' : 'Field']: isAr ? 'المجال العلمي' : 'Scientific Field',
      [isAr ? 'القيمة' : 'Value']: data.overview.field,
    },
    {
      [isAr ? 'الحقل' : 'Field']: isAr ? 'الملخص الأكاديمي' : 'Executive Summary',
      [isAr ? 'القيمة' : 'Value']: data.overview.summary,
    },
    {
      [isAr ? 'الحقل' : 'Field']: isAr ? 'اسم الملف الأصلي' : 'Original File',
      [isAr ? 'القيمة' : 'Value']: data.fileName,
    },
    {
      [isAr ? 'الحقل' : 'Field']: isAr ? 'تاريخ التحليل' : 'Analysis Timestamp',
      [isAr ? 'القيمة' : 'Value']: new Date(data.analyzedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US'),
    },
  ];

  const overviewWorksheet = XLSX.utils.json_to_sheet(overviewRows);

  // Set column widths for Overview
  overviewWorksheet['!cols'] = [{ wch: 22 }, { wch: 80 }];

  // 2. Analysis Sheet Data
  // Columns: Section, Point, Page, Type, Quote
  const analysisRows: any[] = [];

  data.sections.forEach((section) => {
    if (section.isNotStated || section.points.length === 0) {
      analysisRows.push({
        [isAr ? 'القسم' : 'Section']: section.title,
        [isAr ? 'النقطة التحليلية' : 'Point']: isAr ? 'غير مذكور في الورقة البحثية' : 'Not stated in the paper',
        [isAr ? 'رقم الصفحة' : 'Page']: '-',
        [isAr ? 'نوع الدليل' : 'Type']: isAr ? 'مستنتج' : 'Inferred',
        [isAr ? 'الاقتباس الداعم' : 'Quote']: '-',
      });
    } else {
      section.points.forEach((point) => {
        const typeLabel =
          point.type === 'explicit'
            ? isAr
              ? 'صريح (Explicit)'
              : 'Explicit'
            : isAr
              ? 'مستنتج (Inferred)'
              : 'Inferred';

        analysisRows.push({
          [isAr ? 'القسم' : 'Section']: section.title,
          [isAr ? 'النقطة التحليلية' : 'Point']: point.text,
          [isAr ? 'رقم الصفحة' : 'Page']: `${isAr ? 'ص. ' : 'p. '}${point.page}`,
          [isAr ? 'نوع الدليل' : 'Type']: typeLabel,
          [isAr ? 'الاقتباس الداعم' : 'Quote']: point.quote || '-',
          [isAr ? 'التحقق من الدليل' : 'Evidence Check']:
            [evidenceLabel(point.evidence, lang)?.label, numbersWarning(point.evidence, lang)].filter(Boolean).join(' | ') || '-',
        });
      });
    }
  });

  const analysisWorksheet = XLSX.utils.json_to_sheet(analysisRows);

  // Set column widths for Analysis
  analysisWorksheet['!cols'] = [
    { wch: 28 }, // Section
    { wch: 60 }, // Point
    { wch: 10 }, // Page
    { wch: 16 }, // Type
    { wch: 55 }, // Quote
    { wch: 40 }, // Evidence check
  ];

  // 3. Create Workbook and Append Sheets
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, overviewWorksheet, isAr ? 'ملخص الورقة' : 'Overview');
  XLSX.utils.book_append_sheet(workbook, analysisWorksheet, isAr ? 'التحليل الهيكلي' : 'Analysis');

  // Short title sanitized for filename
  const rawTitle = data.overview.title || 'Paper';
  const cleanTitle = rawTitle
    .replace(/[^\w\s\u0600-\u06FF]/gi, '')
    .trim()
    .slice(0, 30)
    .replace(/\s+/g, '_');

  const fileName = `PaperMind_${cleanTitle || 'Paper'}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}
