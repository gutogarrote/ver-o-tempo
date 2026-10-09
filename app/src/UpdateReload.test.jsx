import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

vi.mock('./pages/Home', () => ({ default: ({ routines }) => <pre data-testid="loaded-routines">{JSON.stringify(routines)}</pre> }));
vi.mock('./components/AudioAlerts', () => ({ default: () => null }));
const saved = { monday: { morning: { name: 'Manhã própria', endTime: '07:20', tasks: [
  { id: 99, name: 'Café da manhã', minutes: 20, color: '#123456', icon: '🌟', extra: 'preserve' },
] }, evening: { name: 'Noite', endTime: '20:00', tasks: [] } } };

beforeEach(() => {
  window.history.replaceState(null, '', '/?rotina=1.m.cf-20.0720');
  localStorage.setItem('routines', JSON.stringify(saved));
  localStorage.setItem('unrelated', 'keep');
});

test('update reload preserves exact saved configuration including colors, icons, ids and other periods', async () => {
  render(<App preserveUpdate />);
  expect(await screen.findByTestId('loaded-routines')).toHaveTextContent(JSON.stringify(saved));
  expect(localStorage.getItem('routines')).toBe(JSON.stringify(saved));
  expect(localStorage.getItem('unrelated')).toBe('keep');
});

test('a normal visit still gives the URL precedence over saved configuration', async () => {
  render(<App />);
  expect(await screen.findByTestId('loaded-routines')).not.toHaveTextContent('Manhã própria');
  expect(localStorage.getItem('routines')).not.toBe(JSON.stringify(saved));
});
