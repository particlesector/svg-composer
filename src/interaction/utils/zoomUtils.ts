/**
 * Utility functions for zoom operations
 */

import type { ViewBoxPoint, ViewportState } from '../types.js';
import { ZOOM_LIMITS } from '../types.js';

/**
 * Result of a pinch-zoom calculation
 */
export interface PinchZoomResult {
  /** New zoom level */
  zoom: number;
  /** New pan X offset */
  panX: number;
  /** New pan Y offset */
  panY: number;
  /** Whether the zoom changed */
  changed: boolean;
}

/**
 * Calculates new viewport state for a pinch-zoom gesture.
 * Zooms toward the center point of the pinch gesture.
 *
 * @param centerPoint - Center point of the pinch in viewBox coordinates
 * @param scale - Scale factor from gesture (>1 = zoom in, <1 = zoom out)
 * @param initialZoom - Zoom level when gesture started
 * @param currentViewport - Current viewport state
 * @returns New viewport values and whether zoom changed
 */
export function calculatePinchZoom(
  centerPoint: ViewBoxPoint,
  scale: number,
  initialZoom: number,
  currentViewport: ViewportState,
): PinchZoomResult {
  // Calculate new zoom level
  let newZoom = initialZoom * scale;

  // Clamp to zoom limits
  newZoom = Math.max(ZOOM_LIMITS.MIN, Math.min(ZOOM_LIMITS.MAX, newZoom));

  // Check if zoom actually changed
  if (newZoom === currentViewport.zoom) {
    return {
      zoom: currentViewport.zoom,
      panX: currentViewport.panX,
      panY: currentViewport.panY,
      changed: false,
    };
  }

  // Calculate new pan to keep the center point fixed on screen
  const zoomRatio = newZoom / currentViewport.zoom;
  const newPanX = centerPoint.x - (centerPoint.x - currentViewport.panX) * zoomRatio;
  const newPanY = centerPoint.y - (centerPoint.y - currentViewport.panY) * zoomRatio;

  return {
    zoom: newZoom,
    panX: newPanX,
    panY: newPanY,
    changed: true,
  };
}
