import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BaseTool,
  type ToolContext,
  type ToolComposerAccess,
} from '../../../src/interaction/tools/BaseTool.js';
import type { ToolType } from '../../../src/core/types.js';
import type {
  ViewportState,
  HandleConfig,
  ViewBoxPoint,
  PointerInfo,
} from '../../../src/interaction/types.js';
import type { BaseElement } from '../../../src/elements/types.js';
import { HitTester } from '../../../src/interaction/HitTester.js';
import { CoordinateTransformer } from '../../../src/interaction/CoordinateTransformer.js';
import { SelectionHandleRenderer } from '../../../src/interaction/SelectionHandleRenderer.js';

/**
 * Concrete implementation of BaseTool for testing
 */
class TestTool extends BaseTool {
  readonly type: ToolType = 'select';

  public mouseDownCalled = false;
  public mouseMoveCalled = false;
  public mouseUpCalled = false;
  public lastPoint: ViewBoxPoint | null = null;

  onMouseDown(_event: MouseEvent, point: ViewBoxPoint): boolean {
    this.mouseDownCalled = true;
    this.lastPoint = point;
    return true;
  }

  onMouseMove(_event: MouseEvent, point: ViewBoxPoint): boolean {
    this.mouseMoveCalled = true;
    this.lastPoint = point;
    return true;
  }

  onMouseUp(_event: MouseEvent, point: ViewBoxPoint): boolean {
    this.mouseUpCalled = true;
    this.lastPoint = point;
    return true;
  }
}

describe('BaseTool', () => {
  let tool: TestTool;
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
      getElements: (): BaseElement[] => [],
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
      addElement: vi.fn().mockReturnValue('test-id'),
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

    tool = new TestTool(mockContext);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('activate', () => {
    it('should not throw (default implementation)', () => {
      expect(() => {
        tool.activate();
      }).not.toThrow();
    });
  });

  describe('deactivate', () => {
    it('should not throw (default implementation)', () => {
      expect(() => {
        tool.deactivate();
      }).not.toThrow();
    });
  });

  describe('onKeyDown', () => {
    it('should return false by default', () => {
      const result = tool.onKeyDown(new KeyboardEvent('keydown', { key: 'a' }));
      expect(result).toBe(false);
    });
  });

  describe('onKeyUp', () => {
    it('should return false by default', () => {
      const result = tool.onKeyUp(new KeyboardEvent('keyup', { key: 'a' }));
      expect(result).toBe(false);
    });
  });

  describe('onWheel', () => {
    it('should return false by default', () => {
      const result = tool.onWheel(new WheelEvent('wheel'), { x: 100, y: 100 });
      expect(result).toBe(false);
    });
  });

  describe('getCursor', () => {
    it('should return default cursor', () => {
      expect(tool.getCursor()).toBe('default');
    });
  });

  describe('pointer event delegation', () => {
    const createPointerEvent = (type: string, pointerId: number): PointerEvent => {
      return new PointerEvent(type, {
        pointerId,
        pointerType: 'touch',
        clientX: 100,
        clientY: 100,
        isPrimary: true,
      });
    };

    describe('onPointerDown', () => {
      it('should delegate to onMouseDown', () => {
        const activePointers = new Map<number, PointerInfo>();
        const point = { x: 200, y: 200 };

        const result = tool.onPointerDown(
          createPointerEvent('pointerdown', 1),
          point,
          activePointers,
        );

        expect(result).toBe(true);
        expect(tool.mouseDownCalled).toBe(true);
        expect(tool.lastPoint).toEqual(point);
      });
    });

    describe('onPointerMove', () => {
      it('should delegate to onMouseMove', () => {
        const activePointers = new Map<number, PointerInfo>();
        const point = { x: 300, y: 300 };

        const result = tool.onPointerMove(
          createPointerEvent('pointermove', 1),
          point,
          activePointers,
        );

        expect(result).toBe(true);
        expect(tool.mouseMoveCalled).toBe(true);
        expect(tool.lastPoint).toEqual(point);
      });
    });

    describe('onPointerUp', () => {
      it('should delegate to onMouseUp', () => {
        const activePointers = new Map<number, PointerInfo>();
        const point = { x: 400, y: 400 };

        const result = tool.onPointerUp(createPointerEvent('pointerup', 1), point, activePointers);

        expect(result).toBe(true);
        expect(tool.mouseUpCalled).toBe(true);
        expect(tool.lastPoint).toEqual(point);
      });
    });

    describe('onPointerCancel', () => {
      it('should return false by default', () => {
        const activePointers = new Map<number, PointerInfo>();

        const result = tool.onPointerCancel(createPointerEvent('pointercancel', 1), activePointers);

        expect(result).toBe(false);
      });
    });

    describe('onPinchGesture', () => {
      it('should return false by default', () => {
        const result = tool.onPinchGesture({ x: 100, y: 100 }, 1.5, 1);
        expect(result).toBe(false);
      });
    });

    describe('onTwoFingerPan', () => {
      it('should return false by default', () => {
        const result = tool.onTwoFingerPan({ x: 100, y: 100 }, 50, 50);
        expect(result).toBe(false);
      });
    });
  });

  describe('updateCursor', () => {
    it('should update container cursor style', () => {
      // Access protected method via subclass
      class CursorTestTool extends TestTool {
        testUpdateCursor(cursor: string): void {
          this.updateCursor(cursor);
        }
      }

      const cursorTool = new CursorTestTool(mockContext);
      cursorTool.testUpdateCursor('pointer');

      expect(container.style.cursor).toBe('pointer');
    });
  });
});
