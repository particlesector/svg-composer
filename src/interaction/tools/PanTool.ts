/**
 * Pan tool for canvas navigation
 */

import type { ToolType } from '../../core/types.js';
import type { ViewBoxPoint, PointerInfo } from '../types.js';
import { ZOOM_LIMITS } from '../types.js';
import { BaseTool } from './BaseTool.js';
import { calculatePinchZoom } from '../utils/zoomUtils.js';

/**
 * Zoom increment per wheel tick
 */
const ZOOM_FACTOR = 0.1;

/**
 * PanTool allows panning the canvas by dragging.
 */
export class PanTool extends BaseTool {
  readonly type: ToolType = 'pan';

  private _isPanning = false;
  private _panStart: ViewBoxPoint | null = null;
  private _startPanX = 0;
  private _startPanY = 0;
  private _gestureInitialPan: { x: number; y: number } | null = null;

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
    newZoom = Math.max(ZOOM_LIMITS.MIN, Math.min(ZOOM_LIMITS.MAX, newZoom));

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

  override onPointerDown(
    event: PointerEvent,
    point: ViewBoxPoint,
    activePointers: Map<number, PointerInfo>,
  ): boolean {
    // For single pointer, start panning
    if (activePointers.size === 1) {
      this._startPan(point);
      return true;
    }
    return false;
  }

  override onPointerMove(
    event: PointerEvent,
    point: ViewBoxPoint,
    activePointers: Map<number, PointerInfo>,
  ): boolean {
    // Single pointer pan
    if (this._isPanning && activePointers.size === 1) {
      this._updatePan(point);
      return true;
    }
    return false;
  }

  override onPointerUp(
    event: PointerEvent,
    point: ViewBoxPoint,
    activePointers: Map<number, PointerInfo>,
  ): boolean {
    if (this._isPanning && activePointers.size === 0) {
      this._endPan();
      this._gestureInitialPan = null;
      return true;
    }
    return false;
  }

  override onPointerCancel(
    _event: PointerEvent,
    _activePointers: Map<number, PointerInfo>,
  ): boolean {
    this._resetState();
    return true;
  }

  override onPinchGesture(centerPoint: ViewBoxPoint, scale: number, initialZoom: number): boolean {
    const viewport = this.context.getViewportState();
    const result = calculatePinchZoom(centerPoint, scale, initialZoom, viewport);

    if (result.changed) {
      this.context.setViewportState({
        zoom: result.zoom,
        panX: result.panX,
        panY: result.panY,
      });
      this.context.requestRender();
    }

    return true;
  }

  override onTwoFingerPan(centerPoint: ViewBoxPoint, deltaX: number, deltaY: number): boolean {
    // Store initial pan if not set
    if (!this._gestureInitialPan) {
      const viewport = this.context.getViewportState();
      this._gestureInitialPan = { x: viewport.panX, y: viewport.panY };
    }

    // Pan the canvas
    this.context.setViewportState({
      panX: this._gestureInitialPan.x - deltaX,
      panY: this._gestureInitialPan.y - deltaY,
    });

    this.context.requestRender();
    return true;
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
    this._gestureInitialPan = null;
  }
}
