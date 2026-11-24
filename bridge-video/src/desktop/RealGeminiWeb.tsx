import React from 'react';
import { Img, staticFile, useVideoConfig } from 'remotion';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  Search,
  PanelLeft,
  SquarePen,
  LayoutGrid,
  Image as ImageIcon,
  Clock,
  GraduationCap,
  MoreHorizontal,
  Plus,
  BookOpen,
  Filter,
  Settings,
  Download,
  ChevronDown,
  Mic,
  ArrowUp,
  Minus,
  Square,
  X,
  Star,
  Check,
  Sparkles,
} from 'lucide-react';
import { THEME } from '../theme';

const GEMINI_HOST = ['gemini', 'google', 'com'].join('.');

export type GeminiModelName = 'Neon' | 'Argon' | 'Hydrogen';

interface RealGeminiWebProps {
  path?: string;
  activeSidebarItem?: 'new' | 'chat' | 'connectors';
  mcpConnected?: boolean;
  mcpToolCount?: number;
  activeModel?: GeminiModelName;
  children: React.ReactNode;
}

export const RealGeminiWeb: React.FC<RealGeminiWebProps> = ({
  path = '/app',
  activeSidebarItem = 'new',
  mcpConnected = false,
  mcpToolCount = 24,
  children,
}) => {
  const { width, height } = useVideoConfig();
  const isLandscape = width > height;

  const navItems = [
    { id: 'new', label: 'New chat', icon: SquarePen },
    { id: 'library', label: 'Library', icon: LayoutGrid },
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'scheduled', label: 'Scheduled', icon: Clock },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  const notebooks = [
    'Bridge MCP Architecture',
    'Node.js Test Runner Notes',
    'Cloudflare Tunnel Config',
  ];

  const recentChats = [
    'Fix priority sorting in todo-logic.js',
    'Bridge Project Reel Redesign',
    'Debug Node test module error',
    'Cloudflare Anycast MCP Setup',
    'Sandboxed File Tools Audit',
  ];

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#0E0F12',
        borderRadius: 10,
        border: '1px solid #2A2C32',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.78)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Real Google Chrome Tab Bar (Dark Mode) */}
      <div
        style={{
          height: isLandscape ? 36 : 40,
          backgroundColor: '#1E1F22',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingLeft: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: '100%' }}>
          <div
            style={{
              height: isLandscape ? 30 : 33,
              minWidth: isLandscape ? 210 : 195,
              backgroundColor: '#2E3035',
              borderTopLeftRadius: 9,
              borderTopRightRadius: 9,
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              color: '#E8EAED',
              fontFamily: THEME.typography.display,
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Img
                src={staticFile('assets/gemini-icon.svg')}
                style={{ width: 15, height: 15, borderRadius: 3 }}
              />
              <span>Gemini</span>
            </div>
            <X size={12} color="#9AA0A6" />
          </div>

          <div
            style={{
              height: isLandscape ? 29 : 31,
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#9AA0A6',
              fontFamily: THEME.typography.display,
              fontSize: 12.5,
            }}
          >
            <Img
              src={staticFile('assets/github-icon.svg')}
              style={{ width: 14, height: 14, opacity: 0.75 }}
            />
            <span>Manimaran-tech/bridge</span>
          </div>

          <div
            style={{
              height: 29,
              width: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9AA0A6',
            }}
          >
            <Plus size={14} />
          </div>
        </div>

        {/* Real Windows 11 Caption Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', color: '#9AA0A6' }}>
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

      {/* Real Chrome Toolbar & Omnibox */}
      <div
        style={{
          height: isLandscape ? 36 : 40,
          backgroundColor: '#2E3035',
          borderBottom: '1px solid #222428',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, color: '#BDC1C6' }}>
          <ArrowLeft size={14} />
          <ArrowRight size={14} color="#767A80" />
          <RotateCw size={13} />
        </div>

        <div
          style={{
            flex: 1,
            height: 26,
            backgroundColor: '#1E1F22',
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            fontFamily: THEME.typography.display,
            fontSize: 12.5,
            color: '#E8EAED',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={11} color="#9AA0A6" />
            <span>
              {GEMINI_HOST}
              <span style={{ color: '#9AA0A6' }}>{path}</span>
            </span>
          </div>
          <Star size={12} color="#9AA0A6" />
        </div>

        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: '#2A2D34',
            border: '1px solid #3E424C',
            color: '#E3E3E3',
            fontFamily: THEME.typography.display,
            fontSize: 11.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          M
        </div>
      </div>

      {/* Authentic New Gemini Web Interface */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          position: 'relative',
          background:
            'radial-gradient(ellipse at 44% 40%, #11192A 0%, #0E0F12 52%, #0B0C0E 100%)',
        }}
      >
        {/* Authentic Gemini Left Sidebar (#18191C) — Full in Landscape */}
        {isLandscape && (
          <div
            style={{
              width: 256,
              backgroundColor: '#18191C',
              borderRight: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '14px 10px 12px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
              {/* Sidebar Brand Row: Sparkle + Gemini | Search + PanelLeft */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Img
                    src={staticFile('assets/gemini-icon.svg')}
                    style={{ width: 20, height: 20 }}
                  />
                  <span
                    style={{
                      fontFamily: THEME.typography.display,
                      fontSize: 17.5,
                      fontWeight: 500,
                      color: '#F1F3F4',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Gemini
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#9AA0A6' }}>
                  <Search size={15} />
                  <PanelLeft size={15} />
                </div>
              </div>

              {/* Primary Nav Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === 'new' && activeSidebarItem === 'new';
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 11,
                        padding: '8px 11px',
                        borderRadius: 10,
                        backgroundColor: isActive ? '#26282D' : 'transparent',
                        color: isActive ? '#FFFFFF' : '#C4C7C5',
                        fontFamily: THEME.typography.display,
                        fontSize: 13.5,
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      <Icon size={15} color={isActive ? '#E8EAED' : '#9AA0A6'} />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Notebooks Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
                <div
                  style={{
                    fontFamily: THEME.typography.display,
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: '#80868B',
                    padding: '2px 11px 4px',
                  }}
                >
                  Notebooks
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 11px',
                    color: '#E3E3E3',
                    fontFamily: THEME.typography.display,
                    fontSize: 13,
                  }}
                >
                  <Plus size={14} color="#C4C7C5" />
                  <span>New notebook</span>
                </div>
                {notebooks.map((nb) => (
                  <div
                    key={nb}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 11px',
                      color: '#C4C7C5',
                      fontFamily: THEME.typography.display,
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <BookOpen size={13.5} color="#9AA0A6" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{nb}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 11px',
                    color: '#9AA0A6',
                    fontFamily: THEME.typography.display,
                    fontSize: 12.5,
                  }}
                >
                  <MoreHorizontal size={14} />
                  <span>All notebooks</span>
                </div>
              </div>

              {/* All Chats Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '2px 11px 4px',
                    color: '#80868B',
                    fontFamily: THEME.typography.display,
                    fontSize: 11.5,
                    fontWeight: 500,
                  }}
                >
                  <span>All</span>
                  <Filter size={12} />
                </div>
                {recentChats.map((title, i) => {
                  const isCurrent = activeSidebarItem === 'chat' && i === 0;
                  return (
                    <div
                      key={title}
                      style={{
                        padding: '6.5px 11px',
                        borderRadius: 9,
                        backgroundColor: isCurrent ? '#26282D' : 'transparent',
                        color: isCurrent ? '#FFFFFF' : '#C4C7C5',
                        fontFamily: THEME.typography.display,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {title}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Profile + Settings Footer (matches Manimaran / Pro + Gear) */}
            <div
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '10px 8px 2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: '#2E3138',
                    border: '1px solid #444852',
                    color: '#FFFFFF',
                    fontFamily: THEME.typography.display,
                    fontSize: 12.5,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  M
                </div>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontFamily: THEME.typography.display, fontSize: 13, fontWeight: 600, color: '#F1F3F4' }}>
                    Manimaran
                  </div>
                  <div style={{ fontFamily: THEME.typography.display, fontSize: 11.5, color: '#9AA0A6' }}>
                    Pro
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: activeSidebarItem === 'connectors' ? '#2A2E39' : 'transparent',
                  border: activeSidebarItem === 'connectors' ? '1px solid #4B5563' : '1px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: activeSidebarItem === 'connectors' ? '#FFFFFF' : '#9AA0A6',
                }}
              >
                <Settings size={16} />
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Column */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 0,
            position: 'relative',
          }}
        >
          {/* Minimalist Real Gemini Top Bar */}
          <div
            style={{
              height: isLandscape ? 54 : 58,
              padding: isLandscape ? '0 22px' : '0 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            {/* Mobile/Reel Brand Header (since sidebar collapses in 9:16) */}
            {!isLandscape ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PanelLeft size={19} color="#9AA0A6" />
                <Img src={staticFile('assets/gemini-icon.svg')} style={{ width: 20, height: 20 }} />
                <span style={{ fontFamily: THEME.typography.display, fontSize: 19, fontWeight: 500, color: '#F1F3F4' }}>
                  Gemini
                </span>
              </div>
            ) : (
              <div />
            )}

            {/* Top-Right Controls: Bridge MCP pill (when connected) + Get app + Temp chat icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {mcpConnected && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    backgroundColor: '#191B20',
                    border: '1px solid #2E323B',
                    borderRadius: 999,
                    padding: '5px 12px',
                    fontFamily: THEME.typography.display,
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: '#E3E3E3',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#34A853' }} />
                  <span>@Bridge ({mcpToolCount} tools)</span>
                </div>
              )}

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  backgroundColor: '#1B1C20',
                  border: '1px solid #2B2D33',
                  borderRadius: 999,
                  padding: '6px 13px',
                  fontFamily: THEME.typography.display,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#E3E3E3',
                }}
              >
                <Download size={13.5} color="#C4C7C5" />
                <span>Get app</span>
              </div>

              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9AA0A6',
                }}
              >
                <SquarePen size={15} />
              </div>
            </div>
          </div>

          {/* Inner Body */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

interface GeminiPromptBarProps {
  placeholder?: string;
  value?: React.ReactNode;
  model?: GeminiModelName;
  showModelMenu?: boolean;
  showModeToggle?: boolean;
  activeMode?: 'Chat' | 'Task';
  isDragging?: boolean;
  canSend?: boolean;
  attachment?: React.ReactNode;
}

/** Authentic New Gemini Prompt Input Pill + Neon/Argon/Hydrogen Selector + Chat/Task Toggle */
export const GeminiPromptBar: React.FC<GeminiPromptBarProps> = ({
  placeholder = 'Type @ for connectors, skills and more',
  value,
  model = 'Neon',
  showModelMenu = false,
  showModeToggle = false,
  activeMode = 'Chat',
  isDragging = false,
  canSend = false,
  attachment,
}) => {
  const { width, height } = useVideoConfig();
  const isLandscape = width > height;

  const models: { name: GeminiModelName; desc: string }[] = [
    { name: 'Neon', desc: 'Fastest everyday reasoning & MCP tools' },
    { name: 'Argon', desc: 'Deep multi-file coding & debugging' },
    { name: 'Hydrogen', desc: 'Ultra-lightweight instant responses' },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {/* Main Input Pill (#1B1C20) */}
      <div
        style={{
          width: '100%',
          backgroundColor: '#1B1C20',
          borderRadius: 28,
          border: isDragging ? '2px dashed #60A5FA' : '1px solid #2C2E35',
          padding: isLandscape ? '13px 18px' : '15px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.35)',
          position: 'relative',
        }}
      >
        {attachment}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Left: + Icon and Input Text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, flex: 1, minWidth: 0 }}>
            <Plus size={19} color="#C4C7C5" style={{ flexShrink: 0 }} />
            <div
              style={{
                fontFamily: THEME.typography.display,
                fontSize: isLandscape ? 16 : 18,
                color: value ? '#F1F3F4' : '#8E918F',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6,
                minWidth: 0,
              }}
            >
              {value ?? (isDragging ? 'Drop files here to attach' : placeholder)}
            </div>
          </div>

          {/* Right: Model Selector (Neon / Argon / Hydrogen) + Mic / Send */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 999,
                backgroundColor: showModelMenu ? '#2A2D35' : 'transparent',
                color: '#E3E3E3',
                fontFamily: THEME.typography.display,
                fontSize: isLandscape ? 14 : 15,
                fontWeight: 500,
              }}
            >
              <span>{model}</span>
              <ChevronDown size={14} color="#9AA0A6" />
            </div>

            {canSend ? (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: '#E3E3E3',
                  color: '#0E0F12',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowUp size={17} strokeWidth={2.5} />
              </div>
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#C4C7C5',
                }}
              >
                <Mic size={18} />
              </div>
            )}
          </div>
        </div>

        {/* Optional Open Model Dropdown (Neon / Argon / Hydrogen) */}
        {showModelMenu && (
          <div
            style={{
              position: 'absolute',
              right: 48,
              bottom: 'calc(100% + 10px)',
              width: 300,
              backgroundColor: '#1E2025',
              border: '1px solid #32353E',
              borderRadius: 16,
              padding: 6,
              boxShadow: '0 18px 44px rgba(0, 0, 0, 0.72)',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              zIndex: 860,
            }}
          >
            {models.map((m) => {
              const selected = m.name === model;
              return (
                <div
                  key={m.name}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 11,
                    backgroundColor: selected ? '#2A2D36' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: THEME.typography.display, fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>
                      <Sparkles size={13} color={selected ? '#8AB4F8' : '#9AA0A6'} />
                      <span>{m.name}</span>
                    </div>
                    <div style={{ fontFamily: THEME.typography.display, fontSize: 11.5, color: '#9AA0A6', marginTop: 2 }}>
                      {m.desc}
                    </div>
                  </div>
                  {selected && <Check size={15} color="#8AB4F8" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Authentic Chat | Task Segmented Switch */}
      {showModeToggle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(['Chat', 'Task'] as const).map((tab) => {
            const active = tab === activeMode;
            return (
              <div
                key={tab}
                style={{
                  padding: '6px 16px',
                  borderRadius: 999,
                  backgroundColor: active ? '#25272D' : 'transparent',
                  border: active ? '1px solid #32353E' : '1px solid transparent',
                  color: active ? '#F1F3F4' : '#8E918F',
                  fontFamily: THEME.typography.display,
                  fontSize: 13.5,
                  fontWeight: 500,
                }}
              >
                {tab}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
