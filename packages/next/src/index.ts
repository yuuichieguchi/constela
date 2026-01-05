/**
 * @constela/next - Next.js integration for Constela UI framework
 *
 * Provides Server-Side Rendering (SSR) support for Constela applications.
 */

export { escapeHtml } from './utils/escape.js';
export { renderToString } from './ssr/renderer.js';
export { ConstelaEmbed } from './components/ConstelaEmbed.js';
export type { ConstelaEmbedProps } from './components/ConstelaEmbed.js';
