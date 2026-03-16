// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// mock ESM-only markdown 相关库，避免 Jest 解析 node_modules 出错
jest.mock('react-markdown', () => {
  return function MockReactMarkdown() {
    return null;
  };
});

jest.mock('rehype-sanitize', () => ({}));
jest.mock('remark-gfm', () => ({}));

// mock axios（axios 为 ESM 包，直接解析会在 Jest 下报错）
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));
