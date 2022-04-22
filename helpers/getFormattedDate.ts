export default function getFormattedDate(ts: number, time = true) {
  const date = new Date(ts * 1000);
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: time ? 'short' : undefined });
}
