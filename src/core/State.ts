/**
 * Canvas state management
 */

import type { CanvasState, SVGComposerOptions } from './types.js';
import type { BaseElement } from '../elements/types.js';

/**
 * Default configuration values
 */
export const DEFAULT_OPTIONS: Required<SVGComposerOptions> = {
  width: 1200,
  height: 1200,
  backgroundColor: '#ffffff',
  historyLimit: 50,
};

/**
 * Manages the canvas state
 */
export class State {
  private _state: CanvasState;

  /**
   * Creates a new State instance
   *
   * @param options - Configuration options
   */
  constructor(options: SVGComposerOptions = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this._state = {
      width: opts.width,
      height: opts.height,
      backgroundColor: opts.backgroundColor,
      elements: new Map(),
      selectedIds: new Set(),
    };
  }

  /**
   * Gets the current canvas state
   *
   * @remarks
   * Returns a direct reference to the internal state for performance.
   * Do not mutate directly - use the provided methods instead.
   * For an immutable copy, use {@link snapshot}.
   */
  get state(): CanvasState {
    return this._state;
  }

  /**
   * Gets an element by ID
   *
   * @param id - Element ID to find
   * @returns The element or undefined if not found
   */
  getElement(id: string): BaseElement | undefined {
    return this._state.elements.get(id);
  }

  /**
   * Gets all elements
   *
   * @returns Array of all elements
   */
  getAllElements(): BaseElement[] {
    return Array.from(this._state.elements.values());
  }

  /**
   * Adds an element to the state
   *
   * @param element - Element to add
   * @throws Error if element with same ID already exists
   */
  addElement(element: BaseElement): void {
    if (this._state.elements.has(element.id)) {
      throw new Error(`Element with id "${element.id}" already exists`);
    }
    this._state.elements.set(element.id, element);
  }

  /**
   * Updates an element in the state
   *
   * @param id - Element ID to update
   * @param updates - Partial element properties to update
   * @throws Error if element does not exist or if trying to change ID
   */
  updateElement(id: string, updates: Partial<BaseElement>): void {
    const element = this._state.elements.get(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }
    if (updates.id !== undefined && updates.id !== id) {
      throw new Error('Cannot change element id');
    }
    const updatedElement = { ...element, ...updates };
    this._state.elements.set(id, updatedElement);
  }

  /**
   * Removes an element from the state
   *
   * @param id - Element ID to remove
   * @throws Error if element does not exist
   */
  removeElement(id: string): void {
    const deleted = this._state.elements.delete(id);
    if (!deleted) {
      throw new Error(`Element with id "${id}" not found`);
    }
    // Also remove from selection if selected
    this._state.selectedIds.delete(id);
  }

  /**
   * Sets the selected element IDs
   *
   * @param ids - Array of element IDs to select
   * @remarks Non-existent element IDs are silently ignored
   */
  setSelection(ids: string[]): void {
    this._state.selectedIds.clear();
    for (const id of ids) {
      if (this._state.elements.has(id)) {
        this._state.selectedIds.add(id);
      }
    }
  }

  /**
   * Gets the selected element IDs
   *
   * @returns Array of selected element IDs
   */
  getSelection(): string[] {
    return Array.from(this._state.selectedIds);
  }

  /**
   * Creates a deep clone of the current state for history
   *
   * @returns Cloned canvas state
   */
  snapshot(): CanvasState {
    const clonedElements = new Map<string, BaseElement>();
    for (const [id, element] of this._state.elements) {
      clonedElements.set(id, this._cloneElement(element));
    }

    return {
      width: this._state.width,
      height: this._state.height,
      backgroundColor: this._state.backgroundColor,
      elements: clonedElements,
      selectedIds: new Set(this._state.selectedIds),
    };
  }

  /**
   * Deep clones a BaseElement
   *
   * @param element - Element to clone
   * @returns Deep cloned element
   */
  private _cloneElement(element: BaseElement): BaseElement {
    const cloned = {
      ...element,
      transform: { ...element.transform },
    };

    // Handle GroupElement children array
    if (element.type === 'group' && 'children' in element) {
      (cloned as BaseElement & { children: string[] }).children = [
        ...(element as BaseElement & { children: string[] }).children,
      ];
    }

    return cloned;
  }

  /**
   * Restores state from a snapshot
   *
   * @param snapshot - State snapshot to restore
   */
  restore(snapshot: CanvasState): void {
    this._state = {
      width: snapshot.width,
      height: snapshot.height,
      backgroundColor: snapshot.backgroundColor,
      elements: new Map(snapshot.elements),
      selectedIds: new Set(snapshot.selectedIds),
    };
  }
}
