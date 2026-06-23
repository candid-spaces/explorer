import { fromUrlSafeBase64, toUrlSafeBase64 } from '../utils/base64Url';

export const PUBLIC_KEY_SHARE_PARAM = 'pk';

export function readPublicKeyFromUrl(location: Location | undefined = typeof window === 'undefined' ? undefined : window.location) {
  if (!location) {
    return undefined;
  }

  const encodedPublicKey = new URLSearchParams(location.search).get(PUBLIC_KEY_SHARE_PARAM);
  if (!encodedPublicKey) {
    return undefined;
  }

  return fromUrlSafeBase64(encodedPublicKey);
}

export function createPublicKeyShareUrl(publicKey: string, href: string): string | undefined {
  const trimmedPublicKey = publicKey.trim();
  if (!trimmedPublicKey) {
    return undefined;
  }

  const url = new URL(href);
  url.searchParams.set(PUBLIC_KEY_SHARE_PARAM, toUrlSafeBase64(trimmedPublicKey));
  return url.toString();
}
