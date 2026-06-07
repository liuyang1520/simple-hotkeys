import {
  getSafariDefaultCommand,
  isSafariShortcutBridgeDetail,
  isSafariShortcutResponse,
  SAFARI_SHORTCUT_MESSAGE_TYPE,
  type CommandName,
} from '../utils/commands';
import { injectScript } from 'wxt/utils/inject-script';

export default defineContentScript({
  include: ['safari'],
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  allFrames: true,
  main() {
    const capturedCodes = new Set<string>();
    const capturedWindows = new WeakSet<Window>();
    const observedFrames = new WeakSet<HTMLIFrameElement>();
    const lastSentAt = new Map<CommandName, number>();
    const bridgeEventName = `simple-hotkeys:safari-shortcut:${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

    void injectScript('/safari-shortcuts-main.js', {
      modifyScript(script) {
        script.async = false;
        script.dataset.bridgeEvent = bridgeEventName;
      },
    }).catch((error) => {
      console.error('Failed to inject Safari shortcut interceptor', error);
    });

    function createDeliveryId(): string {
      return `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    }

    async function deliverCommand(
      command: CommandName,
      deliveryId: string,
    ): Promise<void> {
      let lastError: unknown;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await browser.runtime.sendMessage({
            type: SAFARI_SHORTCUT_MESSAGE_TYPE,
            deliveryId,
            command,
          });

          if (isSafariShortcutResponse(response, deliveryId)) {
            return;
          }

          lastError = new Error('Safari shortcut message was not acknowledged');
        } catch (error) {
          lastError = error;
        }

        await new Promise((resolve) => {
          setTimeout(resolve, 100 * (attempt + 1));
        });
      }

      console.error(`Failed to deliver Safari shortcut "${command}"`, lastError);
    }

    function sendCommand(command: CommandName): void {
      const now = performance.now();
      if (now - (lastSentAt.get(command) ?? -Infinity) < 50) {
        return;
      }
      lastSentAt.set(command, now);

      void deliverCommand(command, createDeliveryId());
    }

    function installCapture(targetWindow: Window): void {
      if (capturedWindows.has(targetWindow)) {
        return;
      }
      capturedWindows.add(targetWindow);

      targetWindow.addEventListener(
        'keydown',
        (event) => {
          const command = getSafariDefaultCommand(event);
          if (command == null) {
            return;
          }

          capturedCodes.add(event.code);
          event.preventDefault();
          event.stopImmediatePropagation();
          sendCommand(command);
        },
        { capture: true },
      );

      targetWindow.addEventListener(
        'keyup',
        (event) => {
          if (!capturedCodes.delete(event.code)) {
            return;
          }

          event.preventDefault();
          event.stopImmediatePropagation();
        },
        { capture: true },
      );

      targetWindow.addEventListener('blur', () => {
        capturedCodes.clear();
      });
    }

    function installBlankFrameCapture(iframe: HTMLIFrameElement): void {
      try {
        const frameWindow = iframe.contentWindow;
        if (
          frameWindow != null &&
          frameWindow.location.href.startsWith('about:')
        ) {
          installCapture(frameWindow);
        }
      } catch {
        // Cross-origin frames receive their own content script when permitted.
      }
    }

    function observeFrame(iframe: HTMLIFrameElement): void {
      if (observedFrames.has(iframe)) {
        return;
      }
      observedFrames.add(iframe);

      installBlankFrameCapture(iframe);
      iframe.addEventListener('load', () => installBlankFrameCapture(iframe), {
        capture: true,
      });
    }

    function observeFramesIn(node: Node): void {
      if (node instanceof HTMLIFrameElement) {
        observeFrame(node);
      }

      if (node instanceof Element || node instanceof Document) {
        node.querySelectorAll('iframe').forEach(observeFrame);
      }
    }

    installCapture(window);
    observeFramesIn(document);

    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(observeFramesIn);
      }
    }).observe(document, {
      childList: true,
      subtree: true,
    });

    document.addEventListener(bridgeEventName, (event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isSafariShortcutBridgeDetail(detail)) {
        return;
      }

      sendCommand(detail.command);
    });
  },
});
