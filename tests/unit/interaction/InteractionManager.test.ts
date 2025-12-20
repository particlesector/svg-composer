import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionManager } from '../../../src/interaction/InteractionManager.js';
import type { ToolComposerAccess } from '../../../src/interaction/tools/BaseTool.js';
import type { BaseElement } from '../../../src/elements/types.js';
import type { BoundingBox } from '../../../src/core/types.js';

describe('InteractionManager', () => {
  let container: HTMLElement;
  let svgRoot: SVGSVGElement;
  let interactionManager: InteractionManager;
  let mockComposer: ToolComposerAccess;
  let elements: BaseElement[];
  let selection: string[];
  let selectionBounds: BoundingBox | null;

  beforeEach(() => {
    // Create mock container
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

    // Create mock SVG root
    svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    container.appendChild(svgRoot);

    elements = [];
    selection = [];
    selectionBounds = null;

    // Create mock composer
    mockComposer = {
      select: vi.fn(),
      addToSelection: vi.fn(),
      removeFromSelection: vi.fn(),
      clearSelection: vi.fn(),
      getSelection: (): string[] => selection,
      updateElement: vi.fn(),
      getElement: vi.fn(),
      getCanvasSize: (): { width: number; height: number } => ({ width: 1200, height: 1200 }),
    };

    interactionManager = new InteractionManager({
      container,
      svgRoot,
      composer: mockComposer,
      getElements: (): BaseElement[] => elements,
      getSelectionBounds: (): BoundingBox | null => selectionBounds,
      getSelectionRotation: (): number => 0,
    });
  });

  afterEach(() => {
    interactionManager.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('initialize', () => {
    it('should attach event listeners to container', () => {
      const addEventSpy = vi.spyOn(container, 'addEventListener');

      interactionManager.initialize();

      expect(addEventSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(addEventSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });
    });

    it('should attach event listeners to document', () => {
      const addEventSpy = vi.spyOn(document, 'addEventListener');

      interactionManager.initialize();

      expect(addEventSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(addEventSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(addEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addEventSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    it('should be idempotent', () => {
      const addEventSpy = vi.spyOn(container, 'addEventListener');

      interactionManager.initialize();
      const callCount = addEventSpy.mock.calls.length;

      interactionManager.initialize();

      expect(addEventSpy).toHaveBeenCalledTimes(callCount);
    });

    it('should initialize handle renderer', () => {
      interactionManager.initialize();

      const overlay = svgRoot.querySelector('[id$="selection-overlay"]');
      expect(overlay).not.toBeNull();
    });
  });

  describe('destroy', () => {
    it('should remove event listeners from container', () => {
      interactionManager.initialize();
      const removeEventSpy = vi.spyOn(container, 'removeEventListener');

      interactionManager.destroy();

      expect(removeEventSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(removeEventSpy).toHaveBeenCalledWith('wheel', expect.any(Function));
    });

    it('should remove event listeners from document', () => {
      interactionManager.initialize();
      const removeEventSpy = vi.spyOn(document, 'removeEventListener');

      interactionManager.destroy();

      expect(removeEventSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(removeEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    it('should destroy handle renderer', () => {
      interactionManager.initialize();
      interactionManager.destroy();

      const overlay = svgRoot.querySelector('[id$="selection-overlay"]');
      expect(overlay).toBeNull();
    });

    it('should be idempotent', () => {
      interactionManager.initialize();
      interactionManager.destroy();

      // Second destroy should not throw
      expect(() => {
        interactionManager.destroy();
      }).not.toThrow();
    });
  });

  describe('setTool', () => {
    it('should change current tool type', () => {
      interactionManager.initialize();
      interactionManager.setTool('pan');

      expect(interactionManager.getTool()).toBe('pan');
    });

    it('should activate the new tool', () => {
      interactionManager.initialize();
      interactionManager.setTool('pan');

      // Pan tool changes cursor to grab
      // This is tested implicitly through the tool behavior
      expect(interactionManager.getTool()).toBe('pan');
    });

    it('should not change if already on the same tool', () => {
      interactionManager.initialize();
      interactionManager.setTool('select');

      // Already on select, should be a no-op
      expect(interactionManager.getTool()).toBe('select');
    });
  });

  describe('getTool', () => {
    it('should return current tool type', () => {
      expect(interactionManager.getTool()).toBe('select');
    });
  });

  describe('getInteractionState', () => {
    it('should return idle by default', () => {
      expect(interactionManager.getInteractionState()).toBe('idle');
    });
  });

  describe('getViewportState', () => {
    it('should return default viewport state', () => {
      const state = interactionManager.getViewportState();

      expect(state.panX).toBe(0);
      expect(state.panY).toBe(0);
      expect(state.zoom).toBe(1);
    });

    it('should return a copy of the viewport state', () => {
      const state1 = interactionManager.getViewportState();
      const state2 = interactionManager.getViewportState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('setViewportState', () => {
    it('should update viewport state', () => {
      interactionManager.setViewportState({ panX: 100, panY: 50 });

      const state = interactionManager.getViewportState();
      expect(state.panX).toBe(100);
      expect(state.panY).toBe(50);
      expect(state.zoom).toBe(1); // Unchanged
    });

    it('should allow partial updates', () => {
      interactionManager.setViewportState({ zoom: 2 });

      const state = interactionManager.getViewportState();
      expect(state.panX).toBe(0); // Unchanged
      expect(state.zoom).toBe(2);
    });
  });

  describe('registerTool', () => {
    it('should register a tool', () => {
      interactionManager.initialize();

      // Default tools are already registered (select, pan)
      // Verify by switching to them
      interactionManager.setTool('pan');
      expect(interactionManager.getTool()).toBe('pan');

      interactionManager.setTool('select');
      expect(interactionManager.getTool()).toBe('select');
    });
  });

  describe('updateHandles', () => {
    it('should update handle positions when selection exists', () => {
      selectionBounds = { x: 100, y: 100, width: 200, height: 150 };
      selection = ['element1'];

      interactionManager.initialize();
      interactionManager.updateHandles();

      const overlay = svgRoot.querySelector<SVGGElement>('[id$="selection-overlay"]')!;
      expect(overlay.style.display).not.toBe('none');
    });

    it('should hide handles when no selection', () => {
      interactionManager.initialize();
      interactionManager.updateHandles();

      const overlay = svgRoot.querySelector<SVGGElement>('[id$="selection-overlay"]')!;
      expect(overlay.style.display).toBe('none');
    });
  });

  describe('createToolContext', () => {
    it('should return a tool context with required properties', () => {
      interactionManager.initialize();
      const context = interactionManager.createToolContext();

      expect(context.composer).toBe(mockComposer);
      expect(context.hitTester).toBeDefined();
      expect(context.coordinateTransformer).toBeDefined();
      expect(context.handleRenderer).toBeDefined();
      expect(typeof context.getViewportState).toBe('function');
      expect(typeof context.setViewportState).toBe('function');
      expect(typeof context.setInteractionState).toBe('function');
      expect(typeof context.requestRender).toBe('function');
      expect(typeof context.getContainer).toBe('function');
    });

    it('should provide working getViewportState', () => {
      interactionManager.initialize();
      const context = interactionManager.createToolContext();

      interactionManager.setViewportState({ zoom: 2 });
      expect(context.getViewportState().zoom).toBe(2);
    });

    it('should provide working setViewportState', () => {
      interactionManager.initialize();
      const context = interactionManager.createToolContext();

      context.setViewportState({ panX: 100 });
      expect(interactionManager.getViewportState().panX).toBe(100);
    });

    it('should provide working getContainer', () => {
      interactionManager.initialize();
      const context = interactionManager.createToolContext();

      expect(context.getContainer()).toBe(container);
    });
  });

  describe('getCoordinateTransformer', () => {
    it('should return the coordinate transformer', () => {
      const transformer = interactionManager.getCoordinateTransformer();

      expect(transformer).toBeDefined();
      expect(typeof transformer.screenToViewBox).toBe('function');
    });
  });

  describe('getHitTester', () => {
    it('should return the hit tester', () => {
      const hitTester = interactionManager.getHitTester();

      expect(hitTester).toBeDefined();
      expect(typeof hitTester.hitTest).toBe('function');
    });
  });

  describe('getHandleRenderer', () => {
    it('should return the handle renderer', () => {
      const handleRenderer = interactionManager.getHandleRenderer();

      expect(handleRenderer).toBeDefined();
      expect(typeof handleRenderer.render).toBe('function');
    });
  });
});
