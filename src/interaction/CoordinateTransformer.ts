/**
 * Handles coordinate transformation between screen space and viewBox space
 */

import type { ScreenPoint, ViewBoxPoint, ViewportState } from './types.js';

/**
 * Configuration for the coordinate transformer
 */
export interface CoordinateTransformerConfig {
  /** Function to get the current viewport state */
  getViewportState: () => ViewportState;
  /** Function to get the canvas dimensions (viewBox size) */
  getCanvasSize: () => { width: number; height: number };
}

/**
 * Transforms coordinates between screen space and SVG viewBox space.
 *
 * This class handles the math required to convert mouse event coordinates
 * (which are in screen/client space) to the SVG viewBox coordinate system,
 * accounting for:
 * - Container position on the page
 * - ViewBox dimensions vs actual SVG element dimensions
 * - Current zoom level
 * - Current pan offset
 *
 * @example
 * ```typescript
 * const transformer = new CoordinateTransformer(container, {
 *   getViewportState: () => ({ panX: 0, panY: 0, zoom: 1 }),
 *   getCanvasSize: () => ({ width: 1200, height: 1200 })
 * });
 *
 * // Convert mouse event coordinates to viewBox coordinates
 * const viewBoxPoint = transformer.screenToViewBox(event.clientX, event.clientY);
 * ```
 */
export class CoordinateTransformer {
  private readonly _container: HTMLElement;
  private readonly _config: CoordinateTransformerConfig;

  /**
   * Creates a new CoordinateTransformer
   *
   * @param container - The HTML element containing the SVG
   * @param config - Configuration with viewport and canvas size getters
   */
  constructor(container: HTMLElement, config: CoordinateTransformerConfig) {
    this._container = container;
    this._config = config;
  }

  /**
   * Converts screen coordinates to viewBox coordinates
   *
   * @param screenX - X coordinate in screen/client space (e.g., event.clientX)
   * @param screenY - Y coordinate in screen/client space (e.g., event.clientY)
   * @returns Point in viewBox coordinates
   */
  screenToViewBox(screenX: number, screenY: number): ViewBoxPoint {
    // Get container's position and size on screen
    const rect = this._container.getBoundingClientRect();

    // Convert to container-relative coordinates
    const containerX = screenX - rect.left;
    const containerY = screenY - rect.top;

    // Get actual rendered SVG dimensions
    const svgWidth = rect.width;
    const svgHeight = rect.height;

    // Get viewBox dimensions
    const { width: vbWidth, height: vbHeight } = this._config.getCanvasSize();

    // Get current viewport state
    const { panX, panY, zoom } = this._config.getViewportState();

    // Handle zero dimensions to avoid division by zero
    if (svgWidth === 0 || svgHeight === 0 || vbWidth === 0 || vbHeight === 0) {
      return { x: 0, y: 0 };
    }

    // Calculate the scale factor (viewBox units per screen pixel).
    // SVG uses preserveAspectRatio="xMidYMid meet" by default, which scales
    // content to fit entirely within the viewport using the smaller dimension.
    // The render scale (pixels per vb unit) would use Math.min, but since we
    // calculate the inverse (vb units per pixel), we use Math.max.
    const scaleX = vbWidth / svgWidth;
    const scaleY = vbHeight / svgHeight;
    const scale = Math.max(scaleX, scaleY);

    // Calculate centering offset (due to aspect ratio preservation)
    const offsetX = (svgWidth - vbWidth / scale) / 2;
    const offsetY = (svgHeight - vbHeight / scale) / 2;

    // Transform to viewBox coordinates, accounting for zoom and pan
    const x = ((containerX - offsetX) * scale) / zoom + panX;
    const y = ((containerY - offsetY) * scale) / zoom + panY;

    return { x, y };
  }

  /**
   * Converts viewBox coordinates to screen coordinates
   *
   * @param x - X coordinate in viewBox space
   * @param y - Y coordinate in viewBox space
   * @returns Point in screen/client coordinates
   */
  viewBoxToScreen(x: number, y: number): ScreenPoint {
    // Get container's position and size on screen
    const rect = this._container.getBoundingClientRect();

    // Get actual rendered SVG dimensions
    const svgWidth = rect.width;
    const svgHeight = rect.height;

    // Get viewBox dimensions
    const { width: vbWidth, height: vbHeight } = this._config.getCanvasSize();

    // Get current viewport state
    const { panX, panY, zoom } = this._config.getViewportState();

    // Handle zero dimensions
    if (svgWidth === 0 || svgHeight === 0 || vbWidth === 0 || vbHeight === 0) {
      return { screenX: rect.left, screenY: rect.top };
    }

    // Calculate the scale factor (viewBox units per screen pixel).
    // See screenToViewBox for explanation of why Math.max is used.
    const scaleX = vbWidth / svgWidth;
    const scaleY = vbHeight / svgHeight;
    const scale = Math.max(scaleX, scaleY);

    // Calculate centering offset
    const offsetX = (svgWidth - vbWidth / scale) / 2;
    const offsetY = (svgHeight - vbHeight / scale) / 2;

    // Transform from viewBox coordinates to container coordinates
    const containerX = ((x - panX) * zoom) / scale + offsetX;
    const containerY = ((y - panY) * zoom) / scale + offsetY;

    // Convert to screen coordinates
    const screenX = containerX + rect.left;
    const screenY = containerY + rect.top;

    return { screenX, screenY };
  }

  /**
   * Gets the current scale factor from viewBox to screen pixels
   *
   * @returns Scale factor (viewBox units per screen pixel)
   */
  getScale(): number {
    const rect = this._container.getBoundingClientRect();
    const { width: vbWidth, height: vbHeight } = this._config.getCanvasSize();
    const { zoom } = this._config.getViewportState();

    if (rect.width === 0 || rect.height === 0) {
      return 1;
    }

    const scaleX = vbWidth / rect.width;
    const scaleY = vbHeight / rect.height;

    return Math.max(scaleX, scaleY) / zoom;
  }

  /**
   * Converts a distance in screen pixels to viewBox units
   *
   * @param screenDistance - Distance in screen pixels
   * @returns Distance in viewBox units
   */
  screenDistanceToViewBox(screenDistance: number): number {
    return screenDistance * this.getScale();
  }

  /**
   * Converts a distance in viewBox units to screen pixels
   *
   * @param viewBoxDistance - Distance in viewBox units
   * @returns Distance in screen pixels
   */
  viewBoxDistanceToScreen(viewBoxDistance: number): number {
    const scale = this.getScale();
    return scale === 0 ? 0 : viewBoxDistance / scale;
  }
}
