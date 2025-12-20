/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectTool } from '../../../src/interaction/tools/SelectTool.js';
import type { ToolContext, ToolComposerAccess } from '../../../src/interaction/tools/BaseTool.js';
import type { ViewportState, HandleConfig } from '../../../src/interaction/types.js';
import type { BaseElement, ShapeElement } from '../../../src/elements/types.js';
import { HitTester } from '../../../src/interaction/HitTester.js';
import { CoordinateTransformer } from '../../../src/interaction/CoordinateTransformer.js';
import { SelectionHandleRenderer } from '../../../src/interaction/SelectionHandleRenderer.js';

describe('SelectTool', () => {
  let selectTool: SelectTool;
  let mockContext: ToolContext;
  let mockComposer: ToolComposerAccess;
  let elements: BaseElement[];
  let selection: string[];
  let selectionBounds: { x: number; y: number; width: number; height: number } | null;
  let viewportState: ViewportState;
  let container: HTMLElement;
  let svgRoot: SVGSVGElement;

  const createShapeElement = (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    zIndex = 0,
  ): ShapeElement => ({
    id,
    type: 'shape',
    shapeType: 'rect',
    transform: { x, y, scaleX: 1, scaleY: 1, rotation: 0 },
    opacity: 1,
    zIndex,
    locked: false,
    visible: true,
    fill: '#000',
    stroke: '#000',
    strokeWidth: 1,
    width,
    height,
  });

  beforeEach(() => {
    elements = [];
    selection = [];
    selectionBounds = null;
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
      getElements: (): BaseElement[] => elements,
      getSelection: (): string[] => selection,
      getSelectionBounds: (): { x: number; y: number; width: number; height: number } | null =>
        selectionBounds,
      getSelectionRotation: (): number => 0,
      coordinateTransformer,
      handleConfig,
    });

    const handleRenderer = new SelectionHandleRenderer({
      svgRoot,
      handleConfig,
      coordinateTransformer,
    });

    mockComposer = {
      select: vi.fn((id: string): void => {
        selection = [id];
      }),
      addToSelection: vi.fn((id: string): void => {
        if (!selection.includes(id)) {
          selection.push(id);
        }
      }),
      removeFromSelection: vi.fn((id: string): void => {
        selection = selection.filter((s) => s !== id);
      }),
      clearSelection: vi.fn((): void => {
        selection = [];
      }),
      getSelection: (): string[] => selection,
      updateElement: vi.fn(),
      updateElementSilent: vi.fn(),
      pushHistory: vi.fn(),
      getElement: vi.fn((id: string): BaseElement | undefined => elements.find((e) => e.id === id)),
      removeElement: vi.fn(),
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

    selectTool = new SelectTool(mockContext);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('type', () => {
    it('should be select', () => {
      expect(selectTool.type).toBe('select');
    });
  });

  describe('activate', () => {
    it('should set cursor to default', () => {
      selectTool.activate();

      expect(container.style.cursor).toBe('default');
    });
  });

  describe('deactivate', () => {
    it('should reset all state', () => {
      // Start a drag operation
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 62, clientY: 62 }), {
        x: 125,
        y: 125,
      });

      selectTool.deactivate();

      // State should be reset - verify through getCursor returning default
      expect(selectTool.getCursor()).toBe('default');
    });
  });

  describe('onMouseDown', () => {
    it('should select element on click', () => {
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];

      // Element is at viewBox (100,100) with size 50x50, so center is (125, 125)
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 62, clientY: 62 }), {
        x: 125,
        y: 125,
      });

      expect(mockComposer.select).toHaveBeenCalledWith('rect1');
    });

    it('should clear selection on background click', () => {
      selection = ['rect1'];

      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 10, clientY: 10 }), {
        x: 20,
        y: 20,
      });

      expect(mockComposer.clearSelection).toHaveBeenCalled();
    });

    it('should toggle selection with shift-click', () => {
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];
      selection = ['rect1'];

      // Element center is at viewBox (125, 125)
      selectTool.onMouseDown(
        new MouseEvent('mousedown', { clientX: 62, clientY: 62, shiftKey: true }),
        { x: 125, y: 125 },
      );

      // Should remove from selection since already selected
      expect(mockComposer.removeFromSelection).toHaveBeenCalledWith('rect1');
    });

    it('should add to selection with shift-click on unselected element', () => {
      elements = [
        createShapeElement('rect1', 100, 100, 50, 50),
        createShapeElement('rect2', 200, 200, 50, 50),
      ];
      selection = ['rect1'];

      // rect2 center is at viewBox (225, 225)
      selectTool.onMouseDown(
        new MouseEvent('mousedown', { clientX: 112, clientY: 112, shiftKey: true }),
        { x: 225, y: 225 },
      );

      expect(mockComposer.addToSelection).toHaveBeenCalledWith('rect2');
    });

    it('should not clear selection on shift-click background', () => {
      selection = ['rect1'];

      selectTool.onMouseDown(
        new MouseEvent('mousedown', { clientX: 10, clientY: 10, shiftKey: true }),
        { x: 20, y: 20 },
      );

      expect(mockComposer.clearSelection).not.toHaveBeenCalled();
    });

    it('should start pan when space is pressed', () => {
      // Press space first
      selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));

      const result = selectTool.onMouseDown(
        new MouseEvent('mousedown', { clientX: 300, clientY: 300 }),
        { x: 600, y: 600 },
      );

      expect(result).toBe(true);
      expect(selectTool.getCursor()).toBe('grabbing');
    });
  });

  describe('onMouseMove', () => {
    it('should start drag after threshold', () => {
      // Use larger element so the center is far enough from handles
      // Handle hit radius is 15 screen pixels = 30 viewBox units at 0.5 scale
      // So we need a selection where center is > 30 units from all handles
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Mouse down on element center (viewBox 150, 150)
      // Center is 50 units from edge handles, so won't hit any
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 75 }), {
        x: 150,
        y: 150,
      });

      // Move past threshold
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 85, clientY: 85 }), {
        x: 170,
        y: 170,
      });

      expect(mockContext.setInteractionState).toHaveBeenCalledWith('dragging');
    });

    it('should update element position during drag', () => {
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 50, height: 50 };

      // Start drag (center at viewBox 125, 125)
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 62, clientY: 62 }), {
        x: 125,
        y: 125,
      });

      // Move past threshold to start drag
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 75, clientY: 75 }), {
        x: 150,
        y: 150,
      });

      // Continue drag
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }), {
        x: 200,
        y: 200,
      });

      // Uses silent update during drag (history pushed on end)
      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });

    it('should update cursor on hover over element', () => {
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];

      // Hover over element center at viewBox (125, 125)
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 62, clientY: 62 }), {
        x: 125,
        y: 125,
      });

      expect(container.style.cursor).toBe('move');
    });

    it('should update cursor on hover over background', () => {
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];

      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }), {
        x: 20,
        y: 20,
      });

      expect(container.style.cursor).toBe('default');
    });
  });

  describe('onMouseUp', () => {
    it('should end drag operation', () => {
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];
      selection = ['rect1'];

      // Start and perform drag
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 125, clientY: 125 }), {
        x: 250,
        y: 250,
      });
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 150, clientY: 150 }), {
        x: 300,
        y: 300,
      });
      selectTool.onMouseUp(new MouseEvent('mouseup', { clientX: 150, clientY: 150 }), {
        x: 300,
        y: 300,
      });

      expect(mockContext.setInteractionState).toHaveBeenCalledWith('idle');
    });

    it('should reset cursor after drag', () => {
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];
      selection = ['rect1'];

      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 125, clientY: 125 }), {
        x: 250,
        y: 250,
      });
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 150, clientY: 150 }), {
        x: 300,
        y: 300,
      });
      selectTool.onMouseUp(new MouseEvent('mouseup', { clientX: 150, clientY: 150 }), {
        x: 300,
        y: 300,
      });

      expect(container.style.cursor).toBe('default');
    });
  });

  describe('onKeyDown', () => {
    it('should enable pan mode on space', () => {
      const result = selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));

      expect(result).toBe(true);
      expect(container.style.cursor).toBe('grab');
    });

    it('should clear selection on escape', () => {
      selection = ['rect1'];

      const result = selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Escape' }));

      expect(result).toBe(true);
      expect(mockComposer.clearSelection).toHaveBeenCalled();
    });

    it('should handle delete key', () => {
      const result = selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Delete' }));

      expect(result).toBe(true);
    });

    it('should handle backspace key', () => {
      const result = selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Backspace' }));

      expect(result).toBe(true);
    });

    it('should return false for unhandled keys', () => {
      const result = selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'KeyA' }));

      expect(result).toBe(false);
    });
  });

  describe('onKeyUp', () => {
    it('should disable pan mode on space release', () => {
      selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));

      const result = selectTool.onKeyUp(new KeyboardEvent('keyup', { code: 'Space' }));

      expect(result).toBe(true);
      expect(container.style.cursor).toBe('default');
    });

    it('should return false for unhandled keys', () => {
      const result = selectTool.onKeyUp(new KeyboardEvent('keyup', { code: 'KeyA' }));

      expect(result).toBe(false);
    });
  });

  describe('getCursor', () => {
    it('should return default by default', () => {
      expect(selectTool.getCursor()).toBe('default');
    });

    it('should return grab when space is pressed', () => {
      selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));

      expect(selectTool.getCursor()).toBe('grab');
    });

    it('should return grabbing when panning', () => {
      selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 300, clientY: 300 }), {
        x: 600,
        y: 600,
      });

      expect(selectTool.getCursor()).toBe('grabbing');
    });
  });

  describe('resize operations', () => {
    it('should start resize when clicking on handle', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on SE handle (bottom-right corner)
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }), {
        x: 200,
        y: 200,
      });

      expect(mockContext.setInteractionState).toHaveBeenCalledWith('resizing');
    });

    it('should update element during resize', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on SE handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }), {
        x: 200,
        y: 200,
      });

      // Drag to resize
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 150, clientY: 150 }), {
        x: 300,
        y: 300,
      });

      // Uses silent update during resize (history pushed on end)
      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });
  });

  describe('rotation operations', () => {
    it('should start rotation when clicking on rotate handle', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Calculate rotation handle position (above center)
      const rotateOffset = mockContext.coordinateTransformer.screenDistanceToViewBox(30);

      // Click on rotate handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 50 }), {
        x: 150,
        y: 100 - rotateOffset,
      });

      expect(mockContext.setInteractionState).toHaveBeenCalledWith('rotating');
    });

    it('should update rotation during rotate operation', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      const rotateOffset = mockContext.coordinateTransformer.screenDistanceToViewBox(30);

      // Start rotation
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 50 }), {
        x: 150,
        y: 100 - rotateOffset,
      });

      // Rotate
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 100, clientY: 75 }), {
        x: 200,
        y: 150,
      });

      // Uses silent update during rotation (history pushed on end)
      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
      const updateCall = (mockComposer.updateElementSilent as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(updateCall[1]).toHaveProperty('transform');
      expect(updateCall[1].transform).toHaveProperty('rotation');
    });

    it('should snap rotation to 15 degrees when shift is held', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      const rotateOffset = mockContext.coordinateTransformer.screenDistanceToViewBox(30);

      // Start rotation
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 50 }), {
        x: 150,
        y: 100 - rotateOffset,
      });

      // Rotate with shift key
      selectTool.onMouseMove(
        new MouseEvent('mousemove', { clientX: 100, clientY: 75, shiftKey: true }),
        { x: 200, y: 150 },
      );

      // Uses silent update during rotation (history pushed on end)
      const updateCall = (mockComposer.updateElementSilent as ReturnType<typeof vi.fn>).mock
        .calls[0];
      const rotation = updateCall[1].transform.rotation;
      // Rotation should be a multiple of 15
      expect(rotation % 15).toBe(0);
    });
  });
});
