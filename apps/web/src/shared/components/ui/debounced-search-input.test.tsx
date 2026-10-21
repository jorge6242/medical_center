import { fireEvent, render, screen, act } from '@testing-library/react';

import { DebouncedSearchInput } from './debounced-search-input';

it('syncs browser navigation values without emitting stale draft or losing focus', () => {
  jest.useFakeTimers();
  const onChange = jest.fn();
  const { rerender } = render(<DebouncedSearchInput value="ana" onChange={onChange} />);
  const input = screen.getByRole('textbox');
  input.focus();
  fireEvent.change(input, { target: { value: 'draft' } });
  rerender(<DebouncedSearchInput value="previous" onChange={onChange} />);
  expect(input).toHaveValue('previous');
  act(() => jest.advanceTimersByTime(350));
  expect(onChange).not.toHaveBeenCalled();
  expect(input).toHaveFocus();
});
