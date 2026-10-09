import React, { useRef, useState } from 'react';
import { copyLinkDiagnostics, formatLinkDiagnostics } from '../lib/linkDiagnostics';

export default function InvalidLinkNotice({ error, failure, context }) {
  const [diagnostic, setDiagnostic] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const textarea = useRef(null);

  async function copy() {
    const copied = await copyLinkDiagnostics(diagnostic, textarea.current);
    setCopyStatus(copied ? 'Diagnóstico copiado.' : 'Não foi possível copiar automaticamente. O texto está selecionado; use Copiar no seu aparelho.');
  }

  return (
    <div className="p-4">
      <p role="alert">{error}</p>
      <button
        className="mt-2 underline"
        aria-expanded={Boolean(diagnostic)}
        aria-controls="link-diagnostics"
        onClick={() => {
          setDiagnostic(diagnostic ? '' : formatLinkDiagnostics(context, failure));
          setCopyStatus('');
        }}
      >{diagnostic ? 'Ocultar diagnóstico' : 'Mostrar diagnóstico'}</button>
      <div id="link-diagnostics" hidden={!diagnostic}>
        {diagnostic && <>
          <p className="my-2">O diagnóstico contém o link completo e os nomes das tarefas. Ele fica apenas neste aparelho; copie e compartilhe somente se desejar.</p>
          <label htmlFor="link-diagnostic-text" className="block">Diagnóstico do link recebido</label>
          <textarea
            id="link-diagnostic-text"
            ref={textarea}
            readOnly
            value={diagnostic}
            rows={10}
            className="block w-full mt-1 p-2 rounded border border-gray-400 font-mono text-sm"
          />
          <button className="mt-2 px-3 py-2 rounded bg-white border border-gray-400" onClick={copy}>Copiar diagnóstico</button>
          <p role="status" className="mt-2">{copyStatus}</p>
        </>}
      </div>
    </div>
  );
}
