import { describe, it, expect, beforeEach } from 'vitest';
import { History } from '../../src/core/History.js';
import type { CanvasState } from '../../src/core/types.js';

// Helper to create test states
function createState(id: number): CanvasState {
  return {
    width: 100 + id,
    height: 100 + id,
    backgroundColor: `#${String(id)}${String(id)}${String(id)}`,
    elements: new Map(),
    selectedIds: new Set(),
  };
}

describe('History', () => {
  let history: History;

  beforeEach(() => {
    history = new History();
  });

  describe('constructor', () => {
    it('should use default limit of 50', () => {
      expect(history.limit).toBe(50);
    });

    it('should accept custom limit', () => {
      const customHistory = new History(10);
      expect(customHistory.limit).toBe(10);
    });
  });

  describe('push', () => {
    it('should add state to undo stack', () => {
      const state = createState(1);
      history.push(state);
      expect(history.size()).toBe(1);
    });

    it('should clear redo stack when pushing', () => {
      history.push(createState(1));
      history.push(createState(2));
      history.undo(); // Now redo has one item
      expect(history.canRedo()).toBe(true);

      history.push(createState(3)); // Should clear redo
      expect(history.canRedo()).toBe(false);
    });

    it('should respect the limit by removing oldest states', () => {
      const smallHistory = new History(3);
      smallHistory.push(createState(1));
      smallHistory.push(createState(2));
      smallHistory.push(createState(3));
      expect(smallHistory.size()).toBe(3);

      smallHistory.push(createState(4));
      expect(smallHistory.size()).toBe(3); // Still 3, oldest removed
    });
  });

  describe('undo', () => {
    it('should return undefined when undo stack has 0 elements', () => {
      expect(history.undo()).toBeUndefined();
    });

    it('should return undefined when undo stack has only 1 element', () => {
      history.push(createState(1));
      expect(history.undo()).toBeUndefined();
    });

    it('should return previous state', () => {
      const state1 = createState(1);
      const state2 = createState(2);
      history.push(state1);
      history.push(state2);

      const result = history.undo();
      expect(result).toBe(state1);
    });

    it('should move current state to redo stack', () => {
      history.push(createState(1));
      history.push(createState(2));
      expect(history.canRedo()).toBe(false);

      history.undo();
      expect(history.canRedo()).toBe(true);
    });

    it('should allow multiple undos', () => {
      const state1 = createState(1);
      const state2 = createState(2);
      const state3 = createState(3);
      history.push(state1);
      history.push(state2);
      history.push(state3);

      expect(history.undo()).toBe(state2);
      expect(history.undo()).toBe(state1);
      expect(history.undo()).toBeUndefined(); // Can't undo past first state
    });
  });

  describe('redo', () => {
    it('should return undefined when redo stack is empty', () => {
      expect(history.redo()).toBeUndefined();
    });

    it('should return the undone state', () => {
      const state1 = createState(1);
      const state2 = createState(2);
      history.push(state1);
      history.push(state2);
      history.undo();

      const result = history.redo();
      expect(result).toBe(state2);
    });

    it('should move state back to undo stack', () => {
      history.push(createState(1));
      history.push(createState(2));
      history.undo();
      expect(history.size()).toBe(1);

      history.redo();
      expect(history.size()).toBe(2);
    });

    it('should allow multiple redos', () => {
      const state1 = createState(1);
      const state2 = createState(2);
      const state3 = createState(3);
      history.push(state1);
      history.push(state2);
      history.push(state3);

      history.undo();
      history.undo();

      expect(history.redo()).toBe(state2);
      expect(history.redo()).toBe(state3);
      expect(history.redo()).toBeUndefined(); // Nothing more to redo
    });
  });

  describe('canUndo', () => {
    it('should return false when stack is empty', () => {
      expect(history.canUndo()).toBe(false);
    });

    it('should return false when stack has only 1 element', () => {
      history.push(createState(1));
      expect(history.canUndo()).toBe(false);
    });

    it('should return true when stack has more than 1 element', () => {
      history.push(createState(1));
      history.push(createState(2));
      expect(history.canUndo()).toBe(true);
    });
  });

  describe('canRedo', () => {
    it('should return false when redo stack is empty', () => {
      expect(history.canRedo()).toBe(false);
    });

    it('should return true after undo', () => {
      history.push(createState(1));
      history.push(createState(2));
      history.undo();
      expect(history.canRedo()).toBe(true);
    });

    it('should return false after push clears redo', () => {
      history.push(createState(1));
      history.push(createState(2));
      history.undo();
      history.push(createState(3));
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should empty both stacks', () => {
      history.push(createState(1));
      history.push(createState(2));
      history.undo();
      expect(history.size()).toBe(1);
      expect(history.canRedo()).toBe(true);

      history.clear();
      expect(history.size()).toBe(0);
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('size', () => {
    it('should return 0 for empty history', () => {
      expect(history.size()).toBe(0);
    });

    it('should return correct count after pushes', () => {
      history.push(createState(1));
      expect(history.size()).toBe(1);
      history.push(createState(2));
      expect(history.size()).toBe(2);
    });

    it('should decrease after undo', () => {
      history.push(createState(1));
      history.push(createState(2));
      expect(history.size()).toBe(2);

      history.undo();
      expect(history.size()).toBe(1);
    });

    it('should increase after redo', () => {
      history.push(createState(1));
      history.push(createState(2));
      history.undo();
      expect(history.size()).toBe(1);

      history.redo();
      expect(history.size()).toBe(2);
    });
  });

  describe('integration', () => {
    it('should handle undo-redo-push workflow correctly', () => {
      const state1 = createState(1);
      const state2 = createState(2);
      const state3 = createState(3);
      const state4 = createState(4);

      // Build history
      history.push(state1);
      history.push(state2);
      history.push(state3);

      // Undo twice
      expect(history.undo()).toBe(state2);
      expect(history.undo()).toBe(state1);

      // Redo once
      expect(history.redo()).toBe(state2);

      // Push new state (should clear remaining redo)
      history.push(state4);
      expect(history.canRedo()).toBe(false);

      // Verify final state
      expect(history.size()).toBe(3); // state1, state2, state4
      expect(history.undo()).toBe(state2);
    });
  });
});
