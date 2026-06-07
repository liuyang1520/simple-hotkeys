import {
  getSafariDefaultCommand,
} from '../utils/commands';

export default defineUnlistedScript({
  include: ['safari'],
  globalName: false,
  main() {
    const configuredBridgeEventName = document.currentScript?.dataset.bridgeEvent;
    if (!configuredBridgeEventName) {
      return;
    }
    const bridgeEventName = configuredBridgeEventName;

    const capturedWindows = new WeakSet<Window>();
    const observedFrames = new WeakSet<HTMLIFrameElement>();

    function installCapture(
      targetWindow: Window,
      bridgeDocument: Document,
    ): void {
      if (capturedWindows.has(targetWindow)) {
        return;
      }
      capturedWindows.add(targetWindow);

      const capturedCodes = new Set<string>();

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

          bridgeDocument.dispatchEvent(
            new CustomEvent(bridgeEventName, {
              detail: { command },
            }),
          );
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

    function installBlankFrameCapture(
      iframe: HTMLIFrameElement,
      frameWindow?: Window | null,
    ): void {
      try {
        const targetWindow = frameWindow ?? iframe.contentWindow;
        if (
          targetWindow != null &&
          targetWindow.location.href.startsWith('about:')
        ) {
          installCapture(targetWindow, document);
        }
      } catch {
        // Cross-origin frames receive their own injected page-world script.
      }
    }

    function observeFrame(iframe: HTMLIFrameElement): void {
      if (observedFrames.has(iframe)) {
        return;
      }
      observedFrames.add(iframe);

      installBlankFrameCapture(iframe);
      iframe.addEventListener(
        'load',
        () => {
          installBlankFrameCapture(iframe);
        },
        { capture: true },
      );
    }

    function observeFramesIn(node: Node): void {
      if (node instanceof HTMLIFrameElement) {
        observeFrame(node);
      }

      if (node instanceof Element || node instanceof Document) {
        node.querySelectorAll('iframe').forEach(observeFrame);
      }
    }

    function hookIframeGetter(property: 'contentWindow' | 'contentDocument') {
      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLIFrameElement.prototype,
        property,
      );
      if (descriptor?.get == null || descriptor.configurable !== true) {
        return;
      }

      Object.defineProperty(HTMLIFrameElement.prototype, property, {
        ...descriptor,
        get(this: HTMLIFrameElement) {
          const value = descriptor.get?.call(this);
          const frameWindow =
            property === 'contentWindow'
              ? (value as Window | null)
              : (value as Document | null)?.defaultView;
          installBlankFrameCapture(this, frameWindow);
          return value;
        },
      });
    }

    installCapture(window, document);
    hookIframeGetter('contentWindow');
    hookIframeGetter('contentDocument');
    observeFramesIn(document);

    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(observeFramesIn);
      }
    }).observe(document, {
      childList: true,
      subtree: true,
    });
  },
});
