# Source coverage notes

A running record of every county board and league: what we read, what we don't, and why. Update this whenever a
source changes. The daily report (`collector/run.mjs`) shows live counts; this file keeps the reasons.

Last updated: 14 November 2026.

## County GAA boards

| County | Status | How | Notes |
|---|---|---|---|
| Antrim | Reading | own reader (`antrim-gaa.mjs`) | |
| Armagh | Skipped | none | Its feed is about 17 MB for 18 fixtures. Skipped on the owner's call; revisit. |
| Carlow | Reading | own reader | |
| Cavan | Reading | Club & County (`county-gaa.mjs`) | |
| Clare | Reading | Club & County | |
| Cork | Reading | own reader (`cork-gaa.mjs`, SportLoMo widget) | |
| Derry | Reading | Club & County, via `derry.clubandcounty.com` | Its extra pages answered 503 once on 14 Nov; if that repeats, the daily run shows red though data is saved. |
| Donegal | Reading | Club & County | |
| Down | Reading | Club & County | |
| Dublin | Reading | SportLoMo page (`dublin-gaa.mjs`) | |
| Fermanagh | Reading | Club & County | |
| **Galway** | **No fixtures to read** | none | Owner sent the link on 14 Nov: the page has no fixtures (off-season, or not published). Check again in the new year; GAA club fixtures start about February. |
| Kerry | Reading | Club & County | |
| Kildare | Reading | Club & County | |
| Kilkenny | Reading | Club & County | |
| Laois | Reading | Club & County | |
| Leitrim | **Switched off** | `leitrim-gaa.mjs` (kept) | The site answered 403 to GitHub's servers on 13 Nov. A refusal stands: not retried or worked around. Re-enable in `look.mjs` only if the board agrees. |
| **Limerick** | **Needs thought** | none yet | Owner sent the link on 14 Nov; it does not fit the existing readers. Look at how its site publishes fixtures, check its rules, then decide between a reader, a snapshot or asking the board. |
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

## Other sources

| Source | Status | Notes |
|---|---|---|
| Foireann (official GAA API) | Dormant | Needs a key requested by a Club Administrator naming Grassroots as developer. Reader is built and off. This is the biggest single gap for club and underage GAA. |
| NIFL Premiership (Northern Ireland football) | Snapshot only | `nifl-snapshot.mjs`: 105 fixtures to 27 Mar 2027, from the owner's screenshot and pasted page on 14 Nov. The league's site blocks automated reading (Cloudflare), so it is not live and not to be worked around. Championship, BetMcLean Cup and women's pages not yet added. Ask the league for a feed. |
| Irish FA, League of Ireland | Not read | Terms forbid copying. Permission needed. |
| Ticketmaster and Universe | Reading | |
| Club rugby (four provinces), basketball, hockey, Dublin youth soccer (DDSL), horse racing, MyRunResults | Reading | |
| Athletics Ireland, Leggit, FAI Connect, cricket | Not read | Permission or off-season; see the plan. |

## Placement rules worth remembering

- A ground found from a club or town name is only used for the sport it was found for (`slotFor` in `lib/grounds.mjs`).
- On a county board's page, a bare village name placed in another county is held for checking (`lib/build.mjs`).
- Positions supplied by the owner as Google Maps pins are noted as such in `grounds.json`. Use the full link, not a short one.
