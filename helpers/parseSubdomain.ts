export function parseSubdomain(url: string): string | null {
  // Remove protocol and get the hostname part of the URL
  const hostname = url.replace(/https?:\/\//, '').split('/')[0];

  // Remove port number if present
  const hostnameWithoutPort = hostname.split(':')[0];

  // Split hostname into parts
  const parts = hostnameWithoutPort.split('.');

  // Check conditions for subdomain presence
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0];
  } else if (parts.length === 2 && hostnameWithoutPort.endsWith('.localhost')) {
    return parts[0];
  }

  return null;
}

export function getOnlyHostname(url: string): string | null {
  if (!url) {
    return null;
  }

  // Remove protocol, port, and path
  const hostname = url.replace(/https?:\/\//, '').split(/[/:]/)[0];

  // Special handling for 'localhost'
  if (hostname.endsWith('.localhost') || hostname === 'localhost') {
    return 'localhost';
  }

  // Extract the main domain part
  const parts = hostname.split('.');

  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }

  return null;
}
