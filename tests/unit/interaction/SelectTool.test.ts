import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SelectTool } from '../../../src/interaction/tools/SelectTool.js';
import type { ToolContext, ToolComposerAccess } from '../../../src/interaction/tools/BaseTool.js';
import type { ViewportState, HandleConfig, PointerInfo } from '../../../src/interaction/types.js';
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
      calculateSnap: vi.fn((x, y) => ({
        snappedX: false,
        snappedY: false,
        x,
        y,
      })),
      renderSnapIndicators: vi.fn(),
      clearSnapIndicators: vi.fn(),
      getSnappingConfig: vi.fn(() => ({
        enabled: false,
        snapDistance: 8,
        snapToGuides: true,
        snapToGrid: false,
        gridSize: 10,
        snapToElements: true,
        snapToElementCenters: true,
        snapToCanvasEdges: true,
        snapToCanvasCenter: true,
        showSnapIndicators: true,
      })),
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

  describe('keyboard interactions', () => {
    it('should delete selected elements with Delete key', () => {
      elements = [
        createShapeElement('rect1', 100, 100, 100, 100),
        createShapeElement('rect2', 200, 200, 100, 100),
      ];
      selection = ['rect1', 'rect2'];
      selectionBounds = { x: 100, y: 100, width: 200, height: 200 };

      const result = selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Delete' }));

      expect(result).toBe(true);
      expect(mockComposer.removeElement).toHaveBeenCalledWith('rect1');
      expect(mockComposer.removeElement).toHaveBeenCalledWith('rect2');
      expect(mockComposer.clearSelection).toHaveBeenCalled();
      expect(mockContext.requestRender).toHaveBeenCalled();
    });

    it('should delete selected elements with Backspace key', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      const result = selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Backspace' }));

      expect(result).toBe(true);
      expect(mockComposer.removeElement).toHaveBeenCalledWith('rect1');
      expect(mockComposer.clearSelection).toHaveBeenCalled();
    });

    it('should return true but not delete when no selection with Delete key', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = [];
      selectionBounds = null;

      const result = selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Delete' }));

      expect(result).toBe(true);
      expect(mockComposer.removeElement).not.toHaveBeenCalled();
    });

    it('should clear selection with Escape key', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      const result = selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Escape' }));

      expect(result).toBe(true);
      expect(mockComposer.clearSelection).toHaveBeenCalled();
      expect(mockContext.requestRender).toHaveBeenCalled();
    });

    it('should return false for unhandled keys', () => {
      const result = selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'KeyA' }));
      expect(result).toBe(false);
    });
  });

  describe('space+drag panning', () => {
    it('should enable pan mode when space is pressed', () => {
      selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));

      expect(selectTool.getCursor()).toBe('grab');
    });

    it('should not trigger space mode multiple times', () => {
      selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));
      // Second press should be ignored (already in space mode)
      const result = selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));

      expect(result).toBe(false);
    });

    it('should start panning when mouse down with space held', () => {
      selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));

      const result = selectTool.onMouseDown(
        new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
        { x: 200, y: 200 },
      );

      expect(result).toBe(true);
      expect(selectTool.getCursor()).toBe('grabbing');
    });

    it('should update viewport during pan', () => {
      selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }), {
        x: 200,
        y: 200,
      });

      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 150, clientY: 150 }), {
        x: 300,
        y: 300,
      });

      expect(mockContext.setViewportState).toHaveBeenCalled();
    });

    it('should end panning on mouse up', () => {
      selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }), {
        x: 200,
        y: 200,
      });

      expect(selectTool.getCursor()).toBe('grabbing');

      const result = selectTool.onMouseUp(
        new MouseEvent('mouseup', { clientX: 150, clientY: 150 }),
        { x: 300, y: 300 },
      );

      expect(result).toBe(true);
      // Should return to grab cursor since space is still held
      expect(selectTool.getCursor()).toBe('grab');
    });

    it('should exit pan mode when space is released', () => {
      selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));
      expect(selectTool.getCursor()).toBe('grab');

      selectTool.onKeyUp(new KeyboardEvent('keyup', { code: 'Space' }));
      expect(selectTool.getCursor()).toBe('default');
    });

    it('should return false for unhandled key up', () => {
      const result = selectTool.onKeyUp(new KeyboardEvent('keyup', { code: 'KeyA' }));
      expect(result).toBe(false);
    });
  });

  describe('getCursor', () => {
    it('should return move cursor during drag', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on element to start selection
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 75 }), {
        x: 150,
        y: 150,
      });

      // Move to start drag
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 80, clientY: 80 }), {
        x: 160,
        y: 160,
      });

      expect(selectTool.getCursor()).toBe('move');
    });

    it('should return resize cursor during resize', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on SE handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }), {
        x: 200,
        y: 200,
      });

      // Cursor should be a resize cursor (depends on handle type)
      expect(selectTool.getCursor()).toMatch(/-resize$/);
    });

    it('should return grabbing cursor during rotation', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      const rotateOffset = mockContext.coordinateTransformer.screenDistanceToViewBox(30);

      // Click on rotate handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 50 }), {
        x: 150,
        y: 100 - rotateOffset,
      });

      expect(selectTool.getCursor()).toBe('grabbing');
    });
  });

  describe('deactivate', () => {
    it('should reset all state when deactivated', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Start a drag
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 75 }), {
        x: 150,
        y: 150,
      });
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 80, clientY: 80 }), {
        x: 160,
        y: 160,
      });

      expect(selectTool.getCursor()).toBe('move');

      // Deactivate
      selectTool.deactivate();

      // Should be back to default state
      expect(selectTool.getCursor()).toBe('default');
    });
  });

  describe('resize with rotated elements', () => {
    it('should apply rotation transform to resize delta', () => {
      // Create a rotated element
      const rotatedElement = createShapeElement('rect1', 100, 100, 100, 100);
      rotatedElement.transform.rotation = 45;
      elements = [rotatedElement];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on SE handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }), {
        x: 200,
        y: 200,
      });

      // Resize
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 150, clientY: 150 }), {
        x: 300,
        y: 300,
      });

      // Should have called updateElementSilent with rotated delta
      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });

    it('should end resize and push history', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on SE handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }), {
        x: 200,
        y: 200,
      });

      // Resize
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 150, clientY: 150 }), {
        x: 300,
        y: 300,
      });

      // End resize
      selectTool.onMouseUp(new MouseEvent('mouseup', { clientX: 150, clientY: 150 }), {
        x: 300,
        y: 300,
      });

      expect(mockComposer.pushHistory).toHaveBeenCalled();
      expect(mockContext.setInteractionState).toHaveBeenCalledWith('idle');
    });
  });

  describe('resize with aspect ratio preservation', () => {
    it('should preserve aspect ratio when shift is held on corner handle', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on SE handle (corner)
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }), {
        x: 200,
        y: 200,
      });

      // Resize with shift key
      selectTool.onMouseMove(
        new MouseEvent('mousemove', { clientX: 150, clientY: 130, shiftKey: true }),
        { x: 300, y: 260 },
      );

      // Should have called updateElementSilent
      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });

    it('should preserve aspect ratio with width driving height', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 50)]; // 2:1 aspect ratio
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 50 };

      // Click on SE handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 75 }), {
        x: 200,
        y: 150,
      });

      // Resize horizontally more than vertically with shift
      selectTool.onMouseMove(
        new MouseEvent('mousemove', { clientX: 200, clientY: 80, shiftKey: true }),
        { x: 400, y: 160 },
      );

      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });
  });

  describe('resize with different handles', () => {
    it('should resize from west handle', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on W handle (left middle)
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 50, clientY: 75 }), {
        x: 100,
        y: 150,
      });

      // Resize by dragging left
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 30, clientY: 75 }), {
        x: 60,
        y: 150,
      });

      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });

    it('should resize from north handle', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on N handle (top middle)
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 50 }), {
        x: 150,
        y: 100,
      });

      // Resize by dragging up
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 75, clientY: 30 }), {
        x: 150,
        y: 60,
      });

      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });

    it('should resize from northwest handle', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on NW handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 50, clientY: 50 }), {
        x: 100,
        y: 100,
      });

      // Resize by dragging northwest
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 30, clientY: 30 }), {
        x: 60,
        y: 60,
      });

      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });

    it('should resize from northwest with aspect ratio preservation', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on NW handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 50, clientY: 50 }), {
        x: 100,
        y: 100,
      });

      // Resize with shift key - height change larger
      selectTool.onMouseMove(
        new MouseEvent('mousemove', { clientX: 45, clientY: 20, shiftKey: true }),
        { x: 90, y: 40 },
      );

      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });
  });

  describe('resize minimum size enforcement', () => {
    it('should enforce minimum width when resizing from right', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on E handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 75 }), {
        x: 200,
        y: 150,
      });

      // Try to resize to very small width
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 55, clientY: 75 }), {
        x: 110,
        y: 150,
      });

      // Should still update (with min size enforced)
      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });

    it('should enforce minimum height when resizing from bottom', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on S handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 100 }), {
        x: 150,
        y: 200,
      });

      // Try to resize to very small height
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 75, clientY: 55 }), {
        x: 150,
        y: 110,
      });

      // Should still update (with min size enforced)
      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });

    it('should enforce minimum size when resizing from left', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on W handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 50, clientY: 75 }), {
        x: 100,
        y: 150,
      });

      // Try to resize past minimum
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 95, clientY: 75 }), {
        x: 190,
        y: 150,
      });

      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });

    it('should enforce minimum size when resizing from top', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on N handle
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 50 }), {
        x: 150,
        y: 100,
      });

      // Try to resize past minimum
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 75, clientY: 95 }), {
        x: 150,
        y: 190,
      });

      expect(mockComposer.updateElementSilent).toHaveBeenCalled();
    });
  });

  describe('rotation operations extended', () => {
    it('should end rotation and push history', () => {
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

      // End rotation
      selectTool.onMouseUp(new MouseEvent('mouseup', { clientX: 100, clientY: 75 }), {
        x: 200,
        y: 150,
      });

      expect(mockComposer.pushHistory).toHaveBeenCalled();
      expect(mockContext.setInteractionState).toHaveBeenCalledWith('idle');
    });

    it('should not start rotation without selection', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = [];
      selectionBounds = null;

      const rotateOffset = mockContext.coordinateTransformer.screenDistanceToViewBox(30);

      // Try to start rotation
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 50 }), {
        x: 150,
        y: 100 - rotateOffset,
      });

      // Should not be in rotating state
      expect(mockContext.setInteractionState).not.toHaveBeenCalledWith('rotating');
    });
  });

  describe('drag operations extended', () => {
    it('should handle element not found during drag', () => {
      // Use smaller element like working tests
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];
      selection = ['rect1', 'nonexistent'];
      selectionBounds = { x: 100, y: 100, width: 50, height: 50 };

      // Click on element center (viewBox 125, 125)
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 62, clientY: 62 }), {
        x: 125,
        y: 125,
      });

      // Move past threshold
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 75, clientY: 75 }), {
        x: 150,
        y: 150,
      });

      // Should only update the existing element (nonexistent is skipped)
      expect(mockComposer.updateElementSilent).toHaveBeenCalledTimes(1);
    });

    it('should end drag and push history', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on element center
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 75 }), {
        x: 150,
        y: 150,
      });

      // Drag past threshold
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 85, clientY: 85 }), {
        x: 170,
        y: 170,
      });

      // End drag
      selectTool.onMouseUp(new MouseEvent('mouseup', { clientX: 85, clientY: 85 }), {
        x: 170,
        y: 170,
      });

      expect(mockComposer.pushHistory).toHaveBeenCalled();
      expect(mockContext.setInteractionState).toHaveBeenCalledWith('idle');
    });
  });

  describe('hover cursor updates', () => {
    it('should update cursor when hovering over resize handle', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Move to SE handle
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }), {
        x: 200,
        y: 200,
      });

      // Cursor should be updated to resize cursor
      expect(container.style.cursor).toMatch(/-resize$/);
    });

    it('should not update cursor during pan mode', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Enable space pan mode
      selectTool.onKeyDown(new KeyboardEvent('keydown', { code: 'Space' }));

      // Move over element
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 75, clientY: 75 }), {
        x: 150,
        y: 150,
      });

      // Cursor should still be grab, not move
      expect(selectTool.getCursor()).toBe('grab');
    });
  });

  describe('mouse up edge cases', () => {
    it('should return false when no operation in progress', () => {
      const result = selectTool.onMouseUp(
        new MouseEvent('mouseup', { clientX: 100, clientY: 100 }),
        {
          x: 200,
          y: 200,
        },
      );

      expect(result).toBe(false);
    });

    it('should clear pending select on mouse up without drag', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Click on element (but don't drag)
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 75 }), {
        x: 150,
        y: 150,
      });

      // Mouse up without moving past threshold
      selectTool.onMouseUp(new MouseEvent('mouseup', { clientX: 75, clientY: 75 }), {
        x: 150,
        y: 150,
      });

      expect(mockContext.setInteractionState).toHaveBeenCalledWith('idle');
    });
  });

  describe('resize edge cases', () => {
    it('should not start resize without selection', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = [];
      selectionBounds = null;

      // Try to click on handle position
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }), {
        x: 200,
        y: 200,
      });

      // Should not be in resizing state
      expect(mockContext.setInteractionState).not.toHaveBeenCalledWith('resizing');
    });

    it('should handle missing element during resize update', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Start resize
      selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }), {
        x: 200,
        y: 200,
      });

      // Remove element from list (simulating deleted element)
      elements = [];

      // Continue resize
      selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 150, clientY: 150 }), {
        x: 300,
        y: 300,
      });

      // Should not throw, but also not update
      expect(mockComposer.updateElementSilent).not.toHaveBeenCalled();
    });
  });

  describe('touch/pointer support', () => {
    const createPointerEvent = (
      type: string,
      options: {
        clientX: number;
        clientY: number;
        pointerId?: number;
        pointerType?: string;
        isPrimary?: boolean;
      },
    ): PointerEvent => {
      return new PointerEvent(type, {
        clientX: options.clientX,
        clientY: options.clientY,
        pointerId: options.pointerId ?? 1,
        pointerType: options.pointerType ?? 'touch',
        isPrimary: options.isPrimary ?? true,
        bubbles: true,
      });
    };

    const createPointerInfo = (
      pointerId: number,
      clientX: number,
      clientY: number,
      viewBoxPoint: { x: number; y: number },
    ): PointerInfo => ({
      pointerId,
      pointerType: 'touch',
      clientX,
      clientY,
      viewBoxPoint,
      isPrimary: pointerId === 1,
    });

    describe('onPointerDown', () => {
      it('should delegate single pointer to mouse handler', () => {
        elements = [createShapeElement('rect1', 100, 100, 50, 50)];
        const activePointers = new Map<number, PointerInfo>();
        activePointers.set(1, createPointerInfo(1, 62, 62, { x: 125, y: 125 }));

        const event = createPointerEvent('pointerdown', { clientX: 62, clientY: 62 });
        const result = selectTool.onPointerDown(event, { x: 125, y: 125 }, activePointers);

        expect(result).toBe(true);
        expect(mockComposer.select).toHaveBeenCalledWith('rect1');
      });

      it('should return false for multi-pointer', () => {
        const activePointers = new Map<number, PointerInfo>();
        activePointers.set(1, createPointerInfo(1, 100, 100, { x: 200, y: 200 }));
        activePointers.set(2, createPointerInfo(2, 200, 200, { x: 400, y: 400 }));

        const event = createPointerEvent('pointerdown', {
          clientX: 200,
          clientY: 200,
          pointerId: 2,
        });
        const result = selectTool.onPointerDown(event, { x: 400, y: 400 }, activePointers);

        expect(result).toBe(false);
      });
    });

    describe('onPointerMove', () => {
      it('should delegate single pointer to mouse handler', () => {
        elements = [createShapeElement('rect1', 100, 100, 50, 50)];
        const activePointers = new Map<number, PointerInfo>();
        activePointers.set(1, createPointerInfo(1, 62, 62, { x: 125, y: 125 }));

        const event = createPointerEvent('pointermove', { clientX: 62, clientY: 62 });
        selectTool.onPointerMove(event, { x: 125, y: 125 }, activePointers);

        // Should update cursor on hover
        expect(container.style.cursor).toBe('move');
      });

      it('should return false for multi-pointer (gesture handled externally)', () => {
        const activePointers = new Map<number, PointerInfo>();
        activePointers.set(1, createPointerInfo(1, 100, 100, { x: 200, y: 200 }));
        activePointers.set(2, createPointerInfo(2, 200, 200, { x: 400, y: 400 }));

        const event = createPointerEvent('pointermove', { clientX: 150, clientY: 150 });
        const result = selectTool.onPointerMove(event, { x: 300, y: 300 }, activePointers);

        expect(result).toBe(false);
      });
    });

    describe('onPointerUp', () => {
      it('should delegate to mouse handler when all pointers released', () => {
        const activePointers = new Map<number, PointerInfo>();

        const event = createPointerEvent('pointerup', { clientX: 100, clientY: 100 });
        selectTool.onPointerUp(event, { x: 200, y: 200 }, activePointers);

        expect(mockContext.setInteractionState).toHaveBeenCalledWith('idle');
      });
    });

    describe('onPointerCancel', () => {
      it('should reset all state on cancel', () => {
        elements = [createShapeElement('rect1', 100, 100, 100, 100)];
        selection = ['rect1'];
        selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

        // Start a drag
        selectTool.onMouseDown(new MouseEvent('mousedown', { clientX: 75, clientY: 75 }), {
          x: 150,
          y: 150,
        });
        selectTool.onMouseMove(new MouseEvent('mousemove', { clientX: 80, clientY: 80 }), {
          x: 160,
          y: 160,
        });

        const activePointers = new Map<number, PointerInfo>();
        const event = createPointerEvent('pointercancel', { clientX: 80, clientY: 80 });
        const result = selectTool.onPointerCancel(event, activePointers);

        expect(result).toBe(true);
        expect(mockContext.setInteractionState).toHaveBeenCalledWith('idle');
        expect(selectTool.getCursor()).toBe('default');
      });
    });

    describe('onPinchGesture', () => {
      it('should zoom in on pinch expand', () => {
        const centerPoint = { x: 600, y: 600 };
        const scale = 1.5; // Pinch expand
        const initialZoom = 1;

        const result = selectTool.onPinchGesture(centerPoint, scale, initialZoom);

        expect(result).toBe(true);
        expect(mockContext.setViewportState).toHaveBeenCalled();
        expect(viewportState.zoom).toBeGreaterThan(1);
      });

      it('should zoom out on pinch contract', () => {
        viewportState.zoom = 2;
        const centerPoint = { x: 600, y: 600 };
        const scale = 0.5; // Pinch contract
        const initialZoom = 2;

        const result = selectTool.onPinchGesture(centerPoint, scale, initialZoom);

        expect(result).toBe(true);
        expect(mockContext.setViewportState).toHaveBeenCalled();
      });

      it('should clamp zoom to minimum', () => {
        const centerPoint = { x: 600, y: 600 };
        const scale = 0.01; // Very small scale
        const initialZoom = 0.5;

        selectTool.onPinchGesture(centerPoint, scale, initialZoom);

        expect(viewportState.zoom).toBeGreaterThanOrEqual(0.1);
      });

      it('should clamp zoom to maximum', () => {
        const centerPoint = { x: 600, y: 600 };
        const scale = 100; // Very large scale
        const initialZoom = 5;

        selectTool.onPinchGesture(centerPoint, scale, initialZoom);

        expect(viewportState.zoom).toBeLessThanOrEqual(10);
      });
    });

    describe('onTwoFingerPan', () => {
      it('should pan the canvas', () => {
        const centerPoint = { x: 700, y: 700 };
        const deltaX = 100;
        const deltaY = 50;

        const result = selectTool.onTwoFingerPan(centerPoint, deltaX, deltaY);

        expect(result).toBe(true);
        expect(mockContext.setViewportState).toHaveBeenCalled();
        expect(mockContext.requestRender).toHaveBeenCalled();
      });

      it('should accumulate pan from initial position', () => {
        // First pan gesture
        selectTool.onTwoFingerPan({ x: 700, y: 700 }, 50, 50);
        const firstPanX = viewportState.panX;

        // Second pan gesture should use same initial position
        selectTool.onTwoFingerPan({ x: 750, y: 750 }, 100, 100);

        // Pan should be from initial, not accumulated
        expect(viewportState.panX).not.toBe(firstPanX);
      });
    });
  });
});
