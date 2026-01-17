import { pathnameToMd } from './pathname.js';
import type { Metadata } from 'next';

export type MarkdownAlternateOptions = {
  shouldAdd?: boolean;
};

const mergeMarkdownAlternate = (metadata: Metadata, mdPath: string) => {
  const alternates = metadata.alternates ?? {};
  const types = alternates.types ?? {};

  return {
    ...metadata,
    alternates: {
      ...alternates,
      types: {
        ...types,
        'text/markdown': mdPath,
      },
    },
  };
};

export const withMarkdownAlternate = (
  metadata: Metadata,
  pathname: string,
  options: MarkdownAlternateOptions = {},
) => {
  if (options.shouldAdd === false) {
    return metadata;
  }

  const mdPath = pathnameToMd(pathname);
  return mergeMarkdownAlternate(metadata, mdPath);
};
