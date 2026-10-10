import { vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import factory from '../lib/defaultRoutines.json';

// Android feedback (issues #16/#24): "Excluir rotina" must restore the app's original
// default for that period (never leave it absent: "-" in AGORA, 23:59, link error), and data
// saved by the previous version without a period must still show a usable routine.

const custom = {
  morning: { name: 'Manhã minha', endTime: '07:10', tasks: [{ id: 1, name: 'Café local', minutes: 7, icon: '☕', color: '#123456', extra: 'keep' }] },
  evening: { name: 'Noite minha', endTime: '20:40', tasks: [
    { id: 1, name: 'Jantar meu', minutes: 9, icon: '🍽️', color: '#123456' },
    { id: 2, name: 'Pijama', minutes: 6, icon: '👕', color: '#654321' },
  ] },
};
const FACTORY_EVENING_LINK = '2.n.ba-15.ja-20.co-7.ma-5.de-5.~Xixi_tático-5.do-5.2100';
const stored = () => JSON.parse(localStorage.getItem('routines'));
const btn = (name) => screen.getByRole('button', { name });
const dot = (name) => screen.getByRole('button', { name: new RegExp(`^(Marcar ${name} como feita|${name}: feita)`) });
const openFull = () => { fireEvent.click(btn('Menu dos pais')); fireEvent.click(btn('⚙️ Rotinas')); };

async function start(saved, { evening = true } = {}) {
  localStorage.setItem('routines', typeof saved === 'string' ? saved : JSON.stringify(saved));
  window.history.replaceState(null, '', '/');
  global.fetch = vi.fn(() => Promise.reject(new Error('should not fetch')));
  render(<App />);
  await screen.findAllByRole('button', { name: /^Pular para / });
  if (evening) fireEvent.click(screen.getByRole('button', { name: /Noite/ }));
}

beforeEach(() => {
  localStorage.clear();
  // Only Date is faked (20:00): React/testing-library timers keep running.
  vi.useFakeTimers({ toFake: ['Date'] });
  const d = new Date(); d.setHours(20, 0, 0, 0);
  vi.setSystemTime(d);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); delete window.matchMedia; });

describe('full editor: Excluir rotina restores the app default of that period', () => {
  test('current period: confirmation, draft until Salvar, factory routine, morning byte-identical, readable link', async () => {
    const original = JSON.stringify({ monday: custom });
    await start(original);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    openFull();
    fireEvent.click(btn('Excluir rotina Noite minha'));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toMatch(/padrão original do aplicativo/);
    expect(confirm.mock.calls[0][0]).toMatch(/Manhã minha.*não muda/);
    // Declined: nothing changes.
    expect(screen.getByDisplayValue('Jantar meu')).toBeInTheDocument();
    confirm.mockReturnValue(true);
    fireEvent.click(btn('Excluir rotina Noite minha'));
    expect(screen.queryByDisplayValue('Jantar meu')).toBeNull();
    expect(screen.getByDisplayValue('Xixi tático')).toBeInTheDocument();
    expect(screen.getByDisplayValue('21:00')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Noite voltou ao padrão original do aplicativo');
    // Cancelar the whole editor: nothing persisted.
    fireEvent.click(btn('Cancelar'));
    expect(localStorage.getItem('routines')).toBe(original);
    expect(btn('Pular para Jantar meu')).toBeInTheDocument();

    openFull();
    fireEvent.click(btn('Excluir rotina Noite minha'));
    fireEvent.click(btn('Salvar Alterações'));
    expect(stored().monday.evening).toEqual(factory.monday.evening);
    expect(JSON.stringify(stored().monday.morning)).toBe(JSON.stringify(custom.morning));
    expect(new URLSearchParams(window.location.search).get('rotina')).toBe(FACTORY_EVENING_LINK);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(btn('Pular para Banho')).toBeInTheDocument();
    expect(screen.getByText('TERMINA 21:00')).toBeInTheDocument();
    expect(screen.queryByText('-')).toBeNull();
  });

  test('restoring the current period resets its run (marks of the deleted routine do not carry over)', async () => {
    await start({ monday: { ...custom, evening: factory.monday.evening } });
    // Same ids as the factory routine, but this run's marks belong to the routine being reset.
    fireEvent.click(dot('Banho'));
    expect(dot('Banho')).toHaveAttribute('aria-pressed', 'true');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    openFull();
    fireEvent.change(screen.getByDisplayValue('Banho'), { target: { value: 'Banho longo' } });
    fireEvent.click(btn('Excluir rotina Noite'));
    fireEvent.click(btn('Salvar Alterações'));
    expect(dot('Banho')).toHaveAttribute('aria-pressed', 'false');
  });

  test('other period: morning restored, evening (active) untouched with its marks and link', async () => {
    const original = JSON.stringify({ monday: custom });
    await start(original);
    fireEvent.click(dot('Pijama'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    openFull();
    fireEvent.click(btn('Excluir rotina Manhã minha'));
    fireEvent.click(btn('Salvar Alterações'));
    expect(stored().monday.morning).toEqual(factory.monday.morning);
    expect(JSON.stringify(stored().monday.evening)).toBe(JSON.stringify(custom.evening));
    expect(new URLSearchParams(window.location.search).get('rotina')).toBe('2.n.~Jantar_meu-9.~Pijama-6.2040');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(dot('Pijama')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Manhã/ }));
    expect(btn('Pular para Acordar')).toBeInTheDocument();
  });

  test('a routine left without tasks cannot be saved', async () => {
    await start({ monday: custom });
    openFull();
    const evening = screen.getByRole('group', { name: 'Rotina Noite minha' });
    for (const b of within(evening).getAllByRole('button', { name: 'Remover tarefa' })) fireEvent.click(b);
    expect(btn('Salvar Alterações')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Noite minha está sem tarefas');
  });
});

test('edit mode: removing every task blocks Salvar (no empty routine)', async () => {
  const original = JSON.stringify({ monday: custom });
  await start(original);
  fireEvent.click(btn('Editar rotina'));
  for (const name of ['Jantar meu', 'Pijama']) {
    fireEvent.click(btn(`Mais opções de ${name}`));
    fireEvent.click(btn('Remover tarefa'));
  }
  expect(btn('Salvar')).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('A rotina precisa de pelo menos uma tarefa');
  fireEvent.click(btn('Salvar'));
  expect(localStorage.getItem('routines')).toBe(original);
  fireEvent.click(btn('Cancelar'));
  expect(btn('Pular para Jantar meu')).toBeInTheDocument();
});

describe('data saved without the current period (previous version)', () => {
  test('evening missing: factory evening is shown (not "-"/23:59), storage untouched until saved; saving keeps morning', async () => {
    const original = JSON.stringify({ monday: { morning: custom.morning } });
    await start(original);
    expect(btn('Pular para Banho')).toBeInTheDocument();
    expect(screen.getByText('TERMINA 21:00')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Rotina recuperada' })).toHaveTextContent('padrão original do aplicativo');
    expect(localStorage.getItem('routines')).toBe(original);
    // Saving from the edit mode, even with no change, stores the shown routine.
    fireEvent.click(btn('Editar rotina'));
    fireEvent.click(btn('Salvar'));
    expect(stored().monday.evening).toEqual(factory.monday.evening);
    expect(JSON.stringify(stored().monday.morning)).toBe(JSON.stringify(custom.morning));
    expect(new URLSearchParams(window.location.search).get('rotina')).toBe(FACTORY_EVENING_LINK);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status', { name: 'Rotina recuperada' })).toBeNull();
  });

  test('evening with no tasks: same recovery; the full editor shows it and saves it', async () => {
    await start({ monday: { morning: custom.morning, evening: { name: 'Noite', endTime: '20:00', tasks: [] } } });
    expect(btn('Pular para Banho')).toBeInTheDocument();
    openFull();
    expect(screen.getByDisplayValue('Xixi tático')).toBeInTheDocument();
    fireEvent.click(btn('Salvar Alterações'));
    expect(stored().monday.evening).toEqual(factory.monday.evening);
    expect(JSON.stringify(stored().monday.morning)).toBe(JSON.stringify(custom.morning));
  });
});

describe('phone: one compact closing area', () => {
  const phone = () => { window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} }); };

  test('no duplicated closing panel inside the ribbon; the footer carries name, time and controls', async () => {
    phone();
    await start({ monday: custom });
    expect(screen.queryByTestId('phone-closing')).toBeNull();
    const footer = screen.getByTestId('phone-final');
    expect(footer).toHaveTextContent('Hora de dormir');
    expect(footer).toHaveTextContent('20:40');
    expect(within(footer).getByRole('button', { name: 'Mais 5 minutos até Hora de dormir' })).toBeInTheDocument();
    expect(within(footer).getByRole('button', { name: 'Editar rotina' })).toBeInTheDocument();
  });

  test('banners live inside the phone screen, not above a full-height page', async () => {
    phone();
    await start({ monday: { morning: custom.morning } });
    const shell = screen.getByTestId('phone-shell');
    expect(within(shell).getByRole('status', { name: 'Rotina recuperada' })).toBeInTheDocument();
    expect(within(shell).getByRole('heading', { name: 'Rotina da Nina' })).toBeInTheDocument();
    expect(within(shell).getByTestId('phone-final')).toBeInTheDocument();
  });
});
