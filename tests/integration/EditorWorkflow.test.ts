/**
 * Integration tests for complete editor workflows
 * Validates end-to-end editing scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SVGComposer } from '../../src/core/SVGComposer.js';
import type { Transform } from '../../src/core/types.js';
import type { ImageElement, TextElement, ShapeElement } from '../../src/elements/types.js';
import { blur, dropShadow, grayscale } from '../../src/filters/EffectPresets.js';

// Helper to create test transforms
function createTestTransform(overrides?: Partial<Transform>): Transform {
  return {
    x: 100,
    y: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    ...overrides,
  };
}

// Helper to create test image element data
function createTestImageElement(
  overrides?: Partial<Omit<ImageElement, 'id'>>,
): Omit<ImageElement, 'id'> {
  return {
    type: 'image',
    src: 'test.jpg',
    width: 200,
    height: 150,
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    ...overrides,
  };
}

// Helper to create test text element data
function createTestTextElement(
  overrides?: Partial<Omit<TextElement, 'id'>>,
): Omit<TextElement, 'id'> {
  return {
    type: 'text',
    content: 'Hello World',
    fontSize: 24,
    fontFamily: 'Arial, sans-serif',
    fill: '#333333',
    textAnchor: 'start',
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    ...overrides,
  };
}

// Helper to create test shape element data
function createTestRect(
  x: number,
  y: number,
  width: number,
  height: number,
): Omit<ShapeElement, 'id'> {
  return {
    type: 'shape',
    shapeType: 'rect',
    width,
    height,
    rx: 0,
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 1,
    transform: createTestTransform({ x, y }),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
  };
}

describe('Editor Workflow Integration', () => {
  let container: HTMLDivElement;
  let editor: SVGComposer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    editor = new SVGComposer(container, {
      width: 1200,
      height: 1200,
      backgroundColor: '#ffffff',
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ============================================================
  // Complete Editing Workflow
  // ============================================================

  describe('Complete Editing Workflow', () => {
    it('should support a complete photo card editing workflow', () => {
      // 1. Add background image
      const bgId = editor.addElement(
        createTestImageElement({
          src: 'background.jpg',
          width: 1200,
          height: 1200,
          transform: createTestTransform({ x: 0, y: 0 }),
          zIndex: 0,
        }),
      );

      // 2. Add photo with circular crop
      const photoId = editor.addElement(
        createTestImageElement({
          src: 'photo.jpg',
          width: 400,
          height: 400,
          transform: createTestTransform({ x: 400, y: 200 }),
          zIndex: 1,
        }),
      );

      editor.addClipPath(photoId, {
        type: 'circle',
        cx: 200,
        cy: 200,
        r: 180,
      });

      // 3. Add drop shadow effect
      editor.addEffect(
        photoId,
        dropShadow({
          offsetX: 5,
          offsetY: 5,
          blur: 15,
          color: 'rgba(0,0,0,0.5)',
        }),
      );

      // 4. Add title text
      const titleId = editor.addElement(
        createTestTextElement({
          content: 'Summer Memories',
          fontSize: 48,
          fontFamily: 'Georgia, serif',
          fill: '#ffffff',
          textAnchor: 'middle',
          transform: createTestTransform({ x: 600, y: 650 }),
          zIndex: 2,
        }),
      );

      // 5. Add decorative shape
      const shapeId = editor.addElement({
        type: 'shape',
        shapeType: 'rect',
        width: 800,
        height: 4,
        rx: 2,
        fill: '#ffffff',
        stroke: 'none',
        strokeWidth: 0,
        transform: createTestTransform({ x: 200, y: 700 }),
        opacity: 0.8,
        zIndex: 2,
        locked: false,
        visible: true,
      });

      // Verify all elements are created
      expect(editor.getAllElements().length).toBe(4);

      // 6. Export SVG
      const svg = editor.toSVG();

      expect(svg).toContain('background.jpg');
      expect(svg).toContain('photo.jpg');
      expect(svg).toContain('Summer Memories');
      expect(svg).toContain('<clipPath');
      expect(svg).toContain('feDropShadow');

      // 7. Export JSON and verify roundtrip
      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      // Elements is an object keyed by ID, not an array
      expect(Object.keys(parsed.elements).length).toBe(4);
    });

    it('should support a logo design workflow', () => {
      // 1. Add text elements
      const mainTextId = editor.addElement(
        createTestTextElement({
          content: 'COMPANY',
          fontSize: 72,
          fontFamily: 'Helvetica, sans-serif',
          fill: '#2c3e50',
          textAnchor: 'middle',
          transform: createTestTransform({ x: 600, y: 550 }),
        }),
      );

      const taglineId = editor.addElement(
        createTestTextElement({
          content: 'Innovation • Excellence • Growth',
          fontSize: 18,
          fontFamily: 'Helvetica, sans-serif',
          fill: '#7f8c8d',
          textAnchor: 'middle',
          transform: createTestTransform({ x: 600, y: 620 }),
        }),
      );

      // 2. Add icon shape
      const iconId = editor.addElement({
        type: 'shape',
        shapeType: 'circle',
        r: 60,
        fill: '#3498db',
        stroke: 'none',
        strokeWidth: 0,
        transform: createTestTransform({ x: 600, y: 450 }),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      // 3. Create group with all elements
      const groupId = editor.createGroup([mainTextId, taglineId, iconId]);

      // 4. Move the entire logo
      editor.setPosition(groupId, 600, 600);

      // 5. Export and verify
      const svg = editor.toSVG();

      expect(svg).toContain('COMPANY');
      expect(svg).toContain('Innovation');
      expect(svg).toContain('<circle');
      expect(svg).toContain('<g');
    });
  });

  // ============================================================
  // Selection and Multi-Element Operations
  // ============================================================

  describe('Selection and Multi-Element Operations', () => {
    it('should support selecting and moving multiple elements', () => {
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 100, 50, 50));
      const id3 = editor.addElement(createTestRect(300, 100, 50, 50));

      // Select all three
      editor.select([id1, id2, id3]);

      expect(editor.getSelected().length).toBe(3);

      // Move each element
      editor.moveElement(id1, 50, 50);
      editor.moveElement(id2, 50, 50);
      editor.moveElement(id3, 50, 50);

      // Verify positions
      expect(editor.getElement(id1)?.transform.x).toBe(150);
      expect(editor.getElement(id2)?.transform.x).toBe(250);
      expect(editor.getElement(id3)?.transform.x).toBe(350);
    });

    it('should support align then distribute workflow', () => {
      const id1 = editor.addElement(createTestRect(100, 50, 50, 50));
      const id2 = editor.addElement(createTestRect(200, 150, 50, 50));
      const id3 = editor.addElement(createTestRect(300, 250, 50, 50));
      const id4 = editor.addElement(createTestRect(400, 100, 50, 50));

      // 1. Align all to top
      editor.alignTop([id1, id2, id3, id4]);

      // All should have same y
      const elements = [id1, id2, id3, id4].map((id) => editor.getElement(id));
      const yValues = elements.map((e) => e?.transform.y);
      expect(new Set(yValues).size).toBe(1);

      // 2. Distribute horizontally
      editor.distributeHorizontal([id1, id2, id3, id4]);

      // Elements should be evenly spaced
      const xValues = [id1, id2, id3, id4]
        .map((id) => editor.getElement(id)?.transform.x ?? 0)
        .sort((a, b) => a - b);

      const gaps = [xValues[1] - xValues[0], xValues[2] - xValues[1], xValues[3] - xValues[2]];

      expect(gaps[0]).toBeCloseTo(gaps[1], 1);
      expect(gaps[1]).toBeCloseTo(gaps[2], 1);
    });
  });

  // ============================================================
  // History and Undo/Redo Workflow
  // ============================================================

  describe('History and Undo/Redo Workflow', () => {
    it('should support complex undo/redo sequence', () => {
      // Start with empty canvas
      expect(editor.getAllElements().length).toBe(0);

      // Add element 1
      const id1 = editor.addElement(createTestRect(100, 100, 50, 50));
      expect(editor.getAllElements().length).toBe(1);

      // Add element 2
      const id2 = editor.addElement(createTestRect(200, 100, 50, 50));
      expect(editor.getAllElements().length).toBe(2);

      // Move element 1
      editor.moveElement(id1, 50, 0);
      expect(editor.getElement(id1)?.transform.x).toBe(150);

      // Undo move
      editor.undo();
      expect(editor.getElement(id1)?.transform.x).toBe(100);

      // Undo add element 2
      editor.undo();
      expect(editor.getAllElements().length).toBe(1);

      // Redo add element 2
      editor.redo();
      expect(editor.getAllElements().length).toBe(2);

      // Redo move
      editor.redo();
      expect(editor.getElement(id1)?.transform.x).toBe(150);
    });

    it('should track history across different operation types', () => {
      const imageId = editor.addElement(createTestImageElement());

      // Move
      editor.moveElement(imageId, 100, 0);

      // Rotate
      editor.rotateElement(imageId, 45);

      // Scale
      editor.scaleElement(imageId, 1.5, 1.5);

      // Add filter
      editor.addEffect(imageId, blur(5));

      // Undo all
      editor.undo(); // undo filter
      editor.undo(); // undo scale
      editor.undo(); // undo rotate
      editor.undo(); // undo move

      const element = editor.getElement(imageId);
      expect(element?.transform.x).toBe(100); // Original position
      expect(element?.transform.rotation).toBe(0);
      expect(element?.transform.scaleX).toBe(1);
    });
  });

  // ============================================================
  // Z-Order Management
  // ============================================================

  describe('Z-Order Management', () => {
    it('should manage z-order correctly through operations', () => {
      // Create elements with different zIndex values
      const bottom = editor.addElement({
        ...createTestRect(100, 100, 100, 100),
        zIndex: 1,
      });
      const middle = editor.addElement({
        ...createTestRect(150, 150, 100, 100),
        zIndex: 2,
      });
      const top = editor.addElement({
        ...createTestRect(200, 200, 100, 100),
        zIndex: 3,
      });

      // Verify initial z-order
      let bottomEl = editor.getElement(bottom);
      let topEl = editor.getElement(top);
      expect(bottomEl!.zIndex).toBeLessThan(topEl!.zIndex);

      // Bring bottom to front - should now have highest zIndex
      editor.bringToFront(bottom);

      bottomEl = editor.getElement(bottom);
      topEl = editor.getElement(top);
      expect(bottomEl!.zIndex).toBeGreaterThanOrEqual(topEl!.zIndex);

      // Send it back - should now have lowest zIndex
      editor.sendToBack(bottom);

      bottomEl = editor.getElement(bottom);
      const middleEl = editor.getElement(middle);
      expect(bottomEl!.zIndex).toBeLessThanOrEqual(middleEl!.zIndex);
    });
  });

  // ============================================================
  // Group Operations Workflow
  // ============================================================

  describe('Group Operations Workflow', () => {
    it('should support group, transform, and ungroup workflow', () => {
      // Create elements
      const rect1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const rect2 = editor.addElement(createTestRect(200, 100, 50, 50));
      const rect3 = editor.addElement(createTestRect(150, 200, 50, 50));

      // Group them
      const groupId = editor.createGroup([rect1, rect2, rect3]);

      expect(editor.getElement(groupId)?.type).toBe('group');

      // Move the group
      editor.moveElement(groupId, 100, 100);

      // Ungroup
      editor.ungroup(groupId);

      // Group should no longer exist
      expect(editor.getElement(groupId)).toBeUndefined();

      // Original elements should still exist and be accessible
      expect(editor.getElement(rect1)).toBeDefined();
      expect(editor.getElement(rect2)).toBeDefined();
      expect(editor.getElement(rect3)).toBeDefined();
    });

    it('should support nested groups', () => {
      const rect1 = editor.addElement(createTestRect(100, 100, 50, 50));
      const rect2 = editor.addElement(createTestRect(200, 100, 50, 50));
      const rect3 = editor.addElement(createTestRect(300, 100, 50, 50));
      const rect4 = editor.addElement(createTestRect(400, 100, 50, 50));

      // Create inner groups
      const innerGroup1 = editor.createGroup([rect1, rect2]);
      const innerGroup2 = editor.createGroup([rect3, rect4]);

      // Create outer group
      const outerGroup = editor.createGroup([innerGroup1, innerGroup2]);

      expect(editor.getElement(outerGroup)?.type).toBe('group');

      // Transform outer group
      editor.rotateElement(outerGroup, 30);

      const svg = editor.toSVG();
      expect(svg).toContain('<g');
      expect(svg).toContain('rotate(30)');
    });
  });

  // ============================================================
  // Filter Workflow
  // ============================================================

  describe('Filter Workflow', () => {
    it('should support adding and modifying multiple filters', () => {
      const imageId = editor.addElement(createTestImageElement());

      // Add blur
      editor.addEffect(imageId, blur(3));

      // Add grayscale
      editor.addEffect(imageId, grayscale());

      // Add drop shadow
      editor.addEffect(imageId, dropShadow({ offsetX: 5, offsetY: 5, blur: 10, color: '#000000' }));

      // Verify filters are applied
      expect(editor.hasFilters(imageId)).toBe(true);
      expect(editor.getElementFilters(imageId).length).toBe(3);

      // Export and verify
      const svg = editor.toSVG();
      expect(svg).toContain('<filter');

      // Clear filters
      editor.clearFilters(imageId);
      expect(editor.hasFilters(imageId)).toBe(false);
    });
  });

  // ============================================================
  // Guides and Snapping Workflow
  // ============================================================

  describe('Guides and Snapping Workflow', () => {
    it('should support setting up guides and snapping config', () => {
      // Add guides for common alignments
      editor.addHorizontalGuide(600); // Center horizontal
      editor.addVerticalGuide(600); // Center vertical
      editor.addHorizontalGuide(100); // Top margin
      editor.addHorizontalGuide(1100); // Bottom margin
      editor.addVerticalGuide(100); // Left margin
      editor.addVerticalGuide(1100); // Right margin

      expect(editor.getGuides().length).toBe(6);

      // Configure snapping
      editor.setSnappingConfig({
        snapToGuides: true,
        snapToGrid: true,
        gridSize: 25,
        snapDistance: 10,
        snapToElements: true,
      });

      const config = editor.getSnappingConfig();
      expect(config.snapToGuides).toBe(true);
      expect(config.gridSize).toBe(25);

      // Add element (snapping would apply during interaction)
      const elementId = editor.addElement(createTestRect(100, 100, 50, 50));

      // Verify element exists
      expect(editor.getElement(elementId)).toBeDefined();
    });
  });

  // ============================================================
  // Complete Export Workflow
  // ============================================================

  describe('Complete Export Workflow', () => {
    it('should export complete design as SVG', () => {
      // Build a complete design
      editor.addElement(
        createTestImageElement({
          src: 'background.jpg',
          width: 1200,
          height: 1200,
          transform: createTestTransform({ x: 0, y: 0 }),
          zIndex: 0,
        }),
      );

      const photoId = editor.addElement(
        createTestImageElement({
          src: 'photo.jpg',
          width: 300,
          height: 300,
          transform: createTestTransform({ x: 450, y: 300 }),
          zIndex: 1,
        }),
      );

      editor.addClipPath(photoId, {
        type: 'circle',
        cx: 150,
        cy: 150,
        r: 140,
      });

      editor.addEffect(
        photoId,
        dropShadow({
          offsetX: 0,
          offsetY: 10,
          blur: 30,
          color: 'rgba(0,0,0,0.3)',
        }),
      );

      editor.addElement(
        createTestTextElement({
          content: 'Welcome',
          fontSize: 64,
          fontFamily: 'Georgia, serif',
          fill: '#ffffff',
          textAnchor: 'middle',
          transform: createTestTransform({ x: 600, y: 700 }),
          zIndex: 2,
        }),
      );

      // Export SVG
      const svg = editor.toSVG();

      // Verify SVG structure
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox="0 0 1200 1200"');
      expect(svg).toContain('<defs>');
      expect(svg).toContain('<clipPath');
      expect(svg).toContain('<filter');
      expect(svg).toContain('<image');
      expect(svg).toContain('<text');
      expect(svg).toContain('Welcome');

      // Verify it's valid SVG
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
    });

    it('should export and restore state via JSON', () => {
      // Create complex design
      const bgId = editor.addElement(createTestImageElement({ src: 'bg.jpg' }));
      const textId = editor.addElement(createTestTextElement({ content: 'Test' }));
      const shapeId = editor.addElement(createTestRect(500, 500, 100, 100));

      editor.addEffect(bgId, grayscale());
      editor.addHorizontalGuide(600);

      // Export JSON
      const json = editor.toJSON();

      // Create new editor and restore
      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);

      editor2.fromJSON(json);

      // Verify all elements restored
      expect(editor2.getAllElements().length).toBe(3);
      expect(editor2.getGuides().length).toBe(1);

      // Export SVG from restored editor should contain same elements
      // (filter IDs may differ since they're regenerated)
      const svg2 = editor2.toSVG();

      expect(svg2).toContain('bg.jpg');
      expect(svg2).toContain('Test');
      expect(svg2).toContain('<filter');
      expect(svg2).toContain('feColorMatrix');

      document.body.removeChild(container2);
    });
  });

  // ============================================================
  // Event Handling Workflow
  // ============================================================

  describe('Event Handling Workflow', () => {
    it('should emit events throughout editing workflow', () => {
      const events: string[] = [];

      editor.on('element:added', () => events.push('element:added'));
      editor.on('element:updated', () => events.push('element:updated'));
      editor.on('element:removed', () => events.push('element:removed'));
      editor.on('selection:changed', () => events.push('selection:changed'));
      editor.on('state:changed', () => events.push('state:changed'));

      // Add element
      const id = editor.addElement(createTestRect(100, 100, 50, 50));
      expect(events).toContain('element:added');
      expect(events).toContain('state:changed');

      events.length = 0;

      // Select element
      editor.select(id);
      expect(events).toContain('selection:changed');

      events.length = 0;

      // Update element
      editor.moveElement(id, 50, 50);
      expect(events).toContain('element:updated');
      expect(events).toContain('state:changed');

      events.length = 0;

      // Remove element
      editor.removeElement(id);
      expect(events).toContain('element:removed');
      expect(events).toContain('state:changed');
    });
  });

  // ============================================================
  // Lifecycle Workflow
  // ============================================================

  describe('Lifecycle Workflow', () => {
    it('should properly destroy editor', () => {
      const id = editor.addElement(createTestRect(100, 100, 50, 50));
      expect(editor.getAllElements().length).toBe(1);
      expect(editor.isDestroyed).toBe(false);

      editor.destroy();

      expect(editor.isDestroyed).toBe(true);
    });

    it('should support clear and restart workflow', () => {
      // Add elements
      editor.addElement(createTestImageElement());
      editor.addElement(createTestTextElement());
      editor.addHorizontalGuide(600);

      expect(editor.getAllElements().length).toBe(2);
      expect(editor.getGuides().length).toBe(1);

      // Clear everything
      editor.clear();
      editor.clearGuides();

      expect(editor.getAllElements().length).toBe(0);
      expect(editor.getGuides().length).toBe(0);

      // Start fresh
      editor.addElement(createTestRect(100, 100, 100, 100));
      expect(editor.getAllElements().length).toBe(1);
    });
  });

  // ============================================================
  // Error Handling
  // ============================================================

  describe('Error Handling', () => {
    it('should throw on invalid element ID', () => {
      expect(() => editor.removeElement('non-existent')).toThrow();
    });

    it('should not throw on valid operations', () => {
      const id = editor.addElement(createTestRect(100, 100, 50, 50));

      expect(() => editor.moveElement(id, 100, 100)).not.toThrow();
      expect(() => editor.rotateElement(id, 45)).not.toThrow();
      expect(() => editor.scaleElement(id, 2, 2)).not.toThrow();
      expect(() => editor.removeElement(id)).not.toThrow();
    });
  });
});
