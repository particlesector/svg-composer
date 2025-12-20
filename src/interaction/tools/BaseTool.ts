/**
 * Abstract base class for interaction tools
 */

import type { ToolType } from '../../core/types.js';
import type { BaseElement } from '../../elements/types.js';
import type { InteractionState, ViewBoxPoint, ViewportState } from '../types.js';
import type { HitTester } from '../HitTester.js';
import type { SelectionHandleRenderer } from '../SelectionHandleRenderer.js';
import type { CoordinateTransformer } from '../CoordinateTransformer.js';

/**
 * Interface for accessing the composer through the tool
 */
export interface ToolComposerAccess {
  /** Select an element */
  select(id: string): void;
  /** Add element to selection */
  addToSelection(id: string): void;
  /** Remove element from selection */
  removeFromSelection(id: string): void;
  /** Clear all selection */
  clearSelection(): void;
  /** Get selected element IDs */
  getSelection(): string[];
  /** Update an element (creates history entry) */
  updateElement(id: string, updates: Partial<BaseElement>): void;
  /** Update an element without creating a history entry (use during drag/resize/rotate) */
  updateElementSilent(id: string, updates: Partial<BaseElement>): void;
  /** Push current state to history (call after silent updates complete) */
  pushHistory(): void;
  /** Get an element by ID */
  getElement(id: string): BaseElement | undefined;
  /** Remove an element by ID */
  removeElement(id: string): void;
  /** Get canvas size */
  getCanvasSize(): { width: number; height: number };
}

/**
 * Context passed to tools for accessing shared resources
 */
export interface ToolContext {
  /** Access to composer methods */
  composer: ToolComposerAccess;
  /** Hit tester for element/handle detection */
  hitTester: HitTester;
  /** Coordinate transformer */
  coordinateTransformer: CoordinateTransformer;
  /** Selection handle renderer */
  handleRenderer: SelectionHandleRenderer;
  /** Get current viewport state */
  getViewportState: () => ViewportState;
  /** Update viewport state */
  setViewportState: (state: Partial<ViewportState>) => void;
  /** Update interaction state */
  setInteractionState: (state: InteractionState) => void;
  /** Request a render update */
  requestRender: () => void;
  /** Get the container element */
  getContainer: () => HTMLElement;
}

/**
 * Abstract base class for all interaction tools.
 * Tools handle mouse/keyboard events and implement specific interaction behaviors.
 */
export abstract class BaseTool {
  /** The tool type identifier */
  abstract readonly type: ToolType;

  /** Context for accessing shared resources */
  protected readonly context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  /**
   * Called when the tool is activated (becomes the current tool)
   */
  activate(): void {
    // Override in subclasses if needed
  }

  /**
   * Called when the tool is deactivated (another tool becomes current)
   */
  deactivate(): void {
    // Override in subclasses if needed
  }

  /**
   * Handles mouse down events
   *
   * @param event - The mouse event
   * @param point - The point in viewBox coordinates
   * @returns true if the event was handled, false to allow bubbling
   */
  abstract onMouseDown(event: MouseEvent, point: ViewBoxPoint): boolean;

  /**
   * Handles mouse move events
   *
   * @param event - The mouse event
   * @param point - The point in viewBox coordinates
   * @returns true if the event was handled, false to allow bubbling
   */
  abstract onMouseMove(event: MouseEvent, point: ViewBoxPoint): boolean;

  /**
   * Handles mouse up events
   *
   * @param event - The mouse event
   * @param point - The point in viewBox coordinates
   * @returns true if the event was handled, false to allow bubbling
   */
  abstract onMouseUp(event: MouseEvent, point: ViewBoxPoint): boolean;

  /**
   * Handles key down events
   *
   * @param event - The keyboard event
   * @returns true if the event was handled, false to allow bubbling
   */
  onKeyDown(_event: KeyboardEvent): boolean {
    return false;
  }

  /**
   * Handles key up events
   *
   * @param event - The keyboard event
   * @returns true if the event was handled, false to allow bubbling
   */
  onKeyUp(_event: KeyboardEvent): boolean {
    return false;
  }

  /**
   * Handles wheel events (for zoom)
   *
   * @param event - The wheel event
   * @param point - The point in viewBox coordinates
   * @returns true if the event was handled, false to allow bubbling
   */
  onWheel(_event: WheelEvent, _point: ViewBoxPoint): boolean {
    return false;
  }

  /**
   * Gets the cursor style for the current state
   *
   * @returns CSS cursor value
   */
  getCursor(): string {
    return 'default';
  }

  /**
   * Updates the container cursor
   */
  protected updateCursor(cursor: string): void {
    this.context.getContainer().style.cursor = cursor;
  }
}
