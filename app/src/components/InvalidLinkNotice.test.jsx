import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvalidLinkNotice from './InvalidLinkNotice';
import { captureLinkContext } from '../lib/linkDiagnostics';
import { URL_ERROR } from '../lib/routineUrl';

const clipboardDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');
const execDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');
afterEach(() => {
  for (const [target, key, descriptor] of [[window.navigator, 'clipboard', clipboardDescriptor], [document, 'execCommand', execDescriptor]]) {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else delete target[key];
  }
});

function renderNotice() {
  render(<InvalidLinkNotice error={URL_ERROR} context={captureLinkContext()}
    failure={{ stage: 'outer-decode', reason: 'malformed-percent-or-utf8' }} />);
}

test('reveals private diagnostics only on request and copies displayed text on click', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText } });
  renderNotice();
  expect(screen.getByRole('alert')).toHaveTextContent('temporariamente, sem substituir suas rotinas salvas');
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(writeText).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Mostrar diagnóstico' }));
  const text = screen.getByRole('textbox', { name: 'Diagnóstico do link recebido' });
  expect(JSON.parse(text.value).parser.reason).toBe('malformed-percent-or-utf8');
  expect(screen.getByText(/contém o link completo/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Copiar diagnóstico' }));
  expect(await screen.findByText('Diagnóstico copiado.')).toBeInTheDocument();
  expect(writeText).toHaveBeenCalledWith(text.value);
  await userEvent.click(screen.getByRole('button', { name: 'Ocultar diagnóstico' }));
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test('offers selected visible text for manual copy if both clipboard methods fail', async () => {
  Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
  renderNotice();
  await userEvent.click(screen.getByRole('button', { name: 'Mostrar diagnóstico' }));
  await userEvent.click(screen.getByRole('button', { name: 'Copiar diagnóstico' }));
  expect(await screen.findByText(/O texto está selecionado/)).toBeInTheDocument();
  const text = screen.getByRole('textbox', { name: 'Diagnóstico do link recebido' });
  expect(text).toHaveFocus();
  expect(text.selectionStart).toBe(0);
  expect(text.selectionEnd).toBe(text.value.length);
});
