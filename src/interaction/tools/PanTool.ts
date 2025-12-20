/**
 * Pan tool for canvas navigation
 */

import type { ToolType } from '../../core/types.js';
import type { ViewBoxPoint } from '../types.js';
import { BaseTool } from './BaseTool.js';

/**
 * Zoom increment per wheel tick
 */
const ZOOM_FACTOR = 0.1;

/**
 * Minimum zoom level
 */
const MIN_ZOOM = 0.1;

/**
 * Maximum zoom level
 */
const MAX_ZOOM = 10;

/**
 * PanTool allows panning the canvas by dragging.
 */
export class PanTool extends BaseTool {
  readonly type: ToolType = 'pan';

  private _isPanning = false;
  private _panStart: ViewBoxPoint | null = null;
  private _startPanX = 0;
  private _startPanY = 0;

  override activate(): void {
    this.updateCursor('grab');
  }

  override deactivate(): void {
    this._resetState();
    this.updateCursor('default');
  }

  override onMouseDown(_event: MouseEvent, point: ViewBoxPoint): boolean {
    this._startPan(point);
    return true;
  }

  override onMouseMove(_event: MouseEvent, point: ViewBoxPoint): boolean {
    if (this._isPanning) {
      this._updatePan(point);
      return true;
    }
    return false;
  }

  override onMouseUp(_event: MouseEvent, _point: ViewBoxPoint): boolean {
    if (this._isPanning) {
      this._endPan();
      return true;
    }
    return false;
  }

  override onWheel(event: WheelEvent, point: ViewBoxPoint): boolean {
    // Zoom in/out with wheel
    const viewport = this.context.getViewportState();
    const direction = event.deltaY < 0 ? 1 : -1;
    let newZoom = viewport.zoom + direction * ZOOM_FACTOR;

    // Clamp zoom
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    if (newZoom !== viewport.zoom) {
      // Zoom toward mouse position
      const zoomRatio = newZoom / viewport.zoom;

      // Adjust pan to zoom toward mouse position
      const newPanX = point.x - (point.x - viewport.panX) * zoomRatio;
      const newPanY = point.y - (point.y - viewport.panY) * zoomRatio;

      this.context.setViewportState({
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY,
      });

      this.context.requestRender();
    }

    return true;
  }

  override getCursor(): string {
    return this._isPanning ? 'grabbing' : 'grab';
  }

  /**
   * Starts panning
   */
  private _startPan(point: ViewBoxPoint): void {
    this._isPanning = true;
    this._panStart = point;

    const viewport = this.context.getViewportState();
    this._startPanX = viewport.panX;
    this._startPanY = viewport.panY;

    this.context.setInteractionState('panning');
    this.updateCursor('grabbing');
  }

  /**
   * Updates pan during drag
   *
   * @remarks
   * Currently updates viewport state but the SVG viewBox is not yet updated
   * to reflect pan/zoom. This is a known limitation - full pan/zoom support
   * requires updating the SVG viewBox attribute or applying transforms to
   * the content layer in the render cycle.
   */
  private _updatePan(point: ViewBoxPoint): void {
    if (!this._panStart) {
      return;
    }

    // Calculate delta in viewBox coordinates
    const dx = this._panStart.x - point.x;
    const dy = this._panStart.y - point.y;

    this.context.setViewportState({
      panX: this._startPanX + dx,
      panY: this._startPanY + dy,
    });

    // TODO: SVGComposer.render() should apply viewport state to SVG viewBox
    this.context.requestRender();
  }

  /**
   * Ends panning
   */
  private _endPan(): void {
    this._isPanning = false;
    this._panStart = null;
    this.context.setInteractionState('idle');
    this.updateCursor('grab');
  }

  /**
   * Resets state
   */
  private _resetState(): void {
    this._isPanning = false;
    this._panStart = null;
    this._startPanX = 0;
    this._startPanY = 0;
  }
}
