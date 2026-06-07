import {
  isTabHistory,
  pruneAndFindPreviousTab,
  recordCreatedActiveTab,
  recordTabActivation,
  removeTabFromHistory,
  type TabHistory,
} from '../utils/tab-history';
import { extractTabToNewWindow } from '../utils/extract-tab';
import {
  createCommandDeduper,
  isCommandName,
  isSafariShortcutMessage,
  SAFARI_SHORTCUT_RESPONSE_TYPE,
  type CommandName,
  type SafariShortcutMessage,
  type SafariShortcutResponse,
} from '../utils/commands';

const TAB_HISTORY_KEY = 'tabHistory';

function getSelectionFromPage(): string {
  return window.getSelection?.()?.toString().trim() ?? '';
}

function main() {
  let historyPromise: Promise<TabHistory> | undefined;
  let historyQueue = Promise.resolve();
  const shouldHandleCommand =
    import.meta.env.BROWSER === 'safari' ? createCommandDeduper() : undefined;
  const safariDeliveries = new Map<string, Promise<SafariShortcutResponse>>();

  function getHistory(): Promise<TabHistory> {
    historyPromise ??= browser.storage.local.get(TAB_HISTORY_KEY).then((stored) => {
      const history = stored[TAB_HISTORY_KEY];
      return isTabHistory(history) ? history : {};
    });

    return historyPromise;
  }

  function updateHistory(
    update: (history: TabHistory) => void | Promise<void>,
  ): Promise<void> {
    const nextUpdate = historyQueue.then(async () => {
      const history = await getHistory();
      await update(history);
      await browser.storage.local.set({ [TAB_HISTORY_KEY]: history });
    });

    historyQueue = nextUpdate.catch((error) => {
      console.error('Failed to update tab history', error);
    });

    return nextUpdate;
  }

  async function getActiveTab() {
    const [activeTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    return activeTab?.id == null ? undefined : activeTab;
  }

  async function getSelectedText(tabId: number): Promise<string> {
    if (browser.scripting?.executeScript != null) {
      const results = await browser.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: getSelectionFromPage,
      });

      return results.find((result) => Boolean(result.result))?.result ?? '';
    }

    if (browser.tabs.executeScript != null) {
      const results = await browser.tabs.executeScript(tabId, {
        allFrames: true,
        code: `(${getSelectionFromPage.toString()})()`,
      });

      return results?.find((result) => typeof result === 'string' && result) ?? '';
    }

    return '';
  }

  async function searchSelectedText(): Promise<void> {
    const activeTab = await getActiveTab();
    if (activeTab?.id == null) {
      return;
    }

    const selection = await getSelectedText(activeTab.id);
    if (!selection) {
      return;
    }

    const url = `https://www.google.com/search?q=${encodeURIComponent(selection)}`;
    await browser.tabs.create({ url, active: true });
  }

  async function togglePinnedTab(): Promise<void> {
    const activeTab = await getActiveTab();
    if (activeTab?.id == null) {
      return;
    }

    await browser.tabs.update(activeTab.id, { pinned: !activeTab.pinned });
  }

  async function extractActiveTabToNewWindow(): Promise<void> {
    const activeTab = await getActiveTab();
    if (activeTab?.id == null) {
      return;
    }

    const safariFallback =
      import.meta.env.BROWSER === 'safari'
        ? {
            createWindowWithUrl: (url: string) =>
              browser.windows.create({ url, focused: true }),
            removeTab: (tabId: number) => browser.tabs.remove(tabId),
          }
        : {};

    const extracted = await extractTabToNewWindow(
      {
        id: activeTab.id,
        url: activeTab.url,
        windowId: activeTab.windowId,
      },
      {
        createWindowWithTab: (tabId) =>
          browser.windows.create({ tabId, focused: true }),
        getTab: async (tabId) => {
          try {
            return await browser.tabs.get(tabId);
          } catch {
            return undefined;
          }
        },
        removeWindow: (windowId) => browser.windows.remove(windowId),
        ...safariFallback,
      },
    );

    if (!extracted) {
      console.error('Failed to move the current tab to a new window');
    }
  }

  async function navigateToLastActiveTab(): Promise<void> {
    const activeTab = await getActiveTab();
    if (activeTab?.id == null || activeTab.windowId == null) {
      return;
    }

    let previousTabId: number | undefined;

    await updateHistory(async (history) => {
      previousTabId = await pruneAndFindPreviousTab(
        history,
        activeTab.windowId,
        activeTab.id!,
        async (tabId, windowId) => {
          try {
            const tab = await browser.tabs.get(tabId);
            return tab.windowId === windowId;
          } catch {
            return false;
          }
        },
      );
    });

    if (previousTabId != null) {
      await browser.tabs.update(previousTabId, { active: true });
    }
  }

  async function handleCommand(command: CommandName): Promise<void> {
    switch (command) {
      case 'search-in-new-active-tab':
        await searchSelectedText();
        break;
      case 'pin-unpin-tab':
        await togglePinnedTab();
        break;
      case 'navigate-to-last-active-tab':
        await navigateToLastActiveTab();
        break;
      case 'extract-tab-to-new-window':
        await extractActiveTabToNewWindow();
        break;
    }
  }

  function handleSafariShortcutMessage(
    message: SafariShortcutMessage,
  ): Promise<SafariShortcutResponse> {
    const existing = safariDeliveries.get(message.deliveryId);
    if (existing != null) {
      return existing;
    }

    const delivery = (async () => {
      const handled =
        shouldHandleCommand?.(message.command, 'content-script') !== false;

      if (handled) {
        await handleCommand(message.command);
      }

      return {
        type: SAFARI_SHORTCUT_RESPONSE_TYPE,
        deliveryId: message.deliveryId,
        handled,
      } satisfies SafariShortcutResponse;
    })();

    safariDeliveries.set(message.deliveryId, delivery);
    if (safariDeliveries.size > 100) {
      const oldestDeliveryId = safariDeliveries.keys().next().value;
      if (oldestDeliveryId != null) {
        safariDeliveries.delete(oldestDeliveryId);
      }
    }

    void delivery.catch(() => {
      safariDeliveries.delete(message.deliveryId);
    });

    return delivery;
  }

  // Register all listeners synchronously so Chrome can dispatch the event that
  // wakes a stopped MV3 service worker without losing the first shortcut press.
  browser.commands.onCommand.addListener((command) => {
    if (!isCommandName(command)) {
      return;
    }

    const handleNativeCommand = () => {
      if (shouldHandleCommand?.(command, 'commands-api') === false) {
        return;
      }

      void handleCommand(command).catch((error) => {
        console.error(`Failed to handle command "${command}"`, error);
      });
    };

    if (import.meta.env.BROWSER === 'safari') {
      setTimeout(handleNativeCommand, 100);
    } else {
      handleNativeCommand();
    }
  });

  if (import.meta.env.BROWSER === 'safari' && shouldHandleCommand != null) {
    browser.runtime.onMessage.addListener((message) => {
      if (!isSafariShortcutMessage(message)) {
        return;
      }

      return handleSafariShortcutMessage(message);
    });
  }

  browser.tabs.onActivated.addListener(({ tabId, windowId }) => {
    void updateHistory((history) => {
      recordTabActivation(history, windowId, tabId);
    });
  });

  browser.tabs.onCreated.addListener((tab) => {
    void updateHistory((history) => {
      recordCreatedActiveTab(history, tab);
    });
  });

  browser.tabs.onRemoved.addListener((tabId, { windowId }) => {
    void updateHistory((history) => {
      removeTabFromHistory(history, windowId, tabId);
    });
  });

  browser.tabs.onDetached.addListener((tabId, { oldWindowId }) => {
    void updateHistory((history) => {
      removeTabFromHistory(history, oldWindowId, tabId);
    });
  });

  void browser.tabs
    .query({ active: true })
    .then((activeTabs) =>
      updateHistory((history) => {
        for (const tab of activeTabs) {
          if (tab.id != null) {
            recordTabActivation(history, tab.windowId, tab.id);
          }
        }
      }),
    )
    .catch((error) => {
      console.error('Failed to seed active tab history', error);
    });
}

export default defineBackground({
  persistent: false,
  main,
});
