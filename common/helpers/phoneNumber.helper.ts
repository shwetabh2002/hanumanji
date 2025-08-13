export function attachCountryCode(
  phoneNumber: string,
  countryCode?: string,
): string {
  // Use +91 as the default country code if none is provided
  const finalCountryCode = countryCode || '+91';

  // Ensure the phone number starts with the country code
  if (phoneNumber.startsWith('+')) {
    return phoneNumber; // If phone number already has a country code, return as is
  }

  return `${finalCountryCode}${phoneNumber}`;
}
