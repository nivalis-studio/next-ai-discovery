import { describe, expect, it } from 'bun:test';
import { createMarkdownRoute } from '../src/markdown-route.js';

const STATUS_OK = 200 as const;
const STATUS_NOT_FOUND = 404 as const;
const STATUS_INTERNAL_ERROR = 500 as const;

describe('createMarkdownRoute', () => {
  it('returns 200 with headers and frontmatter by default', async () => {
    const handler = createMarkdownRoute({
      getMarkdown() {
        return {
          frontmatter: { title: 't' },
          body: '# hi',
        };
      },
    });

    const response = await handler(
      new Request('https://example.com/__aid/md?path=/docs') as any,
    );

    expect(response.status).toBe(STATUS_OK);
    expect(response.headers.get('Content-Type')).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(response.headers.get('Vary')).toBe('Accept');

    const body = await response.text();
    expect(body).toContain('---');
    expect(body).toContain('title: "t"');
    expect(body).toContain('# hi');
  });

  it('returns body only when includeFrontmatter=false', async () => {
    const handler = createMarkdownRoute({
      includeFrontmatter: false,
      getMarkdown() {
        return {
          frontmatter: { title: 't' },
          body: '# hi',
        };
      },
    });

    const response = await handler(
      new Request('https://example.com/__aid/md?path=/docs') as any,
    );
    expect(await response.text()).toBe('# hi');
  });

  it('returns 404 when missing', async () => {
    let served: { pathname: string; status: number } | null = null;

    const handler = createMarkdownRoute({
      getMarkdown() {
        return null;
      },
      onServed(event) {
        served = event;
      },
    });

    const response = await handler(
      new Request('https://example.com/__aid/md?path=/docs') as any,
    );

    expect(response.status).toBe(STATUS_NOT_FOUND);
    expect(response.headers.get('Content-Type')).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(response.headers.get('Vary')).toBe('Accept');
    expect(await response.text()).toBe('Not Found');

    expect(served).not.toBeNull();
    expect(served as unknown as { pathname: string; status: number }).toEqual({
      pathname: '/docs',
      status: STATUS_NOT_FOUND,
    });
  });

  it('returns 500 on thrown error', async () => {
    let served: { pathname: string; status: number } | null = null;

    const originalConsoleError = console.error;
    console.error = () => undefined;

    try {
      const handler = createMarkdownRoute({
        getMarkdown() {
          throw new Error('boom');
        },
        onServed(event) {
          served = event;
        },
      });

      const response = await handler(
        new Request('https://example.com/__aid/md?path=/docs') as any,
      );

      expect(response.status).toBe(STATUS_INTERNAL_ERROR);
      expect(response.headers.get('Content-Type')).toBe(
        'text/markdown; charset=utf-8',
      );
      expect(response.headers.get('Vary')).toBe('Accept');
      expect(await response.text()).toBe('Internal Server Error');

      expect(served).not.toBeNull();
      expect(served as unknown as { pathname: string; status: number }).toEqual(
        {
          pathname: '/docs',
          status: STATUS_INTERNAL_ERROR,
        },
      );
    } finally {
      console.error = originalConsoleError;
    }
  });

  it('defaults to / when no path param', async () => {
    let received: string | null = null;

    const handler = createMarkdownRoute({
      getMarkdown(pathname) {
        received = pathname;
        return null;
      },
    });

    await handler(new Request('https://example.com/__aid/md') as any);
    expect(received).not.toBeNull();
    expect(received as unknown as string).toBe('/index');
  });
});
