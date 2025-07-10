import { logger } from './logger';

// Global variable to store disposable email domains
let disposableEmailDomains: Set<string> = new Set();
let lastFetchTime: number = 0;
let isLoading: boolean = false;

// Cache for 24 hours (in milliseconds)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

/**
 * Fetches disposable email domains from GitHub repository
 */
async function fetchDisposableEmailDomains(): Promise<void> {
  const now = Date.now();

  // Don't fetch if we already have recent data or if currently loading
  if (isLoading || (disposableEmailDomains.size > 0 && now - lastFetchTime < CACHE_DURATION)) {
    return;
  }

  isLoading = true;

  try {
    logger.info('Fetching disposable email domains from GitHub...');

    const response = await fetch('https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains_strict.txt');

    if (!response.ok) {
      throw new Error(`Failed to fetch disposable domains: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const domains = text
      .split('\n')
      .map(domain => domain.trim().toLowerCase())
      .filter(domain => domain.length > 0);

    disposableEmailDomains = new Set(domains);
    lastFetchTime = now;

    logger.info(`Successfully loaded ${disposableEmailDomains.size} disposable email domains`);
  } catch (error) {
    logger.error('Error fetching disposable email domains:', error);
    // Don't throw error to prevent app from crashing
  } finally {
    isLoading = false;
  }
}

/**
 * Checks if a domain is a disposable email domain
 */
export function isDisposableEmailDomain(domain: string): boolean {
  return disposableEmailDomains.has(domain.toLowerCase());
}

/**
 * Gets the current number of loaded disposable domains
 */
export function getDisposableDomainsCount(): number {
  return disposableEmailDomains.size;
}

/**
 * Initializes or refreshes the disposable email domains list
 */
export async function initializeDisposableEmailDomains(): Promise<void> {
  await fetchDisposableEmailDomains();
}

/**
 * Forces a refresh of the disposable email domains list
 */
export async function refreshDisposableEmailDomains(): Promise<void> {
  lastFetchTime = 0; // Reset cache
  await fetchDisposableEmailDomains();
}
