import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders main layout and tabs', () => {
  render(<App />);
  expect(screen.getByText('AI医疗助手')).toBeInTheDocument();
  expect(screen.getByText('智能问诊')).toBeInTheDocument();
  expect(screen.getByText('知识库管理')).toBeInTheDocument();
});
