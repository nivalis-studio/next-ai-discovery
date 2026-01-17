import { renderLlmsTxt } from './llms.js';
import type { NextRequest } from 'next/server';
import type { LlmsTxtConfig, LlmsTxtProvider, LlmsTxtVariant } from './llms.js';

export type LlmsTxtRouteOptions =
  | {
      config: LlmsTxtConfig;
      getLlmsTxt?: never;
      variant?: LlmsTxtVariant;
    }
  | {
      config?: never;
      getLlmsTxt: LlmsTxtProvider;
      variant?: LlmsTxtVariant;
    };

const DEFAULT_HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
};

const resolveConfig = (
  options: LlmsTxtRouteOptions,
  variant: LlmsTxtVariant,
) => {
  if ('config' in options && options.config) {
    return options.config;
  }

  return options.getLlmsTxt(variant);
};

const handleError = (error: unknown) => {
  console.error('[next-ai-discovery] llms.txt route error', error);
  return new Response('Internal Server Error', {
    status: 500,
    headers: DEFAULT_HEADERS,
  });
};

export const createLlmsTxtRoute = (options: LlmsTxtRouteOptions) => {
  const variant = options.variant ?? 'default';

  return async (_request: NextRequest) => {
    try {
      const config = await resolveConfig(options, variant);
      const body = renderLlmsTxt(config, variant);

      return new Response(body, {
        status: 200,
        headers: DEFAULT_HEADERS,
      });
    } catch (error) {
      return handleError(error);
    }
  };
};
