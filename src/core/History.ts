/**
 * Undo/Redo History Management Module
 *
 * This module provides history management for implementing undo/redo functionality
 * in SVG Composer. The {@link History} class maintains two stacks (undo and redo)
 * of immutable state snapshots, allowing users to traverse through previous states.
 *
 * @remarks
 * The History class uses a simple stack-based approach where each entry is a complete
 * snapshot of the canvas state. This trades memory for simplicity and reliability.
 * For large canvases with many elements, consider adjusting the history limit.
 *
 * @example Basic undo/redo workflow
 * ```typescript
 * import { History, State } from 'svg-composer';
 *
 * const state = new State({ width: 800, height: 600 });
 * const history = new History(50);
 *
 * // Save initial state
 * history.push(state.snapshot());
 *
 * // Make changes and save to history
 * state.addElement(myElement);
 * history.push(state.snapshot());
 *
 * // Undo the last change
 * if (history.canUndo()) {
 *   const previousState = history.undo();
 *   if (previousState) {
 *     state.restore(previousState);
 *   }
 * }
 *
 * // Redo the undone change
 * if (history.canRedo()) {
 *   const nextState = history.redo();
 *   if (nextState) {
 *     state.restore(nextState);
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

import type { CanvasState } from './types.js';

/**
 * Manages undo/redo history using immutable state snapshots.
 *
 * The History class maintains two stacks:
 * - **Undo stack**: Contains past states that can be undone
 * - **Redo stack**: Contains states that were undone and can be redone
 *
 * When a new state is pushed, the redo stack is cleared (as is standard for
 * undo/redo systems). The undo stack is limited to a configurable number of
 * entries to prevent unbounded memory growth.
 *
 * @example Integration with SVGComposer
 * ```typescript
 * const composer = new SVGComposer('#container', {
 *   width: 1200,
 *   height: 800,
 *   historyLimit: 100  // Keep up to 100 undo states
 * });
 *
 * // After making changes
 * composer.pushHistory();
 *
 * // Undo/redo
 * composer.undo();
 * composer.redo();
 *
 * // Check availability
 * console.log('Can undo:', composer.canUndo());
 * console.log('Can redo:', composer.canRedo());
 * ```
 *
 * @example Keyboard shortcuts for undo/redo
 * ```typescript
 * document.addEventListener('keydown', (e) => {
 *   if (e.ctrlKey || e.metaKey) {
 *     if (e.key === 'z' && !e.shiftKey) {
 *       e.preventDefault();
 *       composer.undo();
 *     } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
 *       e.preventDefault();
 *       composer.redo();
 *     }
 *   }
 * });
 * ```
 *
 * @see {@link State.snapshot} for creating state snapshots
 * @see {@link State.restore} for restoring from snapshots
 */
export class History {
  protected readonly _limit: number;
  protected readonly _undoStack: CanvasState[] = [];
  protected readonly _redoStack: CanvasState[] = [];

  /**
   * Creates a new History instance with the specified limit.
   *
   * @param limit - Maximum number of history entries to retain (default: 50)
   *
   * @example
   * ```typescript
   * // Create history with custom limit
   * const history = new History(100);
   *
   * // Create history with default limit (50)
   * const defaultHistory = new History();
   * ```
   */
  constructor(limit = 50) {
    this._limit = limit;
  }

  /**
   * Gets the history limit
   */
  get limit(): number {
    return this._limit;
  }

  /**
   * Pushes a new state snapshot to the history.
   *
   * This clears the redo stack (you can't redo after making new changes)
   * and adds the state to the undo stack. If the stack exceeds the limit,
   * the oldest entries are removed.
   *
   * @param state - State snapshot to save (should be from State.snapshot())
   *
   * @example
   * ```typescript
   * // Save state before making changes
   * const snapshot = state.snapshot();
   * state.updateElement('rect-1', { fill: '#ff0000' });
   * history.push(snapshot);
   *
   * // Now the change can be undone
   * console.log(history.canUndo()); // true
   * ```
   */
  push(state: CanvasState): void {
    this._redoStack.length = 0;
    this._undoStack.push(state);
    while (this._undoStack.length > this._limit) {
      this._undoStack.shift();
    }
  }

  /**
   * Undoes the last operation by returning the previous state.
   *
   * Moves the current state to the redo stack and returns the previous state
   * from the undo stack. The returned state should be passed to State.restore().
   *
   * @returns The previous state, or undefined if nothing to undo
   *
   * @example
   * ```typescript
   * if (history.canUndo()) {
   *   const previousState = history.undo();
   *   if (previousState) {
   *     state.restore(previousState);
   *     render(); // Re-render the canvas
   *   }
   * }
   * ```
   *
   * @see {@link canUndo} to check if undo is available
   * @see {@link redo} to redo an undone operation
   */
  undo(): CanvasState | undefined {
    if (this._undoStack.length <= 1) {
      return undefined;
    }
    const current = this._undoStack.pop();
    if (current) {
      this._redoStack.push(current);
    }
    return this._undoStack[this._undoStack.length - 1];
  }

  /**
   * Redoes the last undone operation by returning the next state.
   *
   * Moves a state from the redo stack back to the undo stack and returns it.
   * The returned state should be passed to State.restore().
   *
   * @returns The next state, or undefined if nothing to redo
   *
   * @example
   * ```typescript
   * if (history.canRedo()) {
   *   const nextState = history.redo();
   *   if (nextState) {
   *     state.restore(nextState);
   *     render(); // Re-render the canvas
   *   }
   * }
   * ```
   *
   * @see {@link canRedo} to check if redo is available
   * @see {@link undo} to undo an operation
   */
  redo(): CanvasState | undefined {
    const state = this._redoStack.pop();
    if (!state) {
      return undefined;
    }
    this._undoStack.push(state);
    return state;
  }

  /**
   * Checks if undo is available.
   *
   * Returns true if there is at least one previous state to undo to.
   * Note that the undo stack always contains at least the initial state,
   * so we need more than 1 entry to undo.
   *
   * @returns True if there are states to undo
   *
   * @example
   * ```typescript
   * // Update UI based on undo availability
   * undoButton.disabled = !history.canUndo();
   * ```
   */
  canUndo(): boolean {
    return this._undoStack.length > 1;
  }

  /**
   * Checks if redo is available.
   *
   * Returns true if there are undone states that can be redone.
   *
   * @returns True if there are states to redo
   *
   * @example
   * ```typescript
   * // Update UI based on redo availability
   * redoButton.disabled = !history.canRedo();
   * ```
   */
  canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  /**
   * Clears all history, removing all undo and redo states.
   *
   * Use this when you want to reset the history, such as when loading
   * a new document or after saving.
   *
   * @example
   * ```typescript
   * // Clear history after loading a new document
   * function loadDocument(data: DocumentData) {
   *   state.restore(data.canvasState);
   *   history.clear();
   *   history.push(state.snapshot()); // Start fresh history
   * }
   * ```
   */
  clear(): void {
    this._undoStack.length = 0;
    this._redoStack.length = 0;
  }

  /**
   * Gets the current number of states in the undo stack.
   *
   * This can be useful for displaying history depth or debugging.
   *
   * @returns Number of states in the undo stack
   *
   * @example
   * ```typescript
   * // Display history info
   * console.log(`History: ${history.size()} states, limit: ${history.limit}`);
   * ```
   */
  size(): number {
    return this._undoStack.length;
  }
}
