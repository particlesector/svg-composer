import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AddImageTool } from '../../../src/interaction/tools/AddImageTool.js';
import type { ToolContext, ToolComposerAccess } from '../../../src/interaction/tools/BaseTool.js';
import type { ViewportState, HandleConfig } from '../../../src/interaction/types.js';
import type { BaseElement, ImageElement } from '../../../src/elements/types.js';
import { HitTester } from '../../../src/interaction/HitTester.js';
import { CoordinateTransformer } from '../../../src/interaction/CoordinateTransformer.js';
import { SelectionHandleRenderer } from '../../../src/interaction/SelectionHandleRenderer.js';

describe('AddImageTool', () => {
  let addImageTool: AddImageTool;
  let mockContext: ToolContext;
  let viewportState: ViewportState;
  let container: HTMLElement;
  let svgRoot: SVGSVGElement;
  let mockComposer: ToolComposerAccess;
  let elements: BaseElement[];
  let addedElement: Omit<BaseElement, 'id'> | null;

  beforeEach(() => {
    viewportState = { panX: 0, panY: 0, zoom: 1 };
    elements = [];
    addedElement = null;

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

    const addElementMock = vi
      .fn()
      .mockImplementation((element: Omit<BaseElement, 'id'>): string => {
        addedElement = element;
        return 'test-image-id';
      });

    mockComposer = {
      select: vi.fn(),
      addToSelection: vi.fn(),
      removeFromSelection: vi.fn(),
      clearSelection: vi.fn(),
      getSelection: (): string[] => [],
      addElement: addElementMock,
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

    addImageTool = new AddImageTool(mockContext);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('type', () => {
    it('should be add-image', () => {
      expect(addImageTool.type).toBe('add-image');
    });
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const config = addImageTool.getConfig();
      expect(config.src).toBe('');
      expect(config.width).toBe(100);
      expect(config.height).toBe(100);
    });

    it('should merge provided config with defaults', () => {
      const tool = new AddImageTool(mockContext, { src: 'test.png', width: 200 });
      const config = tool.getConfig();
      expect(config.src).toBe('test.png');
      expect(config.width).toBe(200);
      expect(config.height).toBe(100); // default
    });
  });

  describe('setConfig', () => {
    it('should update configuration', () => {
      addImageTool.setConfig({ src: 'photo.jpg' });
      expect(addImageTool.getConfig().src).toBe('photo.jpg');
    });

    it('should preserve existing config values', () => {
      addImageTool.setConfig({ src: 'photo.jpg' });
      addImageTool.setConfig({ width: 300 });
      const config = addImageTool.getConfig();
      expect(config.src).toBe('photo.jpg'); // preserved
      expect(config.width).toBe(300);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the config', () => {
      const config1 = addImageTool.getConfig();
      const config2 = addImageTool.getConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('isReady', () => {
    it('should return false when no src configured', () => {
      expect(addImageTool.isReady()).toBe(false);
    });

    it('should return true when src is configured', () => {
      addImageTool.setConfig({ src: 'image.png' });
      expect(addImageTool.isReady()).toBe(true);
    });

    it('should return false for empty string src', () => {
      addImageTool.setConfig({ src: '' });
      expect(addImageTool.isReady()).toBe(false);
    });
  });

  describe('activate', () => {
    it('should set cursor to not-allowed when not ready', () => {
      addImageTool.activate();
      expect(container.style.cursor).toBe('not-allowed');
    });

    it('should set cursor to copy when ready', () => {
      addImageTool.setConfig({ src: 'image.png' });
      addImageTool.activate();
      expect(container.style.cursor).toBe('copy');
    });
  });

  describe('deactivate', () => {
    it('should reset cursor to default', () => {
      addImageTool.setConfig({ src: 'image.png' });
      addImageTool.activate();
      addImageTool.deactivate();
      expect(container.style.cursor).toBe('default');
    });
  });

  describe('onMouseDown', () => {
    it('should not create element when not ready', () => {
      addImageTool.activate();

      const result = addImageTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(result).toBe(false);
      expect(mockComposer.addElement).not.toHaveBeenCalled();
    });

    it('should create image element when ready', () => {
      addImageTool.setConfig({ src: 'test.png' });
      addImageTool.activate();

      const result = addImageTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(result).toBe(true);
      expect(mockComposer.addElement).toHaveBeenCalled();
      expect(addedElement).toBeDefined();
      expect(addedElement?.type).toBe('image');
    });

    it('should select the new image element', () => {
      addImageTool.setConfig({ src: 'test.png' });
      addImageTool.activate();

      addImageTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(mockComposer.select).toHaveBeenCalledWith('test-image-id');
    });

    it('should push history', () => {
      addImageTool.setConfig({ src: 'test.png' });
      addImageTool.activate();

      addImageTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(mockComposer.pushHistory).toHaveBeenCalled();
    });

    it('should request render', () => {
      addImageTool.setConfig({ src: 'test.png' });
      addImageTool.activate();

      addImageTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(mockContext.requestRender).toHaveBeenCalled();
    });

    it('should create image with configured properties', () => {
      addImageTool.setConfig({
        src: 'photo.jpg',
        width: 400,
        height: 300,
      });
      addImageTool.activate();

      addImageTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      const imageElement = addedElement as Omit<ImageElement, 'id'>;
      expect(imageElement.src).toBe('photo.jpg');
      expect(imageElement.width).toBe(400);
      expect(imageElement.height).toBe(300);
    });

    it('should set correct transform position', () => {
      addImageTool.setConfig({ src: 'test.png' });
      addImageTool.activate();

      addImageTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(addedElement?.transform.x).toBe(150);
      expect(addedElement?.transform.y).toBe(200);
      expect(addedElement?.transform.rotation).toBe(0);
      expect(addedElement?.transform.scaleX).toBe(1);
      expect(addedElement?.transform.scaleY).toBe(1);
    });

    it('should set correct z-index', () => {
      // Add existing element with zIndex 7
      elements.push({
        id: 'existing',
        type: 'image',
        src: 'existing.png',
        width: 100,
        height: 100,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        zIndex: 7,
        locked: false,
        visible: true,
      } as ImageElement);

      addImageTool.setConfig({ src: 'test.png' });
      addImageTool.activate();
      addImageTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(addedElement?.zIndex).toBe(8);
    });

    it('should set z-index to 1 when no elements exist', () => {
      addImageTool.setConfig({ src: 'test.png' });
      addImageTool.activate();
      addImageTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(addedElement?.zIndex).toBe(1);
    });

    it('should set default element properties', () => {
      addImageTool.setConfig({ src: 'test.png' });
      addImageTool.activate();

      addImageTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(addedElement?.opacity).toBe(1);
      expect(addedElement?.locked).toBe(false);
      expect(addedElement?.visible).toBe(true);
    });
  });

  describe('onMouseMove', () => {
    it('should return false (no drag behavior)', () => {
      addImageTool.setConfig({ src: 'test.png' });
      addImageTool.activate();

      const result = addImageTool.onMouseMove(new MouseEvent('mousemove'), { x: 200, y: 250 });

      expect(result).toBe(false);
    });
  });

  describe('onMouseUp', () => {
    it('should return false (no drag behavior)', () => {
      addImageTool.setConfig({ src: 'test.png' });
      addImageTool.activate();

      const result = addImageTool.onMouseUp(new MouseEvent('mouseup'), { x: 200, y: 250 });

      expect(result).toBe(false);
    });
  });

  describe('getCursor', () => {
    it('should return not-allowed when not ready', () => {
      expect(addImageTool.getCursor()).toBe('not-allowed');
    });

    it('should return copy when ready', () => {
      addImageTool.setConfig({ src: 'image.png' });
      expect(addImageTool.getCursor()).toBe('copy');
    });
  });
});
