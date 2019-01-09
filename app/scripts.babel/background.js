'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.searchUrl != null) {
    chrome.tabs.create({url: request.searchUrl, active: request.active});
  }
});
