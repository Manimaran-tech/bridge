'use strict';

// Run with Node >=18: node --test secure-folder-mcp/test_attach_input.js
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ATTACH_APPROVAL_GUARD_MS,
  isApprovalGuardActive,
  evaluateAttachApprovalKey,
  sanitizePasteSegment,
  applyAttachPaste,
  shouldEchoSentLine,
  shouldRingApprovalBell
} = require('./attach-input');

test('approval guard requires a 750 ms pause with no keypresses before accepting Y/N/Esc', () => {
  const t0 = 10000;
  assert.equal(ATTACH_APPROVAL_GUARD_MS, 750);
  assert.equal(isApprovalGuardActive(t0, t0 + 500), true);
  assert.equal(isApprovalGuardActive(t0, t0 + 750), false);

  // Typing at 400 ms ignores the key and resets the 750 ms timer
  const r1 = evaluateAttachApprovalKey({ lastActivityAt: t0, now: t0 + 400, key: { name: 'y' }, keyName: 'y' });
  assert.equal(r1.action, 'ignore');
  assert.equal(r1.guardActive, true);
  assert.equal(r1.nextLastActivityAt, t0 + 400);

  // Even at t0 + 800 ms (past the original 750 ms window), only 400 ms elapsed since last key -> still guarded
  const r2 = evaluateAttachApprovalKey({ lastActivityAt: r1.nextLastActivityAt, now: t0 + 800, key: { name: 'y' }, keyName: 'y' });
  assert.equal(r2.action, 'ignore');
  assert.equal(r2.guardActive, true);
  assert.equal(r2.nextLastActivityAt, t0 + 800);

  // After 750 ms of silence (t0 + 1550 ms), Y approves, N denies, Esc denies, other keys ignored
  const rApprove = evaluateAttachApprovalKey({ lastActivityAt: r2.nextLastActivityAt, now: t0 + 1550, key: { name: 'y' }, keyName: 'y' });
  assert.equal(rApprove.action, 'approve');
  assert.equal(rApprove.guardActive, false);

  const rDenyN = evaluateAttachApprovalKey({ lastActivityAt: r2.nextLastActivityAt, now: t0 + 1550, key: { name: 'n' }, keyName: 'n' });
  assert.equal(rDenyN.action, 'deny');

  const rDenyEsc = evaluateAttachApprovalKey({ lastActivityAt: r2.nextLastActivityAt, now: t0 + 1550, key: { name: 'escape' }, keyName: 'escape' });
  assert.equal(rDenyEsc.action, 'deny');

  const rOther = evaluateAttachApprovalKey({ lastActivityAt: r2.nextLastActivityAt, now: t0 + 1550, key: { name: 'a' }, keyName: 'a' });
  assert.equal(rOther.action, 'ignore');
  assert.equal(rOther.guardActive, true);
  assert.equal(rOther.nextLastActivityAt, t0 + 1550);
});

test('non-Y/N/Esc and Ctrl/Meta keys after expiry re-arm the approval guard', () => {
  const t0 = 20000;
  const t = t0 + 1000; // past 750 ms expiry

  // After expiry, key "h" -> ignore + guardActive true + nextLastActivityAt === now
  const rH = evaluateAttachApprovalKey({ lastActivityAt: t0, now: t, key: { name: 'h' }, keyName: 'h' });
  assert.equal(rH.action, 'ignore');
  assert.equal(rH.guardActive, true);
  assert.equal(rH.nextLastActivityAt, t);

  // Sequence: expiry, "h" at t, "y" at t+100 -> second result is ignore (guard re-armed)
  const rYEarly = evaluateAttachApprovalKey({ lastActivityAt: rH.nextLastActivityAt, now: t + 100, key: { name: 'y' }, keyName: 'y' });
  assert.equal(rYEarly.action, 'ignore');
  assert.equal(rYEarly.guardActive, true);
  assert.equal(rYEarly.nextLastActivityAt, t + 100);

  // Sequence: expiry, "h" at t, "y" at t+800 -> approve
  const rYLate = evaluateAttachApprovalKey({ lastActivityAt: rH.nextLastActivityAt, now: t + 800, key: { name: 'y' }, keyName: 'y' });
  assert.equal(rYLate.action, 'approve');
  assert.equal(rYLate.guardActive, false);

  // Ctrl+Y after expiry -> ignore and re-arm (not approve)
  const rCtrlY = evaluateAttachApprovalKey({ lastActivityAt: t0, now: t, key: { name: 'y', ctrl: true }, keyName: 'y' });
  assert.equal(rCtrlY.action, 'ignore');
  assert.equal(rCtrlY.guardActive, true);
  assert.equal(rCtrlY.nextLastActivityAt, t);
});

test('applyAttachPaste splits CRLF/CR/LF, preserves tabs, and strips other control characters', () => {
  // Single-line paste with tab and stray control chars inserted at cursor
  const p1 = applyAttachPaste('abCD', 2, '1\t2\x07\x1b3');
  assert.deepEqual(p1.linesToSend, []);
  assert.equal(p1.buf, 'ab1\t23CD');
  assert.equal(p1.cursor, 6);

  // Multi-line paste with mixed \r\n, \r, and \n
  const p2 = applyAttachPaste('pre', 3, '1\r\nsecond\tline\rthird\x00line\ntail');
  assert.deepEqual(p2.linesToSend, ['pre1', 'second\tline', 'thirdline']);
  assert.equal(p2.buf, 'tail');
  assert.equal(p2.cursor, 4);

  // Paste ending with a newline leaves buffer empty
  const p3 = applyAttachPaste('hi', 2, ' there\r\n');
  assert.deepEqual(p3.linesToSend, ['hi there']);
  assert.equal(p3.buf, '');
  assert.equal(p3.cursor, 0);

  // sanitizePasteSegment strips control chars except tab
  assert.equal(sanitizePasteSegment('a\tb\x00\x07\x1bc\x7f'), 'a\tbc');
});

test('shouldEchoSentLine skips empty buffer when there is no partial output line', () => {
  assert.equal(shouldEchoSentLine('', false), false);
  assert.equal(shouldEchoSentLine('', true), true);
  assert.equal(shouldEchoSentLine('hello', false), true);
  assert.equal(shouldEchoSentLine('hello', true), true);
});

test('shouldRingApprovalBell rings only in full-screen Overview views, silent on main dashboard', () => {
  assert.equal(shouldRingApprovalBell('attach'), true);
  assert.equal(shouldRingApprovalBell('review'), true);
  assert.equal(shouldRingApprovalBell('files'), true);
  assert.equal(shouldRingApprovalBell('terminals'), true);
  assert.equal(shouldRingApprovalBell('help'), true);
  assert.equal(shouldRingApprovalBell(null), false);
  assert.equal(shouldRingApprovalBell('menu'), false);
});
