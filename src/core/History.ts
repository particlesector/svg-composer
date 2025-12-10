/**
 * Undo/redo history management
 */

import type { CanvasState } from './types.js';

/**
 * Manages undo/redo history using immutable state snapshots
 */
export class History {
  protected readonly _limit: number;
  protected readonly _undoStack: CanvasState[] = [];
  protected readonly _redoStack: CanvasState[] = [];

  /**
   * Creates a new History instance
   *
   * @param limit - Maximum number of history entries (default: 50)
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
   * Pushes a new state snapshot to history
   *
   * @param state - State snapshot to save
   */
  push(state: CanvasState): void {
    this._redoStack.length = 0;
    this._undoStack.push(state);
    while (this._undoStack.length > this._limit) {
      this._undoStack.shift();
    }
  }

  /**
   * Undoes the last operation
   *
   * @returns The previous state, or undefined if nothing to undo
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
   * Redoes the last undone operation
   *
   * @returns The next state, or undefined if nothing to redo
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
   * Checks if undo is available
   *
   * @returns True if there are states to undo
   */
  canUndo(): boolean {
    return this._undoStack.length > 1;
  }

  /**
   * Checks if redo is available
   *
   * @returns True if there are states to redo
   */
  canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  /**
   * Clears all history
   */
  clear(): void {
    this._undoStack.length = 0;
    this._redoStack.length = 0;
  }

  /**
   * Gets the current history size (undo stack length)
   *
   * @returns Number of states in undo stack
   */
  size(): number {
    return this._undoStack.length;
  }
}
