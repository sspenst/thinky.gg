// Mock for debounce package
// In tests, we don't want actual debouncing, so we just execute the function immediately

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function debounce<T extends (...args: any[]) => any>(
  fn: T,
  _delay?: number
): T {
  return fn;
}
