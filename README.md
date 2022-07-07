# Simple Hotkeys
A lightweight Chrome extension for enhancing existing Chrome hotkeys ([Chrome Web Store link](https://chrome.google.com/webstore/detail/simple-hotkeys/ciindhhkpajpgcpemjgpbbieiokifdeh/)).

While there are a plenty of extensions giving users a variety of configurations for shortcuts/hotkeys, the ideas behind this application are
- lightweight
- preconfigured
- intuitively
- simple


## Features
- [x] Search text in new tab and switch to it: `Ctrl/Command(⌘) + Shift(⇧) + k`
- [x] Search text in new tab in background: `Ctrl/Command(⌘) + Shift(⇧) + l`
- [x] Pin/Unpin current tab:  `Ctrl/Command(⌘) + Shift(⇧) + p`
- [x] Detach current tab to a new window: no default
- [x] Navigate to last active tab: `Ctrl/Command(⌘) + Shift(⇧) + s`

`Command(⌘)` is replaced with `Ctrl` key for Windows computers.


## Issues
Please feel free to contribute directly or create issues for any bugs and feature suggestions.


## Contribution
1. `npm ci` or `npm install`
2. `npx gulp`
3. Load `./dist` into Chrome browser extensions for testing
4. `npx gulp package` to create `.zip` package


## Credits
Open-source projects:
- [generator-chrome-extension](https://github.com/yeoman/generator-chrome-extension)

Contributors:
- [liuyang1520](https://github.com/liuyang1520)
- [markgllin](https://github.com/markgllin)


## License
[MIT](http://opensource.org/licenses/MIT)
