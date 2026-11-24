import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';

export const interFont = loadInter('normal', {
  weights: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
});

export const jetBrainsMonoFont = loadJetBrainsMono('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
});
