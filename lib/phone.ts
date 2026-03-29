/**
 * Phone number normalisation utility.
 * Converts local phone formats to E.164 international format
 * so we can reliably deduplicate customers.
 *
 * Examples:
 *   0428 537 925       → +61428537925  (AU default)
 *   +61 428 537 925    → +61428537925
 *   07911 123456       → +447911123456 (UK)
 *   +1 555 123 4567    → +15551234567
 *   (555) 123-4567     → +15551234567  (US default if no country code)
 */

// Common local-prefix to country-code mappings
const LOCAL_PREFIX_MAP: Record<string, { strip: string; replace: string }> = {
  '04': { strip: '0', replace: '+61' },   // Australia mobile
  '02': { strip: '0', replace: '+61' },   // Australia landline
  '03': { strip: '0', replace: '+61' },   // Australia landline
  '07': { strip: '0', replace: '+44' },   // UK mobile
  '08': { strip: '0', replace: '+44' },   // UK landline
  '01': { strip: '0', replace: '+44' },   // UK landline
}

export function normalisePhone(raw: string): string {
  // Strip all whitespace, dashes, parentheses, dots
  let phone = raw.replace(/[\s\-().]/g, '')

  // Already in international format
  if (phone.startsWith('+')) {
    return phone
  }

  // Try to match a known local prefix (first 2 digits)
  const prefix2 = phone.substring(0, 2)
  const mapping = LOCAL_PREFIX_MAP[prefix2]
  if (mapping && phone.startsWith(mapping.strip)) {
    return mapping.replace + phone.substring(mapping.strip.length)
  }

  // If it looks like a US number (10 digits, starts with area code)
  if (/^[2-9]\d{9}$/.test(phone)) {
    return '+1' + phone
  }

  // Fallback: return with + prefix if it looks like a full international number
  if (/^\d{10,15}$/.test(phone)) {
    return '+' + phone
  }

  // Can't normalise - return as-is
  return phone
}
