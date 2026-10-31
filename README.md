# ReceitaAI 🍲

Aplicação web para transformar ingredientes disponíveis em casa em **três sugestões de receitas**, com fotografia ilustrativa gerada por IA para cada prato.

## Funcionalidades

- Cadastro e remoção de ingredientes (até 30 por consulta), com sugestões rápidas.
- Preferências: tipo de refeição, tempo máximo, porções e filtros alimentares.
- Geração de três receitas em português brasileiro usando Cloudflare Workers AI.
- Geração de três imagens gastronômicas com FLUX.1 [schnell].
- Ficha completa da receita: ingredientes, quantidades, itens que faltam e modo de preparo.
- Indicador estimado de compatibilidade com a despensa.
- Favoritos persistidos no `localStorage` do navegador.
- Interface responsiva, tema claro/escuro e identidade visual gourmet.
- API no servidor por Pages Functions; nenhuma chave Cloudflare é enviada ao navegador.

## Stack

- React 18 + TypeScript + Vite
- CSS responsivo e Lucide React
- Cloudflare Pages + Pages Functions
- Cloudflare Workers AI
- Texto: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (saída JSON estruturada)
- Imagens: `@cf/black-forest-labs/flux-1-schnell`

## Pré-requisitos

- Node.js 20.19+ ou 22.12+ (recomendado: Node 22 LTS)
- npm
- Conta Cloudflare com Workers AI habilitado
- Wrangler CLI (o projeto instala como dependência de desenvolvimento)

## Executar localmente com IA real

> O modo local usa o binding remoto Workers AI da sua conta Cloudflare. Portanto, chamadas de teste consomem sua franquia/uso faturável. Não há um simulador local de inferência neste MVP.

1. Clone o repositório e instale as dependências:

   ```bash
   git clone https://github.com/SEU_USUARIO/ReceitaAI.git
   cd ReceitaAI
   npm install
   ```

2. Autentique o Wrangler:

   ```bash
   npx wrangler login
   ```

3. Gere o build e inicie Pages local com o binding AI:

   ```bash
   npm run dev
   ```

   O script gera o frontend em modo watch e executa `wrangler pages dev dist --ai AI`. Acesse a URL local informada pelo Wrangler (normalmente `http://localhost:8788`).

4. Se a interface estiver atualizando e as alterações de código não aparecerem imediatamente, aguarde o build do Vite ou reinicie o comando.

Para trabalhar apenas no frontend sem chamar a API, use `npm run dev:web`. Nesse modo, as rotas `/api/*` não estarão disponíveis.

## Configurar Workers AI no Cloudflare Pages

1. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Abra **Workers & Pages** e crie um projeto Pages conectado ao seu repositório GitHub (ou faça o primeiro deploy com Wrangler).
3. Em **Settings → Bindings → Add → Workers AI**, crie o binding com o nome exato `AI`.
4. Faça um novo deploy após adicionar o binding.
5. Configure o projeto com:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/` (raiz do repositório)
6. Confira se `wrangler.jsonc` está no repositório. Ele declara o diretório de saída do Pages e a data de compatibilidade. O binding Workers AI é adicionado pelo painel conforme a documentação atual de Pages.

O projeto usa Pages Functions em `functions/api/recipes.ts` e `functions/api/images.ts`, mapeadas para:

- `POST /api/recipes`
- `POST /api/images`

## Publicar via Wrangler (alternativa)

Depois de autenticar e criar/selecionar o projeto Pages:

```bash
npm run build
npx wrangler pages project create receitaai
npx wrangler pages deploy dist --project-name receitaai
```

Se o projeto já existir, pule o comando `pages project create`. Configure o binding `AI` no dashboard e publique novamente.

## Exemplo de requisição

`POST /api/recipes`

```json
{
  "ingredients": ["Frango", "Arroz", "Tomate", "Cebola", "Queijo"],
  "mealType": "Almoço",
  "maxPreparationTime": 40,
  "servings": 2,
  "preferences": ["Econômica"]
}
```

A resposta contém `recipes`, com três objetos contendo descrição, tempo, dificuldade, ingredientes com marcação `available`, passos, ingredientes adicionais, índice de compatibilidade e `imagePrompt`.

`POST /api/images`

```json
{
  "name": "Frango cremoso com arroz",
  "description": "Frango ao molho com arroz soltinho",
  "imagePrompt": "Photorealistic editorial food photography..."
}
```

A resposta contém uma imagem JPEG em Data URI (`image`).

## Modelos e custos

Workers AI possui franquias e preços que podem mudar. Verifique a tabela atual antes de disponibilizar publicamente. A geração de imagem tende a representar a maior parte do consumo quando são geradas três imagens por consulta.

- [Catálogo de modelos Workers AI](https://developers.cloudflare.com/workers-ai/models/)
- [FLUX.1 schnell](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/)
- [JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [Preços Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/)

### Ajustes de custo recomendados antes de abrir ao público

- Adicionar rate limit por IP/usuário (ex.: 3 gerações por hora por visitante).
- Limitar o tamanho da lista de ingredientes e o tamanho dos prompts (já há validações básicas no backend).
- Considerar cache de imagens por hash do prompt e armazenamento no R2.
- Adicionar Turnstile para reduzir automação abusiva.
- Monitorar consumo no painel Cloudflare e estabelecer limites operacionais.
- Evitar expor endpoint irrestrito para visitantes anônimos sem proteção contra abuso.

## Segurança e limitações conhecidas do MVP

- O binding `AI` é acessado somente nas Pages Functions; não existe token de API no frontend.
- As rotas validam payloads, mas ainda não incluem rate limiting, autenticação, Turnstile ou moderação avançada. Não considere esta versão pronta para tráfego público irrestrito.
- O cálculo de compatibilidade é uma estimativa produzida pelo modelo, não uma verificação determinística.
- O modelo pode ocasionalmente gerar quantidades/instruções imprecisas. Revise segurança alimentar, alergênicos e ponto de cozimento antes de consumir.
- As imagens são ilustrações geradas por IA; podem não representar fielmente o resultado culinário.
- Favoritos ficam no navegador e não sincronizam entre dispositivos.
- O MVP não armazena imagens no R2: as imagens são retornadas em Data URI para a sessão do navegador.

## Estrutura

```text
ReceitaAI/
├── functions/
│   └── api/
│       ├── recipes.ts       # Geração das três receitas
│       └── images.ts        # Geração da imagem do prato
├── public/
├── src/
│   ├── lib/api.ts           # Cliente HTTP
│   ├── types.ts             # Tipos compartilhados
│   ├── App.tsx              # Interface e fluxo principal
│   ├── main.tsx
│   └── styles.css
├── index.html
├── wrangler.jsonc
├── package.json
└── README.md
```

## Scripts

- `npm run dev` — build watch + Pages local com binding AI.
- `npm run dev:web` — apenas Vite, sem API Cloudflare.
- `npm run build` — verificação TypeScript e build de produção.
- `npm run preview` — preview do build estático (sem Pages Functions).
- `npm run deploy` — build e deploy com Wrangler.
- `npm run typecheck` — verificação TypeScript.

## Licença

Defina a licença do repositório antes de distribuir ou aceitar contribuições. Os modelos de IA utilizados têm termos/licenças próprios; consulte os links oficiais.
