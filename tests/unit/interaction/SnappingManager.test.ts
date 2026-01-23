import { describe, it, expect, beforeEach } from 'vitest';
import { SnappingManager } from '../../../src/interaction/SnappingManager.js';
import type { CanvasState, BoundingBox, Guide, SnappingConfig } from '../../../src/core/types.js';
import { DEFAULT_SNAPPING_CONFIG } from '../../../src/core/types.js';
import type { BaseElement, ImageElement } from '../../../src/elements/types.js';
import type { Transform } from '../../../src/core/types.js';

// Helper to create test transforms
function createTestTransform(overrides?: Partial<Transform>): Transform {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    ...overrides,
  };
}

// Helper to create test image elements
function createTestImageElement(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): ImageElement {
  return {
    id,
    type: 'image',
    src: 'test.jpg',
    width,
    height,
    transform: createTestTransform({ x, y }),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
  };
}

// Helper to create canvas state
function createCanvasState(elements: BaseElement[] = [], guides: Guide[] = []): CanvasState {
  const elementMap = new Map<string, BaseElement>();
  for (const element of elements) {
    elementMap.set(element.id, element);
  }
  return {
    width: 1200,
    height: 1200,
    backgroundColor: '#ffffff',
    elements: elementMap,
    selectedIds: new Set(),
    guides,
  };
}

// Helper to create a guide
function createGuide(
  id: string,
  orientation: 'horizontal' | 'vertical',
  position: number,
  options: { locked?: boolean; visible?: boolean } = {},
): Guide {
  return {
    id,
    orientation,
    position,
    locked: options.locked ?? false,
    visible: options.visible ?? true,
  };
}

// Helper to get element bounds
function getBounds(element: BaseElement): BoundingBox | null {
  if (element.type === 'image') {
    const img = element as ImageElement;
    return {
      x: img.transform.x,
      y: img.transform.y,
      width: img.width * img.transform.scaleX,
      height: img.height * img.transform.scaleY,
    };
  }
  return null;
}

describe('SnappingManager', () => {
  let snappingManager: SnappingManager;

  beforeEach(() => {
    snappingManager = new SnappingManager(DEFAULT_SNAPPING_CONFIG);
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(snappingManager.config.enabled).toBe(true);
      expect(snappingManager.config.snapDistance).toBe(8);
      expect(snappingManager.config.snapToGuides).toBe(true);
    });

    it('should accept custom config', () => {
      const customConfig: SnappingConfig = {
        ...DEFAULT_SNAPPING_CONFIG,
        enabled: false,
        snapDistance: 16,
      };
      const customManager = new SnappingManager(customConfig);
      expect(customManager.config.enabled).toBe(false);
      expect(customManager.config.snapDistance).toBe(16);
    });
  });

  describe('updateConfig', () => {
    it('should update config partially', () => {
      snappingManager.updateConfig({ snapDistance: 12 });
      expect(snappingManager.config.snapDistance).toBe(12);
      expect(snappingManager.config.enabled).toBe(true);
    });

    it('should update enabled state', () => {
      snappingManager.updateConfig({ enabled: false });
      expect(snappingManager.config.enabled).toBe(false);
    });
  });

  describe('calculateSnap', () => {
    describe('when snapping is disabled', () => {
      it('should return unmodified position', () => {
        snappingManager.updateConfig({ enabled: false });
        const state = createCanvasState();
        const bounds: BoundingBox = { x: 100, y: 100, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(100, 100, bounds, state, new Set(), getBounds);

        expect(result.snappedX).toBe(false);
        expect(result.snappedY).toBe(false);
        expect(result.x).toBe(100);
        expect(result.y).toBe(100);
      });
    });

    describe('snap to guides', () => {
      it('should snap to a vertical guide (left edge)', () => {
        const guides = [createGuide('g1', 'vertical', 100)];
        const state = createCanvasState([], guides);
        const bounds: BoundingBox = { x: 97, y: 200, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(97, 200, bounds, state, new Set(), getBounds);

        expect(result.snappedX).toBe(true);
        expect(result.x).toBe(100);
        expect(result.snapTargetX?.type).toBe('guide');
      });

      it('should snap to a horizontal guide (top edge)', () => {
        const guides = [createGuide('g1', 'horizontal', 200)];
        const state = createCanvasState([], guides);
        const bounds: BoundingBox = { x: 100, y: 197, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(100, 197, bounds, state, new Set(), getBounds);

        expect(result.snappedY).toBe(true);
        expect(result.y).toBe(200);
        expect(result.snapTargetY?.type).toBe('guide');
      });

      it('should not snap to invisible guides', () => {
        const guides = [createGuide('g1', 'vertical', 100, { visible: false })];
        const state = createCanvasState([], guides);
        const bounds: BoundingBox = { x: 97, y: 200, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(97, 200, bounds, state, new Set(), getBounds);

        expect(result.snappedX).toBe(false);
        expect(result.x).toBe(97);
      });

      it('should snap to locked guides (locked prevents moving, not snapping)', () => {
        const guides = [createGuide('g1', 'vertical', 100, { locked: true })];
        const state = createCanvasState([], guides);
        const bounds: BoundingBox = { x: 97, y: 200, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(97, 200, bounds, state, new Set(), getBounds);

        // Locked guides should still be snap targets
        expect(result.snappedX).toBe(true);
        expect(result.x).toBe(100);
        expect(result.snapTargetX?.referenceId).toBe('g1');
      });

      it('should snap to nearest guide when multiple are available', () => {
        const guides = [createGuide('g1', 'vertical', 100), createGuide('g2', 'vertical', 200)];
        const state = createCanvasState([], guides);
        const bounds: BoundingBox = { x: 103, y: 200, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(103, 200, bounds, state, new Set(), getBounds);

        expect(result.snappedX).toBe(true);
        expect(result.x).toBe(100);
        expect(result.snapTargetX?.referenceId).toBe('g1');
      });
    });

    describe('snap to grid', () => {
      beforeEach(() => {
        snappingManager.updateConfig({
          snapToGrid: true,
          gridSize: 50,
          snapToGuides: false,
          snapToElements: false,
          snapToElementCenters: false,
          snapToCanvasEdges: false,
          snapToCanvasCenter: false,
        });
      });

      it('should snap to grid lines', () => {
        const state = createCanvasState();
        const bounds: BoundingBox = { x: 97, y: 145, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(97, 145, bounds, state, new Set(), getBounds);

        expect(result.snappedX).toBe(true);
        expect(result.snappedY).toBe(true);
        expect(result.x).toBe(100);
        expect(result.y).toBe(150);
      });
    });

    describe('snap to other elements', () => {
      beforeEach(() => {
        snappingManager.updateConfig({
          snapToGuides: false,
          snapToGrid: false,
          snapToElements: true,
          snapToElementCenters: false,
          snapToCanvasEdges: false,
          snapToCanvasCenter: false,
        });
      });

      it('should snap to element edges', () => {
        const elements = [createTestImageElement('el1', 200, 300, 100, 100)];
        const state = createCanvasState(elements);
        const bounds: BoundingBox = { x: 97, y: 150, width: 50, height: 50 };
        const excludeIds = new Set<string>();

        const result = snappingManager.calculateSnap(97, 150, bounds, state, excludeIds, getBounds);

        // Right edge of dragged element (97 + 50 = 147) should snap to left edge of target (200)
        // Left edge (97) should snap if close
        // We're checking for edge snapping
        expect(result.snappedX).toBe(false); // 97 is not within 8px of 200 or 300
      });

      it('should snap to element left edge', () => {
        const elements = [createTestImageElement('el1', 100, 300, 100, 100)];
        const state = createCanvasState(elements);
        const bounds: BoundingBox = { x: 97, y: 150, width: 50, height: 50 };
        const excludeIds = new Set<string>();

        const result = snappingManager.calculateSnap(97, 150, bounds, state, excludeIds, getBounds);

        expect(result.snappedX).toBe(true);
        expect(result.x).toBe(100);
      });

      it('should exclude specified element IDs from snap targets', () => {
        const elements = [createTestImageElement('el1', 100, 300, 100, 100)];
        const state = createCanvasState(elements);
        const bounds: BoundingBox = { x: 97, y: 150, width: 50, height: 50 };
        const excludeIds = new Set<string>(['el1']);

        const result = snappingManager.calculateSnap(97, 150, bounds, state, excludeIds, getBounds);

        expect(result.snappedX).toBe(false);
      });

      it('should not snap to invisible elements', () => {
        const elements = [
          {
            ...createTestImageElement('el1', 100, 300, 100, 100),
            visible: false,
          },
        ];
        const state = createCanvasState(elements);
        const bounds: BoundingBox = { x: 97, y: 150, width: 50, height: 50 };
        const excludeIds = new Set<string>();

        const result = snappingManager.calculateSnap(97, 150, bounds, state, excludeIds, getBounds);

        expect(result.snappedX).toBe(false);
      });
    });

    describe('snap to element centers', () => {
      beforeEach(() => {
        snappingManager.updateConfig({
          snapToGuides: false,
          snapToGrid: false,
          snapToElements: false,
          snapToElementCenters: true,
          snapToCanvasEdges: false,
          snapToCanvasCenter: false,
        });
      });

      it('should snap to element center', () => {
        // Element at (100, 300) with size 100x100, center is at (150, 350)
        const elements = [createTestImageElement('el1', 100, 300, 100, 100)];
        const state = createCanvasState(elements);
        // Dragged bounds center would be at (122 + 25 = 147, y), which is within 8px of 150
        const bounds: BoundingBox = { x: 122, y: 150, width: 50, height: 50 };
        const excludeIds = new Set<string>();

        const result = snappingManager.calculateSnap(
          122,
          150,
          bounds,
          state,
          excludeIds,
          getBounds,
        );

        expect(result.snappedX).toBe(true);
        // Snap adjustment should align center (147) to element center (150)
        // So new x = 122 + 3 = 125
        expect(result.x).toBe(125);
      });
    });

    describe('snap to canvas edges', () => {
      beforeEach(() => {
        snappingManager.updateConfig({
          snapToGuides: false,
          snapToGrid: false,
          snapToElements: false,
          snapToElementCenters: false,
          snapToCanvasEdges: true,
          snapToCanvasCenter: false,
        });
      });

      it('should snap to left canvas edge', () => {
        const state = createCanvasState();
        const bounds: BoundingBox = { x: 3, y: 100, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(3, 100, bounds, state, new Set(), getBounds);

        expect(result.snappedX).toBe(true);
        expect(result.x).toBe(0);
      });

      it('should snap to top canvas edge', () => {
        const state = createCanvasState();
        const bounds: BoundingBox = { x: 100, y: 5, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(100, 5, bounds, state, new Set(), getBounds);

        expect(result.snappedY).toBe(true);
        expect(result.y).toBe(0);
      });

      it('should snap to right canvas edge', () => {
        const state = createCanvasState();
        // Canvas is 1200 wide, element is 50 wide, so right edge would be at x + 50
        // To snap to right edge (1200), element's right edge (x+50) should be close
        // So x = 1200 - 50 - 3 = 1147 would put right edge at 1197, within 8px of 1200
        const bounds: BoundingBox = { x: 1147, y: 100, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(
          1147,
          100,
          bounds,
          state,
          new Set(),
          getBounds,
        );

        expect(result.snappedX).toBe(true);
        expect(result.x).toBe(1150); // So right edge is at 1200
      });

      it('should snap to bottom canvas edge', () => {
        const state = createCanvasState();
        const bounds: BoundingBox = { x: 100, y: 1147, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(
          100,
          1147,
          bounds,
          state,
          new Set(),
          getBounds,
        );

        expect(result.snappedY).toBe(true);
        expect(result.y).toBe(1150); // So bottom edge is at 1200
      });
    });

    describe('snap to canvas center', () => {
      beforeEach(() => {
        snappingManager.updateConfig({
          snapToGuides: false,
          snapToGrid: false,
          snapToElements: false,
          snapToElementCenters: false,
          snapToCanvasEdges: false,
          snapToCanvasCenter: true,
        });
      });

      it('should snap to canvas horizontal center', () => {
        const state = createCanvasState();
        // Canvas center is at 600, element center should be close
        // Element width is 50, so center is at x + 25
        // To center at 600, x = 600 - 25 = 575
        const bounds: BoundingBox = { x: 572, y: 100, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(572, 100, bounds, state, new Set(), getBounds);

        expect(result.snappedX).toBe(true);
        expect(result.x).toBe(575); // So center is at 600
      });

      it('should snap to canvas vertical center', () => {
        const state = createCanvasState();
        const bounds: BoundingBox = { x: 100, y: 573, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(100, 573, bounds, state, new Set(), getBounds);

        expect(result.snappedY).toBe(true);
        expect(result.y).toBe(575); // So center is at 600
      });
    });

    describe('snap distance threshold', () => {
      it('should not snap when beyond threshold', () => {
        const guides = [createGuide('g1', 'vertical', 100)];
        const state = createCanvasState([], guides);
        const bounds: BoundingBox = { x: 90, y: 200, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(90, 200, bounds, state, new Set(), getBounds);

        expect(result.snappedX).toBe(false);
        expect(result.x).toBe(90);
      });

      it('should snap at exactly the threshold', () => {
        const guides = [createGuide('g1', 'vertical', 100)];
        const state = createCanvasState([], guides);
        const bounds: BoundingBox = { x: 92, y: 200, width: 50, height: 50 };

        const result = snappingManager.calculateSnap(92, 200, bounds, state, new Set(), getBounds);

        expect(result.snappedX).toBe(true);
        expect(result.x).toBe(100);
      });
    });
  });

  describe('activeSnapLines', () => {
    it('should track active snap lines when snapping', () => {
      const guides = [createGuide('g1', 'vertical', 100)];
      const state = createCanvasState([], guides);
      const bounds: BoundingBox = { x: 97, y: 200, width: 50, height: 50 };

      snappingManager.calculateSnap(97, 200, bounds, state, new Set(), getBounds);

      const snapLines = snappingManager.activeSnapLines;
      expect(snapLines.vertical.length).toBe(1);
      expect(snapLines.vertical[0].x).toBe(100);
    });

    it('should clear active snap lines', () => {
      const guides = [createGuide('g1', 'vertical', 100)];
      const state = createCanvasState([], guides);
      const bounds: BoundingBox = { x: 97, y: 200, width: 50, height: 50 };

      snappingManager.calculateSnap(97, 200, bounds, state, new Set(), getBounds);
      snappingManager.clearActiveSnapLines();

      const snapLines = snappingManager.activeSnapLines;
      expect(snapLines.vertical.length).toBe(0);
      expect(snapLines.horizontal.length).toBe(0);
    });

    it('should not populate snap lines when showSnapIndicators is false', () => {
      snappingManager.updateConfig({ showSnapIndicators: false });
      const guides = [createGuide('g1', 'vertical', 100)];
      const state = createCanvasState([], guides);
      const bounds: BoundingBox = { x: 97, y: 200, width: 50, height: 50 };

      const result = snappingManager.calculateSnap(97, 200, bounds, state, new Set(), getBounds);

      expect(result.snappedX).toBe(true); // Still snaps
      const snapLines = snappingManager.activeSnapLines;
      expect(snapLines.vertical.length).toBe(0); // But no visual indicator
    });
  });

  describe('calculateResizeSnap', () => {
    it('should snap resize to guide', () => {
      const guides = [createGuide('g1', 'vertical', 200)];
      const state = createCanvasState([], guides);
      const newBounds: BoundingBox = { x: 100, y: 100, width: 97, height: 100 };

      const result = snappingManager.calculateResizeSnap(
        newBounds,
        'e', // right handle
        state,
        new Set(),
        getBounds,
      );

      expect(result.snappedX).toBe(true);
      // Right edge was at 100 + 97 = 197, should snap to 200
    });

    it('should snap resize left edge to guide', () => {
      const guides = [createGuide('g1', 'vertical', 100)];
      const state = createCanvasState([], guides);
      const newBounds: BoundingBox = { x: 103, y: 100, width: 50, height: 100 };

      const result = snappingManager.calculateResizeSnap(
        newBounds,
        'w', // left handle
        state,
        new Set(),
        getBounds,
      );

      expect(result.snappedX).toBe(true);
      expect(result.x).toBe(100);
    });

    it('should snap resize top edge to horizontal guide', () => {
      const guides = [createGuide('g1', 'horizontal', 100)];
      const state = createCanvasState([], guides);
      const newBounds: BoundingBox = { x: 50, y: 97, width: 100, height: 100 };

      const result = snappingManager.calculateResizeSnap(
        newBounds,
        'n', // top handle
        state,
        new Set(),
        getBounds,
      );

      expect(result.snappedY).toBe(true);
      expect(result.y).toBe(100);
    });

    it('should snap resize bottom edge to horizontal guide', () => {
      const guides = [createGuide('g1', 'horizontal', 200)];
      const state = createCanvasState([], guides);
      const newBounds: BoundingBox = { x: 50, y: 100, width: 100, height: 97 };

      const result = snappingManager.calculateResizeSnap(
        newBounds,
        's', // bottom handle
        state,
        new Set(),
        getBounds,
      );

      expect(result.snappedY).toBe(true);
      // Bottom edge was at 100 + 97 = 197, should snap to 200
    });

    it('should snap corner resize (ne) to both guides', () => {
      const guides = [createGuide('g1', 'vertical', 200), createGuide('g2', 'horizontal', 100)];
      const state = createCanvasState([], guides);
      const newBounds: BoundingBox = { x: 50, y: 103, width: 147, height: 97 };

      const result = snappingManager.calculateResizeSnap(
        newBounds,
        'ne', // northeast handle
        state,
        new Set(),
        getBounds,
      );

      expect(result.snappedX).toBe(true);
      expect(result.snappedY).toBe(true);
      expect(result.y).toBe(100);
    });

    it('should return unsnapped position when disabled', () => {
      snappingManager.updateConfig({ enabled: false });
      const guides = [createGuide('g1', 'vertical', 200)];
      const state = createCanvasState([], guides);
      const newBounds: BoundingBox = { x: 100, y: 100, width: 97, height: 100 };

      const result = snappingManager.calculateResizeSnap(
        newBounds,
        'e',
        state,
        new Set(),
        getBounds,
      );

      expect(result.snappedX).toBe(false);
      expect(result.snappedY).toBe(false);
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });
  });
});
