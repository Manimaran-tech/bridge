import React from 'react';
import {
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';
import manifest from './audio-manifest.json';
import { CaptionsOverlay } from './components/common/CaptionsOverlay';
import { Scene1Pain } from './scenes/Scene1Pain';
import { Scene2Solution } from './scenes/Scene2Solution';
import { Scene3Install } from './scenes/Scene3Install';
import { Scene4Terminal } from './scenes/Scene4Terminal';
import { Scene5ConnectMcp } from './scenes/Scene5ConnectMcp';
import { Scene6MentionPermission } from './scenes/Scene6MentionPermission';
import { Scene7Execution } from './scenes/Scene7Execution';
import { Scene8Outro } from './scenes/Scene8Outro';
import { THEME } from './theme';

interface SfxCue {
  from: number;
  dur: number;
  file: string;
  vol: number;
}

const SfxTrack: React.FC<{ cues: SfxCue[] }> = ({ cues }) => (
  <>
    {cues.map((c, idx) => (
      <Sequence key={`${c.file}-${c.from}-${idx}`} from={c.from} durationInFrames={c.dur}>
        <Audio src={staticFile(`audio/${c.file}`)} volume={c.vol} />
      </Sequence>
    ))}
  </>
);

export const MainVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const totalFrames = manifest.totalFrames;
  const transFrames = manifest.transitionFrames ?? 12;
  const progressRatio = Math.min(100, (frame / totalFrames) * 100);

  const [s1, s2, s3, s4, s5, s6, s7, s8] = manifest.scenes;

  // Snappier high-energy whip spring transitions (exact same duration so totalFrames stays synced)
  const whipSpring = springTiming({
    config: { damping: 24, stiffness: 360, mass: 0.65 },
    durationInFrames: transFrames,
  });

  // Per-scene frame-accurate SFX cues synced to every camera cut, spotlight lock, banner slam & UI action
  const s1Cues: SfxCue[] = [
    { from: 0, dur: 10, file: 'sfx_cut_snap.wav', vol: 0.44 },
    { from: 20, dur: 10, file: 'sfx_hover_tick.wav', vol: 0.36 },
    { from: 24, dur: 10, file: 'sfx_sparkle_chime.wav', vol: 0.32 },
    { from: 36, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.44 },
    { from: 76, dur: 10, file: 'sfx_click.wav', vol: 0.48 },
    { from: 76, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.4 },
    { from: 78, dur: 10, file: 'sfx_pop_bright.wav', vol: 0.38 },
    { from: 124, dur: 12, file: 'sfx_notif_soft.wav', vol: 0.38 },
    { from: 124, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.42 },
    { from: 162, dur: 10, file: 'sfx_zoom_punch.wav', vol: 0.44 },
    { from: 175, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.42 },
    { from: 206, dur: 10, file: 'sfx_click.wav', vol: 0.5 },
    { from: 206, dur: 10, file: 'sfx_pop_bright.wav', vol: 0.42 },
    { from: 222, dur: 14, file: 'sfx_swoosh_fast.wav', vol: 0.46 },
    { from: 242, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.48 },
    { from: 262, dur: 10, file: 'sfx_ui_slide.wav', vol: 0.42 },
    { from: 284, dur: 18, file: 'sfx_error.wav', vol: 0.58 },
    { from: 284, dur: 14, file: 'sfx_bass_punch.wav', vol: 0.52 },
    { from: 286, dur: 12, file: 'sfx_glitch_stutter.wav', vol: 0.46 },
    { from: 316, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.42 },
    { from: 340, dur: 14, file: 'sfx_swoosh_fast.wav', vol: 0.44 },
    { from: 342, dur: 10, file: 'sfx_sparkle_chime.wav', vol: 0.34 },
    { from: 382, dur: 10, file: 'sfx_zoom_punch.wav', vol: 0.44 },
    { from: 390, dur: 10, file: 'sfx_click.wav', vol: 0.48 },
    { from: 406, dur: 14, file: 'sfx_whip_pan.wav', vol: 0.48 },
    { from: 408, dur: 18, file: 'sfx_error.wav', vol: 0.6 },
    { from: 408, dur: 14, file: 'sfx_bass_punch.wav', vol: 0.54 },
    { from: 448, dur: 10, file: 'sfx_glitch_stutter.wav', vol: 0.5 },
    { from: 467, dur: 10, file: 'sfx_glitch_stutter.wav', vol: 0.5 },
    { from: 486, dur: 10, file: 'sfx_glitch_stutter.wav', vol: 0.52 },
    { from: 505, dur: 10, file: 'sfx_glitch_stutter.wav', vol: 0.54 },
    { from: 510, dur: 14, file: 'sfx_riser_short.wav', vol: 0.48 },
    { from: 524, dur: 28, file: 'sfx_impact_hit.wav', vol: 0.64 },
    { from: 526, dur: 24, file: 'sfx_sub_drop.wav', vol: 0.56 },
    { from: 564, dur: 14, file: 'sfx_swoosh_reverse.wav', vol: 0.46 },
  ];

  const s2Cues: SfxCue[] = [
    { from: 0, dur: 18, file: 'sfx_whoosh.wav', vol: 0.52 },
    { from: 6, dur: 22, file: 'sfx_impact_hit.wav', vol: 0.56 },
    { from: 36, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.46 },
    { from: 78, dur: 10, file: 'sfx_zoom_punch.wav', vol: 0.44 },
    { from: 82, dur: 6, file: 'sfx_tick_fast.wav', vol: 0.36 },
    { from: 89, dur: 6, file: 'sfx_tick_fast.wav', vol: 0.36 },
    { from: 96, dur: 6, file: 'sfx_tick_fast.wav', vol: 0.36 },
    { from: 103, dur: 6, file: 'sfx_tick_fast.wav', vol: 0.36 },
    { from: 112, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.46 },
    { from: 112, dur: 10, file: 'sfx_cut_snap.wav', vol: 0.48 },
    { from: 116, dur: 18, file: 'sfx_data_stream.wav', vol: 0.36 },
    { from: 150, dur: 14, file: 'sfx_bass_punch.wav', vol: 0.48 },
    { from: 150, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.44 },
    { from: 188, dur: 10, file: 'sfx_pop_bright.wav', vol: 0.44 },
    { from: 226, dur: 10, file: 'sfx_shutter_flash.wav', vol: 0.44 },
    { from: 266, dur: 14, file: 'sfx_swoosh_reverse.wav', vol: 0.44 },
  ];

  const s3Cues: SfxCue[] = [
    { from: 0, dur: 16, file: 'sfx_swoosh_fast.wav', vol: 0.48 },
    { from: 18, dur: 46, file: 'sfx_typing_burst.wav', vol: 0.36 },
    { from: 22, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.42 },
    { from: 22, dur: 10, file: 'sfx_zoom_punch.wav', vol: 0.42 },
    { from: 56, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.42 },
    { from: 92, dur: 10, file: 'sfx_cut_snap.wav', vol: 0.46 },
    { from: 126, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.42 },
    { from: 156, dur: 22, file: 'sfx_success.wav', vol: 0.48 },
    { from: 156, dur: 14, file: 'sfx_bass_punch.wav', vol: 0.5 },
    { from: 156, dur: 12, file: 'sfx_shutter_flash.wav', vol: 0.42 },
    { from: 186, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.44 },
    { from: 186, dur: 44, file: 'sfx_typing_burst.wav', vol: 0.34 },
    { from: 236, dur: 10, file: 'sfx_pop_bright.wav', vol: 0.46 },
    { from: 236, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.44 },
    { from: 278, dur: 10, file: 'sfx_sparkle_chime.wav', vol: 0.36 },
    { from: 312, dur: 14, file: 'sfx_swoosh_reverse.wav', vol: 0.44 },
  ];

  const s4Cues: SfxCue[] = [
    { from: 0, dur: 16, file: 'sfx_swoosh_fast.wav', vol: 0.46 },
    { from: 12, dur: 44, file: 'sfx_typing_burst.wav', vol: 0.34 },
    { from: 34, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.42 },
    { from: 66, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.44 },
    { from: 66, dur: 10, file: 'sfx_zoom_punch.wav', vol: 0.46 },
    { from: 96, dur: 14, file: 'sfx_riser_short.wav', vol: 0.44 },
    { from: 108, dur: 18, file: 'sfx_impact_hit.wav', vol: 0.5 },
    { from: 116, dur: 20, file: 'sfx_data_stream.wav', vol: 0.38 },
    { from: 148, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.42 },
    { from: 192, dur: 26, file: 'sfx_chime_connect.wav', vol: 0.5 },
    { from: 192, dur: 14, file: 'sfx_bass_punch.wav', vol: 0.5 },
    { from: 200, dur: 12, file: 'sfx_sparkle_chime.wav', vol: 0.42 },
    { from: 224, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.44 },
    { from: 224, dur: 10, file: 'sfx_zoom_punch.wav', vol: 0.44 },
    { from: 262, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.44 },
    { from: 262, dur: 10, file: 'sfx_pop_bright.wav', vol: 0.42 },
    { from: 304, dur: 10, file: 'sfx_cut_snap.wav', vol: 0.42 },
    { from: 324, dur: 14, file: 'sfx_swoosh_reverse.wav', vol: 0.44 },
  ];

  const s5Cues: SfxCue[] = [
    { from: 0, dur: 16, file: 'sfx_swoosh_fast.wav', vol: 0.46 },
    { from: 36, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.42 },
    { from: 42, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.44 },
    { from: 62, dur: 10, file: 'sfx_click.wav', vol: 0.5 },
    { from: 76, dur: 10, file: 'sfx_ui_slide.wav', vol: 0.46 },
    { from: 96, dur: 32, file: 'sfx_typing_burst.wav', vol: 0.3 },
    { from: 112, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.42 },
    { from: 148, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.44 },
    { from: 152, dur: 10, file: 'sfx_pop_bright.wav', vol: 0.48 },
    { from: 184, dur: 10, file: 'sfx_zoom_punch.wav', vol: 0.44 },
    { from: 208, dur: 10, file: 'sfx_click.wav', vol: 0.5 },
    { from: 208, dur: 28, file: 'sfx_chime_connect.wav', vol: 0.52 },
    { from: 208, dur: 14, file: 'sfx_bass_punch.wav', vol: 0.5 },
    { from: 218, dur: 6, file: 'sfx_tick_fast.wav', vol: 0.34 },
    { from: 224, dur: 6, file: 'sfx_tick_fast.wav', vol: 0.34 },
    { from: 230, dur: 6, file: 'sfx_tick_fast.wav', vol: 0.34 },
    { from: 236, dur: 6, file: 'sfx_tick_fast.wav', vol: 0.34 },
    { from: 256, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.44 },
    { from: 256, dur: 18, file: 'sfx_data_stream.wav', vol: 0.38 },
    { from: 304, dur: 14, file: 'sfx_swoosh_reverse.wav', vol: 0.44 },
  ];

  const s6Cues: SfxCue[] = [
    { from: 0, dur: 14, file: 'sfx_swoosh_fast.wav', vol: 0.44 },
    { from: 20, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.44 },
    { from: 20, dur: 10, file: 'sfx_pop_bright.wav', vol: 0.48 },
    { from: 48, dur: 10, file: 'sfx_click.wav', vol: 0.48 },
    { from: 50, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.42 },
    { from: 52, dur: 46, file: 'sfx_typing_burst.wav', vol: 0.32 },
    { from: 92, dur: 10, file: 'sfx_zoom_punch.wav', vol: 0.44 },
    { from: 130, dur: 14, file: 'sfx_notif_soft.wav', vol: 0.5 },
    { from: 130, dur: 10, file: 'sfx_ui_slide.wav', vol: 0.46 },
    { from: 130, dur: 10, file: 'sfx_shutter_flash.wav', vol: 0.42 },
    { from: 162, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.42 },
    { from: 194, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.44 },
    { from: 194, dur: 10, file: 'sfx_zoom_punch.wav', vol: 0.44 },
    { from: 242, dur: 10, file: 'sfx_click.wav', vol: 0.52 },
    { from: 242, dur: 22, file: 'sfx_success.wav', vol: 0.48 },
    { from: 242, dur: 14, file: 'sfx_bass_punch.wav', vol: 0.5 },
    { from: 290, dur: 14, file: 'sfx_swoosh_reverse.wav', vol: 0.44 },
  ];

  const s7Cues: SfxCue[] = [
    { from: 0, dur: 16, file: 'sfx_swoosh_fast.wav', vol: 0.46 },
    { from: 22, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.44 },
    { from: 48, dur: 10, file: 'sfx_pop_bright.wav', vol: 0.44 },
    { from: 48, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.44 },
    { from: 66, dur: 12, file: 'sfx_code_patch.wav', vol: 0.5 },
    { from: 66, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.44 },
    { from: 122, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.48 },
    { from: 122, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.42 },
    { from: 124, dur: 18, file: 'sfx_data_stream.wav', vol: 0.38 },
    { from: 162, dur: 10, file: 'sfx_zoom_punch.wav', vol: 0.46 },
    { from: 162, dur: 10, file: 'sfx_ui_slide.wav', vol: 0.42 },
    { from: 196, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.44 },
    { from: 224, dur: 28, file: 'sfx_victory_fanfare.wav', vol: 0.56 },
    { from: 224, dur: 16, file: 'sfx_impact_hit.wav', vol: 0.46 },
    { from: 224, dur: 14, file: 'sfx_bass_punch.wav', vol: 0.5 },
    { from: 282, dur: 10, file: 'sfx_sparkle_chime.wav', vol: 0.4 },
    { from: 328, dur: 14, file: 'sfx_swoosh_reverse.wav', vol: 0.46 },
  ];

  const s8Cues: SfxCue[] = [
    { from: 0, dur: 18, file: 'sfx_whoosh.wav', vol: 0.52 },
    { from: 2, dur: 24, file: 'sfx_impact_hit.wav', vol: 0.54 },
    { from: 36, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.44 },
    { from: 76, dur: 10, file: 'sfx_laser_lock.wav', vol: 0.46 },
    { from: 76, dur: 14, file: 'sfx_bass_punch.wav', vol: 0.48 },
    { from: 120, dur: 10, file: 'sfx_whip_pan.wav', vol: 0.44 },
    { from: 120, dur: 10, file: 'sfx_sparkle_chime.wav', vol: 0.4 },
    { from: 162, dur: 28, file: 'sfx_victory_fanfare.wav', vol: 0.48 },
    { from: 204, dur: 10, file: 'sfx_shutter_flash.wav', vol: 0.4 },
  ];

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#0A0C10',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Driving 120 BPM Tech Synth Bed (balanced beneath neural narration) */}
      <Audio
        src={staticFile('audio/bg_bed.wav')}
        loop
        volume={(f) =>
          interpolate(f, [0, 16, totalFrames - 36, totalFrames], [0, 0.19, 0.19, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />

      {/* Razor-thin top progress indicator */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressRatio}%`,
            backgroundColor: THEME.palette.primaryVolt,
            boxShadow: `0 0 12px ${THEME.palette.primaryVolt}`,
          }}
        />
      </div>

      {/* VISUAL TIMELINE WITH HIGH-ENERGY WHIP TRANSITIONS */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={s1.durationFrames}>
          <Scene1Pain />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: 'from-bottom' })}
          timing={whipSpring}
        />

        <TransitionSeries.Sequence durationInFrames={s2.durationFrames}>
          <Scene2Solution />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={whipSpring}
        />

        <TransitionSeries.Sequence durationInFrames={s3.durationFrames}>
          <Scene3Install />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: 'from-left' })}
          timing={whipSpring}
        />

        <TransitionSeries.Sequence durationInFrames={s4.durationFrames}>
          <Scene4Terminal />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-left' })}
          timing={whipSpring}
        />

        <TransitionSeries.Sequence durationInFrames={s5.durationFrames}>
          <Scene5ConnectMcp />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={whipSpring}
        />

        <TransitionSeries.Sequence durationInFrames={s6.durationFrames}>
          <Scene6MentionPermission />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={whipSpring}
        />

        <TransitionSeries.Sequence durationInFrames={s7.durationFrames}>
          <Scene7Execution />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: 'from-right' })}
          timing={whipSpring}
        />

        <TransitionSeries.Sequence durationInFrames={s8.durationFrames}>
          <Scene8Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* SYNCED NEURAL NARRATION & HYPER-RETENTION PER-ASSET STUDIO SOUND DESIGN */}
      {[
        { scene: s1, cues: s1Cues, name: 'Audio S1' },
        { scene: s2, cues: s2Cues, name: 'Audio S2' },
        { scene: s3, cues: s3Cues, name: 'Audio S3' },
        { scene: s4, cues: s4Cues, name: 'Audio S4' },
        { scene: s5, cues: s5Cues, name: 'Audio S5' },
        { scene: s6, cues: s6Cues, name: 'Audio S6' },
        { scene: s7, cues: s7Cues, name: 'Audio S7' },
        { scene: s8, cues: s8Cues, name: 'Audio S8' },
      ].map(({ scene, cues, name }) => (
        <Sequence
          key={name}
          from={scene.startFrame}
          durationInFrames={scene.durationFrames}
          name={name}
        >
          <Sequence from={scene.leadPadFrames}>
            <Audio src={staticFile(scene.audioFile)} volume={1} />
          </Sequence>
          <SfxTrack cues={cues} />
        </Sequence>
      ))}

      {/* Word-Synced Captions */}
      <CaptionsOverlay />
    </div>
  );
};
