import { describe, it, expect, beforeEach } from 'vitest';
import { State, DEFAULT_OPTIONS } from '../../src/core/State.js';
import type { BaseElement, GroupElement } from '../../src/elements/types.js';
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

// Helper to create test elements
function createTestElement(id: string, overrides?: Partial<BaseElement>): BaseElement {
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

// Helper to create group elements
function createGroupElement(id: string, children: string[]): GroupElement {
  return {
    id,
    type: 'group',
    transform: createTestTransform(),
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    children,
  };
}

describe('State', () => {
  let state: State;

  beforeEach(() => {
    state = new State();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(state.state.width).toBe(DEFAULT_OPTIONS.width);
      expect(state.state.height).toBe(DEFAULT_OPTIONS.height);
      expect(state.state.backgroundColor).toBe(DEFAULT_OPTIONS.backgroundColor);
    });

    it('should initialize with custom options', () => {
      const customState = new State({
        width: 800,
        height: 600,
        backgroundColor: '#000000',
      });
      expect(customState.state.width).toBe(800);
      expect(customState.state.height).toBe(600);
      expect(customState.state.backgroundColor).toBe('#000000');
    });

    it('should have empty elements Map initially', () => {
      expect(state.state.elements.size).toBe(0);
    });

    it('should have empty selectedIds Set initially', () => {
      expect(state.state.selectedIds.size).toBe(0);
    });
  });

  describe('getElement', () => {
    it('should return undefined for non-existent element', () => {
      expect(state.getElement('non-existent')).toBeUndefined();
    });

    it('should return element by ID', () => {
      const element = createTestElement('test-1');
      state.addElement(element);
      expect(state.getElement('test-1')).toBe(element);
    });

    it('should return exact element reference', () => {
      const element = createTestElement('test-1');
      state.addElement(element);
      const retrieved = state.getElement('test-1');
      expect(retrieved).toBe(element);
    });
  });

  describe('getAllElements', () => {
    it('should return empty array when no elements', () => {
      expect(state.getAllElements()).toEqual([]);
    });

    it('should return all elements as array', () => {
      const element1 = createTestElement('test-1');
      const element2 = createTestElement('test-2');
      state.addElement(element1);
      state.addElement(element2);

      const elements = state.getAllElements();
      expect(elements).toHaveLength(2);
      expect(elements).toContain(element1);
      expect(elements).toContain(element2);
    });

    it('should return elements in insertion order', () => {
      const element1 = createTestElement('test-1');
      const element2 = createTestElement('test-2');
      const element3 = createTestElement('test-3');
      state.addElement(element1);
      state.addElement(element2);
      state.addElement(element3);

      const elements = state.getAllElements();
      expect(elements[0]).toBe(element1);
      expect(elements[1]).toBe(element2);
      expect(elements[2]).toBe(element3);
    });
  });

  describe('addElement', () => {
    it('should add element to state', () => {
      const element = createTestElement('test-1');
      state.addElement(element);
      expect(state.getElement('test-1')).toBe(element);
    });

    it('should throw error for duplicate ID', () => {
      const element1 = createTestElement('test-1');
      const element2 = createTestElement('test-1');
      state.addElement(element1);

      expect(() => {
        state.addElement(element2);
      }).toThrow('Element with id "test-1" already exists');
    });

    it('should allow adding multiple elements', () => {
      const element1 = createTestElement('test-1');
      const element2 = createTestElement('test-2');
      state.addElement(element1);
      state.addElement(element2);

      expect(state.state.elements.size).toBe(2);
    });
  });

  describe('updateElement', () => {
    it('should throw error for non-existent element', () => {
      expect(() => {
        state.updateElement('non-existent', { opacity: 0.5 });
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should update element properties', () => {
      const element = createTestElement('test-1', { opacity: 1 });
      state.addElement(element);
      state.updateElement('test-1', { opacity: 0.5 });

      expect(state.getElement('test-1')?.opacity).toBe(0.5);
    });

    it('should preserve properties not in updates', () => {
      const element = createTestElement('test-1', { opacity: 1, zIndex: 5 });
      state.addElement(element);
      state.updateElement('test-1', { opacity: 0.5 });

      const updated = state.getElement('test-1');
      expect(updated?.opacity).toBe(0.5);
      expect(updated?.zIndex).toBe(5);
    });

    it('should throw error when trying to change ID', () => {
      const element = createTestElement('test-1');
      state.addElement(element);

      expect(() => {
        state.updateElement('test-1', { id: 'new-id' });
      }).toThrow('Cannot change element id');
    });

    it('should handle partial updates', () => {
      const element = createTestElement('test-1', {
        opacity: 1,
        locked: false,
        visible: true,
      });
      state.addElement(element);
      state.updateElement('test-1', { locked: true });

      const updated = state.getElement('test-1');
      expect(updated?.locked).toBe(true);
      expect(updated?.opacity).toBe(1);
      expect(updated?.visible).toBe(true);
    });
  });

  describe('removeElement', () => {
    it('should throw error for non-existent element', () => {
      expect(() => {
        state.removeElement('non-existent');
      }).toThrow('Element with id "non-existent" not found');
    });

    it('should remove element from state', () => {
      const element = createTestElement('test-1');
      state.addElement(element);
      state.removeElement('test-1');

      expect(state.getElement('test-1')).toBeUndefined();
      expect(state.state.elements.size).toBe(0);
    });

    it('should remove element from selection if selected', () => {
      const element = createTestElement('test-1');
      state.addElement(element);
      state.setSelection(['test-1']);
      expect(state.getSelection()).toContain('test-1');

      state.removeElement('test-1');
      expect(state.getSelection()).not.toContain('test-1');
    });
  });

  describe('setSelection', () => {
    it('should clear previous selection', () => {
      const element1 = createTestElement('test-1');
      const element2 = createTestElement('test-2');
      state.addElement(element1);
      state.addElement(element2);

      state.setSelection(['test-1']);
      state.setSelection(['test-2']);

      const selection = state.getSelection();
      expect(selection).not.toContain('test-1');
      expect(selection).toContain('test-2');
    });

    it('should set new selection', () => {
      const element1 = createTestElement('test-1');
      const element2 = createTestElement('test-2');
      state.addElement(element1);
      state.addElement(element2);

      state.setSelection(['test-1', 'test-2']);

      const selection = state.getSelection();
      expect(selection).toContain('test-1');
      expect(selection).toContain('test-2');
    });

    it('should ignore non-existent element IDs', () => {
      const element = createTestElement('test-1');
      state.addElement(element);

      state.setSelection(['test-1', 'non-existent']);

      const selection = state.getSelection();
      expect(selection).toContain('test-1');
      expect(selection).not.toContain('non-existent');
      expect(selection).toHaveLength(1);
    });

    it('should handle empty array (clear selection)', () => {
      const element = createTestElement('test-1');
      state.addElement(element);
      state.setSelection(['test-1']);
      state.setSelection([]);

      expect(state.getSelection()).toHaveLength(0);
    });

    it('should handle duplicate IDs', () => {
      const element = createTestElement('test-1');
      state.addElement(element);

      state.setSelection(['test-1', 'test-1', 'test-1']);

      // Set deduplicates, so should only have one
      expect(state.getSelection()).toHaveLength(1);
    });
  });

  describe('getSelection', () => {
    it('should return empty array when nothing selected', () => {
      expect(state.getSelection()).toEqual([]);
    });

    it('should return selected IDs as array', () => {
      const element1 = createTestElement('test-1');
      const element2 = createTestElement('test-2');
      state.addElement(element1);
      state.addElement(element2);
      state.setSelection(['test-1', 'test-2']);

      const selection = state.getSelection();
      expect(selection).toHaveLength(2);
      expect(selection).toContain('test-1');
      expect(selection).toContain('test-2');
    });
  });

  describe('snapshot', () => {
    it('should return deep clone of state', () => {
      const element = createTestElement('test-1');
      state.addElement(element);
      state.setSelection(['test-1']);

      const snap = state.snapshot();

      expect(snap.width).toBe(state.state.width);
      expect(snap.height).toBe(state.state.height);
      expect(snap.backgroundColor).toBe(state.state.backgroundColor);
      expect(snap.elements.size).toBe(1);
      expect(snap.selectedIds.size).toBe(1);
    });

    it('should not share references with original state', () => {
      const element = createTestElement('test-1');
      state.addElement(element);

      const snap = state.snapshot();

      // Modify original
      state.addElement(createTestElement('test-2'));

      // Snapshot should be unchanged
      expect(snap.elements.size).toBe(1);
      expect(state.state.elements.size).toBe(2);
    });

    it('should clone elements Map', () => {
      const element = createTestElement('test-1');
      state.addElement(element);

      const snap = state.snapshot();

      expect(snap.elements).not.toBe(state.state.elements);
      expect(snap.elements.get('test-1')).not.toBe(element);
    });

    it('should clone selectedIds Set', () => {
      const element = createTestElement('test-1');
      state.addElement(element);
      state.setSelection(['test-1']);

      const snap = state.snapshot();

      expect(snap.selectedIds).not.toBe(state.state.selectedIds);
    });

    it('should clone transform objects', () => {
      const element = createTestElement('test-1', {
        transform: createTestTransform({ x: 100, y: 200 }),
      });
      state.addElement(element);

      const snap = state.snapshot();
      const snappedElement = snap.elements.get('test-1');

      expect(snappedElement?.transform).not.toBe(element.transform);
      expect(snappedElement?.transform.x).toBe(100);
      expect(snappedElement?.transform.y).toBe(200);
    });

    it('should preserve all state properties', () => {
      const customState = new State({
        width: 800,
        height: 600,
        backgroundColor: '#ff0000',
      });
      const element = createTestElement('test-1', {
        opacity: 0.5,
        zIndex: 10,
        locked: true,
        visible: false,
      });
      customState.addElement(element);
      customState.setSelection(['test-1']);

      const snap = customState.snapshot();

      expect(snap.width).toBe(800);
      expect(snap.height).toBe(600);
      expect(snap.backgroundColor).toBe('#ff0000');

      const snappedElement = snap.elements.get('test-1');
      expect(snappedElement?.opacity).toBe(0.5);
      expect(snappedElement?.zIndex).toBe(10);
      expect(snappedElement?.locked).toBe(true);
      expect(snappedElement?.visible).toBe(false);
    });

    it('should clone GroupElement children array', () => {
      const group = createGroupElement('group-1', ['child-1', 'child-2']);
      state.addElement(group);

      const snap = state.snapshot();
      const snappedGroup = snap.elements.get('group-1') as GroupElement;

      expect(snappedGroup.children).not.toBe(group.children);
      expect(snappedGroup.children).toEqual(['child-1', 'child-2']);
    });
  });

  describe('restore', () => {
    it('should restore state from snapshot', () => {
      const element = createTestElement('test-1');
      state.addElement(element);
      state.setSelection(['test-1']);

      const snap = state.snapshot();

      // Clear state
      state.removeElement('test-1');
      expect(state.state.elements.size).toBe(0);

      // Restore
      state.restore(snap);

      expect(state.state.elements.size).toBe(1);
      expect(state.getElement('test-1')).toBeDefined();
      expect(state.getSelection()).toContain('test-1');
    });

    it('should not share references with snapshot', () => {
      const element = createTestElement('test-1');
      state.addElement(element);
      const snap = state.snapshot();

      state.restore(snap);

      // Modify restored state
      state.addElement(createTestElement('test-2'));

      // Snapshot should be unchanged
      expect(snap.elements.size).toBe(1);
      expect(state.state.elements.size).toBe(2);
    });

    it('should handle empty state restoration', () => {
      state.addElement(createTestElement('test-1'));
      const emptyState = new State();
      const emptySnap = emptyState.snapshot();

      state.restore(emptySnap);

      expect(state.state.elements.size).toBe(0);
      expect(state.getSelection()).toHaveLength(0);
    });

    it('should clear current state before restore', () => {
      state.addElement(createTestElement('old-element'));
      state.setSelection(['old-element']);

      const newState = new State();
      newState.addElement(createTestElement('new-element'));
      const snap = newState.snapshot();

      state.restore(snap);

      expect(state.getElement('old-element')).toBeUndefined();
      expect(state.getElement('new-element')).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should support snapshot-restore roundtrip', () => {
      // Build up state
      const element1 = createTestElement('test-1', { opacity: 0.5 });
      const element2 = createTestElement('test-2', { zIndex: 5 });
      state.addElement(element1);
      state.addElement(element2);
      state.setSelection(['test-1']);

      // Snapshot
      const snap = state.snapshot();

      // Modify state
      state.removeElement('test-1');
      state.updateElement('test-2', { opacity: 0.1 });
      state.setSelection(['test-2']);

      // Restore
      state.restore(snap);

      // Verify restoration
      expect(state.state.elements.size).toBe(2);
      expect(state.getElement('test-1')?.opacity).toBe(0.5);
      expect(state.getElement('test-2')?.zIndex).toBe(5);
      expect(state.getSelection()).toEqual(['test-1']);
    });

    it('should maintain state isolation after snapshot', () => {
      const element = createTestElement('test-1', {
        transform: createTestTransform({ x: 0 }),
      });
      state.addElement(element);

      const snap = state.snapshot();

      // Mutate original element's transform
      element.transform.x = 999;

      // Snapshot should be unaffected
      const snappedElement = snap.elements.get('test-1');
      expect(snappedElement?.transform.x).toBe(0);
    });

    it('should work with complex element types', () => {
      const group = createGroupElement('group-1', ['child-1', 'child-2']);
      const imageElement = createTestElement('image-1', {
        type: 'image',
        transform: createTestTransform({ rotation: 45 }),
      });

      state.addElement(group);
      state.addElement(imageElement);
      state.setSelection(['group-1', 'image-1']);

      const snap = state.snapshot();
      state.restore(snap);

      expect(state.getAllElements()).toHaveLength(2);
      expect((state.getElement('group-1') as GroupElement).children).toEqual([
        'child-1',
        'child-2',
      ]);
      expect(state.getElement('image-1')?.transform.rotation).toBe(45);
    });
  });
});
