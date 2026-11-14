import { getSport } from '@/constants/sports';
import { fixtureTitle, type Fixture } from '@/types/fixture';
import { ticketLink } from '@/utils/tickets';

/**
 * Set this to the public address of a Grassroots fixture page (for example "https://grassroots.ie/fixture")
 * once one exists, and every shared message gains a "Details" link to it. There is no such page yet,
 * so for now a message carries the facts and a directions link, which work in every app.
 */
export const SHARE_BASE_URL: string | null = null;

/** Fixture times are Irish local times, so a shared message always shows them that way, wherever the sender is. */
function irishParts(startsAt: string) {
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

/** The plain-text message that goes into WhatsApp, a text, an email or any other app. */
export function shareMessage(f: Fixture): string {
  const sport = getSport(f.sport);
  const when = irishParts(f.startsAt);
  const lines: string[] = [];
  if (f.status === 'cancelled') lines.push('CANCELLED');
  if (f.status === 'postponed') lines.push('POSTPONED');
  lines.push(fixtureTitle(f));
  lines.push([sport.name, f.competition].filter(Boolean).join(' · '));
  lines.push(f.timeTbc ? `${when.day}, time to be confirmed` : `${when.day}, ${when.time}`);
  lines.push(`${f.venue}, ${f.county}`);
  lines.push(`Directions: ${directionsUrl(f)}`);
  const tickets = ticketLink(f);
  if (tickets?.kind === 'seller') lines.push(`Tickets: ${tickets.url}`);
  if (SHARE_BASE_URL) lines.push(`Details: ${SHARE_BASE_URL}/${f.id}`);
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
