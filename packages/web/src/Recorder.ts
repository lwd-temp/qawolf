import * as types from "@qawolf/types";
import { getDescriptor } from "./element";

type EventCallback = types.Callback<types.Event>;

export class Recorder {
  private _dataAttribute: string;
  private _onDispose: types.Callback[] = [];
  private _sendEvent: EventCallback;

  constructor(dataAttribute: string, sendEvent: EventCallback) {
    this._dataAttribute = dataAttribute;
    this._sendEvent = sendEvent;

    this.recordEvents();
  }

  public dispose() {
    this._onDispose.forEach(d => d());
  }

  private recordEvent<K extends keyof DocumentEventMap>(
    eventName: K,
    handler: (ev: DocumentEventMap[K]) => types.Event
  ) {
    const listener = (ev: DocumentEventMap[K]) => {
      const event = handler(ev);
      console.log(
        `Recorder: ${eventName} event`,
        ev,
        ev.target,
        "recorded:",
        event
      );
      this._sendEvent(event);
    };

    document.addEventListener(eventName, listener, {
      capture: true,
      passive: true
    });

    this._onDispose.push(() =>
      document.removeEventListener(eventName, listener)
    );
  }

  private recordEvents() {
    this.recordEvent("click", event => ({
      action: "click",
      isTrusted: event.isTrusted,
      target: getDescriptor(event.target as HTMLElement, this._dataAttribute),
      time: Date.now()
    }));

    this.recordEvent("keyup", event => ({
      action: "keyup",
      isTrusted: event.isTrusted,
      target: getDescriptor(event.target as HTMLElement, this._dataAttribute),
      time: Date.now(),
      value: event.which
    }));

    this.recordEvent("scroll", event => {
      let element = event.target as HTMLElement;
      if (event.target === document) {
        element = (document.scrollingElement ||
          document.documentElement) as HTMLElement;
      }

      return {
        action: "scroll",
        isTrusted: event.isTrusted,
        target: getDescriptor(element, this._dataAttribute),
        time: Date.now(),
        value: {
          x: element.scrollLeft,
          y: element.scrollTop
        }
      };
    });
  }
}
