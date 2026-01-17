import { describe, expect, it } from 'bun:test';
import { normalizePathname, pathnameToMd } from '../src/pathname.js';

describe('normalizePathname', () => {
  it('maps / to /index', () => {
    expect(normalizePathname('/')).toBe('/index');
  });

  it('maps empty string to /index', () => {
    expect(normalizePathname('')).toBe('/index');
  });

  it('trims whitespace and ensures leading slash', () => {
    expect(normalizePathname('  docs  ')).toBe('/docs');
  });

  it('removes trailing slash', () => {
    expect(normalizePathname('/docs/')).toBe('/docs');
  });

  it('strips .md suffix', () => {
    expect(normalizePathname('/docs.md')).toBe('/docs');
  });

  it('strips query and hash', () => {
    expect(normalizePathname('/docs?x=1#h')).toBe('/docs');
  });

  it('strips hash and query (hash first)', () => {
    expect(normalizePathname('/docs#h?x=1')).toBe('/docs');
  });

  it('treats /.md as /index', () => {
    expect(normalizePathname('/.md')).toBe('/index');
  });
});

describe('pathnameToMd', () => {
  it('adds .md after normalization', () => {
    expect(pathnameToMd('/')).toBe('/index.md');
    expect(pathnameToMd('/docs/')).toBe('/docs.md');
    expect(pathnameToMd('/docs.md')).toBe('/docs.md');
  });
});
