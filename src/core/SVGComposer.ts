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
   */
  toSVG(): string {
    const state = this._state.state;
    const elements = this._state
      .getAllElements()
      .filter((el) => el.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    const svgElements = elements.map((el) => this._elementToSVG(el)).join('\n  ');
    const viewBox = `0 0 ${String(state.width)} ${String(state.height)}`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <rect width="100%" height="100%" fill="${state.backgroundColor}" />
  ${svgElements}
</svg>`;
  }

  /**
   * Converts an element to SVG markup
   */
  private _elementToSVG(element: BaseElement): string {
    const transform = this._buildTransformAttr(element.transform);
    const opacity = element.opacity !== 1 ? ` opacity="${String(element.opacity)}"` : '';

    switch (element.type) {
    case 'image': {
      const el = element as ImageElement;
      const w = String(el.width);
      const h = String(el.height);
      return `<image href="${el.src}" width="${w}" height="${h}"${transform}${opacity} />`;
    }
    case 'text': {
      const el = element as TextElement;
      const fs = String(el.fontSize);
      const content = this._escapeXml(el.content);
      return `<text font-size="${fs}" font-family="${el.fontFamily}" ` +
        `fill="${el.fill}" text-anchor="${el.textAnchor}"${transform}${opacity}>` +
        `${content}</text>`;
    }
    case 'shape': {
      const el = element as ShapeElement;
      return this._shapeToSVG(el, transform, opacity);
    }
    case 'group': {
      const el = element as GroupElement;
      const children = el.children
        .map((id) => {
          const child = this._state.getElement(id);
          return child ? this._elementToSVG(child) : '';
        })
        .filter((s) => s !== '')
        .join('');
      return `<g${transform}${opacity}>${children}</g>`;
    }
    default:
      return '';
    }
  }

  /**
   * Builds a transform attribute string from a Transform object
   */
  private _buildTransformAttr(t: Transform): string {
    const transforms: string[] = [];
    if (t.x !== 0 || t.y !== 0) {
      transforms.push(`translate(${String(t.x)}, ${String(t.y)})`);
    }
    if (t.rotation !== 0) {
      transforms.push(`rotate(${String(t.rotation)})`);
    }
    if (t.scaleX !== 1 || t.scaleY !== 1) {
      transforms.push(`scale(${String(t.scaleX)}, ${String(t.scaleY)})`);
    }
    return transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
  }

  /**
   * Converts a ShapeElement to SVG markup
   */
  private _shapeToSVG(el: ShapeElement, transform: string, opacity: string): string {
    const sw = String(el.strokeWidth);
    const common = `fill="${el.fill}" stroke="${el.stroke}" stroke-width="${sw}"` +
      `${transform}${opacity}`;
    switch (el.shapeType) {
    case 'rect': {
      const w = String(el.width ?? 0);
      const h = String(el.height ?? 0);
      const rx = el.rx !== undefined && el.rx !== 0 ? ` rx="${String(el.rx)}"` : '';
      return `<rect width="${w}" height="${h}"${rx} ${common} />`;
    }
    case 'circle':
      return `<circle r="${String(el.r ?? 0)}" ${common} />`;
    case 'ellipse':
      return `<ellipse rx="${String(el.rx ?? 0)}" ry="${String(el.ry ?? 0)}" ${common} />`;
    case 'path':
      return `<path d="${el.path ?? ''}" ${common} />`;
    default:
      return '';
    }
  }

  /**
   * Escapes special XML characters in a string
   */
  private _escapeXml(str: string): string {
    return str.replace(/[<>&'"]/g, (c) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
      };
      return escapeMap[c] ?? c;
    });
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
