# Fontes locais

Nunito e Fredoka preservam as famílias e pesos existentes. Arquivos variáveis normais
completos (sem subset ou mudança de desenho), convertidos de TTF para WOFF2 com
FontTools 4.66.1/Brotli 1.2.0, em 2026-10-09. Nenhuma dependência Python é necessária
para instalar ou construir o app. Vite emite URLs com fingerprint e o SW as precacheia.

Origem oficial Google Fonts:
- https://github.com/google/fonts/tree/main/ofl/nunito — `Nunito[wght].ttf`.
  Fonte upstream declarada em METADATA.pb: googlefonts/nunito,
  commit `8c6a9bb9732545b9ed53f29ec5e1ab0ff53c4e6f`.
- https://github.com/google/fonts/tree/main/ofl/fredoka — `Fredoka[wdth,wght].ttf`.
  Fonte upstream declarada em METADATA.pb: hafontia-zz/Fredoka-One,
  commit `35c584ff23450c9bcdf8819706e12fcdeefe1712`.

As licenças SIL OFL 1.1 e os copyrights conferidos nos binários acompanham os arquivos
em Nunito-OFL.txt e Fredoka-OFL.txt. A redistribuição com a aplicação é permitida;
fontes não são vendidas separadamente. A conversão mantém os nomes e a cobertura
original, incluindo português. Licenças também são copiadas para o build.
