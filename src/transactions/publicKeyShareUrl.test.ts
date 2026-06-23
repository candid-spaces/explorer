import { describe, expect, it } from 'vitest';
import { createPublicKeyShareUrl, readPublicKeyFromUrl } from './publicKeyShareUrl';

const SAMPLE_KEY = 'qIsLkJOkovtXDdmb/wY0vpNrxJ0YV/+qnu8AhTZXBNA=';
const SAMPLE_URL_SAFE_KEY = 'qIsLkJOkovtXDdmb_wY0vpNrxJ0YV_-qnu8AhTZXBNA';

describe('public key share URLs', () => {
  it('reads a URL-safe public key from the pk query parameter', () => {
    const location = new URL(`https://example.com/viewer?pk=${SAMPLE_URL_SAFE_KEY}`) as unknown as Location;

    expect(readPublicKeyFromUrl(location)).toBe(SAMPLE_KEY);
  });

  it('returns undefined when no public key query parameter exists', () => {
    const location = new URL('https://example.com/viewer?other=value') as unknown as Location;

    expect(readPublicKeyFromUrl(location)).toBeUndefined();
  });

  it('creates a share URL with an encoded public key', () => {
    expect(createPublicKeyShareUrl(SAMPLE_KEY, 'https://example.com/viewer?other=value#scene')).toBe(
      `https://example.com/viewer?other=value&pk=${SAMPLE_URL_SAFE_KEY}#scene`,
    );
  });

  it('returns undefined for a blank public key', () => {
    expect(createPublicKeyShareUrl('   ', 'https://example.com/viewer')).toBeUndefined();
  });
});
