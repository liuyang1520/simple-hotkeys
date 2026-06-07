import './style.css';

const commandLabels: Record<string, string> = {
  'search-in-new-active-tab': 'Search and jump',
  'pin-unpin-tab': 'Pin or unpin tab',
  'navigate-to-last-active-tab': 'Open last active tab',
  'extract-tab-to-new-window': 'Move tab to new window',
};

const defaultShortcuts: Record<string, string> = {
  'search-in-new-active-tab': 'Command+Shift+K',
  'pin-unpin-tab': 'Command+Shift+P',
  'navigate-to-last-active-tab': 'Command+Shift+E',
  'extract-tab-to-new-window': 'Command+Shift+.',
};

function renderShortcut(name: string, shortcut = 'Not assigned'): HTMLLIElement {
  const item = document.createElement('li');
  const label = document.createElement('span');
  const keys = document.createElement('kbd');

  label.textContent = commandLabels[name] ?? name;
  keys.textContent = shortcut || 'Not assigned';
  item.append(label, keys);

  return item;
}

async function renderShortcuts(): Promise<void> {
  const shortcutList = document.querySelector<HTMLUListElement>('#shortcut-list');
  if (shortcutList == null) {
    return;
  }

  const configuredCommands =
    browser.commands?.getAll == null ? [] : await browser.commands.getAll();
  const configuredShortcuts = new Map(
    configuredCommands.map((command) => [command.name, command.shortcut]),
  );

  shortcutList.replaceChildren(
    ...Object.keys(commandLabels).map((name) =>
      renderShortcut(name, configuredShortcuts.get(name) || defaultShortcuts[name]),
    ),
  );
}

const configureButton =
  document.querySelector<HTMLButtonElement>('#configure-button');
const safariHelp = document.querySelector<HTMLParagraphElement>('#safari-help');

if (import.meta.env.SAFARI || browser.tabs?.create == null) {
  configureButton?.setAttribute('hidden', '');
  safariHelp?.removeAttribute('hidden');
} else {
  configureButton?.addEventListener('click', () => {
    void browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
    window.close();
  });
}

void renderShortcuts().catch((error) => {
  console.error('Failed to load shortcuts', error);
});
