import { describe, expect, it } from 'bun:test';
import { renderLlmsTxt } from '../src/llms.js';
import { createLlmsTxtRoute } from '../src/llms-route.js';

const STATUS_OK = 200 as const;
const STATUS_INTERNAL_ERROR = 500 as const;

describe('createLlmsTxtRoute', () => {
  it('returns 200 with markdown content-type (config form)', async () => {
    const config = {
      site: {
        name: 'Example.com',
        description: 'Desc',
        url: 'https://example.com',
      },
      sections: [{ title: 'Key sections', items: ['/docs'] }],
      markdown: { fullIndexPath: '/llms-full.txt' },
    };

    const handler = createLlmsTxtRoute({ config });
    const response = await handler(
      new Request('https://example.com/llms.txt') as any,
    );

    expect(response.status).toBe(STATUS_OK);
    expect(response.headers.get('Content-Type')).toBe(
      'text/markdown; charset=utf-8',
    );

    const body = await response.text();
    expect(body).toBe(renderLlmsTxt(config, 'default'));
  });

  it('supports provider form and passes variant', async () => {
    let seenVariant: string | null = null;
    const handler = createLlmsTxtRoute({
      variant: 'full',
      getLlmsTxt(variant) {
        seenVariant = variant;
        return {
          site: { name: 'Example.com' },
          markdown: {},
        };
      },
    });

    const response = await handler(
      new Request('https://example.com/llms-full.txt') as any,
    );
    expect(response.status).toBe(STATUS_OK);

    if (seenVariant === null) {
      throw new Error('expected getLlmsTxt to be called');
    }

    expect(seenVariant as unknown as string).toBe('full');

    const body = await response.text();
    expect(body).toContain('# Example.com');
    expect(body).not.toContain('Full index:');
  });

  it('returns 500 on provider error', async () => {
    const originalConsoleError = console.error;
    console.error = () => undefined;

    try {
      const handler = createLlmsTxtRoute({
        getLlmsTxt() {
          throw new Error('boom');
        },
      });

      const response = await handler(
        new Request('https://example.com/llms.txt') as any,
      );
      expect(response.status).toBe(STATUS_INTERNAL_ERROR);
      expect(response.headers.get('Content-Type')).toBe(
        'text/markdown; charset=utf-8',
      );
      expect(await response.text()).toBe('Internal Server Error');
    } finally {
      console.error = originalConsoleError;
    }
  });
});
