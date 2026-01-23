/**
 * Tool for adding shape elements to the canvas
 */

import type { ToolType } from '../../core/types.js';
import type { ShapeElement } from '../../elements/types.js';
import type { ViewBoxPoint, PointerInfo } from '../types.js';
import { BaseTool, type ToolContext } from './BaseTool.js';

/**
 * Shape type options for the AddShapeTool
 */
export type AddShapeType = 'rect' | 'circle' | 'ellipse';

/**
 * Configuration for the AddShapeTool
 */
export interface AddShapeConfig {
  /** The type of shape to add */
  shapeType: AddShapeType;
  /** Fill color (default: '#3b82f6') */
  fill?: string;
  /** Stroke color (default: '#1e40af') */
  stroke?: string;
  /** Stroke width (default: 2) */
  strokeWidth?: number;
}

const DEFAULT_CONFIG: Required<AddShapeConfig> = {
  shapeType: 'rect',
  fill: '#3b82f6',
  stroke: '#1e40af',
  strokeWidth: 2,
};

/**
 * Tool for adding shapes (rect, circle, ellipse) to the canvas.
 * Click and drag to create a shape.
 */
export class AddShapeTool extends BaseTool {
  readonly type: ToolType = 'add-shape';

  private _config: Required<AddShapeConfig> = { ...DEFAULT_CONFIG };
  private _startPoint: ViewBoxPoint | null = null;
  private _currentElementId: string | null = null;
  private _isDrawing = false;

  constructor(context: ToolContext, config?: Partial<AddShapeConfig>) {
    super(context);
    if (config) {
      this._config = { ...DEFAULT_CONFIG, ...config };
    }
  }

  /**
   * Updates the tool configuration
   */
  setConfig(config: Partial<AddShapeConfig>): void {
    this._config = { ...this._config, ...config };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): Required<AddShapeConfig> {
    return { ...this._config };
  }

  override activate(): void {
    this.updateCursor('crosshair');
  }

  override deactivate(): void {
    this._resetState();
    this.updateCursor('default');
  }

  override onMouseDown(_event: MouseEvent, point: ViewBoxPoint): boolean {
    this._startPoint = point;
    this._isDrawing = true;

    // Create initial shape at the click point with minimal size
    const element = this._createShapeElement(point, point);
    this._currentElementId = this.context.composer.addElement(element);

    this.context.setInteractionState('drawing');
    return true;
  }

  override onMouseMove(_event: MouseEvent, point: ViewBoxPoint): boolean {
    if (!this._isDrawing || this._startPoint === null || this._currentElementId === null) {
      return false;
    }

    // Update the shape based on current mouse position
    const updates = this._getShapeUpdates(this._startPoint, point);
    this.context.composer.updateElementSilent(this._currentElementId, updates);
    this.context.requestRender();

    return true;
  }

  override onMouseUp(_event: MouseEvent, point: ViewBoxPoint): boolean {
    if (!this._isDrawing || this._startPoint === null || this._currentElementId === null) {
      return false;
    }

    // Finalize the shape
    const updates = this._getShapeUpdates(this._startPoint, point);
    this.context.composer.updateElementSilent(this._currentElementId, updates);

    // Select the new element
    this.context.composer.select(this._currentElementId);

    // Push to history
    this.context.composer.pushHistory();
    this.context.requestRender();

    this.context.setInteractionState('idle');
    this._resetState();

    return true;
  }

  override onKeyDown(event: KeyboardEvent): boolean {
    // Cancel with Escape
    if (event.code === 'Escape' && this._isDrawing && this._currentElementId !== null) {
      this.context.composer.removeElement(this._currentElementId);
      this.context.requestRender();
      this.context.setInteractionState('idle');
      this._resetState();
      return true;
    }
    return false;
  }

  override getCursor(): string {
    return 'crosshair';
  }

  override onPointerDown(
    event: PointerEvent,
    point: ViewBoxPoint,
    activePointers: Map<number, PointerInfo>,
  ): boolean {
    // Only handle single pointer
    if (activePointers.size === 1) {
      return this.onMouseDown(event as unknown as MouseEvent, point);
    }
    return false;
  }

  override onPointerMove(
    event: PointerEvent,
    point: ViewBoxPoint,
    activePointers: Map<number, PointerInfo>,
  ): boolean {
    // Only handle single pointer
    if (activePointers.size === 1 && this._isDrawing) {
      return this.onMouseMove(event as unknown as MouseEvent, point);
    }
    return false;
  }

  override onPointerUp(
    event: PointerEvent,
    point: ViewBoxPoint,
    activePointers: Map<number, PointerInfo>,
  ): boolean {
    // Handle when all pointers are released
    if (activePointers.size === 0 && this._isDrawing) {
      return this.onMouseUp(event as unknown as MouseEvent, point);
    }
    return false;
  }

  override onPointerCancel(
    _event: PointerEvent,
    _activePointers: Map<number, PointerInfo>,
  ): boolean {
    // Cancel drawing on pointer cancel
    if (this._isDrawing && this._currentElementId !== null) {
      this.context.composer.removeElement(this._currentElementId);
      this.context.requestRender();
      this.context.setInteractionState('idle');
      this._resetState();
      return true;
    }
    return false;
  }

  /**
   * Creates the initial shape element
   */
  private _createShapeElement(start: ViewBoxPoint, end: ViewBoxPoint): Omit<ShapeElement, 'id'> {
    const { shapeType, fill, stroke, strokeWidth } = this._config;
    const { x, y, width, height } = this._getBounds(start, end);

    const baseShape: Omit<ShapeElement, 'id'> = {
      type: 'shape',
      shapeType,
      fill,
      stroke,
      strokeWidth,
      transform: {
        x: shapeType === 'rect' ? x : x + width / 2,
        y: shapeType === 'rect' ? y : y + height / 2,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      opacity: 1,
      zIndex: this._getNextZIndex(),
      locked: false,
      visible: true,
    };

    // Add shape-specific properties
    switch (shapeType) {
      case 'rect':
        return { ...baseShape, width, height };
      case 'circle': {
        const r = Math.min(width, height) / 2;
        return { ...baseShape, r };
      }
      case 'ellipse':
        return { ...baseShape, rx: width / 2, ry: height / 2 };
    }
  }

  /**
   * Gets updates for the shape based on current bounds
   */
  private _getShapeUpdates(start: ViewBoxPoint, end: ViewBoxPoint): Partial<ShapeElement> {
    const { shapeType } = this._config;
    const { x, y, width, height } = this._getBounds(start, end);

    const updates: Partial<ShapeElement> = {
      transform: {
        x: shapeType === 'rect' ? x : x + width / 2,
        y: shapeType === 'rect' ? y : y + height / 2,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
    };

    switch (shapeType) {
      case 'rect':
        updates.width = width;
        updates.height = height;
        break;
      case 'circle':
        updates.r = Math.min(width, height) / 2;
        break;
      case 'ellipse':
        updates.rx = width / 2;
        updates.ry = height / 2;
        break;
    }

    return updates;
  }

  /**
   * Calculates bounds from start and end points
   */
  private _getBounds(
    start: ViewBoxPoint,
    end: ViewBoxPoint,
  ): { x: number; y: number; width: number; height: number } {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.max(1, Math.abs(end.x - start.x));
    const height = Math.max(1, Math.abs(end.y - start.y));
    return { x, y, width, height };
  }

  /**
   * Gets the next z-index for a new element
   */
  private _getNextZIndex(): number {
    const elements = this.context.hitTester.getElements();
    if (elements.length === 0) {
      return 1;
    }
    return Math.max(...elements.map((el) => el.zIndex)) + 1;
  }

  /**
   * Resets the tool state
   */
  private _resetState(): void {
    this._startPoint = null;
    this._currentElementId = null;
    this._isDrawing = false;
  }
}
