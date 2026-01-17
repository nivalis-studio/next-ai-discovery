import { normalizePathname } from './pathname.js';
import type { NextRequest } from 'next/server.js';

export type MarkdownContent = {
  body: string;
  frontmatter?: Record<string, unknown>;
};

export type GetMarkdown = (
  pathname: string,
  request: NextRequest,
) => Promise<MarkdownContent | null> | MarkdownContent | null;

export type MarkdownRouteOptions = {
  getMarkdown: GetMarkdown;
  includeFrontmatter?: boolean;
  onServed?: (event: { pathname: string; status: number }) => void;
};

const DEFAULT_HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
  Vary: 'Accept',
};

const toFrontmatter = (frontmatter: Record<string, unknown>) => {
  const lines: Array<string> = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }

  lines.push('---');

  return lines.join('\n');
};

const buildBody = (content: MarkdownContent, includeFrontmatter: boolean) => {
  if (!(includeFrontmatter && content.frontmatter)) {
    return content.body;
  }

  return `${toFrontmatter(content.frontmatter)}\n\n${content.body}`;
};

const handleError = (error: unknown) => {
  console.error('[next-ai-discovery] markdown route error', error);
  return new Response('Internal Server Error', {
    status: 500,
    headers: DEFAULT_HEADERS,
  });
};

export const createMarkdownRoute = (options: MarkdownRouteOptions) => {
  const includeFrontmatter = options.includeFrontmatter ?? true;

  return async (request: NextRequest) => {
    const url = new URL(request.url);
    const rawPath = url.searchParams.get('path') ?? '/';
    const pathname = normalizePathname(rawPath);

    try {
      const content = await options.getMarkdown(pathname, request);
      const isHead = request.method === 'HEAD';

      if (!content) {
        options.onServed?.({ pathname, status: 404 });
        return new Response(isHead ? null : 'Not Found', {
          status: 404,
          headers: DEFAULT_HEADERS,
        });
      }

      const body = buildBody(content, includeFrontmatter);
      options.onServed?.({ pathname, status: 200 });

      return new Response(isHead ? null : body, {
        status: 200,
        headers: DEFAULT_HEADERS,
      });
    } catch (error) {
      options.onServed?.({ pathname, status: 500 });
      return handleError(error);
    }
  };
};
