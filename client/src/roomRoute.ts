/** Extract a room code from a shareable Curtbox URL.
 *  /join/ABCD remains supported for older QR links; /room/ABCD is canonical.
 *  A trailing comma is accepted to accommodate links copied with punctuation.
 */
export function roomFromPath(pathname: string): string {
  const match = /^\/(?:room|join)\/([a-z]{4})(?:\/|,)?$/i.exec(pathname);
  return match?.[1]?.toUpperCase() ?? '';
}

export function roomPath(code: string): string {
  return `/room/${code.toUpperCase()}`;
}
