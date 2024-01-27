export function validBackgroundImageUrl(url: string): boolean {
  const match = url.match(/^(https?:\/\/)?(www\.)?(i\.)?imgur\.com\/[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)?$/);

  return !!match;
}
