import { describe, expect, it, mock } from 'bun:test';

type RewriteResponse = Response & { __rewriteTo?: string };

mock.module('next/server.js', () => {
  const NextResponse = {
    next() {
      return new Response(null, {
        status: 200,
        headers: {
          'x-next-response': 'next',
        },
      });
    },
    rewrite(url: URL) {
      const response = new Response(null, {
        status: 200,
        headers: {
          'x-middleware-rewrite': url.toString(),
        },
      }) as RewriteResponse;
      response.__rewriteTo = url.toString();
      return response;
    },
  };

  return { NextResponse };
});

const { createMarkdownProxy, DEFAULT_ENDPOINT_PATH } = await import(
  '../src/proxy.js'
);

const makeRequest = (input: {
  pathname: string;
  method?: string;
  headers?: Record<string, string>;
}) => {
  const url = `https://example.com${input.pathname}`;
  return {
    method: input.method ?? 'GET',
    url,
    headers: new Headers(input.headers ?? {}),
    nextUrl: new URL(url),
  } as any;
};

const getRewriteUrl = (response: Response) => {
  const header = response.headers.get('x-middleware-rewrite');
  if (!header) {
    return null;
  }
  return new URL(header);
};

describe('createMarkdownProxy', () => {
  it('does not rewrite non-GET/HEAD', () => {
    const handler = createMarkdownProxy();
    const response = handler(
      makeRequest({ pathname: '/docs', method: 'POST' }),
      {} as any,
    );
    expect(response.headers.get('x-next-response')).toBe('next');
  });

  it('excludes default prefixes and exact paths', () => {
    const handler = createMarkdownProxy();

    const r1 = handler(
      makeRequest({
        pathname: '/_next/static/chunk.js',
        headers: { accept: 'text/markdown' },
      }),
      {} as any,
    );
    expect(r1.headers.get('x-next-response')).toBe('next');

    const r2 = handler(
      makeRequest({
        pathname: '/api/hello',
        headers: { accept: 'text/markdown' },
      }),
      {} as any,
    );
    expect(r2.headers.get('x-next-response')).toBe('next');

    const r3 = handler(
      makeRequest({
        pathname: '/robots.txt',
        headers: { accept: 'text/markdown' },
      }),
      {} as any,
    );
    expect(r3.headers.get('x-next-response')).toBe('next');
  });

  it('bypasses asset-like paths even with Accept negotiation', () => {
    const handler = createMarkdownProxy();
    const response = handler(
      makeRequest({
        pathname: '/logo.png',
        headers: { accept: 'text/markdown' },
      }),
      {} as any,
    );
    expect(response.headers.get('x-next-response')).toBe('next');
  });

  it('supports custom exclude()', () => {
    const handler = createMarkdownProxy({
      exclude: pathname => pathname === '/docs',
    });
    const response = handler(
      makeRequest({ pathname: '/docs', headers: { accept: 'text/markdown' } }),
      {} as any,
    );
    expect(response.headers.get('x-next-response')).toBe('next');
  });

  it('rewrites explicit .md requests', () => {
    const events: Array<{ type: string; pathname: string }> = [];

    const handler = createMarkdownProxy({
      onRewrite(event) {
        events.push(event);
      },
    });

    const response = handler(makeRequest({ pathname: '/docs.md' }), {} as any);

    expect(response.headers.get('Vary')).toBe('Accept');

    const rewriteUrl = getRewriteUrl(response);
    expect(rewriteUrl).not.toBeNull();
    expect(rewriteUrl?.pathname).toBe(DEFAULT_ENDPOINT_PATH);
    expect(rewriteUrl?.searchParams.get('path')).toBe('/docs');

    expect(events).toEqual([{ type: 'dotmd', pathname: '/docs' }]);
  });

  it('rewrites Accept-negotiated markdown requests', () => {
    const events: Array<{ type: string; pathname: string }> = [];

    const handler = createMarkdownProxy({
      onRewrite(event) {
        events.push(event);
      },
    });

    const response = handler(
      makeRequest({
        pathname: '/docs',
        headers: { accept: 'text/html, text/markdown; q=0.9' },
      }),
      {} as any,
    );

    const rewriteUrl = getRewriteUrl(response);
    expect(rewriteUrl).not.toBeNull();
    expect(rewriteUrl?.pathname).toBe(DEFAULT_ENDPOINT_PATH);
    expect(rewriteUrl?.searchParams.get('path')).toBe('/docs');

    expect(events).toEqual([{ type: 'accept', pathname: '/docs' }]);
  });

  it('respects enableDotMd=false', () => {
    const handler = createMarkdownProxy({ enableDotMd: false });
    const response = handler(makeRequest({ pathname: '/docs.md' }), {} as any);
    expect(response.headers.get('x-next-response')).toBe('next');
  });

  it('respects enableAcceptNegotiation=false', () => {
    const handler = createMarkdownProxy({ enableAcceptNegotiation: false });
    const response = handler(
      makeRequest({ pathname: '/docs', headers: { accept: 'text/markdown' } }),
      {} as any,
    );
    expect(response.headers.get('x-next-response')).toBe('next');
  });

  it('uses custom endpointPath', () => {
    const handler = createMarkdownProxy({ endpointPath: '/__custom/md' });
    const response = handler(makeRequest({ pathname: '/docs.md' }), {} as any);

    const rewriteUrl = getRewriteUrl(response);
    expect(rewriteUrl?.pathname).toBe('/__custom/md');
    expect(rewriteUrl?.searchParams.get('path')).toBe('/docs');
  });
});
