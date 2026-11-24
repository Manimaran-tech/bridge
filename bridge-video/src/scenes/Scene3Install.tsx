import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { WindowsDesktop } from '../desktop/WindowsDesktop';
import { RealBridgeTerminal } from '../desktop/RealBridgeTerminal';
import { THEME } from '../theme';
import {
  useDynamicCutCamera,
  CutVfxLayer,
  FloatingCalloutVfx,
} from '../components/common/RetentionVFX';

// Scene 3: 332 frames (11.07s) — Clean Screen Studio PowerShell Install
export const Scene3Install: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isLandscape = width > height;

  const cmd1 = 'npm install -g @markmayandi/bridge';
  const cmd1Typed = Math.floor(
    interpolate(frame, [16, 86], [0, cmd1.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const cmd1Running = frame >= 92 && frame < 156;
  const cmd1Done = frame >= 156;

  const spinnerFrames = ['|', '/', '-', '\\'];
  const npmSpinner = spinnerFrames[Math.floor(frame / 2) % spinnerFrames.length];

  const cmd2 = 'npx @markmayandi/bridge';
  const cmd2Start = 186;
  const cmd2Typed = Math.floor(
    interpolate(frame, [cmd2Start, 240], [0, cmd2.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  // Smooth Screen Studio zoom tracking the active terminal line
  const cam = useDynamicCutCamera([
    { startFrame: 0, zoom: 1.0, focusX: 0.5, focusY: 0.5, hardCut: true },
    { startFrame: 18, zoom: isLandscape ? 1.24 : 1.16, focusX: 0.36, focusY: 0.24 },
    { startFrame: 92, zoom: isLandscape ? 1.18 : 1.12, focusX: 0.42, focusY: 0.34 },
    { startFrame: 156, zoom: isLandscape ? 1.22 : 1.14, focusX: 0.42, focusY: 0.38, flashColor: '#34D399' },
    { startFrame: 186, zoom: isLandscape ? 1.26 : 1.18, focusX: 0.38, focusY: 0.52 },
    { startFrame: 262, zoom: 1.02, focusX: 0.48, focusY: 0.46 },
  ]);

  const doneSpring = spring({
    frame: Math.max(0, frame - 156),
    fps,
    config: { damping: 12, stiffness: 240 },
  });

  const fontSize = isLandscape ? 21 : 22;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      <WindowsDesktop
        activeApp="terminal"
        zoom={cam.zoom}
        focusX={cam.focusX}
        focusY={cam.focusY}
        tiltDeg={cam.tiltDeg}
        shakeX={cam.shakeX}
        shakeY={cam.shakeY}
      >
        <RealBridgeTerminal
          tabTitle="Windows PowerShell"
          mode="shell"
          shellContent={
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                fontSize,
                lineHeight: 1.6,
                padding: isLandscape ? '14px 16px' : '16px 8px',
              }}
            >
              <div style={{ color: '#9CA3AF', fontSize: isLandscape ? 16 : 17 }}>
                Windows PowerShell
                <br />
                Copyright (C) Microsoft Corporation. All rights reserved.
              </div>

              {/* Step 1: Global npm install */}
              <div style={{ marginTop: 8 }}>
                <span style={{ color: '#60A5FA', fontWeight: 700 }}>PS C:\Users\manim&gt; </span>
                <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{cmd1.slice(0, cmd1Typed)}</span>
                {frame >= 16 && frame < 92 && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 11,
                      height: 22,
                      backgroundColor: '#D2FF00',
                      marginLeft: 2,
                      verticalAlign: 'middle',
                      opacity: Math.floor(frame / 6) % 2 === 0 ? 1 : 0,
                    }}
                  />
                )}
              </div>

              {cmd1Running && (
                <div style={{ color: '#50C8FF', fontSize: isLandscape ? 17 : 18, fontWeight: 600 }}>
                  {npmSpinner} reify:@markmayandi/bridge: timing reifyNode:node_modules/@markmayandi/bridge
                </div>
              )}

              {cmd1Done && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    fontSize: isLandscape ? 18 : 19,
                    opacity: doneSpring,
                    transform: `translateY(${(1 - doneSpring) * 10}px)`,
                  }}
                >
                  <div style={{ color: '#34D399', fontWeight: 800 }}>
                    added 1 package in 2s
                  </div>
                  <div style={{ color: '#9CA3AF' }}>
                    + @markmayandi/bridge@1.0.14 (24 sandboxed MCP tools • zero JSON config)
                  </div>
                  <div style={{ color: '#D2FF00', fontWeight: 800 }}>
                    ✓ Global `bridge` command installed on PATH
                  </div>
                </div>
              )}

              {/* Step 2: Zero-install npx alternative */}
              {frame >= 176 && (
                <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ color: '#64748B', fontSize: isLandscape ? 17 : 18 }}>
                    # Or launch instantly anywhere with zero installation:
                  </div>
                  <div>
                    <span style={{ color: '#60A5FA', fontWeight: 700 }}>PS C:\Users\manim&gt; </span>
                    <span style={{ color: THEME.palette.secondaryCyan, fontWeight: 800 }}>
                      {cmd2.slice(0, cmd2Typed)}
                    </span>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 11,
                        height: 22,
                        backgroundColor: THEME.palette.secondaryCyan,
                        marginLeft: 2,
                        verticalAlign: 'middle',
                        opacity: Math.floor(frame / 6) % 2 === 0 ? 1 : 0,
                      }}
                    />
                  </div>
                  {frame >= 246 && (
                    <div style={{ color: '#E5E7EB', fontSize: isLandscape ? 17 : 18, marginTop: 4, fontWeight: 600 }}>
                      No port forwarding • No manual config files • Windows, macOS &amp; Linux
                    </div>
                  )}
                </div>
              )}
            </div>
          }
        />
      </WindowsDesktop>

      <FloatingCalloutVfx
        startFrame={156}
        endFrame={184}
        label="Installed in 2 Seconds"
        sublabel="Zero JSON config · 24 tools ready"
        accent="#34D399"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <FloatingCalloutVfx
        startFrame={186}
        endFrame={326}
        label="Zero-Install Option: npx"
        sublabel="Run anywhere with one command"
        accent="#50C8FF"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <CutVfxLayer
        flashColor={cam.flashColor}
        flashOpacity={cam.flashOpacity}
        rgbSplitAmount={cam.rgbSplitAmount}
        stepTag="STEP 01 · INSTALL BRIDGE"
        stepAccent="#D2FF00"
      />
    </div>
  );
};
