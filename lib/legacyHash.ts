/** Maps "#/welcome" → "/welcome". Ignores OAuth hashes and in-page anchors. */
export function legacyHashToPath(hash: string): string | null {
  if (!hash.startsWith('#/')) return null;
  const path = hash.slice(1);
  return path.startsWith('/') ? path : null;
}

export function publicBookingPath(doctorId: string): string {
  return `/p/${doctorId}`;
}

export function publicBookingUrl(origin: string, doctorId: string): string {
  return `${origin.replace(/\/$/, '')}${publicBookingPath(doctorId)}`;
}
