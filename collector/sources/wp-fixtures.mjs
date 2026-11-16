// WordPress league sites that publish a public /fixtures/ page. One reader, configured per league.
// Five layouts of the same kind of page:
//   attrs  — SportLoMo plugin: each game is a <ul class="table-body"> with data-hometeam and the rest (Galway FA, Munster Senior League)
//   cells  — the same plugin, older markup: date and competition headings, then a row of cells (Donegal Junior League)
//   columns — a hand-written table: date row, then time / ground / home / v / away / competition (Cork Youth Leagues)
//   grouped — date and competition headings, then time / ground / home / vs / away / status (Mid-Ulster)
//   cards   — one card per game, with the ground in wdfl-venue-meta (Wicklow & District). Crests are not copied.
// Referee, assessor and other officials are named on several of these pages. Those cells and
// data-referee / data-assessor / data-referee2 are never read. Club crests are never copied.
import { categoryFromText, readDate, readTime, tidy } from '../lib/util.mjs';

export const decode = (s) => tidy(String(s ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'")
  .replace(/&nbsp;/g, ' ')
  .replace(/[‘’]/g, "'"));

export const notATeam = (t) => !decode(t) || /^(tbc|tba|bye|team\s*[12]|to be confirmed)$/i.test(decode(t));

export const blankVenue = (v) => {
  const t = decode(v);
  return /^(tbc|tba|tbd|n\/a|na|venue|venue to be confirmed|to be confirmed)?$/i.test(t) ? '' : t;
};

/** A competition keeps the league's name in front, unless the listing already includes it. */
export function competitionOf(prefix, name) {
  const n = decode(name);
  if (!prefix) return n;
  const needle = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (n && new RegExp(needle, 'i').test(n)) return n;
  return decode(`${prefix} ${n}`);
}

// SportLoMo writes 00:00, and on the sister DDSL site 01:00, when no kick-off has been set.
const earlyMeansUnknown = (time) => (time && time < '07:00' ? null : time);
const isVersus = (v) => /^v(s)?\.?$/i.test(decode(v));

// <sup>st</sup> must stay attached to the day ("21st"), or the date cannot be read.
const cellsOf = (row) => [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
  .map((c) => decode(c[1]).replace(/(\d)\s+(st|nd|rd|th)\b/gi, '$1$2'));

function fixture(page, fields) {
  return {
    sport: 'soccer', level: 'local', title: null, county: null, postcode: null,
    area: page.area ?? null, countyHint: page.countyHint ?? null, url: page.pageUrl || page.url,
    ...fields,
  };
}

function readAttrs(html, page, now) {
  const out = [];
  for (const m of html.matchAll(/<ul\b([^>]*\btable-body\b[^>]*)>([\s\S]*?)<\/ul>/gi)) {
    const data = {};
    for (const a of m[1].matchAll(/\bdata-([a-z0-9]+)="([^"]*)"/gi)) data[a[1].toLowerCase()] = decode(a[2]);
    if (!data.hometeam && !data.awayteam) continue;
    // A filled score is a result. The referee attributes on this same tag are not read.
    if (data.homescore || data.awayscore) continue;
    const home = data.hometeam;
    const away = data.awayteam;
    if (notATeam(home) || notATeam(away)) continue;
    const date = readDate(data.date ?? '', now);
    if (!date) continue;
    const links = [...m[2].matchAll(/href="([^"]+)"/gi)].map((h) => h[1]);
    const ids = [];
    for (const href of links) {
      const id = href.match(/[?&]team_id=(\d+)/)?.[1] || href.match(/\/club\/(\d+)/)?.[1];
      if (id && !ids.includes(id)) ids.push(id);
    }
    const compId = links.map((href) => href.match(/competition_id=(\d+)/)?.[1] || href.match(/\/league\/(\d+)/)?.[1]).find(Boolean) ?? '';
    const fid = m[2].match(/\bdata-fid="(\d+)"/i)?.[1];
    out.push(fixture(page, {
      ref: fid || [compId, ids[0] ?? home, ids[1] ?? away, date].join('-'),
      category: categoryFromText(data.compname),
      competition: competitionOf(page.prefix, data.compname),
      home, away, date,
      time: earlyMeansUnknown(readTime(data.time ?? '')),
      venue: blankVenue(data.venue),
      status: /postpon/i.test(data.comment ?? '') ? 'postponed' : undefined,
    }));
  }
  return out;
}

function readCells(html, page, now) {
  const out = [];
  let date = null;
  let competition = '';
  let compId = '';
  const re = /<div class="competition-date">[\s\S]*?<label>\s*([^<]+?)\s*<\/label>|<div class="compheader">[\s\S]*?<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>|<ul class="[^"]*\btable-body\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi;
  for (const m of html.matchAll(re)) {
    if (m[1] !== undefined) { date = readDate(m[1], now); continue; }
    if (m[3] !== undefined) { competition = decode(m[3]); compId = m[2].match(/\/league\/(\d+)/)?.[1] ?? ''; continue; }
    const body = m[4];
    // The "More +" panel (officials) sits outside this list and is not read. Crests are <img> and are not read.
    const home = body.match(/class="[^"]*\bteam1\b[^"]*"[^>]*>([^<]*)/i)?.[1];
    const away = body.match(/class="[^"]*\bteam2\b[^"]*"[^>]*>([^<]*)/i)?.[1];
    if (notATeam(home) || notATeam(away) || !date) continue;
    const ids = [];
    for (const href of body.matchAll(/href="([^"]+)"/gi)) {
      const id = href[1].match(/\/club\/(\d+)/)?.[1] || href[1].match(/[?&]team_id=(\d+)/)?.[1];
      if (id && !ids.includes(id)) ids.push(id);
    }
    const venue = body.match(/<li class="[^"]*\b(?:vanue|fvenue)\b[^"]*"[^>]*>([\s\S]*?)<\/li>/i)?.[1];
    const time = body.match(/<li class="[^"]*\btime\b[^"]*"[^>]*>([\s\S]*?)<\/li>/i)?.[1];
    out.push(fixture(page, {
      ref: [compId, ids[0] ?? decode(home), ids[1] ?? decode(away), date].join('-'),
      category: categoryFromText(competition),
      competition: competitionOf(page.prefix, competition),
      home: decode(home), away: decode(away), date,
      time: earlyMeansUnknown(readTime(time ?? '')),
      venue: blankVenue(venue),
    }));
  }
  return out;
}

function readColumns(html, page, now) {
  const out = [];
  let date = null;
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = cellsOf(row[1]);
    if (cells.length === 1) { date = readDate(cells[0], now) ?? date; continue; }
    // time, ground, home, v, away, competition. Anything after that is the official and is not read.
    // A blank versus cell is still a fixture; a cell with some other word is not this table.
    if (cells.length < 6 || !date || (cells[3] && !isVersus(cells[3]))) continue;
    const [time, venue, home, , away, competition] = cells;
    if (notATeam(home) || notATeam(away)) continue;
    out.push(fixture(page, {
      ref: [date, home, away, competition].join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      category: categoryFromText(competition),
      competition: competitionOf(page.prefix, competition),
      home, away, date, time: readTime(time), venue: blankVenue(venue),
    }));
  }
  return out;
}

function readGrouped(html, page, now) {
  const out = [];
  let date = null;
  let competition = '';
  const re = /<h4\b[^>]*>([\s\S]*?)<\/h4>|<h5\b[^>]*>([\s\S]*?)<\/h5>|<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const m of html.matchAll(re)) {
    if (m[1] !== undefined) { date = readDate(m[1], now) ?? date; continue; }
    if (m[2] !== undefined) { competition = decode(m[2]); continue; }
    const cells = cellsOf(m[3]);
    // time, ground, home, vs, away, status. A further cell is not read.
    if (cells.length < 6 || !isVersus(cells[3]) || !date || /^time$/i.test(cells[0])) continue;
    const [time, venue, home, , away, status] = cells;
    if (notATeam(home) || notATeam(away)) continue;
    const state = status.toLowerCase();
    if (/played|full|result|cancel|abandon|walkover/.test(state) || /\d+\s*[-–]\s*\d+/.test(status)) continue;
    out.push(fixture(page, {
      ref: [date, home, away, competition].join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      category: categoryFromText(competition),
      competition: competitionOf(page.prefix, competition),
      home, away, date, time: readTime(time), venue: blankVenue(venue),
      status: state === 'postponed' ? 'postponed' : undefined,
    }));
  }
  return out;
}

function teamSpan(block, cls) {
  const inner = block.match(new RegExp(`<a\\b[^>]*\\b${cls}\\b[^>]*>([\\s\\S]*?)</a>`, 'i'))?.[1] ?? '';
  return decode(inner.replace(/<span\b[^>]*\bwdfl-crest\b[^>]*>[\s\S]*?<\/span>/i, ''));
}

function readCards(html, page) {
  const out = [];
  for (const art of html.matchAll(/<article\b([^>]*\bwdfl-result-card\b[^>]*)>([\s\S]*?)<\/article>/gi)) {
    const [open, body] = [art[1], art[2]];
    if (!/wdfl-kickoff/.test(body)) continue;
    const home = teamSpan(body, 'wdfl-team-home');
    const away = teamSpan(body, 'wdfl-team-away');
    const stamp = body.match(/\bdatetime="(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
    if (!stamp || notATeam(home) || notATeam(away)) continue;
    const competition = decode(body.match(/class="wdfl-match-top"[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1]);
    const id = body.match(/\/event\/(\d+)/)?.[1];
    out.push(fixture(page, {
      ref: id || [stamp[1], home, away].join('-'),
      category: categoryFromText(competition),
      competition: competitionOf(page.prefix, competition),
      home, away, date: stamp[1],
      time: stamp[2] === '00' && stamp[3] === '00' ? null : `${stamp[2]}:${stamp[3]}`,
      venue: blankVenue(body.match(/class="wdfl-venue-meta"[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1]),
      status: /is-postponed/.test(open) ? 'postponed' : undefined,
    }));
  }
  return out;
}

const LAYOUTS = { attrs: readAttrs, cells: readCells, columns: readColumns, grouped: readGrouped, cards: readCards };

export function read(html, page, now = new Date()) {
  return (LAYOUTS[page.layout] ?? readAttrs)(html, page, now);
}

function league({ name, url, area, countyHint = null, prefix, layout }) {
  return { name, pages: [{ url, area, countyHint, prefix, layout }], read };
}

export const galwayFa = league({
  name: 'Galway FA', url: 'https://galwayfa.ie/fixtures/', area: 'Connacht', countyHint: 'Galway', prefix: 'Galway FA', layout: 'attrs',
});
export const munsterSenior = league({
  name: 'Munster Senior League', url: 'https://www.munsterseniorleague.ie/fixtures/', area: 'Munster', prefix: 'Munster Senior League', layout: 'attrs',
});
export const donegalJunior = league({
  name: 'Donegal Junior League', url: 'https://www.donegaljuniorleague.ie/fixtures/', area: 'Ulster', countyHint: 'Donegal', prefix: 'Donegal Junior League', layout: 'cells',
});
export const corkYouth = league({
  name: 'Cork Youth Leagues', url: 'https://corkyouthleagues.ie/fixtures/', area: 'Munster', countyHint: 'Cork', prefix: 'Cork Youth Leagues', layout: 'columns',
});
export const midUlster = league({
  name: 'Mid-Ulster Football League', url: 'https://midulsterfootballleague.co.uk/fixtures/', area: 'Ulster', prefix: 'Mid-Ulster', layout: 'grouped',
});

// The public list is paged. Page 8 answers, but it has no games; 7 is the last page that does (16 Nov 2026).
export const wicklow = {
  name: 'Wicklow & District Football League',
  pages: [1, 2, 3, 4, 5, 6, 7].map((n) => ({
    url: n === 1 ? 'https://wdflgrassroots.com/fixtures/' : `https://wdflgrassroots.com/fixtures/?fixtures_page=${n}`,
    area: 'Leinster', countyHint: 'Wicklow', prefix: 'Wicklow & District', layout: 'cards',
  })),
  read,
};
