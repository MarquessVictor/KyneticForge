# Roadmap — KyneticForge Studio

Legenda: ✅ implementado · 🔜 planejado (não implementado)

## v0.1.0 — MVP (atual) ✅

* ✅ Braço RRR de 3 graus de liberdade com geometria configurável (L0, L1, L2).
* ✅ Cinemática direta (DH padrão) em NumPy (referência) e TypeScript (tempo real).
* ✅ Fixture de equivalência compartilhada + verificação contínua contra o backend.
* ✅ Visualizador 3D (React Three Fiber/Drei): grade, eixos, câmera orbital, seleção,
  destaque, triedros DH opcionais, redefinição de câmera.
* ✅ Controle de juntas: sliders, campos numéricos, limites, home, restauração.
* ✅ Painel matemático: TCP, juntas, eixos, tabela DH, matrizes locais e de mundo;
  modos simples e detalhado.
* ✅ Projetos em SQLite: criar, listar, abrir, salvar, renomear, excluir (com confirmação).
* ✅ Exportação/importação JSON com `schemaVersion` e validação dupla.
* ✅ Testes automatizados (pytest + Vitest), lint (Ruff, ESLint) e formatação (Prettier).

## v0.2 — Cinemática inversa 🔜

* Cinemática inversa analítica para o RRR (soluções cotovelo acima/abaixo).
* Seleção de alvo 3D no visualizador (gizmo de arrasto do TCP).
* Animação interpolada entre poses (interpolação no espaço das juntas).

## v0.3 — Trajetórias e análise 🔜

* Planejamento de trajetórias (espaço das juntas e cartesiano).
* Visualização do espaço de trabalho (workspace) alcançável.
* Detecção e alerta de singularidades (ex.: braço totalmente esticado, q3 = 0/π).
* Jacobiano e manipulabilidade no painel matemático.

## v0.4 — Modelos e colisões 🔜

* Importação de modelos URDF.
* Modelos com N juntas e tipos diferentes (prismáticas, punho esférico).
* Detecção de colisões (inclusive com o piso).

## v0.5 — Dinâmica 🔜

* Simulação dinâmica (massas, inércias, gravidade).
* Integração com motor de física.
* Motores e sensores virtuais.

## v1.0 — Conectividade 🔜

* Integração com ROS 2.
* Conectividade com robôs externos.
* Ferramentas de IA aplicadas à robótica.

## Melhorias técnicas pendentes (sem versão definida) 🔜

* Testes end-to-end automatizados no navegador (ex.: Playwright).
* Desfazer/refazer (undo/redo) de alterações.
* Migrações de banco de dados com Alembic quando o esquema relacional evoluir.
* Internacionalização da interface (pt-BR/en).
