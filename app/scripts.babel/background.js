'use strict';

const tabs = {};

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

function removeTab(tabId, windowId) {
  if (!tabs[windowId]) {
    return;
  }
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

function searchSelectedInNewTab(active) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      const activeTabId = activeTab.id;
      chrome.scripting.executeScript(
        {
          target: {tabId: activeTabId},
          func: () => {
            if (!window || !window.getSelection || !window.getSelection() || !window.getSelection().toString) return;
            return window.getSelection().toString();
          }
        },
        function(results) {
          if (!results || results.length === 0 || !results[0].result) return;
          const searchUrl = `https://www.google.com/search?q=${results[0].result}`;
          chrome.tabs.create({url: searchUrl, active});
        }
      );
    });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "search-in-new-active-tab") {
    searchSelectedInNewTab(true);
  } else if (command === "search-in-new-background-tab") {
    searchSelectedInNewTab(false);
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
  }
});
