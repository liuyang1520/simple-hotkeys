'use strict';

const tabs = {};

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

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

chrome.runtime.onMessage.addListener((request, sender, _sendResponse) => {
  switch (request.action) {
    case 'trigger':
      if (request.searchUrl != null) {
        chrome.tabs.create({url: request.searchUrl, active: request.active});
      } else if (request.pinTab != null) {
        chrome.tabs.update(sender.tab.id, {pinned: !sender.tab.pinned});
      } else if (request.extractTab != null) {
        chrome.windows.create({tabId: sender.tab.id})
      } else if (request.navigateLastTab != null) {
        chrome.windows.getCurrent({}, ({ id: windowId }) => {
          if (tabs[windowId].length > 1) {
            const lastTab = tabs[windowId][1];
            tabs[windowId] = tabs[windowId].filter(id => id !== lastTab);
            chrome.tabs.update(lastTab, { active: true });
          }
        });
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
