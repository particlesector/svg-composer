/**
 * Tool for adding image elements to the canvas
 */

import type { ToolType } from '../../core/types.js';
import type { ImageElement } from '../../elements/types.js';
import type { ViewBoxPoint, PointerInfo } from '../types.js';
import { BaseTool, type ToolContext } from './BaseTool.js';

/**
 * Configuration for the AddImageTool
 */
export interface AddImageConfig {
  /** Image source URL (required) */
  src: string;
  /** Image width in viewBox units (default: 100) */
  width?: number;
  /** Image height in viewBox units (default: 100) */
  height?: number;
}

const DEFAULT_CONFIG: Required<AddImageConfig> = {
  src: '',
  width: 100,
  height: 100,
};

/**
 * Tool for adding image elements to the canvas.
 * Configure with an image source, then click to place the image.
 */
export class AddImageTool extends BaseTool {
  readonly type: ToolType = 'add-image';

  private _config: Required<AddImageConfig> = { ...DEFAULT_CONFIG };

  constructor(context: ToolContext, config?: Partial<AddImageConfig>) {
    super(context);
    if (config) {
      this._config = { ...DEFAULT_CONFIG, ...config };
    }
  }

  /**
   * Updates the tool configuration
   */
  setConfig(config: Partial<AddImageConfig>): void {
    this._config = { ...this._config, ...config };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): Required<AddImageConfig> {
    return { ...this._config };
  }

  /**
   * Checks if the tool is ready to add an image (has a valid src)
   */
  isReady(): boolean {
    return this._config.src.length > 0;
  }

  override activate(): void {
    this.updateCursor(this.isReady() ? 'copy' : 'not-allowed');
  }

  override deactivate(): void {
    this.updateCursor('default');
  }

  override onMouseDown(event: MouseEvent, point: ViewBoxPoint): boolean {
    // Don't add if no image source configured
    if (!this.isReady()) {
      return false;
    }

    // Prevent default behavior
    event.preventDefault();

    // Create image element at click location
    const element = this._createImageElement(point);
    const elementId = this.context.composer.addElement(element);

    // Select the new element
    this.context.composer.select(elementId);

    // Push to history
    this.context.composer.pushHistory();
    this.context.requestRender();

    return true;
  }

  override onMouseMove(_event: MouseEvent, _point: ViewBoxPoint): boolean {
    // No drag behavior for image tool - just single click placement
    return false;
  }

  override onMouseUp(_event: MouseEvent, _point: ViewBoxPoint): boolean {
    return false;
  }

  override getCursor(): string {
    return this.isReady() ? 'copy' : 'not-allowed';
  }

  override onPointerDown(
    event: PointerEvent,
    point: ViewBoxPoint,
    activePointers: Map<number, PointerInfo>,
  ): boolean {
    // Only handle single pointer tap
    if (activePointers.size === 1) {
      return this.onMouseDown(event as unknown as MouseEvent, point);
    }
    return false;
  }

  /**
   * Creates an image element at the specified point
   */
  private _createImageElement(point: ViewBoxPoint): Omit<ImageElement, 'id'> {
    const { src, width, height } = this._config;

    return {
      type: 'image',
      src,
      width,
      height,
      transform: {
        x: point.x,
        y: point.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      opacity: 1,
      zIndex: this._getNextZIndex(),
      locked: false,
      visible: true,
    };
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
}
