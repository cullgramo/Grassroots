# Grassroots

Grassroots is a lightweight browser demo for discovering Gaelic games fixtures on an interactive map. It renders a small event finder directly from `index.html` using React, Mapbox GL JS, and in-browser geolocation.

## Features

- Interactive Mapbox map centered on Ireland with event markers for matching fixtures.
- County, sport, and distance filters that update both the map markers and event list.
- Browser geolocation support for calculating approximate distance from the user to each event.
- Event cards with team names, venue, county crest, competition purpose, day, date, time, ticket status, ticket links, and Google Maps directions.
- No build step required for the demo; it can be opened directly in a browser.

## Project structure

```text
.
├── README.md      # Project documentation
├── index.html     # Self-contained React + Mapbox demo
└── package.json   # npm project metadata and scripts
```

## Getting started

### Prerequisites

- A modern web browser such as Chrome, Edge, Firefox, or Safari.
- Internet access so the page can load React, Babel, Mapbox GL JS, Mapbox tiles, and remote crest images from their CDNs.
- Location permission in the browser if you want to use distance-based filtering from your current position.

### Run the demo

Because the app is currently a static HTML demo, the quickest way to try it is to open the file directly:

```bash
open index.html
```

On Linux, you can use:

```bash
xdg-open index.html
```

You can also serve the directory with any static file server, for example:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000> in your browser.

## How to use the app

1. Open `index.html` in a browser.
2. Allow location access if prompted. This enables distance calculations and the distance filter.
3. Use the distance buttons (`2 km`, `5 km`, `10 km`, or `Near Me`) to limit events by proximity.
4. Use the county dropdown to show fixtures for a specific county.
5. Use the sport dropdown to switch between sports such as Hurling and Gaelic Football.
6. Click an event marker on the map to view a short popup.
7. Use `Directions` to open driving directions in Google Maps.
8. Use `Get Tickets` for ticketed events that include a ticket link.

## Data model

Events are currently hard-coded inside `index.html`. Each event includes fields like:

- `sport` — the event sport, for example `Hurling` or `Gaelic Football`.
- `location` — the venue name.
- `county` — the host county used for filtering and crest display.
- `teams` — the fixture title shown in cards and marker popups.
- `purpose` — competition round or event description.
- `datetime` — ISO-style date and time used for sorting and formatting.
- `latitude` and `longitude` — coordinates used for map markers and distance calculations.
- `ticketed` and `ticketLink` — ticket status and optional outbound purchase link.

To add a new event, add another object to the `events` array in `index.html` with the same fields.

## Mapbox configuration

The demo uses Mapbox GL JS and a Mapbox access token directly in `index.html`. For a production application, you should:

- Replace the demo token with your own Mapbox token.
- Restrict token usage in the Mapbox dashboard to trusted domains.
- Move secrets and environment-specific configuration out of client-side source where possible.
- Review Mapbox usage limits and billing before deploying publicly.

## Development notes

This repository currently uses CDN-hosted browser scripts rather than a bundled React toolchain. That keeps the demo simple, but it also means:

- JSX is transformed in the browser by Babel, which is convenient for demos but not ideal for production performance.
- There is no linting, build, or automated test setup yet.
- `npm test` is currently a placeholder script and exits with an error until real tests are added.

A future production-ready version could migrate the app into Vite, Next.js, or another React build system and split the code into reusable components.

## Troubleshooting

### The map does not load

- Confirm you are connected to the internet.
- Check the browser console for Mapbox token or network errors.
- Verify the Mapbox access token in `index.html` is still valid.

### Distance filtering does not change results

- Make sure you allowed location access in the browser.
- Some browsers restrict geolocation when a page is opened from `file://`. If this happens, serve the folder locally with `python3 -m http.server 8000` and open <http://localhost:8000>.
- If location access is denied or unavailable, county and sport filters will still work.

### Crest images do not appear

- Confirm that remote images from Wikimedia are not blocked by your browser, network, or privacy extensions.
- Check that the event county matches one of the keys in the `countyCrests` object.

## License

This project is currently marked as ISC in `package.json`.
