import React from 'react';
import { THEME } from '../../theme';

interface CodeBlockProps {
  code: string | string[];
  filename?: string;
  highlightLine?: number;
  highlightColor?: string;
  fontSize?: number;
  maxLines?: number;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  filename,
  highlightLine,
  highlightColor = THEME.palette.errorRed,
  fontSize = 15,
  maxLines,
}) => {
  const lines = Array.isArray(code) ? code : code.split('\n');
  const displayLines = maxLines ? lines.slice(0, maxLines) : lines;

  // Simple syntax colorizer for keywords
  const colorizeLine = (line: string) => {
    // Comment
    if (line.trim().startsWith('//')) {
      return <span style={{ color: '#6A737D' }}>{line}</span>;
    }

    // Split words and match keywords
    const parts = line.split(/(\b(?:export|async|function|const|let|var|return|throw|new|if|import|from|await)\b)/g);

    return parts.map((part, i) => {
      if (/^(?:export|async|function|const|let|var|return|throw|new|if|import|from|await)$/.test(part)) {
        return (
          <span key={i} style={{ color: THEME.palette.primaryVolt, fontWeight: 700 }}>
            {part}
          </span>
        );
      }
      if (/^(?:db|users|jwt|console|process)$/.test(part)) {
        return (
          <span key={i} style={{ color: THEME.palette.secondaryCyan }}>
            {part}
          </span>
        );
      }
      if (/^('.*'|".*"|`.*`)$/.test(part)) {
        return (
          <span key={i} style={{ color: '#F1FA8C' }}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      style={{
        backgroundColor: '#0D1017',
        borderRadius: 14,
        padding: '16px 20px',
        fontFamily: THEME.typography.mono,
        fontSize,
        lineHeight: 1.6,
        color: '#E6EDF3',
        overflow: 'hidden',
        border: '1px solid #212631',
      }}
    >
      {filename && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: '1px solid #1E232F',
            color: THEME.palette.textMuted,
            fontSize: 12,
          }}
        >
          <span>{filename}</span>
          <span style={{ color: THEME.palette.primaryVolt }}>TypeScript</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {displayLines.map((line, idx) => {
          const lineNum = idx + 1;
          const isHighlighted = highlightLine === lineNum;

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isHighlighted ? `${highlightColor}25` : 'transparent',
                borderRadius: 4,
                padding: '1px 6px',
                margin: '1px 0',
                borderLeft: isHighlighted ? `3px solid ${highlightColor}` : '3px solid transparent',
              }}
            >
              <span
                style={{
                  width: 32,
                  color: isHighlighted ? highlightColor : '#484F58',
                  userSelect: 'none',
                  fontSize: fontSize - 2,
                  textAlign: 'right',
                  marginRight: 16,
                }}
              >
                {lineNum}
              </span>
              <span style={{ whiteSpace: 'pre', flex: 1 }}>{colorizeLine(line)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
