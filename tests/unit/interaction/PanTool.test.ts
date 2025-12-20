import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PanTool } from '../../../src/interaction/tools/PanTool.js';
import type { ToolContext, ToolComposerAccess } from '../../../src/interaction/tools/BaseTool.js';
import type { ViewportState, HandleConfig } from '../../../src/interaction/types.js';
import { HitTester } from '../../../src/interaction/HitTester.js';
import { CoordinateTransformer } from '../../../src/interaction/CoordinateTransformer.js';
import { SelectionHandleRenderer } from '../../../src/interaction/SelectionHandleRenderer.js';

describe('PanTool', () => {
  let panTool: PanTool;
  let mockContext: ToolContext;
  let viewportState: ViewportState;
  let container: HTMLElement;
  let svgRoot: SVGSVGElement;

  beforeEach(() => {
    viewportState = { panX: 0, panY: 0, zoom: 1 };

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
      getElements: (): never[] => [],
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

    const mockComposer: ToolComposerAccess = {
      select: vi.fn(),
      addToSelection: vi.fn(),
      removeFromSelection: vi.fn(),
      clearSelection: vi.fn(),
      getSelection: (): string[] => [],
      updateElement: vi.fn(),
      getElement: vi.fn(),
      getCanvasSize: (): { width: number; height: number } => ({ width: 1200, height: 1200 }),
    };

    mockContext = {
      composer: mockComposer,
      hitTester,
      coordinateTransformer,
      handleRenderer,
      getViewportState: (): ViewportState => viewportState,
      setViewportState: vi.fn((state: Partial<ViewportState>): void => {
        viewportState = { ...viewportState, ...state };
      }),
      setInteractionState: vi.fn(),
      requestRender: vi.fn(),
      getContainer: (): HTMLElement => container,
    };

    panTool = new PanTool(mockContext);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('type', () => {
    it('should be pan', () => {
      expect(panTool.type).toBe('pan');
    });
  });

  describe('activate', () => {
    it('should set cursor to grab', () => {
      panTool.activate();

      expect(container.style.cursor).toBe('grab');
    });
  });

  describe('deactivate', () => {
    it('should reset cursor to default', () => {
      panTool.activate();
      panTool.deactivate();

      expect(container.style.cursor).toBe('default');
    });

    it('should reset panning state', () => {
      panTool.activate();

      // Start panning
      panTool.onMouseDown(new MouseEvent('mousedown', { clientX: 300, clientY: 300 }), {
        x: 600,
        y: 600,
      });

      panTool.deactivate();

      expect(panTool.getCursor()).toBe('grab');
    });
  });

  describe('onMouseDown', () => {
    it('should start panning', () => {
      panTool.activate();

      const result = panTool.onMouseDown(
        new MouseEvent('mousedown', { clientX: 300, clientY: 300 }),
        { x: 600, y: 600 },
      );

      expect(result).toBe(true);
      expect(mockContext.setInteractionState).toHaveBeenCalledWith('panning');
    });

    it('should change cursor to grabbing', () => {
      panTool.activate();

      panTool.onMouseDown(new MouseEvent('mousedown', { clientX: 300, clientY: 300 }), {
        x: 600,
        y: 600,
      });

      expect(container.style.cursor).toBe('grabbing');
    });
  });

  describe('onMouseMove', () => {
    it('should update pan offset during panning', () => {
      panTool.activate();

      panTool.onMouseDown(new MouseEvent('mousedown', { clientX: 300, clientY: 300 }), {
        x: 600,
        y: 600,
      });

      panTool.onMouseMove(new MouseEvent('mousemove', { clientX: 350, clientY: 350 }), {
        x: 500,
        y: 500,
      });

      expect(mockContext.setViewportState).toHaveBeenCalled();
    });

    it('should not update pan when not panning', () => {
      panTool.activate();

      const result = panTool.onMouseMove(
        new MouseEvent('mousemove', { clientX: 350, clientY: 350 }),
        { x: 700, y: 700 },
      );

      expect(result).toBe(false);
      expect(mockContext.setViewportState).not.toHaveBeenCalled();
    });

    it('should request render during panning', () => {
      panTool.activate();

      panTool.onMouseDown(new MouseEvent('mousedown', { clientX: 300, clientY: 300 }), {
        x: 600,
        y: 600,
      });

      panTool.onMouseMove(new MouseEvent('mousemove', { clientX: 350, clientY: 350 }), {
        x: 500,
        y: 500,
      });

      expect(mockContext.requestRender).toHaveBeenCalled();
    });
  });

  describe('onMouseUp', () => {
    it('should end panning', () => {
      panTool.activate();

      panTool.onMouseDown(new MouseEvent('mousedown', { clientX: 300, clientY: 300 }), {
        x: 600,
        y: 600,
      });

      const result = panTool.onMouseUp(new MouseEvent('mouseup', { clientX: 350, clientY: 350 }), {
        x: 700,
        y: 700,
      });

      expect(result).toBe(true);
      expect(mockContext.setInteractionState).toHaveBeenCalledWith('idle');
    });

    it('should change cursor back to grab', () => {
      panTool.activate();

      panTool.onMouseDown(new MouseEvent('mousedown', { clientX: 300, clientY: 300 }), {
        x: 600,
        y: 600,
      });

      panTool.onMouseUp(new MouseEvent('mouseup', { clientX: 350, clientY: 350 }), {
        x: 700,
        y: 700,
      });

      expect(container.style.cursor).toBe('grab');
    });

    it('should return false when not panning', () => {
      panTool.activate();

      const result = panTool.onMouseUp(new MouseEvent('mouseup', { clientX: 350, clientY: 350 }), {
        x: 700,
        y: 700,
      });

      expect(result).toBe(false);
    });
  });

  describe('onWheel', () => {
    it('should zoom in when scrolling up', () => {
      panTool.activate();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 300,
        clientY: 300,
      });

      panTool.onWheel(wheelEvent, { x: 600, y: 600 });

      expect(mockContext.setViewportState).toHaveBeenCalled();
      const call = (mockContext.setViewportState as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.zoom).toBeGreaterThan(1);
    });

    it('should zoom out when scrolling down', () => {
      viewportState.zoom = 2;
      panTool.activate();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100,
        clientX: 300,
        clientY: 300,
      });

      panTool.onWheel(wheelEvent, { x: 600, y: 600 });

      expect(mockContext.setViewportState).toHaveBeenCalled();
      const call = (mockContext.setViewportState as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.zoom).toBeLessThan(2);
    });

    it('should clamp zoom to minimum', () => {
      viewportState.zoom = 0.2;
      panTool.activate();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100, // Scroll down to zoom out
        clientX: 300,
        clientY: 300,
      });

      panTool.onWheel(wheelEvent, { x: 600, y: 600 });

      const call = (mockContext.setViewportState as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.zoom).toBeGreaterThanOrEqual(0.1);
    });

    it('should clamp zoom to maximum', () => {
      viewportState.zoom = 9.9;
      panTool.activate();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100, // Scroll up to zoom in
        clientX: 300,
        clientY: 300,
      });

      panTool.onWheel(wheelEvent, { x: 600, y: 600 });

      const call = (mockContext.setViewportState as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.zoom).toBeLessThanOrEqual(10);
    });

    it('should always return true', () => {
      panTool.activate();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 300,
        clientY: 300,
      });

      const result = panTool.onWheel(wheelEvent, { x: 600, y: 600 });

      expect(result).toBe(true);
    });

    it('should request render after zoom', () => {
      panTool.activate();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 300,
        clientY: 300,
      });

      panTool.onWheel(wheelEvent, { x: 600, y: 600 });

      expect(mockContext.requestRender).toHaveBeenCalled();
    });

    it('should not request render if zoom unchanged', () => {
      viewportState.zoom = 10; // At max
      panTool.activate();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100, // Try to zoom in more
        clientX: 300,
        clientY: 300,
      });

      panTool.onWheel(wheelEvent, { x: 600, y: 600 });

      expect(mockContext.requestRender).not.toHaveBeenCalled();
    });
  });

  describe('getCursor', () => {
    it('should return grab by default', () => {
      panTool.activate();

      expect(panTool.getCursor()).toBe('grab');
    });

    it('should return grabbing when panning', () => {
      panTool.activate();

      panTool.onMouseDown(new MouseEvent('mousedown', { clientX: 300, clientY: 300 }), {
        x: 600,
        y: 600,
      });

      expect(panTool.getCursor()).toBe('grabbing');
    });
  });
});
