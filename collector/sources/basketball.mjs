// Basketball Ireland national leagues. Each page lists the whole season, played games included.
import { parse } from 'node-html-parser';
import { tidy } from '../lib/util.mjs';

export const name = 'Basketball Ireland';
export const pages = [
  { url: 'https://ireland.basketball/MensSuperLeagueFixtures', competition: "Men's Super League", category: 'men', level: 'top' },
  { url: 'https://ireland.basketball/WomensSuperLeagueFixtures', competition: "Women's Super League", category: 'women', level: 'top' },
  { url: 'https://ireland.basketball/MensDivisionOneFixtures', competition: "Men's Division One", category: 'men', level: 'local' },
  { url: 'https://ireland.basketball/WomensDivisionOneFixtures', competition: "Women's Division One", category: 'women', level: 'local' },
];

// Which county each arena is in. The page does not say, and a name alone can match the wrong town
// (there is a Mercy College in Sligo and another in Waterford). This only narrows the map search:
// a ground still has to be found by name inside that county.
const D = ['Dublin'], C = ['Cork'], G = ['Galway'], K = ['Kerry'], L = ['Limerick'], BELFAST = ['Antrim', 'Down'];
const COUNTIES = {
  ALSAA: D, 'Castlepark School, Dalkey': D, 'Colaiste Eanna': D, 'Coláiste Bríde': D, 'Coláiste Íosagáin': D, 'Hansfield ETSS': D,
  'IWA Clontarf': D, 'IWA, Clontarf': D, 'Malahide Community School': D, 'National Basketball Arena': D, 'Oblate Hall, Inchicore': D,
  'Oblate Hall': D, "St Vincent's, Glasnevin": D, 'TUD Tallaght': D, 'Tolka Rovers Sports Complex': D, 'Trinity Sports Centre': D,
  'UCD Sports Centre': D, 'Fr Mathews Arena': C, 'MTU Arena': C, 'Mardyke Arena': C, 'Neptune Stadium': C, 'Parochial Hall': C,
  'Ballinfoile Community Centre': G, 'Calasanctius College': G, 'Corrandulla Community Centre': G, 'Kingfisher Sports Centre': G,
  'Sportlann Naomh Anna': G, 'Castleisland CC': K, 'Castleisland Community Centre': K, 'Kerry Sports Academy': K,
  'Killarney Sports & Leisure Centre': K, 'Killorglin Sports Complex': K, 'Mercy Mounthawk': K, 'Crescent College': L,
  'Limerick Educate Together': L, 'St Munchins College': L, 'UL Arena': L, 'Jordanstown Sports Village': BELFAST,
  'Lisburn Racquets Club': BELFAST, 'Newforge Sports Complex': BELFAST, 'Ballymakenny College': ['Louth'], 'Leixlip Amenities': ['Kildare'],
  'Mercy College, Sligo': ['Sligo'], 'Mercy College': ['Waterford'], "O'Loughlin Gaels": ['Kilkenny'], 'Phoenix Centre': ['Monaghan'],
  'Scoil Ruain Killenaule': ['Tipperary'], 'Scoil Ruáin, Killenaule': ['Tipperary'], "St Mary's Hall": ['Laois'], 'Virginia Show Centre': ['Cavan'],
};

export function read(html, page) {
  const out = [];
  // The page's markup is not well formed, so each fixture block is cut out and read on its own.
  for (const block of html.split(/(?=<ul class="[^"]*\btable-body\b)/).slice(1)) {
    const open = block.match(/^<ul[^>]*>/)?.[0] ?? '';
    const id = open.match(/data-fixtureId="([^"]+)"/i)?.[1];
    const when = open.match(/data-date="([^"]+)"/i)?.[1];
    const row = parse(block.slice(0, block.indexOf('</ul>') + 5));
    const pick = (cls) => tidy(row.querySelector(`li.smallview-hide.${cls} .data`)?.text ?? row.querySelector(`li.${cls} .data`)?.text);
    const home = pick('lteam1');
    const away = pick('lteam2');
    const start = when ? new Date(when) : null;
    if (!id || !home || !away || !start || Number.isNaN(start.getTime())) continue;
    out.push({
      ref: id, sport: 'basketball', level: page.level, category: page.category, competition: page.competition,
      home, away, title: null,
      // The page carries an exact timestamp, so no local-time conversion is needed.
      startsAt: start.toISOString(), date: start.toISOString().slice(0, 10), time: pick('ltime') || null,
      venue: /^tbc$/i.test(pick('lvenue')) ? '' : pick('lvenue'), county: null, counties: COUNTIES[pick('lvenue')] ?? null, postcode: null, area: null, url: page.url,
    });
  }
  return out;
}
