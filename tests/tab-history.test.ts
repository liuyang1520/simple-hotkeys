import assert from 'node:assert/strict';
import test from 'node:test';

import {
  pruneAndFindPreviousTab,
  recordCreatedActiveTab,
  recordTabActivation,
  removeTabFromHistory,
  type TabHistory,
} from '../utils/tab-history';

test('newly opened active tab keeps the tab viewed before it as previous', () => {
  const history: TabHistory = { 7: [101, 100] };

  recordCreatedActiveTab(history, {
    active: true,
    id: 102,
    windowId: 7,
  });

  assert.deepEqual(history, { 7: [102, 101, 100] });
});

test('newly opened active tab falls back to its opener when history is empty', () => {
  const history: TabHistory = {};

  recordCreatedActiveTab(history, {
    active: true,
    id: 102,
    openerTabId: 101,
    windowId: 7,
  });

  assert.deepEqual(history, { 7: [102, 101] });
});

test('activation and creation events can arrive in either order', () => {
  const history: TabHistory = { 7: [101, 100] };

  recordTabActivation(history, 7, 102);
  recordCreatedActiveTab(history, {
    active: true,
    id: 102,
    openerTabId: 101,
    windowId: 7,
  });

  assert.deepEqual(history, { 7: [102, 101, 100] });
});

test('closed previous tab is removed from history', () => {
  const history: TabHistory = { 7: [103, 102, 101] };

  removeTabFromHistory(history, 7, 102);

  assert.deepEqual(history, { 7: [103, 101] });
});

test('previous navigation skips stale and moved tabs', async () => {
  const history: TabHistory = { 7: [104, 103, 102, 101] };
  const liveTabs = new Map([
    [104, 7],
    [102, 8],
    [101, 7],
  ]);

  const previousTabId = await pruneAndFindPreviousTab(
    history,
    7,
    104,
    async (tabId, windowId) => liveTabs.get(tabId) === windowId,
  );

  assert.equal(previousTabId, 101);
  assert.deepEqual(history, { 7: [104, 101] });
});
