/**
 * Core type definitions for SVG Composer
 */

/**
 * Represents a 2D point in viewBox coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents a transform applied to an element
 */
export interface Transform {
  /** Position X in viewBox units */
  x: number;
  /** Position Y in viewBox units */
  y: number;
  /** Rotation in degrees (0-360) */
  rotation: number;
  /** Scale factor for X axis (1.0 = 100%) */
  scaleX: number;
  /** Scale factor for Y axis (1.0 = 100%) */
  scaleY: number;
}

/**
 * Represents a bounding box in viewBox coordinates
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Available tool types for the editor
 */
export type ToolType = 'select' | 'pan' | 'add-image' | 'add-text' | 'add-shape';

/**
 * Event types emitted by the editor
 */
export interface EditorEvents {
  'element:added': { element: import('../elements/types.js').BaseElement };
  'element:updated': { id: string; element: import('../elements/types.js').BaseElement };
  'element:removed': { id: string };
  'selection:changed': { selectedIds: string[] };
  'canvas:clicked': { x: number; y: number; element?: import('../elements/types.js').BaseElement };
  'state:changed': { state: CanvasState };
  'history:changed': { canUndo: boolean; canRedo: boolean };
  'tool:changed': { tool: ToolType };
  error: { message: string; details?: unknown };
}

/**
 * Configuration options for the SVGComposer constructor
 */
export interface SVGComposerOptions {
  /** ViewBox width (default: 1200) */
  width?: number;
  /** ViewBox height (default: 1200) */
  height?: number;
  /** Background color CSS string (default: '#ffffff') */
  backgroundColor?: string;
  /** Maximum history entries (default: 50) */
  historyLimit?: number;
}

/**
 * Represents the complete state of the canvas
 */
export interface CanvasState {
  /** ViewBox width */
  width: number;
  /** ViewBox height */
  height: number;
  /** Background color CSS string */
  backgroundColor: string;
  /** All elements on the canvas */
  elements: Map<string, import('../elements/types.js').BaseElement>;
  /** Currently selected element IDs */
  selectedIds: Set<string>;
  /** Guide lines on the canvas */
  guides: Guide[];
}

// ============================================================
// Guides & Snapping Types
// ============================================================

/**
 * Orientation of a guide line
 */
export type GuideOrientation = 'horizontal' | 'vertical';

/**
 * Represents a guide line on the canvas
 */
export interface Guide {
  /** Unique identifier for the guide */
  id: string;
  /** Orientation of the guide (horizontal or vertical) */
  orientation: GuideOrientation;
  /** Position in viewBox units (y for horizontal, x for vertical) */
  position: number;
  /** Whether the guide is locked (cannot be moved) */
  locked: boolean;
  /** Whether the guide is visible */
  visible: boolean;
  /** Optional custom color for the guide (CSS color string) */
  color?: string;
}

/**
 * Input type for creating a new guide.
 * Requires orientation and position, all other fields are optional.
 */
export type GuideInput = Pick<Guide, 'orientation' | 'position'> &
  Partial<Omit<Guide, 'orientation' | 'position'>>;

/**
 * Types of snap targets
 */
export type SnapTargetType =
  | 'guide'
  | 'grid'
  | 'element-edge'
  | 'element-center'
  | 'canvas-edge'
  | 'canvas-center';

/**
 * A snap target that elements can snap to
 */
export interface SnapTarget {
  /** Type of snap target */
  type: SnapTargetType;
  /** Orientation (horizontal affects Y, vertical affects X) */
  orientation: GuideOrientation;
  /** Position in viewBox units */
  position: number;
  /** Optional reference ID (guide ID or element ID) */
  referenceId?: string;
}

/**
 * Result of a snap calculation
 */
export interface SnapResult {
  /** Whether snapping occurred on X axis */
  snappedX: boolean;
  /** Whether snapping occurred on Y axis */
  snappedY: boolean;
  /** Adjusted X position (if snapped) */
  x: number;
  /** Adjusted Y position (if snapped) */
  y: number;
  /** The snap target that was matched for X axis */
  snapTargetX?: SnapTarget;
  /** The snap target that was matched for Y axis */
  snapTargetY?: SnapTarget;
}

/**
 * Configuration options for snapping behavior
 */
export interface SnappingConfig {
  /** Whether snapping is enabled */
  enabled: boolean;
  /** Snap distance threshold in viewBox units */
  snapDistance: number;
  /** Whether to snap to guides */
  snapToGuides: boolean;
  /** Whether to snap to grid */
  snapToGrid: boolean;
  /** Grid spacing in viewBox units (when snapToGrid is true) */
  gridSize: number;
  /** Whether to snap to other element edges */
  snapToElements: boolean;
  /** Whether to snap to other element centers */
  snapToElementCenters: boolean;
  /** Whether to snap to canvas edges */
  snapToCanvasEdges: boolean;
  /** Whether to snap to canvas center */
  snapToCanvasCenter: boolean;
  /** Whether to show snap indicators during drag */
  showSnapIndicators: boolean;
}

/**
 * Default snapping configuration
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
 * Alignment reference point options
 */
export type AlignmentReference = 'selection' | 'canvas' | 'first';

/**
 * Configuration options for alignment operations
 */
export interface AlignmentOptions {
  /** What to align relative to (default: 'selection') */
  relativeTo?: AlignmentReference;
}
