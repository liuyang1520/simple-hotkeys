'use strict';

(function(){
  let kKey = 75,
      lKey = 76,
      pKey = 80,
      singleQuoteKey = 222,
      leftCommandKey = 91,
      shiftKey = 16,
      keyDown = {
        [kKey]: false,
        [lKey]: false,
        [pKey]: false,
        [singleQuoteKey]: false,
        [leftCommandKey]: false,
        [shiftKey]: false
      };
  let keycodeStatus = {
    [kKey]: true,
    [lKey]: true,
    [pKey]: true,
    [singleQuoteKey]: true
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
      resetKeyDown();
    }
  }

  function keyDownHandler(e) {
    if (e.keyCode in keyDown) {
      keyDown[e.keyCode] = true;
      if (keyDown[kKey] && keyDown[leftCommandKey] && keyDown[shiftKey] && keycodeStatus[kKey]) {
        resetKeyDown();
        openSearchTab(true);
      }
      else if (keyDown[lKey] && keyDown[leftCommandKey] && keyDown[shiftKey] && keycodeStatus[lKey]) {
        resetKeyDown();
        openSearchTab(false);
      }
      else if (keyDown[pKey] && keyDown[leftCommandKey] && keyDown[shiftKey] && keycodeStatus[pKey]) {
        resetKeyDown();
        trigger({pinTab: true});
      }
      else if (keyDown[singleQuoteKey] && keyDown[leftCommandKey] && keyDown[shiftKey] && keycodeStatus[singleQuoteKey]) {
        resetKeyDown();
        trigger({extractTab: true});
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
    trigger({searchUrl: `https://www.google.com/search?q=${selection}`, active})
  }

  function trigger(message) {
    chrome.runtime.sendMessage(Object.assign({action: 'trigger'}, message), (response) => {})
  }

  function updateConfig(codes) {
    if (!Array.isArray(codes)) return;
    for (let keycode of Object.keys(keycodeStatus)) {
      keycodeStatus[keycode] = true;
    }
    for (let keycode of codes) {
      keycodeStatus[keycode] = false;
    }
  }

  chrome.storage.sync.get('disabledKeycode', (result) => {
    let codes = result['disabledKeycode']
    updateConfig(codes);
  })

  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace != 'sync') return;
    let change = changes['disabledKeycode'];
    updateConfig(change.newValue);
    return true;
  })
})();
