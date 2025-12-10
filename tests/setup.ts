/**
 * Test setup file for Vitest
 *
 * This file is automatically loaded before tests run.
 * It sets up the jsdom environment and any global test utilities.
 */

import { afterEach } from 'vitest';

// Clean up after each test
afterEach(() => {
  // Clear the document body after each test
  document.body.innerHTML = '';
});
