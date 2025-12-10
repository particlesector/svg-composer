import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../../src/core/EventEmitter.js';

// Test event types
interface TestEvents {
  'test:event': { value: number };
  'test:other': { message: string };
}

// Expose protected emit for testing
class TestableEventEmitter extends EventEmitter<TestEvents> {
  public testEmit<K extends keyof TestEvents>(event: K, data: TestEvents[K]): void {
    this.emit(event, data);
  }
}

describe('EventEmitter', () => {
  describe('on', () => {
    it('should subscribe handler and receive events', () => {
      const emitter = new TestableEventEmitter();
      const handler = vi.fn();

      emitter.on('test:event', handler);
      emitter.testEmit('test:event', { value: 42 });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('should allow multiple handlers for same event', () => {
      const emitter = new TestableEventEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('test:event', handler1);
      emitter.on('test:event', handler2);
      emitter.testEmit('test:event', { value: 1 });

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('should not fire handlers for different events', () => {
      const emitter = new TestableEventEmitter();
      const handler = vi.fn();

      emitter.on('test:event', handler);
      emitter.testEmit('test:other', { message: 'hello' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should unsubscribe handler and stop receiving events', () => {
      const emitter = new TestableEventEmitter();
      const handler = vi.fn();

      emitter.on('test:event', handler);
      emitter.testEmit('test:event', { value: 1 });
      expect(handler).toHaveBeenCalledOnce();

      emitter.off('test:event', handler);
      emitter.testEmit('test:event', { value: 2 });
      expect(handler).toHaveBeenCalledOnce(); // Still just once
    });

    it('should not throw when unsubscribing non-existent handler', () => {
      const emitter = new TestableEventEmitter();
      const handler = vi.fn();

      expect(() => {
        emitter.off('test:event', handler);
      }).not.toThrow();
    });

    it('should not throw when unsubscribing from event with no handlers', () => {
      const emitter = new TestableEventEmitter();
      const handler = vi.fn();

      expect(() => {
        emitter.off('test:event', handler);
      }).not.toThrow();
    });

    it('should only remove the specific handler', () => {
      const emitter = new TestableEventEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('test:event', handler1);
      emitter.on('test:event', handler2);
      emitter.off('test:event', handler1);
      emitter.testEmit('test:event', { value: 1 });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });
  });

  describe('once', () => {
    it('should fire handler only once', () => {
      const emitter = new TestableEventEmitter();
      const handler = vi.fn();

      emitter.once('test:event', handler);
      emitter.testEmit('test:event', { value: 1 });
      emitter.testEmit('test:event', { value: 2 });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ value: 1 });
    });

    it('should auto-unsubscribe after first call', () => {
      const emitter = new TestableEventEmitter();
      const handler = vi.fn();

      emitter.once('test:event', handler);
      emitter.testEmit('test:event', { value: 1 });

      // Handler should be removed, so emitting again should not call it
      handler.mockClear();
      emitter.testEmit('test:event', { value: 2 });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('should pass correct data to handlers', () => {
      const emitter = new TestableEventEmitter();
      const handler = vi.fn();

      emitter.on('test:event', handler);
      emitter.testEmit('test:event', { value: 123 });

      expect(handler).toHaveBeenCalledWith({ value: 123 });
    });

    it('should not throw when emitting with no handlers', () => {
      const emitter = new TestableEventEmitter();

      expect(() => {
        emitter.testEmit('test:event', { value: 1 });
      }).not.toThrow();
    });

    it('should call handlers in order of registration', () => {
      const emitter = new TestableEventEmitter();
      const order: number[] = [];

      emitter.on('test:event', () => order.push(1));
      emitter.on('test:event', () => order.push(2));
      emitter.on('test:event', () => order.push(3));
      emitter.testEmit('test:event', { value: 0 });

      expect(order).toEqual([1, 2, 3]);
    });
  });
});
