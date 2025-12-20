/**
 * Renders selection box and transform handles as SVG overlay
 */

import type { BoundingBox } from '../core/types.js';
import type { HandleType, HandleConfig, ViewBoxPoint } from './types.js';
import type { CoordinateTransformer } from './CoordinateTransformer.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * All handle types including rotate
 */
const ALL_HANDLES: HandleType[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se', 'rotate'];

/**
 * Cursor styles for each handle type (at 0° rotation)
 */
const HANDLE_CURSORS: Record<HandleType, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  w: 'ew-resize',
  e: 'ew-resize',
  sw: 'nesw-resize',
  s: 'ns-resize',
  se: 'nwse-resize',
  rotate: 'grab',
};

/**
 * Resize cursor cycle (every 45° shifts by one position)
 * Order: ns -> nesw -> ew -> nwse -> (repeat)
 */
const CURSOR_CYCLE = ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize'] as const;

/**
 * Base index into CURSOR_CYCLE for each resize handle at 0° rotation
 */
const HANDLE_CURSOR_INDEX: Partial<Record<HandleType, number>> = {
  n: 0, // ns-resize
  ne: 1, // nesw-resize
  e: 2, // ew-resize
  se: 3, // nwse-resize
  s: 0, // ns-resize (same as n)
  sw: 1, // nesw-resize (same as ne)
  w: 2, // ew-resize (same as e)
  nw: 3, // nwse-resize (same as se)
};

/**
 * Gets the appropriate cursor for a handle, accounting for element rotation.
 * Cursors rotate through the standard resize cursors every 45°.
 *
 * @param handleType - The handle type
 * @param rotation - Element rotation in degrees (default 0)
 * @returns CSS cursor string
 */
export function getRotatedCursor(handleType: HandleType, rotation = 0): string {
  // Rotate handle always uses grab
  if (handleType === 'rotate') {
    return 'grab';
  }

  const baseIndex = HANDLE_CURSOR_INDEX[handleType];
  if (baseIndex === undefined) {
    return HANDLE_CURSORS[handleType];
  }

  // Normalize rotation to 0-360 range and calculate offset (every 45° shifts by 1)
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const offset = Math.round(normalizedRotation / 45) % 4;
  const cursorIndex = (baseIndex + offset) % 4;

  // CURSOR_CYCLE always has 4 elements and cursorIndex is 0-3, so this is safe
  return CURSOR_CYCLE[cursorIndex] as string;
}

/**
 * Configuration for the handle renderer
 */
export interface SelectionHandleRendererConfig {
  /** The root SVG element to append handles to */
  svgRoot: SVGSVGElement;
  /** Handle styling configuration */
  handleConfig: HandleConfig;
  /** Coordinate transformer for size calculations */
  coordinateTransformer: CoordinateTransformer;
  /** Prefix for element IDs */
  idPrefix?: string;
}

/**
 * Renders the selection box outline and resize/rotate handles as SVG elements
 * overlaid on the canvas.
 */
export class SelectionHandleRenderer {
  private readonly _config: SelectionHandleRendererConfig;
  private readonly _idPrefix: string;
  private _overlayGroup: SVGGElement | null = null;
  private _selectionBox: SVGRectElement | null = null;
  private _handles = new Map<HandleType, SVGElement>();
  private _rotateStm: SVGLineElement | null = null;
  private _initialized = false;

  constructor(config: SelectionHandleRendererConfig) {
    this._config = config;
    this._idPrefix = config.idPrefix ?? 'svc-';
  }

  /**
   * Initializes the handle overlay group and creates handle elements
   */
  initialize(): void {
    if (this._initialized) {
      return;
    }

    // Create overlay group
    this._overlayGroup = document.createElementNS(SVG_NS, 'g');
    this._overlayGroup.setAttribute('id', `${this._idPrefix}selection-overlay`);
    this._overlayGroup.setAttribute('pointer-events', 'none');

    // Create selection box
    this._selectionBox = document.createElementNS(SVG_NS, 'rect');
    this._selectionBox.setAttribute('class', `${this._idPrefix}selection-box`);
    this._selectionBox.setAttribute('fill', 'none');
    this._selectionBox.setAttribute('stroke', this._config.handleConfig.strokeColor);
    this._selectionBox.setAttribute('stroke-width', '1');
    this._selectionBox.setAttribute('stroke-dasharray', '4,2');
    this._overlayGroup.appendChild(this._selectionBox);

    // Create rotation stem line
    this._rotateStm = document.createElementNS(SVG_NS, 'line');
    this._rotateStm.setAttribute('class', `${this._idPrefix}rotate-stem`);
    this._rotateStm.setAttribute('stroke', this._config.handleConfig.strokeColor);
    this._rotateStm.setAttribute('stroke-width', '1');
    this._overlayGroup.appendChild(this._rotateStm);

    // Create handles
    for (const handleType of ALL_HANDLES) {
      const handle = this._createHandle(handleType);
      this._handles.set(handleType, handle);
      this._overlayGroup.appendChild(handle);
    }

    // Append to SVG root
    this._config.svgRoot.appendChild(this._overlayGroup);
    this._initialized = true;

    // Initially hidden
    this.hide();
  }

  /**
   * Cleans up the handle overlay
   */
  destroy(): void {
    if (this._overlayGroup?.parentNode) {
      this._overlayGroup.parentNode.removeChild(this._overlayGroup);
    }
    this._overlayGroup = null;
    this._selectionBox = null;
    this._handles.clear();
    this._rotateStm = null;
    this._initialized = false;
  }

  /**
   * Renders handles for the given selection bounds
   *
   * @param bounds - Bounding box of the selection, or null to hide
   * @param rotation - Rotation of the selection in degrees
   */
  render(bounds: BoundingBox | null, rotation = 0): void {
    if (!this._initialized) {
      this.initialize();
    }

    // Validate bounds - check for null and NaN values
    if (
      !bounds ||
      !this._overlayGroup ||
      !Number.isFinite(bounds.x) ||
      !Number.isFinite(bounds.y) ||
      !Number.isFinite(bounds.width) ||
      !Number.isFinite(bounds.height)
    ) {
      this.hide();
      return;
    }

    // Show overlay
    this._overlayGroup.style.display = '';

    // Get viewBox-relative handle size
    const handleSize = this._config.coordinateTransformer.screenDistanceToViewBox(
      this._config.handleConfig.size,
    );
    const halfSize = handleSize / 2;
    const rotateOffset = this._config.coordinateTransformer.screenDistanceToViewBox(
      this._config.handleConfig.rotateHandleOffset,
    );

    // Calculate center for rotation transform
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;

    // Apply rotation to overlay group (validate rotation is finite)
    const safeRotation = Number.isFinite(rotation) ? rotation : 0;
    if (safeRotation !== 0) {
      this._overlayGroup.setAttribute(
        'transform',
        `rotate(${String(safeRotation)}, ${String(cx)}, ${String(cy)})`,
      );
    } else {
      this._overlayGroup.removeAttribute('transform');
    }

    // Update selection box
    if (this._selectionBox) {
      this._selectionBox.setAttribute('x', String(bounds.x));
      this._selectionBox.setAttribute('y', String(bounds.y));
      this._selectionBox.setAttribute('width', String(bounds.width));
      this._selectionBox.setAttribute('height', String(bounds.height));
    }

    // Update rotation stem
    if (this._rotateStm) {
      this._rotateStm.setAttribute('x1', String(cx));
      this._rotateStm.setAttribute('y1', String(bounds.y));
      this._rotateStm.setAttribute('x2', String(cx));
      this._rotateStm.setAttribute('y2', String(bounds.y - rotateOffset));
    }

    // Get handle positions
    const positions = this._getHandlePositions(bounds, rotateOffset);

    // Update each handle
    for (const [handleType, handle] of this._handles) {
      const pos = positions.get(handleType);
      if (!pos) {
        continue;
      }

      // Update cursor based on rotation
      const cursor = getRotatedCursor(handleType, safeRotation);

      if (handleType === 'rotate') {
        // Rotation handle is a circle
        const circle = handle.querySelector('circle');
        if (circle) {
          circle.setAttribute('cx', String(pos.x));
          circle.setAttribute('cy', String(pos.y));
          circle.setAttribute('r', String(halfSize));
          circle.setAttribute('cursor', cursor);
        }
      } else {
        // Resize handles are rectangles
        handle.setAttribute('x', String(pos.x - halfSize));
        handle.setAttribute('y', String(pos.y - halfSize));
        handle.setAttribute('width', String(handleSize));
        handle.setAttribute('height', String(handleSize));
        handle.setAttribute('cursor', cursor);
      }
    }
  }

  /**
   * Hides the selection handles
   */
  hide(): void {
    if (this._overlayGroup) {
      this._overlayGroup.style.display = 'none';
    }
  }

  /**
   * Gets the handle positions for the given bounds
   */
  getHandlePositions(bounds: BoundingBox): Map<HandleType, ViewBoxPoint> {
    const rotateOffset = this._config.coordinateTransformer.screenDistanceToViewBox(
      this._config.handleConfig.rotateHandleOffset,
    );
    return this._getHandlePositions(bounds, rotateOffset);
  }

  /**
   * Internal method to get handle positions
   */
  private _getHandlePositions(
    bounds: BoundingBox,
    rotateOffset: number,
  ): Map<HandleType, ViewBoxPoint> {
    const { x, y, width, height } = bounds;
    const cx = x + width / 2;
    const cy = y + height / 2;

    return new Map<HandleType, ViewBoxPoint>([
      ['nw', { x, y }],
      ['n', { x: cx, y }],
      ['ne', { x: x + width, y }],
      ['w', { x, y: cy }],
      ['e', { x: x + width, y: cy }],
      ['sw', { x, y: y + height }],
      ['s', { x: cx, y: y + height }],
      ['se', { x: x + width, y: y + height }],
      ['rotate', { x: cx, y: y - rotateOffset }],
    ]);
  }

  /**
   * Creates a handle element
   */
  private _createHandle(type: HandleType): SVGElement {
    if (type === 'rotate') {
      // Rotation handle is a group with a circle
      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('class', `${this._idPrefix}handle ${this._idPrefix}handle-rotate`);
      group.setAttribute('data-handle', 'rotate');

      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('fill', this._config.handleConfig.fillColor);
      circle.setAttribute('stroke', this._config.handleConfig.strokeColor);
      circle.setAttribute('stroke-width', '1.5');
      circle.setAttribute('cursor', HANDLE_CURSORS[type]);
      circle.setAttribute('pointer-events', 'all');

      group.appendChild(circle);
      return group;
    } else {
      // Resize handles are rectangles
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('class', `${this._idPrefix}handle ${this._idPrefix}handle-${type}`);
      rect.setAttribute('data-handle', type);
      rect.setAttribute('fill', this._config.handleConfig.fillColor);
      rect.setAttribute('stroke', this._config.handleConfig.strokeColor);
      rect.setAttribute('stroke-width', '1.5');
      rect.setAttribute('cursor', HANDLE_CURSORS[type]);
      rect.setAttribute('pointer-events', 'all');

      return rect;
    }
  }

  /**
   * Gets cursor style for a handle type, accounting for rotation
   *
   * @param handleType - The handle type
   * @param rotation - Element rotation in degrees (default 0)
   */
  static getCursor(handleType: HandleType, rotation = 0): string {
    return getRotatedCursor(handleType, rotation);
  }
}
