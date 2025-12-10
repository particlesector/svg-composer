/**
 * SVGComposer unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SVGComposer } from '../../src/core/SVGComposer.js';

describe('SVGComposer', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      const editor = new SVGComposer(container);
      expect(editor).toBeInstanceOf(SVGComposer);
      expect(editor.container).toBe(container);
    });

    it('should create an instance with custom options', () => {
      const editor = new SVGComposer(container, {
        width: 800,
        height: 600,
        backgroundColor: '#f0f0f0',
        historyLimit: 100,
      });
      expect(editor).toBeInstanceOf(SVGComposer);
    });

    it('should have default tool set to select', () => {
      const editor = new SVGComposer(container);
      expect(editor.getTool()).toBe('select');
    });

    it('should not be destroyed initially', () => {
      const editor = new SVGComposer(container);
      expect(editor.isDestroyed).toBe(false);
    });
  });

  describe('public API methods exist', () => {
    let editor: SVGComposer;

    beforeEach(() => {
      editor = new SVGComposer(container);
    });

    // Element Management
    it('should have addElement method', () => {
      expect(typeof editor.addElement).toBe('function');
    });

    it('should have removeElement method', () => {
      expect(typeof editor.removeElement).toBe('function');
    });

    it('should have removeElements method', () => {
      expect(typeof editor.removeElements).toBe('function');
    });

    it('should have updateElement method', () => {
      expect(typeof editor.updateElement).toBe('function');
    });

    it('should have replaceElement method', () => {
      expect(typeof editor.replaceElement).toBe('function');
    });

    it('should have getElement method', () => {
      expect(typeof editor.getElement).toBe('function');
    });

    it('should have getAllElements method', () => {
      expect(typeof editor.getAllElements).toBe('function');
    });

    it('should have getElementsByType method', () => {
      expect(typeof editor.getElementsByType).toBe('function');
    });

    it('should have getElementsInBounds method', () => {
      expect(typeof editor.getElementsInBounds).toBe('function');
    });

    // Selection
    it('should have select method', () => {
      expect(typeof editor.select).toBe('function');
    });

    it('should have addToSelection method', () => {
      expect(typeof editor.addToSelection).toBe('function');
    });

    it('should have removeFromSelection method', () => {
      expect(typeof editor.removeFromSelection).toBe('function');
    });

    it('should have clearSelection method', () => {
      expect(typeof editor.clearSelection).toBe('function');
    });

    it('should have getSelected method', () => {
      expect(typeof editor.getSelected).toBe('function');
    });

    it('should have selectAll method', () => {
      expect(typeof editor.selectAll).toBe('function');
    });

    // Transforms
    it('should have moveElement method', () => {
      expect(typeof editor.moveElement).toBe('function');
    });

    it('should have setPosition method', () => {
      expect(typeof editor.setPosition).toBe('function');
    });

    it('should have rotateElement method', () => {
      expect(typeof editor.rotateElement).toBe('function');
    });

    it('should have scaleElement method', () => {
      expect(typeof editor.scaleElement).toBe('function');
    });

    it('should have resetTransform method', () => {
      expect(typeof editor.resetTransform).toBe('function');
    });

    // Z-Order
    it('should have bringToFront method', () => {
      expect(typeof editor.bringToFront).toBe('function');
    });

    it('should have sendToBack method', () => {
      expect(typeof editor.sendToBack).toBe('function');
    });

    it('should have bringForward method', () => {
      expect(typeof editor.bringForward).toBe('function');
    });

    it('should have sendBackward method', () => {
      expect(typeof editor.sendBackward).toBe('function');
    });

    it('should have setZIndex method', () => {
      expect(typeof editor.setZIndex).toBe('function');
    });

    // History
    it('should have undo method', () => {
      expect(typeof editor.undo).toBe('function');
    });

    it('should have redo method', () => {
      expect(typeof editor.redo).toBe('function');
    });

    it('should have canUndo method', () => {
      expect(typeof editor.canUndo).toBe('function');
    });

    it('should have canRedo method', () => {
      expect(typeof editor.canRedo).toBe('function');
    });

    it('should have clearHistory method', () => {
      expect(typeof editor.clearHistory).toBe('function');
    });

    it('should have getHistorySize method', () => {
      expect(typeof editor.getHistorySize).toBe('function');
    });

    // Clipping
    it('should have addClipPath method', () => {
      expect(typeof editor.addClipPath).toBe('function');
    });

    it('should have removeClipPath method', () => {
      expect(typeof editor.removeClipPath).toBe('function');
    });

    it('should have updateClipPath method', () => {
      expect(typeof editor.updateClipPath).toBe('function');
    });

    // Export/Import
    it('should have toSVG method', () => {
      expect(typeof editor.toSVG).toBe('function');
    });

    it('should have toJSON method', () => {
      expect(typeof editor.toJSON).toBe('function');
    });

    it('should have fromJSON method', () => {
      expect(typeof editor.fromJSON).toBe('function');
    });

    it('should have clear method', () => {
      expect(typeof editor.clear).toBe('function');
    });

    // Tools
    it('should have setTool method', () => {
      expect(typeof editor.setTool).toBe('function');
    });

    it('should have getTool method', () => {
      expect(typeof editor.getTool).toBe('function');
    });

    // Lifecycle
    it('should have render method', () => {
      expect(typeof editor.render).toBe('function');
    });

    it('should have destroy method', () => {
      expect(typeof editor.destroy).toBe('function');
    });

    // Events (inherited from EventEmitter)
    it('should have on method', () => {
      expect(typeof editor.on).toBe('function');
    });

    it('should have off method', () => {
      expect(typeof editor.off).toBe('function');
    });

    it('should have once method', () => {
      expect(typeof editor.once).toBe('function');
    });
  });

  describe('stub implementations throw errors', () => {
    let editor: SVGComposer;

    beforeEach(() => {
      editor = new SVGComposer(container);
    });

    it('addElement should throw not implemented error', () => {
      expect(() =>
        editor.addElement({
          type: 'text',
          content: 'test',
          fontSize: 16,
          fontFamily: 'Arial',
          fill: '#000',
          textAnchor: 'start',
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          opacity: 1,
          zIndex: 0,
          locked: false,
          visible: true,
        }),
      ).toThrow('Not implemented');
    });

    it('toSVG should throw not implemented error', () => {
      expect(() => editor.toSVG()).toThrow('Not implemented');
    });
  });
});
