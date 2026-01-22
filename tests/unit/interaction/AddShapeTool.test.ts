import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AddShapeTool } from '../../../src/interaction/tools/AddShapeTool.js';
import type { ToolContext, ToolComposerAccess } from '../../../src/interaction/tools/BaseTool.js';
import type { ViewportState, HandleConfig } from '../../../src/interaction/types.js';
import type { BaseElement, ShapeElement } from '../../../src/elements/types.js';
import { HitTester } from '../../../src/interaction/HitTester.js';
import { CoordinateTransformer } from '../../../src/interaction/CoordinateTransformer.js';
import { SelectionHandleRenderer } from '../../../src/interaction/SelectionHandleRenderer.js';

describe('AddShapeTool', () => {
  let addShapeTool: AddShapeTool;
  let mockContext: ToolContext;
  let viewportState: ViewportState;
  let container: HTMLElement;
  let svgRoot: SVGSVGElement;
  let mockComposer: ToolComposerAccess;
  let elements: BaseElement[];
  let addedElement: Omit<BaseElement, 'id'> | null;

  beforeEach(() => {
    viewportState = { panX: 0, panY: 0, zoom: 1 };
    elements = [];
    addedElement = null;

    container = document.createElement('div');
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 600,
      bottom: 600,
      width: 600,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.body.appendChild(container);

    svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    container.appendChild(svgRoot);

    const handleConfig: HandleConfig = {
      size: 10,
      fillColor: '#fff',
      strokeColor: '#000',
      rotateHandleOffset: 30,
    };

    const coordinateTransformer = new CoordinateTransformer(container, {
      getViewportState: (): ViewportState => viewportState,
      getCanvasSize: (): { width: number; height: number } => ({ width: 1200, height: 1200 }),
    });

    const hitTester = new HitTester({
      getElements: (): BaseElement[] => elements,
      getSelection: (): string[] => [],
      getSelectionBounds: (): null => null,
      getSelectionRotation: (): number => 0,
      coordinateTransformer,
      handleConfig,
    });

    const handleRenderer = new SelectionHandleRenderer({
      svgRoot,
      handleConfig,
      coordinateTransformer,
    });

    const addElementMock = vi
      .fn()
      .mockImplementation((element: Omit<BaseElement, 'id'>): string => {
        addedElement = element;
        return 'test-id-123';
      });

    mockComposer = {
      select: vi.fn(),
      addToSelection: vi.fn(),
      removeFromSelection: vi.fn(),
      clearSelection: vi.fn(),
      getSelection: (): string[] => [],
      addElement: addElementMock,
      updateElement: vi.fn(),
      updateElementSilent: vi.fn(),
      pushHistory: vi.fn(),
      getElement: vi.fn(),
      removeElement: vi.fn(),
      getCanvasSize: (): { width: number; height: number } => ({ width: 1200, height: 1200 }),
    };

    mockContext = {
      composer: mockComposer,
      hitTester,
      coordinateTransformer,
      handleRenderer,
      getViewportState: (): ViewportState => viewportState,
      setViewportState: vi.fn(),
      setInteractionState: vi.fn(),
      requestRender: vi.fn(),
      getContainer: (): HTMLElement => container,
    };

    addShapeTool = new AddShapeTool(mockContext);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('type', () => {
    it('should be add-shape', () => {
      expect(addShapeTool.type).toBe('add-shape');
    });
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const config = addShapeTool.getConfig();
      expect(config.shapeType).toBe('rect');
      expect(config.fill).toBe('#3b82f6');
      expect(config.stroke).toBe('#1e40af');
      expect(config.strokeWidth).toBe(2);
    });

    it('should merge provided config with defaults', () => {
      const tool = new AddShapeTool(mockContext, { shapeType: 'circle', fill: '#ff0000' });
      const config = tool.getConfig();
      expect(config.shapeType).toBe('circle');
      expect(config.fill).toBe('#ff0000');
      expect(config.stroke).toBe('#1e40af'); // default
    });
  });

  describe('setConfig', () => {
    it('should update configuration', () => {
      addShapeTool.setConfig({ shapeType: 'ellipse' });
      expect(addShapeTool.getConfig().shapeType).toBe('ellipse');
    });

    it('should preserve existing config values', () => {
      addShapeTool.setConfig({ fill: '#00ff00' });
      const config = addShapeTool.getConfig();
      expect(config.fill).toBe('#00ff00');
      expect(config.shapeType).toBe('rect'); // preserved
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the config', () => {
      const config1 = addShapeTool.getConfig();
      const config2 = addShapeTool.getConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('activate', () => {
    it('should set cursor to crosshair', () => {
      addShapeTool.activate();
      expect(container.style.cursor).toBe('crosshair');
    });
  });

  describe('deactivate', () => {
    it('should reset cursor to default', () => {
      addShapeTool.activate();
      addShapeTool.deactivate();
      expect(container.style.cursor).toBe('default');
    });

    it('should reset drawing state', () => {
      addShapeTool.activate();
      // Start drawing
      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });
      addShapeTool.deactivate();

      // getCursor should still return crosshair (tool design)
      expect(addShapeTool.getCursor()).toBe('crosshair');
    });
  });

  describe('onMouseDown', () => {
    it('should create initial shape element', () => {
      addShapeTool.activate();

      const result = addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });

      expect(result).toBe(true);
      expect(mockComposer.addElement).toHaveBeenCalled();
    });

    it('should set interaction state to drawing', () => {
      addShapeTool.activate();

      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });

      expect(mockContext.setInteractionState).toHaveBeenCalledWith('drawing');
    });

    it('should create rect with correct properties', () => {
      addShapeTool.setConfig({ shapeType: 'rect' });
      addShapeTool.activate();

      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });

      expect(addedElement).toBeDefined();
      expect(addedElement?.type).toBe('shape');
      const shape = addedElement as Omit<ShapeElement, 'id'>;
      expect(shape.shapeType).toBe('rect');
      expect(shape.width).toBeDefined();
      expect(shape.height).toBeDefined();
    });

    it('should create circle with correct properties', () => {
      addShapeTool.setConfig({ shapeType: 'circle' });
      addShapeTool.activate();

      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });

      expect(addedElement).toBeDefined();
      const shape = addedElement as Omit<ShapeElement, 'id'>;
      expect(shape.shapeType).toBe('circle');
      expect(shape.r).toBeDefined();
    });

    it('should create ellipse with correct properties', () => {
      addShapeTool.setConfig({ shapeType: 'ellipse' });
      addShapeTool.activate();

      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });

      expect(addedElement).toBeDefined();
      const shape = addedElement as Omit<ShapeElement, 'id'>;
      expect(shape.shapeType).toBe('ellipse');
      expect(shape.rx).toBeDefined();
      expect(shape.ry).toBeDefined();
    });

    it('should set correct z-index', () => {
      // Add existing element with zIndex 5
      elements.push({
        id: 'existing',
        type: 'shape',
        shapeType: 'rect',
        fill: '#000',
        stroke: '#000',
        strokeWidth: 1,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        zIndex: 5,
        locked: false,
        visible: true,
      } as ShapeElement);

      addShapeTool.activate();
      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });

      expect(addedElement?.zIndex).toBe(6);
    });
  });

  describe('onMouseMove', () => {
    it('should update shape during drag', () => {
      addShapeTool.activate();

      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });
      const result = addShapeTool.onMouseMove(new MouseEvent('mousemove'), { x: 200, y: 150 });

      expect(result).toBe(true);
      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
      expect(mockContext.requestRender).toHaveBeenCalled();
    });

    it('should return false when not drawing', () => {
      addShapeTool.activate();

      const result = addShapeTool.onMouseMove(new MouseEvent('mousemove'), { x: 200, y: 150 });

      expect(result).toBe(false);
      expect(mockComposer.updateElementSilent).not.toHaveBeenCalled();
    });

    it('should handle negative drag direction', () => {
      addShapeTool.activate();

      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 200, y: 200 });
      addShapeTool.onMouseMove(new MouseEvent('mousemove'), { x: 100, y: 100 });

      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });
  });

  describe('onMouseUp', () => {
    it('should finalize shape and select it', () => {
      addShapeTool.activate();

      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });
      addShapeTool.onMouseMove(new MouseEvent('mousemove'), { x: 200, y: 150 });
      const result = addShapeTool.onMouseUp(new MouseEvent('mouseup'), { x: 200, y: 150 });

      expect(result).toBe(true);
      expect(mockComposer.select).toHaveBeenCalledWith('test-id-123');
      expect(mockComposer.pushHistory).toHaveBeenCalled();
      expect(mockContext.setInteractionState).toHaveBeenCalledWith('idle');
    });

    it('should return false when not drawing', () => {
      addShapeTool.activate();

      const result = addShapeTool.onMouseUp(new MouseEvent('mouseup'), { x: 200, y: 150 });

      expect(result).toBe(false);
    });
  });

  describe('onKeyDown', () => {
    it('should cancel drawing with Escape', () => {
      addShapeTool.activate();

      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });
      const result = addShapeTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Escape' }));

      expect(result).toBe(true);
      expect(mockComposer.removeElement).toHaveBeenCalledWith('test-id-123');
      expect(mockContext.setInteractionState).toHaveBeenCalledWith('idle');
      expect(mockContext.requestRender).toHaveBeenCalled();
    });

    it('should return false when not drawing', () => {
      addShapeTool.activate();

      const result = addShapeTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Escape' }));

      expect(result).toBe(false);
    });

    it('should return false for non-Escape keys', () => {
      addShapeTool.activate();

      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });
      const result = addShapeTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Enter' }));

      expect(result).toBe(false);
    });
  });

  describe('getCursor', () => {
    it('should return crosshair', () => {
      expect(addShapeTool.getCursor()).toBe('crosshair');
    });
  });

  describe('shape types', () => {
    it('should create rect with transform at top-left corner', () => {
      addShapeTool.setConfig({ shapeType: 'rect' });
      addShapeTool.activate();

      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });
      addShapeTool.onMouseUp(new MouseEvent('mouseup'), { x: 200, y: 150 });

      // Check the final update call for rect positioning (top-left)
      const lastCall = (
        mockComposer.updateElementSilent as ReturnType<typeof vi.fn>
      ).mock.calls.slice(-1)[0];
      expect(lastCall[1].transform.x).toBe(100);
      expect(lastCall[1].transform.y).toBe(100);
    });

    it('should create circle with transform at center', () => {
      addShapeTool.setConfig({ shapeType: 'circle' });
      addShapeTool.activate();

      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });
      addShapeTool.onMouseUp(new MouseEvent('mouseup'), { x: 200, y: 200 });

      // Check the final update call for circle positioning (center)
      const lastCall = (
        mockComposer.updateElementSilent as ReturnType<typeof vi.fn>
      ).mock.calls.slice(-1)[0];
      expect(lastCall[1].transform.x).toBe(150); // center x
      expect(lastCall[1].transform.y).toBe(150); // center y
    });

    it('should create ellipse with transform at center', () => {
      addShapeTool.setConfig({ shapeType: 'ellipse' });
      addShapeTool.activate();

      addShapeTool.onMouseDown(new MouseEvent('mousedown'), { x: 100, y: 100 });
      addShapeTool.onMouseUp(new MouseEvent('mouseup'), { x: 200, y: 150 });

      // Check the final update call for ellipse positioning (center)
      const lastCall = (
        mockComposer.updateElementSilent as ReturnType<typeof vi.fn>
      ).mock.calls.slice(-1)[0];
      expect(lastCall[1].transform.x).toBe(150); // center x
      expect(lastCall[1].transform.y).toBe(125); // center y
    });
  });
});
