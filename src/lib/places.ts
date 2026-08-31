/**
 * Countries and US states, for the admin forms.
 *
 * Both were free text with a hint reading "Two-letter code, e.g. US." The
 * first real event entered had its timezone left on a wrong default, which is
 * the same class of problem: a field that accepts anything gets something,
 * and nobody finds out until it is rendered in front of a viewer.
 *
 * A country code is not decoration here. `events.allowed_countries` carries
 * territory rights through to Cloudflare's geo rules, and standings pages show
 * team nationality. "USA", "us", "United States" and "US" are four different
 * strings and only one of them matches.
 */

export type Place = { code: string; name: string };

/**
 * ISO 3166-1 alpha-2, limited to countries plausibly involved in this sport
 * plus the majors. Deliberately not all 249: a list nobody can scroll is a
 * list people give up on, and an unknown country is a one-line addition here.
 */
export const COUNTRIES: Place[] = [
  { code: "US", name: "United States" },
  { code: "CN", name: "China" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "PL", name: "Poland" },
  { code: "CA", name: "Canada" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IN", name: "India" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "IL", name: "Israel" },
  { code: "TR", name: "Turkey" },
  { code: "ZA", name: "South Africa" },
  { code: "TW", name: "Taiwan" },
  { code: "HK", name: "Hong Kong" },
];

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

export function isKnownCountry(code: string): boolean {
  return COUNTRY_CODES.has(code.toUpperCase());
}

/**
 * US states, DC and the territories that host events.
 *
 * Only meaningful for the United States, which is why the field is hidden for
 * every other country rather than offered as an empty box. A "State" input on
 * an event in Singapore is a question with no correct answer, and asking it
 * invites someone to type something into it.
 */
export const US_STATES: Place[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "PR", name: "Puerto Rico" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const US_STATE_CODES = new Set(US_STATES.map((s) => s.code));

export function isKnownUsState(code: string): boolean {
  return US_STATE_CODES.has(code.toUpperCase());
}

/** The country the state field applies to. */
export const STATE_COUNTRY = "US";
