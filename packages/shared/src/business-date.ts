// Fecha de negocio = día natural en Europe/Madrid (supuesto 15; docs/arquitectura.md §4).
// Constante, no configurable. Se calcula sobre el instante que da el Clock.
export const BUSINESS_TIME_ZONE = 'Europe/Madrid';

const FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `YYYY-MM-DD` del instante en Europe/Madrid. */
export function businessDate(instant: Date): string {
  const parts = FORMAT.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
