/**
 * Format an ISO timestamp string in the given IANA timezone.
 * Falls back to 'UTC' if tz is missing.
 */
export function formatInTz(
    isoString: string,
    tz: string,
    options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false },
): string {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: tz || 'UTC' }).format(new Date(isoString));
}
