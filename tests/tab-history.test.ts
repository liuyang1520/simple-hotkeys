import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findLastAccessedPreviousTab,
  pruneAndFindPreviousTab,
  recordCreatedTab,
  recordTabActivation,
  removeTabFromHistory,
  type TabHistory,
} from '../utils/tab-history';

test('newly opened active tab keeps the tab viewed before it as previous', () => {
  const history: TabHistory = { 7: [101, 100] };

  recordCreatedTab(history, {
    active: true,
    id: 102,
    windowId: 7,
  });

  assert.deepEqual(history, { 7: [102, 101, 100] });
});

test('newly opened active tab falls back to its opener when history is empty', () => {
  const history: TabHistory = {};

  recordCreatedTab(history, {
    active: true,
    id: 102,
    openerTabId: 101,
    windowId: 7,
  });

  assert.deepEqual(history, { 7: [102, 101] });
});

test('Safari newly opened active tab prefers its opener when history missed it', async () => {
  const history: TabHistory = { 7: [100] };

  recordCreatedTab(
    history,
    {
      active: true,
      id: 102,
      openerTabId: 101,
      windowId: 7,
    },
    true,
  );

  const previousTabId = await pruneAndFindPreviousTab(
    history,
    7,
    102,
    async () => true,
  );

  assert.equal(previousTabId, 101);
  assert.deepEqual(history, { 7: [102, 101, 100] });
});

test('other browsers keep recorded history ahead of the opener', () => {
  const history: TabHistory = { 7: [100] };

  recordCreatedTab(history, {
    active: true,
    id: 102,
    openerTabId: 101,
    windowId: 7,
  });

  assert.deepEqual(history, { 7: [102, 100] });
});

test('Safari preserves the opener when a foreground-created tab is reported inactive', () => {
  const history: TabHistory = { 7: [100] };

  recordCreatedTab(
    history,
    {
      active: false,
      id: 102,
      openerTabId: 101,
      windowId: 7,
    },
    true,
  );
  recordTabActivation(history, 7, 102);

  assert.deepEqual(history, { 7: [102, 101, 100] });
});

test('Safari preserves the active tab when an inactive created tab has no opener', () => {
  const history: TabHistory = { 7: [100] };

  recordCreatedTab(
    history,
    {
      active: false,
      id: 102,
      windowId: 7,
    },
    true,
    101,
  );
  recordTabActivation(history, 7, 102);

  assert.deepEqual(history, { 7: [102, 101, 100] });
});

test('Safari prefers the active tab over the opener for inactive created tabs', () => {
  const history: TabHistory = { 7: [100, 99] };

  recordCreatedTab(
    history,
    {
      active: false,
      id: 102,
      openerTabId: 99,
      windowId: 7,
    },
    true,
    101,
  );
  recordTabActivation(history, 7, 102);

  assert.deepEqual(history, { 7: [102, 101, 100, 99] });
});

test('Safari repairs the opener when activation arrives before inactive creation', () => {
  const history: TabHistory = { 7: [100] };

  recordTabActivation(history, 7, 102);
  recordCreatedTab(
    history,
    {
      active: false,
      id: 102,
      openerTabId: 101,
      windowId: 7,
    },
    true,
  );

  assert.deepEqual(history, { 7: [102, 101, 100] });
});

test('other browsers ignore inactive created tabs', () => {
  const history: TabHistory = { 7: [100] };

  recordCreatedTab(history, {
    active: false,
    id: 102,
    openerTabId: 101,
    windowId: 7,
  });

  assert.deepEqual(history, { 7: [100] });
});

test('activation and creation events can arrive in either order', () => {
  const history: TabHistory = { 7: [101, 100] };

  recordTabActivation(history, 7, 102);
  recordCreatedTab(history, {
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

test('finds the most recently accessed tab other than the active tab', () => {
  assert.equal(
    findLastAccessedPreviousTab(
      [
        { id: 100, lastAccessed: 10 },
        { id: 101, lastAccessed: 30 },
        { id: 102, lastAccessed: 40 },
        { id: 103 },
      ],
      102,
    ),
    101,
  );
});

test('preferred previous tab repairs stale history', async () => {
  const history: TabHistory = { 7: [102, 100] };

  const previousTabId = await pruneAndFindPreviousTab(
    history,
    7,
    102,
    async () => true,
    101,
  );

  assert.equal(previousTabId, 101);
  assert.deepEqual(history, { 7: [102, 101, 100] });
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
