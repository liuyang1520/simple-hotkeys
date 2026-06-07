import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCommandDeduper,
  getSafariDefaultCommand,
  isSafariShortcutBridgeDetail,
  isSafariShortcutMessage,
  isSafariShortcutResponse,
} from '../utils/commands';

function shortcutEvent(
  code: string,
  overrides: Partial<Parameters<typeof getSafariDefaultCommand>[0]> = {},
) {
  return {
    altKey: false,
    code,
    ctrlKey: false,
    isComposing: false,
    metaKey: true,
    repeat: false,
    shiftKey: true,
    ...overrides,
  };
}

test('matches Safari default shortcuts by physical key', () => {
  assert.equal(
    getSafariDefaultCommand(shortcutEvent('KeyK')),
    'search-in-new-active-tab',
  );
  assert.equal(
    getSafariDefaultCommand(shortcutEvent('KeyP')),
    'pin-unpin-tab',
  );
  assert.equal(
    getSafariDefaultCommand(shortcutEvent('KeyE')),
    'navigate-to-last-active-tab',
  );
  assert.equal(
    getSafariDefaultCommand(shortcutEvent('Period')),
    'extract-tab-to-new-window',
  );
});

test('ignores similar key events that are not exact default shortcuts', () => {
  assert.equal(
    getSafariDefaultCommand(shortcutEvent('KeyK', { metaKey: false })),
    undefined,
  );
  assert.equal(
    getSafariDefaultCommand(shortcutEvent('KeyK', { altKey: true })),
    undefined,
  );
  assert.equal(
    getSafariDefaultCommand(shortcutEvent('KeyK', { repeat: true })),
    undefined,
  );
  assert.equal(getSafariDefaultCommand(shortcutEvent('KeyL')), undefined);
});

test('validates Safari shortcut messages', () => {
  assert.equal(
    isSafariShortcutMessage({
      type: 'run-safari-shortcut',
      deliveryId: 'delivery-1',
      command: 'extract-tab-to-new-window',
    }),
    true,
  );
  assert.equal(
    isSafariShortcutMessage({
      type: 'run-safari-shortcut',
      deliveryId: 'delivery-1',
      command: 'unknown-command',
    }),
    false,
  );
  assert.equal(
    isSafariShortcutMessage({
      type: 'run-safari-shortcut',
      command: 'extract-tab-to-new-window',
    }),
    false,
  );
});

test('validates Safari shortcut acknowledgements by delivery ID', () => {
  assert.equal(
    isSafariShortcutResponse(
      {
        type: 'safari-shortcut-response',
        deliveryId: 'delivery-1',
        handled: true,
      },
      'delivery-1',
    ),
    true,
  );
  assert.equal(
    isSafariShortcutResponse(
      {
        type: 'safari-shortcut-response',
        deliveryId: 'delivery-2',
        handled: true,
      },
      'delivery-1',
    ),
    false,
  );
});

test('validates plain Safari page-world bridge details', () => {
  assert.equal(
    isSafariShortcutBridgeDetail({
      command: 'navigate-to-last-active-tab',
    }),
    true,
  );
  assert.equal(
    isSafariShortcutBridgeDetail({
      command: 'unknown-command',
    }),
    false,
  );
});

test('deduplicates the same command delivered by both Safari sources', () => {
  let timestamp = 1_000;
  const shouldHandle = createCommandDeduper(250, () => timestamp);

  assert.equal(
    shouldHandle('extract-tab-to-new-window', 'content-script'),
    true,
  );

  timestamp += 10;
  assert.equal(
    shouldHandle('extract-tab-to-new-window', 'commands-api'),
    false,
  );

  timestamp += 300;
  assert.equal(
    shouldHandle('extract-tab-to-new-window', 'commands-api'),
    true,
  );
});

test('allows fast repeated commands from the same source', () => {
  let timestamp = 1_000;
  const shouldHandle = createCommandDeduper(250, () => timestamp);

  assert.equal(
    shouldHandle('navigate-to-last-active-tab', 'commands-api'),
    true,
  );

  timestamp += 10;
  assert.equal(
    shouldHandle('navigate-to-last-active-tab', 'commands-api'),
    true,
  );
});

test('allows a fast second press after suppressing a duplicate delivery', () => {
  let timestamp = 1_000;
  const shouldHandle = createCommandDeduper(250, () => timestamp);

  assert.equal(
    shouldHandle('navigate-to-last-active-tab', 'content-script'),
    true,
  );

  timestamp += 10;
  assert.equal(
    shouldHandle('navigate-to-last-active-tab', 'commands-api'),
    false,
  );

  timestamp += 10;
  assert.equal(
    shouldHandle('navigate-to-last-active-tab', 'content-script'),
    true,
  );

  timestamp += 10;
  assert.equal(
    shouldHandle('navigate-to-last-active-tab', 'commands-api'),
    false,
  );
});
