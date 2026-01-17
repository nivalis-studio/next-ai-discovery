import { describe, expect, it } from 'bun:test';
import { renderLlmsTxt } from '../src/llms.js';

describe('renderLlmsTxt', () => {
  it('renders minimal config', () => {
    const out = renderLlmsTxt({ site: { name: 'My Site' } }, 'default');
    expect(out).toBe('# My Site');
  });

  it('includes description and site url', () => {
    const out = renderLlmsTxt(
      {
        site: {
          name: 'My Site',
          description: 'A description.',
          url: 'https://example.com',
        },
      },
      'default',
    );

    expect(out).toContain('# My Site');
    expect(out).toContain('A description.');
    expect(out).toContain('Site: https://example.com');
  });

  it('renders sections', () => {
    const out = renderLlmsTxt(
      {
        site: { name: 'My Site' },
        sections: [{ title: 'Key sections', items: ['/docs', '/blog'] }],
      },
      'default',
    );

    expect(out).toContain('## Key sections');
    expect(out).toContain('- /docs');
    expect(out).toContain('- /blog');
  });

  it('renders markdown discovery block with defaults (default variant)', () => {
    const out = renderLlmsTxt(
      {
        site: { name: 'My Site' },
        markdown: {},
      },
      'default',
    );

    expect(out).toContain('## Machine-readable variants');
    expect(out).toContain('- Markdown pages: append `.md` to most URLs');
    expect(out).toContain('- Negotiation: send `Accept: text/markdown`');
    expect(out).toContain('- Full index: /llms-full.txt');
  });

  it('uses custom fullIndexPath (default variant)', () => {
    const out = renderLlmsTxt(
      {
        site: { name: 'My Site' },
        markdown: { fullIndexPath: '/llms-full.txt?x=1' },
      },
      'default',
    );

    expect(out).toContain('- Full index: /llms-full.txt?x=1');
  });

  it('omits full index line in full variant', () => {
    const out = renderLlmsTxt(
      {
        site: { name: 'My Site' },
        markdown: {},
      },
      'full',
    );

    expect(out).not.toContain('Full index:');
  });

  it('respects markdown toggles', () => {
    const out = renderLlmsTxt(
      {
        site: { name: 'My Site' },
        markdown: { appendDotMd: false, acceptNegotiation: false },
      },
      'default',
    );

    expect(out).toContain('## Machine-readable variants');
    expect(out).not.toContain('append `.md`');
    expect(out).not.toContain('Accept: text/markdown');
  });
});
