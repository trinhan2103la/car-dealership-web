import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

/**
 * jest-dom 7.0.1 mở rộng `Assertion<T>` (một tham số), còn Vitest 5 khai báo `Assertion<R, T>` nên phần mở rộng
 * đó không gộp được. Vitest 5 cho mở rộng qua `Matchers<R, T>` (Assertion kế thừa Matchers), nên khai báo ở đây.
 * Gỡ file này khi jest-dom hỗ trợ Vitest 5.
 */
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown>
    extends TestingLibraryMatchers<unknown, R> {}
}
