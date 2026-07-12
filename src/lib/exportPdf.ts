import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Kind, Person } from './api';
import { fieldsFor, fieldValue } from './fields';
import type { TKey } from './i18n';

// Export the whole roster as a nicely formatted landscape PDF table: one row per
// person, one column per field. Header band + zebra striping to match the app's
// dark-navy / cyan theme.
export function exportRosterPdf(
  people: Person[],
  kind: Kind,
  teamName: string,
  seasonName: string,
  t: (k: TKey) => string,
): void {
  const fields = fieldsFor(kind);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const marginX = 32;

  const title = `${teamName}${seasonName ? ` — ${seasonName}` : ''}`;
  const subtitle = `${kind === 'players' ? t('players') : t('staff')} · ${t('exportedOn')} ${new Date().toLocaleDateString()}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(11, 18, 32);
  doc.text(title, marginX, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120, 130, 148);
  doc.text(subtitle, marginX, 56);

  const head = [['#', ...fields.map((f) => t(f.key as TKey))]];
  const body = people.map((p, i) => [
    String(i + 1),
    ...fields.map((f) => fieldValue(p, f, t) ?? '—'),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 72,
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak', textColor: [30, 38, 54], lineColor: [225, 229, 236], lineWidth: 0.5 },
    headStyles: { fillColor: [11, 18, 32], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
    alternateRowStyles: { fillColor: [244, 247, 251] },
    columnStyles: { 0: { cellWidth: 22, halign: 'right', textColor: [140, 150, 168] } },
    theme: 'grid',
  });

  const safe = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'roster';
  doc.save(`${safe(teamName)}_${safe(seasonName || kind)}.pdf`);
}
