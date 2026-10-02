import type { ImageMetadata } from 'astro';

// The portrait is optional: add src/assets/portrait.jpg and it appears in the
// hero. Without the file nothing is rendered, not even a placeholder.
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/portrait.jpg', { eager: true });

export const portrait: ImageMetadata | undefined = Object.values(files)[0]?.default;

/** Square crop from the centre of the photo, as WebP. Used for the page and for structured data. */
export const PORTRAIT_CROP = { fit: 'cover', position: 'center', format: 'webp' } as const;
