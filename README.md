# KyneticForge Studio

**Robotics Engineering Software · v0.1.0**

KyneticForge Studio é um ambiente web de engenharia robótica para configurar,
visualizar e analisar mecanismos robóticos virtuais. A versão 0.1.0 entrega um
simulador interativo de um braço robótico de **3 graus de liberdade (RRR)** com
**cinemática direta** calculada de forma rigorosa, visualização 3D consistente com a
matemática e gerenciamento de projetos persistentes.

> Nenhum hardware é necessário. Toda a simulação é virtual e roda localmente.
>
> **Para abrir: dê dois cliques em `KyneticForge.bat`.** Detalhes em [Como usar](#como-usar).

---

## Objetivos

* Oferecer um ambiente técnico (estilo CAD) para estudar e projetar mecanismos.
* Garantir que o que é exibido em 3D corresponda exatamente ao que é calculado.
* Manter uma arquitetura modular, testada e preparada para cinemática inversa,
  trajetórias, URDF, colisões, dinâmica e ROS 2 (ver [docs/ROADMAP.md](docs/ROADMAP.md)).

## Funcionalidades implementadas (v0.1.0)

**Modelo e cálculo**
* Braço RRR: base (yaw, eixo Z), ombro e cotovelo; comprimentos L0, L1, L2 configuráveis.
* Cinemática direta por Denavit–Hartenberg padrão: matrizes locais `A_i`, matrizes de
  mundo `T_0_i`, posição e eixo de cada junta, pose do efetuador final (TCP).
* Implementação de referência em NumPy (backend) e implementação em TypeScript para
  tempo real (frontend), com **testes de equivalência** contra uma fixture gerada pelo backend.
* **Verificação contínua**: após cada alteração (com debounce de 400 ms), a pose é
  conferida contra o backend e o desvio máximo é exibido.
* Unidades SI internamente; exibição em m/cm/mm e graus.

**Interface**
* Tema escuro em tons de grafite com acento ciano; layout de 5 áreas (barra superior,
  painel esquerdo, viewport 3D, painel direito, painel de eventos).
* Viewport 3D: grade no plano XY, eixos X/Y/Z, gizmo de orientação, câmera orbital
  (rotação, zoom, pan), botão de redefinir vista, triedros dos frames DH opcionais,
  seleção por clique com destaque.
* Árvore hierárquica do robô, painel de propriedades por elemento (nome da junta,
  limites, posição home, posição/eixo da junta, orientação do TCP) e editor de geometria.
* Controles de junta com slider, campo numérico, limites, posição home e restauração.
* Painel matemático com modo simples (TCP, ângulos) e detalhado (posições, eixos,
  tabela DH, todas as matrizes homogêneas).
* Painel de eventos com avisos de parâmetros inválidos e resultados de operações.
* Indicador de estado do backend e da verificação cinemática.

**Projetos**
* Criar, listar, abrir, salvar, renomear e excluir (com confirmação) projetos em SQLite.
* Exportar para JSON versionado (`schemaVersion`) e importar com validação no navegador
  e no backend.
* Aviso de alterações não salvas antes de trocar de projeto ou fechar a página.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 19, TypeScript 6 (strict), Vite 8, Three.js, React Three Fiber 9, Drei 10, Tailwind CSS 4, Zustand 5 |
| Backend | Python 3.12, FastAPI, Pydantic 2, NumPy 2, SQLAlchemy 2, SQLite, Uvicorn |
| Qualidade | Vitest + Testing Library, Pytest, ESLint, Prettier, Ruff |

As versões exatas instaladas estão em `frontend/package-lock.json` e são resolvidas
pelos intervalos de `backend/pyproject.toml`.

## Arquitetura

```
frontend (React/R3F)  ──/api/v1──▶  backend (FastAPI)  ──▶  SQLite
   FK em TypeScript                     FK de referência (NumPy)
          ╲                                  ╱
           shared/fixtures/kinematics-reference.json
```

Detalhes, estrutura de diretórios, API e decisões técnicas:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Como usar

### Você precisa ter instalado

* **Node.js** 20.19 ou mais novo — https://nodejs.org (só é usado para gerar a interface)
* **Python** — qualquer versão a partir da 3.8. Se não houver Python 3.12+, o próprio
  projeto baixa uma cópia do Python 3.12 para dentro da pasta `.tooling/`
  (nada é instalado no seu sistema).

### Abrir o app

**Dê dois cliques em `KyneticForge.bat`** (na pasta principal do projeto).

Pronto. Ele abre uma janela preta e, em seguida, o app no navegador em
**http://127.0.0.1:8000**.

* **Na primeira vez** demora alguns minutos: ele instala tudo sozinho.
* **Nas próximas vezes** abre em poucos segundos.
* Se você alterou o código da interface, ele gera a interface de novo automaticamente.

### Fechar o app

Feche a janela preta (ou aperte **Ctrl+C** nela).

### Onde ficam meus projetos?

No arquivo `backend/data/kyneticforge.db`. Para levar um projeto para outro computador,
use **Export** no app e depois **Import** no outro.

### Problemas comuns

| O que aparece | O que fazer |
| --- | --- |
| "A porta 8000 já está em uso" | O app já está aberto em outra janela. Feche-a e tente de novo. |
| Página dizendo "a interface ainda não foi gerada" | Abra pelo `KyneticForge.bat` (ele gera a interface). |
| O Windows avisa sobre "scripts desabilitados" | Use o `KyneticForge.bat` em vez de abrir o `.ps1` diretamente. |

### Sem o `.bat` (pelo terminal)

Os mesmos passos que o `.bat` faz, se você preferir digitar:

```powershell
# 1. Só na primeira vez: instalar dependências
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1

# 2. Só quando a interface mudar: gerar a interface
cd frontend
npm run build
cd ..

# 3. Abrir o app (um único comando Python)
backend\.venv\Scripts\python -m app
```

O passo 3 aceita `--no-browser` (não abrir o navegador) e `--port 8080` (outra porta).

> **Por que `-ExecutionPolicy Bypass`?** O Windows bloqueia arquivos `.ps1` por padrão.
> Essa opção libera só aquela execução, sem alterar nada no sistema. O `.bat` já faz isso
> por você.

### Como funciona por baixo

O app tem duas partes: a **interface** (React, escrita em TypeScript) e o **backend**
(Python/FastAPI). A interface é "compilada" uma vez pelo Node (`npm run build`) em
arquivos comuns de site, na pasta `frontend/dist`. Depois disso, o **Python sozinho**
entrega a interface e a API no mesmo endereço — o Node não fica rodando.

## Para desenvolvedores

### Modo desenvolvimento (recarrega sozinho ao editar o código)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\dev.ps1
```

Sobe o backend com auto-reload (porta 8000) e o servidor do Vite com hot reload
(http://localhost:5173, que encaminha `/api` para o backend). Ctrl+C encerra os dois.
Use este modo enquanto programa; para apenas usar o app, prefira o `KyneticForge.bat`.

Se o backend não estiver ativo, a simulação continua funcionando localmente, mas
salvar/abrir/importar ficam desativados (o indicador mostra "Backend offline").

### Instalação manual (sem o script)

```powershell
# Backend (exige Python 3.12+)
cd backend
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"

# Frontend
cd ..rontend
npm ci
```

A documentação interativa da API fica em http://127.0.0.1:8000/docs com o app aberto.

### Configuração (opcional)

| Variável | Padrão | Uso |
| --- | --- | --- |
| `KF_DATABASE_URL` | `sqlite:///backend/data/kyneticforge.db` | Banco de dados |
| `KF_CORS_ORIGINS` | `["http://localhost:5173", ...]` | Origens permitidas (JSON) |
| `KF_MAX_IMPORT_BYTES` | `262144` | Tamanho máximo de importação |
| `KF_FRONTEND_DIST` | `frontend/dist` | Pasta da interface gerada servida em `/` |
| `KF_BACKEND_URL` (frontend) | `http://127.0.0.1:8000` | Destino do proxy do Vite |
| `VITE_API_BASE_URL` (frontend) | `/api/v1` | Base da API no navegador |

## Testes e qualidade

Tudo de uma vez (lint, formatação, testes e build):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\test.ps1
```

Individualmente:

```powershell
cd backend
.venv\Scripts\python -m pytest            # testes do backend
.venv\Scripts\python -m ruff check .      # lint
.venv\Scripts\python -m scripts.generate_fixtures   # regenerar a fixture compartilhada

cd ..\frontend
npm test              # Vitest
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run build         # build de produção
```

Cobertura dos testes:

* **Backend (pytest)**: transformações homogêneas, cinemática direta (poses analíticas,
  extremos, propriedades estruturais, entradas inválidas), validação de limites,
  conversão de unidades, fixture de referência, persistência em SQLite, migração de
  esquema, endpoints da API (CRUD, exportação/importação, erros, CORS).
* **Frontend (Vitest)**: graus↔radianos e unidades, validação de entradas, FK contra a
  fixture NumPy, hierarquia Three.js contra a fixture (integração matemática ↔
  renderização), estado (Zustand), validação de documentos importados, ações de
  projeto com `fetch` simulado, componentes `JointControl` e `KinematicsPanel`.

## Modelo robótico

Convenção: sistema destro, **Z para cima**, SI internamente, DH padrão.

| i | θ | d | a | α |
| --- | --- | --- | --- | --- |
| 1 | q1 (base) | L0 | 0 | +π/2 |
| 2 | q2 (ombro) | 0 | L1 | 0 |
| 3 | q3 (cotovelo) | 0 | L2 | 0 |

```
x = cos(q1)·[L1·cos(q2) + L2·cos(q2+q3)]
y = sin(q1)·[L1·cos(q2) + L2·cos(q2+q3)]
z = L0 + L1·sin(q2) + L2·sin(q2+q3)
```

Equações completas, referenciais, limites e estratégia de consistência:
[docs/KINEMATICS.md](docs/KINEMATICS.md).

## Uso rápido

1. Mova os sliders em **Joint control** (painel direito) ou digite um ângulo e pressione Enter.
2. Clique em uma peça no 3D ou na **Robot hierarchy** para ver/editar suas propriedades.
3. Altere comprimentos em **Geometry** e escolha a unidade exibida (m/cm/mm).
4. Use **Kinematics → detailed** para ver a tabela DH e as matrizes.
5. **Save** cria/atualiza o projeto; **Open** lista, abre, renomeia e exclui projetos;
   **Export/Import** trocam arquivos `.kfproject.json`.

## Limitações conhecidas

* Apenas o modelo RRR 3-DOF; sem cinemática inversa, trajetórias, colisões ou dinâmica.
* Colisão com o piso não é verificada (o braço pode atravessar o plano XY).
* "Export" exporta a última versão **salva** (o usuário é avisado se houver alterações não salvas).
* Não há testes end-to-end automatizados no navegador; os fluxos principais foram
  verificados manualmente (ver histórico de desenvolvimento).
* Pytest emite um aviso de depreciação do Starlette sobre o uso de `httpx` no
  `TestClient`; não afeta os resultados.
* Sem autenticação (uso local).

## Roadmap

Resumo: v0.2 cinemática inversa · v0.3 trajetórias/workspace/singularidades ·
v0.4 URDF/colisões · v0.5 dinâmica · v1.0 ROS 2. Detalhes em [docs/ROADMAP.md](docs/ROADMAP.md).

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

© 2026 Marques Robotics
