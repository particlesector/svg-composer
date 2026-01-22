/**
 * Tool for adding text elements to the canvas
 */

import type { ToolType } from '../../core/types.js';
import type { TextElement } from '../../elements/types.js';
import type { ViewBoxPoint } from '../types.js';
import { BaseTool, type ToolContext } from './BaseTool.js';

/**
 * Configuration for the AddTextTool
 */
export interface AddTextConfig {
  /** Initial text content (default: 'Text') */
  content?: string;
  /** Font size in viewBox units (default: 24) */
  fontSize?: number;
  /** CSS font family (default: 'Arial, sans-serif') */
  fontFamily?: string;
  /** CSS color string for fill (default: '#000000') */
  fill?: string;
  /** Text alignment anchor (default: 'start') */
  textAnchor?: 'start' | 'middle' | 'end';
}

const DEFAULT_CONFIG: Required<AddTextConfig> = {
  content: 'Text',
  fontSize: 24,
  fontFamily: 'Arial, sans-serif',
  fill: '#000000',
  textAnchor: 'start',
};

/**
 * Tool for adding text elements to the canvas.
 * Click to place text at that location.
 */
export class AddTextTool extends BaseTool {
  readonly type: ToolType = 'add-text';

  private _config: Required<AddTextConfig> = { ...DEFAULT_CONFIG };

  constructor(context: ToolContext, config?: Partial<AddTextConfig>) {
    super(context);
    if (config) {
      this._config = { ...DEFAULT_CONFIG, ...config };
    }
  }

  /**
   * Updates the tool configuration
   */
  setConfig(config: Partial<AddTextConfig>): void {
    this._config = { ...this._config, ...config };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): Required<AddTextConfig> {
    return { ...this._config };
  }

  override activate(): void {
    this.updateCursor('text');
  }

  override deactivate(): void {
    this.updateCursor('default');
  }

  override onMouseDown(event: MouseEvent, point: ViewBoxPoint): boolean {
    // Prevent default to avoid text selection
    event.preventDefault();

    // Create text element at click location
    const element = this._createTextElement(point);
    const elementId = this.context.composer.addElement(element);

    // Select the new element
    this.context.composer.select(elementId);

    // Push to history
    this.context.composer.pushHistory();
    this.context.requestRender();

    return true;
  }

  override onMouseMove(_event: MouseEvent, _point: ViewBoxPoint): boolean {
    // No drag behavior for text tool - just single click placement
    return false;
  }

  override onMouseUp(_event: MouseEvent, _point: ViewBoxPoint): boolean {
    return false;
  }

  override getCursor(): string {
    return 'text';
  }

  /**
   * Creates a text element at the specified point
   */
  private _createTextElement(point: ViewBoxPoint): Omit<TextElement, 'id'> {
    const { content, fontSize, fontFamily, fill, textAnchor } = this._config;

    return {
      type: 'text',
      content,
      fontSize,
      fontFamily,
      fill,
      textAnchor,
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
