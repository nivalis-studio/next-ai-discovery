import { NextResponse } from 'next/server';
import { normalizePathname } from './pathname.js';
import type { NextFetchEvent, NextRequest } from 'next/server';

export type MarkdownRewriteType = 'accept' | 'dotmd';

export type MarkdownProxyOptions = {
  endpointPath?: string;
  enableDotMd?: boolean;
  enableAcceptNegotiation?: boolean;
  acceptHeader?: string;
  exclude?: (pathname: string) => boolean;
  excludePrefixes?: Array<string>;
  excludeExact?: Array<string>;
  onRewrite?: (event: { type: MarkdownRewriteType; pathname: string }) => void;
};

export const DEFAULT_PROXY_EXCLUDE_PREFIXES = ['/_next', '/api'];
export const DEFAULT_PROXY_EXCLUDE_EXACT = ['/robots.txt', '/sitemap.xml'];
export const DEFAULT_MARKDOWN_ACCEPT = 'text/markdown';
export const DEFAULT_ENDPOINT_PATH = '/__aid/md';

const hasAssetExtension = (pathname: string) => {
  const lastSlash = pathname.lastIndexOf('/');
  const lastDot = pathname.lastIndexOf('.');

  return lastDot > lastSlash;
};

const shouldExcludePath = (pathname: string, options: MarkdownProxyOptions) => {
  if (options.exclude?.(pathname)) {
    return true;
  }

  const excludePrefixes =
    options.excludePrefixes ?? DEFAULT_PROXY_EXCLUDE_PREFIXES;
  for (const prefix of excludePrefixes) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }

  const excludeExact = options.excludeExact ?? DEFAULT_PROXY_EXCLUDE_EXACT;
  return excludeExact.includes(pathname);
};

const isMarkdownAccept = (request: NextRequest, acceptHeader: string) => {
  const header = request.headers.get('accept') ?? '';
  return header
    .split(',')
    .some((value: string) => value.trim().startsWith(acceptHeader));
};

const buildRewriteUrl = (
  request: NextRequest,
  pathname: string,
  endpoint: string,
) => {
  const url = new URL(endpoint, request.url);
  url.searchParams.set('path', pathname);
  return url;
};

export const createMarkdownProxy = (options: MarkdownProxyOptions = {}) => {
  const endpointPath = options.endpointPath ?? DEFAULT_ENDPOINT_PATH;
  const enableDotMd = options.enableDotMd ?? true;
  const enableAcceptNegotiation = options.enableAcceptNegotiation ?? true;
  const acceptHeader = options.acceptHeader ?? DEFAULT_MARKDOWN_ACCEPT;

  return (request: NextRequest, _event: NextFetchEvent) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return NextResponse.next();
    }

    const pathname = request.nextUrl.pathname;

    if (shouldExcludePath(pathname, options)) {
      return NextResponse.next();
    }

    const isDotMd = enableDotMd && pathname.endsWith('.md');

    // Don't rewrite "asset" paths like /logo.png, but do allow the explicit
    // `.md` endpoint to pass through this check.
    if (!isDotMd && hasAssetExtension(pathname)) {
      return NextResponse.next();
    }

    const isAcceptMd =
      enableAcceptNegotiation && isMarkdownAccept(request, acceptHeader);

    if (!(isDotMd || isAcceptMd)) {
      return NextResponse.next();
    }

    const normalized = normalizePathname(pathname);
    const rewriteUrl = buildRewriteUrl(request, normalized, endpointPath);
    options.onRewrite?.({
      type: isDotMd ? 'dotmd' : 'accept',
      pathname: normalized,
    });
    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set('Vary', 'Accept');
    return response;
  };
};
