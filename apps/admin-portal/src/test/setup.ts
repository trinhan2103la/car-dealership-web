import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// Gắn matcher jest-dom vào expect của Vitest (kiểu khai báo ở ./jest-dom.d.ts).
expect.extend(matchers);
afterEach(() => cleanup());
