import { getSport } from '@/constants/sports';
import { fixtureTitle, type Fixture } from '@/types/fixture';
import { directionsUrl, irishParts } from '@/utils/share';
import { ticketLink } from '@/utils/tickets';

/**
 * The page a shared fixture link opens. It is plain HTML built on the server, so WhatsApp, Messenger, iMessage
 * and others can read its preview tags (they do not run the app), and it loads instantly for the person tapping it.
 * From there one tap takes them into Grassroots: the fixture on the map, or more games near them.
 *
 * The preview "little card" in a chat is: the square picture public/og.png (600x600), the fixture's title and its
 * day, time and ground. LOGO PLACEHOLDER: public/og.png and the "G" mark below (.mark) are stand-ins. To use the real
 * logo, replace public/og.png with a square 600x600 PNG (keep the name) and swap the .mark span for an <img>.
 */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** A game counts as played three hours after it starts. */
export const PLAYED_AFTER_MS = 3 * 60 * 60 * 1000;

export type PageState = 'upcoming' | 'played' | 'missing';

export function pageState(f: Fixture | null, now: Date): PageState {
  if (!f) return 'missing';
  return new Date(f.startsAt).getTime() + PLAYED_AFTER_MS < now.getTime() ? 'played' : 'upcoming';
}

export interface Preview {
  title: string;
  description: string;
}

/** What the chat app's preview shows. */
export function previewFor(f: Fixture | null, state: PageState): Preview {
  if (!f || state === 'missing') {
    return { title: 'Grassroots', description: 'Every game. Everywhere. On a map. Find sports fixtures near you.' };
  }
  const when = irishParts(f.startsAt);
  const time = f.timeTbc ? 'time TBC' : when.time;
  const off = f.status === 'cancelled' ? 'Cancelled · ' : f.status === 'postponed' ? 'Postponed · ' : '';
  const sport = getSport(f.sport).name;
  return {
    title: `${state === 'played' ? 'Played: ' : ''}${fixtureTitle(f)}`,
    description: `${off}${when.day}, ${time} · ${f.venue}, ${f.county} · ${sport}`,
  };
}

const STYLE = `
*{box-sizing:border-box;margin:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#F6F5EF;color:#10281F;line-height:1.35}
main{max-width:480px;margin:0 auto;padding:24px 20px 40px}
.brand{display:inline-flex;align-items:center;font-weight:800;font-size:18px;color:#17704A;text-decoration:none}
.mark{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;background:#E3A52B;color:#10281F;font-weight:800;font-size:19px;margin-right:9px}
.card{background:#fff;border-radius:20px;padding:24px;margin-top:20px;box-shadow:0 1px 3px rgba(16,40,31,.12);border-top:6px solid var(--c)}
.sport{font-size:13px;font-weight:800;letter-spacing:1.2px;color:#4A5A52;text-transform:uppercase}
.alert{display:inline-block;background:#b91c1c;color:#fff;font-weight:800;font-size:13px;letter-spacing:1px;border-radius:6px;padding:3px 10px;margin-top:10px}
.played{display:inline-block;background:#ECE9DC;color:#10281F;font-weight:700;font-size:13px;border-radius:6px;padding:3px 10px;margin-top:10px}
h1{font-size:28px;line-height:1.15;margin-top:10px}
.v{color:#4A5A52;font-size:16px;font-weight:700;margin:4px 0}
.comp{color:#4A5A52;font-size:15px;margin-top:8px}
.when{font-size:22px;font-weight:800;margin-top:18px}
.where{font-size:17px;margin-top:4px}
.btn{display:block;text-align:center;font-weight:800;font-size:17px;border-radius:26px;padding:15px;margin-top:12px;text-decoration:none}
.primary{background:#17704A;color:#fff}
.secondary{border:2px solid #17704A;color:#17704A}
.note{color:#4A5A52;font-size:13px;text-align:center;margin-top:20px}
`;

export function fixturePageHtml(f: Fixture | null, opts: { id: string; origin: string; now?: Date }): string {
  const now = opts.now ?? new Date();
  const state = pageState(f, now);
  const preview = previewFor(f, state);
  const pageUrl = `${opts.origin}/f/${encodeURIComponent(opts.id)}`;
  const head = `<!doctype html><html lang="en-IE"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(preview.title)} · Grassroots</title>
<meta name="description" content="${esc(preview.description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Grassroots">
<meta property="og:title" content="${esc(preview.title)}">
<meta property="og:description" content="${esc(preview.description)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:image" content="${esc(opts.origin)}/og.png">
<meta property="og:image:width" content="600"><meta property="og:image:height" content="600">
<meta name="twitter:card" content="summary">
<meta name="robots" content="noindex">
<style>${STYLE}</style></head><body><main>
<a class="brand" href="/?ref=share"><span class="mark" aria-hidden="true">G</span>Grassroots</a>`;

  if (!f || state === 'missing') {
    return `${head}
<div class="card" style="--c:#17704A"><h1>This fixture is no longer listed</h1>
<p class="where">It may have been played, moved or taken off its source’s list.</p></div>
<a class="btn primary" href="/?ref=share">See games near you</a>
</main></body></html>`;
  }

  const sport = getSport(f.sport);
  const when = irishParts(f.startsAt);
  const time = f.timeTbc ? 'time to be confirmed' : when.time;
  const tickets = ticketLink(f);
  const teams = f.homeTeam && f.awayTeam
    ? `<h1>${esc(f.homeTeam)}</h1><p class="v">v</p><h1 style="margin-top:0">${esc(f.awayTeam)}</h1>`
    : `<h1>${esc(fixtureTitle(f))}</h1>`;
  const badge = state === 'played' ? '<p class="played">This game has been played</p>'
    : f.status === 'cancelled' ? '<p class="alert">CANCELLED</p>'
    : f.status === 'postponed' ? '<p class="alert">POSTPONED</p>' : '';
  const actions = state === 'played'
    ? `<a class="btn primary" href="/?ref=share">See upcoming games near you</a>`
    : `<a class="btn primary" href="/fixture/${encodeURIComponent(f.id)}">See it on the map</a>
<a class="btn secondary" href="${esc(directionsUrl(f))}">Get directions</a>
${tickets?.kind === 'seller' ? `<a class="btn secondary" href="${esc(tickets.url)}">Get tickets</a>` : ''}
<a class="btn secondary" href="/?ref=share">More games near you</a>`;

  return `${head}
<div class="card" style="--c:${esc(sport.color)}">
<p class="sport">${esc(sport.name)} · ${esc(f.level)}</p>${badge}
${teams}
${f.competition ? `<p class="comp">${esc(f.competition)}</p>` : ''}
<p class="when">${esc(when.day)}, ${esc(time)}</p>
<p class="where">${esc(f.venue)}, ${esc(f.county)}</p>
</div>
${actions}
<p class="note">Check with the club or the competition before you travel. Fixtures can change.</p>
</main></body></html>`;
}
