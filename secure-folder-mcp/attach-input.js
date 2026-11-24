'use strict';

// Pure helper logic for the Bridge Overview Attach view (line editing, paste,
// accidental-approval pause guard, and bell gating). Zero runtime dependencies.

const ATTACH_APPROVAL_GUARD_MS = 750;
const FULLSCREEN_OVERVIEW_VIEWS = new Set(['attach', 'review', 'files', 'terminals', 'help']);

/**
 * Returns true while the accidental-approval guard is still within its quiet period.
 */
function isApprovalGuardActive(lastActivityAt, now = Date.now(), guardMs = ATTACH_APPROVAL_GUARD_MS) {
  return lastActivityAt > 0 && (now - lastActivityAt) < guardMs;
}

/**
 * Decides how to handle a keypress while an approval is pending in Attach view.
 * - While the guard is active, every key is ignored and resets the quiet-period timer.
 * - Once `guardMs` elapses with no keypress, only Y (approve) or N/Esc (deny) are accepted.
 */
function evaluateAttachApprovalKey({
  lastActivityAt,
  now = Date.now(),
  guardMs = ATTACH_APPROVAL_GUARD_MS,
  key = {},
  keyName = ''
}) {
  if (isApprovalGuardActive(lastActivityAt, now, guardMs)) {
    return { action: 'ignore', nextLastActivityAt: now, guardActive: true };
  }
  const normalized = String(keyName || key.name || '').toLowerCase();
  if (!key.ctrl && !key.meta) {
    if (normalized === 'y') {
      return { action: 'approve', nextLastActivityAt: lastActivityAt, guardActive: false };
    }
    if (normalized === 'n' || key.name === 'escape' || normalized === 'escape') {
      return { action: 'deny', nextLastActivityAt: lastActivityAt, guardActive: false };
    }
  }
  return { action: 'ignore', nextLastActivityAt: now, guardActive: true };
}

/**
 * Strips control characters from a pasted line segment while preserving literal tabs (\t).
 */
function sanitizePasteSegment(segment) {
  return String(segment).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

/**
 * Applies a multi-character pasted string to the current input buffer and cursor.
 * Splits on \r\n|\r|\n; inserts the first segment at the cursor, emits each completed
 * line in `linesToSend`, and leaves any trailing text after the last newline in `buf`.
 */
function applyAttachPaste(buf, cursor, pastedStr) {
  const curBuf = typeof buf === 'string' ? buf : '';
  const curPos = Math.max(0, Math.min(curBuf.length, typeof cursor === 'number' ? cursor : curBuf.length));
  const raw = String(pastedStr || '');
  const parts = raw.split(/\r\n|\r|\n/);

  if (parts.length === 1) {
    const clean = sanitizePasteSegment(parts[0]);
    return {
      linesToSend: [],
      buf: curBuf.slice(0, curPos) + clean + curBuf.slice(curPos),
      cursor: curPos + clean.length
    };
  }

  const linesToSend = [];
  const firstClean = sanitizePasteSegment(parts[0]);
  const firstLine = curBuf.slice(0, curPos) + firstClean + curBuf.slice(curPos);
  linesToSend.push(firstLine);

  for (let i = 1; i < parts.length - 1; i++) {
    linesToSend.push(sanitizePasteSegment(parts[i]));
  }

  const tail = sanitizePasteSegment(parts[parts.length - 1]);
  return {
    linesToSend,
    buf: tail,
    cursor: tail.length
  };
}

/**
 * Returns true if a submitted line should be echoed dimmed into the tab output.
 * Empty Enter presses are not echoed unless they complete a partial output line.
 */
function shouldEchoSentLine(line, hasPartialLine) {
  return Boolean((typeof line === 'string' && line.length > 0) || hasPartialLine);
}

/**
 * Returns true when the terminal bell should ring for an incoming approval request.
 * Only rings in full-screen Overview views; the main dashboard stays silent.
 */
function shouldRingApprovalBell(overviewView) {
  return FULLSCREEN_OVERVIEW_VIEWS.has(overviewView);
}

module.exports = {
  ATTACH_APPROVAL_GUARD_MS,
  isApprovalGuardActive,
  evaluateAttachApprovalKey,
  sanitizePasteSegment,
  applyAttachPaste,
  shouldEchoSentLine,
  shouldRingApprovalBell
};
