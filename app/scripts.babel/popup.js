'use strict';

const SHORTCUT_DESC_MAPPING = {
  'win': new Map([
    ['17', 'Alt + Shift(⇧) + k'],
    ['76', 'Alt + Shift(⇧) + l'],
    ['80', 'Alt + Shift(⇧) + p'],
    ['222', 'Alt + Shift(⇧) + \'']
  ]),
  'linux': new Map([
    ['17', 'Alt + Shift(⇧) + k'],
    ['76', 'Alt + Shift(⇧) + l'],
    ['80', 'Alt + Shift(⇧) + p'],
    ['222', 'Alt + Shift(⇧) + \'']
  ]),
  'mac': new Map([
    ['75', 'Command(⌘) + Shift(⇧) + k'],
    ['76', 'Command(⌘) + Shift(⇧) + l'],
    ['80', 'Command(⌘) + Shift(⇧) + p'],
    ['222', 'Command(⌘) + Shift(⇧) + \'']
  ])
}

let container = document.querySelector('.each-item-switch');
let switches = document.querySelectorAll('.each-item-switch input');

chrome.storage.sync.get('disabledKeycode', (result) => {
  let codes = result['disabledKeycode']
  if (!Array.isArray(codes)) return;
  chrome.runtime.getPlatformInfo((info) => {
    let os = SHORTCUT_DESC_MAPPING.hasOwnProperty(info.os) ? info.os : 'mac';
    for (let keycode of codes) {
      let index = Array.from(SHORTCUT_DESC_MAPPING[os].keys()).indexOf(keycode);
      let checkbox = switches[index];
      if (checkbox == null)
        console.error('Error finding the switch to disable')
      else
        checkbox.checked = false;
    }
    setTimeout(() => container.classList.remove('notransition'), 500);
  })
})

for (let [index, el] of switches.entries()) {
  chrome.runtime.getPlatformInfo((info) => {
    let os = SHORTCUT_DESC_MAPPING.hasOwnProperty(info.os) ? info.os : 'mac';
    let keycode = Array.from(SHORTCUT_DESC_MAPPING[os].keys())[index];
    let desc = Array.from(SHORTCUT_DESC_MAPPING[os].values())[index];
    el.onclick = () => {
      chrome.runtime.sendMessage({action: 'set', keycode: keycode, state: el.checked}, (response) => {});
    };
    el.closest('.item').querySelector('.shortcut').textContent = desc;
  })
}
