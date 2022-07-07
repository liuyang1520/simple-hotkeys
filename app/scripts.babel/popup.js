'use strict';

let configureButton = document.querySelector("#configure-button");

configureButton.addEventListener("click", () => {
  chrome.tabs.create({url: "chrome://extensions/shortcuts"});
});
