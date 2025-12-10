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
   * @throws Error - Not implemented
   */
  push(_state: CanvasState): void {
    // TODO: Implement history push
    // Should clear redo stack and add to undo stack
    // Should respect the limit
    throw new Error('Not implemented: History.push');
  }

  /**
   * Undoes the last operation
   *
   * @returns The previous state, or undefined if nothing to undo
   * @throws Error - Not implemented
   */
  undo(): CanvasState | undefined {
    // TODO: Implement undo
    // Should move current state to redo stack
    // Should return previous state from undo stack
    throw new Error('Not implemented: History.undo');
  }

  /**
   * Redoes the last undone operation
   *
   * @returns The next state, or undefined if nothing to redo
   * @throws Error - Not implemented
   */
  redo(): CanvasState | undefined {
    // TODO: Implement redo
    // Should move current state to undo stack
    // Should return next state from redo stack
    throw new Error('Not implemented: History.redo');
  }

  /**
   * Checks if undo is available
   *
   * @returns True if there are states to undo
   * @throws Error - Not implemented
   */
  canUndo(): boolean {
    // TODO: Implement canUndo check
    throw new Error('Not implemented: History.canUndo');
  }

  /**
   * Checks if redo is available
   *
   * @returns True if there are states to redo
   * @throws Error - Not implemented
   */
  canRedo(): boolean {
    // TODO: Implement canRedo check
    throw new Error('Not implemented: History.canRedo');
  }

  /**
   * Clears all history
   *
   * @throws Error - Not implemented
   */
  clear(): void {
    // TODO: Implement history clear
    throw new Error('Not implemented: History.clear');
  }

  /**
   * Gets the current history size (undo stack length)
   *
   * @returns Number of states in undo stack
   * @throws Error - Not implemented
   */
  size(): number {
    // TODO: Implement size getter
    throw new Error('Not implemented: History.size');
  }
}
