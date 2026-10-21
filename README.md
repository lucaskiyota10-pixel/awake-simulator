# Awake. home decor — Simulador de decoração

Protótipo funcional: catálogo de esculturas, luminárias e objetos decorativos com
simulador **2D** e **3D** sobre fotografias do ambiente do cliente, usando as
**dimensões reais** cadastradas e uma **calibração de escala**.

React · TypeScript · Tailwind CSS · Three.js / React Three Fiber · IndexedDB

---

## Executar localmente

Requisitos: **Node.js 20+** e npm.

```bash
npm install
npm run dev          # http://localhost:5173
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run build` | Typecheck + build de produção em `dist/` |
| `npm run preview` | Serve o build (http://localhost:4173) |
| `npm test` | Testes da matemática de calibração e projeção 3D |
| `npm run dev:host` | Expõe na rede local para testar no celular |
| `npm run generate:assets` | Regera modelos GLB, fotos PNG e ambientes de demonstração (requer Chromium) |

### Testar no celular

1. `npm run dev:host` e abra no celular o endereço "Network" exibido (mesma rede Wi-Fi).
2. **Câmera:** a câmera ao vivo do navegador (`getUserMedia`) exige HTTPS ou
   `localhost`. Em `http://192.168.x.x` o app oferece automaticamente
   **"Abrir câmera do aparelho"**, que usa a câmera nativa do celular pelo
   seletor de arquivo e funciona sem HTTPS. Para a câmera ao vivo no celular, publique o build
   em um host HTTPS (o `dist/` é estático e funciona em qualquer hospedagem).

---

## Roteiro de teste das duas modalidades (≈ 3 min)

1. **Catálogo** → clique em **Simular** na *Escultura Onda*.
2. **Ambiente** → escolha **Sala de estar** (demonstração).
3. **Calibração** → clique em **Usar medidas deste ambiente** (aparador 80 cm e
   mesa de centro 40 cm, em profundidades diferentes) → **Continuar**.
4. **Visualizar em 2D** → toque sobre o tampo do aparador para levar a escultura até ele.
   Em **Tamanho e escala → Apoio do produto**, escolha *Na profundidade de: Aparador*.
   O selo verde mostra **"Escala real calibrada"**; a altura na foto (≈ 114 px = 2,72 px/cm × 42 cm)
   confere com a geometria real do ambiente renderizado.
5. **Visualizar em 3D** → o mesmo produto aparece no mesmo ponto e com o mesmo tamanho.
   Use **Rotação**, **Campo de visão**, **Inclinação** e **Luz**; depois
   **Explorar outros ângulos** (frente, 3/4, lateral, traseira, superior, com silhueta de 1,70 m).
6. **Comparar 2D × 3D** mostra as duas modalidades lado a lado, sincronizadas: arrastar
   em uma move nas duas.
7. **Antes / depois** → arraste a divisória (foto original × simulação).
8. **Salvar composição** → baixa um PNG na resolução original da foto e guarda em **Composições**
   (de onde pode ser reaberta no simulador).
9. Troque para a **Escultura Folha**: ela não tem modelo 3D, então o modo 3D explica a limitação e oferece voltar ao 2D.
10. Mova o controle **Ajuste manual** para longe de 100%: o selo muda para
    *"Tamanho ajustado manualmente"* e a composição salva leva o aviso
    *"não representa o tamanho real"*.

Com sua própria foto: em **Ambiente**, use **Enviar fotografia** ou **Usar a câmera**, marque
uma medida conhecida (porta, mesa, bancada...) e informe o valor em cm.

---

## Funcionalidades

| # | Requisito | Onde |
|---|---|---|
| 1 | Catálogo (nome, foto, categoria, material, A×L×P, preço ilustrativo, modelo 3D) + **painel admin** para cadastrar/editar | `/` · `/produto/:id` · `/admin` |
| 2 | Envio de foto, câmera, imagens de demonstração; **foto original preservada** (guardada byte a byte, nunca alterada) | Simulador → Ambiente |
| 3 | Simulação 2D com PNG transparente: selecionar, arrastar (mouse/toque), ajuste fino (setas, teclado), antes/depois, salvar | Simulador → 2D |
| 4 | Simulação 3D (R3F): GLB/GLTF, posicionar, rotacionar, perspectiva (FOV + inclinação), ângulos, comparar com 2D | Simulador → 3D |
| 5 | Escala real nos dois modos a partir das dimensões cadastradas + calibração | `src/lib/calibration.ts`, `src/lib/projection.ts` |
| 6 | Botões **"Visualizar em 2D"** / **"Visualizar em 3D"** mantendo produto, ambiente e posição | estado único em `src/store/simulator.ts` |
| 7 | Arquitetura para e-commerce + botão **"Ver produto no catálogo"**; sem pagamentos | `src/services/catalog`, `src/services/commerce` |

---

## Como funciona a escala real

**Dimensões → pixels.** A altura cadastrada (cm) é convertida em pixels da foto
pela calibração: `altura_px = altura_cm × px_por_cm × ajuste_manual`.

**Calibração.** O usuário arrasta as pontas de um segmento sobre um objeto de
medida conhecida (com lupa para precisão) e informa o valor em cm.

- **1 referência:** escala constante. Vale para o produto na mesma profundidade da referência.
- **2 referências em profundidades diferentes:** para uma câmera nivelada e objetos no
  mesmo piso, a escala na imagem é *linear* na coordenada y do ponto de apoio.
  A interpolação entre as referências é exata nesse modelo, e a escala acompanha o
  produto conforme ele é arrastado pelo piso. Para um produto **sobre um móvel**, o
  usuário escolhe em *Apoio do produto* a referência na mesma profundidade.

**2D.** A foto do produto é recortada rente ao objeto (o admin faz isso automaticamente
no upload), então a altura da imagem corresponde à altura real.

**3D.** O modelo é escalado uniformemente para a altura cadastrada e posicionado na
profundidade em que um objeto dessa altura projeta exatamente `altura_px` com o campo de
visão escolhido (`profundidade = altura_m × f / altura_px`). A base do modelo cai sobre o
mesmo ponto de apoio do 2D, por isso as duas modalidades coincidem. Os testes verificam
isso (`src/lib/geometry.test.ts`).

### Quando o app NÃO afirma tamanho real

O selo de escala (e a legenda da imagem salva) só diz **"Escala real"** quando:

- há referência válida: medida informada entre 5 e 1000 cm e segmento com pelo menos 6% da
  maior dimensão da foto;
- o tamanho não foi ajustado manualmente;
- com perspectiva, o ponto de apoio está abaixo da linha do horizonte estimada.

Em qualquer outro caso o app mostra **"Escala estimada — não calibrada"**,
**"Calibração insuficiente"**, **"Fora da área calibrada"** ou **"Tamanho ajustado manualmente"**.

---

## Limitações conhecidas (protótipo)

- **Precisão depende da foto.** O modelo assume câmera aproximadamente nivelada e lente sem
  distorção forte (ultra-wide distorce). Inclinar o celular introduz erro nas linhas verticais.
- **Uma referência = uma profundidade.** Fora dessa profundidade o tamanho deixa de ser fiel.
  O app avisa e sugere uma segunda referência.
- **3D:** a perspectiva da foto não é detectada automaticamente. O usuário ajusta
  campo de visão e inclinação até o objeto parecer apoiado. Não há oclusão
  (o produto sempre aparece na frente dos objetos da foto) nem iluminação estimada da cena,
  só controles manuais de luz.
- **2D:** a foto do produto tem um único ângulo, então não é possível girar. O espelhamento é o único ajuste
  de orientação. Para ver outros ângulos, use o 3D.
- **Modelos 3D:** a escala é uniforme pela altura. Se a largura/profundidade do modelo divergir
  mais de 10% do cadastro, o app avisa (admin e simulador). Arquivos `.gltf` precisam ter
  texturas embutidas; Draco não é suportado.
- **Dados locais:** produtos, fotos e composições ficam no IndexedDB **deste navegador**.
  Não há contas, sincronização nem autenticação no painel admin.
- **Assets de demonstração** (modelos, fotos dos produtos e ambientes) são gerados
  proceduralmente por `npm run generate:assets`. São ilustrativos, não fotos reais de produtos Awake.

---

## Integração futura com o e-commerce

```
src/services/
├── catalog/
│   ├── ProductRepository.ts      ← contrato (list/get/save/remove)
│   ├── localProductRepository.ts ← protótipo (IndexedDB)
│   └── index.ts                  ← ponto único de troca
└── commerce/
    ├── config.ts                 ← URLs da loja, link "Ver produto no catálogo"
    └── adapters.ts               ← CommerceProduct ⇄ Product + repositório HTTP somente leitura
```

1. **Link para a loja:** defina `VITE_COMMERCE_STORE_URL` (e opcionalmente
   `VITE_COMMERCE_PRODUCT_PATH`, ex. `/produto/{sku}`) ou preencha a "URL na loja online" de
   cada produto. Sem isso, o botão abre a página interna do produto.
2. **Catálogo vindo da loja:** defina `VITE_CATALOG_API_URL` apontando para um endpoint
   `GET /products` que retorne `CommerceProduct[]` (ver `adapters.ts`). Cada plataforma
   (Shopify, VTEX, Nuvemshop...) precisa de um pequeno mapeador para esse formato, com
   metacampos `height_cm`, `width_cm`, `depth_cm`, `material`, `transparent_image_url` e
   `model_glb_url`.
3. O SKU já é obrigatório no cadastro e o painel exporta o catálogo em JSON para importação.

Copie `.env.example` para `.env` para configurar.

---

## Estrutura

```
src/
├── pages/                 Catálogo, Produto, Simulador, Composições, Admin
├── components/
│   ├── simulator/         RoomStep, CameraCapture, CalibrationStep, SimulateStep,
│   │                      Stage2D, Stage3D, OrbitView, CompareOverlay, PhotoFrame
│   └── three/             ProductModel (normaliza GLB pelas dimensões), ModelViewer
├── lib/                   calibration.ts, projection.ts (+ testes), compose.ts, db.ts...
├── services/              catálogo, ambientes, composições, e-commerce
├── store/simulator.ts     estado compartilhado 2D/3D (persistido)
└── demo/                  modelos e ambientes procedurais + dados de demonstração
public/brand/              logotipo original extraído do brand board
public/demo/               GLB, PNG transparentes e fotos de ambientes gerados
```

Identidade visual: azul `#152F8C`, rosa `#EC0A80` e off-white `#F6F3EB`, amostrados do
brand board. Logotipo original recortado do brand board, sem redesenho, e tipografia de
apoio Montserrat.
