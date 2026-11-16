// Cork Athletic Union League publishes each week's fixtures as a post on its public blog.
// The blog's own feed (linked from the site; robots.txt is empty) carries the latest posts.
// A line is "Home v Away, ground, official". The official is the last piece and is never stored.
import { categoryFromText, readDate } from '../lib/util.mjs';
import { competitionOf, decode, notATeam } from './wp-fixtures.mjs';

export const name = 'Cork Athletic Union League';
export const pages = [{
  url: 'https://www.corkaul.com/feeds/posts/default?max-results=8',
  area: 'Munster', countyHint: 'Cork', prefix: 'Cork AUL',
}];

const unescapeXml = (s) => String(s ?? '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');

/** "8pm", "11.30 am", "k/o 2pm". */
function kickoff(text) {
  const m = String(text ?? '').match(/k\/o\s+(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let h = +m[1];
  const min = m[2] ?? '00';
  const half = m[3]?.toLowerCase();
  if (half === 'pm' && h < 12) h += 12;
  if (half === 'am' && h === 12) h = 0;
  if ((h === 0 && min === '00') || h > 23 || +min > 59) return null;
  return `${String(h).padStart(2, '0')}:${min}`;
}

function paragraphs(html) {
  return [...String(html).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((p) => decode(unescapeXml(p[1])))
    .filter(Boolean);
}

function posts(text) {
  if (!text.includes('<feed')) return [{ title: 'fixtures', html: text, link: null }];
  return [...text.split(/<entry\b/).slice(1)].map((entry) => ({
    title: decode(unescapeXml(entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')),
    html: unescapeXml(entry.match(/<content\b[^>]*>([\s\S]*?)<\/content>/i)?.[1] ?? ''),
    link: entry.match(/<link\b[^>]*rel=['"]alternate['"][^>]*>/i)?.[0].match(/href=['"]([^'"]+)['"]/)?.[1]
      ?? entry.match(/<link[^>]*href=['"]([^'"]+)['"][^>]*rel=['"]alternate['"]/i)?.[1]
      ?? null,
  })).filter((p) => /\bfixtures?\b/i.test(p.title) && !/result|table|blast|nostalgia/i.test(p.title));
}

const DAY = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

export function read(text, page, now = new Date()) {
  const out = [];
  for (const post of posts(text)) {
    let date = null;
    let time = null;
    let competition = '';
    for (const line of paragraphs(post.html)) {
      if (DAY.test(line) && !/\bv\b/i.test(line)) {
        date = readDate(line, now);
        time = kickoff(line) ?? time;
        continue;
      }
      if (!/\bv\b/i.test(line)) { competition = line; continue; }
      const ownTime = kickoff(line);
      const body = line.replace(/\.?\s*k\/o\s+.+$/i, '').replace(/\.\s*$/, '');
      const parts = body.split(',').map((p) => p.trim()).filter(Boolean);
      const sides = parts[0]?.match(/^(.+?)\s+v\s+(.+)$/i);
      if (!sides || !date || notATeam(sides[1]) || notATeam(sides[2])) continue;
      // parts[2] onwards is the official named on the line. It is not stored.
      out.push({
        ref: [date, sides[1], sides[2], competition].join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        sport: 'soccer', level: 'local', category: categoryFromText(competition),
        competition: competitionOf(page.prefix, competition),
        home: sides[1], away: sides[2], title: null, date,
        time: ownTime ?? time,
        venue: parts[1] ?? '',
        county: null, postcode: null, area: page.area ?? 'Munster', countyHint: page.countyHint ?? 'Cork',
        url: post.link || page.url,
      });
    }
  }
  return out;
}
