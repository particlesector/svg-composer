/**
 * Typed event emitter for the editor
 */

import type { EditorEvents } from './types.js';

/**
 * Type-safe event emitter for SVG Composer events
 *
 * @example
 * ```typescript
 * const emitter = new EventEmitter<EditorEvents>();
 * emitter.on('element:added', ({ element }) => {
 *   console.log('Added:', element.id);
 * });
 * ```
 */
export class EventEmitter<TEvents extends object> {
  /** Map of event names to their handler sets */
  protected readonly _handlers = new Map<
    keyof TEvents,
    Set<(data: TEvents[keyof TEvents]) => void>
  >();

  /**
   * Subscribe to an event
   *
   * @param event - Event name to subscribe to
   * @param handler - Callback function to invoke when event is emitted
   */
  on<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): void {
    let handlers = this._handlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this._handlers.set(event, handlers);
    }
    handlers.add(handler as (data: TEvents[keyof TEvents]) => void);
  }

  /**
   * Unsubscribe from an event
   *
   * @param event - Event name to unsubscribe from
   * @param handler - The handler function to remove
   */
  off<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): void {
    const handlers = this._handlers.get(event);
    if (handlers) {
      handlers.delete(handler as (data: TEvents[keyof TEvents]) => void);
    }
  }

  /**
   * Subscribe to an event for a single invocation
   *
   * @param event - Event name to subscribe to
   * @param handler - Callback function to invoke once
   */
  once<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): void {
    const onceHandler = (data: TEvents[K]): void => {
      this.off(event, onceHandler);
      handler(data);
    };
    this.on(event, onceHandler);
  }

  /**
   * Emit an event to all subscribers
   *
   * @param event - Event name to emit
   * @param data - Event data to pass to handlers
   */
  protected emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const handlers = this._handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }
}

/**
 * Pre-typed event emitter for editor events
 */
export class EditorEventEmitter extends EventEmitter<EditorEvents> {}
