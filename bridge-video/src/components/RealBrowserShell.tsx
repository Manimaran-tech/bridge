import React from 'react';
import { Img, staticFile } from 'remotion';
import { Lock, RotateCw, ArrowLeft, ArrowRight, Plug } from 'lucide-react';
import { THEME } from '../theme';

interface RealBrowserShellProps {
  activeTab?: 'gemini' | 'chatgpt';
  url?: string;
  mcpConnected?: boolean;
  children: React.ReactNode;
  borderColor?: string;
  glowColor?: string;
}

export const RealBrowserShell: React.FC<RealBrowserShellProps> = ({
  activeTab = 'gemini',
  url = 'gemini.google.com/app',
  mcpConnected = false,
  children,
  borderColor = '#2C303A',
  glowColor,
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#131417',
        borderRadius: 22,
        border: `1.5px solid ${borderColor}`,
        boxShadow: glowColor
          ? `0 24px 64px rgba(0, 0, 0, 0.8), 0 0 38px ${glowColor}`
          : '0 24px 64px rgba(0, 0, 0, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Browser Tab Strip */}
      <div
        style={{
          height: 46,
          backgroundColor: '#1B1D22',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid #2A2D35',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: '100%' }}>
          {/* macOS/Desktop Window Traffic Lights */}
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', height: '100%', marginRight: 10 }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#FF5F56' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#27C93F' }} />
          </div>

          {/* Gemini Tab */}
          <div
            style={{
              backgroundColor: activeTab === 'gemini' ? '#131417' : 'transparent',
              color: activeTab === 'gemini' ? '#F3F4F6' : '#8E929B',
              padding: '8px 16px',
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
              fontFamily: THEME.typography.display,
              fontSize: 13.5,
              fontWeight: activeTab === 'gemini' ? 600 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: activeTab === 'gemini' ? '1px solid #2A2D35' : '1px solid transparent',
              borderBottom: 'none',
            }}
          >
            <Img
              src={staticFile('assets/gemini-icon.svg')}
              style={{ width: 18, height: 18, borderRadius: 4 }}
            />
            <span>Gemini</span>
          </div>

          {/* ChatGPT Background Tab */}
          <div
            style={{
              backgroundColor: activeTab === 'chatgpt' ? '#131417' : 'transparent',
              color: activeTab === 'chatgpt' ? '#F3F4F6' : '#8E929B',
              padding: '8px 16px',
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
              fontFamily: THEME.typography.display,
              fontSize: 13.5,
              fontWeight: activeTab === 'chatgpt' ? 600 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Img
              src={staticFile('assets/chatgpt-icon.svg')}
              style={{ width: 18, height: 18, borderRadius: 4 }}
            />
            <span>ChatGPT</span>
          </div>
        </div>

        {/* Connected MCP Indicator Pill */}
        {mcpConnected && (
          <div
            style={{
              alignSelf: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              backgroundColor: 'rgba(210, 255, 0, 0.14)',
              border: '1px solid rgba(210, 255, 0, 0.45)',
              borderRadius: 999,
              padding: '3px 11px',
              fontFamily: THEME.typography.mono,
              fontSize: 11.5,
              fontWeight: 800,
              color: THEME.palette.primaryVolt,
            }}
          >
            <Plug size={12} strokeWidth={2.5} />
            <span>@Bridge Connected</span>
          </div>
        )}
      </div>

      {/* Browser Address Bar */}
      <div
        style={{
          height: 42,
          backgroundColor: '#131417',
          borderBottom: '1px solid #24262D',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280' }}>
          <ArrowLeft size={15} />
          <ArrowRight size={15} />
          <RotateCw size={14} />
        </div>
        <div
          style={{
            flex: 1,
            height: 28,
            backgroundColor: '#1E2026',
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            gap: 8,
            fontFamily: THEME.typography.mono,
            fontSize: 12.5,
            color: '#9CA3AF',
          }}
        >
          <Lock size={12} color="#10B981" />
          <span>{url}</span>
        </div>
      </div>

      {/* Browser Content */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
};
