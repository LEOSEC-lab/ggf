BELL PLAY MUSIC — PWA SEPARADO

Arquivos:
- index.html: estrutura do app
- style.css: estilos próprios
- app.js: lógica JavaScript
- manifest.webmanifest: metadados PWA e ícones
- service-worker.js: cache básico do app shell
- icons/: ícones PNG/SVG

COMO USAR NO PWA BUILDER
1. Publique o conteúdo desta pasta em um host HTTPS (por exemplo, GitHub Pages).
2. Abra https://www.pwabuilder.com/ e informe a URL publicada.
3. Gere o pacote Android e assine o APK conforme o fluxo do gerador.

LIMITAÇÕES IMPORTANTES DO CÓDIGO ORIGINAL
- O formulário de link não faz conversão real de vídeos do YouTube: o código original simula o progresso e insere um áudio de demonstração.
- O navegador/PWA não concede permissões nativas de microfone/armazenamento como um APK Android; os arquivos locais são escolhidos pelo seletor do navegador. A solicitação de microfone foi mantida fora do fluxo automático.
- Tailwind, Font Awesome, Google Fonts e imagens externas dependem de internet; por isso, a interface básica é cacheada, mas a experiência não é totalmente offline.
- Não foi possível validar a instalação em um aparelho Android real nesta execução.
