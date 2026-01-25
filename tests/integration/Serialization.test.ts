/**
 * Integration tests for JSON serialization
 * Validates that toJSON/fromJSON roundtrip preserves state integrity
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SVGComposer } from '../../src/core/SVGComposer.js';
import type { Transform } from '../../src/core/types.js';
import type { ImageElement, TextElement, ShapeElement } from '../../src/elements/types.js';
import { blur, grayscale } from '../../src/filters/EffectPresets.js';

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
function createTestShapeElement(
  shapeType: 'rect' | 'circle' | 'ellipse' | 'path',
  overrides?: Partial<Omit<ShapeElement, 'id' | 'type'>>,
): Omit<ShapeElement, 'id'> {
  const base = {
    type: 'shape' as const,
    shapeType,
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 2,
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
  };

  switch (shapeType) {
    case 'rect':
      return { ...base, width: 100, height: 80, rx: 0, ...overrides };
    case 'circle':
      return { ...base, r: 50, ...overrides };
    case 'ellipse':
      return { ...base, rx: 60, ry: 40, ...overrides };
    case 'path':
      return { ...base, path: 'M 0 0 L 100 0 L 50 100 Z', ...overrides };
    default:
      return { ...base, ...overrides };
  }
}

describe('Serialization Integration', () => {
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
  // Basic Serialization
  // ============================================================

  describe('Basic Serialization', () => {
    it('should produce valid JSON from toJSON', () => {
      editor.addElement(createTestImageElement());

      const json = editor.toJSON();

      expect(() => {
        JSON.parse(json);
      }).not.toThrow();
    });

    it('should serialize empty canvas', () => {
      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed).toBeDefined();
      expect(parsed.width).toBe(1200);
      expect(parsed.height).toBe(1200);
    });

    it('should serialize canvas dimensions', () => {
      const customEditor = new SVGComposer(container, {
        width: 800,
        height: 600,
      });

      const json = customEditor.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.width).toBe(800);
      expect(parsed.height).toBe(600);
    });

    it('should serialize background color', () => {
      const customEditor = new SVGComposer(container, {
        backgroundColor: '#f0f0f0',
      });

      const json = customEditor.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.backgroundColor).toBe('#f0f0f0');
    });
  });

  // ============================================================
  // Element Serialization
  // ============================================================

  describe('Element Serialization', () => {
    it('should serialize image element', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          src: 'photo.jpg',
          width: 400,
          height: 300,
        }),
      );

      const json = editor.toJSON();
      const parsed = JSON.parse(json) as {
        elements?: Record<
          string,
          {
            id: string;
            type: string;
            src?: string;
            width?: number;
            height?: number;
          }
        >;
      };

      // Elements are stored as an object keyed by ID
      const elements = Object.values(parsed.elements ?? {});
      expect(elements.length).toBe(1);

      const element = elements[0];
      expect(element.id).toBe(elementId);
      expect(element.type).toBe('image');
      expect(element.src).toBe('photo.jpg');
      expect(element.width).toBe(400);
      expect(element.height).toBe(300);
    });

    it('should serialize text element', () => {
      const elementId = editor.addElement(
        createTestTextElement({
          content: 'Test Caption',
          fontSize: 32,
          fontFamily: 'Georgia, serif',
          fill: '#0000ff',
          textAnchor: 'middle',
        }),
      );

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      // Elements are stored as an object keyed by ID
      const element = parsed.elements[elementId];

      expect(element.type).toBe('text');
      expect(element.content).toBe('Test Caption');
      expect(element.fontSize).toBe(32);
      expect(element.fontFamily).toBe('Georgia, serif');
      expect(element.fill).toBe('#0000ff');
      expect(element.textAnchor).toBe('middle');
    });

    it('should serialize shape element', () => {
      const elementId = editor.addElement(
        createTestShapeElement('rect', {
          width: 200,
          height: 150,
          rx: 10,
          fill: '#00ff00',
          stroke: '#333333',
          strokeWidth: 3,
        }),
      );

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      // Elements are stored as an object keyed by ID
      const element = parsed.elements[elementId];

      expect(element.type).toBe('shape');
      expect(element.shapeType).toBe('rect');
      expect(element.width).toBe(200);
      expect(element.height).toBe(150);
      expect(element.rx).toBe(10);
    });

    it('should serialize multiple elements', () => {
      editor.addElement(createTestImageElement());
      editor.addElement(createTestTextElement());
      editor.addElement(createTestShapeElement('circle'));

      const json = editor.toJSON();
      const parsed = JSON.parse(json) as { elements?: Record<string, unknown> };

      const elements = Object.values(parsed.elements ?? {});
      expect(elements.length).toBe(3);
    });
  });

  // ============================================================
  // Transform Serialization
  // ============================================================

  describe('Transform Serialization', () => {
    it('should serialize element transforms', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          transform: createTestTransform({
            x: 300,
            y: 200,
            rotation: 45,
            scaleX: 1.5,
            scaleY: 2,
          }),
        }),
      );

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      // Elements are stored as an object keyed by ID
      const element = parsed.elements[elementId];

      expect(element.transform.x).toBe(300);
      expect(element.transform.y).toBe(200);
      expect(element.transform.rotation).toBe(45);
      expect(element.transform.scaleX).toBe(1.5);
      expect(element.transform.scaleY).toBe(2);
    });

    it('should serialize negative transform values', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          transform: createTestTransform({
            x: -100,
            y: -50,
            rotation: -45,
            scaleX: -1,
            scaleY: 1,
          }),
        }),
      );

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      // Elements are stored as an object keyed by ID
      const element = parsed.elements[elementId];

      expect(element.transform.x).toBe(-100);
      expect(element.transform.y).toBe(-50);
      expect(element.transform.rotation).toBe(-45);
      expect(element.transform.scaleX).toBe(-1);
    });
  });

  // ============================================================
  // JSON Roundtrip
  // ============================================================

  describe('JSON Roundtrip', () => {
    it('should restore canvas state from JSON', () => {
      editor.addElement(createTestImageElement({ src: 'photo.jpg' }));
      editor.addElement(createTestTextElement({ content: 'Caption' }));

      const json = editor.toJSON();

      // Create new editor and restore
      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);

      editor2.fromJSON(json);

      const elements = editor2.getAllElements();
      expect(elements.length).toBe(2);

      editor2.destroy();
      document.body.removeChild(container2);
    });

    it('should preserve element IDs through roundtrip', () => {
      const id1 = editor.addElement(createTestImageElement());
      const id2 = editor.addElement(createTestTextElement());

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);

      editor2.fromJSON(json);

      expect(editor2.getElement(id1)).toBeDefined();
      expect(editor2.getElement(id2)).toBeDefined();

      editor2.destroy();
      document.body.removeChild(container2);
    });

    it('should preserve element properties through roundtrip', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          src: 'test.jpg',
          width: 400,
          height: 300,
          opacity: 0.8,
          zIndex: 5,
          locked: true,
          visible: true,
          transform: createTestTransform({
            x: 250,
            y: 175,
            rotation: 30,
            scaleX: 1.25,
            scaleY: 1.25,
          }),
        }),
      );

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);

      editor2.fromJSON(json);

      const element = editor2.getElement(elementId) as ImageElement;

      expect(element.src).toBe('test.jpg');
      expect(element.width).toBe(400);
      expect(element.height).toBe(300);
      expect(element.opacity).toBe(0.8);
      expect(element.zIndex).toBe(5);
      expect(element.locked).toBe(true);
      expect(element.transform.x).toBe(250);
      expect(element.transform.y).toBe(175);
      expect(element.transform.rotation).toBe(30);
      expect(element.transform.scaleX).toBe(1.25);

      editor2.destroy();
      document.body.removeChild(container2);
    });

    it('should produce identical SVG after roundtrip', () => {
      editor.addElement(
        createTestImageElement({
          src: 'photo.jpg',
          transform: createTestTransform({ x: 100, y: 100, rotation: 45 }),
        }),
      );
      editor.addElement(
        createTestTextElement({
          content: 'Hello',
          transform: createTestTransform({ x: 200, y: 50 }),
        }),
      );

      const svgBefore = editor.toSVG();
      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);

      editor2.fromJSON(json);

      const svgAfter = editor2.toSVG();

      // SVGs should be equivalent (minor whitespace differences OK)
      expect(svgAfter).toBe(svgBefore);

      editor2.destroy();
      document.body.removeChild(container2);
    });
  });

  // ============================================================
  // Group Serialization
  // ============================================================

  describe('Group Serialization', () => {
    it('should serialize groups with children', () => {
      const child1 = editor.addElement(createTestImageElement({ src: 'img1.jpg' }));
      const child2 = editor.addElement(createTestTextElement({ content: 'Label' }));
      const groupId = editor.createGroup([child1, child2]);

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      // Elements are stored as an object keyed by ID
      const group = parsed.elements[groupId];

      expect(group).toBeDefined();
      expect(group.type).toBe('group');
      expect(group.children).toContain(child1);
      expect(group.children).toContain(child2);
    });

    it('should preserve group structure through roundtrip', () => {
      const child1 = editor.addElement(createTestImageElement());
      const child2 = editor.addElement(createTestTextElement());
      const groupId = editor.createGroup([child1, child2]);

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);

      editor2.fromJSON(json);

      const group = editor2.getElement(groupId);
      expect(group).toBeDefined();
      expect(group?.type).toBe('group');

      editor2.destroy();
      document.body.removeChild(container2);
    });
  });

  // ============================================================
  // Guide Serialization
  // ============================================================

  describe('Guide Serialization', () => {
    it('should serialize guides', () => {
      editor.addHorizontalGuide(100);
      editor.addVerticalGuide(200);

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.guides).toBeDefined();
      expect(parsed.guides.length).toBe(2);
    });

    it('should preserve guide properties through roundtrip', () => {
      const guideId = editor.addHorizontalGuide(150, { locked: true, color: '#ff0000' });

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);

      editor2.fromJSON(json);

      const guide = editor2.getGuide(guideId);
      expect(guide).toBeDefined();
      expect(guide?.position).toBe(150);
      expect(guide?.orientation).toBe('horizontal');
      expect(guide?.locked).toBe(true);

      editor2.destroy();
      document.body.removeChild(container2);
    });
  });

  // ============================================================
  // Clip Path Serialization
  // ============================================================

  describe('Clip Path Serialization', () => {
    it('should serialize clip paths', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'circle',
        cx: 100,
        cy: 75,
        r: 50,
      });

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      // Elements are stored as an object keyed by ID
      const element = parsed.elements[elementId];

      expect(element.clipPath).toBeDefined();
    });

    it('should preserve clip path through roundtrip', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addClipPath(elementId, {
        type: 'rect',
        x: 0,
        y: 0,
        width: 150,
        height: 100,
        rx: 10,
      });

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);

      editor2.fromJSON(json);

      const svg = editor2.toSVG();
      expect(svg).toContain('<clipPath');

      editor2.destroy();
      document.body.removeChild(container2);
    });
  });

  // ============================================================
  // Filter Serialization
  // ============================================================

  describe('Filter Serialization', () => {
    it('should serialize filter effects', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      // Filters should be serialized
      expect(parsed).toBeDefined();
    });

    it('should preserve filters through roundtrip', () => {
      const elementId = editor.addElement(createTestImageElement());
      editor.addEffect(elementId, blur(5));
      editor.addEffect(elementId, grayscale());

      const svgBefore = editor.toSVG();
      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);

      editor2.fromJSON(json);

      const svgAfter = editor2.toSVG();

      // Both should have filter definitions
      expect(svgBefore).toContain('<filter');
      expect(svgAfter).toContain('<filter');

      editor2.destroy();
      document.body.removeChild(container2);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle JSON with missing optional fields', () => {
      const minimalJson = JSON.stringify({
        version: 1,
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        elements: {},
        selectedIds: [],
        guides: [],
      });

      expect(() => {
        editor.fromJSON(minimalJson);
      }).not.toThrow();
    });

    it('should clear existing state when loading JSON', () => {
      editor.addElement(createTestImageElement({ src: 'existing.jpg' }));

      // Elements should be an object keyed by ID, matching the serialization format
      const newJson = JSON.stringify({
        version: 1,
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        elements: {
          'new-element': {
            id: 'new-element',
            type: 'image',
            src: 'new.jpg',
            width: 100,
            height: 100,
            transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1,
            zIndex: 0,
            locked: false,
            visible: true,
          },
        },
        selectedIds: [],
        guides: [],
      });

      editor.fromJSON(newJson);

      const elements = editor.getAllElements();
      expect(elements.length).toBe(1);
      expect((elements[0] as ImageElement).src).toBe('new.jpg');
    });

    it('should handle special characters in text content', () => {
      editor.addElement(
        createTestTextElement({
          content: 'Special: <>&"\' ñ 日本語 🎉',
        }),
      );

      const json = editor.toJSON();

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const editor2 = new SVGComposer(container2);

      editor2.fromJSON(json);

      const elements = editor2.getAllElements();
      const textElement = elements.find((e) => e.type === 'text') as TextElement;

      expect(textElement.content).toBe('Special: <>&"\' ñ 日本語 🎉');

      editor2.destroy();
      document.body.removeChild(container2);
    });

    it('should handle empty string properties', () => {
      const elementId = editor.addElement(
        createTestTextElement({
          content: '',
        }),
      );

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      // Elements are stored as an object keyed by ID
      const textElement = parsed.elements[elementId];

      expect(textElement.content).toBe('');
    });

    it('should handle zero values correctly', () => {
      const elementId = editor.addElement(
        createTestImageElement({
          transform: createTestTransform({
            x: 0,
            y: 0,
            rotation: 0,
            scaleX: 0,
            scaleY: 0,
          }),
          opacity: 0,
          zIndex: 0,
        }),
      );

      const json = editor.toJSON();
      const parsed = JSON.parse(json);

      // Elements are stored as an object keyed by ID
      const element = parsed.elements[elementId];

      expect(element.opacity).toBe(0);
      expect(element.transform.scaleX).toBe(0);
    });
  });

  // ============================================================
  // Clear and Reset
  // ============================================================

  describe('Clear and Reset', () => {
    it('should clear all elements', () => {
      editor.addElement(createTestImageElement());
      editor.addElement(createTestTextElement());
      editor.addElement(createTestShapeElement('rect'));

      editor.clear();

      expect(editor.getAllElements().length).toBe(0);
    });

    it('should clear guides', () => {
      editor.addHorizontalGuide(100);
      editor.addVerticalGuide(200);

      editor.clearGuides();

      expect(editor.getGuides().length).toBe(0);
    });

    it('should produce empty SVG after clear', () => {
      editor.addElement(createTestImageElement());
      editor.clear();

      const svg = editor.toSVG();

      // Should only have background rect, no elements
      const imageMatches = svg.match(/<image/g);
      expect(imageMatches).toBeNull();
    });
  });
});
