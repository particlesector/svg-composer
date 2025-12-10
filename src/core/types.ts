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
}
