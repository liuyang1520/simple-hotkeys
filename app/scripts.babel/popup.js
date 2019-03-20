'use strict';

let container = document.querySelector('.each-item-switch');
let switches = document.querySelectorAll('.each-item-switch input');

chrome.storage.sync.get('disabledKeycode', (result) => {
  let codes = result['disabledKeycode']
  if (!Array.isArray(codes)) return;
  for (let keycode of codes) {
    let checkbox = document.querySelector(`label[data-keycode="${keycode}"] > input`);
    checkbox.checked = false;
  }
  setTimeout(() => container.classList.remove('notransition'), 500);
})

for (let element of switches) {
  element.onclick = () => {
    let keycode = parseInt(element.parentNode.dataset.keycode);
    console.log(keycode)
    chrome.runtime.sendMessage({action: 'set', keycode: keycode, state: element.checked}, (response) => {});
  };
}
