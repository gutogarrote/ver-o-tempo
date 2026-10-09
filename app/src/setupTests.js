import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Testing Library detects fake timers through the Jest name and advances them in waitFor.
// Keep that detection working with Vitest's compatible timer API (including findBy queries).
globalThis.jest = vi;
