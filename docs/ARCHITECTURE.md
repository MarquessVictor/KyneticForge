# Arquitetura — KyneticForge Studio v0.1.0

## Visão geral

```
┌───────────────────────── Navegador ─────────────────────────┐
│ React + TypeScript (Vite)                                   │
│                                                             │
│  components/ ──▶ hooks/ ──▶ stores/ (Zustand)               │
│      │              │            │                          │
│      │              ▼            ▼                          │
│      │     features/kinematics (FK em TS, tempo real)       │
│      ▼                                                      │
│  robotics/ (React Three Fiber + Drei)  ◀── matrizes A_i     │
│                                                             │
│  services/ (fetch tipado) ──────── /api/v1 ───────┐         │
└───────────────────────────────────────────────────┼─────────┘
                       proxy do Vite (dev)          │
┌───────────────────────────────────────────────────▼─────────┐
│ FastAPI (Python 3.12)                                       │
│  api/ ─▶ services/ ─▶ robotics/ (NumPy, referência)         │
│                  └──▶ models/ + database/ (SQLAlchemy)      │
│                                   └──▶ SQLite (data/*.db)   │
└─────────────────────────────────────────────────────────────┘
        shared/fixtures/kinematics-reference.json
        (contrato de equivalência gerado pelo backend)
```

## Estrutura de diretórios

```
KyneticForge/
├── backend/
│   ├── app/
│   │   ├── main.py              # fábrica da aplicação FastAPI, CORS, rotas
│   │   ├── api/                 # rotas HTTP, dependências, tratamento de erros
│   │   ├── core/                # configurações (KF_*) e conversão de unidades
│   │   ├── database/            # engine/sessão SQLAlchemy
│   │   ├── models/              # ORM (ProjectORM)
│   │   ├── schemas/             # modelos Pydantic (camelCase na API)
│   │   ├── services/            # casos de uso: projetos, cinemática, migrações
│   │   └── robotics/            # transforms.py, kinematics.py, validation.py, presets.py
│   ├── scripts/generate_fixtures.py
│   ├── tests/                   # pytest
│   └── pyproject.toml
├── frontend/
│   └── src/
│       ├── app/                 # ponto de entrada e App
│       ├── components/
│       │   ├── layout/          # AppShell, TopBar, StatusIndicator
│       │   ├── robotics/        # Canvas 3D, hierarquia de frames, peças do braço
│       │   ├── controls/        # JointControl
│       │   ├── panels/          # árvore, propriedades, geometria, cinemática, eventos
│       │   ├── dialogs/         # projetos, formulário, configurações
│       │   └── ui/              # Button, Dialog, NumberField, ícones
│       ├── features/
│       │   ├── kinematics/      # forwardKinematics, sceneTransforms, verificação
│       │   ├── projects/        # ações de projeto, validação de documentos
│       │   └── simulator/       # robô padrão
│       ├── hooks/               # useForwardKinematics, useBackendHealth, useBackendVerification
│       ├── services/            # cliente HTTP tipado
│       ├── stores/              # robotStore, appStore, logStore (Zustand)
│       ├── types/               # tipos de domínio
│       ├── utils/               # mat4, unidades, validação, download
│       └── styles/              # Tailwind v4 + tokens de design
├── shared/fixtures/             # fixture de referência cinemática (gerada)
├── scripts/                     # setup/dev/test em PowerShell
└── docs/
```

## Fluxo de dados

1. O usuário move um slider → `robotStore.setJointAngle` (valida e satura nos limites).
2. `useForwardKinematics` recalcula a FK em TypeScript (memoizado por geometria/ângulos).
3. `RobotArm` aplica `A1`, `A2`, `A3` como matrizes locais dos grupos `frame1..3`;
   o Canvas (modo `frameloop="demand"`) renderiza um único quadro.
4. Painéis (coordenadas, matrizes, árvore) leem o mesmo resultado de FK.
5. `useBackendVerification` aguarda 400 ms de estabilidade e consulta a referência
   NumPy; o desvio máximo é exibido.
6. Salvar/abrir/importar/exportar passam por `features/projects/projectActions.ts`
   → `services/projectsApi.ts` → FastAPI → SQLite.

## API REST (`/api/v1`)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Estado e versão |
| GET | `/config` | Robô padrão, restrições geométricas, versão do esquema |
| POST | `/robotics/validate` | Relatório completo de problemas de uma configuração |
| POST | `/kinematics/forward` | FK de referência (DH, matrizes locais e de mundo, juntas, TCP) |
| GET | `/projects` | Lista resumida (mais recentes primeiro) |
| POST | `/projects` | Cria projeto (robô padrão se omitido) |
| GET | `/projects/{id}` | Projeto completo |
| PATCH | `/projects/{id}` | Atualização parcial (nome, descrição, robô) |
| DELETE | `/projects/{id}` | Exclui (a interface pede confirmação) |
| GET | `/projects/{id}/export` | Documento JSON portátil versionado |
| POST | `/projects/import` | Valida e cria um projeto a partir de um documento |

A documentação interativa (OpenAPI) fica em `http://127.0.0.1:8000/docs` com o
backend em execução.

Erros seguem um formato único:

```json
{ "error": { "code": "validation_error", "message": "...", "details": [{ "loc": ["body", "name"], "message": "..." }] } }
```

## Formato de exportação

```json
{
  "format": "kyneticforge.project",
  "schemaVersion": 1,
  "appVersion": "0.1.0",
  "exportedAt": "2026-11-09T14:16:58Z",
  "project": { "name": "...", "description": "...", "robot": { "model": "rrr-3dof", "geometry": {}, "joints": [], "displayUnit": "m" } }
}
```

* `schemaVersion` identifica o formato. Documentos mais novos que a versão suportada
  são rejeitados com uma mensagem explícita; documentos mais antigos passariam por
  `app/services/migrations.py` (registro vazio na v1, estrutura pronta).
* A importação é validada **duas vezes**: no navegador (antes de enviar/renderizar)
  e no backend (autoritativo). Campos desconhecidos, NaN/∞, tamanhos > 256 KiB e
  ângulos fora dos limites são rejeitados; nada é salvo se a validação falhar.
* O JSON é apenas lido como dados — nunca avaliado ou executado.

## Decisões técnicas

| Decisão | Justificativa |
| --- | --- |
| **DH padrão** para o modelo | Convenção amplamente documentada e didática; facilita a futura generalização para N juntas e a importação de URDF. |
| **Z para cima** em todo o sistema | Convenção de robótica (ROS/REP-103). A câmera do Three.js recebe `up = +Z`, eliminando conversões de eixos. |
| **FK duplicada (NumPy + TS) com fixture compartilhada** | A interação exige cálculo local sem HTTP por quadro; a equivalência é garantida por testes nos dois lados contra a mesma fixture gerada pelo backend. |
| **Matrizes DH aplicadas diretamente aos grupos 3D** | A geometria exibida é, por construção, a cinemática calculada — não existe animação independente. |
| **`frameloop="demand"`** no Canvas | Renderiza apenas quando algo muda; zero custo de GPU em repouso. |
| **Visualizador em chunk separado (`React.lazy`)** | Three.js/R3F/Drei é a maior dependência; a interface aparece antes do 3D carregar. |
| **Configuração do robô em coluna JSON** + `schema_version` | Um projeto é um documento coeso; evita esquema relacional prematuro e mantém a mesma forma do arquivo exportado. Migrações por versão são possíveis. |
| **Regras de domínio em `robotics/validation.py`**, chamadas pelos schemas Pydantic | Uma única fonte de verdade para validação ao salvar, importar e no endpoint `/robotics/validate`. |
| **Modo aplicação: FastAPI serve `frontend/dist`** | Depois de `npm run build`, um único processo Python (`python -m app`) entrega interface e API na porta 8000, sem Node em execução. O `KyneticForge.bat` regera a interface quando o código-fonte é mais novo que o build. |
| **Proxy do Vite para `/api`** | O navegador fala com a mesma origem em desenvolvimento; CORS continua restrito a `localhost:5173/4173` para chamadas diretas. |
| **Sem React Router** | A v0.1 tem uma única tela de trabalho. O roteador será adicionado quando houver navegação real (ex.: galeria de projetos/modelos). |
| **Sem biblioteca de ícones/validação** | Um conjunto pequeno de ícones SVG e validadores escritos à mão evitam dependências desnecessárias. |
| **Interface em inglês** | Terminologia técnica de robótica (joint, end effector, TCP, DH) é majoritariamente em inglês em ferramentas de engenharia; a documentação está em português. |
| **Python local em `.tooling/`** quando 3.12+ não está instalado | O ambiente de desenvolvimento tinha apenas Python 3.9; `scripts/setup.ps1` instala um CPython 3.12 isolado na pasta do projeto via `uv`, sem alterar o sistema. |

## Segurança

* Nenhuma execução de código fornecido pelo usuário; JSON importado é validado contra
  esquemas estritos (`extra="forbid"`, `allow_inf_nan=False`).
* CORS restrito às origens de desenvolvimento configuradas (`KF_CORS_ORIGINS`).
* Tamanho máximo de importação: 256 KiB (`KF_MAX_IMPORT_BYTES`).
* Erros inesperados retornam mensagem genérica (detalhes apenas no log do servidor).
* Sem autenticação na v0.1 (aplicação local, conforme especificação).

## Pontos de extensão para versões futuras

* `robotics/kinematics.py`: a tabela DH já é uma estrutura de dados; um modelo
  genérico de N juntas pode substituir `dh_table()` (v0.4).
* `RobotConfig.model` é um literal (`"rrr-3dof"`) pensado para virar uma união
  discriminada de modelos.
* `services/migrations.py` recebe migrações de esquema de projeto.
* `appStore`/`robotStore` separam estado de UI e estado do robô, permitindo adicionar
  estado de trajetória/IK sem misturar responsabilidades.
