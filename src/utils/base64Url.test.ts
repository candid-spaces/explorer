import { describe, expect, it } from 'vitest';
import { fromUrlSafeBase64, toUrlSafeBase64 } from './base64Url';

describe('URL-safe Base64 helpers', () => {
  it('converts the sample public key to the URL-safe format', () => {
    expect(toUrlSafeBase64('qIsLkJOkovtXDdmb/wY0vpNrxJ0YV/+qnu8AhTZXBNA=')).toBe(
      'qIsLkJOkovtXDdmb_wY0vpNrxJ0YV_-qnu8AhTZXBNA',
    );
  });

  it('restores the sample public key to standard Base64', () => {
    expect(fromUrlSafeBase64('qIsLkJOkovtXDdmb_wY0vpNrxJ0YV_-qnu8AhTZXBNA')).toBe(
      'qIsLkJOkovtXDdmb/wY0vpNrxJ0YV/+qnu8AhTZXBNA=',
    );
  });

  it.each([
    ['TWFu', 'TWFu'],
    ['TWE=', 'TWE'],
    ['TQ==', 'TQ'],
    ['', ''],
    ['+/==', '-_'],
  ])('round-trips %s through %s', (standardBase64, urlSafeBase64) => {
    expect(toUrlSafeBase64(standardBase64)).toBe(urlSafeBase64);
    expect(fromUrlSafeBase64(urlSafeBase64)).toBe(standardBase64);
  });
});
