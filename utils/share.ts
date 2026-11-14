import { getSport } from '@/constants/sports';
import { fixtureTitle, type Fixture } from '@/types/fixture';
import { SITE_URL } from '@/lib/config';
import { ticketLink } from '@/utils/tickets';

/** The page a shared link opens: <site>/f/<id>. Null until the site is live. */
export function fixtureLink(id: string, site: string | null = SITE_URL): string | null {
  return site ? `${site.replace(/\/+$/, '')}/f/${encodeURIComponent(id)}` : null;
}

/** Fixture times are Irish local times, so a shared message always shows them that way, wherever the sender is. */
export function irishParts(startsAt: string) {
  const d = new Date(startsAt);
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Dublin',
    }).formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return { day: `${get('weekday')} ${get('day')} ${get('month')}`, time: `${get('hour')}:${get('minute')}` };
  } catch {
    return {
      day: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    };
  }
}

export function directionsUrl(f: Pick<Fixture, 'latitude' | 'longitude'>): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}`;
}

/**
 * The plain-text message that goes into WhatsApp, a text, an email or any other app.
 * With the site live it is short and ends with the fixture's own link, which chat apps turn into a preview
 * and which brings the reader to Grassroots. Without it, the message carries the facts and a directions link.
 */
export function shareMessage(f: Fixture, site: string | null = SITE_URL): string {
  const sport = getSport(f.sport);
  const when = irishParts(f.startsAt);
  const whenLine = f.timeTbc ? `${when.day}, time to be confirmed` : `${when.day}, ${when.time}`;
  const off = f.status === 'cancelled' ? 'CANCELLED' : f.status === 'postponed' ? 'POSTPONED' : null;
  const link = fixtureLink(f.id, site);
  if (link) {
    return [off, fixtureTitle(f), whenLine, `${f.venue}, ${f.county}`, link].filter(Boolean).join('\n');
  }
  const lines: string[] = [];
  if (off) lines.push(off);
  lines.push(fixtureTitle(f));
  lines.push([sport.name, f.competition].filter(Boolean).join(' · '));
  lines.push(whenLine);
  lines.push(`${f.venue}, ${f.county}`);
  lines.push(`Directions: ${directionsUrl(f)}`);
  const tickets = ticketLink(f);
  if (tickets?.kind === 'seller') lines.push(`Tickets: ${tickets.url}`);
  lines.push('Found on Grassroots');
  return lines.join('\n');
}

export function shareSubject(f: Fixture): string {
  return fixtureTitle(f);
}

/** Opens WhatsApp (the app if installed, else WhatsApp Web) with the message ready to send. */
export const whatsAppUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** The phone's messages app. iOS and Android write the body differently. */
export const smsUrl = (text: string, os: string) => `sms:${os === 'ios' ? '&' : '?'}body=${encodeURIComponent(text)}`;

export const emailUrl = (subject: string, text: string) => `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
