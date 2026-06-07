export type TabHistory = Record<string, number[]>;

type CreatedTab = {
  active: boolean;
  id?: number;
  openerTabId?: number;
  windowId: number;
};

function uniqueTabIds(tabIds: number[]): number[] {
  return tabIds.filter((tabId, index) => tabIds.indexOf(tabId) === index);
}

export function isTabHistory(value: unknown): value is TabHistory {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every(
      (tabIds) => Array.isArray(tabIds) && tabIds.every(Number.isInteger),
    )
  );
}

export function recordTabActivation(
  history: TabHistory,
  windowId: number,
  tabId: number,
): void {
  const windowKey = String(windowId);
  history[windowKey] = uniqueTabIds([tabId, ...(history[windowKey] ?? [])]);
}

export function recordCreatedActiveTab(
  history: TabHistory,
  tab: CreatedTab,
): void {
  if (!tab.active || tab.id == null) {
    return;
  }

  const windowKey = String(tab.windowId);
  const priorHistory = (history[windowKey] ?? []).filter(
    (tabId) => tabId !== tab.id,
  );
  const previousTabId = priorHistory[0] ?? tab.openerTabId;

  history[windowKey] = uniqueTabIds([
    tab.id,
    ...(previousTabId == null ? [] : [previousTabId]),
    ...priorHistory,
  ]);
}

export function removeTabFromHistory(
  history: TabHistory,
  windowId: number,
  tabId: number,
): void {
  const windowKey = String(windowId);
  const remainingTabs = (history[windowKey] ?? []).filter(
    (currentTabId) => currentTabId !== tabId,
  );

  if (remainingTabs.length === 0) {
    delete history[windowKey];
  } else {
    history[windowKey] = remainingTabs;
  }
}

export async function pruneAndFindPreviousTab(
  history: TabHistory,
  windowId: number,
  activeTabId: number,
  isLiveTabInWindow: (tabId: number, windowId: number) => Promise<boolean>,
): Promise<number | undefined> {
  const windowKey = String(windowId);
  const liveHistory = [activeTabId];

  for (const tabId of history[windowKey] ?? []) {
    if (
      tabId !== activeTabId &&
      (await isLiveTabInWindow(tabId, windowId))
    ) {
      liveHistory.push(tabId);
    }
  }

  history[windowKey] = uniqueTabIds(liveHistory);
  return history[windowKey][1];
}
