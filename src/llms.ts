export type LlmsTxtVariant = 'default' | 'full';

export type LlmsTxtConfig = {
  site: {
    name: string;
    description?: string;
    url?: string;
  };
  sections?: Array<{ title: string; items: Array<string> }>;
  markdown?: {
    appendDotMd?: boolean;
    acceptNegotiation?: boolean;
    fullIndexPath?: string;
  };
};

export type LlmsTxtProvider = (
  variant: LlmsTxtVariant,
) => Promise<LlmsTxtConfig> | LlmsTxtConfig;

const formatSection = (section: { title: string; items: Array<string> }) => {
  const lines = [`## ${section.title}`];
  for (const item of section.items) {
    lines.push(`- ${item}`);
  }
  return lines.join('\n');
};

const joinBlocks = (blocks: Array<string>) =>
  blocks.filter(block => block.trim().length > 0).join('\n\n');

export const renderLlmsTxt = (
  config: LlmsTxtConfig,
  variant: LlmsTxtVariant,
) => {
  const blocks: Array<string> = [`# ${config.site.name}`];

  if (config.site.description) {
    blocks.push(config.site.description);
  }

  if (config.sections && config.sections.length > 0) {
    const rendered = config.sections.map(section => formatSection(section));
    blocks.push(joinBlocks(rendered));
  }

  if (config.markdown) {
    const markdownLines: Array<string> = ['## Machine-readable variants'];
    if (config.markdown.appendDotMd ?? true) {
      markdownLines.push('- Markdown pages: append `.md` to most URLs');
    }
    if (config.markdown.acceptNegotiation ?? true) {
      markdownLines.push('- Negotiation: send `Accept: text/markdown`');
    }
    if (variant === 'default') {
      const fullIndex = config.markdown.fullIndexPath ?? '/llms-full.txt';
      markdownLines.push(`- Full index: ${fullIndex}`);
    }

    blocks.push(markdownLines.join('\n'));
  }

  if (config.site.url) {
    blocks.push(`Site: ${config.site.url}`);
  }

  return joinBlocks(blocks);
};
