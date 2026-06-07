import { defineConfig } from 'wxt';

const commands = {
  'search-in-new-active-tab': {
    description: 'Search selected text and jump to the new tab',
    suggested_key: {
      default: 'Ctrl+Shift+K',
      mac: 'Command+Shift+K',
    },
  },
  'pin-unpin-tab': {
    description: 'Pin or unpin the current tab',
    suggested_key: {
      default: 'Ctrl+Shift+P',
      mac: 'Command+Shift+P',
    },
  },
  'navigate-to-last-active-tab': {
    description: 'Navigate to the last active tab',
    suggested_key: {
      default: 'Ctrl+Shift+E',
      mac: 'Command+Shift+E',
    },
  },
  'extract-tab-to-new-window': {
    description: 'Move the current tab to a new window',
    suggested_key: {
      default: 'Ctrl+Shift+Period',
      mac: 'Command+Shift+Period',
    },
  },
} as const;

export default defineConfig({
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: '__MSG_appName__',
    description: '__MSG_appDescription__',
    default_locale: 'en',
    icons: {
      16: 'icon-16.png',
      128: 'icon-128.png',
    },
    permissions: ['storage', 'scripting', 'tabs'],
    host_permissions: ['http://*/*', 'https://*/*'],
    web_accessible_resources:
      browser === 'safari'
        ? [
            {
              resources: ['safari-shortcuts-main.js'],
              matches: ['http://*/*', 'https://*/*'],
            },
          ]
        : undefined,
    commands,
  }),
});
