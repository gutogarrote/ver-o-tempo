import { vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

const defaults = { monday: {
  morning: { name: 'Manhã local', endTime: '06:30', tasks: [{ id: 1, name: 'Café local', minutes: 5, icon: '☕', color: '#123456' }] },
  evening: { name: 'Noite local', endTime: '21:00', tasks: [{ id: 1, name: 'Jantar local', minutes: 5, icon: '🍽️', color: '#123456' }] },
} };
const stored = () => JSON.parse(localStorage.getItem('routines'));
const open = search => window.history.replaceState({}, '', '/' + search);
const edit = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
  fireEvent.click(screen.getByRole('button', { name: /Editar esta rotina/ }));
};
beforeEach(() => {
  localStorage.clear();
  open('');
  global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(defaults) }));
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

test('shows loading state while routines load', () => {
  global.fetch = vi.fn(() => new Promise(() => {}));
  render(<App />);
  expect(screen.getByText(/carregando rotinas/i)).toBeInTheDocument();
});

test('URL beats local, selects evening, preserves morning and edits across ticks/plain reentry; reload restores URL', async () => {
  vi.useFakeTimers();
  localStorage.setItem('routines', JSON.stringify(defaults));
  open('?rotina=1%7Cn%7Cba%3A15%2Cja%3A20');
  const view = render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Banho' })).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(stored().monday.morning).toEqual(defaults.monday.morning);
  edit();
  fireEvent.change(screen.getByDisplayValue('Banho'), { target: { value: 'Banho editado' } });
  fireEvent.change(screen.getByDisplayValue('15'), { target: { value: '12' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Mover tarefa para baixo' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Save Routine' }));
  act(() => vi.advanceTimersByTime(3000));
  view.rerender(<App />);
  expect(screen.getByRole('button', { name: 'Pular para Banho editado' })).toBeInTheDocument();
  expect(stored().monday.evening.tasks.map(t => [t.name, t.minutes])).toEqual([['Jantar', 20], ['Banho editado', 12]]);
  view.unmount();
  vi.useRealTimers();
  open('?utm=irrelevant');
  const { unmount } = render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /Noite/ }));
  expect(screen.getByRole('button', { name: 'Pular para Banho editado' })).toBeInTheDocument();
  unmount();
  open('?rotina=1%7Cn%7Cba%3A15%2Cja%3A20');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Banho' })).toBeInTheDocument();
  expect(stored().monday.evening.tasks[0].minutes).toBe(15);
});

test('URL beats fetched defaults on a fresh browser', async () => {
  open('?rotina=1%7Cn%7Cba%3A15');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Banho' })).toBeInTheDocument();
  expect(stored().monday.morning).toEqual(defaults.monday.morning);
  expect(stored().monday.evening.tasks[0]).toMatchObject({ name: 'Banho', minutes: 15 });
});

test.each(['?rotina=2%7Cn%7Cba%3A15', '?rotina=%FF', '?rotina=1%7Cn%7Cba%3A0'])('invalid link %s preserves storage byte for byte', async search => {
  const original = JSON.stringify({ monday: { morning: { name: 'Personalizada', tasks: [{ id: 1, name: 'Nunca carregar', minutes: 5 }] } } });
  localStorage.setItem('routines', original);
  open(search);
  render(<App />);
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar');
  expect(await screen.findByRole('button', { name: 'Pular para Café local' })).toBeInTheDocument();
  expect(localStorage.getItem('routines')).toBe(original);
});

test('invalid link falls back to defaults without writing storage', async () => {
  open('?rotina=bad');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Café local' })).toBeInTheDocument();
  expect(localStorage.getItem('routines')).toBeNull();
});

test.each(['?rotina=1.m.~%25FF-5', '?rotina=1.n.~%25FF-5', '?rotina=1.m.~%25ZZ-5', '?rotina=1.n.~%25ZZ-5'])('malformed %s preserves both periods and root restores them in the same context', async search => {
  const custom = { monday: {
    morning: { ...defaults.monday.morning, tasks: [{ id: 1, name: 'Manhã preservada', minutes: 8 }] },
    evening: { ...defaults.monday.evening, tasks: [{ id: 1, name: 'Noite preservada', minutes: 9 }] },
  } };
  const original = JSON.stringify(custom);
  localStorage.setItem('routines', original);
  localStorage.setItem('unrelated', 'keep');
  open(search);
  const view = render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Café local' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar diagnóstico' }));
  const diagnostic = JSON.parse(screen.getByRole('textbox', { name: 'Diagnóstico do link recebido' }).value);
  expect(diagnostic.received.search).toBe(search);
  expect(diagnostic.received.href).toBe(window.location.href);
  expect(diagnostic.parser.stage).toMatch(/^custom-name/);
  expect(localStorage.getItem('routines')).toBe(original);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  view.unmount();
  open('');
  global.fetch.mockClear();
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Manhã preservada' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Noite/ }));
  expect(screen.getByRole('button', { name: 'Pular para Noite preservada' })).toBeInTheDocument();
  expect(stored()).toEqual(custom);
  expect(localStorage.getItem('unrelated')).toBe('keep');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('irrelevant query loads defaults then keeps local config', async () => {
  open('?utm=%FF');
  const view = render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Café local' })).toBeInTheDocument();
  expect(stored()).toEqual(defaults);
  view.unmount();
  global.fetch.mockClear();
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Café local' })).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('custom HTML-looking name renders as text', async () => {
  const name = '<img src=x onerror=alert(1)>';
  open('?' + new URLSearchParams({ rotina: '1|n|~' + encodeURIComponent(name) + ':5' }));
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para ' + name })).toBeInTheDocument();
  expect(screen.queryAllByRole('img', { hidden: true }).filter(img => img.getAttribute('src') === 'x')).toHaveLength(0);
});

test('URL works if storage and default fetch fail', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  global.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  open('?rotina=1%7Cn%7Cba%3A15');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Banho' })).toBeInTheDocument();
});


test.each([['0720', 'morning', 'Café local', '07:20'], ['1930', 'evening', 'Jantar local', '19:30'], ['1200', 'evening', 'Jantar local', '12:00'], ['0000', 'morning', 'Café local', '00:00'], ['2359', 'evening', 'Jantar local', '23:59']])('pathname /%s uses defaults despite custom storage', async (time, period, name, endTime) => {
  const original = JSON.stringify({ monday: { morning: { tasks: [{ name: 'Personalizada' }] }, evening: { tasks: [{ name: 'Personalizada' }] } } });
  localStorage.setItem('routines', original);
  open(time);
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para ' + name })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
  expect(screen.getByDisplayValue(endTime)).toBeInTheDocument();
  expect(localStorage.getItem('routines')).toBe(original);
});

test.each(['2400', '1260', '0720/', 'bad'])('invalid pathname /%s safely preserves storage', async pathname => {
  const original = JSON.stringify({ monday: { morning: { tasks: [{ name: 'Personalizada' }] } } });
  localStorage.setItem('routines', original);
  open(pathname);
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Café local' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(localStorage.getItem('routines')).toBe(original);
});

test.each([false, true])('clean compound renders and survives editing on phone=%s with query precedence', async phone => {
  window.matchMedia = vi.fn(() => ({ matches: phone, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  open('0720?rotina=1.n.ma-de-5.1930');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Lavar as mãos + Escovar os dentes' })).toHaveTextContent('🧼🪥');
  expect(stored().monday.evening.endTime).toBe('19:30');
  edit();
  fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Routine' }));
  expect(stored().monday.evening.tasks[0]).toMatchObject({ minutes: 7, catalogIds: ['ma', 'de'], icon: '🧼🪥' });
  delete window.matchMedia;
});

test('full editor preserves compound metadata and changed duration', async () => {
  open('?rotina=1.n.ma-de-5');
  render(<App />);
  await screen.findByRole('button', { name: 'Pular para Lavar as mãos + Escovar os dentes' });
  fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
  fireEvent.click(screen.getByRole('button', { name: /Rotinas/ }));
  // Full editor lists the fixture morning first, then the URL's single evening task.
  const durations = screen.getAllByRole('spinbutton');
  expect(durations).toHaveLength(2);
  expect(durations[1]).toHaveValue(5);
  fireEvent.change(durations[1], { target: { value: '8' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  expect(stored().monday.evening.tasks[0]).toMatchObject({ minutes: 8, catalogIds: ['ma', 'de'], icon: '🧼🪥' });
});

test.each(['/0720', '/1930', '/2400'])('bundled safe defaults survive fetch failure at %s', async pathname => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  global.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  window.history.replaceState({}, '', pathname);
  localStorage.setItem('routines', 'keep these exact bytes');
  render(<App />);
  expect(await screen.findByRole('button', { name: pathname === '/1930' ? 'Pular para Banho' : 'Pular para Acordar' })).toBeInTheDocument();
  expect(localStorage.getItem('routines')).toBe('keep these exact bytes');
});

test('required example saves exact URL, preserves storage/history and reload reproduces edits', async () => {
  localStorage.setItem('routines', JSON.stringify(defaults));
  localStorage.setItem('unrelated', 'keep');
  open('?rotina=1.n.ma-5.co-5.ba-20.ja-25.ma-de-5.2040');
  window.history.replaceState({ keep: true }, '', window.location.href);
  const view = render(<App />);
  await screen.findByRole('button', { name: 'Pular para Jantar' });
  const replace = vi.spyOn(window.history, 'replaceState');
  const historyLength = window.history.length;
  edit();
  for (let i = 0; i < 2; i++) fireEvent.click(screen.getAllByRole('button', { name: 'Mover tarefa para cima' })[3 - i]);
  fireEvent.change(screen.getAllByRole('spinbutton')[2], { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Routine' }));
  expect(window.location.href).toBe(window.location.origin + '/?rotina=2.n.ma-5.ja-25.co-10.ba-20.ma-de-5.2040');
  expect(replace).toHaveBeenCalledTimes(1);
  expect(window.history.state).toEqual({ keep: true });
  expect(window.history.length).toBe(historyLength);
  expect(global.fetch).not.toHaveBeenCalled();
  expect(stored().monday.morning).toEqual(defaults.monday.morning);
  expect(localStorage.getItem('unrelated')).toBe('keep');
  view.unmount();
  render(<App />);
  await screen.findByRole('button', { name: 'Pular para Jantar' });
  edit();
  expect(screen.getAllByRole('spinbutton').map(input => input.value)).toEqual(['5', '25', '10', '20', '5']);
  expect(stored().monday.evening.endTime).toBe('20:40');
});

test.each(['0900', '2045'])('save from /%s produces complete query with custom name and preserves params/hash', async time => {
  const otherPeriod = time === '0900' ? 'evening' : 'morning';
  const customOther = { name: 'Outra rotina preservada', tasks: [{ id: 1, name: 'Meu costume', minutes: 15 }] };
  localStorage.setItem('routines', JSON.stringify({ ...defaults, monday: { ...defaults.monday, [otherPeriod]: customOther }, sunday: defaults.monday }));
  localStorage.setItem('unrelated', 'keep');
  open(time + '?utm=a&tag=one&tag=two#familia');
  const view = render(<App />);
  const name = time === '0900' ? 'Café local' : 'Jantar local';
  await screen.findByRole('button', { name: 'Pular para ' + name });
  edit();
  fireEvent.change(screen.getByDisplayValue(name), { target: { value: 'Água. música-quente + 50%' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Routine' }));
  expect(stored().monday[otherPeriod]).toEqual(customOther);
  expect(stored().sunday).toEqual(defaults.monday);
  expect(localStorage.getItem('unrelated')).toBe('keep');
  expect(window.location.pathname).toBe('/');
  expect(new URLSearchParams(window.location.search).get('utm')).toBe('a');
  expect(new URLSearchParams(window.location.search).getAll('tag')).toEqual(['one', 'two']);
  expect(window.location.hash).toBe('#familia');
  expect(window.location.search).toContain('.' + time);
  view.unmount();
  localStorage.removeItem('routines');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Água. música-quente + 50%' })).toBeInTheDocument();
});

test('full editor saves final time and renamed compound alongside unchanged compound through reload', async () => {
  open('?rotina=1.n.ma-de-5.ma-ma-10.2040');
  const view = render(<App />);
  await screen.findByRole('button', { name: 'Pular para Lavar as mãos + Escovar os dentes' });
  fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
  fireEvent.click(screen.getByRole('button', { name: /Rotinas/ }));
  const name = screen.getByDisplayValue('Lavar as mãos + Escovar os dentes');
  fireEvent.change(name, { target: { value: 'Dentes. mãos-e música' } });
  fireEvent.change(screen.getByDisplayValue('20:40'), { target: { value: '22:15' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  expect(window.location.search).toContain('ma-ma-10.2215');
  expect(window.location.search).toContain('~Dentes');
  view.unmount();
  localStorage.removeItem('routines');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Dentes. mãos-e música' })).toBeInTheDocument();
  expect(stored().monday.evening.endTime).toBe('22:15');
  expect(stored().monday.evening.tasks[1].catalogIds).toEqual(['ma', 'ma']);
});

test('explicit endTime save updates URL while jumps and deadline draft do not', async () => {
  open('?rotina=1.n.ba-5.2040');
  render(<App />);
  await screen.findByRole('button', { name: 'Pular para Banho' });
  const original = window.location.href;
  fireEvent.click(screen.getByRole('button', { name: 'Pular para Banho' }));
  expect(window.location.href).toBe(original);
  fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
  fireEvent.change(screen.getByLabelText('Horário final'), { target: { value: '20:45' } });
  expect(window.location.href).toBe(original);
  fireEvent.click(screen.getByRole('button', { name: 'Salvar horário' }));
  expect(window.location.search).toBe('?rotina=2.n.ba-5.2045');
  expect(stored().monday.evening.endTime).toBe('20:45');
});

test('unrepresentable edit saves locally and reports link failure', async () => {
  open('?rotina=1.n.ba-5.2040');
  render(<App />);
  await screen.findByRole('button', { name: 'Pular para Banho' });
  edit();
  fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Routine' }));
  expect(stored().monday.evening.tasks[0].minutes).toBe(0);
  expect(window.location.search).toBe('?rotina=1.n.ba-5.2040');
  expect(screen.getByRole('alert')).toHaveTextContent('não foi possível atualizar o link');
});

test('full editor on shortcut preserves untouched local periods/days while saving selected period', async () => {
  const custom = { name: 'Manhã personalizada', endTime: '08:00', tasks: [{ id: 9, name: 'Meu café', minutes: 9, color: '#123456', icon: '☕' }] };
  localStorage.setItem('routines', JSON.stringify({ monday: { morning: custom, evening: defaults.monday.evening }, sunday: { morning: custom } }));
  open('2045');
  render(<App />);
  await screen.findByRole('button', { name: 'Pular para Jantar local' });
  fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
  fireEvent.click(screen.getByRole('button', { name: /Rotinas/ }));
  fireEvent.change(screen.getByDisplayValue('Jantar local'), { target: { value: 'Meu jantar' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  expect(stored().monday.morning).toEqual(custom);
  expect(stored().sunday).toEqual({ morning: custom });
  expect(stored().monday.evening.tasks[0].name).toBe('Meu jantar');
  expect(window.location.pathname).toBe('/');
  expect(window.location.search).toContain('.2045');
});

test('cancelled editor does not replace URL or persist its draft', async () => {
  open('?rotina=1.n.ma-de-5.2040#keep');
  render(<App />);
  await screen.findByRole('button', { name: 'Pular para Lavar as mãos + Escovar os dentes' });
  const originalUrl = window.location.href;
  const originalStorage = localStorage.getItem('routines');
  edit();
  fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(window.location.href).toBe(originalUrl);
  expect(localStorage.getItem('routines')).toBe(originalStorage);
});

test.each([false, true])('integrated URL + completion: marks follow task identity through edits and end-time save (phone: %s)', async phone => {
  vi.useFakeTimers();
  const now = new Date();
  now.setHours(20, 0, 0, 0);
  vi.setSystemTime(now);
  window.matchMedia = () => ({ matches: phone, addEventListener() {}, removeEventListener() {} });
  localStorage.setItem('routines', JSON.stringify(defaults));
  open('?rotina=1.n.ba-20.ja-25.ma-de-5.2040');
  const view = render(<App />);
  try {
    await screen.findByRole('button', { name: 'Pular para Jantar' });
    const original = window.location.href;
    fireEvent.click(screen.getByRole('button', { name: 'Marcar Lavar as mãos + Escovar os dentes como feita' }));
    fireEvent.click(screen.getByRole('button', { name: 'Marcar Banho como feita' }));
    expect(window.location.href).toBe(original);
    edit();
    fireEvent.click(screen.getAllByRole('button', { name: 'Mover tarefa para cima' })[1]);
    fireEvent.change(screen.getByDisplayValue('Banho'), { target: { value: 'Banho. quentinho-50%' } });
    fireEvent.change(screen.getByDisplayValue('25'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Routine' }));
    expect(screen.getByRole('button', { name: 'Banho. quentinho-50%: feita (desmarcar)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Lavar as mãos + Escovar os dentes: feita (desmarcar)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Marcar Jantar como feita' })).toHaveAttribute('aria-pressed', 'false');
    expect(stored().monday.evening.tasks.map(t => t.name)).toEqual(['Jantar', 'Banho. quentinho-50%', 'Lavar as mãos + Escovar os dentes']);
    expect(stored().monday.morning).toEqual(defaults.monday.morning);
    fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
    fireEvent.change(screen.getByLabelText('Horário final'), { target: { value: '20:50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar horário' }));
    expect(window.location.search).toContain('.2050');
    expect(screen.getByRole('button', { name: 'Banho. quentinho-50%: feita (desmarcar)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Lavar as mãos + Escovar os dentes: feita (desmarcar)' })).toHaveAttribute('aria-pressed', 'true');
    const link = window.location.href;
    fireEvent.click(screen.getByRole('button', { name: 'Banho. quentinho-50%: feita (desmarcar)' }));
    expect(window.location.href).toBe(link);
    view.unmount();
    localStorage.clear();
    render(<App />);
    await screen.findByRole('button', { name: 'Pular para Banho. quentinho-50%' });
    // A shared URL transports configuration, not transient completion state.
    expect(screen.getByRole('button', { name: 'Marcar Banho. quentinho-50% como feita' })).toHaveAttribute('aria-pressed', 'false');
    expect(stored().monday.evening.endTime).toBe('20:50');
    expect(stored().monday.evening.tasks.map(t => t.minutes)).toEqual([30, 20, 5]);
    expect(stored().monday.evening.tasks[2].catalogIds).toEqual(['ma', 'de']);
  } finally {
    delete window.matchMedia;
  }
});

test.each([false, true])('literal underscore save is explicit, local and recoverable (full editor: %s)', async fullEditor => {
  open('?rotina=2.n.~pr%C3%A9-treino-5.2030');
  render(<App />);
  await screen.findByRole('button', { name: 'Pular para pré-treino' });
  fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
  fireEvent.click(screen.getByRole('button', { name: fullEditor ? /Rotinas/ : /Editar esta rotina/ }));
  fireEvent.change(screen.getByDisplayValue('pré-treino'), { target: { value: 'literal_underscore' } });
  fireEvent.click(screen.getByRole('button', { name: fullEditor ? 'Salvar Alterações' : 'Save Routine' }));
  expect(stored().monday.evening.tasks[0].name).toBe('literal_underscore');
  expect(window.location.search).toBe('?rotina=2.n.~pr%C3%A9-treino-5.2030');
  expect(screen.getByRole('alert')).toHaveTextContent('reserva _ para espaços');
  fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
  fireEvent.click(screen.getByRole('button', { name: fullEditor ? /Rotinas/ : /Editar esta rotina/ }));
  fireEvent.change(screen.getByDisplayValue('literal_underscore'), { target: { value: 'literal underscore' } });
  fireEvent.click(screen.getByRole('button', { name: fullEditor ? 'Salvar Alterações' : 'Save Routine' }));
  expect(window.location.search).toBe('?rotina=2.n.~literal_underscore-5.2030');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('v2 literal HTML stays text when imported and rendered', async () => {
  open('?rotina=2.n.~%F0%9F%8D%84_~3Cimg_src~3Dx_onerror~3Dalert~281~29~3E-5.1900');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para 🍄 <img src=x onerror=alert(1)>' })).toBeInTheDocument();
  expect(stored().monday.evening.tasks[0].name).toBe('🍄 <img src=x onerror=alert(1)>');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
