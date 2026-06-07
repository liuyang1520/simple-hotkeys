export type ExtractableTab = {
  id: number;
  url?: string;
  windowId: number;
};

type WindowReference = {
  id?: number;
};

type ExtractTabOperations = {
  createWindowWithTab: (
    tabId: number,
  ) => Promise<WindowReference | undefined>;
  createWindowWithUrl?: (
    url: string,
  ) => Promise<WindowReference | undefined>;
  getTab: (tabId: number) => Promise<{ windowId: number } | undefined>;
  removeTab?: (tabId: number) => Promise<void>;
  removeWindow: (windowId: number) => Promise<void>;
};

export async function extractTabToNewWindow(
  tab: ExtractableTab,
  operations: ExtractTabOperations,
): Promise<boolean> {
  let requestedWindow: WindowReference | undefined;

  try {
    requestedWindow = await operations.createWindowWithTab(tab.id);
  } catch {
    // Safari does not support tabs.move and can reject the tabId option.
  }

  const movedTab = await operations.getTab(tab.id);

  if (
    requestedWindow?.id != null &&
    movedTab?.windowId === requestedWindow.id
  ) {
    return true;
  }

  if (requestedWindow?.id != null && requestedWindow.id !== tab.windowId) {
    await operations.removeWindow(requestedWindow.id).catch(() => undefined);
  }

  if (
    tab.url == null ||
    operations.createWindowWithUrl == null ||
    operations.removeTab == null
  ) {
    return false;
  }

  let reopenedWindow: WindowReference | undefined;

  try {
    reopenedWindow = await operations.createWindowWithUrl(tab.url);
    if (reopenedWindow?.id == null) {
      return false;
    }

    await operations.removeTab(tab.id);
    return true;
  } catch {
    if (reopenedWindow?.id != null && reopenedWindow.id !== tab.windowId) {
      await operations.removeWindow(reopenedWindow.id).catch(() => undefined);
    }

    return false;
  }
}
