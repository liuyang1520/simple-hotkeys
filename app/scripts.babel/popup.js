'use strict';

let globalSwitch = document.querySelector('.global-switch input');
let switches = document.querySelectorAll('.each-item-switch input');

for (let element of switches) {
  element.onclick = () => {
    let keycode = parseInt(element.parentNode.dataset.keycode);
    console.log(keycode)
    chrome.runtime.sendMessage({action: 'set', keycode: keycode, state: element.checked}, (response) => {});
  };
}
