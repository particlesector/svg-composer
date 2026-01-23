/**
 * Type definitions for SVG Rendering system
 */

import type { BaseElement, ClipPath } from '../elements/types.js';
import type { SnapTarget } from '../core/types.js';

/**
 * Viewport state for pan and zoom
 */
export interface ViewportState {
  /** Horizontal pan offset in viewBox units */
  panX: number;
  /** Vertical pan offset in viewBox units */
  panY: number;
  /** Zoom level (1.0 = 100%) */
  zoom: number;
}

/**
 * Configuration options for the SVG renderer
 */
export interface SVGRendererConfig {
  /** Prefix for generated DOM element IDs (default: 'svc-') */
  idPrefix: string;
}

/**
 * Result of rendering a clip path definition (for string generation)
 */
export interface ClipPathDef {
  /** The clip path ID (used for url() reference) */
  id: string;
  /** SVG markup for the clipPath element */
  markup: string;
}

/**
 * Context passed during element rendering
 */
export interface RenderContext {
  /** Collection of clip paths to add to defs (stores original ClipPath for DOM creation) */
  clipPaths: Map<string, ClipPath>;
  /** Function to get element by ID (for resolving group children) */
  getElement: (id: string) => BaseElement | undefined;
}

/**
 * Function signature for element lookup
 */
export type ElementGetter = (id: string) => BaseElement | undefined;

/**
 * Configuration for guide rendering
 */
export interface GuideRenderConfig {
  /** Default guide color (CSS color string) */
  guideColor: string;
  /** Guide line stroke width in screen pixels */
  guideStrokeWidth: number;
  /** Whether guides are visible */
  guidesVisible: boolean;
  /** Snap indicator color */
  snapIndicatorColor: string;
  /** Snap indicator stroke width */
  snapIndicatorStrokeWidth: number;
}

/**
 * Default guide render configuration
 */
export const DEFAULT_GUIDE_RENDER_CONFIG: GuideRenderConfig = {
  guideColor: '#00bfff',
  guideStrokeWidth: 1,
  guidesVisible: true,
  snapIndicatorColor: '#ff4081',
  snapIndicatorStrokeWidth: 1,
};

/**
 * Active snap lines to render during interaction
 */
export interface SnapLines {
  /** Vertical snap lines (X positions) */
  vertical: { x: number; target: SnapTarget }[];
  /** Horizontal snap lines (Y positions) */
  horizontal: { y: number; target: SnapTarget }[];
}
