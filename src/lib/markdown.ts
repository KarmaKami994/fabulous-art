/**
 * News markdown rendering — build-time only (SSG).
 *
 * Replaces the hand-rolled regex renderer previously duplicated in
 * de/news/[slug].astro and en/news/[slug].astro. `marked` gives correct
 * CommonMark handling (headings, lists, nested emphasis); `sanitize-html`
 * strips any raw HTML/script the editor might paste, closing the
 * passthrough the old renderer had.
 */
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(markdown: string): string {
  const raw = marked.parse(markdown ?? '', { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'a', 'img',
      'h1', 'h2', 'h3', 'h4',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre', 'hr',
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
      img: sanitizeHtml.simpleTransform('img', { loading: 'lazy' }),
    },
  });
}

/** Extract a YouTube video ID from common URL shapes (watch, youtu.be, shorts, embed). */
export function getYouTubeId(url: string | undefined | null): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}
