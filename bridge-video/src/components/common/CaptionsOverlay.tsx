import React, { useMemo } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import manifest from '../../audio-manifest.json';
import { THEME } from '../../theme';

interface WordTiming {
  text: string;
  startMs: number;
  endMs: number;
}

interface CaptionChunk {
  words: WordTiming[];
  startFrame: number;
  endFrame: number;
  sceneStartFrame: number;
  leadPadFrames: number;
}

function buildChunks(
  words: WordTiming[],
  sceneStartFrame: number,
  leadPadFrames: number,
  fps: number,
  maxWords: number,
  maxChars: number,
): CaptionChunk[] {
  const chunks: CaptionChunk[] = [];
  let buffer: WordTiming[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    const first = buffer[0];
    const last = buffer[buffer.length - 1];
    chunks.push({
      words: buffer,
      startFrame: sceneStartFrame + leadPadFrames + Math.floor((first.startMs / 1000) * fps),
      endFrame: sceneStartFrame + leadPadFrames + Math.ceil((last.endMs / 1000) * fps) + 3,
      sceneStartFrame,
      leadPadFrames,
    });
    buffer = [];
  };

  for (const word of words) {
    buffer.push(word);
    const charLen = buffer.reduce((acc, w) => acc + w.text.length + 1, 0);
    const endsSentence = /[.?!,]$/.test(word.text);
    if (buffer.length >= maxWords || charLen >= maxChars || (endsSentence && buffer.length >= 2)) {
      flush();
    }
  }
  flush();
  return chunks;
}

const KEY_WORDS = new Set([
  'bridge',
  '@bridge',
  '@markmayandi/bridge',
  'gemini',
  'chatgpt',
  'claude',
  'deepseek',
  'mcp',
  'npx',
  'npm',
  'cd',
  'cloudflare',
  'jailed',
  'permission',
  'allow',
  'zero',
  'seven',
  '24',
  'github',
  'loop',
  'broken',
  'failing',
  '2026',
]);

export const CaptionsOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const isLandscape = width > height;
  const maxWords = isLandscape ? 8 : 4;
  const maxChars = isLandscape ? 54 : 25;

  const allChunks = useMemo(() => {
    const out: CaptionChunk[] = [];
    for (const scene of manifest.scenes) {
      out.push(
        ...buildChunks(scene.words, scene.startFrame, scene.leadPadFrames, fps, maxWords, maxChars),
      );
    }
    return out;
  }, [fps, maxWords, maxChars]);

  let activeChunk: CaptionChunk | undefined;
  for (let i = allChunks.length - 1; i >= 0; i--) {
    const c = allChunks[i];
    if (frame >= c.startFrame && frame <= c.endFrame) {
      activeChunk = c;
      break;
    }
  }

  if (!activeChunk) {
    return null;
  }

  const speechMs =
    ((frame - (activeChunk.sceneStartFrame + activeChunk.leadPadFrames)) / fps) * 1000;

  const entrance = spring({
    frame: Math.max(0, frame - activeChunk.startFrame),
    fps,
    config: { damping: 18, stiffness: 280, mass: 0.55 },
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: isLandscape ? 120 : 40,
        right: isLandscape ? 120 : 40,
        bottom: isLandscape ? 60 : 78,
        zIndex: 995,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(11, 13, 18, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: isLandscape ? 16 : 20,
          padding: isLandscape ? '10px 22px' : '12px 22px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.72)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: isLandscape ? '4px 9px' : '5px 10px',
          maxWidth: isLandscape ? 1320 : 960,
          transform: `translateY(${(1 - entrance) * 6}px)`,
          opacity: entrance,
        }}
      >
        {activeChunk.words.map((word, idx) => {
          const isCurrent = speechMs >= word.startMs - 25 && speechMs <= word.endMs + 45;
          const isPast = speechMs > word.endMs + 45;
          const clean = word.text.replace(/[.,?!]/g, '').toLowerCase();
          const isKeyWord = KEY_WORDS.has(clean);

          return (
            <span
              key={`${word.text}-${idx}`}
              style={{
                fontFamily: THEME.typography.display,
                fontSize: isLandscape ? 28 : 35,
                fontWeight: 800,
                lineHeight: 1.18,
                letterSpacing: '-0.015em',
                padding: isCurrent ? '2px 9px' : '2px 3px',
                borderRadius: 8,
                backgroundColor: isCurrent ? THEME.palette.primaryVolt : 'transparent',
                color: isCurrent
                  ? '#090B0E'
                  : isKeyWord
                    ? THEME.palette.primaryVolt
                    : isPast
                      ? '#FFFFFF'
                      : 'rgba(255, 255, 255, 0.7)',
                display: 'inline-block',
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
