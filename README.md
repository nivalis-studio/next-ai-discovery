# next-ai-discovery

Next.js 16 (App Router) helpers to make your site AI-discoverable by serving Markdown variants and advertising them via standard `<link rel="alternate" type="text/markdown" ...>` tags.

What this package provides:

- A `proxy.ts` factory to rewrite Markdown requests to a single internal route handler
- A route handler factory to serve per-page Markdown with correct headers (`Content-Type`, `Vary: Accept`)
- Metadata helpers to advertise per-page Markdown alternates
- A `llms.txt` route handler factory (and optional `llms-full.txt`)

## Install

```bash
npm i next-ai-discovery
# or
pnpm add next-ai-discovery
# or
bun add next-ai-discovery
```

## Minimal setup (Next.js 16 App Router)

### 1) Add `proxy.ts`

Create `proxy.ts` at the project root:

```ts
import { createMarkdownProxy } from 'next-ai-discovery';

export default createMarkdownProxy();

export const config = {
  matcher: ['/((?!_next/|api/).*)'],
};
```

This enables:

- Explicit Markdown: `GET /some/path.md`
- Content negotiation: `GET /some/path` with `Accept: text/markdown`

Both are rewritten to an internal endpoint (default: `/__aid/md?path=/some/path`).

### 2) Add the internal Markdown endpoint

Create `app/__aid/md/route.ts`:

```ts
import { createMarkdownRoute } from 'next-ai-discovery';
import type { NextRequest } from 'next/server';

const handler = createMarkdownRoute({
  async getMarkdown(pathname, request: NextRequest) {
    // IMPORTANT: enforce the same auth/policy as your HTML routes.
    // Return null for "not found" (or "not allowed" if you prefer to hide it).

    if (pathname === '/index') {
      return {
        frontmatter: {
          title: 'home',
          canonical: 'https://example.com/',
        },
        body: '# home\n\nhello.',
      };
    }

    return null;
  },
});

export const GET = handler;
export const HEAD = handler;
```

Notes:

- Responses always include `Content-Type: text/markdown; charset=utf-8` and `Vary: Accept`.
- `getMarkdown()` is your policy boundary: keep auth parity with HTML.

### 3) Add `llms.txt`

Create `app/llms.txt/route.ts`:

```ts
import { createLlmsTxtRoute } from 'next-ai-discovery';

export const GET = createLlmsTxtRoute({
  config: {
    site: {
      name: 'Example.com',
      description: 'This site publishes articles about X.',
      url: 'https://example.com',
    },
    sections: [
      { title: 'Key sections', items: ['/blog', '/docs', '/about'] },
    ],
    markdown: {
      appendDotMd: true,
      acceptNegotiation: true,
      fullIndexPath: '/llms-full.txt',
    },
  },
});
```

Optional full variant: create `app/llms-full.txt/route.ts` with `variant: 'full'`.

## Per-page Markdown auto-discovery

To advertise a Markdown twin from HTML using the Next.js Metadata API, use `withMarkdownAlternate()`.

Example using `generateMetadata`:

```ts
import { withMarkdownAlternate } from 'next-ai-discovery';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return withMarkdownAlternate(
    {
      title: 'Docs',
    },
    '/docs'
  );
}
```

This emits:

```html
<link rel="alternate" type="text/markdown" href="/docs.md" />
```

## Configuration

### `createMarkdownProxy(options)`

- `endpointPath` (default: `/__aid/md`)
- `enableDotMd` (default: `true`)
- `enableAcceptNegotiation` (default: `true`)
- `acceptHeader` (default: `text/markdown`)
- `exclude(pathname): boolean` (optional)
- `excludePrefixes` (default: `["/_next", "/api"]`)
- `excludeExact` (default: `["/robots.txt", "/sitemap.xml"]`)
- `onRewrite({ type: 'accept' | 'dotmd', pathname })` (optional)

### `createMarkdownRoute({ getMarkdown, includeFrontmatter, onServed })`

- `getMarkdown(pathname, request)` returns `{ body, frontmatter? }` or `null`
- `includeFrontmatter` (default: `true`)
- `onServed({ pathname, status })` (optional)

### Path normalization

Internally, paths are normalized to make matching predictable:

- Trailing slash is removed (`/docs/` -> `/docs`)
- `.md` suffix is removed (`/docs.md` -> `/docs`)
- `/` is mapped to `/index`

If you need the exact mapping logic, see `normalizePathname()` and `pathnameToMd()`.

## Safety / policy

- This package never tries to convert rendered HTML to Markdown.
- Do not leak protected content: `getMarkdown()` should apply the same checks as your HTML routes.
- For negotiated Markdown (`Accept: text/markdown`), caching is protected by `Vary: Accept`.

## Auth parity patterns

This package intentionally makes `getMarkdown()` your policy boundary.

Here are a few common patterns to keep Markdown output aligned with your HTML access rules.

### 1) Reuse an existing access check

```ts
import { createMarkdownRoute } from 'next-ai-discovery';
import type { NextRequest } from 'next/server';

async function canViewPath(request: NextRequest, pathname: string) {
  // Example only. Wire this to your auth/session logic.
  // Return false for protected routes.
  return !pathname.startsWith('/admin');
}

const handler = createMarkdownRoute({
  async getMarkdown(pathname, request) {
    if (!(await canViewPath(request, pathname))) {
      // Choose one:
      // - return null (hides existence, returns 404)
      // - or throw/return a custom response in your own route wrapper
      return null;
    }

    // ...fetch/render markdown...
    return { body: `# ${pathname}\n` };
  },
});

export const GET = handler;
export const HEAD = handler;
```

### 2) Mirror redirects/404 behavior

If your HTML route would redirect unauthenticated users, decide whether your Markdown variant should:

- Return `404` (recommended for private areas)
- Return `401/403`
- Return a short explanation page (rarely desirable)

Because Next.js route handlers return `Response`, you can always wrap the handler and map outcomes.

## License

MIT
