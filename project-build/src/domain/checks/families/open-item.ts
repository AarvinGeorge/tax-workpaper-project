// Family: open item never closed. The prior preparer's open items carried in, each checked for a document that
// resolves it; one with none stays open.
import { type Check, type Draft, docClaim, words } from '../util';

const FAMILY = 'Open item never closed';
const STOP = new Set(['obtain', 'confirm', 'client', 'form', 'discussed', 'note', 'resolution', 'with', 'from', 'for', 'the', 'over', 'roll', 'forward']);

export const priorOpenItem: Check = {
  id: 'CHK-PRIOR-OPEN-ITEM',
  family: FAMILY,
  run(ix) {
    const wp = ix.packet.prior_years.prior_preparer_workpaper as { source_document?: string; open_items_left_by_prior_preparer?: string[] } | undefined;
    const items = wp?.open_items_left_by_prior_preparer ?? [];
    const src = wp?.source_document ?? null;
    const out: Draft[] = [];
    const docs = ix.packet.documents.filter((d) => d.id !== src);
    items.forEach((item, i) => {
      const years = (item.match(/\b(?:19|20)\d{2}\b/g) || []).map(Number);
      const forms = (item.match(/\b(?:K-1|W-2|\d{4}[A-Z]?)\b/g) || []).filter((f) => !/^(?:19|20)\d{2}$/.test(f));
      let resolvedBy: string | null = null;
      if (forms.length) {
        const d = docs.find((x) => forms.some((f) => x.title.includes(f)) && (!years.length || years.includes(x.tax_year ?? -1) || years.some((y) => x.title.includes(String(y)))));
        resolvedBy = d?.id ?? null;
      } else {
        const ws = new Set(words(item).filter((w) => !STOP.has(w)));
        const d = docs.find((x) => words(x.title).filter((w) => ws.has(w)).length >= 2);
        resolvedBy = d?.id ?? null;
      }
      if (resolvedBy) return;
      // Where else the same fact appears (e.g. "inheritance"): long words of the item, matched by stem.
      const stems = words(item).filter((w) => w.length >= 8 && !STOP.has(w)).map((w) => w.slice(0, 7));
      const related = docs.filter((d) => stems.some((s) => d.pages.some((p) => p.printed_content.toLowerCase().includes(s)))).map((d) => `doc:${d.id}`);
      const answers = ix.packet.client.questionnaire.filter((q) => stems.some((s) => q.answer.toLowerCase().includes(s))).map((q) => q.id);
      const pointer = `py:/prior_preparer_workpaper/open_items_left_by_prior_preparer/${i}`;
      out.push({
        title: `Prior preparer's open item never resolved: ${item.replace(/\s*-\s*discussed\?.*$/i, '')}`,
        claims: src ? [docClaim(src)] : [],
        evidence: [pointer, ...(src ? [`doc:${src}`] : []), ...related, ...answers],
        trigger: src ? [`doc:${src}`] : [pointer],
        explanation: `The prior preparer left "${item}". No document, answer or diagnostic in this engagement resolves it`
          + (related.length || answers.length ? `, though ${[...related.map((r) => r.slice(4)), ...answers].join(', ')} mention the same fact` : '')
          + `. Carry it as a tracked item with an owner and a resolution.`,
      });
    });
    return out;
  },
};

export const openItemChecks: Check[] = [priorOpenItem];
