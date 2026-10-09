# App Rotina da Nina

Veja o [README principal](../README.md), [guia técnico](../CLAUDE.md) e
[contrato de URL](../docs/url-rotina.md).

Use Node 22.23.3 e Python 3 no PATH. Nesta pasta:

```bash
npm ci
npm start
npm run lint -- --max-warnings=0
CI=true npm test -- --watchAll=false --runInBand
CI=true npm run build
```

CRA permanece nesta fase. Build gera `build/` (ignorado pelo Git); não há service worker
registrado ou deploy configurado. Os ícones/manifest existentes são legados e permanecem
para preservar a identidade visual; manifest sozinho não oferece offline.
