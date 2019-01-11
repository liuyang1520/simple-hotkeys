'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.searchUrl != null) {
    chrome.tabs.create({url: request.searchUrl, active: request.active});
  } else if (request.pinTab != null) {
    chrome.tabs.update(sender.tab.id, {pinned: !sender.tab.pinned});
  } else if (request.extractTab != null) {
    chrome.windows.create({tabId: sender.tab.id})
  }
});
