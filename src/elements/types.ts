/**
 * Element type definitions for SVG Composer
 */

import type { Transform } from '../core/types.js';

/**
 * Base interface for all canvas elements
 */
export interface BaseElement {
  /** Unique identifier (UUID, auto-generated) */
  id: string;
  /** Element type discriminator */
  type: 'image' | 'text' | 'shape' | 'group';
  /** Transform applied to the element */
  transform: Transform;
  /** Opacity from 0.0 to 1.0 */
  opacity: number;
  /** Stacking order */
  zIndex: number;
  /** Whether editing is prevented */
  locked: boolean;
  /** Whether the element is visible */
  visible: boolean;
}

/**
 * Image element for displaying raster images
 */
export interface ImageElement extends BaseElement {
  type: 'image';
  /** Asset URL */
  src: string;
  /** Original width in viewBox units */
  width: number;
  /** Original height in viewBox units */
  height: number;
  /** Optional clip-path ID reference */
  clipPath?: string;
}

/**
 * Text element for displaying text content
 */
export interface TextElement extends BaseElement {
  type: 'text';
  /** Text content to display */
  content: string;
  /** Font size in viewBox units */
  fontSize: number;
  /** CSS font family */
  fontFamily: string;
  /** CSS color string for fill */
  fill: string;
  /** Text alignment anchor */
  textAnchor: 'start' | 'middle' | 'end';
}

/**
 * Shape element for geometric shapes
 */
export interface ShapeElement extends BaseElement {
  type: 'shape';
  /** Shape type discriminator */
  shapeType: 'rect' | 'circle' | 'ellipse' | 'path';
  /** CSS color string for fill */
  fill: string;
  /** CSS color string for stroke */
  stroke: string;
  /** Stroke width in viewBox units */
  strokeWidth: number;

  // Rectangle specific
  /** Width for rectangles */
  width?: number;
  /** Height for rectangles */
  height?: number;
  /** Border radius for rectangles */
  rx?: number;

  // Circle specific
  /** Radius for circles */
  r?: number;

  // Ellipse specific (uses rx, ry)
  /** Y radius for ellipses */
  ry?: number;

  // Path specific
  /** SVG path data string */
  path?: string;
}

/**
 * Group element for containing other elements
 */
export interface GroupElement extends BaseElement {
  type: 'group';
  /** Array of child element IDs */
  children: string[];
}

/**
 * Union type for all element types
 */
export type Element = ImageElement | TextElement | ShapeElement | GroupElement;

/**
 * Clip path definition
 */
export interface ClipPath {
  /** Unique identifier */
  id: string;
  /** Clip path shape type */
  type: 'rect' | 'circle' | 'ellipse';

  // Rectangle clip
  /** X position for rect clip */
  x?: number;
  /** Y position for rect clip */
  y?: number;
  /** Width for rect clip */
  width?: number;
  /** Height for rect clip */
  height?: number;
  /** Border radius for rect clip */
  rx?: number;

  // Circle clip
  /** Center X for circle/ellipse clip */
  cx?: number;
  /** Center Y for circle/ellipse clip */
  cy?: number;
  /** Radius for circle clip */
  r?: number;

  // Ellipse clip (uses cx, cy)
  /** Y radius for ellipse clip */
  ry?: number;
}
