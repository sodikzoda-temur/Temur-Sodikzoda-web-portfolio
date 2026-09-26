import type { ImageMetadata } from 'astro';

// The portrait is optional: add src/assets/portrait.jpg and it appears in the
// hero. Without the file nothing is rendered, not even a placeholder.
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/portrait.jpg', { eager: true });

export const portrait: ImageMetadata | undefined = Object.values(files)[0]?.default;
