export interface MobileCountry {
  code: string;
  name: string;
  digits: number;
  /** ISO 3166-1 alpha-2 code, used to derive the flag emoji. */
  cca2: string;
  /** Flag emoji shown in the mobile-code dropdown. */
  flag: string;
}

// Generic config of allowed mobile digits per country code.
// Used across create/update forms so that when the code changes the
// validation + maxlength adapt automatically.
export const MOBILE_COUNTRIES: MobileCountry[] = [
  { code: '+91', name: 'India', digits: 10, cca2: 'IN', flag: '🇮🇳' },
  { code: '+1', name: 'USA', digits: 10, cca2: 'US', flag: '🇺🇸' },
  { code: '+44', name: 'UK', digits: 10, cca2: 'GB', flag: '🇬🇧' },
  { code: '+971', name: 'UAE', digits: 9, cca2: 'AE', flag: '🇦🇪' },
  { code: '+61', name: 'Australia', digits: 9, cca2: 'AU', flag: '🇦🇺' },
  { code: '+65', name: 'Singapore', digits: 8, cca2: 'SG', flag: '🇸🇬' },
  { code: '+60', name: 'Malaysia', digits: 9, cca2: 'MY', flag: '🇲🇾' },
  { code: '+82', name: 'Korea', digits: 10, cca2: 'KR', flag: '🇰🇷' },
  { code: '+81', name: 'Japan', digits: 10, cca2: 'JP', flag: '🇯🇵' },
  { code: '+49', name: 'Germany', digits: 11, cca2: 'DE', flag: '🇩🇪' },
  { code: '+33', name: 'France', digits: 9, cca2: 'FR', flag: '🇫🇷' },
  { code: '+39', name: 'Italy', digits: 9, cca2: 'IT', flag: '🇮🇹' },
  { code: '+34', name: 'Spain', digits: 9, cca2: 'ES', flag: '🇪🇸' },
  { code: '+55', name: 'Brazil', digits: 11, cca2: 'BR', flag: '🇧🇷' },
  { code: '+7', name: 'Russia', digits: 10, cca2: 'RU', flag: '🇷🇺' },
  { code: '+86', name: 'China', digits: 11, cca2: 'CN', flag: '🇨🇳' },
  { code: '+27', name: 'South Africa', digits: 9, cca2: 'ZA', flag: '🇿🇦' },
  { code: '+52', name: 'Mexico', digits: 10, cca2: 'MX', flag: '🇲🇽' },
  { code: '+880', name: 'Bangladesh', digits: 10, cca2: 'BD', flag: '🇧🇩' },
  { code: '+92', name: 'Pakistan', digits: 10, cca2: 'PK', flag: '🇵🇰' },
  { code: '+977', name: 'Nepal', digits: 10, cca2: 'NP', flag: '🇳🇵' },
  { code: '+94', name: 'Sri Lanka', digits: 9, cca2: 'LK', flag: '🇱🇰' }
];

export const DEFAULT_MOBILE_CODE = '+91';
export const DEFAULT_MOBILE_DIGITS = 10;

/** Normalises any stored code ('91', ' +91 ', '+91') to the canonical '+91' form. */
export function normalizeMobileCode(code: string | null | undefined): string {
  if (!code) return '';
  const trimmed = code.toString().trim();
  if (!trimmed) return '';
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

export function getMobileCountry(code: string | null | undefined): MobileCountry | undefined {
  const normalized = normalizeMobileCode(code);
  if (!normalized) return undefined;
  return MOBILE_COUNTRIES.find(c => c.code === normalized);
}

export function getMobileDigits(code: string | null | undefined): number {
  return getMobileCountry(code)?.digits ?? DEFAULT_MOBILE_DIGITS;
}

/** Flag emoji for a mobile code; falls back to a globe for unknown codes. */
export function getCountryFlag(code: string | null | undefined): string {
  return getMobileCountry(code)?.flag ?? '🌐';
}

/** Exact-length digit pattern for the given mobile code. */
export function getMobilePattern(code: string | null | undefined): RegExp {
  return new RegExp(`^[0-9]{${getMobileDigits(code)}}$`);
}

/** Strips non-digits and trims to the length allowed by the given mobile code. */
export function sanitizeMobileNumber(value: string | null | undefined, code: string | null | undefined): string {
  return (value ?? '').replace(/[^0-9]/g, '').slice(0, getMobileDigits(code));
}
