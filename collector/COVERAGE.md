# Source coverage notes

A running record of every county board and league: what we read, what we don't, and why. Update this whenever a
source changes. The daily report (`collector/run.mjs`) shows live counts; this file keeps the reasons.

Last updated: 16 November 2026.

## County GAA boards

| County | Status | How | Notes |
|---|---|---|---|
| Antrim | Reading | own reader (`antrim-gaa.mjs`) | |
| Armagh | **Switched off** | `armagh-gaa.mjs` (kept) | armaghgaa.net answered 403 to the daily run on GitHub on 16 Nov 2026. A refusal stands: not retried or worked around. Re-enable in `look.mjs` only if Armagh agrees. |
| Carlow | Reading | own reader | |
| Cavan | Reading | Club & County (`county-gaa.mjs`) | |
| Clare | Reading | Club & County | |
| Cork | Reading | own reader (`cork-gaa.mjs`, SportLoMo widget): the county board page plus the nine divisional and Cork PPS pages (`?user=<id>`) | Checked 15 Nov 2026: the county page alone showed 0 games (its own competitions only); the divisional and PPS pages carry the club games (26 upcoming 15-30 Nov: 16 football, 10 hurling). Each competition is prefixed with its division. Camogie/ladies are women; adult hurling/football men; juvenile and schools unlabelled. |
| Derry | Reading | Club & County, via `derry.clubandcounty.com` | Its extra pages answered 503 once on 14 Nov; if that repeats, the daily run shows red though data is saved. |
| Donegal | Reading | Club & County | |
| Down | Reading | Club & County | |
| Dublin | Reading | SportLoMo page (`dublin-gaa.mjs`) | |
| Fermanagh | Reading | Club & County | |
| Galway | Reader published, currently 0 fixtures | own reader (`galway-gaa.mjs`, SportLoMo site): Football `?user=6929`, Hurling `?user=44` | Checked 15 Nov 2026: server-rendered, robots.txt only blocks /wp-admin/; 0 upcoming games published (season over). The page shows the next 30 days only. The script-loaded per-game "More +" panel (referee) is never fetched. Should return games once club fixtures are published (about February). |
| Kerry | Reading | Club & County | |
| Kildare | Reading | Club & County | |
| Kilkenny | Reading | Club & County | |
| Laois | Reading | Club & County | |
| Leitrim | **Switched off** | `leitrim-gaa.mjs` (kept) | The site answered 403 to GitHub's servers on 13 Nov. A refusal stands: not retried or worked around. Re-enable in `look.mjs` only if the board agrees. |
| **Limerick** | **Skipped** | none | Checked 16 Nov 2026. `robots.txt` is Cloudflare-managed: `User-agent: *` is allowed on `/`, with no crawl-delay. The fixtures pages (`/fixtures/`, `/football-fixtures/`, `/hurling-fixtures/`) answer 403 with a Cloudflare challenge ("Just a moment..."). A challenge stands: not worked around. |
| Longford | Snapshot only | `longford-snapshot.mjs` | One-off copy from 13 Nov (the page is fed by the Foireann API). Not live. |
| **Louth** | **Site down** | none yet | Owner reported on 14 Nov that the board's website is down. Try again later; nothing to read meanwhile. |
| Mayo | Reading | own reader | |
| Meath | Reading | Club & County | |
| Monaghan | Reading | Club & County | |
| Offaly | Reading | Club & County | |
| Roscommon | Reading | own reader | |
| Sligo | Reading | own reader | |
| Tipperary | Reading | Club & County | |
| Tyrone | Reading | Club & County | |
| Waterford | Reading | own reader (`waterford-gaa.mjs`, SportLoMo widget) | |
| Westmeath | Reading | Club & County | |
| Wexford | Reading | Club & County, via `wexford.clubandcounty.com` | The board's own site embeds that page. |
| Wicklow | Reading | Club & County | |

Provincial pages (Leinster, Munster, Ulster, Connacht GAA) are also read.

**GAA audit note (15 Nov 2026, pass 3):** Cork was silently returning nothing (it read only the county board's own page) and Galway had no reader. Both now follow the shared rules: referee names are never read or stored, `admin-ajax.php` and the per-game "More +" panel are never used, BYE/TBC/placeholder rows and played results are dropped, and postponed games are kept with status postponed. Cork and Galway grounds were placed in pass 3 (`grounds.json`); the school-site, Bishopstown 4G, Cloneen and Bansha placements are medium confidence.

## Other sources

| Source | Status | Notes |
|---|---|---|
| Foireann (official GAA API) | Dormant | Needs a key requested by a Club Administrator naming Grassroots as developer. Reader is built and off. This is the biggest single gap for club and underage GAA. |
| NIFL Premiership (Northern Ireland football) | Snapshot only | `nifl-snapshot.mjs`: 105 fixtures to 27 Mar 2027, from the owner's screenshot and pasted page on 14 Nov. The league's site blocks automated reading (Cloudflare), so it is not live and not to be worked around. Championship, BetMcLean Cup and women's pages not yet added. Ask the league for a feed. |
| Olympic Handball (OHI Senior League and OHI Senior League Women) | Snapshot only | `handball-snapshot.mjs`: 40 fixtures to 21 Mar 2027, copied by the owner from the competitions' MyGameDay pages on 15 Nov. The pages answer 403 to automated reading, so they are not live and not to be worked around. The competitions' "Sync to Calendar" links (MyGameDay's own feed) are the route to a live feed. The first league's name is to be confirmed (probably the men's). |
| Running Calendar Ireland (races) | Snapshot only | `running-calendar-snapshot.mjs`: 158 races, 15 Nov 2026 to Nov 2027, copied by the owner on 15 Nov and cleaned. Removed 30 (date TBC 13, not running 10, already in the app 6, nationwide 1) and left out 22 races to review plus 4 region-level or mismatched ones; every start place was checked against the map. The site answers 403 "Unusual Activity" to automated reading, so it is not live and not to be worked around. No times on the calendar (shown as Time TBC). Start places are town or venue level. Rights: permission from the site's operators still to be asked; a feed would replace the copy. |
| Irish FA, League of Ireland | Not read | Terms forbid copying. Permission needed. |
| Ticketmaster and Universe | Reading | |
| Club rugby (four provinces), professional rugby (Leinster, Munster, Connacht, Ulster: URC, Champions Cup, Challenge Cup; only games at placed grounds are saved; the URC source was reviewed and kept by the owner on 15 Nov 2026; Laya Arena = RDS Arena and Virgin Media Park = Musgrave Park, owner-confirmed), basketball, hockey, Dublin youth soccer (DDSL), horse racing, MyRunResults | Reading | |
| Galway FA, Munster Senior League, Donegal Junior League, Cork Youth Leagues, Mid-Ulster Football League, Wicklow & District FL | Reading | One reader (`wp-fixtures.mjs`), configured per league. Approved 16 Nov 2026. Officials' names and crests are not read. Wicklow's list is the seven public pages of `/fixtures/`. Grounds are mostly not in `grounds.json` yet. |
| Cork Athletic Union League | Reading | `cork-aul.mjs`. The latest "Fixtures" post on the public blog feed. Each line names an official after the ground; that name is not stored. |
| Limerick & District League | Reading | `limerick-district.mjs`. Upcoming rows on the public scores-results page. Played games and scorers are not read. |
| Amateur Football League (Republic) | Reading | `amateur-fl.mjs`. SportsPress list. Distinct from the Northern Amateur Football League. The published rows name no ground (`N/A`). |
| Northern Amateur Football League | Reading | `nafl.mjs`. The fixtures page is filled from `/data/fixtures.json` (the given `/grounds/fixtures.html` URL returns the homepage). Every scheduled row has a blank venue. `robots.txt` allows `/`; Cloudflare content-signal sets `ai-train=no` and `use=reference`. |
| SFAI, Limerick District Schoolchildren League, Kildare & District Football League, Connacht Senior Alliance, Clubforce leagues (LWSSL, Leinster Senior League, Carlow, Kilkenny, Wexford, United Churches), Cork Business League | Not read | Checked 16 Nov 2026. Reasons are in the pull request. Clubforce fixture rows are not in the public HTML; `apicm.clubforce.com` robots.txt disallows every path, and the Comortais feed is not used. Cork Business League answered with a Cloudflare challenge. `carlowsoccer.ie` was not requested (`Disallow: /`). |
| Athletics Ireland, Leggit, FAI Connect | Not read | Permission or off-season; see the plan. |
| Cricket Leinster, North West championship, GRI race meetings, Motorsport Ireland, ANICC 2026 calendar, Rowing Ireland 2026 calendar, Volleyball Ireland 2026-27 calendar, Netball Ireland, Belfast Giants home games, Ireland Water Polo, Irish Lawn Bowls | Reading | Added 16 Nov 2026. See the pull request for robots checks, skipped sites, and grounds the directory does not know yet. |

## Protecting the data (audit M5)

- **Terms of use** with a no-bulk-copying clause: `constants/legal.ts` (draft). The Terms link and page stay hidden until `LEGAL.owner` and `LEGAL.email` are filled in. A solicitor should confirm the wording first: `docs/legal/solicitor-brief.md`.
- **Evidence**: `.github/workflows/snapshot.yml` saves a dated copy of the public data on the 1st of each month as a GitHub release with a SHA-256 fingerprint (`collector/snapshot.mjs`). Record ids are generated only by our collector.
- **Not done on purpose**: invented trap fixtures (they would show to real users), and rate limiting at the edge (revisit only if copying is seen).

## Placement rules worth remembering

- A ground found from a club or town name is only used for the sport it was found for (`slotFor` in `lib/grounds.mjs`).
- On a county board's page, a bare village name placed in another county is held for checking (`lib/build.mjs`).
- Positions supplied by the owner as Google Maps pins are noted as such in `grounds.json`. Use the full link, not a short one.

## Parked app features

| Feature | State | What it needs |
|---|---|---|
| Share a fixture as a picture card | Built, switched off (14 Nov 2026). `PICTURE_CARD_ENABLED` in `components/ShareFixture.tsx`. | Important, but the card's design needs more UX work first: three designs were tried (dark green, plain white, minimal) and none was settled on. Not yet tried on a phone. Text sharing (WhatsApp, text, email, copy, share sheet) stays on. |
| Delete the old `import-ticketmaster` function in Supabase | Left in place by the owner (15 Nov 2026) | The daily GitHub run replaced it. Until it is deleted it is an extra public endpoint protected only by `IMPORT_SECRET` (set that to a random string of 24+ characters), and it will fail if called after migration 0005 (the deployed copy uses the old venue key). The Ticketmaster key in GitHub is separate and stays. |

## Home-ground fallback (17 Nov 2026)

Two home-and-away soccer leagues publish fixtures with no ground: the Northern Amateur Football League (333 in run 34) and the Wicklow & District Football League (83). For these two sources only (`homeGrounds` on the source), a fixture with no ground is shown at the home club's own ground when that ground is in `grounds.json` under `Area||@club` (for example `Ulster||@crumlin united`). Such a fixture is saved with `venue_confirmed = false` (migration 0009) and the app says "home ground, not confirmed by the league". Finals and semi-finals are never placed this way. A club whose ground is not in the directory stays left out, with the reason "No ground given (the home club's ground is not in the directory yet)". Before migration 0009 is run, these fixtures are not saved at all.
