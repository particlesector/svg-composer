/**
 * SVGComposer unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SVGComposer } from '../../src/core/SVGComposer.js';
import type { BaseElement, ImageElement, TextElement } from '../../src/elements/types.js';
import type { Transform } from '../../src/core/types.js';

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

// Helper to create test elements (without ID - for addElement)
function createTestElementData(
  overrides?: Partial<Omit<BaseElement, 'id'>>,
): Omit<BaseElement, 'id'> {
  return {
    type: 'image',
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    ...overrides,
  } as Omit<BaseElement, 'id'>;
}

// Helper to create full elements (with ID - for replaceElement)
function createFullElement(id: string, overrides?: Partial<BaseElement>): BaseElement {
  return {
    id,
    type: 'image',
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    ...overrides,
  } as BaseElement;
}

describe('SVGComposer', () => {
  let container: HTMLDivElement;
  let editor: SVGComposer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    editor = new SVGComposer(container);
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      expect(editor).toBeInstanceOf(SVGComposer);
      expect(editor.container).toBe(container);
    });

    it('should create an instance with custom options', () => {
      const customEditor = new SVGComposer(container, {
        width: 800,
        height: 600,
        backgroundColor: '#f0f0f0',
        historyLimit: 100,
      });
      expect(customEditor).toBeInstanceOf(SVGComposer);
    });

    it('should have default tool set to select', () => {
      expect(editor.getTool()).toBe('select');
    });

    it('should not be destroyed initially', () => {
      expect(editor.isDestroyed).toBe(false);
    });
  });

  // ============================================================
  // Element Management Tests
  // ============================================================

  describe('addElement', () => {
    it('should generate a unique ID for the element', () => {
      const id = editor.addElement(createTestElementData());
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should add element to canvas state', () => {
      const id = editor.addElement(createTestElementData());
      const element = editor.getElement(id);
      expect(element).toBeDefined();
      expect(element?.id).toBe(id);
    });

    it('should emit element:added event with full element', () => {
      const handler = vi.fn();
      editor.on('element:added', handler);

      const id = editor.addElement(createTestElementData({ opacity: 0.5 }));

      expect(handler).toHaveBeenCalledWith({
        element: expect.objectContaining({ id, opacity: 0.5 }),
      });
    });

    it('should emit state:changed event', () => {
      const handler = vi.fn();
      editor.on('state:changed', handler);

      editor.addElement(createTestElementData());

      expect(handler).toHaveBeenCalled();
    });

    it('should emit history:changed event', () => {
      const handler = vi.fn();
      editor.on('history:changed', handler);

      editor.addElement(createTestElementData());

      expect(handler).toHaveBeenCalledWith({
        canUndo: true,
        canRedo: false,
      });
    });

    it('should save state to history before mutation', () => {
      expect(editor.canUndo()).toBe(false);
      editor.addElement(createTestElementData());
      expect(editor.canUndo()).toBe(true);
    });

    it('should return the generated ID', () => {
      const id = editor.addElement(createTestElementData());
      expect(editor.getElement(id)).toBeDefined();
    });
  });

  describe('removeElement', () => {
    it('should remove element from state', () => {
      const id = editor.addElement(createTestElementData());
      expect(editor.getElement(id)).toBeDefined();

      editor.removeElement(id);
      expect(editor.getElement(id)).toBeUndefined();
    });

    it('should throw error for non-existent element', () => {
      expect(() => {
        editor.removeElement('non-existent');
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should remove element from selection if selected', () => {
      const id = editor.addElement(createTestElementData());
      editor.select(id);
      expect(editor.getSelected().map((e) => e.id)).toContain(id);

      editor.removeElement(id);
      expect(editor.getSelected().map((e) => e.id)).not.toContain(id);
    });

    it('should emit element:removed event', () => {
      const id = editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('element:removed', handler);

      editor.removeElement(id);

      expect(handler).toHaveBeenCalledWith({ id });
    });

    it('should emit selection:changed event', () => {
      const id = editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('selection:changed', handler);

      editor.removeElement(id);

      expect(handler).toHaveBeenCalled();
    });

    it('should save state to history before mutation', () => {
      const id = editor.addElement(createTestElementData());
      editor.clearHistory();
      expect(editor.canUndo()).toBe(false);

      editor.removeElement(id);
      expect(editor.canUndo()).toBe(true);
    });
  });

  describe('removeElements', () => {
    it('should remove multiple elements', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());
      const id3 = editor.addElement(createTestElementData());

      editor.removeElements([id1, id2]);

      expect(editor.getElement(id1)).toBeUndefined();
      expect(editor.getElement(id2)).toBeUndefined();
      expect(editor.getElement(id3)).toBeDefined();
    });

    it('should skip non-existent IDs silently', () => {
      const id = editor.addElement(createTestElementData());

      // Should not throw
      editor.removeElements([id, 'non-existent-1', 'non-existent-2']);

      expect(editor.getElement(id)).toBeUndefined();
    });

    it('should emit element:removed for each removed element', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('element:removed', handler);

      editor.removeElements([id1, id2]);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith({ id: id1 });
      expect(handler).toHaveBeenCalledWith({ id: id2 });
    });

    it('should save history only once for batch operation', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());
      editor.clearHistory();
      // After clearHistory: size = 1 (current state with 2 elements)

      editor.removeElements([id1, id2]);

      // Should only have one additional history entry for the batch
      // size = 2 (previous state + current state after removal)
      expect(editor.getHistorySize()).toBe(2);
    });

    it('should do nothing if no valid IDs provided', () => {
      const handler = vi.fn();
      editor.on('element:removed', handler);

      editor.removeElements(['non-existent']);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('updateElement', () => {
    it('should update element properties', () => {
      const id = editor.addElement(createTestElementData({ opacity: 1 }));
      editor.updateElement(id, { opacity: 0.5 });

      expect(editor.getElement(id)?.opacity).toBe(0.5);
    });

    it('should throw error for non-existent element', () => {
      expect(() => {
        editor.updateElement('non-existent', { opacity: 0.5 });
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should emit element:updated event', () => {
      const id = editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('element:updated', handler);

      editor.updateElement(id, { opacity: 0.5 });

      expect(handler).toHaveBeenCalledWith({
        id,
        element: expect.objectContaining({ opacity: 0.5 }),
      });
    });

    it('should preserve properties not in updates', () => {
      const id = editor.addElement(createTestElementData({ opacity: 1, zIndex: 5 }));
      editor.updateElement(id, { opacity: 0.5 });

      const element = editor.getElement(id);
      expect(element?.opacity).toBe(0.5);
      expect(element?.zIndex).toBe(5);
    });

    it('should save state to history', () => {
      const id = editor.addElement(createTestElementData());
      editor.clearHistory();

      editor.updateElement(id, { opacity: 0.5 });

      expect(editor.canUndo()).toBe(true);
    });
  });

  describe('replaceElement', () => {
    it('should replace element entirely', () => {
      const id = editor.addElement(createTestElementData({ opacity: 1, zIndex: 0 }));
      const replacement = createFullElement(id, { opacity: 0.5, zIndex: 10 });

      editor.replaceElement(id, replacement);

      const element = editor.getElement(id);
      expect(element?.opacity).toBe(0.5);
      expect(element?.zIndex).toBe(10);
    });

    it('should throw if element does not exist', () => {
      const replacement = createFullElement('non-existent');

      expect(() => {
        editor.replaceElement('non-existent', replacement);
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should throw if replacement ID does not match', () => {
      const id = editor.addElement(createTestElementData());
      const replacement = createFullElement('different-id');

      expect(() => {
        editor.replaceElement(id, replacement);
      }).toThrow(`Replacement element ID must match original ID "${id}"`);
    });

    it('should emit element:updated event', () => {
      const id = editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('element:updated', handler);
      const replacement = createFullElement(id, { opacity: 0.5 });

      editor.replaceElement(id, replacement);

      expect(handler).toHaveBeenCalledWith({ id, element: replacement });
    });
  });

  describe('getElement', () => {
    it('should return element by ID', () => {
      const id = editor.addElement(createTestElementData({ opacity: 0.75 }));
      const element = editor.getElement(id);

      expect(element).toBeDefined();
      expect(element?.id).toBe(id);
      expect(element?.opacity).toBe(0.75);
    });

    it('should return undefined for non-existent element', () => {
      expect(editor.getElement('non-existent')).toBeUndefined();
    });
  });

  describe('getAllElements', () => {
    it('should return all elements as array', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());

      const elements = editor.getAllElements();

      expect(elements).toHaveLength(2);
      expect(elements.map((e) => e.id)).toContain(id1);
      expect(elements.map((e) => e.id)).toContain(id2);
    });

    it('should return empty array when no elements', () => {
      expect(editor.getAllElements()).toEqual([]);
    });
  });

  describe('getElementsByType', () => {
    it('should filter elements by type', () => {
      editor.addElement(createTestElementData({ type: 'image' } as Partial<ImageElement>));
      editor.addElement(
        createTestElementData({
          type: 'text',
          content: 'test',
          fontSize: 16,
          fontFamily: 'Arial',
          fill: '#000',
          textAnchor: 'start',
        } as Partial<TextElement>),
      );
      editor.addElement(createTestElementData({ type: 'image' } as Partial<ImageElement>));

      const images = editor.getElementsByType('image');
      const texts = editor.getElementsByType('text');

      expect(images).toHaveLength(2);
      expect(texts).toHaveLength(1);
    });

    it('should return empty array if no matching type', () => {
      editor.addElement(createTestElementData({ type: 'image' } as Partial<ImageElement>));

      expect(editor.getElementsByType('text')).toEqual([]);
    });
  });

  // ============================================================
  // Selection Tests
  // ============================================================

  describe('select', () => {
    it('should set selection with single ID', () => {
      const id = editor.addElement(createTestElementData());
      editor.select(id);

      expect(editor.getSelected().map((e) => e.id)).toEqual([id]);
    });

    it('should set selection with array of IDs', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());

      editor.select([id1, id2]);

      const selectedIds = editor.getSelected().map((e) => e.id);
      expect(selectedIds).toContain(id1);
      expect(selectedIds).toContain(id2);
    });

    it('should replace previous selection', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());

      editor.select(id1);
      editor.select(id2);

      const selectedIds = editor.getSelected().map((e) => e.id);
      expect(selectedIds).not.toContain(id1);
      expect(selectedIds).toContain(id2);
    });

    it('should ignore non-existent element IDs', () => {
      const id = editor.addElement(createTestElementData());
      editor.select([id, 'non-existent']);

      expect(editor.getSelected()).toHaveLength(1);
    });

    it('should emit selection:changed event', () => {
      const id = editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('selection:changed', handler);

      editor.select(id);

      expect(handler).toHaveBeenCalledWith({ selectedIds: [id] });
    });
  });

  describe('addToSelection', () => {
    it('should add to existing selection', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());

      editor.select(id1);
      editor.addToSelection(id2);

      const selectedIds = editor.getSelected().map((e) => e.id);
      expect(selectedIds).toContain(id1);
      expect(selectedIds).toContain(id2);
    });

    it('should handle single ID', () => {
      const id = editor.addElement(createTestElementData());
      editor.addToSelection(id);

      expect(editor.getSelected().map((e) => e.id)).toContain(id);
    });

    it('should handle array of IDs', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());

      editor.addToSelection([id1, id2]);

      expect(editor.getSelected()).toHaveLength(2);
    });

    it('should not duplicate already selected IDs', () => {
      const id = editor.addElement(createTestElementData());

      editor.select(id);
      editor.addToSelection(id);

      expect(editor.getSelected()).toHaveLength(1);
    });
  });

  describe('removeFromSelection', () => {
    it('should remove from existing selection', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());

      editor.select([id1, id2]);
      editor.removeFromSelection(id1);

      const selectedIds = editor.getSelected().map((e) => e.id);
      expect(selectedIds).not.toContain(id1);
      expect(selectedIds).toContain(id2);
    });

    it('should handle single ID', () => {
      const id = editor.addElement(createTestElementData());
      editor.select(id);
      editor.removeFromSelection(id);

      expect(editor.getSelected()).toHaveLength(0);
    });

    it('should handle array of IDs', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());

      editor.select([id1, id2]);
      editor.removeFromSelection([id1, id2]);

      expect(editor.getSelected()).toHaveLength(0);
    });

    it('should do nothing if ID not in selection', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());

      editor.select(id1);
      editor.removeFromSelection(id2);

      expect(editor.getSelected()).toHaveLength(1);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selection', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());

      editor.select([id1, id2]);
      editor.clearSelection();

      expect(editor.getSelected()).toHaveLength(0);
    });

    it('should emit selection:changed with empty array', () => {
      const id = editor.addElement(createTestElementData());
      editor.select(id);
      const handler = vi.fn();
      editor.on('selection:changed', handler);

      editor.clearSelection();

      expect(handler).toHaveBeenCalledWith({ selectedIds: [] });
    });
  });

  describe('getSelected', () => {
    it('should return selected elements (not just IDs)', () => {
      const id = editor.addElement(createTestElementData({ opacity: 0.5 }));
      editor.select(id);

      const selected = editor.getSelected();

      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe(id);
      expect(selected[0].opacity).toBe(0.5);
    });

    it('should return empty array when nothing selected', () => {
      expect(editor.getSelected()).toEqual([]);
    });
  });

  describe('selectAll', () => {
    it('should select all visible, unlocked elements', () => {
      const id1 = editor.addElement(createTestElementData({ visible: true, locked: false }));
      const id2 = editor.addElement(createTestElementData({ visible: true, locked: false }));

      editor.selectAll();

      const selectedIds = editor.getSelected().map((e) => e.id);
      expect(selectedIds).toContain(id1);
      expect(selectedIds).toContain(id2);
    });

    it('should not select locked elements', () => {
      const id1 = editor.addElement(createTestElementData({ locked: false }));
      const id2 = editor.addElement(createTestElementData({ locked: true }));

      editor.selectAll();

      const selectedIds = editor.getSelected().map((e) => e.id);
      expect(selectedIds).toContain(id1);
      expect(selectedIds).not.toContain(id2);
    });

    it('should not select hidden elements', () => {
      const id1 = editor.addElement(createTestElementData({ visible: true }));
      const id2 = editor.addElement(createTestElementData({ visible: false }));

      editor.selectAll();

      const selectedIds = editor.getSelected().map((e) => e.id);
      expect(selectedIds).toContain(id1);
      expect(selectedIds).not.toContain(id2);
    });
  });

  // ============================================================
  // History Tests
  // ============================================================

  describe('undo', () => {
    it('should restore previous state', () => {
      editor.addElement(createTestElementData());
      expect(editor.getAllElements()).toHaveLength(1);

      editor.undo();

      expect(editor.getAllElements()).toHaveLength(0);
    });

    it('should do nothing if nothing to undo', () => {
      expect(editor.canUndo()).toBe(false);
      editor.undo(); // Should not throw
      expect(editor.getAllElements()).toHaveLength(0);
    });

    it('should emit state:changed event', () => {
      editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('state:changed', handler);

      editor.undo();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit selection:changed event', () => {
      editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('selection:changed', handler);

      editor.undo();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit history:changed event', () => {
      editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('history:changed', handler);

      editor.undo();

      expect(handler).toHaveBeenCalledWith({
        canUndo: false,
        canRedo: true,
      });
    });
  });

  describe('redo', () => {
    it('should restore next state', () => {
      editor.addElement(createTestElementData());
      editor.undo();
      expect(editor.getAllElements()).toHaveLength(0);

      editor.redo();

      expect(editor.getAllElements()).toHaveLength(1);
    });

    it('should do nothing if nothing to redo', () => {
      expect(editor.canRedo()).toBe(false);
      editor.redo(); // Should not throw
    });

    it('should emit appropriate events', () => {
      editor.addElement(createTestElementData());
      editor.undo();

      const stateHandler = vi.fn();
      const historyHandler = vi.fn();
      editor.on('state:changed', stateHandler);
      editor.on('history:changed', historyHandler);

      editor.redo();

      expect(stateHandler).toHaveBeenCalled();
      expect(historyHandler).toHaveBeenCalled();
    });
  });

  describe('canUndo', () => {
    it('should return false initially', () => {
      expect(editor.canUndo()).toBe(false);
    });

    it('should return true after element mutation', () => {
      editor.addElement(createTestElementData());
      expect(editor.canUndo()).toBe(true);
    });

    it('should return false after undoing all operations', () => {
      editor.addElement(createTestElementData());
      editor.undo();
      expect(editor.canUndo()).toBe(false);
    });
  });

  describe('canRedo', () => {
    it('should return false initially', () => {
      expect(editor.canRedo()).toBe(false);
    });

    it('should return true after undo', () => {
      editor.addElement(createTestElementData());
      editor.undo();
      expect(editor.canRedo()).toBe(true);
    });

    it('should return false after new mutation clears redo stack', () => {
      editor.addElement(createTestElementData());
      editor.undo();
      expect(editor.canRedo()).toBe(true);

      editor.addElement(createTestElementData());
      expect(editor.canRedo()).toBe(false);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history and reinitialize with current state', () => {
      editor.addElement(createTestElementData());
      editor.addElement(createTestElementData());
      expect(editor.getHistorySize()).toBe(3); // initial + 2 operations

      editor.clearHistory();

      // After clear, only current state is on stack
      expect(editor.getHistorySize()).toBe(1);
    });

    it('should emit history:changed with both false', () => {
      editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('history:changed', handler);

      editor.clearHistory();

      expect(handler).toHaveBeenCalledWith({ canUndo: false, canRedo: false });
    });
  });

  describe('getHistorySize', () => {
    it('should return 1 initially (initial state on stack)', () => {
      expect(editor.getHistorySize()).toBe(1);
    });

    it('should return correct count after operations', () => {
      editor.addElement(createTestElementData());
      expect(editor.getHistorySize()).toBe(2);

      editor.addElement(createTestElementData());
      expect(editor.getHistorySize()).toBe(3);
    });
  });

  // ============================================================
  // Integration Tests
  // ============================================================

  describe('history integration', () => {
    it('should allow undo after addElement', () => {
      const id = editor.addElement(createTestElementData());
      expect(editor.getElement(id)).toBeDefined();

      editor.undo();

      expect(editor.getElement(id)).toBeUndefined();
    });

    it('should allow undo after removeElement', () => {
      const id = editor.addElement(createTestElementData());
      editor.removeElement(id);
      expect(editor.getElement(id)).toBeUndefined();

      editor.undo();

      expect(editor.getElement(id)).toBeDefined();
    });

    it('should allow undo after updateElement', () => {
      const id = editor.addElement(createTestElementData({ opacity: 1 }));
      editor.updateElement(id, { opacity: 0.5 });
      expect(editor.getElement(id)?.opacity).toBe(0.5);

      editor.undo();

      expect(editor.getElement(id)?.opacity).toBe(1);
    });

    it('should restore selection state on undo', () => {
      // Add element and select it
      const id = editor.addElement(createTestElementData());
      editor.select(id);
      // Now selection = [id], but history has: [initial, state1(sel=[])]

      // Do a mutation that captures current state (with selection) to history
      editor.updateElement(id, { opacity: 0.5 });
      // Now history has: [initial, state1(sel=[]), state2(sel=[id])]

      // Verify selection is present
      expect(editor.getSelected().map((e) => e.id)).toContain(id);

      // Clear selection to verify it gets restored
      editor.clearSelection();
      expect(editor.getSelected()).toHaveLength(0);

      // Undo the updateElement - should restore to state1 (before update, sel=[])
      editor.undo();

      // Selection should be restored from state1, which has sel=[]
      // because state1 was captured BEFORE select() was called
      expect(editor.getSelected()).toHaveLength(0);

      // Redo to verify state2's selection is restored
      editor.redo();
      expect(editor.getSelected().map((e) => e.id)).toContain(id);
    });

    it('should allow redo after undo', () => {
      const id = editor.addElement(createTestElementData());
      editor.undo();
      expect(editor.getElement(id)).toBeUndefined();

      editor.redo();

      expect(editor.getElement(id)).toBeDefined();
    });

    it('should clear redo stack on new mutation', () => {
      editor.addElement(createTestElementData());
      editor.undo();
      expect(editor.canRedo()).toBe(true);

      editor.addElement(createTestElementData());

      expect(editor.canRedo()).toBe(false);
    });
  });

  // ============================================================
  // Transform Tests
  // ============================================================

  describe('moveElement', () => {
    it('should add dx/dy to current position', () => {
      const id = editor.addElement(
        createTestElementData({ transform: createTestTransform({ x: 100, y: 200 }) }),
      );

      editor.moveElement(id, 50, -30);

      const element = editor.getElement(id);
      expect(element?.transform.x).toBe(150);
      expect(element?.transform.y).toBe(170);
    });

    it('should throw for non-existent element', () => {
      expect(() => {
        editor.moveElement('non-existent', 10, 10);
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should handle negative values', () => {
      const id = editor.addElement(
        createTestElementData({ transform: createTestTransform({ x: 100, y: 100 }) }),
      );

      editor.moveElement(id, -150, -200);

      const element = editor.getElement(id);
      expect(element?.transform.x).toBe(-50);
      expect(element?.transform.y).toBe(-100);
    });

    it('should preserve other transform properties', () => {
      const id = editor.addElement(
        createTestElementData({
          transform: createTestTransform({ x: 10, y: 20, rotation: 45, scaleX: 2, scaleY: 0.5 }),
        }),
      );

      editor.moveElement(id, 5, 10);

      const element = editor.getElement(id);
      expect(element?.transform.x).toBe(15);
      expect(element?.transform.y).toBe(30);
      expect(element?.transform.rotation).toBe(45);
      expect(element?.transform.scaleX).toBe(2);
      expect(element?.transform.scaleY).toBe(0.5);
    });

    it('should emit element:updated event', () => {
      const id = editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('element:updated', handler);

      editor.moveElement(id, 10, 20);

      expect(handler).toHaveBeenCalledWith({
        id,
        element: expect.objectContaining({
          transform: expect.objectContaining({ x: 10, y: 20 }),
        }),
      });
    });

    it('should save to history (undoable)', () => {
      const id = editor.addElement(
        createTestElementData({ transform: createTestTransform({ x: 0, y: 0 }) }),
      );

      editor.moveElement(id, 100, 100);
      expect(editor.getElement(id)?.transform.x).toBe(100);

      editor.undo();
      expect(editor.getElement(id)?.transform.x).toBe(0);
      expect(editor.getElement(id)?.transform.y).toBe(0);
    });
  });

  describe('setPosition', () => {
    it('should set absolute x/y position', () => {
      const id = editor.addElement(
        createTestElementData({ transform: createTestTransform({ x: 100, y: 200 }) }),
      );

      editor.setPosition(id, 500, 600);

      const element = editor.getElement(id);
      expect(element?.transform.x).toBe(500);
      expect(element?.transform.y).toBe(600);
    });

    it('should throw for non-existent element', () => {
      expect(() => {
        editor.setPosition('non-existent', 0, 0);
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should preserve other transform properties', () => {
      const id = editor.addElement(
        createTestElementData({
          transform: createTestTransform({ x: 10, y: 20, rotation: 90, scaleX: 1.5, scaleY: 2 }),
        }),
      );

      editor.setPosition(id, 300, 400);

      const element = editor.getElement(id);
      expect(element?.transform.x).toBe(300);
      expect(element?.transform.y).toBe(400);
      expect(element?.transform.rotation).toBe(90);
      expect(element?.transform.scaleX).toBe(1.5);
      expect(element?.transform.scaleY).toBe(2);
    });

    it('should emit events correctly', () => {
      const id = editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('element:updated', handler);

      editor.setPosition(id, 250, 350);

      expect(handler).toHaveBeenCalledWith({
        id,
        element: expect.objectContaining({
          transform: expect.objectContaining({ x: 250, y: 350 }),
        }),
      });
    });

    it('should save to history (undoable)', () => {
      const id = editor.addElement(
        createTestElementData({ transform: createTestTransform({ x: 50, y: 75 }) }),
      );

      editor.setPosition(id, 200, 300);
      expect(editor.getElement(id)?.transform.x).toBe(200);

      editor.undo();
      expect(editor.getElement(id)?.transform.x).toBe(50);
      expect(editor.getElement(id)?.transform.y).toBe(75);
    });
  });

  describe('rotateElement', () => {
    it('should set rotation to specified degrees', () => {
      const id = editor.addElement(
        createTestElementData({ transform: createTestTransform({ rotation: 0 }) }),
      );

      editor.rotateElement(id, 45);

      expect(editor.getElement(id)?.transform.rotation).toBe(45);
    });

    it('should throw for non-existent element', () => {
      expect(() => {
        editor.rotateElement('non-existent', 90);
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should preserve position and scale', () => {
      const id = editor.addElement(
        createTestElementData({
          transform: createTestTransform({ x: 100, y: 200, scaleX: 2, scaleY: 3, rotation: 0 }),
        }),
      );

      editor.rotateElement(id, 180);

      const element = editor.getElement(id);
      expect(element?.transform.rotation).toBe(180);
      expect(element?.transform.x).toBe(100);
      expect(element?.transform.y).toBe(200);
      expect(element?.transform.scaleX).toBe(2);
      expect(element?.transform.scaleY).toBe(3);
    });

    it('should handle values > 360', () => {
      const id = editor.addElement(createTestElementData());

      editor.rotateElement(id, 450);

      expect(editor.getElement(id)?.transform.rotation).toBe(450);
    });

    it('should handle negative values', () => {
      const id = editor.addElement(createTestElementData());

      editor.rotateElement(id, -90);

      expect(editor.getElement(id)?.transform.rotation).toBe(-90);
    });

    it('should emit events correctly', () => {
      const id = editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('element:updated', handler);

      editor.rotateElement(id, 270);

      expect(handler).toHaveBeenCalledWith({
        id,
        element: expect.objectContaining({
          transform: expect.objectContaining({ rotation: 270 }),
        }),
      });
    });

    it('should save to history (undoable)', () => {
      const id = editor.addElement(
        createTestElementData({ transform: createTestTransform({ rotation: 30 }) }),
      );

      editor.rotateElement(id, 120);
      expect(editor.getElement(id)?.transform.rotation).toBe(120);

      editor.undo();
      expect(editor.getElement(id)?.transform.rotation).toBe(30);
    });
  });

  describe('scaleElement', () => {
    it('should set scaleX and scaleY', () => {
      const id = editor.addElement(
        createTestElementData({ transform: createTestTransform({ scaleX: 1, scaleY: 1 }) }),
      );

      editor.scaleElement(id, 2, 3);

      const element = editor.getElement(id);
      expect(element?.transform.scaleX).toBe(2);
      expect(element?.transform.scaleY).toBe(3);
    });

    it('should throw for non-existent element', () => {
      expect(() => {
        editor.scaleElement('non-existent', 1, 1);
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should preserve position and rotation', () => {
      const id = editor.addElement(
        createTestElementData({
          transform: createTestTransform({ x: 50, y: 100, rotation: 45, scaleX: 1, scaleY: 1 }),
        }),
      );

      editor.scaleElement(id, 0.5, 2);

      const element = editor.getElement(id);
      expect(element?.transform.scaleX).toBe(0.5);
      expect(element?.transform.scaleY).toBe(2);
      expect(element?.transform.x).toBe(50);
      expect(element?.transform.y).toBe(100);
      expect(element?.transform.rotation).toBe(45);
    });

    it('should handle fractional values', () => {
      const id = editor.addElement(createTestElementData());

      editor.scaleElement(id, 0.25, 0.75);

      const element = editor.getElement(id);
      expect(element?.transform.scaleX).toBe(0.25);
      expect(element?.transform.scaleY).toBe(0.75);
    });

    it('should emit events correctly', () => {
      const id = editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('element:updated', handler);

      editor.scaleElement(id, 1.5, 2.5);

      expect(handler).toHaveBeenCalledWith({
        id,
        element: expect.objectContaining({
          transform: expect.objectContaining({ scaleX: 1.5, scaleY: 2.5 }),
        }),
      });
    });

    it('should save to history (undoable)', () => {
      const id = editor.addElement(
        createTestElementData({ transform: createTestTransform({ scaleX: 1, scaleY: 1 }) }),
      );

      editor.scaleElement(id, 3, 4);
      expect(editor.getElement(id)?.transform.scaleX).toBe(3);

      editor.undo();
      expect(editor.getElement(id)?.transform.scaleX).toBe(1);
      expect(editor.getElement(id)?.transform.scaleY).toBe(1);
    });
  });

  describe('resetTransform', () => {
    it('should reset all transform properties to defaults', () => {
      const id = editor.addElement(
        createTestElementData({
          transform: createTestTransform({ x: 100, y: 200, rotation: 45, scaleX: 2, scaleY: 3 }),
        }),
      );

      editor.resetTransform(id);

      const element = editor.getElement(id);
      expect(element?.transform.x).toBe(0);
      expect(element?.transform.y).toBe(0);
      expect(element?.transform.rotation).toBe(0);
      expect(element?.transform.scaleX).toBe(1);
      expect(element?.transform.scaleY).toBe(1);
    });

    it('should throw for non-existent element', () => {
      expect(() => {
        editor.resetTransform('non-existent');
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should emit events correctly', () => {
      const id = editor.addElement(
        createTestElementData({
          transform: createTestTransform({ x: 50, y: 50, rotation: 90 }),
        }),
      );
      const handler = vi.fn();
      editor.on('element:updated', handler);

      editor.resetTransform(id);

      expect(handler).toHaveBeenCalledWith({
        id,
        element: expect.objectContaining({
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        }),
      });
    });

    it('should save to history (undoable)', () => {
      const id = editor.addElement(
        createTestElementData({
          transform: createTestTransform({ x: 100, y: 200, rotation: 45, scaleX: 2, scaleY: 3 }),
        }),
      );

      editor.resetTransform(id);
      expect(editor.getElement(id)?.transform.x).toBe(0);

      editor.undo();

      const element = editor.getElement(id);
      expect(element?.transform.x).toBe(100);
      expect(element?.transform.y).toBe(200);
      expect(element?.transform.rotation).toBe(45);
      expect(element?.transform.scaleX).toBe(2);
      expect(element?.transform.scaleY).toBe(3);
    });
  });

  describe('transform integration', () => {
    it('should undo moveElement correctly', () => {
      const id = editor.addElement(
        createTestElementData({ transform: createTestTransform({ x: 0, y: 0 }) }),
      );

      editor.moveElement(id, 100, 200);
      expect(editor.getElement(id)?.transform.x).toBe(100);
      expect(editor.getElement(id)?.transform.y).toBe(200);

      editor.undo();

      expect(editor.getElement(id)?.transform.x).toBe(0);
      expect(editor.getElement(id)?.transform.y).toBe(0);
    });

    it('should undo resetTransform (restores previous transform)', () => {
      const id = editor.addElement(
        createTestElementData({
          transform: createTestTransform({ x: 50, y: 100, rotation: 30, scaleX: 1.5, scaleY: 2 }),
        }),
      );

      editor.resetTransform(id);
      expect(editor.getElement(id)?.transform).toEqual({
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      });

      editor.undo();

      expect(editor.getElement(id)?.transform).toEqual({
        x: 50,
        y: 100,
        rotation: 30,
        scaleX: 1.5,
        scaleY: 2,
      });
    });

    it('should handle multiple transform operations in sequence', () => {
      const id = editor.addElement(
        createTestElementData({ transform: createTestTransform({ x: 0, y: 0 }) }),
      );

      editor.moveElement(id, 100, 100);
      editor.rotateElement(id, 45);
      editor.scaleElement(id, 2, 2);

      const element = editor.getElement(id);
      expect(element?.transform.x).toBe(100);
      expect(element?.transform.y).toBe(100);
      expect(element?.transform.rotation).toBe(45);
      expect(element?.transform.scaleX).toBe(2);
      expect(element?.transform.scaleY).toBe(2);

      // Undo all operations
      editor.undo(); // undo scale
      expect(editor.getElement(id)?.transform.scaleX).toBe(1);

      editor.undo(); // undo rotate
      expect(editor.getElement(id)?.transform.rotation).toBe(0);

      editor.undo(); // undo move
      expect(editor.getElement(id)?.transform.x).toBe(0);
    });
  });

  // ============================================================
  // Z-Order Tests
  // ============================================================

  describe('setZIndex', () => {
    it('should set zIndex to specified value', () => {
      const id = editor.addElement(createTestElementData({ zIndex: 0 }));
      editor.setZIndex(id, 10);

      expect(editor.getElement(id)?.zIndex).toBe(10);
    });

    it('should throw for non-existent element', () => {
      expect(() => {
        editor.setZIndex('non-existent', 5);
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should emit element:updated event', () => {
      const id = editor.addElement(createTestElementData({ zIndex: 0 }));
      const handler = vi.fn();
      editor.on('element:updated', handler);

      editor.setZIndex(id, 10);

      expect(handler).toHaveBeenCalledWith({
        id,
        element: expect.objectContaining({ zIndex: 10 }),
      });
    });

    it('should save to history (undoable)', () => {
      const id = editor.addElement(createTestElementData({ zIndex: 0 }));
      editor.setZIndex(id, 10);

      editor.undo();

      expect(editor.getElement(id)?.zIndex).toBe(0);
    });
  });

  describe('bringToFront', () => {
    it('should set zIndex to max + 1', () => {
      const id1 = editor.addElement(createTestElementData({ zIndex: 1 }));
      const id2 = editor.addElement(createTestElementData({ zIndex: 5 }));
      const id3 = editor.addElement(createTestElementData({ zIndex: 3 }));

      editor.bringToFront(id1);

      expect(editor.getElement(id1)?.zIndex).toBe(6); // max was 5, now 5+1
      expect(editor.getElement(id2)?.zIndex).toBe(5); // unchanged
      expect(editor.getElement(id3)?.zIndex).toBe(3); // unchanged
    });

    it('should throw for non-existent element', () => {
      expect(() => {
        editor.bringToFront('non-existent');
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should do nothing if already at front', () => {
      editor.addElement(createTestElementData({ zIndex: 1 }));
      const id2 = editor.addElement(createTestElementData({ zIndex: 5 }));
      editor.clearHistory();

      editor.bringToFront(id2); // id2 already has highest zIndex

      // No history entry should be created
      expect(editor.canUndo()).toBe(false);
      expect(editor.getElement(id2)?.zIndex).toBe(5);
    });

    it('should work with single element', () => {
      const id = editor.addElement(createTestElementData({ zIndex: 0 }));
      editor.clearHistory();

      editor.bringToFront(id);

      // Single element is already at front, no change
      expect(editor.canUndo()).toBe(false);
    });

    it('should emit events correctly', () => {
      const id1 = editor.addElement(createTestElementData({ zIndex: 1 }));
      editor.addElement(createTestElementData({ zIndex: 5 }));
      const handler = vi.fn();
      editor.on('element:updated', handler);

      editor.bringToFront(id1);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('sendToBack', () => {
    it('should set zIndex to min - 1', () => {
      const id1 = editor.addElement(createTestElementData({ zIndex: 1 }));
      const id2 = editor.addElement(createTestElementData({ zIndex: 5 }));
      const id3 = editor.addElement(createTestElementData({ zIndex: 3 }));

      editor.sendToBack(id2);

      expect(editor.getElement(id2)?.zIndex).toBe(0); // min was 1, now 1-1
      expect(editor.getElement(id1)?.zIndex).toBe(1); // unchanged
      expect(editor.getElement(id3)?.zIndex).toBe(3); // unchanged
    });

    it('should throw for non-existent element', () => {
      expect(() => {
        editor.sendToBack('non-existent');
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should do nothing if already at back', () => {
      const id1 = editor.addElement(createTestElementData({ zIndex: 1 }));
      editor.addElement(createTestElementData({ zIndex: 5 }));
      editor.clearHistory();

      editor.sendToBack(id1); // id1 already has lowest zIndex

      // No history entry should be created
      expect(editor.canUndo()).toBe(false);
      expect(editor.getElement(id1)?.zIndex).toBe(1);
    });

    it('should work with single element', () => {
      const id = editor.addElement(createTestElementData({ zIndex: 0 }));
      editor.clearHistory();

      editor.sendToBack(id);

      // Single element is already at back, no change
      expect(editor.canUndo()).toBe(false);
    });
  });

  describe('bringForward', () => {
    it('should swap zIndex with next higher element', () => {
      const id1 = editor.addElement(createTestElementData({ zIndex: 1 }));
      const id2 = editor.addElement(createTestElementData({ zIndex: 3 }));
      const id3 = editor.addElement(createTestElementData({ zIndex: 5 }));

      editor.bringForward(id1); // should swap with id2 (next higher is 3)

      expect(editor.getElement(id1)?.zIndex).toBe(3);
      expect(editor.getElement(id2)?.zIndex).toBe(1);
      expect(editor.getElement(id3)?.zIndex).toBe(5); // unchanged
    });

    it('should throw for non-existent element', () => {
      expect(() => {
        editor.bringForward('non-existent');
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should do nothing if already highest zIndex', () => {
      editor.addElement(createTestElementData({ zIndex: 1 }));
      const id2 = editor.addElement(createTestElementData({ zIndex: 5 }));
      editor.clearHistory();

      editor.bringForward(id2); // id2 already highest

      expect(editor.canUndo()).toBe(false);
      expect(editor.getElement(id2)?.zIndex).toBe(5);
    });

    it('should emit events for both swapped elements', () => {
      const id1 = editor.addElement(createTestElementData({ zIndex: 1 }));
      const id2 = editor.addElement(createTestElementData({ zIndex: 3 }));
      const handler = vi.fn();
      editor.on('element:updated', handler);

      editor.bringForward(id1);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith({
        id: id1,
        element: expect.objectContaining({ zIndex: 3 }),
      });
      expect(handler).toHaveBeenCalledWith({
        id: id2,
        element: expect.objectContaining({ zIndex: 1 }),
      });
    });

    it('should save to history (undoable)', () => {
      const id1 = editor.addElement(createTestElementData({ zIndex: 1 }));
      const id2 = editor.addElement(createTestElementData({ zIndex: 3 }));

      editor.bringForward(id1);
      expect(editor.getElement(id1)?.zIndex).toBe(3);

      editor.undo();
      expect(editor.getElement(id1)?.zIndex).toBe(1);
      expect(editor.getElement(id2)?.zIndex).toBe(3);
    });
  });

  describe('sendBackward', () => {
    it('should swap zIndex with next lower element', () => {
      const id1 = editor.addElement(createTestElementData({ zIndex: 1 }));
      const id2 = editor.addElement(createTestElementData({ zIndex: 3 }));
      const id3 = editor.addElement(createTestElementData({ zIndex: 5 }));

      editor.sendBackward(id3); // should swap with id2 (next lower is 3)

      expect(editor.getElement(id3)?.zIndex).toBe(3);
      expect(editor.getElement(id2)?.zIndex).toBe(5);
      expect(editor.getElement(id1)?.zIndex).toBe(1); // unchanged
    });

    it('should throw for non-existent element', () => {
      expect(() => {
        editor.sendBackward('non-existent');
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should do nothing if already lowest zIndex', () => {
      const id1 = editor.addElement(createTestElementData({ zIndex: 1 }));
      editor.addElement(createTestElementData({ zIndex: 5 }));
      editor.clearHistory();

      editor.sendBackward(id1); // id1 already lowest

      expect(editor.canUndo()).toBe(false);
      expect(editor.getElement(id1)?.zIndex).toBe(1);
    });

    it('should emit events for both swapped elements', () => {
      editor.addElement(createTestElementData({ zIndex: 1 }));
      const id2 = editor.addElement(createTestElementData({ zIndex: 3 }));
      const handler = vi.fn();
      editor.on('element:updated', handler);

      editor.sendBackward(id2);

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should save to history (undoable)', () => {
      const id1 = editor.addElement(createTestElementData({ zIndex: 1 }));
      const id2 = editor.addElement(createTestElementData({ zIndex: 3 }));

      editor.sendBackward(id2);
      expect(editor.getElement(id2)?.zIndex).toBe(1);

      editor.undo();
      expect(editor.getElement(id2)?.zIndex).toBe(3);
      expect(editor.getElement(id1)?.zIndex).toBe(1);
    });
  });

  describe('z-order integration', () => {
    it('should undo bringToFront correctly', () => {
      const id1 = editor.addElement(createTestElementData({ zIndex: 1 }));
      editor.addElement(createTestElementData({ zIndex: 5 }));

      editor.bringToFront(id1);
      expect(editor.getElement(id1)?.zIndex).toBe(6);

      editor.undo();
      expect(editor.getElement(id1)?.zIndex).toBe(1);
    });

    it('should handle multiple z-order operations in sequence', () => {
      const id1 = editor.addElement(createTestElementData({ zIndex: 1 }));
      const id2 = editor.addElement(createTestElementData({ zIndex: 2 }));
      const id3 = editor.addElement(createTestElementData({ zIndex: 3 }));

      editor.bringToFront(id1); // id1 becomes 4
      editor.sendToBack(id3); // id3 becomes 1 (min is 2, so min-1 = 1)

      expect(editor.getElement(id1)?.zIndex).toBe(4);
      expect(editor.getElement(id2)?.zIndex).toBe(2);
      expect(editor.getElement(id3)?.zIndex).toBe(1);
    });
  });

  // ============================================================
  // Export/Import Tests
  // ============================================================

  describe('clear', () => {
    it('should remove all elements', () => {
      editor.addElement(createTestElementData());
      editor.addElement(createTestElementData());
      editor.addElement(createTestElementData());
      expect(editor.getAllElements()).toHaveLength(3);

      editor.clear();

      expect(editor.getAllElements()).toHaveLength(0);
    });

    it('should clear selection', () => {
      const id = editor.addElement(createTestElementData());
      editor.select(id);
      expect(editor.getSelected()).toHaveLength(1);

      editor.clear();

      expect(editor.getSelected()).toHaveLength(0);
    });

    it('should do nothing if already empty (no history entry)', () => {
      expect(editor.getAllElements()).toHaveLength(0);
      editor.clearHistory();
      expect(editor.canUndo()).toBe(false);

      editor.clear();

      expect(editor.canUndo()).toBe(false);
    });

    it('should emit element:removed for each element', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('element:removed', handler);

      editor.clear();

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith({ id: id1 });
      expect(handler).toHaveBeenCalledWith({ id: id2 });
    });

    it('should emit selection:changed with empty array', () => {
      editor.addElement(createTestElementData());
      const handler = vi.fn();
      editor.on('selection:changed', handler);

      editor.clear();

      expect(handler).toHaveBeenCalledWith({ selectedIds: [] });
    });

    it('should save to history (undoable)', () => {
      const id1 = editor.addElement(createTestElementData());
      const id2 = editor.addElement(createTestElementData());

      editor.clear();
      expect(editor.getAllElements()).toHaveLength(0);

      editor.undo();

      expect(editor.getAllElements()).toHaveLength(2);
      expect(editor.getElement(id1)).toBeDefined();
      expect(editor.getElement(id2)).toBeDefined();
    });
  });

  describe('toJSON', () => {
    it('should return valid JSON string', () => {
      editor.addElement(createTestElementData());

      const json = editor.toJSON();

      expect(() => JSON.parse(json) as unknown).not.toThrow();
    });

    it('should include all canvas properties', () => {
      const customEditor = new SVGComposer(container, {
        width: 800,
        height: 600,
        backgroundColor: '#ff0000',
      });

      const json = customEditor.toJSON();
      const parsed = JSON.parse(json) as { width: number; height: number; backgroundColor: string };

      expect(parsed.width).toBe(800);
      expect(parsed.height).toBe(600);
      expect(parsed.backgroundColor).toBe('#ff0000');
    });

    it('should serialize all elements', () => {
      editor.addElement(createTestElementData({ opacity: 0.5 }));
      editor.addElement(createTestElementData({ opacity: 0.75 }));

      const json = editor.toJSON();
      const parsed = JSON.parse(json) as { elements: Record<string, unknown> };

      const elements = Object.values(parsed.elements);
      expect(elements).toHaveLength(2);
    });

    it('should include version field', () => {
      const json = editor.toJSON();
      const parsed = JSON.parse(json) as { version: number };

      expect(parsed.version).toBe(1);
    });

    it('should serialize selection state', () => {
      const id = editor.addElement(createTestElementData());
      editor.select(id);

      const json = editor.toJSON();
      const parsed = JSON.parse(json) as { selectedIds: string[] };

      expect(parsed.selectedIds).toContain(id);
    });
  });

  describe('fromJSON', () => {
    it('should restore elements from JSON', () => {
      const id = editor.addElement(createTestElementData({ opacity: 0.5 }));
      const json = editor.toJSON();

      // Create new editor and restore
      const newEditor = new SVGComposer(container);
      newEditor.fromJSON(json);

      expect(newEditor.getElement(id)).toBeDefined();
      expect(newEditor.getElement(id)?.opacity).toBe(0.5);
    });

    it('should restore canvas properties', () => {
      const customEditor = new SVGComposer(container, {
        width: 800,
        height: 600,
        backgroundColor: '#ff0000',
      });
      const json = customEditor.toJSON();

      editor.fromJSON(json);
      const restoredJson = editor.toJSON();
      const parsed = JSON.parse(restoredJson) as {
        width: number;
        height: number;
        backgroundColor: string;
      };

      expect(parsed.width).toBe(800);
      expect(parsed.height).toBe(600);
      expect(parsed.backgroundColor).toBe('#ff0000');
    });

    it('should restore selection state', () => {
      const id = editor.addElement(createTestElementData());
      editor.select(id);
      const json = editor.toJSON();

      const newEditor = new SVGComposer(container);
      newEditor.fromJSON(json);

      expect(newEditor.getSelected().map((e) => e.id)).toContain(id);
    });

    it('should clear history after restore', () => {
      editor.addElement(createTestElementData());
      editor.addElement(createTestElementData());
      expect(editor.canUndo()).toBe(true);

      const json = editor.toJSON();
      editor.fromJSON(json);

      expect(editor.canUndo()).toBe(false);
      expect(editor.canRedo()).toBe(false);
    });

    it('should emit state:changed event', () => {
      const json = editor.toJSON();
      const handler = vi.fn();
      editor.on('state:changed', handler);

      editor.fromJSON(json);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit selection:changed event', () => {
      const json = editor.toJSON();
      const handler = vi.fn();
      editor.on('selection:changed', handler);

      editor.fromJSON(json);

      expect(handler).toHaveBeenCalled();
    });

    it('should throw on invalid JSON', () => {
      expect(() => {
        editor.fromJSON('invalid json');
      }).toThrow();
    });

    it('should round-trip preserve state', () => {
      const id = editor.addElement(
        createTestElementData({
          opacity: 0.75,
          zIndex: 5,
          transform: createTestTransform({ x: 100, y: 200, rotation: 45 }),
        }),
      );
      editor.select(id);

      const json = editor.toJSON();
      const newEditor = new SVGComposer(container);
      newEditor.fromJSON(json);

      const restored = newEditor.getElement(id);
      expect(restored?.opacity).toBe(0.75);
      expect(restored?.zIndex).toBe(5);
      expect(restored?.transform.x).toBe(100);
      expect(restored?.transform.y).toBe(200);
      expect(restored?.transform.rotation).toBe(45);
    });
  });

  describe('toSVG', () => {
    it('should return valid SVG string with viewBox', () => {
      const svg = editor.toSVG();

      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox="0 0 1200 1200"');
      expect(svg).toContain('</svg>');
    });

    it('should include background rect', () => {
      const svg = editor.toSVG();

      expect(svg).toContain('<rect width="100%" height="100%" fill="#ffffff"');
    });

    it('should render image elements', () => {
      editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 50,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('<image');
      expect(svg).toContain('href="test.jpg"');
      expect(svg).toContain('width="100"');
      expect(svg).toContain('height="50"');
    });

    it('should render text elements with proper escaping', () => {
      editor.addElement({
        type: 'text',
        content: 'Hello <World> & "Test"',
        fontSize: 16,
        fontFamily: 'Arial',
        fill: '#000000',
        textAnchor: 'start',
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('<text');
      expect(svg).toContain('Hello &lt;World&gt; &amp; &quot;Test&quot;');
      expect(svg).toContain('font-size="16"');
      expect(svg).toContain('font-family="Arial"');
    });

    it('should render shape elements', () => {
      editor.addElement({
        type: 'shape',
        shapeType: 'rect',
        width: 100,
        height: 50,
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('<rect');
      expect(svg).toContain('width="100"');
      expect(svg).toContain('height="50"');
      expect(svg).toContain('fill="#ff0000"');
    });

    it('should apply transforms correctly', () => {
      editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 50,
        transform: createTestTransform({ x: 50, y: 100, rotation: 45, scaleX: 2, scaleY: 1.5 }),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('transform="translate(50, 100) rotate(45) scale(2, 1.5)"');
    });

    it('should respect zIndex ordering', () => {
      editor.addElement({
        type: 'image',
        src: 'back.jpg',
        width: 100,
        height: 50,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 1,
        locked: false,
        visible: true,
      });
      editor.addElement({
        type: 'image',
        src: 'front.jpg',
        width: 100,
        height: 50,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 10,
        locked: false,
        visible: true,
      });

      const svg = editor.toSVG();

      const backIndex = svg.indexOf('back.jpg');
      const frontIndex = svg.indexOf('front.jpg');
      expect(backIndex).toBeLessThan(frontIndex);
    });

    it('should skip hidden elements', () => {
      editor.addElement({
        type: 'image',
        src: 'visible.jpg',
        width: 100,
        height: 50,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });
      editor.addElement({
        type: 'image',
        src: 'hidden.jpg',
        width: 100,
        height: 50,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: false,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('visible.jpg');
      expect(svg).not.toContain('hidden.jpg');
    });

    it('should include opacity when not 1', () => {
      editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 50,
        transform: createTestTransform(),
        opacity: 0.5,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const svg = editor.toSVG();

      expect(svg).toContain('opacity="0.5"');
    });
  });

  // ============================================================
  // Spatial Query
  // ============================================================

  describe('getElementsInBounds', () => {
    it('returns empty array for empty canvas', () => {
      const result = editor.getElementsInBounds({ x: 0, y: 0, width: 100, height: 100 });
      expect(result).toEqual([]);
    });

    it('returns empty array when no elements in bounds', () => {
      editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 50,
        height: 50,
        transform: { x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const result = editor.getElementsInBounds({ x: 0, y: 0, width: 100, height: 100 });
      expect(result).toEqual([]);
    });

    it('finds image element fully inside bounds', () => {
      const id = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 50,
        height: 50,
        transform: { x: 10, y: 10, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const result = editor.getElementsInBounds({ x: 0, y: 0, width: 100, height: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(id);
    });

    it('finds image element partially overlapping bounds', () => {
      const id = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: { x: 50, y: 50, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const result = editor.getElementsInBounds({ x: 0, y: 0, width: 100, height: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(id);
    });

    it('handles rect shape elements', () => {
      const id = editor.addElement({
        type: 'shape',
        shapeType: 'rect',
        width: 50,
        height: 50,
        fill: '#000',
        stroke: '#000',
        strokeWidth: 1,
        transform: { x: 10, y: 10, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const result = editor.getElementsInBounds({ x: 0, y: 0, width: 100, height: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(id);
    });

    it('handles circle shape elements', () => {
      const id = editor.addElement({
        type: 'shape',
        shapeType: 'circle',
        r: 25,
        fill: '#000',
        stroke: '#000',
        strokeWidth: 1,
        transform: { x: 50, y: 50, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const result = editor.getElementsInBounds({ x: 0, y: 0, width: 100, height: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(id);
    });

    it('handles ellipse shape elements', () => {
      const id = editor.addElement({
        type: 'shape',
        shapeType: 'ellipse',
        rx: 30,
        ry: 20,
        fill: '#000',
        stroke: '#000',
        strokeWidth: 1,
        transform: { x: 50, y: 50, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const result = editor.getElementsInBounds({ x: 0, y: 0, width: 100, height: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(id);
    });

    it('handles text elements', () => {
      const id = editor.addElement({
        type: 'text',
        content: 'Hello',
        fontSize: 16,
        fontFamily: 'Arial',
        fill: '#000',
        textAnchor: 'start',
        transform: { x: 10, y: 30, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const result = editor.getElementsInBounds({ x: 0, y: 0, width: 100, height: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(id);
    });

    it('returns multiple matching elements', () => {
      editor.addElement({
        type: 'image',
        src: 'test1.jpg',
        width: 30,
        height: 30,
        transform: { x: 10, y: 10, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      editor.addElement({
        type: 'image',
        src: 'test2.jpg',
        width: 30,
        height: 30,
        transform: { x: 50, y: 50, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1,
        zIndex: 1,
        locked: false,
        visible: true,
      });

      const result = editor.getElementsInBounds({ x: 0, y: 0, width: 100, height: 100 });
      expect(result).toHaveLength(2);
    });
  });

  // ============================================================
  // Clipping
  // ============================================================

  describe('addClipPath', () => {
    it('adds rect clip path and returns ID', () => {
      const elementId = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const clipId = editor.addClipPath(elementId, {
        type: 'rect',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
      });

      expect(clipId).toBeDefined();
      expect(typeof clipId).toBe('string');

      const element = editor.getElement(elementId);
      expect(element?.clipPath).toBeDefined();
      expect(element?.clipPath?.id).toBe(clipId);
      expect(element?.clipPath?.type).toBe('rect');
    });

    it('adds circle clip path', () => {
      const elementId = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      editor.addClipPath(elementId, {
        type: 'circle',
        cx: 50,
        cy: 50,
        r: 25,
      });

      const element = editor.getElement(elementId);
      expect(element?.clipPath?.type).toBe('circle');
      expect(element?.clipPath?.r).toBe(25);
    });

    it('adds ellipse clip path', () => {
      const elementId = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      editor.addClipPath(elementId, {
        type: 'ellipse',
        cx: 50,
        cy: 50,
        rx: 30,
        ry: 20,
      });

      const element = editor.getElement(elementId);
      expect(element?.clipPath?.type).toBe('ellipse');
      expect(element?.clipPath?.rx).toBe(30);
      expect(element?.clipPath?.ry).toBe(20);
    });

    it('throws on non-existent element', () => {
      expect(() => {
        editor.addClipPath('non-existent', { type: 'rect' });
      }).toThrow('Element not found');
    });

    it('emits correct events', () => {
      const elementId = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const updatedHandler = vi.fn();
      const stateHandler = vi.fn();
      const historyHandler = vi.fn();

      editor.on('element:updated', updatedHandler);
      editor.on('state:changed', stateHandler);
      editor.on('history:changed', historyHandler);

      editor.addClipPath(elementId, { type: 'rect' });

      expect(updatedHandler).toHaveBeenCalled();
      expect(stateHandler).toHaveBeenCalled();
      expect(historyHandler).toHaveBeenCalled();
    });

    it('is undoable', () => {
      const elementId = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      editor.addClipPath(elementId, { type: 'rect' });
      expect(editor.getElement(elementId)?.clipPath).toBeDefined();

      editor.undo();
      expect(editor.getElement(elementId)?.clipPath).toBeUndefined();
    });
  });

  describe('removeClipPath', () => {
    it('removes existing clip path', () => {
      const elementId = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      editor.addClipPath(elementId, { type: 'rect' });
      expect(editor.getElement(elementId)?.clipPath).toBeDefined();

      editor.removeClipPath(elementId);
      expect(editor.getElement(elementId)?.clipPath).toBeUndefined();
    });

    it('throws on non-existent element', () => {
      expect(() => {
        editor.removeClipPath('non-existent');
      }).toThrow('Element not found');
    });

    it('throws if element has no clip path', () => {
      const elementId = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      expect(() => {
        editor.removeClipPath(elementId);
      }).toThrow('Element has no clip path');
    });

    it('emits correct events', () => {
      const elementId = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      editor.addClipPath(elementId, { type: 'rect' });

      const updatedHandler = vi.fn();
      const stateHandler = vi.fn();

      editor.on('element:updated', updatedHandler);
      editor.on('state:changed', stateHandler);

      editor.removeClipPath(elementId);

      expect(updatedHandler).toHaveBeenCalled();
      expect(stateHandler).toHaveBeenCalled();
    });
  });

  describe('updateClipPath', () => {
    it('updates clip path properties', () => {
      const elementId = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      editor.addClipPath(elementId, { type: 'rect', width: 50, height: 50 });

      editor.updateClipPath(elementId, { width: 100, height: 100 });

      const element = editor.getElement(elementId);
      expect(element?.clipPath?.width).toBe(100);
      expect(element?.clipPath?.height).toBe(100);
    });

    it('preserves clip path ID', () => {
      const elementId = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      const clipId = editor.addClipPath(elementId, { type: 'rect' });

      editor.updateClipPath(elementId, { width: 100 });

      const element = editor.getElement(elementId);
      expect(element?.clipPath?.id).toBe(clipId);
    });

    it('throws on non-existent element', () => {
      expect(() => {
        editor.updateClipPath('non-existent', { width: 100 });
      }).toThrow('Element not found');
    });

    it('throws if element has no clip path', () => {
      const elementId = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      expect(() => {
        editor.updateClipPath(elementId, { width: 100 });
      }).toThrow('Element has no clip path');
    });

    it('partial updates merge correctly', () => {
      const elementId = editor.addElement({
        type: 'image',
        src: 'test.jpg',
        width: 100,
        height: 100,
        transform: createTestTransform(),
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      });

      editor.addClipPath(elementId, { type: 'rect', x: 10, y: 20, width: 50, height: 60 });

      editor.updateClipPath(elementId, { width: 100 });

      const element = editor.getElement(elementId);
      expect(element?.clipPath?.x).toBe(10);
      expect(element?.clipPath?.y).toBe(20);
      expect(element?.clipPath?.width).toBe(100);
      expect(element?.clipPath?.height).toBe(60);
    });
  });

  // ============================================================
  // Stub Methods (Not Yet Implemented)
  // ============================================================

  describe('stub implementations throw errors', () => {
    it('render should throw not implemented error', () => {
      expect(() => {
        editor.render();
      }).toThrow('Not implemented');
    });

    it('setTool should throw not implemented error', () => {
      expect(() => {
        editor.setTool('pan');
      }).toThrow('Not implemented');
    });

    it('destroy should throw not implemented error', () => {
      expect(() => {
        editor.destroy();
      }).toThrow('Not implemented');
    });

    it('destroy should set isDestroyed to true before throwing', () => {
      expect(editor.isDestroyed).toBe(false);

      try {
        editor.destroy();
      } catch {
        // Expected to throw
      }

      expect(editor.isDestroyed).toBe(true);
    });
  });

  // ============================================================
  // Public API Methods Exist
  // ============================================================

  describe('public API methods exist', () => {
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
});
