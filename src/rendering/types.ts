/**
 * Type definitions for SVG Rendering system
 */

import type { BaseElement, ClipPath } from '../elements/types.js';

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
