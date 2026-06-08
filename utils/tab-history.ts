export type TabHistory = Record<string, number[]>;

type CreatedTab = {
  active: boolean;
  id?: number;
  openerTabId?: number;
  windowId: number;
};

type AccessedTab = {
  id?: number;
  lastAccessed?: number;
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

export function recordCreatedTab(
  history: TabHistory,
  tab: CreatedTab,
  trackOpener = false,
  activeTabAtCreation?: number,
): void {
  if (tab.id == null || (!tab.active && !trackOpener)) {
    return;
  }

  const windowKey = String(tab.windowId);
  const createdTabAlreadyActivated = history[windowKey]?.[0] === tab.id;
  const priorHistory = (history[windowKey] ?? []).filter(
    (tabId) => tabId !== tab.id,
  );
  const openerTabId = activeTabAtCreation ?? tab.openerTabId;
  const previousTabId = trackOpener
    ? (openerTabId ?? priorHistory[0])
    : (priorHistory[0] ?? openerTabId);

  if (!tab.active && !createdTabAlreadyActivated) {
    if (openerTabId != null) {
      history[windowKey] = uniqueTabIds([openerTabId, ...priorHistory]);
    }
    return;
  }

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

export function findLastAccessedPreviousTab(
  tabs: AccessedTab[],
  activeTabId: number,
): number | undefined {
  return tabs
    .filter(
      (tab): tab is AccessedTab & { id: number; lastAccessed: number } =>
        tab.id != null &&
        tab.id !== activeTabId &&
        tab.lastAccessed != null,
    )
    .sort((left, right) => right.lastAccessed - left.lastAccessed)[0]?.id;
}

export async function pruneAndFindPreviousTab(
  history: TabHistory,
  windowId: number,
  activeTabId: number,
  isLiveTabInWindow: (tabId: number, windowId: number) => Promise<boolean>,
  preferredPreviousTabId?: number,
): Promise<number | undefined> {
  const windowKey = String(windowId);
  const liveHistory = [activeTabId];

  for (const tabId of [
    ...(preferredPreviousTabId == null ? [] : [preferredPreviousTabId]),
    ...(history[windowKey] ?? []),
  ]) {
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
