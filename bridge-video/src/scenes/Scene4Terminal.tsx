import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { WindowsDesktop } from '../desktop/WindowsDesktop';
import { RealBridgeTerminal } from '../desktop/RealBridgeTerminal';
import { THEME } from '../theme';
import {
  useDynamicCutCamera,
  CutVfxLayer,
  FloatingCalloutVfx,
} from '../components/common/RetentionVFX';

// Scene 4: 344 frames (11.47s) — Clean Screen Studio bridge.js Tunnel Boot & Auto-Clipboard
export const Scene4Terminal: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isLandscape = width > height;

  const cdCmd = 'cd C:\\tmp\\interview\\gemini-test-project';
  const cdTyped = Math.floor(
    interpolate(frame, [10, 58], [0, cdCmd.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const cdEntered = frame >= 64;

  const bridgeCmd = 'bridge .';
  const bridgeTyped = Math.floor(
    interpolate(frame, [70, 98], [0, bridgeCmd.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  const isShellPhase = frame < 108;
  const isTunnelPhase = frame >= 108 && frame < 192;

  const tunnelProgress = interpolate(frame, [110, 178], [0.06, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Purposeful Screen Studio camera: cd -> bridge . -> hard-cut Tunnel -> hard-cut Dashboard -> URL Macro -> Jail
  const cam = useDynamicCutCamera([
    { startFrame: 0, zoom: isLandscape ? 1.18 : 1.12, focusX: 0.36, focusY: 0.24, hardCut: true },
    { startFrame: 66, zoom: isLandscape ? 1.3 : 1.2, focusX: 0.38, focusY: 0.34 },
    { startFrame: 108, zoom: 1.04, focusX: 0.5, focusY: 0.45, hardCut: true, flashColor: '#50C8FF' },
    { startFrame: 192, zoom: 1.02, focusX: 0.5, focusY: 0.48, hardCut: true, flashColor: '#D2FF00' },
    { startFrame: 224, zoom: isLandscape ? 1.26 : 1.16, focusX: 0.46, focusY: 0.44 },
    { startFrame: 274, zoom: isLandscape ? 1.16 : 1.1, focusX: 0.46, focusY: 0.64 },
  ]);

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
          tabTitle={isShellPhase ? 'Windows PowerShell' : 'Bridge — gemini-test-project'}
          mode={isShellPhase ? 'shell' : isTunnelPhase ? 'tunnel' : 'dashboard'}
          tunnelProgress={tunnelProgress}
          projectPath="C:\tmp\interview\gemini-test-project"
          showCopiedFlash={frame >= 200}
          showLiveLogs={false}
          shellContent={
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                fontSize: isLandscape ? 21 : 22,
                lineHeight: 1.6,
                padding: isLandscape ? '14px 16px' : '16px 8px',
              }}
            >
              <div style={{ color: '#9CA3AF', fontSize: isLandscape ? 16 : 17 }}>
                Windows PowerShell
              </div>

              <div>
                <span style={{ color: '#60A5FA', fontWeight: 700 }}>PS C:\Users\manim&gt; </span>
                <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{cdCmd.slice(0, cdTyped)}</span>
                {!cdEntered && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 11,
                      height: 22,
                      backgroundColor: '#FFFFFF',
                      marginLeft: 2,
                      verticalAlign: 'middle',
                      opacity: Math.floor(frame / 6) % 2 === 0 ? 1 : 0,
                    }}
                  />
                )}
              </div>

              {cdEntered && (
                <div>
                  <span style={{ color: '#60A5FA', fontWeight: 700 }}>
                    PS C:\tmp\interview\gemini-test-project&gt;{' '}
                  </span>
                  <span style={{ color: THEME.palette.primaryVolt, fontWeight: 800 }}>
                    {bridgeCmd.slice(0, bridgeTyped)}
                  </span>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 11,
                      height: 22,
                      backgroundColor: THEME.palette.primaryVolt,
                      marginLeft: 2,
                      verticalAlign: 'middle',
                      opacity: Math.floor(frame / 6) % 2 === 0 ? 1 : 0,
                    }}
                  />
                </div>
              )}
            </div>
          }
        />
      </WindowsDesktop>

      <FloatingCalloutVfx
        startFrame={110}
        endFrame={190}
        label="Cloudflare HTTPS Tunnel"
        sublabel="Zero port forwarding · Instant edge URL"
        accent="#50C8FF"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <FloatingCalloutVfx
        startFrame={200}
        endFrame={270}
        label="Auto-Copied to Clipboard"
        sublabel="Ready to paste into your web AI"
        accent="#D2FF00"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <FloatingCalloutVfx
        startFrame={272}
        endFrame={340}
        label="Strict Folder Jail"
        sublabel="AI can never escape this project folder"
        accent="#34D399"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <CutVfxLayer
        flashColor={cam.flashColor}
        flashOpacity={cam.flashOpacity}
        rgbSplitAmount={cam.rgbSplitAmount}
        stepTag="STEP 02 · RUN BRIDGE ."
        stepAccent="#50C8FF"
      />
    </div>
  );
};
