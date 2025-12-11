/**
 * Main SVG Composer editor class
 */

import type { SVGComposerOptions, ToolType, BoundingBox } from './types.js';
import type { BaseElement, ClipPath } from '../elements/types.js';
import { State, DEFAULT_OPTIONS } from './State.js';
import { History } from './History.js';
import { EditorEventEmitter } from './EventEmitter.js';
import { generateId } from '../utils/IdGenerator.js';

/**
 * SVG Composer - A zero-dependency SVG canvas editor
 *
 * @example
 * ```typescript
 * const editor = new SVGComposer(document.getElementById('canvas'), {
 *   width: 1200,
 *   height: 1200
 * });
 *
 * const imageId = editor.addElement({
 *   type: 'image',
 *   src: 'photo.jpg',
 *   width: 400,
 *   height: 300,
 *   transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
 *   opacity: 1,
 *   zIndex: 1,
 *   locked: false,
 *   visible: true
 * });
 * ```
 */
export class SVGComposer extends EditorEventEmitter {
  private readonly _container: HTMLElement;
  protected readonly _state: State;
  protected readonly _history: History;
  private _currentTool: ToolType = 'select';
  private _destroyed = false;

  /**
   * Creates a new SVGComposer instance
   *
   * @param container - DOM element to mount the editor to
   * @param options - Configuration options
   */
  constructor(container: HTMLElement, options: SVGComposerOptions = {}) {
    super();
    this._container = container;
    this._state = new State(options);
    this._history = new History(options.historyLimit ?? DEFAULT_OPTIONS.historyLimit);
    // Push initial state to history stack
    this._history.push(this._state.snapshot());
  }

  /**
   * Gets the container element
   */
  get container(): HTMLElement {
    return this._container;
  }

  // ============================================================
  // Element Management
  // ============================================================

  /**
   * Adds an element to the canvas
   *
   * @param element - Element properties (id will be auto-generated)
   * @returns The generated element ID
   */
  addElement(element: Omit<BaseElement, 'id'>): string {
    // Generate ID and create full element
    const id = generateId();
    const fullElement = { ...element, id } as BaseElement;

    // Add to state
    this._state.addElement(fullElement);

    // Save history after mutation (current state goes on stack)
    this._history.push(this._state.snapshot());

    // Emit events
    this.emit('element:added', { element: fullElement });
    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });

    return id;
  }

  /**
   * Removes an element from the canvas
   *
   * @param id - Element ID to remove
   * @throws Error if element does not exist
   */
  removeElement(id: string): void {
    // Verify element exists
    if (!this._state.getElement(id)) {
      throw new Error(`Element with id "${id}" not found`);
    }

    // Remove from state (also removes from selection)
    this._state.removeElement(id);

    // Save history after mutation (current state goes on stack)
    this._history.push(this._state.snapshot());

    // Emit events
    this.emit('element:removed', { id });
    this.emit('selection:changed', { selectedIds: this._state.getSelection() });
    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });
  }

  /**
   * Removes multiple elements from the canvas
   *
   * @param ids - Array of element IDs to remove
   */
  removeElements(ids: string[]): void {
    // Filter to only existing elements
    const validIds = ids.filter((id) => this._state.getElement(id) !== undefined);

    if (validIds.length === 0) {
      return; // Nothing to remove
    }

    // Remove each element
    for (const id of validIds) {
      this._state.removeElement(id);
      this.emit('element:removed', { id });
    }

    // Save history once after batch mutation (current state goes on stack)
    this._history.push(this._state.snapshot());

    // Emit batch events
    this.emit('selection:changed', { selectedIds: this._state.getSelection() });
    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });
  }

  /**
   * Updates an element's properties
   *
   * @param id - Element ID to update
   * @param updates - Partial element properties to update
   * @throws Error if element does not exist
   */
  updateElement(id: string, updates: Partial<BaseElement>): void {
    // Verify element exists
    if (!this._state.getElement(id)) {
      throw new Error(`Element with id "${id}" not found`);
    }

    // Update element
    this._state.updateElement(id, updates);

    // Save history after mutation (current state goes on stack)
    this._history.push(this._state.snapshot());

    // Get updated element for event (safe since we validated existence above)
    const updatedElement = this._state.getElement(id);
    if (!updatedElement) {
      throw new Error(`Element with id "${id}" unexpectedly missing after update`);
    }

    // Emit events
    this.emit('element:updated', { id, element: updatedElement });
    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });
  }

  /**
   * Replaces an element entirely
   *
   * @param id - Element ID to replace
   * @param element - New element data
   * @throws Error if element does not exist or replacement ID does not match
   */
  replaceElement(id: string, element: BaseElement): void {
    // Verify original element exists
    if (!this._state.getElement(id)) {
      throw new Error(`Element with id "${id}" not found`);
    }

    // Ensure the replacement uses the same ID
    if (element.id !== id) {
      throw new Error(`Replacement element ID must match original ID "${id}"`);
    }

    // Remove old and add new
    this._state.removeElement(id);
    this._state.addElement(element);

    // Save history after mutation (current state goes on stack)
    this._history.push(this._state.snapshot());

    // Emit events
    this.emit('element:updated', { id, element });
    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });
  }

  /**
   * Gets an element by ID
   *
   * @param id - Element ID to find
   * @returns The element or undefined if not found
   */
  getElement(id: string): BaseElement | undefined {
    return this._state.getElement(id);
  }

  /**
   * Gets all elements
   *
   * @returns Array of all elements
   */
  getAllElements(): BaseElement[] {
    return this._state.getAllElements();
  }

  /**
   * Gets elements by type
   *
   * @param type - Element type to filter by
   * @returns Array of elements matching the type
   */
  getElementsByType(type: BaseElement['type']): BaseElement[] {
    return this._state.getAllElements().filter((element) => element.type === type);
  }

  /**
   * Gets elements within a bounding box
   *
   * @param bounds - Bounding box to search within
   * @returns Array of elements within the bounds
   * @throws Error - Not implemented
   */
  getElementsInBounds(_bounds: BoundingBox): BaseElement[] {
    // TODO: Implement spatial query
    throw new Error('Not implemented: SVGComposer.getElementsInBounds');
  }

  // ============================================================
  // Selection
  // ============================================================

  /**
   * Selects one or more elements (replaces current selection)
   *
   * @param id - Element ID or array of IDs to select
   */
  select(id: string | string[]): void {
    const ids = Array.isArray(id) ? id : [id];
    this._state.setSelection(ids);
    this.emit('selection:changed', { selectedIds: this._state.getSelection() });
  }

  /**
   * Adds elements to the current selection
   *
   * @param id - Element ID or array of IDs to add to selection
   */
  addToSelection(id: string | string[]): void {
    const idsToAdd = Array.isArray(id) ? id : [id];
    const currentSelection = this._state.getSelection();
    const newSelection = [...new Set([...currentSelection, ...idsToAdd])];
    this._state.setSelection(newSelection);
    this.emit('selection:changed', { selectedIds: this._state.getSelection() });
  }

  /**
   * Removes elements from the current selection
   *
   * @param id - Element ID or array of IDs to remove from selection
   */
  removeFromSelection(id: string | string[]): void {
    const idsToRemove = Array.isArray(id) ? id : [id];
    const idsToRemoveSet = new Set(idsToRemove);
    const currentSelection = this._state.getSelection();
    const newSelection = currentSelection.filter((selectedId) => !idsToRemoveSet.has(selectedId));
    this._state.setSelection(newSelection);
    this.emit('selection:changed', { selectedIds: this._state.getSelection() });
  }

  /**
   * Clears the current selection
   */
  clearSelection(): void {
    this._state.setSelection([]);
    this.emit('selection:changed', { selectedIds: [] });
  }

  /**
   * Gets the currently selected elements
   *
   * @returns Array of selected elements
   */
  getSelected(): BaseElement[] {
    return this._state
      .getSelection()
      .map((id) => this._state.getElement(id))
      .filter((element): element is BaseElement => element !== undefined);
  }

  /**
   * Selects all visible, unlocked elements
   */
  selectAll(): void {
    const selectableIds = this._state
      .getAllElements()
      .filter((element) => element.visible && !element.locked)
      .map((element) => element.id);
    this._state.setSelection(selectableIds);
    this.emit('selection:changed', { selectedIds: this._state.getSelection() });
  }

  // ============================================================
  // Transforms
  // ============================================================

  /**
   * Moves an element relative to its current position
   *
   * @param id - Element ID to move
   * @param dx - Delta X in viewBox units
   * @param dy - Delta Y in viewBox units
   * @throws Error - Not implemented
   */
  moveElement(_id: string, _dx: number, _dy: number): void {
    // TODO: Implement relative move
    throw new Error('Not implemented: SVGComposer.moveElement');
  }

  /**
   * Sets an element's absolute position
   *
   * @param id - Element ID to position
   * @param x - Absolute X in viewBox units
   * @param y - Absolute Y in viewBox units
   * @throws Error - Not implemented
   */
  setPosition(_id: string, _x: number, _y: number): void {
    // TODO: Implement absolute positioning
    throw new Error('Not implemented: SVGComposer.setPosition');
  }

  /**
   * Rotates an element around its center
   *
   * @param id - Element ID to rotate
   * @param degrees - Rotation angle in degrees
   * @throws Error - Not implemented
   */
  rotateElement(_id: string, _degrees: number): void {
    // TODO: Implement rotation
    throw new Error('Not implemented: SVGComposer.rotateElement');
  }

  /**
   * Scales an element from its center
   *
   * @param id - Element ID to scale
   * @param scaleX - X scale factor
   * @param scaleY - Y scale factor
   * @throws Error - Not implemented
   */
  scaleElement(_id: string, _scaleX: number, _scaleY: number): void {
    // TODO: Implement scaling
    throw new Error('Not implemented: SVGComposer.scaleElement');
  }

  /**
   * Resets an element's transform to default
   *
   * @param id - Element ID to reset
   * @throws Error - Not implemented
   */
  resetTransform(_id: string): void {
    // TODO: Implement transform reset
    throw new Error('Not implemented: SVGComposer.resetTransform');
  }

  // ============================================================
  // Z-Order
  // ============================================================

  /**
   * Brings an element to the front (highest z-index)
   *
   * @param id - Element ID
   * @throws Error - Not implemented
   */
  bringToFront(_id: string): void {
    // TODO: Implement bring to front
    throw new Error('Not implemented: SVGComposer.bringToFront');
  }

  /**
   * Sends an element to the back (lowest z-index)
   *
   * @param id - Element ID
   * @throws Error - Not implemented
   */
  sendToBack(_id: string): void {
    // TODO: Implement send to back
    throw new Error('Not implemented: SVGComposer.sendToBack');
  }

  /**
   * Moves an element up one level in z-order
   *
   * @param id - Element ID
   * @throws Error - Not implemented
   */
  bringForward(_id: string): void {
    // TODO: Implement bring forward
    throw new Error('Not implemented: SVGComposer.bringForward');
  }

  /**
   * Moves an element down one level in z-order
   *
   * @param id - Element ID
   * @throws Error - Not implemented
   */
  sendBackward(_id: string): void {
    // TODO: Implement send backward
    throw new Error('Not implemented: SVGComposer.sendBackward');
  }

  /**
   * Sets an element's z-index directly
   *
   * @param id - Element ID
   * @param zIndex - New z-index value
   * @throws Error - Not implemented
   */
  setZIndex(_id: string, _zIndex: number): void {
    // TODO: Implement z-index setter
    throw new Error('Not implemented: SVGComposer.setZIndex');
  }

  // ============================================================
  // History
  // ============================================================

  /**
   * Undoes the last operation
   */
  undo(): void {
    const previousState = this._history.undo();
    if (previousState) {
      this._state.restore(previousState);
      this.emit('state:changed', { state: this._state.state });
      this.emit('selection:changed', { selectedIds: this._state.getSelection() });
      this.emit('history:changed', {
        canUndo: this._history.canUndo(),
        canRedo: this._history.canRedo(),
      });
    }
  }

  /**
   * Redoes the last undone operation
   */
  redo(): void {
    const nextState = this._history.redo();
    if (nextState) {
      this._state.restore(nextState);
      this.emit('state:changed', { state: this._state.state });
      this.emit('selection:changed', { selectedIds: this._state.getSelection() });
      this.emit('history:changed', {
        canUndo: this._history.canUndo(),
        canRedo: this._history.canRedo(),
      });
    }
  }

  /**
   * Checks if undo is available
   *
   * @returns True if there are operations to undo
   */
  canUndo(): boolean {
    return this._history.canUndo();
  }

  /**
   * Checks if redo is available
   *
   * @returns True if there are operations to redo
   */
  canRedo(): boolean {
    return this._history.canRedo();
  }

  /**
   * Clears all history
   */
  clearHistory(): void {
    this._history.clear();
    // Re-push current state as the new baseline
    this._history.push(this._state.snapshot());
    this.emit('history:changed', { canUndo: false, canRedo: false });
  }

  /**
   * Gets the current history size
   *
   * @returns Number of history entries
   */
  getHistorySize(): number {
    return this._history.size();
  }

  // ============================================================
  // Clipping
  // ============================================================

  /**
   * Adds a clip path to an element
   *
   * @param elementId - Element ID to apply clip to
   * @param clipPath - Clip path definition (id will be auto-generated)
   * @returns The generated clip path ID
   * @throws Error - Not implemented
   */
  addClipPath(_elementId: string, _clipPath: Omit<ClipPath, 'id'>): string {
    // TODO: Implement clip path addition
    throw new Error('Not implemented: SVGComposer.addClipPath');
  }

  /**
   * Removes a clip path from an element
   *
   * @param elementId - Element ID to remove clip from
   * @throws Error - Not implemented
   */
  removeClipPath(_elementId: string): void {
    // TODO: Implement clip path removal
    throw new Error('Not implemented: SVGComposer.removeClipPath');
  }

  /**
   * Updates a clip path definition
   *
   * @param elementId - Element ID with the clip path
   * @param updates - Partial clip path properties to update
   * @throws Error - Not implemented
   */
  updateClipPath(_elementId: string, _updates: Partial<ClipPath>): void {
    // TODO: Implement clip path update
    throw new Error('Not implemented: SVGComposer.updateClipPath');
  }

  // ============================================================
  // Export/Import
  // ============================================================

  /**
   * Exports the canvas as SVG markup
   *
   * @returns Clean SVG markup string
   * @throws Error - Not implemented
   */
  toSVG(): string {
    // TODO: Implement SVG export
    throw new Error('Not implemented: SVGComposer.toSVG');
  }

  /**
   * Exports the canvas state as JSON
   *
   * @returns JSON string representation of state
   * @throws Error - Not implemented
   */
  toJSON(): string {
    // TODO: Implement JSON export
    throw new Error('Not implemented: SVGComposer.toJSON');
  }

  /**
   * Restores canvas state from JSON
   *
   * @param json - JSON string to restore from
   * @throws Error - Not implemented
   */
  fromJSON(_json: string): void {
    // TODO: Implement JSON import
    throw new Error('Not implemented: SVGComposer.fromJSON');
  }

  /**
   * Clears all elements from the canvas
   *
   * @throws Error - Not implemented
   */
  clear(): void {
    // TODO: Implement clear
    throw new Error('Not implemented: SVGComposer.clear');
  }

  // ============================================================
  // Tools & Interaction
  // ============================================================

  /**
   * Sets the current tool
   *
   * @param tool - Tool type to activate
   * @throws Error - Not implemented
   */
  setTool(_tool: ToolType): void {
    // TODO: Implement tool setter
    throw new Error('Not implemented: SVGComposer.setTool');
  }

  /**
   * Gets the current tool
   *
   * @returns Current tool type
   */
  getTool(): ToolType {
    return this._currentTool;
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  /**
   * Forces a re-render of the canvas
   *
   * @throws Error - Not implemented
   */
  render(): void {
    // TODO: Implement render
    throw new Error('Not implemented: SVGComposer.render');
  }

  /**
   * Destroys the editor and cleans up resources
   *
   * @throws Error - Not implemented
   */
  destroy(): void {
    // TODO: Implement cleanup
    // Should remove event listeners, clear DOM, etc.
    this._destroyed = true;
    throw new Error('Not implemented: SVGComposer.destroy');
  }

  /**
   * Checks if the editor has been destroyed
   */
  get isDestroyed(): boolean {
    return this._destroyed;
  }
}
