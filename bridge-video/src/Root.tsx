import React from 'react';
import { Composition } from 'remotion';
import manifest from './audio-manifest.json';
import { MainVideo } from './Composition';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="BridgeReel"
        component={MainVideo}
        durationInFrames={manifest.totalFrames}
        fps={manifest.fps}
        width={1080}
        height={1920}
      />
      <Composition
        id="BridgeYouTube"
        component={MainVideo}
        durationInFrames={manifest.totalFrames}
        fps={manifest.fps}
        width={1920}
        height={1080}
      />
    </>
  );
};
