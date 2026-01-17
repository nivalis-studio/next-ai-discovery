export const DEFAULT_INDEX_PATH = '/index';

const stripHashAndQuery = (pathname: string) => {
  const queryIndex = pathname.indexOf('?');
  const hashIndex = pathname.indexOf('#');
  let cutIndex = -1;

  if (queryIndex === -1) {
    cutIndex = hashIndex;
  } else if (hashIndex === -1) {
    cutIndex = queryIndex;
  } else {
    cutIndex = Math.min(queryIndex, hashIndex);
  }

  return cutIndex === -1 ? pathname : pathname.slice(0, cutIndex);
};

export const normalizePathname = (pathname: string) => {
  const cleaned = stripHashAndQuery(pathname.trim());
  const withLeadingSlash = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  const mdSuffix = '.md';
  const withoutMd = withLeadingSlash.endsWith(mdSuffix)
    ? withLeadingSlash.slice(0, -mdSuffix.length)
    : withLeadingSlash;

  if (withoutMd === '/' || withoutMd === '') {
    return DEFAULT_INDEX_PATH;
  }

  return withoutMd.endsWith('/') ? withoutMd.slice(0, -1) : withoutMd;
};

export const pathnameToMd = (pathname: string) => {
  const normalized = normalizePathname(pathname);
  return `${normalized}.md`;
};
