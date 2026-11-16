// GAA Handball: national fixtures. The association page
// (https://www.gaahandball.ie/competitions/fixtures-results-standings) does not list the games itself.
// It embeds the public fixtures list at knowthescore.ie, and that page loads
// /api.php/match/listfixtures?matches=-1 (its "Fixtures" tab: matches still to be played).
// Checked 16 Nov 2026: gaahandball.ie/robots.txt allows every path; knowthescore.ie/robots.txt is a 404
// (no disallow, no crawl-delay). Neither page blocked the read.
// Crests and logos in the feed are never read. The feed has a referee field; it is never read.
// The two named players are the sides (a club, where the feed gives one, is kept in brackets).
// A side that is still a placeholder (TBC, Winner, Seed 12, AN Other) is not a fixture yet.
import { categoryFromText, readTime, tidy } from '../lib/util.mjs';

export const name = 'GAA Handball';
const LIST = 'https://knowthescore.ie/api.php/match/listfixtures?matches=-1&courts=0&tournament=0&category=0&grade=0&venue=&date=0000-00-00';
export const pages = [{ url: LIST, link: 'https://www.gaahandball.ie/competitions/fixtures-results-standings', area: 'Ireland' }];

const PLACEHOLDER = /\b(winners?|losers?|runner.up|bye|tbc|tba|seed\s+\d+|an other|to be (confirmed|announced|decided))\b/i;

/** One side, as the fixtures page shows it: the player, with the club in brackets when the feed names one. */
function side(team, player1, player2) {
  const club = tidy(team).replace(/^\.+/, '');
  const first = tidy(player1);
  const second = tidy(player2);
  const players = [first, second && second.toLowerCase() !== first.toLowerCase() ? second : ''].filter(Boolean);
  const player = players.join(' & ');
  if (player && club && club.toLowerCase() !== player.toLowerCase()) return `${player} (${club})`;
  return player || club;
}

function isPlaceholder(...parts) {
  const named = parts.map(tidy).filter(Boolean);
  return named.length === 0 || named.some((p) => PLACEHOLDER.test(p));
}

export function read(body, page) {
  let data;
  try { data = JSON.parse(body); } catch { return []; }
  if (!Array.isArray(data)) return [];
  const out = [];
  for (const row of data) {
    if (row?.match_id == null) continue;
    if (tidy(row.result)) continue;
    const stamp = String(row.matchDate ?? '');
    const when = stamp.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    if (!when) continue;
    if (isPlaceholder(row.team1_name, row.team1_player1, row.team1_player2)) continue;
    if (isPlaceholder(row.team2_name, row.team2_player1, row.team2_player2)) continue;
    const home = side(row.team1_name, row.team1_player1, row.team1_player2);
    const away = side(row.team2_name, row.team2_player1, row.team2_player2);
    if (!home || !away || PLACEHOLDER.test(home) || PLACEHOLDER.test(away)) continue;
    const venueRaw = tidy(row.venue);
    // The fixtures page hides the clock when the venue is still TBC, so that time is not treated as real.
    const venue = /^(tbc|tba|to be confirmed)?$/i.test(venueRaw) ? '' : venueRaw;
    const time = venue ? readTime(when[2]) : null;
    const competition = tidy([row.tname, row.cname, row.sname, row.name].filter(Boolean).join(' '));
    const named = `${row.cname ?? ''} ${row.sname ?? ''}`;
    out.push({
      ref: String(row.match_id),
      // GAA handball. The app's handball sport is the id these rows use.
      sport: 'handball', level: /all.ireland|national/i.test(row.tname ?? '') ? 'top' : 'local',
      category: categoryFromText(named),
      competition, home, away, title: null, date: when[1], time,
      venue, county: null, postcode: null, area: page.area ?? 'Ireland', countyHint: null,
      url: page.link ?? page.url,
    });
  }
  return out;
}
