export default function getFormattedDate(ts: number) {
  const date = new Date(ts * 1000);
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}
