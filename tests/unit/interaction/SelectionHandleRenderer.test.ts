import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectionHandleRenderer } from '../../../src/interaction/SelectionHandleRenderer.js';
import type { HandleConfig, ViewportState } from '../../../src/interaction/types.js';
import { CoordinateTransformer } from '../../../src/interaction/CoordinateTransformer.js';

describe('SelectionHandleRenderer', () => {
  let svgRoot: SVGSVGElement;
  let handleRenderer: SelectionHandleRenderer;
  let coordinateTransformer: CoordinateTransformer;
  let handleConfig: HandleConfig;

  beforeEach(() => {
    // Create mock SVG root
    svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(svgRoot);

    handleConfig = {
      size: 10,
      fillColor: '#ffffff',
      strokeColor: '#0066ff',
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

    handleRenderer = new SelectionHandleRenderer({
      svgRoot,
      handleConfig,
      coordinateTransformer,
    });
  });

  afterEach(() => {
    handleRenderer.destroy();
    if (svgRoot.parentNode) {
      svgRoot.parentNode.removeChild(svgRoot);
    }
  });

  describe('initialize', () => {
    it('should create overlay group in SVG root', () => {
      handleRenderer.initialize();

      const overlay = svgRoot.querySelector('#svc-selection-overlay');
      expect(overlay).not.toBeNull();
    });

    it('should create selection box element', () => {
      handleRenderer.initialize();

      const selectionBox = svgRoot.querySelector('.svc-selection-box');
      expect(selectionBox).not.toBeNull();
      expect(selectionBox?.tagName.toLowerCase()).toBe('rect');
    });

    it('should create 8 resize handles', () => {
      handleRenderer.initialize();

      const handles = svgRoot.querySelectorAll('[data-handle]');
      const handleTypes = Array.from(handles).map((h) => h.getAttribute('data-handle'));

      expect(handleTypes).toContain('nw');
      expect(handleTypes).toContain('n');
      expect(handleTypes).toContain('ne');
      expect(handleTypes).toContain('w');
      expect(handleTypes).toContain('e');
      expect(handleTypes).toContain('sw');
      expect(handleTypes).toContain('s');
      expect(handleTypes).toContain('se');
    });

    it('should create rotation handle', () => {
      handleRenderer.initialize();

      const rotateHandle = svgRoot.querySelector('[data-handle="rotate"]');
      expect(rotateHandle).not.toBeNull();
    });

    it('should create rotation stem line', () => {
      handleRenderer.initialize();

      const rotateStem = svgRoot.querySelector('.svc-rotate-stem');
      expect(rotateStem).not.toBeNull();
      expect(rotateStem?.tagName.toLowerCase()).toBe('line');
    });

    it('should be idempotent', () => {
      handleRenderer.initialize();
      handleRenderer.initialize();

      const overlays = svgRoot.querySelectorAll('#svc-selection-overlay');
      expect(overlays.length).toBe(1);
    });

    it('should start hidden', () => {
      handleRenderer.initialize();

      const overlay = svgRoot.querySelector<SVGGElement>('#svc-selection-overlay')!;
      expect(overlay.style.display).toBe('none');
    });

    it('should use custom id prefix', () => {
      const customRenderer = new SelectionHandleRenderer({
        svgRoot,
        handleConfig,
        coordinateTransformer,
        idPrefix: 'custom-',
      });

      customRenderer.initialize();

      const overlay = svgRoot.querySelector('#custom-selection-overlay');
      expect(overlay).not.toBeNull();

      customRenderer.destroy();
    });
  });

  describe('render', () => {
    it('should show overlay when bounds are provided', () => {
      handleRenderer.initialize();
      handleRenderer.render({ x: 100, y: 100, width: 200, height: 150 });

      const overlay = svgRoot.querySelector<SVGGElement>('#svc-selection-overlay')!;
      expect(overlay.style.display).toBe('');
    });

    it('should hide overlay when bounds are null', () => {
      handleRenderer.initialize();
      handleRenderer.render({ x: 100, y: 100, width: 200, height: 150 });
      handleRenderer.render(null);

      const overlay = svgRoot.querySelector<SVGGElement>('#svc-selection-overlay')!;
      expect(overlay.style.display).toBe('none');
    });

    it('should update selection box position and size', () => {
      handleRenderer.initialize();
      handleRenderer.render({ x: 100, y: 100, width: 200, height: 150 });

      const selectionBox = svgRoot.querySelector('.svc-selection-box');
      expect(selectionBox?.getAttribute('x')).toBe('100');
      expect(selectionBox?.getAttribute('y')).toBe('100');
      expect(selectionBox?.getAttribute('width')).toBe('200');
      expect(selectionBox?.getAttribute('height')).toBe('150');
    });

    it('should apply rotation transform when rotation is provided', () => {
      handleRenderer.initialize();
      handleRenderer.render({ x: 100, y: 100, width: 100, height: 100 }, 45);

      const overlay = svgRoot.querySelector<SVGGElement>('#svc-selection-overlay')!;
      const transform = overlay.getAttribute('transform');
      expect(transform).toContain('rotate(45');
      expect(transform).toContain('150'); // Center x = 100 + 100/2
      expect(transform).toContain('150'); // Center y = 100 + 100/2
    });

    it('should remove rotation transform when rotation is 0', () => {
      handleRenderer.initialize();
      handleRenderer.render({ x: 100, y: 100, width: 100, height: 100 }, 45);
      handleRenderer.render({ x: 100, y: 100, width: 100, height: 100 }, 0);

      const overlay = svgRoot.querySelector<SVGGElement>('#svc-selection-overlay')!;
      expect(overlay.getAttribute('transform')).toBeNull();
    });

    it('should auto-initialize if not already initialized', () => {
      // Don't call initialize
      handleRenderer.render({ x: 100, y: 100, width: 100, height: 100 });

      const overlay = svgRoot.querySelector('#svc-selection-overlay');
      expect(overlay).not.toBeNull();
    });
  });

  describe('hide', () => {
    it('should hide the overlay', () => {
      handleRenderer.initialize();
      handleRenderer.render({ x: 100, y: 100, width: 100, height: 100 });
      handleRenderer.hide();

      const overlay = svgRoot.querySelector<SVGGElement>('#svc-selection-overlay')!;
      expect(overlay.style.display).toBe('none');
    });
  });

  describe('destroy', () => {
    it('should remove overlay from SVG root', () => {
      handleRenderer.initialize();
      handleRenderer.destroy();

      const overlay = svgRoot.querySelector('#svc-selection-overlay');
      expect(overlay).toBeNull();
    });

    it('should allow re-initialization after destroy', () => {
      handleRenderer.initialize();
      handleRenderer.destroy();
      handleRenderer.initialize();

      const overlay = svgRoot.querySelector('#svc-selection-overlay');
      expect(overlay).not.toBeNull();
    });
  });

  describe('getHandlePositions', () => {
    it('should return positions for all handles', () => {
      handleRenderer.initialize();

      const positions = handleRenderer.getHandlePositions({
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(positions.has('nw')).toBe(true);
      expect(positions.has('n')).toBe(true);
      expect(positions.has('ne')).toBe(true);
      expect(positions.has('w')).toBe(true);
      expect(positions.has('e')).toBe(true);
      expect(positions.has('sw')).toBe(true);
      expect(positions.has('s')).toBe(true);
      expect(positions.has('se')).toBe(true);
      expect(positions.has('rotate')).toBe(true);
    });

    it('should calculate correct corner positions', () => {
      handleRenderer.initialize();

      const positions = handleRenderer.getHandlePositions({
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(positions.get('nw')).toEqual({ x: 100, y: 100 });
      expect(positions.get('ne')).toEqual({ x: 300, y: 100 });
      expect(positions.get('sw')).toEqual({ x: 100, y: 200 });
      expect(positions.get('se')).toEqual({ x: 300, y: 200 });
    });

    it('should calculate correct edge midpoint positions', () => {
      handleRenderer.initialize();

      const positions = handleRenderer.getHandlePositions({
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      expect(positions.get('n')).toEqual({ x: 200, y: 100 });
      expect(positions.get('s')).toEqual({ x: 200, y: 200 });
      expect(positions.get('w')).toEqual({ x: 100, y: 150 });
      expect(positions.get('e')).toEqual({ x: 300, y: 150 });
    });

    it('should calculate rotation handle position above selection', () => {
      handleRenderer.initialize();

      const positions = handleRenderer.getHandlePositions({
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });

      const rotatePos = positions.get('rotate');
      expect(rotatePos).not.toBeUndefined();
      expect(rotatePos!.x).toBe(200); // Center x
      expect(rotatePos!.y).toBeLessThan(100); // Above the selection
    });
  });

  describe('getCursor static method', () => {
    it('should return correct cursor for nw handle', () => {
      expect(SelectionHandleRenderer.getCursor('nw')).toBe('nwse-resize');
    });

    it('should return correct cursor for n handle', () => {
      expect(SelectionHandleRenderer.getCursor('n')).toBe('ns-resize');
    });

    it('should return correct cursor for ne handle', () => {
      expect(SelectionHandleRenderer.getCursor('ne')).toBe('nesw-resize');
    });

    it('should return correct cursor for w handle', () => {
      expect(SelectionHandleRenderer.getCursor('w')).toBe('ew-resize');
    });

    it('should return correct cursor for e handle', () => {
      expect(SelectionHandleRenderer.getCursor('e')).toBe('ew-resize');
    });

    it('should return correct cursor for sw handle', () => {
      expect(SelectionHandleRenderer.getCursor('sw')).toBe('nesw-resize');
    });

    it('should return correct cursor for s handle', () => {
      expect(SelectionHandleRenderer.getCursor('s')).toBe('ns-resize');
    });

    it('should return correct cursor for se handle', () => {
      expect(SelectionHandleRenderer.getCursor('se')).toBe('nwse-resize');
    });

    it('should return correct cursor for rotate handle', () => {
      expect(SelectionHandleRenderer.getCursor('rotate')).toBe('grab');
    });
  });
});
