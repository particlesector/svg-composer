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
  // Stub Methods (Not Yet Implemented)
  // ============================================================

  describe('stub implementations throw errors', () => {
    it('getElementsInBounds should throw not implemented error', () => {
      expect(() => {
        editor.getElementsInBounds({ x: 0, y: 0, width: 100, height: 100 });
      }).toThrow('Not implemented');
    });

    it('toSVG should throw not implemented error', () => {
      expect(() => editor.toSVG()).toThrow('Not implemented');
    });

    it('moveElement should throw not implemented error', () => {
      expect(() => {
        editor.moveElement('id', 10, 10);
      }).toThrow('Not implemented');
    });

    it('render should throw not implemented error', () => {
      expect(() => { editor.render(); }).toThrow('Not implemented');
    });

    it('clear should throw not implemented error', () => {
      expect(() => { editor.clear(); }).toThrow('Not implemented');
    });

    it('setTool should throw not implemented error', () => {
      expect(() => { editor.setTool('pan'); }).toThrow('Not implemented');
    });

    it('toJSON should throw not implemented error', () => {
      expect(() => editor.toJSON()).toThrow('Not implemented');
    });

    it('fromJSON should throw not implemented error', () => {
      expect(() => { editor.fromJSON('{}'); }).toThrow('Not implemented');
    });

    it('removeClipPath should throw not implemented error', () => {
      expect(() => { editor.removeClipPath('id'); }).toThrow('Not implemented');
    });

    it('updateClipPath should throw not implemented error', () => {
      expect(() => { editor.updateClipPath('id', {}); }).toThrow('Not implemented');
    });

    it('addClipPath should throw not implemented error', () => {
      expect(() => editor.addClipPath('id', { type: 'rect' })).toThrow('Not implemented');
    });

    it('resetTransform should throw not implemented error', () => {
      expect(() => { editor.resetTransform('id'); }).toThrow('Not implemented');
    });

    it('scaleElement should throw not implemented error', () => {
      expect(() => { editor.scaleElement('id', 1, 1); }).toThrow('Not implemented');
    });

    it('rotateElement should throw not implemented error', () => {
      expect(() => { editor.rotateElement('id', 90); }).toThrow('Not implemented');
    });

    it('setPosition should throw not implemented error', () => {
      expect(() => { editor.setPosition('id', 0, 0); }).toThrow('Not implemented');
    });

    it('destroy should throw not implemented error', () => {
      expect(() => { editor.destroy(); }).toThrow('Not implemented');
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
