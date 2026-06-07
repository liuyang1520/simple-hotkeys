# Simple Hotkeys

A lightweight Chrome and Safari extension that adds a small set of practical
keyboard shortcuts.

Current release: `1.2.0`

[Chrome Web Store](https://chromewebstore.google.com/detail/simple-hotkeys/ciindhhkpajpgcpemjgpbbieiokifdeh)

[GitHub Releases](https://github.com/liuyang1520/simple-hotkeys/releases)

## Version 1.2.0

- Added macOS Safari support using Manifest V3.
- Made moving the active tab to a new window work in Safari.
- Prevented webpages from consuming default Safari shortcuts and made their
  delivery retry-safe.
- Assigned `Command+Shift+.` / `Ctrl+Shift+.` to move the active tab.
- Removed the background-search command and its `Command+Shift+L` shortcut.
- Improved last-active-tab tracking and Chrome service-worker reliability.

## Shortcuts

| Action | macOS | Windows/Linux |
| --- | --- | --- |
| Search selected text and jump | `Command+Shift+K` | `Ctrl+Shift+K` |
| Pin or unpin the current tab | `Command+Shift+P` | `Ctrl+Shift+P` |
| Navigate to the last active tab | `Command+Shift+E` | `Ctrl+Shift+E` |
| Move the current tab to a new window | `Command+Shift+.` | `Ctrl+Shift+.` |

## Requirements

- Node.js 20.12 or newer
- pnpm 10.34.1
- Xcode when packaging the Safari extension

The project pins direct dependencies to exact versions and configures pnpm with
`minimumReleaseAge: 10080`, so newly published dependency versions must age for
at least seven days before pnpm can resolve them.

## Development

```sh
pnpm install
pnpm dev
```

WXT writes development and production extensions to `.output/`.

Run the background behavior tests:

```sh
pnpm test
pnpm typecheck
```

## Build

Build Chrome and Safari MV3 extensions:

```sh
pnpm build
```

Build one target:

```sh
pnpm build:chrome
pnpm build:safari
```

Load `.output/chrome-mv3` as an unpacked extension in Chrome.

Safari does not support `tabs.move`. The extension first tries
`windows.create({ tabId })`, then falls back to opening the active tab's URL in
a focused new window and closing the original tab after the new window exists.

Safari can let a webpage consume an extension shortcut before
`browser.commands` receives it. Safari-only content scripts capture the default
shortcuts at `document_start` and forward them to the background service worker.
A minimal main-world interceptor also hooks accessible blank iframes used for
keyboard input by editors such as Google Docs. This fallback applies on
permitted HTTP and HTTPS pages, but not on Safari internal pages. Shortcut
messages are acknowledged by the background worker and retried on delivery
failure.

## Package

Create both store ZIPs and the Safari Xcode project:

```sh
pnpm package:stores
```

Create only the Chrome Web Store ZIP:

```sh
pnpm package:chrome
```

Create the Safari ZIP and Xcode project:

```sh
SAFARI_BUILD_NUMBER=1 pnpm package:safari
```

Increase `SAFARI_BUILD_NUMBER` for every App Store Connect upload of the same
release version.

Release outputs:

- Chrome ZIP: `.output/simple-hotkeys-1.2.0-chrome.zip`
- Safari ZIP: `.output/simple-hotkeys-1.2.0-safari.zip`
- Safari Xcode project: `.safari/Simple Hotkeys/Simple Hotkeys.xcodeproj`

The Chrome and Safari ZIPs are also attached to the matching
[GitHub release](https://github.com/liuyang1520/simple-hotkeys/releases/tag/v1.2.0).

## Publish

Before packaging a release, update the version in `package.json`, then run:

```sh
pnpm release:check
pnpm package:stores
```

`package.json` is the source of truth for the Chrome and Safari extension
version. Safari packaging also applies it to every generated Xcode target.

### Chrome Web Store

1. Upload `.output/simple-hotkeys-1.2.0-chrome.zip` in the
   [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Review the Store Listing, Privacy, Distribution, and test-instructions
   sections.
3. Remove the old background-search feature from the listing and document the
   new `Command+Shift+.` / `Ctrl+Shift+.` shortcut.
4. Submit the update for review.

Each Chrome Web Store upload must use a version greater than the previously
published version. See Google's
[publishing guide](https://developer.chrome.com/docs/webstore/publish).

### Safari App Store

This project publishes a macOS Safari web extension through the App Store. Use
either route:

- Upload `.output/simple-hotkeys-1.2.0-safari.zip` with
  [App Store Connect's Safari Web Extension Packager](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect)
  and select macOS.
- Open `.safari/Simple Hotkeys/Simple Hotkeys.xcodeproj`, configure the signing
  team for the app and extension targets, archive the macOS target, then
  distribute the archive through
  [App Store Connect](https://appstoreconnect.apple.com/).

The generated app uses bundle ID `com.liuyang.simple-hotkeys`; its embedded
extension uses `com.liuyang.simple-hotkeys.Extension`. Configure both
identifiers for the same Apple Developer team before archiving.

For another upload of version `1.2.0`, regenerate the project with a larger
build number, for example:

```sh
SAFARI_BUILD_NUMBER=2 pnpm package:safari
```

### Privacy Disclosure

Simple Hotkeys does not collect analytics or transmit browsing history. Tab
activation history is stored locally with browser extension storage. Selected
text is sent to Google Search only when the user invokes the search shortcut.

## Why the first shortcut now works

Chrome can stop an MV3 extension service worker when it is idle. The background
entrypoint registers command and tab listeners synchronously before starting any
storage work, so the command event that wakes the worker is handled immediately
instead of being lost while tab history loads.

## License

[MIT](LICENSE)
