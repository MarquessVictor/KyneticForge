# Modelo cinemático — KyneticForge Studio v0.1.0

Este documento descreve a convenção de coordenadas, o modelo do braço 3-DOF e as
equações de cinemática direta implementadas em
`backend/app/robotics/kinematics.py` (referência, NumPy) e
`frontend/src/features/kinematics/forwardKinematics.ts` (tempo real, TypeScript).

## 1. Convenções globais

| Item | Convenção |
| --- | --- |
| Sistema de coordenadas | Destro (right-handed) |
| Eixo vertical | **+Z para cima** (mundo e visualizador 3D) |
| Frente do robô (pose zero) | +X |
| Unidades internas | **SI**: metros (m) e radianos (rad) |
| Unidades exibidas | Comprimentos em m, cm ou mm (por projeto); ângulos em graus |
| Matrizes | Homogêneas 4×4, `x_pai = T · x_filho`, composição da esquerda para a direita |
| Armazenamento das matrizes no frontend | Vetor de 16 números em ordem **row-major** (igual a `T.flatten()` no NumPy) |
| Ângulo positivo | Regra da mão direita em torno do eixo da junta |

O visualizador usa exatamente o mesmo referencial: a câmera tem `up = (0, 0, 1)`,
portanto nenhuma troca de eixos (Y-up ↔ Z-up) é feita entre a matemática e a
renderização.

## 2. O braço RRR de 3 graus de liberdade

```
          J3 (cotovelo) ●━━━━━━━━━━━ L2 ━━━━━━━━━━━▶ TCP {3}
                       ╱
               L1     ╱
                     ╱
   J2 (ombro) ●━━━━━╯          z
              ┃                 ▲   y
              ┃ L0              │  ╱
              ┃                 │ ╱
   J1 (base) ═╩═  {0}           └────▶ x
```

* **J1 — Base**: rotação em torno do eixo Z do mundo (guinada / yaw).
* **J2 — Ombro**: rotação em torno de um eixo horizontal, perpendicular ao plano do braço.
* **J3 — Cotovelo**: rotação paralela ao ombro.
* **L0** (`baseHeight`): altura do eixo do ombro em relação ao piso (pode ser 0).
* **L1** (`upperArmLength`): ombro → cotovelo.
* **L2** (`forearmLength`): cotovelo → efetuador final (TCP).

### Parâmetros padrão

| Parâmetro | Valor | Junta | Mín. | Máx. | Home |
| --- | --- | --- | --- | --- | --- |
| L0 | 0,30 m | J1 Base | −180° | 180° | 30° |
| L1 | 0,40 m | J2 Shoulder | −45° | 135° | 60° |
| L2 | 0,30 m | J3 Elbow | −150° | 150° | −75° |

## 3. Tabela de Denavit–Hartenberg (convenção padrão / distal)

Cada elo é descrito por

```
A_i = Rot_z(θ_i) · Trans_z(d_i) · Trans_x(a_i) · Rot_x(α_i)

      ⎡ cθ  −sθ·cα   sθ·sα   a·cθ ⎤
A_i = ⎢ sθ   cθ·cα  −cθ·sα   a·sθ ⎥
      ⎢ 0     sα      cα      d   ⎥
      ⎣ 0     0       0       1   ⎦
```

| i | θ_i | d_i | a_i | α_i |
| --- | --- | --- | --- | --- |
| 1 | q1 | L0 | 0 | +π/2 |
| 2 | q2 | 0 | L1 | 0 |
| 3 | q3 | 0 | L2 | 0 |

Referenciais:

* **{0}** — mundo, na base, Z para cima.
* **{1}** — no ombro (altura L0). Como α1 = +π/2, o eixo `y1` aponta para cima e `z1`
  (eixo de J2) fica horizontal: `z1 = (sin q1, −cos q1, 0)`.
* **{2}** — no cotovelo; `x2` aponta ao longo do braço superior; `z2` é o eixo de J3.
* **{3}** — referencial da ferramenta (TCP) na ponta do antebraço; `x3` é a direção
  de aproximação da ferramenta.

A junta *i* está na origem de {i−1} e gira em torno de `z_(i−1)`.

## 4. Cinemática direta

```
T_0_1 = A1
T_0_2 = A1 · A2
T_0_3 = A1 · A2 · A3        (pose do efetuador final)
```

Posições das juntas (mundo): J1 = origem de {0}, J2 = origem de T_0_1,
J3 = origem de T_0_2, TCP = origem de T_0_3.

### Forma fechada (usada para verificação)

```
r = L1·cos(q2) + L2·cos(q2 + q3)        (alcance horizontal a partir do eixo Z)
x = cos(q1) · r
y = sin(q1) · r
z = L0 + L1·sin(q2) + L2·sin(q2 + q3)
```

Interpretação: q2 = 0 deixa o braço superior horizontal; q2 > 0 o eleva; q3 é medido
em relação ao braço superior (q3 = 0 → braço esticado; q3 < 0 → cotovelo "para baixo").

### Exemplos verificados analiticamente (L0 = 0,3; L1 = 0,4; L2 = 0,3)

| q1 | q2 | q3 | TCP esperado (m) |
| --- | --- | --- | --- |
| 0° | 0° | 0° | (0,7; 0; 0,3) |
| 0° | 90° | 0° | (0; 0; 1,0) |
| 90° | 0° | 0° | (0; 0,7; 0,3) |
| 180° | 0° | 0° | (−0,7; 0; 0,3) |
| 0° | 0° | −90° | (0,4; 0; 0) |
| 0° | 0° | 180° | (0,1; 0; 0,3) |
| 30° | 60° | −75° (home) | (0,42416; 0,24489; 0,56876) |

Todos esses casos estão em `backend/tests/test_kinematics.py` e/ou
`frontend/src/features/kinematics/forwardKinematics.test.ts`.

## 5. Validação e limites

Regras de domínio (`backend/app/robotics/validation.py`, espelhadas em
`frontend/src/utils/validation.ts`):

| Regra | Valor |
| --- | --- |
| L1, L2 mínimos | 0,01 m |
| L0 mínimo | 0 m |
| Comprimento máximo de qualquer parâmetro | 10 m |
| Limites de junta | dentro de [−360°, 360°], com mín < máx |
| Ângulo atual e home | dentro dos limites (tolerância 1e−9 rad) |
| Valores numéricos | finitos (NaN/∞ rejeitados) |

* **No backend**, ângulos fora dos limites geram erro `422` em `/kinematics/forward`
  (quando `jointLimits` é enviado) e invalidam a configuração ao salvar/importar.
* **Na interface**, o slider é restrito aos limites; valores digitados fora dos
  limites são **saturados** (clamp) no limite mais próximo e um aviso é registrado no
  painel de eventos.
* Colisões (incluindo com o piso) **não** são verificadas na v0.1.0.

## 6. Consistência matemática ↔ renderização

Para evitar duas implementações divergentes:

1. **Implementação de referência**: NumPy no backend.
2. **Fixture compartilhada**: `shared/fixtures/kinematics-reference.json` é gerada pelo
   backend (`python -m scripts.generate_fixtures`) com 12 casos (poses conhecidas,
   extremos de limite, geometria assimétrica e casos aleatórios com semente fixa).
   * `backend/tests/test_reference_fixture.py` falha se a fixture divergir da
     implementação NumPy.
   * `forwardKinematics.test.ts` exige que o TypeScript reproduza cada caso com
     tolerância de 1e−9.
3. **Renderização = matemática**: o visualizador monta a hierarquia
   `{0} → {1} → {2} → {3}` e define a matriz local de cada grupo Three.js como `A_i`
   (`matrixAutoUpdate = false`). O Three.js compõe as matrizes exatamente como
   `A1·A2·A3`. `sceneTransforms.test.ts` monta essa mesma hierarquia e confirma que
   as posições de mundo calculadas pelo Three.js coincidem com a referência NumPy.
4. **Verificação em execução**: após 400 ms sem alterações, o frontend envia a pose
   atual a `POST /api/v1/kinematics/forward` e compara as matrizes. O resultado
   ("Matches NumPy reference · max |Δ|") aparece no painel Kinematics e no indicador
   de status. Nenhuma requisição é feita por quadro de animação.

## 7. Precisão numérica

* Todos os cálculos usam ponto flutuante de 64 bits (IEEE-754 double) nos dois lados.
* As diferenças observadas entre TypeScript e NumPy são da ordem de 1e−16 m
  (erro de arredondamento), bem abaixo da tolerância de 1e−9 adotada nos testes.
* A interface exibe comprimentos com resolução de 0,1 mm e ângulos com 0,01°.
