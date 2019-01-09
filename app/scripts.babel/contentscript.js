'use strict';

(function(){
  let kKey = 75,
      lKey = 76,
      leftCommandKey = 91,
      shiftKey = 16,
      keyDown = {
        [kKey]: false,
        [lKey]: false,
        [leftCommandKey]: false,
        [shiftKey]: false
      };

  window.addEventListener('keyup', keyUpHandler);
  window.addEventListener('keydown', keyDownHandler);

  function getSelection() {
    let selection = window.getSelection().toString().trim();
    if (selection.length == 0)
      return false;
    return selection;
  }

  function keyUpHandler(e) {
    if (e.keyCode in keyDown) {
      keyDown[e.keyCode] = false;
    }
  }

  function keyDownHandler(e) {
    if (e.keyCode in keyDown) {
      keyDown[e.keyCode] = true;
      if (keyDown[lKey] && keyDown[leftCommandKey] && keyDown[shiftKey]) {
        resetKeyDown();
        openSearchTab(false);
      }
      if (keyDown[kKey] && keyDown[leftCommandKey] && keyDown[shiftKey]) {
        resetKeyDown();
        openSearchTab(true);
      }
    }
  }

  function resetKeyDown() {
    Object.keys(keyDown).forEach(key => {
      keyDown[key] = false;
    })
  }

  function openSearchTab(active=false) {
    let selection = getSelection();
    if (!selection) return;
    chrome.runtime.sendMessage({searchUrl: `https://www.google.com/search?q=${selection}`, active}, (response) => {})
  }
})();
