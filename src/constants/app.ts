/**
 * Single source of truth for product identity and Nepal-specific regional
 * defaults. Every other module must import from here instead of hardcoding
 * the app name, currency, timezone, etc.
 */

export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? 'Amrit LifeOS';

/** Product version, stamped into exports/backups so a file records what wrote it. */
export const APP_VERSION = '1.0.0';

export const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'http://localhost:8081';

export const APP_SCHEME = 'amritlifeos';

/** Regional defaults. All are user-overridable in Settings after onboarding. */
export const REGIONAL_DEFAULTS = {
  country: 'Nepal',
  timezone: process.env.EXPO_PUBLIC_DEFAULT_TIMEZONE ?? 'Asia/Kathmandu',
  primaryCurrency: process.env.EXPO_PUBLIC_DEFAULT_CURRENCY ?? 'NPR',
  secondaryCurrencies: ['AUD', 'USD', 'INR'] as const,
  primaryLanguage: 'en' as const,
  optionalLanguage: 'ne' as const,
  supportedScripts: ['Latin', 'Devanagari'] as const,
  /** Nepal fiscal year starts mid-July (Shrawan 1). 1 = January .. 12 = December. */
  fiscalYearStartMonth: 4,
  /** 0 = Sunday, matches Nepal's week start convention. */
  weekStart: 0,
  dateSystem: 'AD' as const,
} as const;

export const CURRENCY_MINOR_UNITS: Record<string, number> = {
  NPR: 2,
  INR: 2,
  USD: 2,
  AUD: 2,
  EUR: 2,
  GBP: 2,
};

export const SUPPORTED_CURRENCIES = ['NPR', 'AUD', 'USD', 'INR'] as const;

/** Storage bucket names — must match supabase/policies/0001_rls_policies.sql. */
export const STORAGE_BUCKETS = {
  documents: 'documents',
  avatars: 'avatars',
} as const;
