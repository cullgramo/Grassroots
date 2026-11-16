// Text of a PDF, with each word's position, so a calendar grid can be read without a browser.
// pdfjs-dist is the one PDF package this collector uses. It is only imported by the readers that need it.
export async function pdfPages(buf) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // pdfjs rejects a Node Buffer, and it may detach the underlying bytes, so copy them.
  const data = Uint8Array.from(buf);
  const doc = await getDocument({ data, disableWorker: true, isEvalSupported: false, verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    pages.push(content.items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({ s: it.str.replace(/\s+/g, ' ').trim(), x: it.transform[4], y: it.transform[5] })));
  }
  return pages;
}

/** Words on one line: the same height, left to right. */
export function linesOf(items, slack = 3.5) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const it of sorted) {
    const last = lines.at(-1);
    if (!last || Math.abs(last.y - it.y) > slack) lines.push({ y: it.y, items: [it] });
    else last.items.push(it);
  }
  for (const line of lines) line.items.sort((a, b) => a.x - b.x);
  return lines;
}
