'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

chrome.runtime.onMessage.addListener((request, sender, _sendResponse) => {
  switch (request.action) {
    case 'trigger':
      if (request.searchUrl != null) {
        chrome.tabs.create({url: request.searchUrl, active: request.active});
      } else if (request.pinTab != null) {
        chrome.tabs.update(sender.tab.id, {pinned: !sender.tab.pinned});
      } else if (request.extractTab != null) {
        chrome.windows.create({tabId: sender.tab.id})
      }
    case 'set':
      chrome.storage.sync.get('disabledKeycode', (result) => {
        if (request.keycode == null)
          return;
        let codes = result['disabledKeycode'];
        if (!Array.isArray(codes))
          codes = [];
        if (!request.state && !codes.includes(request.keycode)) {
          codes.push(request.keycode);
        } else if (request.state && codes.includes(request.keycode)) {
          codes = codes.filter((item) => item != request.keycode);
        }
        chrome.storage.sync.set({'disabledKeycode': codes}, (_response) => {
          console.log(`Saved to storage: ${codes}`);
        });
      })
    return true;
  }
});

const tabs = {};

function switchToPreviouslyActiveTab() {
}

function removeTab(tabId, windowId) {
  tabs[windowId] = tabs[windowId].filter(id => id !== tabId);
  if (tabs[windowId].length === 0) {
    delete tabs[windowId];
  }
}

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  if (!tabs[windowId] || !tabs[windowId].length) {
    tabs[windowId] = [];
  }
  tabs[windowId].unshift(tabId);
  tabs[windowId] = tabs[windowId].filter((id, idx, arr) => arr.indexOf(id) === idx);
});

chrome.tabs.onRemoved.addListener((tabId, { windowId }) => {
  removeTab(tabId, windowId);
});

chrome.tabs.onDetached.addListener((tabId, { oldWindowId }) => {
  removeTab(tabId, oldWindowId);
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "search-in-new-active-tab") {

  } else if (command === "search-in-new-background-tab") {

  } else if (command === "pin-unpin-tab") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      const activeTabId = activeTab.id;
      const activeTabPinned = activeTab.pinned;
      chrome.tabs.update(activeTabId, {pinned: !activeTabPinned});
    });
  } else if (command === "extract-tab-to-new-window") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      const activeTabId = activeTab.id;
      chrome.windows.create({tabId: activeTabId})
    });
  } else if (command === "navigate-to-last-active-tab") {
    chrome.windows.getCurrent({}, ({ id: windowId }) => {
      if (tabs[windowId].length > 1) {
        const lastTab = tabs[windowId][1];
        tabs[windowId] = tabs[windowId].filter(id => id !== lastTab);
        chrome.tabs.update(lastTab, { active: true });
      }
    });
  } else if (command === "navigate-back-to-last-active-tab-in-stack") {
    chrome.tabs.query({active: true, currentWindow: true}, function(_tabs) {
      const activeTab = _tabs[0];
      const activeTabId = activeTab.id;
      const windowId = activeTab.windowId;
      for (let i = 0; i < tabs[windowId].length; i++) {
        if (tabs[windowId][i] === activeTabId && i > 0) {
          tabs[windowId] = tabs[windowId].filter(id => id !== activeTabId);
          chrome.tabs.update(tabs[windowId][i - 1], { active: true });
          return;
        }
      }
    });
  } else if (command === "navigate-forward-to-last-active-tab-in-stack") {
    chrome.tabs.query({active: true, currentWindow: true}, function(_tabs) {
      const activeTab = _tabs[0];
      const activeTabId = activeTab.id;
      const windowId = activeTab.windowId;
      for (let i = 0; i < tabs[windowId].length; i++) {
        if (tabs[windowId][i] === activeTabId && i + 1 < tabs[windowId].length) {
          tabs[windowId] = tabs[windowId].filter(id => id !== activeTabId);
          chrome.tabs.update(tabs[windowId][i + 1], { active: true });
          return;
        }
      }
    });
  } else {

  }
});
