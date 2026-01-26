/**
 * Typed event emitter for the editor
 *
 * This module provides a type-safe event system for SVG Composer. Events are
 * the primary way to react to changes in the editor state, selection, history,
 * and user interactions.
 *
 * ## Common Event Patterns
 *
 * ### Reacting to State Changes
 * ```typescript
 * editor.on('state:changed', ({ state }) => {
 *   // Re-render UI or sync with external state
 *   updateSidebar(state);
 * });
 * ```
 *
 * ### Building Undo/Redo UI
 * ```typescript
 * editor.on('history:changed', ({ canUndo, canRedo }) => {
 *   undoButton.disabled = !canUndo;
 *   redoButton.disabled = !canRedo;
 * });
 * ```
 *
 * ### Selection-Based Property Panels
 * ```typescript
 * editor.on('selection:changed', ({ selectedIds }) => {
 *   if (selectedIds.length === 1) {
 *     showPropertiesPanel(editor.getElement(selectedIds[0]));
 *   } else {
 *     hidePropertiesPanel();
 *   }
 * });
 * ```
 *
 * @module EventEmitter
 */

import type { EditorEvents } from './types.js';

/**
 * Type-safe event emitter for SVG Composer events.
 *
 * Provides a publish-subscribe pattern for reacting to editor changes.
 * All event handlers receive strongly-typed event data based on the event name.
 *
 * @typeParam TEvents - Map of event names to their payload types
 *
 * @example Basic subscription
 * ```typescript
 * const editor = new SVGComposer(container);
 *
 * // Subscribe to element additions
 * editor.on('element:added', ({ element }) => {
 *   console.log('Added:', element.id, element.type);
 * });
 *
 * // Subscribe to selection changes
 * editor.on('selection:changed', ({ selectedIds }) => {
 *   console.log('Selected:', selectedIds.length, 'elements');
 * });
 * ```
 *
 * @example Cleanup pattern
 * ```typescript
 * // Store handler reference for cleanup
 * const handleChange = ({ state }) => {
 *   console.log('State changed');
 * };
 *
 * // Subscribe
 * editor.on('state:changed', handleChange);
 *
 * // Later: unsubscribe when component unmounts
 * editor.off('state:changed', handleChange);
 * ```
 *
 * @example One-time event handling
 * ```typescript
 * // Wait for the first element to be added
 * editor.once('element:added', ({ element }) => {
 *   console.log('First element added:', element.id);
 *   // Handler is automatically removed after first call
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
   * Subscribe to an event.
   *
   * Registers a callback function that will be invoked whenever the specified
   * event is emitted. Multiple handlers can be registered for the same event.
   *
   * @param event - Event name to subscribe to
   * @param handler - Callback function to invoke when event is emitted
   *
   * @example Subscribe to multiple events
   * ```typescript
   * // Track element lifecycle
   * editor.on('element:added', ({ element }) => {
   *   console.log('Added:', element.id);
   * });
   *
   * editor.on('element:removed', ({ id }) => {
   *   console.log('Removed:', id);
   * });
   *
   * editor.on('element:updated', ({ id, element }) => {
   *   console.log('Updated:', id, 'new position:', element.transform);
   * });
   * ```
   *
   * @example Build reactive UI
   * ```typescript
   * // Update UI when tool changes
   * editor.on('tool:changed', ({ tool }) => {
   *   toolButtons.forEach(btn => {
   *     btn.classList.toggle('active', btn.dataset.tool === tool);
   *   });
   * });
   * ```
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
   * Unsubscribe from an event.
   *
   * Removes a previously registered handler. The handler reference must be
   * the same function instance that was passed to `on()`.
   *
   * @param event - Event name to unsubscribe from
   * @param handler - The exact handler function reference to remove
   *
   * @example Clean up event handlers
   * ```typescript
   * // Store the handler reference
   * const handleSelection = ({ selectedIds }) => {
   *   updatePropertiesPanel(selectedIds);
   * };
   *
   * // Subscribe
   * editor.on('selection:changed', handleSelection);
   *
   * // Later: clean up (e.g., in React useEffect cleanup)
   * editor.off('selection:changed', handleSelection);
   * ```
   *
   * @example React useEffect pattern
   * ```typescript
   * useEffect(() => {
   *   const handler = ({ canUndo, canRedo }) => {
   *     setCanUndo(canUndo);
   *     setCanRedo(canRedo);
   *   };
   *
   *   editor.on('history:changed', handler);
   *   return () => editor.off('history:changed', handler);
   * }, [editor]);
   * ```
   */
  off<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): void {
    const handlers = this._handlers.get(event);
    if (handlers) {
      handlers.delete(handler as (data: TEvents[keyof TEvents]) => void);
    }
  }

  /**
   * Subscribe to an event for a single invocation.
   *
   * The handler will be automatically removed after it is called once.
   * Useful for waiting for a specific event to occur.
   *
   * @param event - Event name to subscribe to
   * @param handler - Callback function to invoke once
   *
   * @example Wait for first element
   * ```typescript
   * // Execute code after the first element is added
   * editor.once('element:added', ({ element }) => {
   *   console.log('Canvas is no longer empty!');
   *   showTutorialComplete();
   * });
   * ```
   *
   * @example Await-style pattern
   * ```typescript
   * // Create a promise that resolves on next state change
   * function waitForStateChange(): Promise<CanvasState> {
   *   return new Promise(resolve => {
   *     editor.once('state:changed', ({ state }) => resolve(state));
   *   });
   * }
   *
   * // Usage
   * editor.addElement({ type: 'shape', ... });
   * const newState = await waitForStateChange();
   * ```
   */
  once<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): void {
    const onceHandler = (data: TEvents[K]): void => {
      this.off(event, onceHandler);
      handler(data);
    };
    this.on(event, onceHandler);
  }

  /**
   * Emit an event to all subscribers.
   *
   * This method is protected and used internally by the editor to notify
   * subscribers of state changes. External code should subscribe to events
   * using `on()` rather than emitting events directly.
   *
   * @param event - Event name to emit
   * @param data - Event data to pass to handlers
   * @internal
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
 * Pre-typed event emitter specifically for SVG Composer editor events.
 *
 * This class extends the generic EventEmitter with the EditorEvents type,
 * providing type-safe event handling for all editor-specific events.
 *
 * @see {@link EditorEvents} for the complete list of available events
 * @see {@link SVGComposer} which extends this class
 */
export class EditorEventEmitter extends EventEmitter<EditorEvents> {}
