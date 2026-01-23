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

  describe('pointer events', () => {
    it('should attach pointer event listeners on initialize', () => {
      const addEventSpy = vi.spyOn(container, 'addEventListener');
      const docAddEventSpy = vi.spyOn(document, 'addEventListener');

      interactionManager.initialize();

      expect(addEventSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(docAddEventSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(docAddEventSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(docAddEventSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));
    });

    it('should remove pointer event listeners on destroy', () => {
      interactionManager.initialize();
      const removeEventSpy = vi.spyOn(container, 'removeEventListener');
      const docRemoveEventSpy = vi.spyOn(document, 'removeEventListener');

      interactionManager.destroy();

      expect(removeEventSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(docRemoveEventSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(docRemoveEventSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(docRemoveEventSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));
    });

    it('should set touch-action to none on container', () => {
      interactionManager.initialize();

      expect(container.style.touchAction).toBe('none');
    });

    it('should reset touch-action on destroy', () => {
      interactionManager.initialize();
      interactionManager.destroy();

      expect(container.style.touchAction).toBe('');
    });

    it('should attach touchstart listener to prevent default', () => {
      const addEventSpy = vi.spyOn(container, 'addEventListener');

      interactionManager.initialize();

      expect(addEventSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), {
        passive: false,
      });
    });
  });

  describe('touch gesture tracking', () => {
    beforeEach(() => {
      interactionManager.initialize();
    });

    it('should track active pointers', () => {
      // Initially empty
      expect(interactionManager.getActivePointers().size).toBe(0);
    });

    it('should return null gesture state when no gesture active', () => {
      expect(interactionManager.getGestureState()).toBeNull();
    });
  });

  describe('pointer event handling', () => {
    beforeEach(() => {
      // Mock setPointerCapture and releasePointerCapture
      container.setPointerCapture = vi.fn();
      container.releasePointerCapture = vi.fn();
      interactionManager.initialize();
    });

    const createTouchPointerEvent = (
      type: string,
      pointerId: number,
      clientX: number,
      clientY: number,
      isPrimary = true,
    ): PointerEvent => {
      return new PointerEvent(type, {
        pointerId,
        pointerType: 'touch',
        clientX,
        clientY,
        isPrimary,
        bubbles: true,
        cancelable: true,
      });
    };

    describe('single touch interaction', () => {
      it('should track pointer on pointerdown', () => {
        const event = createTouchPointerEvent('pointerdown', 1, 100, 100);
        container.dispatchEvent(event);

        expect(interactionManager.getActivePointers().size).toBe(1);
        expect(container.setPointerCapture).toHaveBeenCalledWith(1);
      });

      it('should update pointer position on pointermove', () => {
        const downEvent = createTouchPointerEvent('pointerdown', 1, 100, 100);
        container.dispatchEvent(downEvent);

        const moveEvent = createTouchPointerEvent('pointermove', 1, 150, 150);
        document.dispatchEvent(moveEvent);

        const pointers = interactionManager.getActivePointers();
        expect(pointers.get(1)?.clientX).toBe(150);
        expect(pointers.get(1)?.clientY).toBe(150);
      });

      it('should remove pointer on pointerup', () => {
        const downEvent = createTouchPointerEvent('pointerdown', 1, 100, 100);
        container.dispatchEvent(downEvent);

        expect(interactionManager.getActivePointers().size).toBe(1);

        const upEvent = createTouchPointerEvent('pointerup', 1, 100, 100);
        document.dispatchEvent(upEvent);

        expect(interactionManager.getActivePointers().size).toBe(0);
        expect(container.releasePointerCapture).toHaveBeenCalledWith(1);
      });

      it('should remove pointer on pointercancel', () => {
        const downEvent = createTouchPointerEvent('pointerdown', 1, 100, 100);
        container.dispatchEvent(downEvent);

        expect(interactionManager.getActivePointers().size).toBe(1);

        const cancelEvent = createTouchPointerEvent('pointercancel', 1, 100, 100);
        document.dispatchEvent(cancelEvent);

        expect(interactionManager.getActivePointers().size).toBe(0);
        expect(container.releasePointerCapture).toHaveBeenCalledWith(1);
      });

      it('should ignore mouse pointer events', () => {
        const mouseEvent = new PointerEvent('pointerdown', {
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 100,
          clientY: 100,
          bubbles: true,
        });
        container.dispatchEvent(mouseEvent);

        expect(interactionManager.getActivePointers().size).toBe(0);
      });
    });

    describe('two-finger gesture', () => {
      it('should start gesture when second pointer is added', () => {
        const event1 = createTouchPointerEvent('pointerdown', 1, 100, 100, true);
        container.dispatchEvent(event1);

        expect(interactionManager.getGestureState()).toBeNull();

        const event2 = createTouchPointerEvent('pointerdown', 2, 200, 200, false);
        container.dispatchEvent(event2);

        expect(interactionManager.getActivePointers().size).toBe(2);
        expect(interactionManager.getGestureState()).not.toBeNull();
        expect(interactionManager.getInteractionState()).toBe('panning');
      });

      it('should calculate initial gesture distance correctly', () => {
        const event1 = createTouchPointerEvent('pointerdown', 1, 100, 100, true);
        container.dispatchEvent(event1);

        const event2 = createTouchPointerEvent('pointerdown', 2, 200, 100, false);
        container.dispatchEvent(event2);

        const gestureState = interactionManager.getGestureState();
        expect(gestureState?.initialDistance).toBe(100); // horizontal distance
        expect(gestureState?.type).toBe('pinch');
      });

      it('should update gesture on pointermove', () => {
        // Start with two fingers
        const down1 = createTouchPointerEvent('pointerdown', 1, 100, 100, true);
        container.dispatchEvent(down1);
        const down2 = createTouchPointerEvent('pointerdown', 2, 200, 100, false);
        container.dispatchEvent(down2);

        const initialState = interactionManager.getGestureState();
        expect(initialState?.initialDistance).toBe(100);

        // Move fingers apart
        const move1 = createTouchPointerEvent('pointermove', 1, 50, 100, true);
        document.dispatchEvent(move1);
        const move2 = createTouchPointerEvent('pointermove', 2, 250, 100, false);
        document.dispatchEvent(move2);

        const updatedState = interactionManager.getGestureState();
        expect(updatedState?.currentDistance).toBe(200);
      });

      it('should end gesture when pointer is released', () => {
        const down1 = createTouchPointerEvent('pointerdown', 1, 100, 100, true);
        container.dispatchEvent(down1);
        const down2 = createTouchPointerEvent('pointerdown', 2, 200, 100, false);
        container.dispatchEvent(down2);

        expect(interactionManager.getGestureState()).not.toBeNull();

        const up1 = createTouchPointerEvent('pointerup', 1, 100, 100, true);
        document.dispatchEvent(up1);

        expect(interactionManager.getGestureState()).toBeNull();
        expect(interactionManager.getInteractionState()).toBe('idle');
      });

      it('should end gesture on pointercancel', () => {
        const down1 = createTouchPointerEvent('pointerdown', 1, 100, 100, true);
        container.dispatchEvent(down1);
        const down2 = createTouchPointerEvent('pointerdown', 2, 200, 100, false);
        container.dispatchEvent(down2);

        expect(interactionManager.getGestureState()).not.toBeNull();

        const cancel = createTouchPointerEvent('pointercancel', 1, 100, 100, true);
        document.dispatchEvent(cancel);

        expect(interactionManager.getGestureState()).toBeNull();
      });

      it('should store initial zoom and pan in gesture state', () => {
        interactionManager.setViewportState({ zoom: 2, panX: 50, panY: 100 });

        const down1 = createTouchPointerEvent('pointerdown', 1, 100, 100, true);
        container.dispatchEvent(down1);
        const down2 = createTouchPointerEvent('pointerdown', 2, 200, 100, false);
        container.dispatchEvent(down2);

        const gestureState = interactionManager.getGestureState();
        expect(gestureState?.initialZoom).toBe(2);
        expect(gestureState?.initialPan.x).toBe(50);
        expect(gestureState?.initialPan.y).toBe(100);
      });
    });

    describe('touch start prevention', () => {
      it('should prevent default on touchstart', () => {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100, identifier: 1 } as Touch],
          cancelable: true,
        });
        const preventDefaultSpy = vi.spyOn(touchEvent, 'preventDefault');

        container.dispatchEvent(touchEvent);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });
    });

    describe('pointer capture error handling', () => {
      it('should handle releasePointerCapture errors gracefully', () => {
        container.releasePointerCapture = vi.fn().mockImplementation(() => {
          throw new Error('Pointer not captured');
        });

        const down = createTouchPointerEvent('pointerdown', 1, 100, 100);
        container.dispatchEvent(down);

        // Should not throw
        expect(() => {
          const up = createTouchPointerEvent('pointerup', 1, 100, 100);
          document.dispatchEvent(up);
        }).not.toThrow();
      });
    });
  });

  describe('callback handling', () => {
    it('should call onRequestRender when requestRender is called', () => {
      const onRequestRender = vi.fn();
      const manager = new InteractionManager({
        container,
        svgRoot,
        composer: mockComposer,
        getElements: (): BaseElement[] => elements,
        getSelectionBounds: (): BoundingBox | null => selectionBounds,
        getSelectionRotation: (): number => 0,
        onRequestRender,
      });
      manager.initialize();

      const context = manager.createToolContext();
      context.requestRender();

      expect(onRequestRender).toHaveBeenCalled();

      manager.destroy();
    });
  });
});
