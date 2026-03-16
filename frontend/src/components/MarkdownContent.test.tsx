import React from 'react';
import { render } from '@testing-library/react';
import { MarkdownContent } from './MarkdownContent';

test('MarkdownContent renders without crash', () => {
  const { container } = render(<MarkdownContent content={'**加粗文本**'} />);
  expect(container.firstChild).toBeInTheDocument();
});

