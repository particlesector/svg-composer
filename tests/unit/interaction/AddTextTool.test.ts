import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AddTextTool } from '../../../src/interaction/tools/AddTextTool.js';
import type { ToolContext, ToolComposerAccess } from '../../../src/interaction/tools/BaseTool.js';
import type { ViewportState, HandleConfig } from '../../../src/interaction/types.js';
import type { BaseElement, TextElement } from '../../../src/elements/types.js';
import { HitTester } from '../../../src/interaction/HitTester.js';
import { CoordinateTransformer } from '../../../src/interaction/CoordinateTransformer.js';
import { SelectionHandleRenderer } from '../../../src/interaction/SelectionHandleRenderer.js';

describe('AddTextTool', () => {
  let addTextTool: AddTextTool;
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
        return 'test-text-id';
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

    addTextTool = new AddTextTool(mockContext);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('type', () => {
    it('should be add-text', () => {
      expect(addTextTool.type).toBe('add-text');
    });
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const config = addTextTool.getConfig();
      expect(config.content).toBe('Text');
      expect(config.fontSize).toBe(24);
      expect(config.fontFamily).toBe('Arial, sans-serif');
      expect(config.fill).toBe('#000000');
      expect(config.textAnchor).toBe('start');
    });

    it('should merge provided config with defaults', () => {
      const tool = new AddTextTool(mockContext, { content: 'Hello', fontSize: 32 });
      const config = tool.getConfig();
      expect(config.content).toBe('Hello');
      expect(config.fontSize).toBe(32);
      expect(config.fontFamily).toBe('Arial, sans-serif'); // default
    });
  });

  describe('setConfig', () => {
    it('should update configuration', () => {
      addTextTool.setConfig({ content: 'Updated Text' });
      expect(addTextTool.getConfig().content).toBe('Updated Text');
    });

    it('should preserve existing config values', () => {
      addTextTool.setConfig({ fill: '#ff0000' });
      const config = addTextTool.getConfig();
      expect(config.fill).toBe('#ff0000');
      expect(config.content).toBe('Text'); // preserved
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the config', () => {
      const config1 = addTextTool.getConfig();
      const config2 = addTextTool.getConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('activate', () => {
    it('should set cursor to text', () => {
      addTextTool.activate();
      expect(container.style.cursor).toBe('text');
    });
  });

  describe('deactivate', () => {
    it('should reset cursor to default', () => {
      addTextTool.activate();
      addTextTool.deactivate();
      expect(container.style.cursor).toBe('default');
    });
  });

  describe('onMouseDown', () => {
    it('should create text element at click location', () => {
      addTextTool.activate();

      const result = addTextTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(result).toBe(true);
      expect(mockComposer.addElement).toHaveBeenCalled();
      expect(addedElement).toBeDefined();
      expect(addedElement?.type).toBe('text');
    });

    it('should select the new text element', () => {
      addTextTool.activate();

      addTextTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(mockComposer.select).toHaveBeenCalledWith('test-text-id');
    });

    it('should push history', () => {
      addTextTool.activate();

      addTextTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(mockComposer.pushHistory).toHaveBeenCalled();
    });

    it('should request render', () => {
      addTextTool.activate();

      addTextTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(mockContext.requestRender).toHaveBeenCalled();
    });

    it('should create text with configured properties', () => {
      addTextTool.setConfig({
        content: 'Hello World',
        fontSize: 36,
        fontFamily: 'Helvetica',
        fill: '#0000ff',
        textAnchor: 'middle',
      });
      addTextTool.activate();

      addTextTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      const textElement = addedElement as Omit<TextElement, 'id'>;
      expect(textElement.content).toBe('Hello World');
      expect(textElement.fontSize).toBe(36);
      expect(textElement.fontFamily).toBe('Helvetica');
      expect(textElement.fill).toBe('#0000ff');
      expect(textElement.textAnchor).toBe('middle');
    });

    it('should set correct transform position', () => {
      addTextTool.activate();

      addTextTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(addedElement?.transform.x).toBe(150);
      expect(addedElement?.transform.y).toBe(200);
      expect(addedElement?.transform.rotation).toBe(0);
      expect(addedElement?.transform.scaleX).toBe(1);
      expect(addedElement?.transform.scaleY).toBe(1);
    });

    it('should set correct z-index', () => {
      // Add existing element with zIndex 3
      elements.push({
        id: 'existing',
        type: 'text',
        content: 'Existing',
        fontSize: 24,
        fontFamily: 'Arial',
        fill: '#000',
        textAnchor: 'start',
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        zIndex: 3,
        locked: false,
        visible: true,
      } as TextElement);

      addTextTool.activate();
      addTextTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(addedElement?.zIndex).toBe(4);
    });

    it('should set z-index to 1 when no elements exist', () => {
      addTextTool.activate();
      addTextTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(addedElement?.zIndex).toBe(1);
    });

    it('should set default element properties', () => {
      addTextTool.activate();

      addTextTool.onMouseDown(new MouseEvent('mousedown'), { x: 150, y: 200 });

      expect(addedElement?.opacity).toBe(1);
      expect(addedElement?.locked).toBe(false);
      expect(addedElement?.visible).toBe(true);
    });
  });

  describe('onMouseMove', () => {
    it('should return false (no drag behavior)', () => {
      addTextTool.activate();

      const result = addTextTool.onMouseMove(new MouseEvent('mousemove'), { x: 200, y: 250 });

      expect(result).toBe(false);
    });
  });

  describe('onMouseUp', () => {
    it('should return false (no drag behavior)', () => {
      addTextTool.activate();

      const result = addTextTool.onMouseUp(new MouseEvent('mouseup'), { x: 200, y: 250 });

      expect(result).toBe(false);
    });
  });

  describe('getCursor', () => {
    it('should return text cursor', () => {
      expect(addTextTool.getCursor()).toBe('text');
    });
  });
});
