import React from 'react';
import { Img, staticFile, useVideoConfig } from 'remotion';
import {
  Files,
  Search,
  GitBranch,
  Play,
  Blocks,
  ChevronDown,
  FileCode2,
  FileJson,
  FileText,
  X,
  Minus,
  Square,
  AlertCircle,
  AlertTriangle,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { THEME } from '../theme';

export interface VsCodeLine {
  num: number;
  content: React.ReactNode;
  highlight?: 'none' | 'pasted' | 'error' | 'added';
}

interface RealVSCodeProps {
  activeFile?: string;
  modified?: boolean;
  errorCount?: number;
  codeLines: VsCodeLine[];
  terminalCommand?: string;
  terminalOutput?: React.ReactNode;
  showPasteToast?: boolean;
}

export const RealVSCode: React.FC<RealVSCodeProps> = ({
  activeFile = 'todo-logic.js',
  modified = true,
  errorCount = 0,
  codeLines,
  terminalCommand = 'node --test',
  terminalOutput,
  showPasteToast = false,
}) => {
  const { width, height } = useVideoConfig();
  const isLandscape = width > height;

  const explorerFiles = [
    { name: 'package.json', icon: 'json' },
    { name: 'todo-logic.js', icon: 'js', active: true, hasError: errorCount > 0 },
    { name: 'todo-store.js', icon: 'js' },
    { name: 'tests/todo.test.js', icon: 'js' },
    { name: 'README.md', icon: 'md' },
  ];

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#1F1F1F',
        borderRadius: 10,
        border: '1px solid #303030',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.72)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Authentic VS Code Dark Modern Title Bar (#181818) */}
      <div
        style={{
          height: isLandscape ? 36 : 40,
          backgroundColor: '#181818',
          borderBottom: '1px solid #2B2B2B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Img src={staticFile('assets/vscode-icon.svg')} style={{ width: 17, height: 17 }} />
          {isLandscape && (
            <div
              style={{
                display: 'flex',
                gap: 12,
                fontFamily: THEME.typography.display,
                fontSize: 12.5,
                color: '#CCCCCC',
              }}
            >
              <span>File</span>
              <span>Edit</span>
              <span>Selection</span>
              <span>View</span>
              <span>Run</span>
              <span>Terminal</span>
            </div>
          )}
        </div>

        {/* Center Command Palette Search Bar */}
        <div
          style={{
            height: 24,
            width: isLandscape ? 420 : 320,
            backgroundColor: '#242424',
            border: '1px solid #383838',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: THEME.typography.display,
            fontSize: 12,
            color: '#9D9D9D',
          }}
        >
          <Search size={12} />
          <span>gemini-test-project</span>
        </div>

        {/* Windows Caption Controls */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', color: '#CCCCCC' }}>
          <div style={{ width: 42, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Minus size={14} />
          </div>
          <div style={{ width: 42, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Square size={11} />
          </div>
          <div style={{ width: 42, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </div>
        </div>
      </div>

      {/* Main Workbench Area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Activity Bar (#181818) */}
        <div
          style={{
            width: 48,
            backgroundColor: '#181818',
            borderRight: '1px solid #2B2B2B',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 12,
            gap: 20,
            color: '#858585',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              borderLeft: '2px solid #0078D4',
              padding: '4px 0',
              color: '#FFFFFF',
            }}
          >
            <Files size={21} strokeWidth={1.7} />
          </div>
          <Search size={21} strokeWidth={1.7} />
          <GitBranch size={21} strokeWidth={1.7} />
          <Play size={21} strokeWidth={1.7} />
          <Blocks size={21} strokeWidth={1.7} />
        </div>

        {/* Explorer Sidebar (shown in Landscape) */}
        {isLandscape && (
          <div
            style={{
              width: 245,
              backgroundColor: '#181818',
              borderRight: '1px solid #2B2B2B',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: '10px 16px',
                fontFamily: THEME.typography.display,
                fontSize: 11,
                fontWeight: 600,
                color: '#BBBBBB',
                letterSpacing: '0.06em',
              }}
            >
              EXPLORER
            </div>
            <div
              style={{
                padding: '5px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: THEME.typography.display,
                fontSize: 12,
                fontWeight: 700,
                color: '#CCCCCC',
              }}
            >
              <ChevronDown size={14} />
              <span>GEMINI-TEST-PROJECT</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2 }}>
              {explorerFiles.map((f) => (
                <div
                  key={f.name}
                  style={{
                    padding: '6px 14px 6px 26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: f.active ? '#37373D' : 'transparent',
                    fontFamily: THEME.typography.display,
                    fontSize: 13.5,
                    color: f.hasError ? '#F87171' : f.active ? '#FFFFFF' : '#CCCCCC',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {f.icon === 'json' ? (
                      <FileJson size={14} color="#F59E0B" />
                    ) : f.icon === 'md' ? (
                      <FileText size={14} color="#60A5FA" />
                    ) : (
                      <FileCode2 size={14} color="#FACC15" />
                    )}
                    <span>{f.name}</span>
                  </span>
                  {f.hasError && (
                    <span style={{ fontFamily: THEME.typography.mono, fontSize: 11, fontWeight: 700, color: '#F87171' }}>
                      {errorCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Editor + Bottom Integrated Terminal */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Editor Tabs */}
          <div
            style={{
              height: 36,
              backgroundColor: '#181818',
              borderBottom: '1px solid #2B2B2B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingRight: 16,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', height: '100%' }}>
              <div
                style={{
                  backgroundColor: '#1F1F1F',
                  borderTop: '2px solid #0078D4',
                  borderRight: '1px solid #2B2B2B',
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: THEME.typography.display,
                  fontSize: 13.5,
                  color: errorCount > 0 ? '#F87171' : '#FFFFFF',
                }}
              >
                <FileCode2 size={14} color="#FACC15" />
                <span>{activeFile}</span>
                {modified && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#CCCCCC',
                      marginLeft: 2,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: THEME.typography.display,
                  fontSize: 13.5,
                  color: '#8E8E8E',
                  borderRight: '1px solid #2B2B2B',
                }}
              >
                <FileCode2 size={14} color="#8E8E8E" />
                <span>todo.test.js</span>
              </div>
            </div>

            {showPasteToast && (
              <div
                style={{
                  fontFamily: THEME.typography.mono,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#E5E7EB',
                  backgroundColor: '#2B2F3A',
                  border: '1px solid #4B5563',
                  padding: '3px 10px',
                  borderRadius: 5,
                }}
              >
                Ctrl + V • Pasted from clipboard
              </div>
            )}
          </div>

          {/* Code Buffer */}
          <div
            style={{
              flex: isLandscape ? 1.05 : 1,
              backgroundColor: '#1F1F1F',
              padding: isLandscape ? '16px 22px' : '20px 18px',
              fontFamily: THEME.typography.mono,
              fontSize: isLandscape ? 15.5 : 17.5,
              lineHeight: 1.68,
              color: '#D4D4D4',
              overflow: 'hidden',
            }}
          >
            {codeLines.map((line) => (
              <div
                key={line.num}
                style={{
                  display: 'flex',
                  gap: 20,
                  padding: '1px 8px',
                  borderRadius: 4,
                  backgroundColor:
                    line.highlight === 'error'
                      ? 'rgba(239, 68, 68, 0.14)'
                      : line.highlight === 'pasted'
                        ? 'rgba(59, 130, 246, 0.12)'
                        : line.highlight === 'added'
                          ? 'rgba(16, 185, 129, 0.14)'
                          : 'transparent',
                }}
              >
                <span style={{ width: 28, textAlign: 'right', color: '#6E7681', userSelect: 'none', flexShrink: 0 }}>
                  {line.num}
                </span>
                <span style={{ whiteSpace: 'pre' }}>{line.content}</span>
              </div>
            ))}
          </div>

          {/* Integrated Terminal Panel */}
          <div
            style={{
              flex: isLandscape ? 0.95 : 1.08,
              backgroundColor: '#181818',
              borderTop: '1px solid #2B2B2B',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Panel Header Tabs */}
            <div
              style={{
                height: 34,
                padding: '0 18px',
                borderBottom: '1px solid #252525',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: THEME.typography.display,
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ color: errorCount > 0 ? '#F87171' : '#8E8E8E' }}>
                  PROBLEMS {errorCount > 0 ? `(${errorCount})` : ''}
                </span>
                <span style={{ color: '#8E8E8E' }}>OUTPUT</span>
                <span
                  style={{
                    color: '#FFFFFF',
                    borderBottom: '2px solid #0078D4',
                    padding: '8px 0',
                  }}
                >
                  TERMINAL
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9D9D9D', fontFamily: THEME.typography.mono }}>
                <TerminalIcon size={13} />
                <span>pwsh</span>
              </div>
            </div>

            {/* Terminal Body */}
            <div
              style={{
                flex: 1,
                padding: isLandscape ? '14px 20px' : '18px 20px',
                fontFamily: THEME.typography.mono,
                fontSize: isLandscape ? 14.5 : 16.5,
                lineHeight: 1.62,
                color: '#CCCCCC',
              }}
            >
              <div>
                <span style={{ color: '#60A5FA' }}>PS C:\tmp\interview\gemini-test-project&gt; </span>
                <span style={{ color: '#F3F4F6' }}>{terminalCommand}</span>
              </div>
              {terminalOutput && <div style={{ marginTop: 10 }}>{terminalOutput}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Authentic VS Code Bottom Status Bar */}
      <div
        style={{
          height: 24,
          backgroundColor: errorCount > 0 ? '#6A1B1A' : '#007ACC',
          color: '#FFFFFF',
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: THEME.typography.display,
          fontSize: 11.5,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <GitBranch size={12} />
            main
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={12} />
            {errorCount}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={12} />0
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>Ln 61, Col 1</span>
          <span>UTF-8</span>
          <span>JavaScript</span>
        </div>
      </div>
    </div>
  );
};
