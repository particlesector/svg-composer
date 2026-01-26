/**
 * Canvas State Management Module
 *
 * This module provides the core state container for SVG Composer. The {@link State}
 * class manages all canvas data including elements, selection, and guides. It supports
 * immutable snapshots for undo/redo functionality and provides atomic state updates.
 *
 * @remarks
 * The State class is designed to be used internally by SVGComposer. For most use cases,
 * interact with the state through the SVGComposer API rather than directly.
 *
 * @example Basic usage
 * ```typescript
 * import { State } from 'svg-composer';
 *
 * // Create a new state with custom dimensions
 * const state = new State({ width: 800, height: 600 });
 *
 * // Add an element
 * const element: BaseElement = {
 *   id: 'rect-1',
 *   type: 'shape',
 *   shapeType: 'rect',
 *   width: 100,
 *   height: 50,
 *   transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
 *   zIndex: 0,
 *   visible: true,
 *   locked: false,
 *   opacity: 1,
 *   fill: '#ff0000',
 *   stroke: '#000000',
 *   strokeWidth: 2
 * };
 * state.addElement(element);
 *
 * // Select the element
 * state.setSelection(['rect-1']);
 * ```
 *
 * @example Creating snapshots for undo/redo
 * ```typescript
 * // Take a snapshot before making changes
 * const snapshot = state.snapshot();
 *
 * // Make some changes
 * state.updateElement('rect-1', { opacity: 0.5 });
 *
 * // Later, restore the previous state
 * state.restore(snapshot);
 * ```
 *
 * @packageDocumentation
 */

import type { CanvasState, SVGComposerOptions, Guide } from './types.js';
import type { BaseElement } from '../elements/types.js';

/**
 * Default configuration values for SVGComposer initialization.
 *
 * @example
 * ```typescript
 * // Using defaults with custom width
 * const options = { ...DEFAULT_OPTIONS, width: 1920 };
 * ```
 */
export const DEFAULT_OPTIONS: Required<SVGComposerOptions> = {
  width: 1200,
  height: 1200,
  backgroundColor: '#ffffff',
  historyLimit: 50,
};

/**
 * Manages the canvas state for SVG Composer.
 *
 * The State class is the central data container that holds all information about
 * the canvas including dimensions, background color, elements, selection state,
 * and guides. It provides methods for CRUD operations on elements and guides,
 * as well as snapshot/restore functionality for undo/redo support.
 *
 * @example Creating and managing elements
 * ```typescript
 * const state = new State({ width: 800, height: 600 });
 *
 * // Add a rectangle element
 * state.addElement({
 *   id: 'rect-1',
 *   type: 'shape',
 *   shapeType: 'rect',
 *   width: 100,
 *   height: 50,
 *   transform: { x: 50, y: 50, rotation: 0, scaleX: 1, scaleY: 1 },
 *   zIndex: 0,
 *   visible: true,
 *   locked: false,
 *   opacity: 1,
 *   fill: '#3498db'
 * });
 *
 * // Update the element
 * state.updateElement('rect-1', { fill: '#e74c3c' });
 *
 * // Get the element
 * const rect = state.getElement('rect-1');
 * console.log(rect?.fill); // '#e74c3c'
 * ```
 *
 * @example Working with selection
 * ```typescript
 * // Select multiple elements
 * state.setSelection(['rect-1', 'rect-2', 'circle-1']);
 *
 * // Get current selection
 * const selectedIds = state.getSelection();
 * console.log(selectedIds); // ['rect-1', 'rect-2', 'circle-1']
 * ```
 *
 * @example Managing guides
 * ```typescript
 * // Add a vertical guide at x=100
 * state.addGuide({
 *   id: 'guide-1',
 *   orientation: 'vertical',
 *   position: 100,
 *   locked: false,
 *   visible: true
 * });
 *
 * // Update guide position
 * state.updateGuide('guide-1', { position: 150 });
 * ```
 *
 * @see {@link CanvasState} for the state structure
 * @see {@link History} for undo/redo functionality
 */
export class State {
  private _state: CanvasState;

  /**
   * Creates a new State instance with the specified options.
   *
   * @param options - Configuration options for the canvas
   *
   * @example
   * ```typescript
   * // Create with custom dimensions
   * const state = new State({
   *   width: 1920,
   *   height: 1080,
   *   backgroundColor: '#f0f0f0'
   * });
   * ```
   */
  constructor(options: SVGComposerOptions = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this._state = {
      width: opts.width,
      height: opts.height,
      backgroundColor: opts.backgroundColor,
      elements: new Map(),
      selectedIds: new Set(),
      guides: [],
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
   * Gets an element by ID.
   *
   * @param id - Element ID to find
   * @returns The element or undefined if not found
   *
   * @example
   * ```typescript
   * const element = state.getElement('rect-1');
   * if (element) {
   *   console.log(`Found element at (${element.transform.x}, ${element.transform.y})`);
   * }
   * ```
   */
  getElement(id: string): BaseElement | undefined {
    return this._state.elements.get(id);
  }

  /**
   * Gets all elements in the canvas.
   *
   * @returns Array of all elements (not in any particular order)
   *
   * @example
   * ```typescript
   * const elements = state.getAllElements();
   * // Sort by z-index for rendering
   * const sorted = elements.sort((a, b) => a.zIndex - b.zIndex);
   * ```
   */
  getAllElements(): BaseElement[] {
    return Array.from(this._state.elements.values());
  }

  /**
   * Adds an element to the canvas state.
   *
   * @param element - Element to add (must have unique ID)
   * @throws Error if element with same ID already exists
   *
   * @example
   * ```typescript
   * state.addElement({
   *   id: 'circle-1',
   *   type: 'shape',
   *   shapeType: 'circle',
   *   r: 50,
   *   transform: { x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
   *   zIndex: 1,
   *   visible: true,
   *   locked: false,
   *   opacity: 1,
   *   fill: '#2ecc71'
   * });
   * ```
   */
  addElement(element: BaseElement): void {
    if (this._state.elements.has(element.id)) {
      throw new Error(`Element with id "${element.id}" already exists`);
    }
    this._state.elements.set(element.id, element);
  }

  /**
   * Updates an element in the state with partial properties.
   *
   * @param id - Element ID to update
   * @param updates - Partial element properties to merge with existing element
   * @throws Error if element does not exist or if trying to change ID
   *
   * @example
   * ```typescript
   * // Update position and opacity
   * state.updateElement('rect-1', {
   *   transform: { ...element.transform, x: 150, y: 200 },
   *   opacity: 0.8
   * });
   *
   * // Toggle visibility
   * state.updateElement('rect-1', { visible: false });
   * ```
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
   * Removes an element from the canvas state.
   *
   * Also removes the element from selection if it was selected.
   *
   * @param id - Element ID to remove
   * @throws Error if element does not exist
   *
   * @example
   * ```typescript
   * // Remove an element
   * state.removeElement('rect-1');
   *
   * // Verify it's gone
   * console.log(state.getElement('rect-1')); // undefined
   * ```
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

  // ============================================================
  // Guide Management
  // ============================================================

  /**
   * Gets all guides
   *
   * @returns Array of all guides
   */
  getGuides(): Guide[] {
    return [...this._state.guides];
  }

  /**
   * Gets a guide by ID
   *
   * @param id - Guide ID to find
   * @returns The guide or undefined if not found
   */
  getGuide(id: string): Guide | undefined {
    return this._state.guides.find((g) => g.id === id);
  }

  /**
   * Adds a guide to the state
   *
   * @param guide - Guide to add
   * @throws Error if guide ID is invalid or guide with same ID already exists
   */
  addGuide(guide: Guide): void {
    // Validate guide ID
    if (!guide.id || typeof guide.id !== 'string' || guide.id.trim() === '') {
      throw new Error('Guide ID must be a non-empty string');
    }
    if (this._state.guides.some((g) => g.id === guide.id)) {
      throw new Error(`Guide with id "${guide.id}" already exists`);
    }
    this._state.guides.push({ ...guide });
  }

  /**
   * Updates a guide in the state
   *
   * @param id - Guide ID to update
   * @param updates - Partial guide properties to update
   * @throws Error if guide does not exist
   */
  updateGuide(id: string, updates: Partial<Guide>): void {
    const existingGuide = this._state.guides.find((g) => g.id === id);
    if (!existingGuide) {
      throw new Error(`Guide with id "${id}" not found`);
    }
    if (updates.id !== undefined && updates.id !== id) {
      throw new Error('Cannot change guide id');
    }
    // Update properties, filtering undefined to satisfy exactOptionalPropertyTypes
    existingGuide.orientation = updates.orientation ?? existingGuide.orientation;
    existingGuide.position = updates.position ?? existingGuide.position;
    existingGuide.locked = updates.locked ?? existingGuide.locked;
    existingGuide.visible = updates.visible ?? existingGuide.visible;
    // Only set color if it's defined in updates
    if (updates.color !== undefined) {
      existingGuide.color = updates.color;
    }
  }

  /**
   * Removes a guide from the state
   *
   * @param id - Guide ID to remove
   * @throws Error if guide does not exist
   */
  removeGuide(id: string): void {
    const index = this._state.guides.findIndex((g) => g.id === id);
    if (index === -1) {
      throw new Error(`Guide with id "${id}" not found`);
    }
    this._state.guides.splice(index, 1);
  }

  /**
   * Removes all guides
   */
  clearGuides(): void {
    this._state.guides = [];
  }

  /**
   * Creates a deep clone of the current state for history/undo support.
   *
   * The snapshot includes deep copies of all elements, selection state, and guides.
   * Modifications to the returned snapshot will not affect the current state.
   *
   * @returns Cloned canvas state that can be passed to {@link restore}
   *
   * @example
   * ```typescript
   * // Save state before a batch of operations
   * const beforeChanges = state.snapshot();
   *
   * // Make multiple changes
   * state.updateElement('rect-1', { fill: '#ff0000' });
   * state.updateElement('rect-2', { opacity: 0.5 });
   * state.removeElement('rect-3');
   *
   * // If needed, revert all changes
   * state.restore(beforeChanges);
   * ```
   *
   * @see {@link restore} for restoring from a snapshot
   * @see {@link History} for automatic undo/redo management
   */
  snapshot(): CanvasState {
    const clonedElements = new Map<string, BaseElement>();
    for (const [id, element] of this._state.elements) {
      clonedElements.set(id, this._cloneElement(element));
    }

    // Deep clone guides array
    const clonedGuides = this._state.guides.map((guide) => ({ ...guide }));

    return {
      width: this._state.width,
      height: this._state.height,
      backgroundColor: this._state.backgroundColor,
      elements: clonedElements,
      selectedIds: new Set(this._state.selectedIds),
      guides: clonedGuides,
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
   * Restores the canvas state from a previously created snapshot.
   *
   * This replaces the entire current state with the snapshot. The snapshot
   * is copied, so subsequent modifications won't affect the snapshot object.
   *
   * @param snapshot - State snapshot created by {@link snapshot}
   *
   * @example
   * ```typescript
   * // Implement a simple undo
   * const history: CanvasState[] = [];
   *
   * // Before each change, save state
   * history.push(state.snapshot());
   * state.updateElement('rect-1', { fill: '#ff0000' });
   *
   * // Undo by restoring last snapshot
   * const lastState = history.pop();
   * if (lastState) {
   *   state.restore(lastState);
   * }
   * ```
   *
   * @see {@link snapshot} for creating snapshots
   */
  restore(snapshot: CanvasState): void {
    this._state = {
      width: snapshot.width,
      height: snapshot.height,
      backgroundColor: snapshot.backgroundColor,
      elements: new Map(snapshot.elements),
      selectedIds: new Set(snapshot.selectedIds),
      guides: [...snapshot.guides.map((g) => ({ ...g }))],
    };
  }
}
