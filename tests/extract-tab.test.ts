import assert from 'node:assert/strict';
import test from 'node:test';

import { extractTabToNewWindow } from '../utils/extract-tab';

test('extracts the current tab when the browser honors tabId', async () => {
  const calls: string[] = [];

  const extracted = await extractTabToNewWindow(
    { id: 42, url: 'https://example.com', windowId: 7 },
    {
      createWindowWithTab: async (tabId) => {
        calls.push(`create-window-with-${tabId}`);
        return { id: 9 };
      },
      getTab: async (tabId) => {
        calls.push(`get-${tabId}`);
        return { windowId: 9 };
      },
      removeWindow: async () => assert.fail('should not remove the new window'),
    },
  );

  assert.equal(extracted, true);
  assert.deepEqual(calls, ['create-window-with-42', 'get-42']);
});

test('reopens and closes the current tab when Safari cannot move it', async () => {
  const calls: string[] = [];

  const extracted = await extractTabToNewWindow(
    { id: 42, url: 'https://example.com', windowId: 7 },
    {
      createWindowWithTab: async () => {
        throw new Error('tabId is unsupported');
      },
      createWindowWithUrl: async (url) => {
        calls.push(`create-window-with-${url}`);
        return { id: 9 };
      },
      getTab: async () => ({ windowId: 7 }),
      removeTab: async (tabId) => {
        calls.push(`remove-${tabId}`);
      },
      removeWindow: async () => assert.fail('Safari should not clean up a window'),
    },
  );

  assert.equal(extracted, true);
  assert.deepEqual(calls, [
    'create-window-with-https://example.com',
    'remove-42',
  ]);
});

test('removes an empty Safari window before reopening the current tab', async () => {
  const calls: string[] = [];

  const extracted = await extractTabToNewWindow(
    { id: 42, url: 'https://example.com', windowId: 7 },
    {
      createWindowWithTab: async () => ({ id: 8 }),
      createWindowWithUrl: async () => {
        calls.push('reopen');
        return { id: 9 };
      },
      getTab: async () => ({ windowId: 7 }),
      removeTab: async () => {
        calls.push('remove-tab');
      },
      removeWindow: async (windowId) => {
        calls.push(`remove-window-${windowId}`);
      },
    },
  );

  assert.equal(extracted, true);
  assert.deepEqual(calls, ['remove-window-8', 'reopen', 'remove-tab']);
});

test('keeps the original Safari tab when it cannot open a new window', async () => {
  const calls: string[] = [];

  const extracted = await extractTabToNewWindow(
    { id: 42, url: 'https://example.com', windowId: 7 },
    {
      createWindowWithTab: async () =>
        Promise.reject(new Error('tabId is unsupported')),
      createWindowWithUrl: async () => undefined,
      getTab: async () => ({ windowId: 7 }),
      removeTab: async () => assert.fail('should not remove the original tab'),
      removeWindow: async () => assert.fail('should not remove a window'),
    },
  );

  assert.equal(extracted, false);
  assert.deepEqual(calls, []);
});
