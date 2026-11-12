// Horse racing: every race meeting in Ireland, from Horse Racing Ireland's published calendar files.
// These are calendar feeds made for people to subscribe to. They give the course and the day, not race times.
export const name = 'Horse Racing Ireland';
const year = new Date().getUTCFullYear();
// The file names are HRI's own and differ year to year; a missing year is simply reported as unread.
export const pages = [
  { url: `https://www.hri.ie/HRI/media/HRI/HRIRacingFix${year}.ics` },
  { url: `https://www.hri.ie/HRI/media/HRI/RacingFix${year + 1}.ics` },
];

export function read(text, page) {
  const out = [];
  for (const block of text.split('BEGIN:VEVENT').slice(1)) {
    const day = block.match(/DTSTART[^:\r\n]*:(\d{4})(\d{2})(\d{2})/);
    const summary = (block.match(/SUMMARY:([^\r\n]*)/)?.[1] ?? '').trim();
    if (!day || !summary) continue;
    const evening = /\(e\)/i.test(summary);
    const course = summary.replace(/\([^)]*\)/g, '').trim();
    const link = (block.match(/DESCRIPTION:(https?:\/\/[^\s\\]+)/)?.[1] ?? '').trim();
    const date = `${day[1]}-${day[2]}-${day[3]}`;
    out.push({
      ref: `${date}-${course}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport: 'horse-racing', level: 'top', category: null,
      competition: evening ? 'Evening meeting' : 'Race meeting',
      home: null, away: null, title: `${course} Races`,
      date, time: null, timeUnknownOk: true,
      venue: `${course} Racecourse`, county: null, postcode: null, area: 'Ireland',
      url: link || 'https://www.hri.ie/fixture-list',
    });
  }
  return out;
}
