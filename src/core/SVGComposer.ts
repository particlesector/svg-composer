/**
 * Main SVG Composer editor class
 */

import type { SVGComposerOptions, ToolType, BoundingBox, CanvasState, Transform } from './types.js';
import type {
  BaseElement,
  ClipPath,
  ImageElement,
  TextElement,
  ShapeElement,
  GroupElement,
} from '../elements/types.js';
import { State, DEFAULT_OPTIONS } from './State.js';
import { History } from './History.js';
import { EditorEventEmitter } from './EventEmitter.js';
import { generateId } from '../utils/IdGenerator.js';
import { SVGRenderer } from '../rendering/SVGRenderer.js';

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
  private readonly _renderer: SVGRenderer;
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
    this._renderer = new SVGRenderer();
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
   * @returns Array of elements that intersect with the bounds
   */
  getElementsInBounds(bounds: BoundingBox): BaseElement[] {
    const elements = this._state.getAllElements();
    return elements.filter((el) => {
      const box = this._getElementBounds(el);
      return box !== null && this._boundsIntersect(bounds, box);
    });
  }

  /**
   * Calculates the bounding box for an element
   */
  private _getElementBounds(element: BaseElement): BoundingBox | null {
    const t = element.transform;

    switch (element.type) {
      case 'image': {
        const el = element as ImageElement;
        return { x: t.x, y: t.y, width: el.width, height: el.height };
      }
      case 'text': {
        const el = element as TextElement;
        // Approximate text bounds using fontSize and content length
        const approxWidth = el.content.length * el.fontSize * 0.6;
        return { x: t.x, y: t.y - el.fontSize, width: approxWidth, height: el.fontSize };
      }
      case 'shape': {
        const el = element as ShapeElement;
        return this._getShapeBounds(el, t);
      }
      case 'group': {
        const el = element as GroupElement;
        return this._getGroupBounds(el);
      }
      default:
        return null;
    }
  }

  /**
   * Calculates the bounding box for a shape element
   */
  private _getShapeBounds(el: ShapeElement, t: Transform): BoundingBox | null {
    switch (el.shapeType) {
      case 'rect':
        return { x: t.x, y: t.y, width: el.width ?? 0, height: el.height ?? 0 };
      case 'circle': {
        const r = el.r ?? 0;
        return { x: t.x - r, y: t.y - r, width: r * 2, height: r * 2 };
      }
      case 'ellipse': {
        const rx = el.rx ?? 0;
        const ry = el.ry ?? 0;
        return { x: t.x - rx, y: t.y - ry, width: rx * 2, height: ry * 2 };
      }
      case 'path':
        // Path bounds would require parsing the path data - skip for now
        return null;
      default:
        return null;
    }
  }

  /**
   * Calculates the bounding box for a group element (union of children)
   */
  private _getGroupBounds(group: GroupElement): BoundingBox | null {
    if (group.children.length === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const childId of group.children) {
      const child = this._state.getElement(childId);
      if (child === undefined) {
        continue;
      }
      const childBounds = this._getElementBounds(child);
      if (childBounds === null) {
        continue;
      }

      minX = Math.min(minX, childBounds.x);
      minY = Math.min(minY, childBounds.y);
      maxX = Math.max(maxX, childBounds.x + childBounds.width);
      maxY = Math.max(maxY, childBounds.y + childBounds.height);
    }

    if (minX === Infinity) {
      return null;
    }

    // Apply group transform offset
    const t = group.transform;
    return { x: minX + t.x, y: minY + t.y, width: maxX - minX, height: maxY - minY };
  }

  /**
   * Tests if two bounding boxes intersect (AABB collision)
   */
  private _boundsIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return !(
      a.x > b.x + b.width ||
      a.x + a.width < b.x ||
      a.y > b.y + b.height ||
      a.y + a.height < b.y
    );
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
   * @throws Error if element does not exist
   */
  moveElement(id: string, dx: number, dy: number): void {
    const element = this._state.getElement(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }
    this.updateElement(id, {
      transform: {
        ...element.transform,
        x: element.transform.x + dx,
        y: element.transform.y + dy,
      },
    });
  }

  /**
   * Sets an element's absolute position
   *
   * @param id - Element ID to position
   * @param x - Absolute X in viewBox units
   * @param y - Absolute Y in viewBox units
   * @throws Error if element does not exist
   */
  setPosition(id: string, x: number, y: number): void {
    const element = this._state.getElement(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }
    this.updateElement(id, {
      transform: {
        ...element.transform,
        x,
        y,
      },
    });
  }

  /**
   * Rotates an element around its center
   *
   * @param id - Element ID to rotate
   * @param degrees - Rotation angle in degrees
   * @throws Error if element does not exist
   */
  rotateElement(id: string, degrees: number): void {
    const element = this._state.getElement(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }
    this.updateElement(id, {
      transform: {
        ...element.transform,
        rotation: degrees,
      },
    });
  }

  /**
   * Scales an element from its center
   *
   * @param id - Element ID to scale
   * @param scaleX - X scale factor
   * @param scaleY - Y scale factor
   * @throws Error if element does not exist
   */
  scaleElement(id: string, scaleX: number, scaleY: number): void {
    const element = this._state.getElement(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }
    this.updateElement(id, {
      transform: {
        ...element.transform,
        scaleX,
        scaleY,
      },
    });
  }

  /**
   * Resets an element's transform to default
   *
   * @param id - Element ID to reset
   * @throws Error if element does not exist
   */
  resetTransform(id: string): void {
    const element = this._state.getElement(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }
    this.updateElement(id, {
      transform: {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
    });
  }

  // ============================================================
  // Z-Order
  // ============================================================

  /**
   * Gets the minimum and maximum zIndex values among all elements
   *
   * @returns Object with min and max zIndex values
   */
  private _getZIndexBounds(): { min: number; max: number } {
    const elements = this._state.getAllElements();
    if (elements.length === 0) {
      return { min: 0, max: 0 };
    }
    const zIndexes = elements.map((el) => el.zIndex);
    return {
      min: Math.min(...zIndexes),
      max: Math.max(...zIndexes),
    };
  }

  /**
   * Brings an element to the front (highest z-index)
   *
   * @param id - Element ID
   * @throws Error if element does not exist
   */
  bringToFront(id: string): void {
    const element = this._state.getElement(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }

    const { max } = this._getZIndexBounds();
    if (element.zIndex < max) {
      this.updateElement(id, { zIndex: max + 1 });
    }
    // If already at front, do nothing (no history entry)
  }

  /**
   * Sends an element to the back (lowest z-index)
   *
   * @param id - Element ID
   * @throws Error if element does not exist
   */
  sendToBack(id: string): void {
    const element = this._state.getElement(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }

    const { min } = this._getZIndexBounds();
    if (element.zIndex > min) {
      this.updateElement(id, { zIndex: min - 1 });
    }
    // If already at back, do nothing (no history entry)
  }

  /**
   * Moves an element up one level in z-order
   *
   * @param id - Element ID
   * @throws Error if element does not exist
   */
  bringForward(id: string): void {
    const element = this._state.getElement(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }

    // Find element with next higher zIndex
    const elements = this._state.getAllElements();
    const nextHigher = elements
      .filter((el) => el.zIndex > element.zIndex)
      .sort((a, b) => a.zIndex - b.zIndex)[0];

    if (nextHigher) {
      // Swap zIndexes
      const tempZ = element.zIndex;
      this._state.updateElement(id, { zIndex: nextHigher.zIndex });
      this._state.updateElement(nextHigher.id, { zIndex: tempZ });
      this._history.push(this._state.snapshot());

      // Emit events for both elements
      const updatedElement = this._state.getElement(id);
      const updatedOther = this._state.getElement(nextHigher.id);
      if (updatedElement) {
        this.emit('element:updated', { id, element: updatedElement });
      }
      if (updatedOther) {
        this.emit('element:updated', { id: nextHigher.id, element: updatedOther });
      }
      this.emit('state:changed', { state: this._state.state });
      this.emit('history:changed', {
        canUndo: this._history.canUndo(),
        canRedo: this._history.canRedo(),
      });
    }
    // If already at front, do nothing
  }

  /**
   * Moves an element down one level in z-order
   *
   * @param id - Element ID
   * @throws Error if element does not exist
   */
  sendBackward(id: string): void {
    const element = this._state.getElement(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }

    // Find element with next lower zIndex
    const elements = this._state.getAllElements();
    const nextLower = elements
      .filter((el) => el.zIndex < element.zIndex)
      .sort((a, b) => b.zIndex - a.zIndex)[0];

    if (nextLower) {
      // Swap zIndexes
      const tempZ = element.zIndex;
      this._state.updateElement(id, { zIndex: nextLower.zIndex });
      this._state.updateElement(nextLower.id, { zIndex: tempZ });
      this._history.push(this._state.snapshot());

      // Emit events for both elements
      const updatedElement = this._state.getElement(id);
      const updatedOther = this._state.getElement(nextLower.id);
      if (updatedElement) {
        this.emit('element:updated', { id, element: updatedElement });
      }
      if (updatedOther) {
        this.emit('element:updated', { id: nextLower.id, element: updatedOther });
      }
      this.emit('state:changed', { state: this._state.state });
      this.emit('history:changed', {
        canUndo: this._history.canUndo(),
        canRedo: this._history.canRedo(),
      });
    }
    // If already at back, do nothing
  }

  /**
   * Sets an element's z-index directly
   *
   * @param id - Element ID
   * @param zIndex - New z-index value
   * @throws Error if element does not exist
   */
  setZIndex(id: string, zIndex: number): void {
    this.updateElement(id, { zIndex });
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
   * @throws Error if element not found
   */
  addClipPath(elementId: string, clipPath: Omit<ClipPath, 'id'>): string {
    const element = this._state.getElement(elementId);
    if (element === undefined) {
      throw new Error(`Element not found: ${elementId}`);
    }

    const id = generateId();
    const fullClipPath: ClipPath = { ...clipPath, id };

    this._state.updateElement(elementId, { clipPath: fullClipPath });
    this._history.push(this._state.snapshot());

    const updatedElement = this._state.getElement(elementId);
    if (updatedElement !== undefined) {
      this.emit('element:updated', { id: elementId, element: updatedElement });
    }
    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });

    return id;
  }

  /**
   * Removes a clip path from an element
   *
   * @param elementId - Element ID to remove clip from
   * @throws Error if element not found or has no clip path
   */
  removeClipPath(elementId: string): void {
    const element = this._state.getElement(elementId);
    if (element === undefined) {
      throw new Error(`Element not found: ${elementId}`);
    }
    if (element.clipPath === undefined) {
      throw new Error(`Element has no clip path: ${elementId}`);
    }

    // Create element copy without clipPath property and replace in state
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { clipPath: _removed, ...elementWithoutClip } = element;
    this._state.state.elements.set(elementId, elementWithoutClip as BaseElement);
    this._history.push(this._state.snapshot());

    const updatedElement = this._state.getElement(elementId);
    if (updatedElement !== undefined) {
      this.emit('element:updated', { id: elementId, element: updatedElement });
    }
    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });
  }

  /**
   * Updates a clip path definition
   *
   * @param elementId - Element ID with the clip path
   * @param updates - Partial clip path properties to update
   * @throws Error if element not found or has no clip path
   */
  updateClipPath(elementId: string, updates: Partial<ClipPath>): void {
    const element = this._state.getElement(elementId);
    if (element === undefined) {
      throw new Error(`Element not found: ${elementId}`);
    }
    if (element.clipPath === undefined) {
      throw new Error(`Element has no clip path: ${elementId}`);
    }

    // Merge updates but preserve the original ID
    const updatedClipPath: ClipPath = {
      ...element.clipPath,
      ...updates,
      id: element.clipPath.id,
    };

    this._state.updateElement(elementId, { clipPath: updatedClipPath });
    this._history.push(this._state.snapshot());

    const updatedElement = this._state.getElement(elementId);
    if (updatedElement !== undefined) {
      this.emit('element:updated', { id: elementId, element: updatedElement });
    }
    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });
  }

  // ============================================================
  // Export/Import
  // ============================================================

  /**
   * Exports the canvas as SVG markup
   *
   * @returns Clean SVG markup string
   */
  toSVG(): string {
    return this._renderer.toSVG(this._state.state, (id) => this._state.getElement(id));
  }

  /**
   * Exports the canvas state as JSON
   *
   * @returns JSON string representation of state
   */
  toJSON(): string {
    const snapshot = this._state.snapshot();

    // Convert Map to Record (plain object)
    const elements: Record<string, BaseElement> = {};
    for (const [id, element] of snapshot.elements) {
      elements[id] = element;
    }

    // Convert Set to array
    const selectedIds = Array.from(snapshot.selectedIds);

    const serialized = {
      version: 1,
      width: snapshot.width,
      height: snapshot.height,
      backgroundColor: snapshot.backgroundColor,
      elements,
      selectedIds,
    };

    return JSON.stringify(serialized);
  }

  /**
   * Restores canvas state from JSON
   *
   * @param json - JSON string to restore from
   */
  fromJSON(json: string): void {
    const parsed = JSON.parse(json) as {
      version: number;
      width: number;
      height: number;
      backgroundColor: string;
      elements: Record<string, BaseElement>;
      selectedIds: string[];
    };

    // Convert Record back to Map
    const elements = new Map<string, BaseElement>();
    for (const [id, element] of Object.entries(parsed.elements)) {
      elements.set(id, element);
    }

    // Convert array back to Set
    const selectedIds = new Set<string>(parsed.selectedIds);

    const canvasState: CanvasState = {
      width: parsed.width,
      height: parsed.height,
      backgroundColor: parsed.backgroundColor,
      elements,
      selectedIds,
    };

    // Restore state
    this._state.restore(canvasState);

    // Clear history and set new baseline
    this._history.clear();
    this._history.push(this._state.snapshot());

    // Emit events
    this.emit('state:changed', { state: this._state.state });
    this.emit('selection:changed', { selectedIds: Array.from(selectedIds) });
    this.emit('history:changed', { canUndo: false, canRedo: false });
  }

  /**
   * Clears all elements from the canvas
   */
  clear(): void {
    const allElements = this._state.getAllElements();

    if (allElements.length === 0) {
      return; // Nothing to clear
    }

    // Remove all elements (also clears selection)
    for (const element of allElements) {
      this._state.removeElement(element.id);
      this.emit('element:removed', { id: element.id });
    }

    // Save history after batch mutation
    this._history.push(this._state.snapshot());

    // Emit events
    this.emit('selection:changed', { selectedIds: [] });
    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });
  }

  // ============================================================
  // Tools & Interaction
  // ============================================================

  /**
   * Sets the current tool
   *
   * @param tool - Tool type to activate
   */
  setTool(tool: ToolType): void {
    this._currentTool = tool;
    this.emit('tool:changed', { tool });
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
   * @throws Error if editor has been destroyed
   */
  render(): void {
    if (this._destroyed) {
      throw new Error('Cannot render: editor has been destroyed');
    }
    this._renderer.render(this._container, this._state.state, (id) => this._state.getElement(id));
  }

  /**
   * Destroys the editor and cleans up resources
   *
   * @remarks
   * This method is idempotent - calling it multiple times is safe.
   * After calling destroy, the editor cannot be used and render() will throw.
   */
  destroy(): void {
    if (this._destroyed) {
      return; // Already destroyed, idempotent
    }

    // Clean up renderer
    this._renderer.destroy();

    // Reset state to empty (no events emitted)
    this._state.restore({
      width: this._state.state.width,
      height: this._state.state.height,
      backgroundColor: this._state.state.backgroundColor,
      elements: new Map(),
      selectedIds: new Set(),
    });

    // Clear history
    this._history.clear();

    // Mark as destroyed
    this._destroyed = true;
  }

  /**
   * Checks if the editor has been destroyed
   */
  get isDestroyed(): boolean {
    return this._destroyed;
  }
}
