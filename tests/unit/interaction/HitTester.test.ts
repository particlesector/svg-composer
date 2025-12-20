import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HitTester } from '../../../src/interaction/HitTester.js';
import type { HandleConfig, ViewportState } from '../../../src/interaction/types.js';
import type { BaseElement, ShapeElement, TextElement } from '../../../src/elements/types.js';
import { CoordinateTransformer } from '../../../src/interaction/CoordinateTransformer.js';

describe('HitTester', () => {
  let hitTester: HitTester;
  let elements: BaseElement[];
  let selection: string[];
  let selectionBounds: { x: number; y: number; width: number; height: number } | null;
  let selectionRotation: number;
  let coordinateTransformer: CoordinateTransformer;
  let handleConfig: HandleConfig;

  const createShapeElement = (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    zIndex = 0,
    rotation = 0,
  ): ShapeElement => ({
    id,
    type: 'shape',
    shapeType: 'rect',
    transform: { x, y, scaleX: 1, scaleY: 1, rotation },
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

  const createCircleElement = (
    id: string,
    cx: number,
    cy: number,
    r: number,
    zIndex = 0,
  ): ShapeElement => ({
    id,
    type: 'shape',
    shapeType: 'circle',
    transform: { x: cx, y: cy, scaleX: 1, scaleY: 1, rotation: 0 },
    opacity: 1,
    zIndex,
    locked: false,
    visible: true,
    fill: '#000',
    stroke: '#000',
    strokeWidth: 1,
    r,
  });

  const createTextElement = (
    id: string,
    x: number,
    y: number,
    fontSize: number,
    content: string,
    zIndex = 0,
  ): TextElement => ({
    id,
    type: 'text',
    transform: { x, y, scaleX: 1, scaleY: 1, rotation: 0 },
    opacity: 1,
    zIndex,
    locked: false,
    visible: true,
    content,
    fontSize,
    fontFamily: 'Arial',
    fill: '#000',
    textAnchor: 'start',
  });

  beforeEach(() => {
    elements = [];
    selection = [];
    selectionBounds = null;
    selectionRotation = 0;

    handleConfig = {
      size: 10,
      fillColor: '#fff',
      strokeColor: '#000',
      rotateHandleOffset: 30,
    };

    // Create mock container
    const container = document.createElement('div');
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

    const viewportState: ViewportState = { panX: 0, panY: 0, zoom: 1 };

    coordinateTransformer = new CoordinateTransformer(container, {
      getViewportState: (): ViewportState => viewportState,
      getCanvasSize: (): { width: number; height: number } => ({ width: 1200, height: 1200 }),
    });

    hitTester = new HitTester({
      getElements: (): BaseElement[] => elements,
      getSelection: (): string[] => selection,
      getSelectionBounds: (): { x: number; y: number; width: number; height: number } | null =>
        selectionBounds,
      getSelectionRotation: (): number => selectionRotation,
      coordinateTransformer,
      handleConfig,
    });
  });

  describe('hitTest', () => {
    it('should return background when no elements exist', () => {
      const result = hitTester.hitTest({ x: 100, y: 100 });

      expect(result.type).toBe('background');
      expect(result.elementId).toBeUndefined();
      expect(result.handleType).toBeUndefined();
    });

    it('should return background when clicking outside all elements', () => {
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];

      const result = hitTester.hitTest({ x: 10, y: 10 });

      expect(result.type).toBe('background');
    });

    it('should hit a rectangle element', () => {
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];

      const result = hitTester.hitTest({ x: 125, y: 125 });

      expect(result.type).toBe('element');
      expect(result.elementId).toBe('rect1');
    });

    it('should hit a circle element', () => {
      elements = [createCircleElement('circle1', 200, 200, 50)];

      const result = hitTester.hitTest({ x: 200, y: 200 });

      expect(result.type).toBe('element');
      expect(result.elementId).toBe('circle1');
    });

    it('should hit a text element', () => {
      elements = [createTextElement('text1', 300, 300, 24, 'Hello')];

      const result = hitTester.hitTest({ x: 310, y: 290 });

      expect(result.type).toBe('element');
      expect(result.elementId).toBe('text1');
    });

    it('should hit topmost element when overlapping (higher z-index)', () => {
      elements = [
        createShapeElement('rect1', 100, 100, 100, 100, 0),
        createShapeElement('rect2', 150, 150, 100, 100, 1),
      ];

      // Point is in overlap area
      const result = hitTester.hitTest({ x: 175, y: 175 });

      expect(result.type).toBe('element');
      expect(result.elementId).toBe('rect2');
    });

    it('should not hit invisible elements', () => {
      const invisibleElement = createShapeElement('rect1', 100, 100, 50, 50);
      invisibleElement.visible = false;
      elements = [invisibleElement];

      const result = hitTester.hitTest({ x: 125, y: 125 });

      expect(result.type).toBe('background');
    });

    it('should hit selection handles when element is selected', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Hit the SE (bottom-right) handle
      const result = hitTester.hitTest({ x: 200, y: 200 });

      expect(result.type).toBe('handle');
      expect(result.handleType).toBe('se');
    });

    it('should hit rotation handle when element is selected', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // Hit the rotation handle (above center of selection)
      // Center is at (150, 100), rotation handle offset is 30 (but converted to viewBox units)
      const rotateOffset = coordinateTransformer.screenDistanceToViewBox(30);
      const result = hitTester.hitTest({ x: 150, y: 100 - rotateOffset });

      expect(result.type).toBe('handle');
      expect(result.handleType).toBe('rotate');
    });

    it('should return element info when hitting a handle for single selection', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      const result = hitTester.hitTest({ x: 200, y: 200 });

      expect(result.type).toBe('handle');
      expect(result.elementId).toBe('rect1');
    });

    it('should prioritize handles over elements', () => {
      elements = [createShapeElement('rect1', 100, 100, 100, 100)];
      selection = ['rect1'];
      selectionBounds = { x: 100, y: 100, width: 100, height: 100 };

      // The corner of the element is also a handle position
      const result = hitTester.hitTest({ x: 100, y: 100 });

      expect(result.type).toBe('handle');
      expect(result.handleType).toBe('nw');
    });
  });

  describe('hitTestElement', () => {
    it('should return null when no elements exist', () => {
      const result = hitTester.hitTestElement({ x: 100, y: 100 });

      expect(result).toBeNull();
    });

    it('should return element id when point is inside element', () => {
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];

      const result = hitTester.hitTestElement({ x: 125, y: 125 });

      expect(result).toBe('rect1');
    });

    it('should return null when point is outside element', () => {
      elements = [createShapeElement('rect1', 100, 100, 50, 50)];

      const result = hitTester.hitTestElement({ x: 10, y: 10 });

      expect(result).toBeNull();
    });

    it('should handle rotated elements', () => {
      // Create a rotated rectangle at (100, 100) with size (100, 50) and 45° rotation
      elements = [createShapeElement('rect1', 100, 100, 100, 50, 0, 45)];

      // The center point (150, 125) should always be inside regardless of rotation
      const result = hitTester.hitTestElement({ x: 150, y: 125 });

      expect(result).toBe('rect1');
    });
  });

  describe('hitTestHandle', () => {
    it('should return null when point is not near any handle', () => {
      const bounds = { x: 100, y: 100, width: 100, height: 100 };

      const result = hitTester.hitTestHandle({ x: 150, y: 150 }, bounds);

      expect(result).toBeNull();
    });

    it('should detect NW handle', () => {
      const bounds = { x: 100, y: 100, width: 100, height: 100 };

      const result = hitTester.hitTestHandle({ x: 100, y: 100 }, bounds);

      expect(result).toBe('nw');
    });

    it('should detect N handle', () => {
      const bounds = { x: 100, y: 100, width: 100, height: 100 };

      const result = hitTester.hitTestHandle({ x: 150, y: 100 }, bounds);

      expect(result).toBe('n');
    });

    it('should detect NE handle', () => {
      const bounds = { x: 100, y: 100, width: 100, height: 100 };

      const result = hitTester.hitTestHandle({ x: 200, y: 100 }, bounds);

      expect(result).toBe('ne');
    });

    it('should detect W handle', () => {
      const bounds = { x: 100, y: 100, width: 100, height: 100 };

      const result = hitTester.hitTestHandle({ x: 100, y: 150 }, bounds);

      expect(result).toBe('w');
    });

    it('should detect E handle', () => {
      const bounds = { x: 100, y: 100, width: 100, height: 100 };

      const result = hitTester.hitTestHandle({ x: 200, y: 150 }, bounds);

      expect(result).toBe('e');
    });

    it('should detect SW handle', () => {
      const bounds = { x: 100, y: 100, width: 100, height: 100 };

      const result = hitTester.hitTestHandle({ x: 100, y: 200 }, bounds);

      expect(result).toBe('sw');
    });

    it('should detect S handle', () => {
      const bounds = { x: 100, y: 100, width: 100, height: 100 };

      const result = hitTester.hitTestHandle({ x: 150, y: 200 }, bounds);

      expect(result).toBe('s');
    });

    it('should detect SE handle', () => {
      const bounds = { x: 100, y: 100, width: 100, height: 100 };

      const result = hitTester.hitTestHandle({ x: 200, y: 200 }, bounds);

      expect(result).toBe('se');
    });

    it('should detect rotate handle', () => {
      const bounds = { x: 100, y: 100, width: 100, height: 100 };
      const rotateOffset = coordinateTransformer.screenDistanceToViewBox(30);

      const result = hitTester.hitTestHandle({ x: 150, y: 100 - rotateOffset }, bounds);

      expect(result).toBe('rotate');
    });
  });

  describe('getElementBounds', () => {
    it('should return bounds for rectangle shape', () => {
      const element = createShapeElement('rect1', 100, 100, 50, 30);

      const bounds = hitTester.getElementBounds(element);

      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBe(100);
      expect(bounds!.y).toBe(100);
      expect(bounds!.width).toBe(50);
      expect(bounds!.height).toBe(30);
    });

    it('should apply scale to bounds', () => {
      const element = createShapeElement('rect1', 100, 100, 50, 30);
      element.transform.scaleX = 2;
      element.transform.scaleY = 3;

      const bounds = hitTester.getElementBounds(element);

      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBe(100); // 50 * 2
      expect(bounds!.height).toBe(90); // 30 * 3
    });

    it('should return bounds for circle shape', () => {
      const element = createCircleElement('circle1', 200, 200, 50);

      const bounds = hitTester.getElementBounds(element);

      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBe(150); // cx - r
      expect(bounds!.y).toBe(150); // cy - r
      expect(bounds!.width).toBe(100); // r * 2
      expect(bounds!.height).toBe(100); // r * 2
    });

    it('should return bounds for text element', () => {
      const element = createTextElement('text1', 100, 100, 24, 'Hello');

      const bounds = hitTester.getElementBounds(element);

      expect(bounds).not.toBeNull();
      // Text bounds are estimated
      expect(bounds!.x).toBe(100);
      expect(bounds!.y).toBeLessThan(100); // Adjusted for baseline
      expect(bounds!.width).toBeGreaterThan(0);
      expect(bounds!.height).toBeGreaterThan(0);
    });

    it('should return null for group element', () => {
      const element: BaseElement = {
        id: 'group1',
        type: 'group',
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
        children: [],
      } as BaseElement;

      const bounds = hitTester.getElementBounds(element);

      expect(bounds).toBeNull();
    });
  });
});
