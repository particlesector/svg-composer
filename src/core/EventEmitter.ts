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
   * @throws Error - Not implemented
   */
  on<K extends keyof TEvents>(_event: K, _handler: (data: TEvents[K]) => void): void {
    // TODO: Implement event subscription
    throw new Error('Not implemented: EventEmitter.on');
  }

  /**
   * Unsubscribe from an event
   *
   * @param event - Event name to unsubscribe from
   * @param handler - The handler function to remove
   * @throws Error - Not implemented
   */
  off<K extends keyof TEvents>(_event: K, _handler: (data: TEvents[K]) => void): void {
    // TODO: Implement event unsubscription
    throw new Error('Not implemented: EventEmitter.off');
  }

  /**
   * Subscribe to an event for a single invocation
   *
   * @param event - Event name to subscribe to
   * @param handler - Callback function to invoke once
   * @throws Error - Not implemented
   */
  once<K extends keyof TEvents>(_event: K, _handler: (data: TEvents[K]) => void): void {
    // TODO: Implement one-time event subscription
    throw new Error('Not implemented: EventEmitter.once');
  }

  /**
   * Emit an event to all subscribers
   *
   * @param event - Event name to emit
   * @param data - Event data to pass to handlers
   * @throws Error - Not implemented
   */
  protected emit<K extends keyof TEvents>(_event: K, _data: TEvents[K]): void {
    // TODO: Implement event emission
    throw new Error('Not implemented: EventEmitter.emit');
  }
}

/**
 * Pre-typed event emitter for editor events
 */
export class EditorEventEmitter extends EventEmitter<EditorEvents> {}
