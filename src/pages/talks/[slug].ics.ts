import type { APIRoute } from 'astro';
import { talks, site } from '../../data/site';

// G44: per-talk .ics download. Seminar organisers and attendees want a
// calendar entry; we generate one VEVENT per talk at build time.
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
function slugify(t: { venue: string; date: string; year: number }): string {
  return `${t.venue}-${t.date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
// First day-number + month found in a date string → YYYYMMDD.
function ymd(date: string, year: number): string {
  const day = (date.match(/\b(\d{1,2})\b/) || [])[1] || '1';
  const m = (date.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/) || [])[1];
  const mi = m ? MONTHS.indexOf(m) + 1 : 1;
  return `${year}${String(mi).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}
function esc(s: string): string { return s.replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n'); }

export function getStaticPaths() {
  return talks.map(t => ({ params: { slug: slugify(t) }, props: { talk: t } }));
}

export const GET: APIRoute = ({ props }) => {
  const t = (props as any).talk as typeof talks[number];
  const start = ymd(t.date, t.year);
  // all-day event (end = start + 1 day, simplest robust form)
  const endDay = String(Number(start) + 1);
  const uid = `${slugify(t)}@prashgarg.github.io`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//prashantgarg.os//talks//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${endDay}`,
    `SUMMARY:${esc(`${t.title} — Prashant Garg`)}`,
    `LOCATION:${esc(t.location)}`,
    `DESCRIPTION:${esc(`${t.title} at ${t.venue}. ${t.url || site.origin + '/talks'}`)}`,
    ...(t.url ? [`URL:${t.url}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slugify(t)}.ics"`,
    },
  });
};
