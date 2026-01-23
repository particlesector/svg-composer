/**
 * Main interaction orchestrator for SVG Composer
 */

import type { BoundingBox, ToolType } from '../core/types.js';
import type { BaseElement } from '../elements/types.js';
import type {
  InteractionState,
  ViewportState,
  HandleConfig,
  ViewBoxPoint,
  PointerInfo,
  GestureState,
} from './types.js';
import { DEFAULT_HANDLE_CONFIG, DEFAULT_VIEWPORT_STATE } from './types.js';
import { CoordinateTransformer } from './CoordinateTransformer.js';
import { HitTester } from './HitTester.js';
import {
  SelectionHandleRenderer,
  type SelectionHandleRendererConfig,
} from './SelectionHandleRenderer.js';
import type { BaseTool, ToolComposerAccess, ToolContext } from './tools/BaseTool.js';

/**
 * Configuration for the InteractionManager
 */
export interface InteractionManagerConfig {
  /** The container element holding the SVG */
  container: HTMLElement;
  /** The root SVG element */
  svgRoot: SVGSVGElement;
  /** Access to composer methods */
  composer: ToolComposerAccess;
  /** Function to get all elements */
  getElements: () => BaseElement[];
  /** Function to get the selection bounds */
  getSelectionBounds: () => BoundingBox | null;
  /** Function to get the selection rotation */
  getSelectionRotation: () => number;
  /** Handle configuration (optional) */
  handleConfig?: HandleConfig;
  /** ID prefix for generated elements */
  idPrefix?: string;
  /** Callback to request a full SVG re-render */
  onRequestRender?: () => void;
}

/**
 * Manages all user interactions with the SVG canvas.
 * Coordinates between tools, hit testing, and handle rendering.
 */
export class InteractionManager {
  private readonly _config: InteractionManagerConfig;
  private readonly _handleConfig: HandleConfig;
  private readonly _coordinateTransformer: CoordinateTransformer;
  private readonly _hitTester: HitTester;
  private readonly _handleRenderer: SelectionHandleRenderer;

  private _viewportState: ViewportState;
  private _interactionState: InteractionState = 'idle';
  private _currentToolType: ToolType = 'select';
  private _tools = new Map<ToolType, BaseTool>();
  private _activeTool: BaseTool | null = null;
  private _initialized = false;

  /** Track active pointers for multi-touch gestures */
  private _activePointers = new Map<number, PointerInfo>();

  /** Current gesture state for two-finger interactions */
  private _gestureState: GestureState | null = null;

  private _boundHandlers: {
    mousedown: (e: MouseEvent) => void;
    mousemove: (e: MouseEvent) => void;
    mouseup: (e: MouseEvent) => void;
    keydown: (e: KeyboardEvent) => void;
    keyup: (e: KeyboardEvent) => void;
    wheel: (e: WheelEvent) => void;
    pointerdown: (e: PointerEvent) => void;
    pointermove: (e: PointerEvent) => void;
    pointerup: (e: PointerEvent) => void;
    pointercancel: (e: PointerEvent) => void;
    touchstart: (e: TouchEvent) => void;
  };

  constructor(config: InteractionManagerConfig) {
    this._config = config;
    this._handleConfig = config.handleConfig ?? DEFAULT_HANDLE_CONFIG;
    this._viewportState = { ...DEFAULT_VIEWPORT_STATE };

    // Create coordinate transformer
    this._coordinateTransformer = new CoordinateTransformer(config.container, {
      getViewportState: (): ViewportState => this._viewportState,
      getCanvasSize: (): { width: number; height: number } => config.composer.getCanvasSize(),
    });

    // Create hit tester
    this._hitTester = new HitTester({
      getElements: config.getElements,
      getSelection: (): string[] => config.composer.getSelection(),
      getSelectionBounds: config.getSelectionBounds,
      getSelectionRotation: config.getSelectionRotation,
      coordinateTransformer: this._coordinateTransformer,
      handleConfig: this._handleConfig,
    });

    // Create handle renderer
    const handleRendererConfig: SelectionHandleRendererConfig = {
      svgRoot: config.svgRoot,
      handleConfig: this._handleConfig,
      coordinateTransformer: this._coordinateTransformer,
    };
    if (config.idPrefix !== undefined) {
      handleRendererConfig.idPrefix = config.idPrefix;
    }
    this._handleRenderer = new SelectionHandleRenderer(handleRendererConfig);

    // Bind event handlers
    this._boundHandlers = {
      mousedown: this._onMouseDown.bind(this),
      mousemove: this._onMouseMove.bind(this),
      mouseup: this._onMouseUp.bind(this),
      keydown: this._onKeyDown.bind(this),
      keyup: this._onKeyUp.bind(this),
      wheel: this._onWheel.bind(this),
      pointerdown: this._onPointerDown.bind(this),
      pointermove: this._onPointerMove.bind(this),
      pointerup: this._onPointerUp.bind(this),
      pointercancel: this._onPointerCancel.bind(this),
      touchstart: this._onTouchStart.bind(this),
    };
  }

  /**
   * Initializes the interaction manager and attaches event listeners
   */
  initialize(): void {
    if (this._initialized) {
      return;
    }

    // Initialize handle renderer
    this._handleRenderer.initialize();

    // Attach mouse event listeners (fallback for non-pointer environments)
    this._config.container.addEventListener('mousedown', this._boundHandlers.mousedown);
    document.addEventListener('mousemove', this._boundHandlers.mousemove);
    document.addEventListener('mouseup', this._boundHandlers.mouseup);
    document.addEventListener('keydown', this._boundHandlers.keydown);
    document.addEventListener('keyup', this._boundHandlers.keyup);
    this._config.container.addEventListener('wheel', this._boundHandlers.wheel, {
      passive: false,
    });

    // Attach pointer event listeners for touch/pen support
    this._config.container.addEventListener('pointerdown', this._boundHandlers.pointerdown);
    document.addEventListener('pointermove', this._boundHandlers.pointermove);
    document.addEventListener('pointerup', this._boundHandlers.pointerup);
    document.addEventListener('pointercancel', this._boundHandlers.pointercancel);

    // Prevent default touch actions to enable custom gesture handling
    this._config.container.addEventListener('touchstart', this._boundHandlers.touchstart, {
      passive: false,
    });

    // Enable touch-action CSS for proper pointer event handling
    this._config.container.style.touchAction = 'none';

    // Activate current tool
    this._activeTool = this._tools.get(this._currentToolType) ?? null;
    this._activeTool?.activate();

    this._initialized = true;
  }

  /**
   * Cleans up the interaction manager and removes event listeners
   */
  destroy(): void {
    if (!this._initialized) {
      return;
    }

    // Deactivate current tool
    this._activeTool?.deactivate();
    this._activeTool = null;

    // Remove mouse event listeners
    this._config.container.removeEventListener('mousedown', this._boundHandlers.mousedown);
    document.removeEventListener('mousemove', this._boundHandlers.mousemove);
    document.removeEventListener('mouseup', this._boundHandlers.mouseup);
    document.removeEventListener('keydown', this._boundHandlers.keydown);
    document.removeEventListener('keyup', this._boundHandlers.keyup);
    this._config.container.removeEventListener('wheel', this._boundHandlers.wheel);

    // Remove pointer event listeners
    this._config.container.removeEventListener('pointerdown', this._boundHandlers.pointerdown);
    document.removeEventListener('pointermove', this._boundHandlers.pointermove);
    document.removeEventListener('pointerup', this._boundHandlers.pointerup);
    document.removeEventListener('pointercancel', this._boundHandlers.pointercancel);
    this._config.container.removeEventListener('touchstart', this._boundHandlers.touchstart);

    // Reset touch-action CSS
    this._config.container.style.touchAction = '';

    // Clear pointer tracking state
    this._activePointers.clear();
    this._gestureState = null;

    // Destroy handle renderer
    this._handleRenderer.destroy();

    this._initialized = false;
  }

  /**
   * Registers a tool with the manager
   */
  registerTool(tool: BaseTool): void {
    this._tools.set(tool.type, tool);

    // If this is the current tool type and we're initialized, activate it
    if (this._initialized && tool.type === this._currentToolType) {
      this._activeTool?.deactivate();
      this._activeTool = tool;
      tool.activate();
    }
  }

  /**
   * Sets the current tool
   */
  setTool(tool: ToolType): void {
    if (tool === this._currentToolType) {
      return;
    }

    // Deactivate current tool
    this._activeTool?.deactivate();

    // Switch to new tool
    this._currentToolType = tool;
    this._activeTool = this._tools.get(tool) ?? null;

    // Activate new tool
    this._activeTool?.activate();

    // Reset interaction state
    this._interactionState = 'idle';
  }

  /**
   * Gets the current tool type
   */
  getTool(): ToolType {
    return this._currentToolType;
  }

  /**
   * Gets the current interaction state
   */
  getInteractionState(): InteractionState {
    return this._interactionState;
  }

  /**
   * Gets the current viewport state
   */
  getViewportState(): ViewportState {
    return { ...this._viewportState };
  }

  /**
   * Updates the viewport state
   */
  setViewportState(state: Partial<ViewportState>): void {
    this._viewportState = { ...this._viewportState, ...state };
  }

  /**
   * Gets the coordinate transformer
   */
  getCoordinateTransformer(): CoordinateTransformer {
    return this._coordinateTransformer;
  }

  /**
   * Gets the hit tester
   */
  getHitTester(): HitTester {
    return this._hitTester;
  }

  /**
   * Gets the handle renderer
   */
  getHandleRenderer(): SelectionHandleRenderer {
    return this._handleRenderer;
  }

  /**
   * Updates the selection handle display
   */
  updateHandles(): void {
    const bounds = this._config.getSelectionBounds();
    const rotation = this._config.getSelectionRotation();
    this._handleRenderer.render(bounds, rotation);
  }

  /**
   * Creates the tool context for tools to use
   */
  createToolContext(): ToolContext {
    return {
      composer: this._config.composer,
      hitTester: this._hitTester,
      coordinateTransformer: this._coordinateTransformer,
      handleRenderer: this._handleRenderer,
      getViewportState: (): ViewportState => this.getViewportState(),
      setViewportState: (state: Partial<ViewportState>): void => {
        this.setViewportState(state);
      },
      setInteractionState: (state: InteractionState): void => {
        this._interactionState = state;
      },
      requestRender: (): void => {
        // Call the external render callback first (re-renders SVG elements)
        this._config.onRequestRender?.();
        // Then update the selection handles
        this.updateHandles();
      },
      getContainer: (): HTMLElement => this._config.container,
    };
  }

  /**
   * Converts screen coordinates to viewBox coordinates
   */
  private _screenToViewBox(event: MouseEvent): ViewBoxPoint {
    return this._coordinateTransformer.screenToViewBox(event.clientX, event.clientY);
  }

  /**
   * Handles mouse down events
   */
  private _onMouseDown(event: MouseEvent): void {
    const point = this._screenToViewBox(event);
    this._activeTool?.onMouseDown(event, point);
  }

  /**
   * Handles mouse move events
   */
  private _onMouseMove(event: MouseEvent): void {
    const point = this._screenToViewBox(event);
    this._activeTool?.onMouseMove(event, point);
  }

  /**
   * Handles mouse up events
   */
  private _onMouseUp(event: MouseEvent): void {
    const point = this._screenToViewBox(event);
    this._activeTool?.onMouseUp(event, point);
  }

  /**
   * Handles key down events
   */
  private _onKeyDown(event: KeyboardEvent): void {
    this._activeTool?.onKeyDown(event);
  }

  /**
   * Handles key up events
   */
  private _onKeyUp(event: KeyboardEvent): void {
    this._activeTool?.onKeyUp(event);
  }

  /**
   * Handles wheel events
   */
  private _onWheel(event: WheelEvent): void {
    const point = this._coordinateTransformer.screenToViewBox(event.clientX, event.clientY);
    const handled = this._activeTool?.onWheel(event, point) ?? false;
    if (handled) {
      event.preventDefault();
    }
  }

  /**
   * Handles touch start events to prevent default scrolling/zooming
   */
  private _onTouchStart(event: TouchEvent): void {
    // Prevent default to disable browser's built-in gestures
    if (event.touches.length >= 1) {
      event.preventDefault();
    }
  }

  /**
   * Handles pointer down events
   */
  private _onPointerDown(event: PointerEvent): void {
    // Skip mouse events - they're handled by mouse handlers
    if (event.pointerType === 'mouse') {
      return;
    }

    const point = this._screenToViewBox(event);

    // Track this pointer
    const pointerInfo: PointerInfo = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      clientX: event.clientX,
      clientY: event.clientY,
      viewBoxPoint: point,
      isPrimary: event.isPrimary,
    };
    this._activePointers.set(event.pointerId, pointerInfo);

    // Capture pointer for reliable tracking
    this._config.container.setPointerCapture(event.pointerId);

    // Check for multi-touch gesture start
    if (this._activePointers.size === 2) {
      this._startGesture();
      return;
    }

    // Single pointer - delegate to tool
    if (this._activePointers.size === 1) {
      this._activeTool?.onPointerDown(event, point, this._activePointers);
    }
  }

  /**
   * Handles pointer move events
   */
  private _onPointerMove(event: PointerEvent): void {
    // Skip mouse events - they're handled by mouse handlers
    if (event.pointerType === 'mouse') {
      return;
    }

    // Update tracked pointer position
    const existing = this._activePointers.get(event.pointerId);
    if (existing) {
      const point = this._screenToViewBox(event);
      existing.clientX = event.clientX;
      existing.clientY = event.clientY;
      existing.viewBoxPoint = point;

      // Handle multi-touch gesture
      if (this._activePointers.size === 2 && this._gestureState) {
        this._updateGesture();
        return;
      }

      // Single pointer - delegate to tool
      if (this._activePointers.size === 1) {
        this._activeTool?.onPointerMove(event, point, this._activePointers);
      }
    }
  }

  /**
   * Handles pointer up events
   */
  private _onPointerUp(event: PointerEvent): void {
    // Skip mouse events - they're handled by mouse handlers
    if (event.pointerType === 'mouse') {
      return;
    }

    const point = this._screenToViewBox(event);

    // End gesture if we were in one
    if (this._gestureState && this._activePointers.size <= 2) {
      this._endGesture();
    }

    // Remove the pointer from tracking
    this._activePointers.delete(event.pointerId);

    // Release pointer capture
    try {
      this._config.container.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore - pointer may already be released
    }

    // Delegate to tool if this was the last pointer
    if (this._activePointers.size === 0) {
      this._activeTool?.onPointerUp(event, point, this._activePointers);
    }
  }

  /**
   * Handles pointer cancel events
   */
  private _onPointerCancel(event: PointerEvent): void {
    // Skip mouse events
    if (event.pointerType === 'mouse') {
      return;
    }

    // End any active gesture
    if (this._gestureState) {
      this._endGesture();
    }

    // Remove the pointer from tracking
    this._activePointers.delete(event.pointerId);

    // Release pointer capture
    try {
      this._config.container.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore - pointer may already be released
    }

    // Notify tool
    this._activeTool?.onPointerCancel(event, this._activePointers);
  }

  /**
   * Starts a two-finger gesture
   */
  private _startGesture(): void {
    const pointers = Array.from(this._activePointers.values());
    if (pointers.length !== 2) {
      return;
    }

    const [p1, p2] = pointers;
    if (!p1 || !p2) {
      return;
    }

    // Calculate initial distance between touch points
    const dx = p2.clientX - p1.clientX;
    const dy = p2.clientY - p1.clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate center point in viewBox coordinates
    const centerX = (p1.viewBoxPoint.x + p2.viewBoxPoint.x) / 2;
    const centerY = (p1.viewBoxPoint.y + p2.viewBoxPoint.y) / 2;

    const viewport = this.getViewportState();

    this._gestureState = {
      type: 'pinch',
      initialDistance: distance,
      currentDistance: distance,
      initialZoom: viewport.zoom,
      centerPoint: { x: centerX, y: centerY },
      initialPan: { x: viewport.panX, y: viewport.panY },
    };

    this._interactionState = 'panning';
  }

  /**
   * Updates the current gesture state
   */
  private _updateGesture(): void {
    if (!this._gestureState) {
      return;
    }

    const pointers = Array.from(this._activePointers.values());
    if (pointers.length !== 2) {
      return;
    }

    const [p1, p2] = pointers;
    if (!p1 || !p2) {
      return;
    }

    // Calculate current distance and angle
    const dx = p2.clientX - p1.clientX;
    const dy = p2.clientY - p1.clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this._gestureState.currentDistance = distance;

    // Calculate center point in viewBox coordinates
    const centerX = (p1.viewBoxPoint.x + p2.viewBoxPoint.x) / 2;
    const centerY = (p1.viewBoxPoint.y + p2.viewBoxPoint.y) / 2;
    const centerPoint: ViewBoxPoint = { x: centerX, y: centerY };

    // Handle pinch zoom
    const scale = distance / this._gestureState.initialDistance;
    const handled =
      this._activeTool?.onPinchGesture(centerPoint, scale, this._gestureState.initialZoom) ?? false;

    // Handle two-finger pan
    if (!handled) {
      const deltaX = centerPoint.x - this._gestureState.centerPoint.x;
      const deltaY = centerPoint.y - this._gestureState.centerPoint.y;
      this._activeTool?.onTwoFingerPan(centerPoint, deltaX, deltaY);
    }
  }

  /**
   * Ends the current gesture
   */
  private _endGesture(): void {
    this._gestureState = null;
    this._interactionState = 'idle';
  }

  /**
   * Gets the current active pointers (for testing/debugging)
   */
  getActivePointers(): Map<number, PointerInfo> {
    return new Map(this._activePointers);
  }

  /**
   * Gets the current gesture state (for testing/debugging)
   */
  getGestureState(): GestureState | null {
    return this._gestureState ? { ...this._gestureState } : null;
  }
}
