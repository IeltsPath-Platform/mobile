import type { PostBackground } from './api';

export const POST_BACKGROUND_COLORS: Record<PostBackground, string> = {
  VIOLET: '#5b21b6',
  CRIMSON: '#9f1239',
  MIDNIGHT: '#0f172a',
  SUNSET: '#9a3412',
  OCEAN: '#075985',
  FOREST: '#065f46',
  ROSE: '#86198f',
  AURORA: '#115e59',
};

export function postBackgroundColor(background?: string | null) {
  return background && Object.prototype.hasOwnProperty.call(POST_BACKGROUND_COLORS, background)
    ? POST_BACKGROUND_COLORS[background as PostBackground]
    : undefined;
}

export function usesTextPostBackground(background?: string | null, imageCount = 0) {
  return imageCount === 0 && postBackgroundColor(background) !== undefined;
}
