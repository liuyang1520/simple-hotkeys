export const COMMAND_NAMES = [
  'search-in-new-active-tab',
  'pin-unpin-tab',
  'navigate-to-last-active-tab',
  'extract-tab-to-new-window',
] as const;

export type CommandName = (typeof COMMAND_NAMES)[number];

export const SAFARI_SHORTCUT_MESSAGE_TYPE = 'run-safari-shortcut';
export const SAFARI_SHORTCUT_RESPONSE_TYPE = 'safari-shortcut-response';

export type SafariShortcutMessage = {
  type: typeof SAFARI_SHORTCUT_MESSAGE_TYPE;
  deliveryId: string;
  command: CommandName;
};

export type SafariShortcutResponse = {
  type: typeof SAFARI_SHORTCUT_RESPONSE_TYPE;
  deliveryId: string;
  handled: boolean;
};

export type SafariShortcutBridgeDetail = {
  command: CommandName;
};

type ShortcutKeyboardEvent = Pick<
  KeyboardEvent,
  'altKey' | 'code' | 'ctrlKey' | 'isComposing' | 'metaKey' | 'repeat' | 'shiftKey'
>;

const SAFARI_DEFAULT_COMMANDS_BY_CODE: Readonly<Record<string, CommandName>> = {
  KeyK: 'search-in-new-active-tab',
  KeyP: 'pin-unpin-tab',
  KeyE: 'navigate-to-last-active-tab',
  Period: 'extract-tab-to-new-window',
};

export function isCommandName(value: unknown): value is CommandName {
  return COMMAND_NAMES.some((command) => command === value);
}

export function isSafariShortcutMessage(
  value: unknown,
): value is SafariShortcutMessage {
  if (typeof value !== 'object' || value == null) {
    return false;
  }

  const message = value as Partial<SafariShortcutMessage>;
  return (
    message.type === SAFARI_SHORTCUT_MESSAGE_TYPE &&
    typeof message.deliveryId === 'string' &&
    message.deliveryId.length > 0 &&
    isCommandName(message.command)
  );
}

export function isSafariShortcutResponse(
  value: unknown,
  deliveryId: string,
): value is SafariShortcutResponse {
  if (typeof value !== 'object' || value == null) {
    return false;
  }

  const response = value as Partial<SafariShortcutResponse>;
  return (
    response.type === SAFARI_SHORTCUT_RESPONSE_TYPE &&
    response.deliveryId === deliveryId &&
    typeof response.handled === 'boolean'
  );
}

export function isSafariShortcutBridgeDetail(
  value: unknown,
): value is SafariShortcutBridgeDetail {
  if (typeof value !== 'object' || value == null) {
    return false;
  }

  return isCommandName((value as Partial<SafariShortcutBridgeDetail>).command);
}

export function getSafariDefaultCommand(
  event: ShortcutKeyboardEvent,
): CommandName | undefined {
  if (
    event.repeat ||
    event.isComposing ||
    !event.metaKey ||
    !event.shiftKey ||
    event.altKey ||
    event.ctrlKey
  ) {
    return undefined;
  }

  return SAFARI_DEFAULT_COMMANDS_BY_CODE[event.code];
}

export function createCommandDeduper(
  dedupeWindowMs = 250,
  now: () => number = Date.now,
) {
  const lastEvents = new Map<
    CommandName,
    { source: 'commands-api' | 'content-script'; timestamp: number }
  >();

  return (
    command: CommandName,
    source: 'commands-api' | 'content-script',
  ): boolean => {
    const timestamp = now();
    const previous = lastEvents.get(command);

    if (
      previous != null &&
      previous.source !== source &&
      timestamp - previous.timestamp <= dedupeWindowMs
    ) {
      return false;
    }

    lastEvents.set(command, { source, timestamp });
    return true;
  };
}
