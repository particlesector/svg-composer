/**
 * Select tool for selection, dragging, resizing, and rotating elements
 */

import type { ToolType } from '../../core/types.js';
import type { ViewBoxPoint, HandleType, DragState, ResizeState, RotateState } from '../types.js';
import { BaseTool } from './BaseTool.js';
import { getRotatedCursor } from '../SelectionHandleRenderer.js';

/**
 * Drag threshold in screen pixels before starting a drag operation
 */
const DRAG_THRESHOLD = 3;

/**
 * Minimum element size in viewBox units
 */
const MIN_SIZE = 10;

/**
 * Rotation snap increment in degrees (when Shift is held)
 */
const ROTATION_SNAP = 15;

/**
 * SelectTool implements selection, dragging, resizing, and rotation of elements.
 */
export class SelectTool extends BaseTool {
  readonly type: ToolType = 'select';

  private _dragState: DragState | null = null;
  private _resizeState: ResizeState | null = null;
  private _rotateState: RotateState | null = null;
  private _mouseDownPoint: ViewBoxPoint | null = null;
  private _mouseDownScreenPoint: { x: number; y: number } | null = null;
  private _pendingSelect: { id: string; addToSelection: boolean } | null = null;
  private _spacePressed = false;
  private _isPanning = false;
  private _panStart: ViewBoxPoint | null = null;

  override activate(): void {
    this.updateCursor('default');
  }

  override deactivate(): void {
    this._resetState();
  }

  override onMouseDown(event: MouseEvent, point: ViewBoxPoint): boolean {
    // Store for drag threshold check
    this._mouseDownPoint = point;
    this._mouseDownScreenPoint = { x: event.clientX, y: event.clientY };

    // Check for space+drag panning
    if (this._spacePressed) {
      this._startPan(point);
      return true;
    }

    // Hit test
    const hit = this.context.hitTester.hitTest(point);

    switch (hit.type) {
      case 'handle':
        if (hit.handleType === 'rotate') {
          this._startRotation(point);
        } else if (hit.handleType) {
          this._startResize(hit.handleType, point);
        }
        return true;

      case 'element':
        if (hit.elementId !== undefined) {
          const selection = this.context.composer.getSelection();
          const isSelected = selection.includes(hit.elementId);

          if (event.shiftKey) {
            // Shift-click: toggle selection
            if (isSelected) {
              this.context.composer.removeFromSelection(hit.elementId);
            } else {
              this.context.composer.addToSelection(hit.elementId);
            }
            this.context.requestRender();
          } else if (!isSelected) {
            // Click on unselected: select it
            this.context.composer.select(hit.elementId);
            this.context.requestRender();
          }

          // Prepare for potential drag
          this._pendingSelect = {
            id: hit.elementId,
            addToSelection: event.shiftKey,
          };
          this.context.setInteractionState('selecting');
        }
        return true;

      case 'background':
        if (!event.shiftKey) {
          this.context.composer.clearSelection();
          this.context.requestRender();
        }
        this.context.setInteractionState('idle');
        return true;
    }

    return false;
  }

  override onMouseMove(event: MouseEvent, point: ViewBoxPoint): boolean {
    // Handle panning
    if (this._isPanning && this._panStart) {
      this._updatePan(point);
      return true;
    }

    // Handle rotation
    if (this._rotateState) {
      this._updateRotation(point, event.shiftKey);
      return true;
    }

    // Handle resizing
    if (this._resizeState) {
      this._updateResize(point, event.shiftKey);
      return true;
    }

    // Handle dragging
    if (this._dragState) {
      this._updateDrag(point);
      return true;
    }

    // Check for drag threshold
    if (this._mouseDownPoint && this._mouseDownScreenPoint && this._pendingSelect) {
      const dx = event.clientX - this._mouseDownScreenPoint.x;
      const dy = event.clientY - this._mouseDownScreenPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= DRAG_THRESHOLD) {
        this._startDrag(this._mouseDownPoint);
      }
    }

    // Update cursor based on hover
    this._updateHoverCursor(point);

    return false;
  }

  override onMouseUp(_event: MouseEvent, _point: ViewBoxPoint): boolean {
    // End panning
    if (this._isPanning) {
      this._endPan();
      return true;
    }

    // End rotation
    if (this._rotateState) {
      this._endRotation();
      return true;
    }

    // End resizing
    if (this._resizeState) {
      this._endResize();
      return true;
    }

    // End dragging
    if (this._dragState) {
      this._endDrag();
      return true;
    }

    // Clear pending state
    this._pendingSelect = null;
    this._mouseDownPoint = null;
    this._mouseDownScreenPoint = null;
    this.context.setInteractionState('idle');

    return false;
  }

  override onKeyDown(event: KeyboardEvent): boolean {
    // Space for temporary pan
    if (event.code === 'Space' && !this._spacePressed) {
      this._spacePressed = true;
      this.updateCursor('grab');
      return true;
    }

    // Delete/Backspace to delete selected elements
    if (event.code === 'Delete' || event.code === 'Backspace') {
      const selection = this.context.composer.getSelection();
      if (selection.length > 0) {
        for (const id of selection) {
          this.context.composer.removeElement(id);
        }
        this.context.composer.clearSelection();
        this.context.requestRender();
      }
      return true;
    }

    // Escape to clear selection
    if (event.code === 'Escape') {
      this.context.composer.clearSelection();
      this.context.requestRender();
      return true;
    }

    return false;
  }

  override onKeyUp(event: KeyboardEvent): boolean {
    if (event.code === 'Space') {
      this._spacePressed = false;
      if (!this._isPanning) {
        this.updateCursor('default');
      }
      return true;
    }
    return false;
  }

  override getCursor(): string {
    if (this._isPanning || this._spacePressed) {
      return this._isPanning ? 'grabbing' : 'grab';
    }
    if (this._dragState) {
      return 'move';
    }
    if (this._resizeState) {
      const rotation = this._getSelectionRotation();
      return getRotatedCursor(this._resizeState.handleType, rotation);
    }
    if (this._rotateState) {
      return 'grabbing';
    }
    return 'default';
  }

  /**
   * Starts a drag operation
   */
  private _startDrag(startPoint: ViewBoxPoint): void {
    const selection = this.context.composer.getSelection();
    if (selection.length === 0) {
      return;
    }

    // Collect initial positions
    const elementStartPositions = new Map<string, { x: number; y: number }>();
    for (const id of selection) {
      const element = this.context.composer.getElement(id);
      if (element) {
        elementStartPositions.set(id, {
          x: element.transform.x,
          y: element.transform.y,
        });
      }
    }

    this._dragState = {
      startPoint,
      currentPoint: startPoint,
      elementStartPositions,
    };

    this.context.setInteractionState('dragging');
    this.updateCursor('move');
  }

  /**
   * Updates element positions during drag
   */
  private _updateDrag(point: ViewBoxPoint): void {
    if (!this._dragState) {
      return;
    }

    const dx = point.x - this._dragState.startPoint.x;
    const dy = point.y - this._dragState.startPoint.y;

    for (const [id, startPos] of this._dragState.elementStartPositions) {
      const element = this.context.composer.getElement(id);
      if (!element) {
        continue;
      }

      // Use silent update during drag - history pushed on end
      this.context.composer.updateElementSilent(id, {
        transform: {
          ...element.transform,
          x: startPos.x + dx,
          y: startPos.y + dy,
        },
      });
    }

    this._dragState.currentPoint = point;
    this.context.requestRender();
  }

  /**
   * Ends the drag operation
   */
  private _endDrag(): void {
    // Push history for the entire drag operation (single undo step)
    this.context.composer.pushHistory();

    this._dragState = null;
    this._pendingSelect = null;
    this._mouseDownPoint = null;
    this._mouseDownScreenPoint = null;
    this.context.setInteractionState('idle');
    this.updateCursor('default');
  }

  /**
   * Starts a resize operation
   */
  private _startResize(handleType: HandleType, startPoint: ViewBoxPoint): void {
    const selection = this.context.composer.getSelection();
    const elementId = selection[0];
    if (elementId === undefined) {
      return;
    }

    // Use first selected element for resize
    const element = this.context.composer.getElement(elementId);
    if (!element) {
      return;
    }

    const bounds = this.context.hitTester.getElementBounds(element);
    if (!bounds) {
      return;
    }

    this._resizeState = {
      elementId,
      handleType,
      startPoint,
      originalBounds: bounds,
      originalTransform: {
        x: element.transform.x,
        y: element.transform.y,
        scaleX: element.transform.scaleX,
        scaleY: element.transform.scaleY,
      },
    };

    this.context.setInteractionState('resizing');
    const rotation = this._getSelectionRotation();
    this.updateCursor(getRotatedCursor(handleType, rotation));
  }

  /**
   * Updates element during resize
   */
  private _updateResize(point: ViewBoxPoint, preserveAspect: boolean): void {
    if (!this._resizeState) {
      return;
    }

    const { handleType, originalBounds, originalTransform } = this._resizeState;

    // Get element rotation to transform mouse delta into local coordinates
    const rotation = this._getSelectionRotation();
    const rawDx = point.x - this._resizeState.startPoint.x;
    const rawDy = point.y - this._resizeState.startPoint.y;

    // Transform delta to element's local coordinate system
    const { dx, dy } = this._rotatePoint(rawDx, rawDy, -rotation);

    // Calculate the offset between transform position and bounds position
    // This is different for different element types:
    // - Rectangles: transform is at top-left, so offset is (0, 0)
    // - Circles: transform is at center, so offset is (width/2, height/2)
    // - Text: transform is at anchor point, offset depends on textAnchor
    const boundsOffsetX = originalTransform.x - originalBounds.x;
    const boundsOffsetY = originalTransform.y - originalBounds.y;

    // Calculate new bounds based on handle (working in bounding box coordinates)
    let newBoundsX = originalBounds.x;
    let newBoundsY = originalBounds.y;
    let newWidth = originalBounds.width;
    let newHeight = originalBounds.height;

    // Handle affects which edges
    const affectsLeft = handleType.includes('w');
    const affectsRight = handleType.includes('e');
    const affectsTop = handleType.includes('n');
    const affectsBottom = handleType.includes('s');

    if (affectsRight) {
      newWidth += dx;
    }
    if (affectsLeft) {
      newWidth -= dx;
      newBoundsX += dx;
    }
    if (affectsBottom) {
      newHeight += dy;
    }
    if (affectsTop) {
      newHeight -= dy;
      newBoundsY += dy;
    }

    // Enforce minimum size
    if (newWidth < MIN_SIZE) {
      if (affectsLeft) {
        newBoundsX -= MIN_SIZE - newWidth;
      }
      newWidth = MIN_SIZE;
    }
    if (newHeight < MIN_SIZE) {
      if (affectsTop) {
        newBoundsY -= MIN_SIZE - newHeight;
      }
      newHeight = MIN_SIZE;
    }

    // Preserve aspect ratio when Shift is held (standard behavior)
    if (preserveAspect) {
      const aspect = originalBounds.width / originalBounds.height;
      const isCorner = handleType.length === 2;

      if (isCorner) {
        // For corners, use the larger change to determine which dimension drives
        const widthChange = Math.abs(newWidth - originalBounds.width);
        const heightChange = Math.abs(newHeight - originalBounds.height);

        if (widthChange > heightChange) {
          // Width drives - adjust height
          const oldHeight = newHeight;
          newHeight = newWidth / aspect;
          // Compensate position if top edge was being moved
          if (affectsTop) {
            newBoundsY -= newHeight - oldHeight;
          }
        } else {
          // Height drives - adjust width
          const oldWidth = newWidth;
          newWidth = newHeight * aspect;
          // Compensate position if left edge was being moved
          if (affectsLeft) {
            newBoundsX -= newWidth - oldWidth;
          }
        }
      }
    }

    // Calculate scale factors
    const newScaleX = (newWidth / originalBounds.width) * originalTransform.scaleX;
    const newScaleY = (newHeight / originalBounds.height) * originalTransform.scaleY;

    // Calculate new transform position by applying the scaled offset to new bounds position
    // The offset needs to be scaled proportionally with the size change
    const scaleRatioX = newWidth / originalBounds.width;
    const scaleRatioY = newHeight / originalBounds.height;
    const newX = newBoundsX + boundsOffsetX * scaleRatioX;
    const newY = newBoundsY + boundsOffsetY * scaleRatioY;

    // Get current element to preserve other transform properties
    const element = this.context.composer.getElement(this._resizeState.elementId);
    if (!element) {
      return;
    }

    // Use silent update during resize - history pushed on end
    this.context.composer.updateElementSilent(this._resizeState.elementId, {
      transform: {
        ...element.transform,
        x: newX,
        y: newY,
        scaleX: newScaleX,
        scaleY: newScaleY,
      },
    });

    this.context.requestRender();
  }

  /**
   * Ends the resize operation
   */
  private _endResize(): void {
    // Push history for the entire resize operation (single undo step)
    this.context.composer.pushHistory();

    this._resizeState = null;
    this.context.setInteractionState('idle');
    this.updateCursor('default');
  }

  /**
   * Starts a rotation operation
   */
  private _startRotation(startPoint: ViewBoxPoint): void {
    const selection = this.context.composer.getSelection();
    const elementId = selection[0];
    if (elementId === undefined) {
      return;
    }

    // Use first selected element for rotation
    const element = this.context.composer.getElement(elementId);
    if (!element) {
      return;
    }

    const bounds = this.context.hitTester.getElementBounds(element);
    if (!bounds) {
      return;
    }

    // Calculate center of element
    const centerPoint: ViewBoxPoint = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };

    // Calculate initial angle from center to mouse
    const startAngle = this._calculateAngle(centerPoint, startPoint);

    this._rotateState = {
      elementId,
      centerPoint,
      startAngle,
      originalRotation: element.transform.rotation,
    };

    this.context.setInteractionState('rotating');
    this.updateCursor('grabbing');
  }

  /**
   * Updates element during rotation
   */
  private _updateRotation(point: ViewBoxPoint, snapToGrid: boolean): void {
    if (!this._rotateState) {
      return;
    }

    const currentAngle = this._calculateAngle(this._rotateState.centerPoint, point);
    const deltaAngle = currentAngle - this._rotateState.startAngle;
    let newRotation = this._rotateState.originalRotation + deltaAngle;

    // Normalize to 0-360
    newRotation = ((newRotation % 360) + 360) % 360;

    // Snap to grid if Shift is held
    if (snapToGrid) {
      newRotation = Math.round(newRotation / ROTATION_SNAP) * ROTATION_SNAP;
    }

    // Get current element to preserve other transform properties
    const element = this.context.composer.getElement(this._rotateState.elementId);
    if (!element) {
      return;
    }

    // Use silent update during rotation - history pushed on end
    this.context.composer.updateElementSilent(this._rotateState.elementId, {
      transform: {
        ...element.transform,
        rotation: newRotation,
      },
    });

    this.context.requestRender();
  }

  /**
   * Ends the rotation operation
   */
  private _endRotation(): void {
    // Push history for the entire rotation operation (single undo step)
    this.context.composer.pushHistory();

    this._rotateState = null;
    this.context.setInteractionState('idle');
    this.updateCursor('default');
  }

  /**
   * Calculates angle from center to point in degrees
   */
  private _calculateAngle(center: ViewBoxPoint, point: ViewBoxPoint): number {
    return Math.atan2(point.y - center.y, point.x - center.x) * (180 / Math.PI);
  }

  /**
   * Starts space+drag panning
   */
  private _startPan(point: ViewBoxPoint): void {
    this._isPanning = true;
    this._panStart = point;
    this.updateCursor('grabbing');
  }

  /**
   * Updates pan during drag
   *
   * @remarks
   * Currently updates viewport state but does not update the SVG viewBox.
   * This is tracked as a known limitation - full pan/zoom support requires
   * updating the SVG viewBox attribute or applying transforms to the content layer.
   */
  private _updatePan(point: ViewBoxPoint): void {
    if (!this._panStart) {
      return;
    }

    const viewport = this.context.getViewportState();
    const dx = this._panStart.x - point.x;
    const dy = this._panStart.y - point.y;

    this.context.setViewportState({
      panX: viewport.panX + dx,
      panY: viewport.panY + dy,
    });

    // TODO: Update SVG viewBox attribute to reflect pan state
  }

  /**
   * Ends panning
   */
  private _endPan(): void {
    this._isPanning = false;
    this._panStart = null;
    this.updateCursor(this._spacePressed ? 'grab' : 'default');
  }

  /**
   * Updates cursor based on what's being hovered
   */
  private _updateHoverCursor(point: ViewBoxPoint): void {
    if (this._spacePressed) {
      return; // Keep pan cursor
    }

    const hit = this.context.hitTester.hitTest(point);

    switch (hit.type) {
      case 'handle':
        if (hit.handleType) {
          const rotation = this._getSelectionRotation();
          this.updateCursor(getRotatedCursor(hit.handleType, rotation));
        }
        break;
      case 'element':
        this.updateCursor('move');
        break;
      default:
        this.updateCursor('default');
    }
  }

  /**
   * Gets the rotation of the current selection
   */
  private _getSelectionRotation(): number {
    const selection = this.context.composer.getSelection();
    const firstId = selection[0];
    if (selection.length === 1 && firstId !== undefined) {
      const element = this.context.composer.getElement(firstId);
      if (element) {
        return element.transform.rotation;
      }
    }
    return 0;
  }

  /**
   * Rotates a point (or vector) by the given angle in degrees
   */
  private _rotatePoint(x: number, y: number, angleDegrees: number): { dx: number; dy: number } {
    if (angleDegrees === 0) {
      return { dx: x, dy: y };
    }
    const rad = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      dx: x * cos - y * sin,
      dy: x * sin + y * cos,
    };
  }

  /**
   * Resets all state
   */
  private _resetState(): void {
    this._dragState = null;
    this._resizeState = null;
    this._rotateState = null;
    this._mouseDownPoint = null;
    this._mouseDownScreenPoint = null;
    this._pendingSelect = null;
    this._spacePressed = false;
    this._isPanning = false;
    this._panStart = null;
  }
}
