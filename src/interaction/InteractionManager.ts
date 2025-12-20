/**
 * Main interaction orchestrator for SVG Composer
 */

import type { BoundingBox, ToolType } from '../core/types.js';
import type { BaseElement } from '../elements/types.js';
import type { InteractionState, ViewportState, HandleConfig, ViewBoxPoint } from './types.js';
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

  private _boundHandlers: {
    mousedown: (e: MouseEvent) => void;
    mousemove: (e: MouseEvent) => void;
    mouseup: (e: MouseEvent) => void;
    keydown: (e: KeyboardEvent) => void;
    keyup: (e: KeyboardEvent) => void;
    wheel: (e: WheelEvent) => void;
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

    // Attach event listeners
    this._config.container.addEventListener('mousedown', this._boundHandlers.mousedown);
    document.addEventListener('mousemove', this._boundHandlers.mousemove);
    document.addEventListener('mouseup', this._boundHandlers.mouseup);
    document.addEventListener('keydown', this._boundHandlers.keydown);
    document.addEventListener('keyup', this._boundHandlers.keyup);
    this._config.container.addEventListener('wheel', this._boundHandlers.wheel, {
      passive: false,
    });

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

    // Remove event listeners
    this._config.container.removeEventListener('mousedown', this._boundHandlers.mousedown);
    document.removeEventListener('mousemove', this._boundHandlers.mousemove);
    document.removeEventListener('mouseup', this._boundHandlers.mouseup);
    document.removeEventListener('keydown', this._boundHandlers.keydown);
    document.removeEventListener('keyup', this._boundHandlers.keyup);
    this._config.container.removeEventListener('wheel', this._boundHandlers.wheel);

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
}
