// "Look only": runs the public-page readers and prints what they found. Saves nothing.
// Usage: node collector/look.mjs [source-name ...]
import { getPage } from './lib/util.mjs';
import * as ddsl from './sources/ddsl.mjs';
import * as basketball from './sources/basketball.mjs';
import * as dublinGaa from './sources/dublin-gaa.mjs';
import * as ulsterHockey from './sources/ulster-hockey.mjs';
import * as leinsterGaa from './sources/leinster-gaa.mjs';
import * as irishHockey from './sources/irish-hockey.mjs';
import * as ulsterGaa from './sources/ulster-gaa.mjs';
import * as munsterGaa from './sources/munster-gaa.mjs';
import * as connachtGaa from './sources/connacht-gaa.mjs';
import * as clubRugby from './sources/club-rugby.mjs';
import * as horseRacing from './sources/horse-racing.mjs';
import * as countyGaa from './sources/county-gaa.mjs';
import * as myrunresults from './sources/myrunresults.mjs';
import * as foireann from './sources/foireann.mjs';
import * as antrimGaa from './sources/antrim-gaa.mjs';
import * as roscommonGaa from './sources/roscommon-gaa.mjs';
import * as sligoGaa from './sources/sligo-gaa.mjs';
import * as leitrimGaa from './sources/leitrim-gaa.mjs';
import * as mayoGaa from './sources/mayo-gaa.mjs';
import * as carlowGaa from './sources/carlow-gaa.mjs';
import * as longfordSnapshot from './sources/longford-snapshot.mjs';

export const SOURCES = { ddsl, basketball, 'dublin-gaa': dublinGaa, 'ulster-hockey': ulsterHockey, 'leinster-gaa': leinsterGaa, 'irish-hockey': irishHockey, 'ulster-gaa': ulsterGaa, 'munster-gaa': munsterGaa, 'connacht-gaa': connachtGaa, 'club-rugby': clubRugby, 'horse-racing': horseRacing, 'county-gaa': countyGaa, myrunresults, 'antrim-gaa': antrimGaa, 'roscommon-gaa': roscommonGaa, 'sligo-gaa': sligoGaa, 'mayo-gaa': mayoGaa, 'carlow-gaa': carlowGaa, 'longford-snapshot': longfordSnapshot,
  // Leitrim GAA (sources/leitrim-gaa.mjs) is switched off: its site answered 403 to the daily run on GitHub. A refusal stands; add 'leitrim-gaa': leitrimGaa back only if Leitrim agrees.
  // The GAA's official Foireann Open Data API. Only present when a key issued to Grassroots is set; see sources/foireann.mjs.
  ...(process.env.FOIREANN_API_KEY ? { foireann } : {}) };

export async function collect(source, now = new Date()) {
  const all = [];
  const problems = [];
  for (const page of source.pages) {
    try {
      all.push(...source.read(page.text ?? await getPage(page.url, page.gapMs, page.headers), page, now));
    } catch (e) {
      problems.push(`${page.url}: ${e.message}`);
    }
  }
  // The same fixture can appear on two of a site's pages; the later page's copy is kept.
  const unique = [...new Map(all.map((f) => [f.ref, f])).values()];
  const today = now.toISOString().slice(0, 10);
  const upcoming = unique.filter((f) => f.date && f.date >= today);
  return { all: unique, upcoming, problems };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const wanted = process.argv.slice(2);
  for (const [key, source] of Object.entries(SOURCES)) {
    if (wanted.length && !wanted.includes(key)) continue;
    const { all, upcoming, problems } = await collect(source);
    const missing = (k) => upcoming.filter((f) => !f[k]).length;
    console.log(`\n=== ${source.name}: ${all.length} on the pages, ${upcoming.length} still to be played`);
    console.log(`    no date ${all.filter((f) => !f.date).length} | no time ${missing('time')} | no ground ${missing('venue')} | different grounds ${new Set(upcoming.map((f) => f.venue)).size}`);
    if (upcoming.length) console.log(`    from ${upcoming.map((f) => f.date).sort()[0]} to ${upcoming.map((f) => f.date).sort().at(-1)}`);
    for (const p of problems) console.log(`    PROBLEM ${p}`);
    const step = Math.max(1, Math.floor(upcoming.length / 10));
    for (const f of upcoming.filter((_, i) => i % step === 0).slice(0, 10)) {
      console.log(`    ${f.date} ${f.time ?? '--:--'} | ${f.title ?? `${f.home} v ${f.away}`} | ${f.competition} | ${f.venue || '(no ground)'}${f.postcode ? ' ' + f.postcode : ''}`);
    }
  }
}
