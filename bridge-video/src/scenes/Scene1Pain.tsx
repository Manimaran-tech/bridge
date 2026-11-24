import React from 'react';
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  FileArchive,
  Folder,
  FileCode2,
  Copy,
  Check,
  XCircle,
  RefreshCw,
  Sparkles,
  Smile,
  Clock,
} from 'lucide-react';
import { WindowsDesktop, AnchoredCursor } from '../desktop/WindowsDesktop';
import { RealGeminiWeb, GeminiPromptBar } from '../desktop/RealGeminiWeb';
import { RealVSCode, VsCodeLine } from '../desktop/RealVSCode';
import { THEME } from '../theme';
import {
  useDynamicCutCamera,
  CutVfxLayer,
  FloatingCalloutVfx,
} from '../components/common/RetentionVFX';

// Scene 1: 584 frames (19.47s) — Real Computer Workflow Copy-Paste Error Loop
export const Scene1Pain: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isLandscape = width > height;

  // Phase 1 & 2: Chrome Gemini Web — drag zip from File Explorer -> send -> copy code (0..242)
  const isDraggingZip = frame >= 20 && frame < 76;
  const zipDropped = frame >= 76;
  const uploadPct = interpolate(frame, [78, 114], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const promptSent = frame >= 124;
  const copyHovered = frame >= 194 && frame < 206;
  const copyClicked = frame >= 206;
  const showAltTab = frame >= 222 && frame < 242;

  // Purposeful Screen Studio camera choreography (hard cuts on app switches, silky glides on UI focus)
  const cam = useDynamicCutCamera([
    { startFrame: 0, zoom: 1.02, focusX: 0.54, focusY: 0.46, hardCut: true },
    { startFrame: 56, zoom: isLandscape ? 1.18 : 1.12, focusX: 0.5, focusY: 0.52 },
    { startFrame: 124, zoom: isLandscape ? 1.06 : 1.04, focusX: 0.52, focusY: 0.44, hardCut: true, flashColor: '#FFFFFF' },
    { startFrame: 172, zoom: isLandscape ? 1.24 : 1.16, focusX: isLandscape ? 0.64 : 0.72, focusY: 0.4 },
    { startFrame: 242, zoom: 1.04, focusX: 0.5, focusY: 0.46, hardCut: true, flashColor: '#FFFFFF' },
    { startFrame: 284, zoom: isLandscape ? 1.22 : 1.14, focusX: 0.5, focusY: 0.74, hardCut: true, flashColor: '#EF4444', rgbSplit: true, shake: 6 },
    { startFrame: 340, zoom: isLandscape ? 1.12 : 1.08, focusX: 0.54, focusY: 0.48, hardCut: true, flashColor: '#FFFFFF' },
    { startFrame: 406, zoom: isLandscape ? 1.24 : 1.16, focusX: 0.5, focusY: 0.74, hardCut: true, flashColor: '#EF4444', rgbSplit: true, shake: 7 },
    { startFrame: 448, zoom: 1.08, focusX: 0.5, focusY: 0.48, hardCut: true, flashColor: '#EF4444', rgbSplit: true, shake: 4 },
    { startFrame: 467, zoom: 1.1, focusX: 0.5, focusY: 0.52, hardCut: true, flashColor: '#FFFFFF', rgbSplit: true, shake: 4 },
    { startFrame: 486, zoom: 1.12, focusX: 0.5, focusY: 0.48, hardCut: true, flashColor: '#EF4444', rgbSplit: true, shake: 5 },
    { startFrame: 505, zoom: 1.14, focusX: 0.5, focusY: 0.52, hardCut: true, flashColor: '#EF4444', rgbSplit: true, shake: 5 },
    { startFrame: 524, zoom: 1.02, focusX: 0.5, focusY: 0.5, hardCut: true, flashColor: '#EF4444', shake: 7 },
  ]);

  // Phase 3: VS Code Paste & Crash #1 (242..340)
  const pasteDone = frame >= 262;
  const test1Ran = frame >= 282;
  const crashShake =
    (frame >= 286 && frame < 316) || (frame >= 416 && frame < 444)
      ? Math.sin(frame * 2.2) * 5
      : 0;

  // Phase 4: Back to Gemini -> paste error -> copy fix #2 -> VS Code still fails (340..448)
  const isRetryWeb = frame >= 340 && frame < 406;
  const isRetryVsCode = frame >= 406 && frame < 448;
  const retryCopyClicked = frame >= 390;

  // Phase 5: Rapid real desktop switches (448..524)
  const isMontage = frame >= 448 && frame < 524;
  const montageIdx = Math.min(3, Math.floor((frame - 448) / 19));

  // Phase 6: Clean Editorial Hook Slam (524..584)
  const isSlam = frame >= 524;
  const slamSpring = spring({
    frame: Math.max(0, frame - 524),
    fps,
    config: { damping: 14, stiffness: 220, mass: 0.7 },
  });

  const aiLines = [
    '// Replace filterTodos in todo-logic.js:',
    'import { PRIORITY_MAP } from "./constants";',
    'export function filterTodos(todos, filter) {',
    '  const sorted = [...todos].sort((a, b) =>',
    '    PRIORITY_MAP[a.priority] - PRIORITY_MAP[b.priority]',
    '  );',
    '  if (filter === "active") return sorted.filter(t => !t.completed);',
    '  return sorted;',
    '}',
  ];
  const visibleAiLines = Math.floor(
    interpolate(frame, [132, 182], [0, aiLines.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  const vsCodeLines1: VsCodeLine[] = [
    {
      num: 60,
      content: <span style={{ color: '#6A9955' }}>// Pasted snippet from Gemini web chat</span>,
    },
    {
      num: 61,
      highlight: test1Ran ? 'error' : pasteDone ? 'pasted' : 'none',
      content: (
        <>
          <span style={{ color: '#C586C0' }}>import</span> {'{ PRIORITY_MAP }'}{' '}
          <span style={{ color: '#C586C0' }}>from</span>{' '}
          <span style={{ color: '#CE9178', textDecoration: test1Ran ? 'wavy underline #EF4444' : 'none' }}>
            &quot;./constants&quot;
          </span>
          ;
        </>
      ),
    },
    {
      num: 62,
      highlight: test1Ran ? 'error' : pasteDone ? 'pasted' : 'none',
      content: (
        <>
          <span style={{ color: '#569CD6' }}>export function</span>{' '}
          <span style={{ color: '#DCDCAA' }}>filterTodos</span>(todos, filter) {'{'}
        </>
      ),
    },
    {
      num: 63,
      highlight: pasteDone ? 'pasted' : 'none',
      content: '  const sorted = [...todos].sort((a, b) =>',
    },
    {
      num: 64,
      highlight: pasteDone ? 'pasted' : 'none',
      content: '    PRIORITY_MAP[a.priority] - PRIORITY_MAP[b.priority]',
    },
    { num: 65, highlight: pasteDone ? 'pasted' : 'none', content: '  );' },
    { num: 66, highlight: pasteDone ? 'pasted' : 'none', content: '  return sorted;' },
    { num: 67, highlight: pasteDone ? 'pasted' : 'none', content: '}' },
  ];

  const vsCodeLines2: VsCodeLine[] = [
    {
      num: 60,
      content: <span style={{ color: '#6A9955' }}>// Attempt #2 pasted from web chat</span>,
    },
    {
      num: 61,
      highlight: 'error',
      content: (
        <>
          <span style={{ color: '#9CDCFE' }}>module</span>.exports.
          <span style={{ color: '#DCDCAA', textDecoration: 'wavy underline #EF4444' }}>sortTodos</span> = (list) =&gt;
        </>
      ),
    },
    {
      num: 62,
      highlight: 'error',
      content: '  list.sort((a, b) => a.rank - b.rank);',
    },
  ];

  if (isSlam) {
    return (
      <div
        style={{
          width,
          height,
          backgroundColor: '#0A0B0E',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: isLandscape ? '0 120px 100px' : '0 56px 180px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 45%, rgba(239, 68, 68, 0.18) 0%, transparent 62%)',
          }}
        />
        <div
          style={{
            transform: `scale(${0.86 + slamSpring * 0.14})`,
            opacity: slamSpring,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: THEME.typography.mono,
              fontSize: isLandscape ? 20 : 19,
              fontWeight: 800,
              color: '#F87171',
              backgroundColor: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              padding: '9px 22px',
              borderRadius: 999,
              letterSpacing: '0.14em',
            }}
          >
            UPLOAD • COPY • PASTE • CRASH • REPEAT
          </div>
          <div
            style={{
              fontFamily: THEME.typography.display,
              fontSize: isLandscape ? 98 : 88,
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 0.98,
              letterSpacing: '-0.04em',
            }}
          >
            ENDLESS <span style={{ color: '#EF4444' }}>COPY-PASTE</span> LOOP.
          </div>
        </div>
        <CutVfxLayer
          flashColor={cam.flashColor}
          flashOpacity={cam.flashOpacity}
          rgbSplitAmount={cam.rgbSplitAmount}
          stepTag="STOP COPY-PASTING"
          stepAccent="#EF4444"
        />
      </div>
    );
  }

  // Phase 5: Rapid realistic desktop loop cuts (Chrome <-> VS Code)
  if (isMontage) {
    const isChromeCut = montageIdx % 2 === 0;
    const banners = [
      { tag: 'ATTEMPT #2', title: 'Paste stack trace back to web chat', err: 'SyntaxError: Cannot use import statement outside a module' },
      { tag: 'ATTEMPT #3', title: 'Copy new fix & paste into VS Code', err: 'TypeError: TodoLogic.filterTodos is not a function' },
      { tag: 'ATTEMPT #4', title: 'Re-zip 42 KB folder & upload again', err: 'ReferenceError: module is not defined' },
      { tag: 'ATTEMPT #5', title: 'Still failing — 18 minutes wasted', err: 'FAIL tests/todo.test.js • Exit code 1' },
    ];
    const b = banners[montageIdx];

    return (
      <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      <WindowsDesktop
        activeApp={isChromeCut ? 'chrome' : 'vscode'}
        zoom={cam.zoom}
        focusX={cam.focusX}
        focusY={cam.focusY}
        tiltDeg={cam.tiltDeg}
        shakeX={cam.shakeX}
        shakeY={cam.shakeY}
      >
        {isChromeCut ? (
          <RealGeminiWeb path="/app" activeSidebarItem="chat">
            <div style={{ flex: 1, padding: 36, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 900, margin: '0 auto', width: '100%' }}>
              <div style={{ alignSelf: 'flex-end', backgroundColor: '#1E2025', borderRadius: 20, padding: '14px 20px', color: '#E3E3E3', fontFamily: THEME.typography.mono, fontSize: 15 }}>
                {b.err}
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <Img src={staticFile('assets/gemini-icon.svg')} style={{ width: 26, height: 26, borderRadius: 7 }} />
                <div style={{ color: '#C4C7C5', fontFamily: THEME.typography.display, fontSize: 17 }}>
                  Sorry about that — since I can&apos;t inspect your local workspace, try replacing lines 12–74 manually...
                </div>
              </div>
            </div>
          </RealGeminiWeb>
        ) : (
          <RealVSCode
            activeFile="todo-logic.js"
            errorCount={4}
            codeLines={vsCodeLines2}
            terminalCommand="node --test"
            terminalOutput={
              <div style={{ color: '#F87171', fontWeight: 700 }}>
                ✖ {b.err}
                <div style={{ color: '#FCA5A5', marginTop: 6 }}>Exit Code 1 — 6 tests failing</div>
              </div>
            }
          />
        )}

        <div
          style={{
            position: 'absolute',
            top: isLandscape ? 92 : 120,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(17, 19, 24, 0.94)',
            border: '2px solid #EF4444',
            borderRadius: 16,
            padding: '16px 28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 950,
            minWidth: isLandscape ? 620 : 860,
          }}
        >
          <div
            style={{
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontFamily: THEME.typography.mono,
              fontSize: 15,
              fontWeight: 900,
              padding: '6px 12px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            <RefreshCw size={15} />
            <span>{b.tag}</span>
          </div>
          <div>
            <div style={{ fontFamily: THEME.typography.display, fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>
              {b.title}
            </div>
            <div style={{ fontFamily: THEME.typography.mono, fontSize: 13.5, color: '#FCA5A5', marginTop: 2 }}>
              {b.err}
            </div>
          </div>
        </div>
      </WindowsDesktop>
      <CutVfxLayer
        flashColor={cam.flashColor}
        flashOpacity={cam.flashOpacity}
        rgbSplitAmount={cam.rgbSplitAmount}
        stepTag={`CRASH LOOP · ${b.tag}`}
        stepAccent="#EF4444"
      />
      </div>
    );
  }

  // Phase 3 & 4B: Real VS Code Dark Modern (Paste & Crash)
  if ((frame >= 242 && frame < 340) || isRetryVsCode) {
    const isSecondCrash = isRetryVsCode;
    return (
      <div style={{ width, height, position: 'relative', overflow: 'hidden', transform: `translateX(${crashShake}px)` }}>
        <WindowsDesktop
          activeApp="vscode"
          zoom={cam.zoom}
          focusX={cam.focusX}
          focusY={cam.focusY}
          tiltDeg={cam.tiltDeg}
          shakeX={cam.shakeX}
          shakeY={cam.shakeY}
        >
          <RealVSCode
            activeFile="todo-logic.js"
            modified
            errorCount={test1Ran || isSecondCrash ? 2 : 0}
            showPasteToast={(!isSecondCrash && pasteDone && !test1Ran) || (isSecondCrash && frame < 418)}
            codeLines={isSecondCrash ? vsCodeLines2 : vsCodeLines1}
            terminalCommand="node --test"
            terminalOutput={
              (test1Ran || isSecondCrash) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ color: '#F87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <XCircle size={16} color="#EF4444" />
                    <span>tests/todo.test.js (19.2ms)</span>
                  </div>
                  {isSecondCrash ? (
                    <>
                      <div style={{ color: '#FCA5A5' }}>
                        TypeError: TodoLogic.filterTodos is not a function
                      </div>
                      <div style={{ color: '#9CA3AF' }}>
                        {'    '}at TestContext.&lt;anonymous&gt; (tests/todo.test.js:14:22)
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: '#FCA5A5' }}>
                        SyntaxError: Cannot use import statement outside a module
                      </div>
                      <div style={{ color: '#FCA5A5' }}>
                        Error: Cannot find module &apos;./constants&apos;
                      </div>
                      <div style={{ color: '#9CA3AF' }}>
                        {'    '}at Object.&lt;anonymous&gt; (C:\tmp\interview\gemini-test-project\todo-logic.js:61:1)
                      </div>
                    </>
                  )}
                  <div style={{ color: '#F87171', fontWeight: 800, marginTop: 6 }}>
                    ✖ tests 6 | pass 0 | fail 6 — Exit Code 1
                  </div>
                </div>
              )
            }
          />
        </WindowsDesktop>
        <FloatingCalloutVfx
          startFrame={284}
          endFrame={338}
          label="Broken Import · Exit 1"
          sublabel="Web AI hallucinated ./constants"
          accent="#EF4444"
          top={isLandscape ? '20px' : '32px'}
          right="22px"
        />
        <FloatingCalloutVfx
          startFrame={408}
          endFrame={446}
          label="Still Failing · 0/6 Pass"
          sublabel="Web AI can't see your real workspace"
          accent="#EF4444"
          top={isLandscape ? '20px' : '32px'}
          right="22px"
        />
        <CutVfxLayer
          flashColor={cam.flashColor}
          flashOpacity={cam.flashOpacity}
          rgbSplitAmount={cam.rgbSplitAmount}
          stepTag="THE OLD WAY · COPY-PASTE CRASH"
          stepAccent="#EF4444"
        />
      </div>
    );
  }

  // Phase 4A: Back in Real Gemini Web — pasting error stack trace & copying Fix #2 (340..406)
  if (isRetryWeb) {
    return (
      <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      <WindowsDesktop
        activeApp="chrome"
        zoom={cam.zoom}
        focusX={cam.focusX}
        focusY={cam.focusY}
        tiltDeg={cam.tiltDeg}
        shakeX={cam.shakeX}
        shakeY={cam.shakeY}
      >
        <RealGeminiWeb path="/app" activeSidebarItem="chat">
          <div
            style={{
              flex: 1,
              maxWidth: isLandscape ? 840 : 940,
              width: '100%',
              margin: '0 auto',
              padding: isLandscape ? '24px 28px 100px' : '28px 24px 220px',
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
            }}
          >
            <div style={{ alignSelf: 'flex-end', maxWidth: '86%' }}>
              <div
                style={{
                  backgroundColor: '#1E2025',
                  border: '1px solid #2C2F36',
                  borderRadius: '20px 4px 20px 20px',
                  padding: '14px 20px',
                  color: '#E3E3E3',
                  fontFamily: THEME.typography.display,
                  fontSize: isLandscape ? 16 : 18.5,
                  lineHeight: 1.5,
                }}
              >
                That broke my tests! Here is the error from VS Code:
                <div
                  style={{
                    marginTop: 10,
                    backgroundColor: '#121317',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontFamily: THEME.typography.mono,
                    fontSize: isLandscape ? 13 : 14.5,
                    color: '#F28B82',
                  }}
                >
                  SyntaxError: Cannot use import statement outside a module
                  <br />
                  Error: Cannot find module &apos;./constants&apos;
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <Img
                src={staticFile('assets/gemini-icon.svg')}
                style={{ width: 26, height: 26, borderRadius: 7, marginTop: 2, flexShrink: 0 }}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: THEME.typography.display, fontSize: isLandscape ? 16 : 18, color: '#E3E3E3', lineHeight: 1.55 }}>
                  My mistake — your project uses CommonJS. Copy and paste this updated version into{' '}
                  <span style={{ fontFamily: THEME.typography.mono, backgroundColor: '#1E2025', padding: '2px 6px', borderRadius: 5 }}>
                    todo-logic.js
                  </span>
                  :
                </div>

                <div style={{ backgroundColor: '#16181D', borderRadius: 14, overflow: 'hidden', border: '1px solid #2A2C33' }}>
                  <div
                    style={{
                      padding: '9px 16px',
                      backgroundColor: '#1F2127',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontFamily: THEME.typography.display,
                      fontSize: 13,
                      color: '#C4C7C5',
                    }}
                  >
                    <span>JavaScript</span>
                    <span
                      style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 6,
                        backgroundColor: retryCopyClicked ? '#1E3A2F' : frame >= 380 ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: retryCopyClicked ? '#81C995' : '#E3E3E3',
                        fontWeight: 600,
                      }}
                    >
                      {retryCopyClicked ? <Check size={14} /> : <Copy size={14} />}
                      {retryCopyClicked ? 'Copied' : 'Copy code'}
                      <AnchoredCursor
                        startFrame={354}
                        arriveFrame={386}
                        clickFrame={390}
                        endFrame={405}
                        fromX={-180}
                        fromY={100}
                        rippleColor="#81C995"
                      />
                    </span>
                  </div>
                  <div
                    style={{
                      padding: '14px 18px',
                      fontFamily: THEME.typography.mono,
                      fontSize: isLandscape ? 14 : 15.5,
                      lineHeight: 1.6,
                      color: '#E3E3E3',
                    }}
                  >
                    <div>module.exports.sortTodos = (list) =&gt;</div>
                    <div>{'  '}list.sort((a, b) =&gt; a.rank - b.rank);</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RealGeminiWeb>
      </WindowsDesktop>
      <FloatingCalloutVfx
        startFrame={342}
        endFrame={404}
        label="Copy Error · Paste Again"
        sublabel="Round-trip #2 back to web chat"
        accent="#FDD663"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <CutVfxLayer
        flashColor={cam.flashColor}
        flashOpacity={cam.flashOpacity}
        rgbSplitAmount={cam.rgbSplitAmount}
        stepTag="THE OLD WAY · RETRY #2"
        stepAccent="#FDD663"
      />
      </div>
    );
  }

  // Phase 1 & 2: Exact New Gemini Start Screen ("Where should we start?") -> Upload ZIP -> Copy Code (0..242)
  const zipAttachmentChip = zipDropped && !promptSent && (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#25272D',
        borderRadius: 12,
        padding: '8px 12px',
        width: 'fit-content',
      }}
    >
      <FileArchive size={17} color="#8AB4F8" />
      <div>
        <div style={{ fontFamily: THEME.typography.display, fontSize: 13, fontWeight: 500, color: '#E3E3E3' }}>
          gemini-test-project.zip
        </div>
        <div style={{ width: 160, height: 4, backgroundColor: '#121317', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
          <div
            style={{
              width: `${uploadPct}%`,
              height: '100%',
              backgroundColor: uploadPct >= 100 ? '#81C995' : '#8AB4F8',
            }}
          />
        </div>
      </div>
      <span style={{ fontFamily: THEME.typography.mono, fontSize: 12, color: '#9AA0A6' }}>
        {Math.round(uploadPct)}%
      </span>
    </div>
  );

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
    <WindowsDesktop
      activeApp="chrome"
      zoom={cam.zoom}
      focusX={cam.focusX}
      focusY={cam.focusY}
      tiltDeg={cam.tiltDeg}
      shakeX={cam.shakeX}
      shakeY={cam.shakeY}
    >
      <RealGeminiWeb path="/app" activeSidebarItem={promptSent ? 'chat' : 'new'}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: promptSent ? 'space-between' : 'center',
            alignItems: 'center',
            maxWidth: isLandscape ? 820 : 940,
            width: '100%',
            margin: '0 auto',
            padding: isLandscape ? '18px 28px 34px' : '24px 24px 190px',
            position: 'relative',
          }}
        >
          {!promptSent ? (
            /* Exact New Gemini Empty State matching screenshot */
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 26,
                marginBottom: isLandscape ? 50 : 90,
              }}
            >
              <div
                style={{
                  fontFamily: THEME.typography.display,
                  fontSize: isLandscape ? 38 : 44,
                  fontWeight: 400,
                  color: '#F1F3F4',
                  letterSpacing: '-0.02em',
                }}
              >
                Where should we start?
              </div>

              <div style={{ width: '100%', position: 'relative' }}>
                <GeminiPromptBar
                  model="Neon"
                  showModeToggle
                  activeMode="Chat"
                  isDragging={isDraggingZip}
                  canSend={zipDropped}
                  attachment={zipAttachmentChip}
                  value={
                    zipDropped
                      ? 'Fix priority sorting in todo-logic.js and make sure tests pass.'
                      : undefined
                  }
                />
                <AnchoredCursor
                  startFrame={18}
                  arriveFrame={72}
                  clickFrame={76}
                  endFrame={110}
                  fromX={isLandscape ? 380 : 210}
                  fromY={isLandscape ? -140 : -260}
                  rippleColor="#8AB4F8"
                  dragChip={
                    <div
                      style={{
                        backgroundColor: 'rgba(27, 28, 32, 0.96)',
                        border: '1px solid #8AB4F8',
                        borderRadius: 8,
                        padding: '6px 11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        fontFamily: THEME.typography.display,
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#FFFFFF',
                        boxShadow: '0 10px 24px rgba(0, 0, 0, 0.65)',
                      }}
                    >
                      <FileArchive size={14} color="#8AB4F8" />
                      <span>gemini-test-project.zip</span>
                    </div>
                  }
                />
              </div>

              {/* Exact 3 starter suggestion rows from screenshot */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 620,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  marginTop: 10,
                  paddingLeft: 14,
                }}
              >
                {[
                  { icon: Sparkles, text: 'Design a phone wallpaper for me' },
                  { icon: Smile, text: 'Give me a fun brain teaser' },
                  { icon: Clock, text: 'Reset my focus in 5 minutes' },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.text}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        color: '#C4C7C5',
                        fontFamily: THEME.typography.display,
                        fontSize: isLandscape ? 15 : 16.5,
                      }}
                    >
                      <Icon size={16} color="#9AA0A6" />
                      <span>{s.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Active Chat Thread */}
              <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ alignSelf: 'flex-end', maxWidth: '86%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: '#1B1C20',
                      border: '1px solid #2E3138',
                      borderRadius: 12,
                      padding: '8px 14px',
                    }}
                  >
                    <FileArchive size={18} color="#8AB4F8" />
                    <div>
                      <div style={{ fontFamily: THEME.typography.display, fontSize: 13.5, fontWeight: 500, color: '#E3E3E3' }}>
                        gemini-test-project.zip
                      </div>
                      <div style={{ fontFamily: THEME.typography.display, fontSize: 11.5, color: '#9AA0A6' }}>
                        ZIP • 42 KB
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: '#1E2025',
                      border: '1px solid #2B2E35',
                      color: '#E3E3E3',
                      borderRadius: '20px 4px 20px 20px',
                      padding: '13px 18px',
                      fontFamily: THEME.typography.display,
                      fontSize: isLandscape ? 16 : 18.5,
                      lineHeight: 1.48,
                    }}
                  >
                    Fix priority sorting in{' '}
                    <span style={{ fontFamily: THEME.typography.mono, color: '#A8C7FA' }}>todo-logic.js</span> and
                    make sure tests pass.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <Img
                    src={staticFile('assets/gemini-icon.svg')}
                    style={{ width: 26, height: 26, borderRadius: 7, marginTop: 2, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontFamily: THEME.typography.display, fontSize: isLandscape ? 16 : 18, color: '#E3E3E3', lineHeight: 1.5 }}>
                      Here is the updated{' '}
                      <span style={{ fontFamily: THEME.typography.mono, backgroundColor: '#1E2025', padding: '1px 6px', borderRadius: 5 }}>
                        filterTodos
                      </span>{' '}
                      function. Copy and paste it into your local file:
                    </div>

                    <div
                      style={{
                        backgroundColor: '#16181D',
                        borderRadius: 14,
                        border: '1px solid #2A2C33',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          padding: '9px 16px',
                          backgroundColor: '#1F2127',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontFamily: THEME.typography.display,
                          fontSize: 13,
                          color: '#C4C7C5',
                        }}
                      >
                        <span>JavaScript</span>
                        <div
                          style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 6,
                            backgroundColor: copyClicked ? '#1E3A2F' : copyHovered ? 'rgba(255,255,255,0.08)' : 'transparent',
                            color: copyClicked ? '#81C995' : '#E3E3E3',
                            fontWeight: 500,
                          }}
                        >
                          {copyClicked ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copyClicked ? 'Copied' : 'Copy code'}</span>
                          <AnchoredCursor
                            startFrame={166}
                            arriveFrame={200}
                            clickFrame={206}
                            endFrame={222}
                            fromX={-220}
                            fromY={150}
                            rippleColor="#81C995"
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '13px 18px',
                          fontFamily: THEME.typography.mono,
                          fontSize: isLandscape ? 13.8 : 15,
                          lineHeight: 1.55,
                          color: '#E3E3E3',
                        }}
                      >
                        {aiLines.slice(0, visibleAiLines).map((line, i) => (
                          <div
                            key={i}
                            style={{
                              color: line.startsWith('//')
                                ? '#8E918F'
                                : line.includes('import ')
                                  ? '#F28B82'
                                  : line.includes('export ')
                                    ? '#8AB4F8'
                                    : '#E3E3E3',
                              whiteSpace: 'pre',
                            }}
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <GeminiPromptBar model="Neon" />
            </>
          )}
        </div>

        {/* Authentic Floating Windows 11 File Explorer Window (0..86) */}
        {frame < 86 && (
          <div
            style={{
              position: 'absolute',
              top: isLandscape ? 82 : 110,
              right: isLandscape ? 38 : 24,
              width: isLandscape ? 400 : 390,
              backgroundColor: '#202020',
              border: '1px solid #3A3A3A',
              borderRadius: 10,
              boxShadow: '0 22px 50px rgba(0, 0, 0, 0.72)',
              overflow: 'hidden',
              opacity: interpolate(frame, [72, 85], [1, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              zIndex: 820,
            }}
          >
            <div
              style={{
                height: 34,
                backgroundColor: '#2C2C2C',
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: THEME.typography.display,
                fontSize: 12.5,
                color: '#E5E7EB',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Folder size={14} color="#FBBF24" fill="#FBBF24" fillOpacity={0.3} />
                interview — File Explorer
              </span>
              <span style={{ color: '#9CA3AF', fontSize: 11.5 }}>C:\tmp\interview</span>
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', fontFamily: THEME.typography.display, fontSize: 13.5, color: '#D1D5DB' }}>
                <Folder size={16} color="#FBBF24" />
                <span>gemini-test-project</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(96, 165, 250, 0.22)',
                  border: '1px solid rgba(96, 165, 250, 0.6)',
                  fontFamily: THEME.typography.display,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: '#FFFFFF',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileArchive size={16} color="#93C5FD" />
                  <span>gemini-test-project.zip</span>
                </span>
                <span style={{ fontSize: 12, color: '#BFDBFE' }}>42 KB</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', fontFamily: THEME.typography.display, fontSize: 13, color: '#9CA3AF' }}>
                <FileCode2 size={15} color="#9CA3AF" />
                <span>bridge.js</span>
              </div>
            </div>
          </div>
        )}
      </RealGeminiWeb>

      {/* Real Windows Alt+Tab Switcher */}
      {showAltTab && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(12, 14, 18, 0.65)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 960,
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(32, 34, 40, 0.94)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              gap: 18,
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ width: 260, padding: 14, borderRadius: 10, backgroundColor: '#1E2026', opacity: 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E5E7EB', fontFamily: THEME.typography.display, fontSize: 13.5, fontWeight: 600 }}>
                <Img src={staticFile('assets/gemini-icon.svg')} style={{ width: 18, height: 18 }} />
                <span>Gemini — Chrome</span>
              </div>
            </div>
            <div style={{ width: 260, padding: 14, borderRadius: 10, backgroundColor: '#252A36', border: '2px solid #60A5FA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF', fontFamily: THEME.typography.display, fontSize: 13.5, fontWeight: 700 }}>
                <Img src={staticFile('assets/vscode-icon.svg')} style={{ width: 18, height: 18 }} />
                <span>todo-logic.js — VS Code</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </WindowsDesktop>
    <FloatingCalloutVfx
      startFrame={24}
      endFrame={122}
      label="Manual .zip Upload"
      sublabel="Re-archiving your project just for 1 bug"
      accent="#EF4444"
      top={isLandscape ? '20px' : '32px'}
      right="22px"
    />
    <FloatingCalloutVfx
      startFrame={126}
      endFrame={238}
      label="Copy · Alt+Tab · Paste"
      sublabel="Zero awareness of your local files"
      accent="#FDD663"
      top={isLandscape ? '20px' : '32px'}
      right="22px"
    />
    <CutVfxLayer
      flashColor={cam.flashColor}
      flashOpacity={cam.flashOpacity}
      rgbSplitAmount={cam.rgbSplitAmount}
      stepTag="THE OLD WAY · MANUAL UPLOAD"
      stepAccent="#EF4444"
    />
    </div>
  );
};
