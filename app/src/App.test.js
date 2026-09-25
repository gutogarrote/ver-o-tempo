import { render, screen } from '@testing-library/react';
import App from './App';

test('shows loading state while routines load', () => {
  global.fetch = jest.fn(() => new Promise(() => {}));
  render(<App />);
  expect(screen.getByText(/carregando rotinas/i)).toBeInTheDocument();
});
