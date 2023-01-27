export default function isTheme(theme: string) {
  return typeof document !== 'undefined' && document.body.classList.contains(theme);
}
