/**
 * Main SVG Composer editor class
 */

import type {
  SVGComposerOptions,
  ToolType,
  BoundingBox,
  CanvasState,
  Transform,
  Guide,
  GuideInput,
  GuideOrientation,
  SnappingConfig,
  SnapResult,
  AlignmentOptions,
} from './types.js';
import { DEFAULT_SNAPPING_CONFIG } from './types.js';
import {
  alignLeft as alignLeftUtil,
  alignRight as alignRightUtil,
  alignTop as alignTopUtil,
  alignBottom as alignBottomUtil,
  alignCenterHorizontal as alignCenterHorizontalUtil,
  alignCenterVertical as alignCenterVerticalUtil,
  alignCenter as alignCenterUtil,
  distributeLeft as distributeLeftUtil,
  distributeCenterHorizontal as distributeCenterHorizontalUtil,
  distributeRight as distributeRightUtil,
  distributeTop as distributeTopUtil,
  distributeCenterVertical as distributeCenterVerticalUtil,
  distributeBottom as distributeBottomUtil,
  distributeHorizontalGaps as distributeHorizontalGapsUtil,
  distributeVerticalGaps as distributeVerticalGapsUtil,
  type ElementBounds,
  type AlignmentResult,
} from '../utils/AlignmentUtils.js';
import type {
  BaseElement,
  ClipPath,
  ImageElement,
  TextElement,
  ShapeElement,
  GroupElement,
} from '../elements/types.js';
import type { FilterDefinition, EffectPreset, ElementFilter } from '../filters/types.js';
import { State, DEFAULT_OPTIONS } from './State.js';
import { History } from './History.js';
import { EditorEventEmitter } from './EventEmitter.js';
import { generateId } from '../utils/IdGenerator.js';
import { getPathBoundingBox } from '../utils/PathParser.js';
import { SVGRenderer } from '../rendering/SVGRenderer.js';
import { InteractionManager } from '../interaction/InteractionManager.js';
import { SelectTool } from '../interaction/tools/SelectTool.js';
import { PanTool } from '../interaction/tools/PanTool.js';
import { AddShapeTool } from '../interaction/tools/AddShapeTool.js';
import { AddTextTool } from '../interaction/tools/AddTextTool.js';
import { AddImageTool } from '../interaction/tools/AddImageTool.js';
import { SnappingManager } from '../interaction/SnappingManager.js';
import { FilterManager } from '../filters/FilterManager.js';

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
  private readonly _snappingManager: SnappingManager;
  private readonly _filterManager: FilterManager;
  private _interactionManager: InteractionManager | null = null;
  private _currentTool: ToolType = 'select';
  private _destroyed = false;
  private _interactionInitialized = false;

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
    this._snappingManager = new SnappingManager(DEFAULT_SNAPPING_CONFIG);
    this._filterManager = new FilterManager();
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
   * Adds an element to the canvas.
   *
   * Creates a new element with an auto-generated ID and adds it to the canvas.
   * This method automatically creates a history entry for undo/redo support.
   *
   * @param element - Element properties (id will be auto-generated)
   * @returns The generated element ID
   *
   * @see {@link removeElement} to remove an element
   * @see {@link updateElement} to modify an existing element
   *
   * @example Add an image element
   * ```typescript
   * const imageId = editor.addElement({
   *   type: 'image',
   *   src: 'https://example.com/photo.jpg',
   *   width: 400,
   *   height: 300,
   *   transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
   *   opacity: 1,
   *   zIndex: 1,
   *   locked: false,
   *   visible: true
   * });
   * ```
   *
   * @example Add a text element
   * ```typescript
   * const textId = editor.addElement({
   *   type: 'text',
   *   content: 'Hello World',
   *   fontSize: 48,
   *   fontFamily: 'Arial',
   *   fill: '#000000',
   *   textAnchor: 'start',
   *   transform: { x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
   *   opacity: 1,
   *   zIndex: 2,
   *   locked: false,
   *   visible: true
   * });
   * ```
   *
   * @example Add a shape element (rectangle)
   * ```typescript
   * const rectId = editor.addElement({
   *   type: 'shape',
   *   shapeType: 'rect',
   *   width: 200,
   *   height: 150,
   *   fill: '#3498db',
   *   stroke: '#2980b9',
   *   strokeWidth: 2,
   *   transform: { x: 50, y: 50, rotation: 0, scaleX: 1, scaleY: 1 },
   *   opacity: 1,
   *   zIndex: 0,
   *   locked: false,
   *   visible: true
   * });
   * ```
   *
   * @example Add a circle shape
   * ```typescript
   * const circleId = editor.addElement({
   *   type: 'shape',
   *   shapeType: 'circle',
   *   r: 50,
   *   fill: '#e74c3c',
   *   transform: { x: 300, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
   *   opacity: 1,
   *   zIndex: 3,
   *   locked: false,
   *   visible: true
   * });
   * ```
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
   * Removes an element from the canvas.
   *
   * Removes the specified element and clears it from the selection if selected.
   * Creates a history entry for undo/redo support.
   *
   * @param id - Element ID to remove
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link removeElements} to remove multiple elements
   * @see {@link addElement} to add elements
   * @see {@link clear} to remove all elements
   *
   * @example Remove a single element
   * ```typescript
   * editor.removeElement(imageId);
   * ```
   *
   * @example Remove selected element
   * ```typescript
   * const selected = editor.getSelection();
   * if (selected.length === 1) {
   *   editor.removeElement(selected[0]);
   * }
   * ```
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
   * Removes multiple elements from the canvas.
   *
   * Efficiently removes multiple elements in a single operation,
   * creating only one history entry for all removals.
   *
   * @param ids - Array of element IDs to remove (non-existent IDs are ignored)
   *
   * @see {@link removeElement} to remove a single element
   * @see {@link clear} to remove all elements
   *
   * @example Remove all selected elements
   * ```typescript
   * const selected = editor.getSelection();
   * editor.removeElements(selected);
   * ```
   *
   * @example Remove specific elements
   * ```typescript
   * editor.removeElements([id1, id2, id3]);
   * ```
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
   * Updates an element's properties.
   *
   * Merges the provided updates with the existing element properties.
   * Creates a history entry for undo/redo support.
   *
   * @param id - Element ID to update
   * @param updates - Partial element properties to merge with existing
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link updateElementSilent} for updates without history entry
   * @see {@link replaceElement} to replace an element entirely
   *
   * @example Update element opacity
   * ```typescript
   * editor.updateElement(imageId, { opacity: 0.5 });
   * ```
   *
   * @example Update element transform
   * ```typescript
   * const element = editor.getElement(imageId);
   * editor.updateElement(imageId, {
   *   transform: {
   *     ...element.transform,
   *     rotation: 45
   *   }
   * });
   * ```
   *
   * @example Lock an element
   * ```typescript
   * editor.updateElement(imageId, { locked: true });
   * ```
   *
   * @example Update text content
   * ```typescript
   * editor.updateElement(textId, {
   *   content: 'New text content',
   *   fill: '#ff0000'
   * });
   * ```
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
   * Updates an element's properties without creating a history entry.
   *
   * Use this for intermediate updates during drag/resize/rotate operations
   * to avoid flooding the history stack. Call `pushHistory()` when the
   * operation completes to create a single undo point.
   *
   * @param id - Element ID to update
   * @param updates - Partial element properties to update
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link pushHistory} to commit changes to history
   * @see {@link updateElement} for updates with automatic history entry
   *
   * @example Drag operation pattern
   * ```typescript
   * // During drag (many rapid updates)
   * function onDragMove(dx: number, dy: number) {
   *   const element = editor.getElement(draggedId);
   *   editor.updateElementSilent(draggedId, {
   *     transform: {
   *       ...element.transform,
   *       x: element.transform.x + dx,
   *       y: element.transform.y + dy
   *     }
   *   });
   *   editor.render();
   * }
   *
   * // On drag end (single history entry)
   * function onDragEnd() {
   *   editor.pushHistory();
   * }
   * ```
   *
   * @example Resize operation pattern
   * ```typescript
   * // During resize
   * editor.updateElementSilent(elementId, {
   *   transform: { ...transform, scaleX: newScaleX, scaleY: newScaleY }
   * });
   *
   * // On resize end
   * editor.pushHistory();
   * ```
   */
  updateElementSilent(id: string, updates: Partial<BaseElement>): void {
    // Verify element exists
    if (!this._state.getElement(id)) {
      throw new Error(`Element with id "${id}" not found`);
    }

    // Update element without pushing to history
    this._state.updateElement(id, updates);

    // Get updated element for event
    const updatedElement = this._state.getElement(id);
    if (!updatedElement) {
      throw new Error(`Element with id "${id}" unexpectedly missing after update`);
    }

    // Emit element update event but NOT history:changed
    this.emit('element:updated', { id, element: updatedElement });
    this.emit('state:changed', { state: this._state.state });
  }

  /**
   * Pushes the current state to history.
   *
   * Creates a single history entry for the current state. Call this after
   * a series of `updateElementSilent()` calls to create one undo point
   * for the entire operation.
   *
   * @see {@link updateElementSilent} for updates without automatic history
   * @see {@link undo} to revert to previous state
   * @see {@link redo} to re-apply reverted changes
   *
   * @example Complete a drag operation
   * ```typescript
   * // Multiple silent updates during drag...
   * editor.updateElementSilent(id, { transform: { ...t1 } });
   * editor.updateElementSilent(id, { transform: { ...t2 } });
   * editor.updateElementSilent(id, { transform: { ...t3 } });
   *
   * // Single history entry for the entire drag
   * editor.pushHistory();
   * // Now Ctrl+Z undoes the entire drag, not individual moves
   * ```
   */
  pushHistory(): void {
    this._history.push(this._state.snapshot());
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });
  }

  /**
   * Replaces an element entirely with new data.
   *
   * Unlike `updateElement()` which merges properties, this method completely
   * replaces the element. The replacement element must have the same ID.
   *
   * @param id - Element ID to replace
   * @param element - Complete new element data (must have matching ID)
   * @throws {Error} If element with the specified ID does not exist
   * @throws {Error} If replacement element ID does not match the original
   *
   * @see {@link updateElement} for partial updates
   *
   * @example Replace an element completely
   * ```typescript
   * const original = editor.getElement(elementId);
   * const replacement = {
   *   ...original,
   *   type: 'shape',
   *   shapeType: 'circle',
   *   r: 100,
   *   fill: '#ff0000'
   * };
   * editor.replaceElement(elementId, replacement);
   * ```
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
   * Gets an element by ID.
   *
   * @param id - Element ID to find
   * @returns The element or undefined if not found
   *
   * @example Get and inspect an element
   * ```typescript
   * const element = editor.getElement(imageId);
   * if (element) {
   *   console.log('Type:', element.type);
   *   console.log('Position:', element.transform.x, element.transform.y);
   *   console.log('Opacity:', element.opacity);
   * }
   * ```
   *
   * @example Check if element exists
   * ```typescript
   * if (editor.getElement(id)) {
   *   editor.select(id);
   * }
   * ```
   */
  getElement(id: string): BaseElement | undefined {
    return this._state.getElement(id);
  }

  /**
   * Gets all elements on the canvas.
   *
   * @returns Array of all elements (not sorted by z-index)
   *
   * @example Count elements
   * ```typescript
   * const count = editor.getAllElements().length;
   * console.log(`Canvas has ${count} elements`);
   * ```
   *
   * @example Find elements by property
   * ```typescript
   * const locked = editor.getAllElements().filter(el => el.locked);
   * const visible = editor.getAllElements().filter(el => el.visible);
   * ```
   */
  getAllElements(): BaseElement[] {
    return this._state.getAllElements();
  }

  /**
   * Gets elements filtered by type.
   *
   * @param type - Element type to filter by ('image', 'text', 'shape', 'group')
   * @returns Array of elements matching the specified type
   *
   * @example Get all images
   * ```typescript
   * const images = editor.getElementsByType('image');
   * console.log(`Found ${images.length} images`);
   * ```
   *
   * @example Get all text elements
   * ```typescript
   * const textElements = editor.getElementsByType('text');
   * textElements.forEach(text => {
   *   console.log('Text:', text.content);
   * });
   * ```
   *
   * @example Get all shapes
   * ```typescript
   * const shapes = editor.getElementsByType('shape');
   * const circles = shapes.filter(s => s.shapeType === 'circle');
   * ```
   */
  getElementsByType(type: BaseElement['type']): BaseElement[] {
    return this._state.getAllElements().filter((element) => element.type === type);
  }

  /**
   * Gets elements that intersect with a bounding box.
   *
   * Useful for implementing marquee selection or finding elements in a region.
   *
   * @param bounds - Bounding box to search within
   * @returns Array of elements that intersect with the bounds
   *
   * @example Marquee selection
   * ```typescript
   * // After user draws a selection rectangle
   * const selectionRect = { x: 100, y: 100, width: 300, height: 200 };
   * const elementsInRect = editor.getElementsInBounds(selectionRect);
   * editor.select(elementsInRect.map(el => el.id));
   * ```
   *
   * @example Find elements in viewport
   * ```typescript
   * const viewport = { x: 0, y: 0, width: 800, height: 600 };
   * const visibleElements = editor.getElementsInBounds(viewport);
   * ```
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
    const scaleX = t.scaleX;
    const scaleY = t.scaleY;

    switch (element.type) {
      case 'image': {
        const el = element as ImageElement;
        return {
          x: t.x,
          y: t.y,
          width: el.width * scaleX,
          height: el.height * scaleY,
        };
      }
      case 'text': {
        const el = element as TextElement;
        // Approximate text bounds using fontSize and content length
        // Must match HitTester.getElementBounds for consistency
        const estimatedWidth = el.content.length * el.fontSize * 0.6 * scaleX;
        const estimatedHeight = el.fontSize * 1.2 * scaleY;

        // Adjust x based on text anchor
        let adjustedX = t.x;
        if (el.textAnchor === 'middle') {
          adjustedX = t.x - estimatedWidth / 2;
        } else if (el.textAnchor === 'end') {
          adjustedX = t.x - estimatedWidth;
        }

        return {
          x: adjustedX,
          y: t.y - estimatedHeight,
          width: estimatedWidth,
          height: estimatedHeight,
        };
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
    const scaleX = t.scaleX;
    const scaleY = t.scaleY;

    switch (el.shapeType) {
      case 'rect':
        return {
          x: t.x,
          y: t.y,
          width: (el.width ?? 0) * scaleX,
          height: (el.height ?? 0) * scaleY,
        };
      case 'circle': {
        const r = el.r ?? 0;
        const scaledRx = r * scaleX;
        const scaledRy = r * scaleY;
        return {
          x: t.x - scaledRx,
          y: t.y - scaledRy,
          width: scaledRx * 2,
          height: scaledRy * 2,
        };
      }
      case 'ellipse': {
        const rx = (el.rx ?? 0) * scaleX;
        const ry = (el.ry ?? 0) * scaleY;
        return { x: t.x - rx, y: t.y - ry, width: rx * 2, height: ry * 2 };
      }
      case 'path': {
        // Parse path data to calculate accurate bounds
        if (el.path === undefined || el.path === '') {
          return null;
        }
        const pathBounds = getPathBoundingBox(el.path);
        if (!pathBounds) {
          return null;
        }
        // Apply transform position and scale to the path bounds
        return {
          x: t.x + pathBounds.x * scaleX,
          y: t.y + pathBounds.y * scaleY,
          width: pathBounds.width * scaleX,
          height: pathBounds.height * scaleY,
        };
      }
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
  // Group Operations
  // ============================================================

  /**
   * Creates a group from the specified elements.
   *
   * Groups allow multiple elements to be treated as a single unit for
   * selection, transformation, and z-ordering. The group inherits the
   * highest z-index among its children plus one.
   *
   * @param elementIds - Array of element IDs to group (minimum 2)
   * @returns The generated group ID
   * @throws {Error} If less than 2 elements provided
   * @throws {Error} If any element doesn't exist
   * @throws {Error} If any element is locked
   * @throws {Error} If any element is already in a group
   *
   * @see {@link ungroup} to dissolve a group
   *
   * @example Group selected elements
   * ```typescript
   * const selected = editor.getSelection();
   * if (selected.length >= 2) {
   *   const groupId = editor.createGroup(selected);
   *   console.log('Created group:', groupId);
   * }
   * ```
   *
   * @example Group specific elements
   * ```typescript
   * const groupId = editor.createGroup([imageId, textId, shapeId]);
   * // The group is automatically selected after creation
   * ```
   */
  createGroup(elementIds: string[]): string {
    // Validate minimum elements
    if (elementIds.length < 2) {
      throw new Error('At least 2 elements are required to create a group');
    }

    // Validate all elements exist and are not locked
    const elements: BaseElement[] = [];
    for (const id of elementIds) {
      const element = this._state.getElement(id);
      if (!element) {
        throw new Error(`Element with id "${id}" not found`);
      }
      if (element.locked) {
        throw new Error(`Cannot group locked element: ${id}`);
      }
      elements.push(element);
    }

    // Check if any element is already in a group
    const allElements = this._state.getAllElements();
    for (const el of allElements) {
      if (el.type === 'group') {
        const group = el as GroupElement;
        for (const childId of group.children) {
          if (elementIds.includes(childId)) {
            throw new Error(`Element "${childId}" is already in group "${group.id}"`);
          }
        }
      }
    }

    // Calculate the highest zIndex among elements to group
    const maxZIndex = Math.max(...elements.map((el) => el.zIndex));

    // Generate group ID
    const groupId = generateId();

    // Create the group element
    const groupElement: GroupElement = {
      id: groupId,
      type: 'group',
      children: [...elementIds],
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      zIndex: maxZIndex + 1,
      locked: false,
      visible: true,
    };

    // Add the group to state
    this._state.addElement(groupElement);

    // Push to history
    this._history.push(this._state.snapshot());

    // Update selection to the new group
    this._state.setSelection([groupId]);

    // Emit events
    this.emit('element:added', { element: groupElement });
    this.emit('selection:changed', { selectedIds: [groupId] });
    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });

    return groupId;
  }

  /**
   * Ungroups a group element, releasing its children as independent elements.
   *
   * The group element is removed and its children become top-level elements.
   * The children are automatically selected after ungrouping.
   *
   * @param groupId - ID of the group to ungroup
   * @returns Array of the ungrouped child element IDs
   * @throws {Error} If element with the specified ID doesn't exist
   * @throws {Error} If element is not a group
   * @throws {Error} If group is locked
   *
   * @see {@link createGroup} to create a group
   *
   * @example Ungroup and select children
   * ```typescript
   * const childIds = editor.ungroup(groupId);
   * // Children are automatically selected
   * console.log('Ungrouped:', childIds.length, 'elements');
   * ```
   *
   * @example Ungroup selected group
   * ```typescript
   * const selected = editor.getSelection();
   * if (selected.length === 1) {
   *   const element = editor.getElement(selected[0]);
   *   if (element?.type === 'group') {
   *     editor.ungroup(selected[0]);
   *   }
   * }
   * ```
   */
  ungroup(groupId: string): string[] {
    const element = this._state.getElement(groupId);

    // Validate element exists
    if (!element) {
      throw new Error(`Element with id "${groupId}" not found`);
    }

    // Validate element is a group
    if (element.type !== 'group') {
      throw new Error(`Element "${groupId}" is not a group`);
    }

    // Validate element is not locked
    if (element.locked) {
      throw new Error(`Cannot ungroup locked group: ${groupId}`);
    }

    const group = element as GroupElement;
    const childIds = [...group.children];

    // Remove the group element (children remain as they are separate elements)
    this._state.removeElement(groupId);

    // Push to history
    this._history.push(this._state.snapshot());

    // Update selection to the former children
    this._state.setSelection(childIds);

    // Emit events
    this.emit('element:removed', { id: groupId });
    this.emit('selection:changed', { selectedIds: childIds });
    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });

    return childIds;
  }

  // ============================================================
  // Selection
  // ============================================================

  /**
   * Selects one or more elements, replacing the current selection.
   *
   * @param id - Element ID or array of IDs to select
   *
   * @see {@link addToSelection} to add to existing selection
   * @see {@link removeFromSelection} to remove from selection
   * @see {@link clearSelection} to deselect all
   * @see {@link selectAll} to select all elements
   *
   * @example Select a single element
   * ```typescript
   * editor.select(imageId);
   * ```
   *
   * @example Select multiple elements
   * ```typescript
   * editor.select([imageId, textId, shapeId]);
   * ```
   *
   * @example Select element on click
   * ```typescript
   * editor.on('canvas:clicked', ({ element }) => {
   *   if (element) {
   *     editor.select(element.id);
   *   } else {
   *     editor.clearSelection();
   *   }
   * });
   * ```
   */
  select(id: string | string[]): void {
    const ids = Array.isArray(id) ? id : [id];
    this._state.setSelection(ids);
    this.emit('selection:changed', { selectedIds: this._state.getSelection() });
  }

  /**
   * Adds elements to the current selection (multi-select).
   *
   * @param id - Element ID or array of IDs to add to selection
   *
   * @see {@link select} to replace selection
   * @see {@link removeFromSelection} to remove from selection
   *
   * @example Add single element to selection (Shift+click pattern)
   * ```typescript
   * editor.on('canvas:clicked', ({ element }) => {
   *   if (element && event.shiftKey) {
   *     editor.addToSelection(element.id);
   *   }
   * });
   * ```
   *
   * @example Add multiple elements
   * ```typescript
   * editor.addToSelection([id1, id2, id3]);
   * ```
   */
  addToSelection(id: string | string[]): void {
    const idsToAdd = Array.isArray(id) ? id : [id];
    const currentSelection = this._state.getSelection();
    const newSelection = [...new Set([...currentSelection, ...idsToAdd])];
    this._state.setSelection(newSelection);
    this.emit('selection:changed', { selectedIds: this._state.getSelection() });
  }

  /**
   * Removes elements from the current selection.
   *
   * @param id - Element ID or array of IDs to remove from selection
   *
   * @see {@link addToSelection} to add to selection
   * @see {@link clearSelection} to remove all from selection
   *
   * @example Toggle selection (Ctrl+click pattern)
   * ```typescript
   * editor.on('canvas:clicked', ({ element }) => {
   *   if (element && event.ctrlKey) {
   *     const selection = editor.getSelection();
   *     if (selection.includes(element.id)) {
   *       editor.removeFromSelection(element.id);
   *     } else {
   *       editor.addToSelection(element.id);
   *     }
   *   }
   * });
   * ```
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
   * Clears the current selection (deselects all elements).
   *
   * @see {@link select} to select elements
   * @see {@link selectAll} to select all elements
   *
   * @example Clear selection on canvas click
   * ```typescript
   * editor.on('canvas:clicked', ({ element }) => {
   *   if (!element) {
   *     editor.clearSelection();
   *   }
   * });
   * ```
   *
   * @example Clear selection on Escape key
   * ```typescript
   * document.addEventListener('keydown', (e) => {
   *   if (e.key === 'Escape') {
   *     editor.clearSelection();
   *   }
   * });
   * ```
   */
  clearSelection(): void {
    this._state.setSelection([]);
    this.emit('selection:changed', { selectedIds: [] });
  }

  /**
   * Gets the currently selected elements as full element objects.
   *
   * @returns Array of selected elements
   *
   * @see {@link getSelection} to get only IDs
   *
   * @example Get selected element properties
   * ```typescript
   * const selected = editor.getSelected();
   * selected.forEach(element => {
   *   console.log(element.type, element.transform);
   * });
   * ```
   *
   * @example Check if selection has specific type
   * ```typescript
   * const hasImage = editor.getSelected().some(el => el.type === 'image');
   * ```
   */
  getSelected(): BaseElement[] {
    return this._state
      .getSelection()
      .map((id) => this._state.getElement(id))
      .filter((element): element is BaseElement => element !== undefined);
  }

  /**
   * Selects all visible, unlocked elements on the canvas.
   *
   * @see {@link clearSelection} to deselect all
   * @see {@link select} to select specific elements
   *
   * @example Ctrl+A shortcut
   * ```typescript
   * document.addEventListener('keydown', (e) => {
   *   if (e.ctrlKey && e.key === 'a') {
   *     e.preventDefault();
   *     editor.selectAll();
   *   }
   * });
   * ```
   */
  selectAll(): void {
    const selectableIds = this._state
      .getAllElements()
      .filter((element) => element.visible && !element.locked)
      .map((element) => element.id);
    this._state.setSelection(selectableIds);
    this.emit('selection:changed', { selectedIds: this._state.getSelection() });
  }

  /**
   * Gets the IDs of currently selected elements.
   *
   * @returns Array of selected element IDs
   *
   * @see {@link getSelected} to get full element objects
   *
   * @example Check selection count
   * ```typescript
   * const count = editor.getSelection().length;
   * statusBar.textContent = `${count} element(s) selected`;
   * ```
   *
   * @example Delete selected elements
   * ```typescript
   * document.addEventListener('keydown', (e) => {
   *   if (e.key === 'Delete') {
   *     editor.removeElements(editor.getSelection());
   *   }
   * });
   * ```
   */
  getSelection(): string[] {
    return this._state.getSelection();
  }

  /**
   * Gets the combined bounding box of all selected elements.
   *
   * @returns Combined bounding box, or null if nothing is selected
   *
   * @see {@link getSelectionRotation} to get rotation of selection
   *
   * @example Center selection on canvas
   * ```typescript
   * const bounds = editor.getSelectionBounds();
   * const canvas = editor.getCanvasSize();
   * if (bounds) {
   *   const dx = (canvas.width / 2) - (bounds.x + bounds.width / 2);
   *   const dy = (canvas.height / 2) - (bounds.y + bounds.height / 2);
   *   editor.getSelection().forEach(id => {
   *     editor.moveElement(id, dx, dy);
   *   });
   * }
   * ```
   *
   * @example Show selection dimensions
   * ```typescript
   * const bounds = editor.getSelectionBounds();
   * if (bounds) {
   *   sizeLabel.textContent = `${bounds.width} × ${bounds.height}`;
   * }
   * ```
   */
  getSelectionBounds(): BoundingBox | null {
    const selectedElements = this.getSelected();
    if (selectedElements.length === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const element of selectedElements) {
      const bounds = this._getElementBounds(element);
      if (bounds) {
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }
    }

    if (minX === Infinity) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Gets the rotation of the current selection.
   *
   * For single selection, returns the element's rotation.
   * For multi-selection, returns 0 (combined selection has no inherent rotation).
   *
   * @returns Rotation in degrees (0-360)
   *
   * @see {@link getSelectionBounds} to get selection dimensions
   *
   * @example Display rotation in UI
   * ```typescript
   * editor.on('selection:changed', () => {
   *   const rotation = editor.getSelectionRotation();
   *   rotationInput.value = rotation.toString();
   * });
   * ```
   */
  getSelectionRotation(): number {
    const selectedElements = this.getSelected();
    const first = selectedElements[0];
    if (selectedElements.length === 1 && first) {
      return first.transform.rotation;
    }
    return 0;
  }

  /**
   * Gets the canvas dimensions.
   *
   * @returns Object with width and height in viewBox units
   *
   * @example Center an element on canvas
   * ```typescript
   * const canvas = editor.getCanvasSize();
   * editor.setPosition(elementId,
   *   canvas.width / 2,
   *   canvas.height / 2
   * );
   * ```
   *
   * @example Create canvas-sized background
   * ```typescript
   * const { width, height } = editor.getCanvasSize();
   * editor.addElement({
   *   type: 'shape',
   *   shapeType: 'rect',
   *   width,
   *   height,
   *   fill: '#f0f0f0',
   *   transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
   *   opacity: 1,
   *   zIndex: 0,
   *   locked: true,
   *   visible: true
   * });
   * ```
   */
  getCanvasSize(): { width: number; height: number } {
    return {
      width: this._state.state.width,
      height: this._state.state.height,
    };
  }

  // ============================================================
  // Transforms
  // ============================================================

  /**
   * Moves an element relative to its current position.
   *
   * @param id - Element ID to move
   * @param dx - Delta X in viewBox units (positive = right, negative = left)
   * @param dy - Delta Y in viewBox units (positive = down, negative = up)
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link setPosition} to set absolute position
   *
   * @example Move element by offset
   * ```typescript
   * // Move 50 units right and 30 units down
   * editor.moveElement(imageId, 50, 30);
   * ```
   *
   * @example Nudge with arrow keys
   * ```typescript
   * document.addEventListener('keydown', (e) => {
   *   const selected = editor.getSelection();
   *   if (selected.length === 0) return;
   *
   *   const delta = e.shiftKey ? 10 : 1;
   *   selected.forEach(id => {
   *     switch (e.key) {
   *       case 'ArrowUp':    editor.moveElement(id, 0, -delta); break;
   *       case 'ArrowDown':  editor.moveElement(id, 0, delta); break;
   *       case 'ArrowLeft':  editor.moveElement(id, -delta, 0); break;
   *       case 'ArrowRight': editor.moveElement(id, delta, 0); break;
   *     }
   *   });
   * });
   * ```
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
   * Sets an element's absolute position.
   *
   * @param id - Element ID to position
   * @param x - Absolute X coordinate in viewBox units
   * @param y - Absolute Y coordinate in viewBox units
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link moveElement} to move by relative offset
   *
   * @example Position at specific coordinates
   * ```typescript
   * editor.setPosition(imageId, 100, 200);
   * ```
   *
   * @example Center element on canvas
   * ```typescript
   * const canvas = editor.getCanvasSize();
   * editor.setPosition(elementId, canvas.width / 2, canvas.height / 2);
   * ```
   *
   * @example Snap to grid position
   * ```typescript
   * const gridSize = 20;
   * const x = Math.round(currentX / gridSize) * gridSize;
   * const y = Math.round(currentY / gridSize) * gridSize;
   * editor.setPosition(elementId, x, y);
   * ```
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
   * Rotates an element to a specific angle.
   *
   * Sets the absolute rotation angle (not relative to current rotation).
   *
   * @param id - Element ID to rotate
   * @param degrees - Rotation angle in degrees (clockwise from 3 o'clock)
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link resetTransform} to reset rotation to 0
   *
   * @example Rotate to 45 degrees
   * ```typescript
   * editor.rotateElement(imageId, 45);
   * ```
   *
   * @example Rotate by increment
   * ```typescript
   * const element = editor.getElement(imageId);
   * const currentRotation = element.transform.rotation;
   * editor.rotateElement(imageId, currentRotation + 15);
   * ```
   *
   * @example Rotation slider
   * ```typescript
   * rotationSlider.addEventListener('input', (e) => {
   *   const degrees = parseFloat(e.target.value);
   *   editor.getSelection().forEach(id => {
   *     editor.rotateElement(id, degrees);
   *   });
   * });
   * ```
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
   * Scales an element to specific scale factors.
   *
   * Sets absolute scale factors (1.0 = original size, 2.0 = double size).
   *
   * @param id - Element ID to scale
   * @param scaleX - X scale factor (1.0 = 100%)
   * @param scaleY - Y scale factor (1.0 = 100%)
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link resetTransform} to reset scale to 1.0
   *
   * @example Scale uniformly (maintain aspect ratio)
   * ```typescript
   * editor.scaleElement(imageId, 1.5, 1.5); // 150% size
   * ```
   *
   * @example Scale non-uniformly
   * ```typescript
   * editor.scaleElement(imageId, 2.0, 1.0); // Stretch horizontally
   * ```
   *
   * @example Flip horizontally
   * ```typescript
   * editor.scaleElement(imageId, -1, 1);
   * ```
   *
   * @example Scale slider
   * ```typescript
   * scaleSlider.addEventListener('input', (e) => {
   *   const scale = parseFloat(e.target.value);
   *   editor.getSelection().forEach(id => {
   *     editor.scaleElement(id, scale, scale);
   *   });
   * });
   * ```
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
   * Resets an element's transform to default values.
   *
   * Sets position to (0,0), rotation to 0, and scale to (1,1).
   *
   * @param id - Element ID to reset
   * @throws {Error} If element with the specified ID does not exist
   *
   * @example Reset transform
   * ```typescript
   * editor.resetTransform(imageId);
   * ```
   *
   * @example Reset all selected elements
   * ```typescript
   * editor.getSelection().forEach(id => {
   *   editor.resetTransform(id);
   * });
   * ```
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
   * Brings an element to the front (highest z-index).
   *
   * Places the element above all other elements on the canvas.
   *
   * @param id - Element ID
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link sendToBack} to move to back
   * @see {@link bringForward} to move up one level
   * @see {@link sendBackward} to move down one level
   * @see {@link setZIndex} to set specific z-index
   *
   * @example Bring selected element to front
   * ```typescript
   * const selected = editor.getSelection();
   * if (selected.length === 1) {
   *   editor.bringToFront(selected[0]);
   * }
   * ```
   *
   * @example Context menu action
   * ```typescript
   * bringToFrontButton.addEventListener('click', () => {
   *   editor.getSelection().forEach(id => {
   *     editor.bringToFront(id);
   *   });
   * });
   * ```
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
   * Sends an element to the back (lowest z-index).
   *
   * Places the element behind all other elements on the canvas.
   *
   * @param id - Element ID
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link bringToFront} to move to front
   * @see {@link bringForward} to move up one level
   * @see {@link sendBackward} to move down one level
   * @see {@link setZIndex} to set specific z-index
   *
   * @example Send selected element to back
   * ```typescript
   * const selected = editor.getSelection();
   * if (selected.length === 1) {
   *   editor.sendToBack(selected[0]);
   * }
   * ```
   *
   * @example Send background element to back
   * ```typescript
   * editor.sendToBack(backgroundId);
   * ```
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
   * Moves an element up one level in z-order.
   *
   * Swaps z-index with the element directly above it.
   *
   * @param id - Element ID
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link sendBackward} to move down one level
   * @see {@link bringToFront} to move to front
   * @see {@link sendToBack} to move to back
   *
   * @example Move element forward
   * ```typescript
   * editor.bringForward(imageId);
   * ```
   *
   * @example Keyboard shortcut (Ctrl+])
   * ```typescript
   * document.addEventListener('keydown', (e) => {
   *   if (e.ctrlKey && e.key === ']') {
   *     editor.getSelection().forEach(id => {
   *       editor.bringForward(id);
   *     });
   *   }
   * });
   * ```
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
   * Moves an element down one level in z-order.
   *
   * Swaps z-index with the element directly below it.
   *
   * @param id - Element ID
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link bringForward} to move up one level
   * @see {@link bringToFront} to move to front
   * @see {@link sendToBack} to move to back
   *
   * @example Move element backward
   * ```typescript
   * editor.sendBackward(imageId);
   * ```
   *
   * @example Keyboard shortcut (Ctrl+[)
   * ```typescript
   * document.addEventListener('keydown', (e) => {
   *   if (e.ctrlKey && e.key === '[') {
   *     editor.getSelection().forEach(id => {
   *       editor.sendBackward(id);
   *     });
   *   }
   * });
   * ```
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
   * Sets an element's z-index directly.
   *
   * @param id - Element ID
   * @param zIndex - New z-index value (higher = in front)
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link bringToFront} to automatically move to front
   * @see {@link sendToBack} to automatically move to back
   *
   * @example Set specific z-index
   * ```typescript
   * editor.setZIndex(imageId, 10);
   * editor.setZIndex(textId, 20); // Text will be in front of image
   * ```
   *
   * @example Reorder elements
   * ```typescript
   * // Get all elements sorted by current z-index
   * const sorted = editor.getAllElements()
   *   .sort((a, b) => a.zIndex - b.zIndex);
   *
   * // Reassign sequential z-indexes
   * sorted.forEach((el, index) => {
   *   editor.setZIndex(el.id, index);
   * });
   * ```
   */
  setZIndex(id: string, zIndex: number): void {
    this.updateElement(id, { zIndex });
  }

  // ============================================================
  // History
  // ============================================================

  /**
   * Undoes the last operation.
   *
   * Reverts the canvas state to the previous history entry.
   * Does nothing if there's no history to undo.
   *
   * @see {@link redo} to redo an undone operation
   * @see {@link canUndo} to check if undo is available
   * @see {@link clearHistory} to clear all history
   *
   * @example Undo button
   * ```typescript
   * undoButton.addEventListener('click', () => {
   *   editor.undo();
   * });
   * ```
   *
   * @example Ctrl+Z shortcut
   * ```typescript
   * document.addEventListener('keydown', (e) => {
   *   if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
   *     e.preventDefault();
   *     editor.undo();
   *   }
   * });
   * ```
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
   * Redoes the last undone operation.
   *
   * Re-applies a previously undone state change.
   * Does nothing if there's no operation to redo.
   *
   * @see {@link undo} to undo an operation
   * @see {@link canRedo} to check if redo is available
   *
   * @example Redo button
   * ```typescript
   * redoButton.addEventListener('click', () => {
   *   editor.redo();
   * });
   * ```
   *
   * @example Ctrl+Shift+Z or Ctrl+Y shortcut
   * ```typescript
   * document.addEventListener('keydown', (e) => {
   *   if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
   *     e.preventDefault();
   *     editor.redo();
   *   }
   * });
   * ```
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
   * Checks if undo is available.
   *
   * @returns True if there are operations that can be undone
   *
   * @see {@link undo} to perform undo
   * @see {@link canRedo} to check redo availability
   *
   * @example Update undo button state
   * ```typescript
   * editor.on('history:changed', ({ canUndo }) => {
   *   undoButton.disabled = !canUndo;
   * });
   * ```
   */
  canUndo(): boolean {
    return this._history.canUndo();
  }

  /**
   * Checks if redo is available.
   *
   * @returns True if there are operations that can be redone
   *
   * @see {@link redo} to perform redo
   * @see {@link canUndo} to check undo availability
   *
   * @example Update redo button state
   * ```typescript
   * editor.on('history:changed', ({ canRedo }) => {
   *   redoButton.disabled = !canRedo;
   * });
   * ```
   */
  canRedo(): boolean {
    return this._history.canRedo();
  }

  /**
   * Clears all history entries.
   *
   * Resets the history stack with the current state as the new baseline.
   * Use this when loading a new document or after saving.
   *
   * @see {@link getHistorySize} to check history size
   *
   * @example Clear history after save
   * ```typescript
   * function saveDocument() {
   *   const json = editor.toJSON();
   *   localStorage.setItem('document', json);
   *   editor.clearHistory(); // Start fresh history after save
   * }
   * ```
   */
  clearHistory(): void {
    this._history.clear();
    // Re-push current state as the new baseline
    this._history.push(this._state.snapshot());
    this.emit('history:changed', { canUndo: false, canRedo: false });
  }

  /**
   * Gets the number of entries in the history stack.
   *
   * @returns Number of history entries
   *
   * @example Display history info
   * ```typescript
   * const size = editor.getHistorySize();
   * console.log(`History has ${size} entries`);
   * ```
   */
  getHistorySize(): number {
    return this._history.size();
  }

  // ============================================================
  // Clipping
  // ============================================================

  /**
   * Adds a clip path to an element.
   *
   * Clip paths mask the visible area of an element. Only the portion of
   * the element that falls within the clip path shape is visible.
   *
   * @param elementId - Element ID to apply clip to
   * @param clipPath - Clip path definition (id will be auto-generated)
   * @returns The generated clip path ID
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link removeClipPath} to remove a clip path
   * @see {@link updateClipPath} to modify a clip path
   *
   * @example Circular clip (profile picture style)
   * ```typescript
   * editor.addClipPath(imageId, {
   *   type: 'circle',
   *   cx: 100,  // Center X relative to element
   *   cy: 100,  // Center Y relative to element
   *   r: 100    // Radius
   * });
   * ```
   *
   * @example Rectangular clip
   * ```typescript
   * editor.addClipPath(imageId, {
   *   type: 'rect',
   *   x: 50,
   *   y: 50,
   *   width: 200,
   *   height: 150
   * });
   * ```
   *
   * @example Elliptical clip
   * ```typescript
   * editor.addClipPath(imageId, {
   *   type: 'ellipse',
   *   cx: 150,
   *   cy: 100,
   *   rx: 150,
   *   ry: 100
   * });
   * ```
   *
   * @example Path-based clip (custom shape)
   * ```typescript
   * editor.addClipPath(imageId, {
   *   type: 'path',
   *   d: 'M 0 0 L 200 0 L 200 200 L 100 150 L 0 200 Z'
   * });
   * ```
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
   * Removes a clip path from an element.
   *
   * Restores the element to its full, unclipped state.
   *
   * @param elementId - Element ID to remove clip from
   * @throws {Error} If element with the specified ID does not exist
   * @throws {Error} If element has no clip path
   *
   * @see {@link addClipPath} to add a clip path
   *
   * @example Remove clip from selected element
   * ```typescript
   * const selected = editor.getSelection();
   * if (selected.length === 1) {
   *   const element = editor.getElement(selected[0]);
   *   if (element?.clipPath) {
   *     editor.removeClipPath(selected[0]);
   *   }
   * }
   * ```
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
   * Updates properties of an existing clip path.
   *
   * @param elementId - Element ID with the clip path
   * @param updates - Partial clip path properties to merge with existing
   * @throws {Error} If element with the specified ID does not exist
   * @throws {Error} If element has no clip path
   *
   * @see {@link addClipPath} to add a clip path
   *
   * @example Resize a circular clip
   * ```typescript
   * editor.updateClipPath(imageId, { r: 150 });
   * ```
   *
   * @example Move a rectangular clip
   * ```typescript
   * editor.updateClipPath(imageId, { x: 100, y: 100 });
   * ```
   *
   * @example Animate clip path
   * ```typescript
   * let radius = 0;
   * const animate = () => {
   *   radius = (radius + 1) % 200;
   *   editor.updateClipPath(imageId, { r: radius });
   *   requestAnimationFrame(animate);
   * };
   * animate();
   * ```
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
  // Filters & Effects
  // ============================================================

  /**
   * Adds a filter effect to an element using a preset.
   *
   * Effects are additive - calling this multiple times adds multiple effects.
   * Use `setEffect()` to replace all existing effects.
   *
   * @param elementId - Element ID to apply filter to
   * @param effect - Effect preset to apply
   * @returns The generated filter ID
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link setEffect} to replace all effects
   * @see {@link clearFilters} to remove all effects
   * @see {@link getElementFilters} to list applied effects
   *
   * @example Apply a blur effect
   * ```typescript
   * editor.addEffect(imageId, { type: 'blur', radius: 5 });
   * ```
   *
   * @example Apply a drop shadow
   * ```typescript
   * editor.addEffect(imageId, {
   *   type: 'dropShadow',
   *   offsetX: 4,
   *   offsetY: 4,
   *   blur: 8,
   *   color: 'rgba(0,0,0,0.5)'
   * });
   * ```
   *
   * @example Stack multiple effects
   * ```typescript
   * // Apply sepia, then add a vignette
   * editor.addEffect(imageId, { type: 'sepia', intensity: 0.8 });
   * editor.addEffect(imageId, { type: 'vignette', intensity: 0.5 });
   * ```
   *
   * @example Apply color adjustments
   * ```typescript
   * editor.addEffect(imageId, {
   *   type: 'colorAdjust',
   *   brightness: 1.2,
   *   contrast: 1.1,
   *   saturation: 1.3
   * });
   * ```
   */
  addEffect(elementId: string, effect: EffectPreset): string {
    const element = this._state.getElement(elementId);
    if (element === undefined) {
      throw new Error(`Element not found: ${elementId}`);
    }

    // Get or create filter for this preset
    const filterId = this._filterManager.getOrCreatePresetFilter(effect);

    // Create element filter reference
    const elementFilter: ElementFilter = {
      type: 'preset',
      effect,
    };

    // Add to element's filters array
    const existingFilters = element.filters ?? [];
    this._state.updateElement(elementId, {
      filters: [...existingFilters, elementFilter],
    });
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

    return filterId;
  }

  /**
   * Replaces all filters on an element with a single effect preset.
   *
   * Unlike `addEffect()` which is additive, this method clears existing effects
   * and applies only the specified effect.
   *
   * @param elementId - Element ID to apply filter to
   * @param effect - Effect preset to apply, or null to clear all effects
   * @returns The generated filter ID, or empty string if cleared
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link addEffect} to add effects without clearing existing ones
   * @see {@link clearFilters} to remove all effects
   *
   * @example Set a single effect (clears any existing effects)
   * ```typescript
   * editor.setEffect(imageId, { type: 'blur', radius: 3 });
   * ```
   *
   * @example Clear all effects
   * ```typescript
   * editor.setEffect(imageId, null);
   * ```
   *
   * @example Effect dropdown handler
   * ```typescript
   * effectDropdown.addEventListener('change', (e) => {
   *   const effectType = e.target.value;
   *   if (effectType === 'none') {
   *     editor.setEffect(selectedId, null);
   *   } else {
   *     editor.setEffect(selectedId, { type: effectType, ...presets[effectType] });
   *   }
   * });
   * ```
   */
  setEffect(elementId: string, effect: EffectPreset | null): string {
    const element = this._state.getElement(elementId);
    if (element === undefined) {
      throw new Error(`Element not found: ${elementId}`);
    }

    if (effect === null) {
      // Clear all filters
      this.clearFilters(elementId);
      return '';
    }

    // Get or create filter for this preset
    const filterId = this._filterManager.getOrCreatePresetFilter(effect);

    // Create element filter reference
    const elementFilter: ElementFilter = {
      type: 'preset',
      effect,
    };

    // Replace element's filters
    this._state.updateElement(elementId, {
      filters: [elementFilter],
    });
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

    return filterId;
  }

  /**
   * Adds a custom filter definition to the filter library.
   *
   * Custom filters allow fine-grained control over SVG filter primitives.
   * Once added, the filter can be applied to any element using `applyFilter()`.
   *
   * @param filter - Filter definition with primitives (ID is auto-generated)
   * @returns The generated filter ID
   *
   * @see {@link applyFilter} to apply custom filter to an element
   * @see {@link getFilter} to retrieve a filter definition
   * @see {@link removeFilter} to remove a custom filter
   *
   * @example Create a custom emboss filter
   * ```typescript
   * const filterId = editor.addFilter({
   *   primitives: [
   *     { type: 'feConvolveMatrix', kernelMatrix: '-2 -1 0 -1 1 1 0 1 2', order: 3 },
   *     { type: 'feComponentTransfer', funcR: 'linear', slope: 1, intercept: 0.5 }
   *   ]
   * });
   * editor.applyFilter(imageId, filterId);
   * ```
   */
  addFilter(filter: Omit<FilterDefinition, 'id'>): string {
    return this._filterManager.addFilter(filter);
  }

  /**
   * Gets a filter definition by ID.
   *
   * @param filterId - Filter ID
   * @returns Filter definition or undefined if not found
   *
   * @example Check if a filter exists
   * ```typescript
   * const filter = editor.getFilter(filterId);
   * if (filter) {
   *   console.log('Filter has', filter.primitives.length, 'primitives');
   * }
   * ```
   */
  getFilter(filterId: string): FilterDefinition | undefined {
    return this._filterManager.getFilter(filterId);
  }

  /**
   * Gets all registered filter definitions.
   *
   * @returns Array of all custom and preset-generated filter definitions
   *
   * @example List all filters
   * ```typescript
   * const filters = editor.getAllFilters();
   * filters.forEach(f => console.log(f.id));
   * ```
   */
  getAllFilters(): FilterDefinition[] {
    return this._filterManager.getAllFilters();
  }

  /**
   * Removes a custom filter by ID.
   *
   * @param filterId - Filter ID to remove from the library
   * @returns True if filter was removed, false if not found
   *
   * @see {@link addFilter} to add custom filters
   *
   * @example Remove a filter
   * ```typescript
   * if (editor.removeFilter(filterId)) {
   *   console.log('Filter removed');
   * }
   * ```
   */
  removeFilter(filterId: string): boolean {
    return this._filterManager.removeFilter(filterId);
  }

  /**
   * Applies a custom filter to an element.
   *
   * The filter must have been previously created using `addFilter()`.
   *
   * @param elementId - Element ID to apply filter to
   * @param filterId - Custom filter ID to apply
   * @throws {Error} If element with the specified ID does not exist
   * @throws {Error} If filter with the specified ID does not exist
   *
   * @see {@link addFilter} to create custom filters
   * @see {@link addEffect} to apply preset effects
   *
   * @example Apply a custom filter
   * ```typescript
   * // First create the filter
   * const filterId = editor.addFilter({ primitives: [...] });
   *
   * // Then apply it to an element
   * editor.applyFilter(imageId, filterId);
   * ```
   */
  applyFilter(elementId: string, filterId: string): void {
    const element = this._state.getElement(elementId);
    if (element === undefined) {
      throw new Error(`Element not found: ${elementId}`);
    }

    const filter = this._filterManager.getFilter(filterId);
    if (filter === undefined) {
      throw new Error(`Filter not found: ${filterId}`);
    }

    // Create element filter reference
    const elementFilter: ElementFilter = {
      type: 'custom',
      filterId,
    };

    // Add to element's filters array
    const existingFilters = element.filters ?? [];
    this._state.updateElement(elementId, {
      filters: [...existingFilters, elementFilter],
    });
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
   * Clears all filters from an element.
   *
   * Removes all applied effects and custom filters from the element.
   *
   * @param elementId - Element ID to clear filters from
   * @throws {Error} If element with the specified ID does not exist
   *
   * @see {@link setEffect} with null to clear effects
   * @see {@link removeFilterFromElement} to remove a specific filter
   *
   * @example Clear all filters from selected elements
   * ```typescript
   * editor.getSelection().forEach(id => {
   *   editor.clearFilters(id);
   * });
   * ```
   *
   * @example Reset button handler
   * ```typescript
   * resetFiltersButton.addEventListener('click', () => {
   *   editor.clearFilters(selectedId);
   * });
   * ```
   */
  clearFilters(elementId: string): void {
    const element = this._state.getElement(elementId);
    if (element === undefined) {
      throw new Error(`Element not found: ${elementId}`);
    }

    if (!element.filters || element.filters.length === 0) {
      return; // Nothing to clear
    }

    // Create element copy without filters property
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { filters: _removed, ...elementWithoutFilters } = element;
    this._state.state.elements.set(elementId, elementWithoutFilters as BaseElement);
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
   * Removes a specific filter from an element by index.
   *
   * When an element has multiple stacked effects, this allows removing
   * a single effect from the stack.
   *
   * @param elementId - Element ID
   * @param filterIndex - Zero-based index of the filter to remove
   * @throws {Error} If element with the specified ID does not exist
   * @throws {Error} If filter index is out of bounds
   *
   * @see {@link clearFilters} to remove all filters
   * @see {@link getElementFilters} to list filters with their indices
   *
   * @example Remove the first filter
   * ```typescript
   * editor.removeFilterFromElement(imageId, 0);
   * ```
   *
   * @example Remove last filter in stack
   * ```typescript
   * const filters = editor.getElementFilters(imageId);
   * if (filters.length > 0) {
   *   editor.removeFilterFromElement(imageId, filters.length - 1);
   * }
   * ```
   */
  removeFilterFromElement(elementId: string, filterIndex: number): void {
    const element = this._state.getElement(elementId);
    if (element === undefined) {
      throw new Error(`Element not found: ${elementId}`);
    }

    if (!element.filters || filterIndex < 0 || filterIndex >= element.filters.length) {
      throw new Error(`Filter index out of bounds: ${String(filterIndex)}`);
    }

    const newFilters = element.filters.filter((_, i) => i !== filterIndex);
    if (newFilters.length > 0) {
      this._state.updateElement(elementId, { filters: newFilters });
    } else {
      // Remove filters property entirely (same pattern as clearFilters)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { filters: _removed, ...elementWithoutFilters } = element;
      this._state.state.elements.set(elementId, elementWithoutFilters as BaseElement);
    }
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
   * Gets the filters applied to an element.
   *
   * @param elementId - Element ID
   * @returns Array of element filters, or empty array if none
   *
   * @see {@link hasFilters} to check if element has any filters
   *
   * @example List applied effects
   * ```typescript
   * const filters = editor.getElementFilters(imageId);
   * filters.forEach((filter, index) => {
   *   if (filter.type === 'preset') {
   *     console.log(`${index}: ${filter.effect.type}`);
   *   } else {
   *     console.log(`${index}: custom filter ${filter.filterId}`);
   *   }
   * });
   * ```
   *
   * @example Build filter list UI
   * ```typescript
   * editor.on('selection:changed', ({ selectedIds }) => {
   *   if (selectedIds.length === 1) {
   *     const filters = editor.getElementFilters(selectedIds[0]);
   *     renderFilterList(filters);
   *   }
   * });
   * ```
   */
  getElementFilters(elementId: string): ElementFilter[] {
    const element = this._state.getElement(elementId);
    return element?.filters ?? [];
  }

  /**
   * Checks if an element has any filters applied.
   *
   * @param elementId - Element ID
   * @returns True if element has one or more filters
   *
   * @see {@link getElementFilters} to get the list of filters
   *
   * @example Show filter indicator in UI
   * ```typescript
   * editor.on('selection:changed', ({ selectedIds }) => {
   *   if (selectedIds.length === 1) {
   *     filterIcon.classList.toggle('active', editor.hasFilters(selectedIds[0]));
   *   }
   * });
   * ```
   *
   * @example Clear filters button visibility
   * ```typescript
   * clearFiltersButton.disabled = !editor.hasFilters(selectedId);
   * ```
   */
  hasFilters(elementId: string): boolean {
    const element = this._state.getElement(elementId);
    return (element?.filters?.length ?? 0) > 0;
  }

  // ============================================================
  // Export/Import
  // ============================================================

  /**
   * Exports the canvas as clean SVG markup.
   *
   * Generates a standalone SVG document that can be saved as a file,
   * embedded in HTML, or used with other tools. Does not include
   * editor-specific metadata like selection state.
   *
   * @returns Complete SVG markup string
   *
   * @see {@link toJSON} to export state for later editing
   *
   * @example Download SVG file
   * ```typescript
   * function downloadSVG() {
   *   const svg = editor.toSVG();
   *   const blob = new Blob([svg], { type: 'image/svg+xml' });
   *   const url = URL.createObjectURL(blob);
   *
   *   const a = document.createElement('a');
   *   a.href = url;
   *   a.download = 'design.svg';
   *   a.click();
   *
   *   URL.revokeObjectURL(url);
   * }
   * ```
   *
   * @example Copy SVG to clipboard
   * ```typescript
   * async function copySVG() {
   *   const svg = editor.toSVG();
   *   await navigator.clipboard.writeText(svg);
   * }
   * ```
   *
   * @example Preview SVG in new window
   * ```typescript
   * function previewSVG() {
   *   const svg = editor.toSVG();
   *   const win = window.open('', '_blank');
   *   win.document.write(svg);
   * }
   * ```
   */
  toSVG(): string {
    return this._renderer.toSVG(
      this._state.state,
      (id) => this._state.getElement(id),
      (filter) => this._filterManager.resolveElementFilter(filter),
      (id) => this._filterManager.getFilter(id),
      (filters) => this._filterManager.createCompositeFilter(filters),
    );
  }

  /**
   * Exports the canvas state as JSON.
   *
   * Serializes the complete editor state including all elements, selection,
   * and guides. The JSON can be stored and later restored using `fromJSON()`.
   *
   * @returns JSON string representation of state
   *
   * @see {@link fromJSON} to restore from JSON
   * @see {@link toSVG} for final SVG export
   *
   * @example Save to localStorage
   * ```typescript
   * function saveProject() {
   *   const json = editor.toJSON();
   *   localStorage.setItem('project', json);
   * }
   * ```
   *
   * @example Download JSON file
   * ```typescript
   * function downloadJSON() {
   *   const json = editor.toJSON();
   *   const blob = new Blob([json], { type: 'application/json' });
   *   const url = URL.createObjectURL(blob);
   *
   *   const a = document.createElement('a');
   *   a.href = url;
   *   a.download = 'project.json';
   *   a.click();
   *
   *   URL.revokeObjectURL(url);
   * }
   * ```
   *
   * @example Auto-save on changes
   * ```typescript
   * editor.on('state:changed', debounce(() => {
   *   localStorage.setItem('autosave', editor.toJSON());
   * }, 1000));
   * ```
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
      guides: snapshot.guides,
    };

    return JSON.stringify(serialized);
  }

  /**
   * Restores canvas state from JSON.
   *
   * Completely replaces the current canvas state with data from a JSON string
   * previously created by `toJSON()`. Clears history and emits state change events.
   *
   * @param json - JSON string to restore from (from toJSON)
   * @throws {Error} If JSON is invalid or cannot be parsed
   * @throws {Error} If required fields (width, height, elements) are missing
   *
   * @see {@link toJSON} to export state
   * @see {@link clear} to clear without restoring
   *
   * @example Load from localStorage
   * ```typescript
   * function loadProject() {
   *   const json = localStorage.getItem('project');
   *   if (json) {
   *     editor.fromJSON(json);
   *     editor.render();
   *   }
   * }
   * ```
   *
   * @example Load from file input
   * ```typescript
   * fileInput.addEventListener('change', async (e) => {
   *   const file = e.target.files[0];
   *   if (file) {
   *     const json = await file.text();
   *     try {
   *       editor.fromJSON(json);
   *       editor.render();
   *     } catch (err) {
   *       alert('Invalid project file');
   *     }
   *   }
   * });
   * ```
   *
   * @example Load autosave on startup
   * ```typescript
   * const autosave = localStorage.getItem('autosave');
   * if (autosave) {
   *   try {
   *     editor.fromJSON(autosave);
   *   } catch (e) {
   *     console.warn('Failed to restore autosave');
   *   }
   * }
   * editor.render();
   * ```
   */
  fromJSON(json: string): void {
    // Parse as unknown first to allow validation
    let parsed: unknown;

    try {
      parsed = JSON.parse(json) as unknown;
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`);
    }

    // Validate that parsed is an object
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid state: expected an object');
    }

    const data = parsed as Record<string, unknown>;

    // Validate required fields
    const width = data['width'];
    const height = data['height'];
    const elementsData = data['elements'];

    if (typeof width !== 'number' || typeof height !== 'number') {
      throw new Error('Invalid state: missing or invalid width/height');
    }
    if (typeof elementsData !== 'object' || elementsData === null) {
      throw new Error('Invalid state: missing or invalid elements');
    }

    // Convert Record back to Map
    const elements = new Map<string, BaseElement>();
    for (const [id, element] of Object.entries(elementsData as Record<string, BaseElement>)) {
      elements.set(id, element);
    }

    // Convert array back to Set (with fallback for missing field)
    const selectedIdsData = data['selectedIds'];
    const selectedIdsArray = Array.isArray(selectedIdsData) ? (selectedIdsData as string[]) : [];
    const selectedIds = new Set<string>(selectedIdsArray);

    // Get optional backgroundColor with fallback
    const bgColor = data['backgroundColor'];
    const backgroundColor = typeof bgColor === 'string' ? bgColor : '#ffffff';

    // Get optional guides with fallback
    const guidesData = data['guides'];
    const guides: Guide[] = Array.isArray(guidesData) ? (guidesData as Guide[]) : [];

    const canvasState: CanvasState = {
      width,
      height,
      backgroundColor,
      elements,
      selectedIds,
      guides,
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
   * Clears all elements from the canvas.
   *
   * Removes all elements and clears the selection. Creates a history entry
   * so the operation can be undone. Does not clear guides.
   *
   * @see {@link clearGuides} to also clear guides
   * @see {@link fromJSON} to replace with new state
   *
   * @example Clear button
   * ```typescript
   * clearButton.addEventListener('click', () => {
   *   if (confirm('Clear all elements?')) {
   *     editor.clear();
   *     editor.render();
   *   }
   * });
   * ```
   *
   * @example New document
   * ```typescript
   * function newDocument() {
   *   editor.clear();
   *   editor.clearGuides();
   *   editor.clearHistory();
   *   editor.render();
   * }
   * ```
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
  // Guides
  // ============================================================

  /**
   * Adds a guide line to the canvas.
   *
   * Guides are visual aids for alignment. Elements can snap to guides
   * when snapping is enabled.
   *
   * @param guide - Guide properties (id auto-generated if not provided)
   * @returns The generated or provided guide ID
   *
   * @see {@link addHorizontalGuide} for shorthand horizontal guide
   * @see {@link addVerticalGuide} for shorthand vertical guide
   * @see {@link removeGuide} to remove a guide
   * @see {@link setSnappingConfig} to enable/disable snap to guides
   *
   * @example Add a horizontal guide at y=100
   * ```typescript
   * const guideId = editor.addGuide({
   *   orientation: 'horizontal',
   *   position: 100,
   *   locked: false,
   *   visible: true
   * });
   * ```
   *
   * @example Add a colored vertical guide
   * ```typescript
   * editor.addGuide({
   *   orientation: 'vertical',
   *   position: 600,
   *   color: '#ff0000'
   * });
   * ```
   *
   * @example Add center guides
   * ```typescript
   * const { width, height } = editor.getCanvasSize();
   * editor.addGuide({ orientation: 'horizontal', position: height / 2 });
   * editor.addGuide({ orientation: 'vertical', position: width / 2 });
   * ```
   */
  addGuide(guide: GuideInput): string {
    const id = guide.id ?? generateId();
    const fullGuide: Guide = {
      id,
      orientation: guide.orientation,
      position: guide.position,
      locked: guide.locked ?? false,
      visible: guide.visible ?? true,
      ...(guide.color !== undefined && { color: guide.color }),
    };

    this._state.addGuide(fullGuide);
    this._history.push(this._state.snapshot());

    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });

    // Re-render to show guide
    if (this._interactionInitialized) {
      this.render();
    }

    return id;
  }

  /**
   * Removes a guide from the canvas.
   *
   * @param id - Guide ID to remove
   * @throws {Error} If guide with the specified ID does not exist
   *
   * @see {@link addGuide} to add guides
   * @see {@link clearGuides} to remove all guides
   *
   * @example Remove a guide
   * ```typescript
   * editor.removeGuide(guideId);
   * ```
   *
   * @example Remove guide on double-click (in guide interaction handler)
   * ```typescript
   * editor.on('guide:doubleclick', ({ guideId }) => {
   *   editor.removeGuide(guideId);
   * });
   * ```
   */
  removeGuide(id: string): void {
    this._state.removeGuide(id);
    this._history.push(this._state.snapshot());

    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });

    // Re-render to hide guide
    if (this._interactionInitialized) {
      this.render();
    }
  }

  /**
   * Updates a guide's properties.
   *
   * @param id - Guide ID to update
   * @param updates - Partial guide properties to merge with existing
   * @throws {Error} If guide with the specified ID does not exist
   *
   * @see {@link getGuide} to get current guide properties
   *
   * @example Move a guide
   * ```typescript
   * editor.updateGuide(guideId, { position: 500 });
   * ```
   *
   * @example Lock/unlock a guide
   * ```typescript
   * editor.updateGuide(guideId, { locked: true });
   * ```
   *
   * @example Change guide color
   * ```typescript
   * editor.updateGuide(guideId, { color: '#00ff00' });
   * ```
   */
  updateGuide(id: string, updates: Partial<Guide>): void {
    this._state.updateGuide(id, updates);
    this._history.push(this._state.snapshot());

    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });

    // Re-render to show updated guide
    if (this._interactionInitialized) {
      this.render();
    }
  }

  /**
   * Gets a guide by ID.
   *
   * @param id - Guide ID to find
   * @returns The guide or undefined if not found
   *
   * @example Check if guide exists
   * ```typescript
   * const guide = editor.getGuide(guideId);
   * if (guide) {
   *   console.log('Guide at position:', guide.position);
   * }
   * ```
   */
  getGuide(id: string): Guide | undefined {
    return this._state.getGuide(id);
  }

  /**
   * Gets all guides on the canvas.
   *
   * @returns Array of all guides
   *
   * @example Count guides
   * ```typescript
   * const guides = editor.getGuides();
   * console.log(`Canvas has ${guides.length} guides`);
   * ```
   *
   * @example Get horizontal guides only
   * ```typescript
   * const horizontalGuides = editor.getGuides()
   *   .filter(g => g.orientation === 'horizontal');
   * ```
   */
  getGuides(): Guide[] {
    return this._state.getGuides();
  }

  /**
   * Removes all guides from the canvas.
   *
   * @see {@link removeGuide} to remove a single guide
   * @see {@link clear} to also clear elements
   *
   * @example Clear all guides
   * ```typescript
   * editor.clearGuides();
   * ```
   *
   * @example Reset guides button
   * ```typescript
   * resetGuidesButton.addEventListener('click', () => {
   *   editor.clearGuides();
   * });
   * ```
   */
  clearGuides(): void {
    const guides = this._state.getGuides();
    if (guides.length === 0) {
      return;
    }

    this._state.clearGuides();
    this._history.push(this._state.snapshot());

    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });

    // Re-render to hide guides
    if (this._interactionInitialized) {
      this.render();
    }
  }

  /**
   * Adds a horizontal guide at the specified Y position.
   *
   * Shorthand for `addGuide({ orientation: 'horizontal', position: y })`.
   *
   * @param y - Y position in viewBox units
   * @param options - Optional guide settings
   * @returns The guide ID
   *
   * @see {@link addVerticalGuide} for vertical guides
   * @see {@link addGuide} for full control
   *
   * @example Add horizontal guide at y=200
   * ```typescript
   * editor.addHorizontalGuide(200);
   * ```
   *
   * @example Add locked horizontal guide
   * ```typescript
   * editor.addHorizontalGuide(100, { locked: true });
   * ```
   */
  addHorizontalGuide(
    y: number,
    options: { locked?: boolean; visible?: boolean; color?: string } = {},
  ): string {
    return this.addGuide({
      orientation: 'horizontal' as GuideOrientation,
      position: y,
      locked: options.locked ?? false,
      visible: options.visible ?? true,
      ...(options.color !== undefined && { color: options.color }),
    });
  }

  /**
   * Adds a vertical guide at the specified X position.
   *
   * Shorthand for `addGuide({ orientation: 'vertical', position: x })`.
   *
   * @param x - X position in viewBox units
   * @param options - Optional guide settings
   * @returns The guide ID
   *
   * @see {@link addHorizontalGuide} for horizontal guides
   * @see {@link addGuide} for full control
   *
   * @example Add vertical guide at x=300
   * ```typescript
   * editor.addVerticalGuide(300);
   * ```
   *
   * @example Add colored vertical guide
   * ```typescript
   * editor.addVerticalGuide(600, { color: '#ff0000' });
   * ```
   */
  addVerticalGuide(
    x: number,
    options: { locked?: boolean; visible?: boolean; color?: string } = {},
  ): string {
    return this.addGuide({
      orientation: 'vertical' as GuideOrientation,
      position: x,
      locked: options.locked ?? false,
      visible: options.visible ?? true,
      ...(options.color !== undefined && { color: options.color }),
    });
  }

  // ============================================================
  // Snapping Configuration
  // ============================================================

  /**
   * Gets the current snapping configuration.
   *
   * @returns Current snapping configuration
   *
   * @see {@link setSnappingConfig} to modify configuration
   * @see {@link SnappingConfig} for configuration options
   *
   * @example Check if snapping is enabled
   * ```typescript
   * const config = editor.getSnappingConfig();
   * snapToggle.checked = config.enabled;
   * ```
   *
   * @example Display snapping settings
   * ```typescript
   * const config = editor.getSnappingConfig();
   * console.log('Snap distance:', config.snapDistance);
   * console.log('Snap to guides:', config.snapToGuides);
   * console.log('Snap to elements:', config.snapToElements);
   * ```
   */
  getSnappingConfig(): SnappingConfig {
    return this._snappingManager.config;
  }

  /**
   * Updates the snapping configuration.
   *
   * Merges the provided updates with the existing configuration.
   *
   * @param updates - Partial configuration to merge
   *
   * @see {@link getSnappingConfig} to read current configuration
   * @see {@link enableSnapping} / {@link disableSnapping} for simple toggle
   *
   * @example Enable grid snapping
   * ```typescript
   * editor.setSnappingConfig({
   *   snapToGrid: true,
   *   gridSize: 20
   * });
   * ```
   *
   * @example Configure snap targets
   * ```typescript
   * editor.setSnappingConfig({
   *   snapToGuides: true,
   *   snapToElements: true,
   *   snapToElementCenters: true,
   *   snapToCanvasEdges: false,
   *   snapToCanvasCenter: true
   * });
   * ```
   *
   * @example Adjust snap distance
   * ```typescript
   * editor.setSnappingConfig({ snapDistance: 15 });
   * ```
   */
  setSnappingConfig(updates: Partial<SnappingConfig>): void {
    this._snappingManager.updateConfig(updates);
  }

  /**
   * Enables snapping.
   *
   * Shorthand for `setSnappingConfig({ enabled: true })`.
   *
   * @see {@link disableSnapping} to disable
   * @see {@link toggleSnapping} to toggle
   *
   * @example Enable snapping button
   * ```typescript
   * enableSnapButton.addEventListener('click', () => {
   *   editor.enableSnapping();
   * });
   * ```
   */
  enableSnapping(): void {
    this._snappingManager.updateConfig({ enabled: true });
  }

  /**
   * Disables snapping.
   *
   * Shorthand for `setSnappingConfig({ enabled: false })`.
   *
   * @see {@link enableSnapping} to enable
   * @see {@link toggleSnapping} to toggle
   *
   * @example Disable snapping button
   * ```typescript
   * disableSnapButton.addEventListener('click', () => {
   *   editor.disableSnapping();
   * });
   * ```
   */
  disableSnapping(): void {
    this._snappingManager.updateConfig({ enabled: false });
  }

  /**
   * Toggles snapping on/off.
   *
   * @returns The new enabled state (true if now enabled, false if disabled)
   *
   * @see {@link enableSnapping} / {@link disableSnapping} for explicit control
   *
   * @example Toggle snapping checkbox
   * ```typescript
   * snapCheckbox.addEventListener('change', () => {
   *   const isEnabled = editor.toggleSnapping();
   *   snapCheckbox.checked = isEnabled;
   * });
   * ```
   *
   * @example Keyboard shortcut
   * ```typescript
   * document.addEventListener('keydown', (e) => {
   *   if (e.key === 's' && e.altKey) {
   *     const enabled = editor.toggleSnapping();
   *     showToast(`Snapping ${enabled ? 'enabled' : 'disabled'}`);
   *   }
   * });
   * ```
   */
  toggleSnapping(): boolean {
    const newEnabled = !this._snappingManager.config.enabled;
    this._snappingManager.updateConfig({ enabled: newEnabled });
    return newEnabled;
  }

  // ============================================================
  // Alignment & Distribution
  // ============================================================

  /**
   * Gets element bounds for alignment calculations
   * @internal
   */
  private _getElementBoundsForAlignment(ids: string[]): ElementBounds[] {
    const result: ElementBounds[] = [];
    for (const id of ids) {
      const element = this._state.getElement(id);
      if (!element) {
        continue;
      }
      const bounds = this._getElementBounds(element);
      if (bounds) {
        result.push({ id, bounds });
      }
    }
    return result;
  }

  /**
   * Applies alignment results to elements
   * @internal
   */
  private _applyAlignmentResults(results: AlignmentResult[]): void {
    if (results.length === 0) {
      return;
    }

    // Update each element silently
    for (const { id, deltaX, deltaY } of results) {
      const element = this._state.getElement(id);
      if (!element) {
        continue;
      }
      this._state.updateElement(id, {
        transform: {
          ...element.transform,
          x: element.transform.x + deltaX,
          y: element.transform.y + deltaY,
        },
      });
    }

    // Push history once for the batch operation
    this._history.push(this._state.snapshot());

    // Emit events for all updated elements
    for (const { id } of results) {
      const updatedElement = this._state.getElement(id);
      if (updatedElement) {
        this.emit('element:updated', { id, element: updatedElement });
      }
    }
    this.emit('state:changed', { state: this._state.state });
    this.emit('history:changed', {
      canUndo: this._history.canUndo(),
      canRedo: this._history.canRedo(),
    });
  }

  /**
   * Aligns elements to the left edge
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @param options - Alignment options
   *
   * @example
   * ```typescript
   * // Align selected elements to the left
   * editor.alignLeft();
   *
   * // Align specific elements to the canvas left edge
   * editor.alignLeft([id1, id2, id3], { relativeTo: 'canvas' });
   * ```
   */
  alignLeft(ids?: string[], options: AlignmentOptions = {}): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const canvasBounds: BoundingBox = { x: 0, y: 0, ...this.getCanvasSize() };
    const results = alignLeftUtil(elements, canvasBounds, options);
    this._applyAlignmentResults(results);
  }

  /**
   * Aligns elements to the right edge
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @param options - Alignment options
   *
   * @example
   * ```typescript
   * // Align selected elements to the right
   * editor.alignRight();
   *
   * // Align specific elements to the canvas right edge
   * editor.alignRight([id1, id2, id3], { relativeTo: 'canvas' });
   * ```
   */
  alignRight(ids?: string[], options: AlignmentOptions = {}): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const canvasBounds: BoundingBox = { x: 0, y: 0, ...this.getCanvasSize() };
    const results = alignRightUtil(elements, canvasBounds, options);
    this._applyAlignmentResults(results);
  }

  /**
   * Aligns elements to the top edge
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @param options - Alignment options
   *
   * @example
   * ```typescript
   * // Align selected elements to the top
   * editor.alignTop();
   *
   * // Align specific elements to the canvas top edge
   * editor.alignTop([id1, id2, id3], { relativeTo: 'canvas' });
   * ```
   */
  alignTop(ids?: string[], options: AlignmentOptions = {}): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const canvasBounds: BoundingBox = { x: 0, y: 0, ...this.getCanvasSize() };
    const results = alignTopUtil(elements, canvasBounds, options);
    this._applyAlignmentResults(results);
  }

  /**
   * Aligns elements to the bottom edge
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @param options - Alignment options
   *
   * @example
   * ```typescript
   * // Align selected elements to the bottom
   * editor.alignBottom();
   *
   * // Align specific elements to the canvas bottom edge
   * editor.alignBottom([id1, id2, id3], { relativeTo: 'canvas' });
   * ```
   */
  alignBottom(ids?: string[], options: AlignmentOptions = {}): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const canvasBounds: BoundingBox = { x: 0, y: 0, ...this.getCanvasSize() };
    const results = alignBottomUtil(elements, canvasBounds, options);
    this._applyAlignmentResults(results);
  }

  /**
   * Aligns elements to the horizontal center
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @param options - Alignment options
   *
   * @example
   * ```typescript
   * // Align selected elements horizontally centered
   * editor.alignCenterHorizontal();
   *
   * // Align specific elements to canvas horizontal center
   * editor.alignCenterHorizontal([id1, id2], { relativeTo: 'canvas' });
   * ```
   */
  alignCenterHorizontal(ids?: string[], options: AlignmentOptions = {}): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const canvasBounds: BoundingBox = { x: 0, y: 0, ...this.getCanvasSize() };
    const results = alignCenterHorizontalUtil(elements, canvasBounds, options);
    this._applyAlignmentResults(results);
  }

  /**
   * Aligns elements to the vertical center
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @param options - Alignment options
   *
   * @example
   * ```typescript
   * // Align selected elements vertically centered
   * editor.alignCenterVertical();
   *
   * // Align specific elements to canvas vertical center
   * editor.alignCenterVertical([id1, id2], { relativeTo: 'canvas' });
   * ```
   */
  alignCenterVertical(ids?: string[], options: AlignmentOptions = {}): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const canvasBounds: BoundingBox = { x: 0, y: 0, ...this.getCanvasSize() };
    const results = alignCenterVerticalUtil(elements, canvasBounds, options);
    this._applyAlignmentResults(results);
  }

  /**
   * Aligns elements to both horizontal and vertical center
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @param options - Alignment options
   *
   * @example
   * ```typescript
   * // Center selected elements within selection bounds
   * editor.alignCenter();
   *
   * // Center specific elements on canvas
   * editor.alignCenter([id1, id2], { relativeTo: 'canvas' });
   * ```
   */
  alignCenter(ids?: string[], options: AlignmentOptions = {}): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const canvasBounds: BoundingBox = { x: 0, y: 0, ...this.getCanvasSize() };
    const results = alignCenterUtil(elements, canvasBounds, options);
    this._applyAlignmentResults(results);
  }

  /**
   * Distributes elements evenly by their left edges (horizontal)
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @remarks Requires at least 3 elements to distribute
   *
   * @example
   * ```typescript
   * editor.distributeLeft();
   * ```
   */
  distributeLeft(ids?: string[]): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const results = distributeLeftUtil(elements);
    this._applyAlignmentResults(results);
  }

  /**
   * Distributes elements evenly by their horizontal centers
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @remarks Requires at least 3 elements to distribute
   *
   * @example
   * ```typescript
   * editor.distributeHorizontal();
   * ```
   */
  distributeHorizontal(ids?: string[]): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const results = distributeCenterHorizontalUtil(elements);
    this._applyAlignmentResults(results);
  }

  /**
   * Distributes elements evenly by their right edges (horizontal)
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @remarks Requires at least 3 elements to distribute
   *
   * @example
   * ```typescript
   * editor.distributeRight();
   * ```
   */
  distributeRight(ids?: string[]): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const results = distributeRightUtil(elements);
    this._applyAlignmentResults(results);
  }

  /**
   * Distributes elements evenly by their top edges (vertical)
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @remarks Requires at least 3 elements to distribute
   *
   * @example
   * ```typescript
   * editor.distributeTop();
   * ```
   */
  distributeTop(ids?: string[]): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const results = distributeTopUtil(elements);
    this._applyAlignmentResults(results);
  }

  /**
   * Distributes elements evenly by their vertical centers
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @remarks Requires at least 3 elements to distribute
   *
   * @example
   * ```typescript
   * editor.distributeVertical();
   * ```
   */
  distributeVertical(ids?: string[]): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const results = distributeCenterVerticalUtil(elements);
    this._applyAlignmentResults(results);
  }

  /**
   * Distributes elements evenly by their bottom edges (vertical)
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @remarks Requires at least 3 elements to distribute
   *
   * @example
   * ```typescript
   * editor.distributeBottom();
   * ```
   */
  distributeBottom(ids?: string[]): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const results = distributeBottomUtil(elements);
    this._applyAlignmentResults(results);
  }

  /**
   * Distributes elements with equal horizontal gaps between them
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @remarks Requires at least 3 elements to distribute
   *
   * @example
   * ```typescript
   * editor.distributeHorizontalGaps();
   * ```
   */
  distributeHorizontalGaps(ids?: string[]): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const results = distributeHorizontalGapsUtil(elements);
    this._applyAlignmentResults(results);
  }

  /**
   * Distributes elements with equal vertical gaps between them
   *
   * @param ids - Optional array of element IDs. Uses current selection if not provided.
   * @remarks Requires at least 3 elements to distribute
   *
   * @example
   * ```typescript
   * editor.distributeVerticalGaps();
   * ```
   */
  distributeVerticalGaps(ids?: string[]): void {
    const elementIds = ids ?? this.getSelection();
    const elements = this._getElementBoundsForAlignment(elementIds);
    const results = distributeVerticalGapsUtil(elements);
    this._applyAlignmentResults(results);
  }

  // ============================================================
  // Tools & Interaction
  // ============================================================

  /**
   * Sets the current tool.
   *
   * Changes how the user interacts with the canvas:
   * - `'select'` - Click to select, drag to move/resize/rotate elements
   * - `'pan'` - Drag to pan the canvas viewport
   * - `'add-image'` - Click to place an image element
   * - `'add-text'` - Click to place a text element
   * - `'add-shape'` - Click and drag to create a shape element
   *
   * @param tool - Tool type to activate
   *
   * @see {@link getTool} to get current tool
   * @see {@link ToolType} for available tools
   *
   * @example Tool buttons
   * ```typescript
   * selectButton.addEventListener('click', () => editor.setTool('select'));
   * panButton.addEventListener('click', () => editor.setTool('pan'));
   * shapeButton.addEventListener('click', () => editor.setTool('add-shape'));
   * textButton.addEventListener('click', () => editor.setTool('add-text'));
   * ```
   *
   * @example Keyboard shortcuts for tools
   * ```typescript
   * document.addEventListener('keydown', (e) => {
   *   switch (e.key) {
   *     case 'v': editor.setTool('select'); break;
   *     case 'h': editor.setTool('pan'); break;
   *     case 'r': editor.setTool('add-shape'); break;
   *     case 't': editor.setTool('add-text'); break;
   *   }
   * });
   * ```
   */
  setTool(tool: ToolType): void {
    this._currentTool = tool;
    if (this._interactionManager) {
      this._interactionManager.setTool(tool);
    }
    this.emit('tool:changed', { tool });
  }

  /**
   * Gets the current tool.
   *
   * @returns Current tool type
   *
   * @see {@link setTool} to change the current tool
   *
   * @example Update toolbar UI
   * ```typescript
   * editor.on('tool:changed', ({ tool }) => {
   *   toolButtons.forEach(btn => {
   *     btn.classList.toggle('active', btn.dataset.tool === tool);
   *   });
   * });
   * ```
   *
   * @example Check current tool
   * ```typescript
   * if (editor.getTool() === 'select') {
   *   // Selection tool specific logic
   * }
   * ```
   */
  getTool(): ToolType {
    return this._currentTool;
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  /**
   * Forces a re-render of the canvas.
   *
   * Call this after making state changes to update the visual display.
   * Most methods automatically trigger a render, but you may need to
   * call this manually in some cases.
   *
   * @throws {Error} If the editor has been destroyed
   *
   * @see {@link destroy} to clean up the editor
   *
   * @example Initial render after setup
   * ```typescript
   * const editor = new SVGComposer(container, { width: 800, height: 600 });
   * editor.addElement({ ... });
   * editor.render(); // Display the canvas
   * ```
   *
   * @example Re-render after fromJSON
   * ```typescript
   * editor.fromJSON(savedState);
   * editor.render();
   * ```
   *
   * @example Force refresh
   * ```typescript
   * window.addEventListener('resize', () => {
   *   editor.render();
   * });
   * ```
   */
  render(): void {
    if (this._destroyed) {
      throw new Error('Cannot render: editor has been destroyed');
    }

    // Get viewport state from interaction manager if available
    const viewportState = this._interactionManager?.getViewportState();

    this._renderer.render(
      this._container,
      this._state.state,
      (id) => this._state.getElement(id),
      viewportState,
      (filter) => this._filterManager.resolveElementFilter(filter),
      (id) => this._filterManager.getFilter(id),
      (filters) => this._filterManager.createCompositeFilter(filters),
    );

    // Initialize interaction manager on first render (after SVG is in DOM)
    if (!this._interactionInitialized && this._renderer.svgRoot) {
      this._initializeInteraction();
      this._interactionInitialized = true;
    }

    // Update selection handles
    if (this._interactionManager) {
      this._interactionManager.updateHandles();
    }

    // Render guides
    const canvasSize = this.getCanvasSize();
    this._renderer.renderGuides(this._state.getGuides(), canvasSize.width, canvasSize.height);

    // Render snap indicators if active
    const snapLines = this._snappingManager.activeSnapLines;
    if (snapLines.vertical.length > 0 || snapLines.horizontal.length > 0) {
      this._renderer.renderSnapIndicators(snapLines, canvasSize.width, canvasSize.height);
    }
  }

  /**
   * Initializes the interaction manager
   */
  private _initializeInteraction(): void {
    const svgRoot = this._renderer.svgRoot;
    if (!svgRoot) {
      return;
    }

    this._interactionManager = new InteractionManager({
      container: this._container,
      svgRoot,
      composer: {
        select: (id: string): void => {
          this.select(id);
        },
        addToSelection: (id: string): void => {
          this.addToSelection(id);
        },
        removeFromSelection: (id: string): void => {
          this.removeFromSelection(id);
        },
        clearSelection: (): void => {
          this.clearSelection();
        },
        getSelection: (): string[] => this.getSelection(),
        addElement: (element: Omit<BaseElement, 'id'>): string => {
          return this.addElement(element);
        },
        updateElement: (id: string, updates: Partial<BaseElement>): void => {
          this.updateElement(id, updates);
        },
        updateElementSilent: (id: string, updates: Partial<BaseElement>): void => {
          this.updateElementSilent(id, updates);
        },
        pushHistory: (): void => {
          this.pushHistory();
        },
        getElement: (id: string): BaseElement | undefined => this.getElement(id),
        removeElement: (id: string): void => {
          this.removeElement(id);
        },
        getCanvasSize: (): { width: number; height: number } => this.getCanvasSize(),
      },
      getElements: (): BaseElement[] => this.getAllElements(),
      getSelectionBounds: (): BoundingBox | null => this.getSelectionBounds(),
      getSelectionRotation: (): number => this.getSelectionRotation(),
      idPrefix: this._renderer.idPrefix,
      onRequestRender: (): void => {
        this.render();
      },
      // Snapping callbacks
      calculateSnap: (
        x: number,
        y: number,
        bounds: BoundingBox,
        excludeIds: Set<string>,
      ): SnapResult => {
        return this._snappingManager.calculateSnap(
          x,
          y,
          bounds,
          this._state.state,
          excludeIds,
          (element: BaseElement) => this._getElementBounds(element),
        );
      },
      renderSnapIndicators: (): void => {
        const snapLines = this._snappingManager.activeSnapLines;
        const canvasSize = this.getCanvasSize();
        this._renderer.renderSnapIndicators(snapLines, canvasSize.width, canvasSize.height);
      },
      clearSnapIndicators: (): void => {
        // Direct renderer manipulation for performance - clearing indicators
        // doesn't require a full render cycle since it's just removing overlay elements
        this._snappingManager.clearActiveSnapLines();
        this._renderer.clearSnapIndicators();
      },
      getSnappingConfig: (): SnappingConfig => this._snappingManager.config,
    });

    // Create and register tools
    const toolContext = this._interactionManager.createToolContext();
    this._interactionManager.registerTool(new SelectTool(toolContext));
    this._interactionManager.registerTool(new PanTool(toolContext));
    this._interactionManager.registerTool(new AddShapeTool(toolContext));
    this._interactionManager.registerTool(new AddTextTool(toolContext));
    this._interactionManager.registerTool(new AddImageTool(toolContext));

    // Initialize
    this._interactionManager.initialize();
  }

  /**
   * Destroys the editor and cleans up resources.
   *
   * Removes event listeners, clears state, and releases memory.
   * This method is idempotent - calling it multiple times is safe.
   *
   * @remarks
   * After calling destroy:
   * - `render()` will throw an error
   * - `isDestroyed` will return true
   * - The editor instance should be discarded
   *
   * @see {@link isDestroyed} to check if editor is destroyed
   *
   * @example Cleanup on component unmount (React)
   * ```typescript
   * useEffect(() => {
   *   const editor = new SVGComposer(containerRef.current);
   *   editor.render();
   *   editorRef.current = editor;
   *
   *   return () => {
   *     editor.destroy();
   *   };
   * }, []);
   * ```
   *
   * @example Cleanup before creating new editor
   * ```typescript
   * function resetEditor() {
   *   if (editor) {
   *     editor.destroy();
   *   }
   *   editor = new SVGComposer(container);
   *   editor.render();
   * }
   * ```
   */
  destroy(): void {
    if (this._destroyed) {
      return; // Already destroyed, idempotent
    }

    // Clean up interaction manager
    if (this._interactionManager) {
      this._interactionManager.destroy();
      this._interactionManager = null;
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
      guides: [],
    });

    // Clear history
    this._history.clear();

    // Mark as destroyed
    this._destroyed = true;
    this._interactionInitialized = false;
  }

  /**
   * Checks if the editor has been destroyed.
   *
   * @returns True if `destroy()` has been called
   *
   * @see {@link destroy} to destroy the editor
   *
   * @example Guard against using destroyed editor
   * ```typescript
   * function safeRender() {
   *   if (!editor.isDestroyed) {
   *     editor.render();
   *   }
   * }
   * ```
   */
  get isDestroyed(): boolean {
    return this._destroyed;
  }
}
