/**
 * Core type definitions for SVG Composer
 *
 * This module contains all the fundamental types used throughout the library,
 * including geometric primitives, transform data, editor options, and event types.
 *
 * @module types
 */

/**
 * Represents a 2D point in viewBox coordinates.
 *
 * Points are used throughout the library for positions, offsets, and mouse coordinates.
 * All values are in SVG viewBox units (not screen pixels).
 *
 * @example
 * ```typescript
 * const center: Point = { x: 600, y: 600 };
 * const offset: Point = { x: 10, y: -5 };
 * ```
 */
export interface Point {
  /** X coordinate in viewBox units */
  x: number;
  /** Y coordinate in viewBox units */
  y: number;
}

/**
 * Represents a transform applied to an element.
 *
 * Transforms define the position, rotation, and scale of an element on the canvas.
 * All transforms are applied relative to the element's origin point.
 *
 * @example
 * ```typescript
 * const defaultTransform: Transform = {
 *   x: 100,        // Position at x=100
 *   y: 200,        // Position at y=200
 *   rotation: 0,   // No rotation
 *   scaleX: 1,     // Normal horizontal scale
 *   scaleY: 1      // Normal vertical scale
 * };
 *
 * const rotatedAndScaled: Transform = {
 *   x: 300,
 *   y: 300,
 *   rotation: 45,   // Rotated 45 degrees clockwise
 *   scaleX: 1.5,    // 150% horizontal scale
 *   scaleY: 0.75    // 75% vertical scale
 * };
 * ```
 */
export interface Transform {
  /** Position X in viewBox units */
  x: number;
  /** Position Y in viewBox units */
  y: number;
  /** Rotation in degrees (0-360), clockwise from 3 o'clock */
  rotation: number;
  /** Scale factor for X axis (1.0 = 100%, 2.0 = 200%, etc.) */
  scaleX: number;
  /** Scale factor for Y axis (1.0 = 100%, 2.0 = 200%, etc.) */
  scaleY: number;
}

/**
 * Represents an axis-aligned bounding box in viewBox coordinates.
 *
 * Used for hit testing, selection bounds, and element dimensions.
 * The box is defined by its top-left corner (x, y) and dimensions.
 *
 * @example
 * ```typescript
 * const bounds: BoundingBox = {
 *   x: 50,       // Left edge at x=50
 *   y: 100,      // Top edge at y=100
 *   width: 200,  // Extends 200 units to the right
 *   height: 150  // Extends 150 units downward
 * };
 *
 * // Calculate center point
 * const centerX = bounds.x + bounds.width / 2;  // 150
 * const centerY = bounds.y + bounds.height / 2; // 175
 * ```
 */
export interface BoundingBox {
  /** X coordinate of the left edge */
  x: number;
  /** Y coordinate of the top edge */
  y: number;
  /** Width of the bounding box */
  width: number;
  /** Height of the bounding box */
  height: number;
}

/**
 * Available tool types for the editor.
 *
 * Tools determine how the user interacts with the canvas:
 * - `'select'` - Select, move, resize, and rotate elements
 * - `'pan'` - Pan/scroll the canvas viewport
 * - `'add-image'` - Click to add an image element
 * - `'add-text'` - Click to add a text element
 * - `'add-shape'` - Click and drag to add a shape element
 *
 * @example
 * ```typescript
 * // Switch to pan tool
 * editor.setTool('pan');
 *
 * // Check current tool
 * if (editor.getTool() === 'select') {
 *   console.log('Ready to select elements');
 * }
 * ```
 */
export type ToolType = 'select' | 'pan' | 'add-image' | 'add-text' | 'add-shape';

/**
 * Event types emitted by the editor.
 *
 * Subscribe to these events using `editor.on(eventName, handler)`.
 * All events provide strongly-typed payloads.
 *
 * @example
 * ```typescript
 * // Listen to all event types
 * editor.on('element:added', ({ element }) => { ... });
 * editor.on('element:updated', ({ id, element }) => { ... });
 * editor.on('element:removed', ({ id }) => { ... });
 * editor.on('selection:changed', ({ selectedIds }) => { ... });
 * editor.on('state:changed', ({ state }) => { ... });
 * editor.on('history:changed', ({ canUndo, canRedo }) => { ... });
 * editor.on('tool:changed', ({ tool }) => { ... });
 * editor.on('error', ({ message, details }) => { ... });
 * ```
 */
export interface EditorEvents {
  /**
   * Emitted when a new element is added to the canvas.
   * Payload contains the complete element data including generated ID.
   */
  'element:added': { element: import('../elements/types.js').BaseElement };

  /**
   * Emitted when an existing element is modified.
   * Payload contains both the element ID and updated element data.
   */
  'element:updated': { id: string; element: import('../elements/types.js').BaseElement };

  /**
   * Emitted when an element is removed from the canvas.
   * Payload contains the ID of the removed element.
   */
  'element:removed': { id: string };

  /**
   * Emitted when the selection changes.
   * Payload contains array of all currently selected element IDs.
   * Empty array indicates no selection.
   */
  'selection:changed': { selectedIds: string[] };

  /**
   * Emitted when the canvas background is clicked.
   * Payload contains click coordinates and optionally the clicked element.
   */
  'canvas:clicked': { x: number; y: number; element?: import('../elements/types.js').BaseElement };

  /**
   * Emitted on any state change (elements, selection, guides, etc.).
   * Payload contains the complete current canvas state.
   * Use for syncing external state or triggering re-renders.
   */
  'state:changed': { state: CanvasState };

  /**
   * Emitted when history state changes (after undo, redo, or new actions).
   * Payload indicates whether undo/redo operations are available.
   * Use for enabling/disabling undo/redo buttons.
   */
  'history:changed': { canUndo: boolean; canRedo: boolean };

  /**
   * Emitted when the active tool changes.
   * Payload contains the new tool type.
   */
  'tool:changed': { tool: ToolType };

  /**
   * Emitted when an error occurs.
   * Payload contains error message and optional details.
   */
  error: { message: string; details?: unknown };
}

/**
 * Configuration options for the SVGComposer constructor.
 *
 * All options are optional and have sensible defaults.
 *
 * @example Default configuration
 * ```typescript
 * // Use all defaults
 * const editor = new SVGComposer(container);
 * // Equivalent to: width=1200, height=1200, backgroundColor='#ffffff', historyLimit=50
 * ```
 *
 * @example Custom configuration
 * ```typescript
 * const editor = new SVGComposer(container, {
 *   width: 1920,
 *   height: 1080,
 *   backgroundColor: '#f0f0f0',
 *   historyLimit: 100
 * });
 * ```
 */
export interface SVGComposerOptions {
  /** ViewBox width in SVG units (default: 1200) */
  width?: number;
  /** ViewBox height in SVG units (default: 1200) */
  height?: number;
  /** Background color as CSS color string (default: '#ffffff') */
  backgroundColor?: string;
  /** Maximum number of undo/redo history entries (default: 50) */
  historyLimit?: number;
}

/**
 * Represents the complete state of the canvas.
 *
 * This is the central state object that contains all elements, selection,
 * and canvas configuration. It is serializable via `toJSON()` and can be
 * restored via `fromJSON()`.
 *
 * @example Accessing state
 * ```typescript
 * editor.on('state:changed', ({ state }) => {
 *   console.log('Canvas size:', state.width, 'x', state.height);
 *   console.log('Element count:', state.elements.size);
 *   console.log('Selected:', state.selectedIds.size, 'elements');
 *   console.log('Guides:', state.guides.length);
 * });
 * ```
 */
export interface CanvasState {
  /** ViewBox width in SVG units */
  width: number;
  /** ViewBox height in SVG units */
  height: number;
  /** Background color as CSS color string */
  backgroundColor: string;
  /** Map of element IDs to element data */
  elements: Map<string, import('../elements/types.js').BaseElement>;
  /** Set of currently selected element IDs */
  selectedIds: Set<string>;
  /** Array of guide lines on the canvas */
  guides: Guide[];
}

// ============================================================
// Guides & Snapping Types
// ============================================================

/**
 * Orientation of a guide line.
 *
 * - `'horizontal'` - A horizontal line spanning the canvas width (positioned by Y)
 * - `'vertical'` - A vertical line spanning the canvas height (positioned by X)
 *
 * @example
 * ```typescript
 * // Horizontal guide at y=100
 * editor.addGuide({ orientation: 'horizontal', position: 100 });
 *
 * // Vertical guide at x=200
 * editor.addGuide({ orientation: 'vertical', position: 200 });
 * ```
 */
export type GuideOrientation = 'horizontal' | 'vertical';

/**
 * Represents a guide line on the canvas.
 *
 * Guides are visual aids that help with element alignment. Elements can
 * snap to guides when snapping is enabled.
 *
 * @example
 * ```typescript
 * const guide: Guide = {
 *   id: 'guide-1',
 *   orientation: 'horizontal',
 *   position: 600,        // Center of a 1200-height canvas
 *   locked: false,        // Can be moved
 *   visible: true,        // Rendered on canvas
 *   color: '#ff0000'      // Red guide line
 * };
 * ```
 */
export interface Guide {
  /** Unique identifier for the guide */
  id: string;
  /** Orientation: 'horizontal' (Y position) or 'vertical' (X position) */
  orientation: GuideOrientation;
  /** Position in viewBox units (Y for horizontal, X for vertical) */
  position: number;
  /** Whether the guide is locked and cannot be moved interactively */
  locked: boolean;
  /** Whether the guide is visible on the canvas */
  visible: boolean;
  /** Optional custom color for the guide (CSS color string, default: cyan) */
  color?: string;
}

/**
 * Input type for creating a new guide.
 *
 * Only `orientation` and `position` are required. Other fields default to:
 * - `id`: auto-generated
 * - `locked`: false
 * - `visible`: true
 *
 * @example
 * ```typescript
 * // Minimal guide input
 * editor.addGuide({ orientation: 'horizontal', position: 100 });
 *
 * // Full guide input
 * editor.addGuide({
 *   orientation: 'vertical',
 *   position: 600,
 *   locked: true,
 *   visible: true,
 *   color: '#00ff00'
 * });
 * ```
 */
export type GuideInput = Pick<Guide, 'orientation' | 'position'> &
  Partial<Omit<Guide, 'orientation' | 'position'>>;

/**
 * Types of snap targets that elements can snap to.
 *
 * - `'guide'` - User-created guide lines
 * - `'grid'` - Grid intersections (when grid snapping enabled)
 * - `'element-edge'` - Edges of other elements
 * - `'element-center'` - Center points of other elements
 * - `'canvas-edge'` - Canvas boundaries
 * - `'canvas-center'` - Center of the canvas
 *
 * @example
 * ```typescript
 * editor.on('state:changed', () => {
 *   const config = editor.getSnappingConfig();
 *   if (config.snapToGuides) {
 *     // Snap to 'guide' targets
 *   }
 *   if (config.snapToElements) {
 *     // Snap to 'element-edge' targets
 *   }
 * });
 * ```
 */
export type SnapTargetType =
  | 'guide'
  | 'grid'
  | 'element-edge'
  | 'element-center'
  | 'canvas-edge'
  | 'canvas-center';

/**
 * Represents a snap target that elements can snap to during drag operations.
 *
 * Snap targets are generated dynamically based on the current snapping
 * configuration and canvas state.
 *
 * @example
 * ```typescript
 * const target: SnapTarget = {
 *   type: 'guide',
 *   orientation: 'vertical',
 *   position: 600,
 *   referenceId: 'guide-center'
 * };
 * ```
 */
export interface SnapTarget {
  /** Type of snap target (guide, grid, element, canvas) */
  type: SnapTargetType;
  /** Orientation: 'horizontal' affects Y position, 'vertical' affects X position */
  orientation: GuideOrientation;
  /** Position in viewBox units where snapping occurs */
  position: number;
  /** Reference ID of the source (guide ID or element ID) */
  referenceId?: string;
}

/**
 * Result of a snap calculation during element movement.
 *
 * Contains the adjusted position after snapping and information about
 * which targets were matched on each axis.
 *
 * @example
 * ```typescript
 * // Snap result when element snaps to a vertical guide at x=600
 * const result: SnapResult = {
 *   snappedX: true,
 *   snappedY: false,
 *   x: 600,    // Adjusted to guide position
 *   y: 250,    // Unchanged
 *   snapTargetX: { type: 'guide', orientation: 'vertical', position: 600 },
 *   snapTargetY: undefined
 * };
 * ```
 */
export interface SnapResult {
  /** Whether snapping occurred on the X axis */
  snappedX: boolean;
  /** Whether snapping occurred on the Y axis */
  snappedY: boolean;
  /** Final X position (snapped or original) */
  x: number;
  /** Final Y position (snapped or original) */
  y: number;
  /** The snap target matched for X axis, if any */
  snapTargetX?: SnapTarget;
  /** The snap target matched for Y axis, if any */
  snapTargetY?: SnapTarget;
}

/**
 * Configuration options for snapping behavior.
 *
 * Snapping helps users align elements precisely by automatically adjusting
 * element positions to nearby snap targets (guides, elements, grid, etc.).
 *
 * @example Enable only guide snapping
 * ```typescript
 * editor.setSnappingConfig({
 *   enabled: true,
 *   snapToGuides: true,
 *   snapToElements: false,
 *   snapToElementCenters: false,
 *   snapToCanvasEdges: false,
 *   snapToCanvasCenter: false,
 *   snapToGrid: false
 * });
 * ```
 *
 * @example Enable grid snapping
 * ```typescript
 * editor.setSnappingConfig({
 *   enabled: true,
 *   snapToGrid: true,
 *   gridSize: 20,        // Snap to 20-unit grid
 *   snapToGuides: false,
 *   snapToElements: false
 * });
 * ```
 *
 * @example Disable snapping entirely
 * ```typescript
 * editor.setSnappingConfig({ enabled: false });
 * // Or use the convenience method:
 * editor.disableSnapping();
 * ```
 */
export interface SnappingConfig {
  /** Master switch: whether snapping is enabled at all */
  enabled: boolean;
  /** Distance threshold in viewBox units (element snaps when within this distance) */
  snapDistance: number;
  /** Snap to user-created guide lines */
  snapToGuides: boolean;
  /** Snap to a regular grid */
  snapToGrid: boolean;
  /** Grid spacing in viewBox units (only used when snapToGrid is true) */
  gridSize: number;
  /** Snap to edges (left, right, top, bottom) of other elements */
  snapToElements: boolean;
  /** Snap to center points of other elements */
  snapToElementCenters: boolean;
  /** Snap to canvas boundaries (x=0, y=0, x=width, y=height) */
  snapToCanvasEdges: boolean;
  /** Snap to canvas center point */
  snapToCanvasCenter: boolean;
  /** Show visual indicators (lines) when snapping occurs */
  showSnapIndicators: boolean;
}

/**
 * Default snapping configuration.
 *
 * Enables snapping to guides, elements, and canvas with an 8-unit threshold.
 * Grid snapping is disabled by default.
 */
export const DEFAULT_SNAPPING_CONFIG: SnappingConfig = {
  enabled: true,
  snapDistance: 8,
  snapToGuides: true,
  snapToGrid: false,
  gridSize: 10,
  snapToElements: true,
  snapToElementCenters: true,
  snapToCanvasEdges: true,
  snapToCanvasCenter: true,
  showSnapIndicators: true,
};

// ============================================================
// Alignment Types
// ============================================================

/**
 * Reference point for alignment operations.
 *
 * - `'selection'` - Align relative to the bounding box of all selected elements
 * - `'canvas'` - Align relative to the canvas boundaries
 * - `'first'` - Align relative to the first selected element (others move to match)
 *
 * @example
 * ```typescript
 * // Center elements on canvas
 * editor.alignCenter(undefined, { relativeTo: 'canvas' });
 *
 * // Align to first selected element
 * editor.alignLeft(undefined, { relativeTo: 'first' });
 *
 * // Align within selection bounds (default)
 * editor.alignTop(); // relativeTo: 'selection' is default
 * ```
 */
export type AlignmentReference = 'selection' | 'canvas' | 'first';

/**
 * Configuration options for alignment operations.
 *
 * @example
 * ```typescript
 * // Align selected elements to the left edge of the canvas
 * editor.alignLeft(undefined, { relativeTo: 'canvas' });
 *
 * // Align specific elements to the first element's position
 * editor.alignTop([id1, id2, id3], { relativeTo: 'first' });
 * ```
 */
export interface AlignmentOptions {
  /**
   * What to align relative to.
   * - `'selection'` (default): Align to the bounding box of selected elements
   * - `'canvas'`: Align to the canvas edges/center
   * - `'first'`: Align to the first element in the selection
   */
  relativeTo?: AlignmentReference;
}
