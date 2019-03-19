'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        if (request.keycode == null) return;
        let codes = result['disabledKeycode']
        if (!Array.isArray(codes)) codes = [];
        if (!request.state && !codes.includes(request.keycode)) {
          codes.push(request.keycode)
        } else if (request.state && codes.includes(request.keycode)) {
          codes = codes.filter((item) => item != request.keycode)
        }
        chrome.storage.sync.set({'disabledKeycode': codes}, (response) => {
          console.log(`Saved to storage: ${codes}`);
        });
      })
    return true;
  }
});
