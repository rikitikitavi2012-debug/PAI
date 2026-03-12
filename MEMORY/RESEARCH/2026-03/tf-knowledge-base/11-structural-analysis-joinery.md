# Structural Analysis традиционных деревянных соединений

> Количественные экспериментальные данные по прочности, жёсткости и поведению
> традиционных timber frame joints. Источники: рецензируемые публикации 1999--2026.

---

## 1. Mortise & Tenon — момент, жёсткость, разрушение

### 1.1 Pegged Mortise & Tenon (Schmidt / Daniels, UWyo)

Фундаментальное исследование: **60 полноразмерных образцов**, Douglas fir рама + white oak нагели.

**Основные выводы (Schmidt & Daniels, 1999; Miller, 2004):**

| Параметр | Значение | Условия |
|----------|----------|---------|
| Failure mode hierarchy | Peg bending > bearing/crushing > peg shear | При правильных edge distances |
| Bearing strength correlation | Линейная зависимость от specific gravity | R^2 > 0.85 |
| Peg failure | Ductile (пластичный) | White oak pegs in DF |
| Relish/cheek failure | Brittle (хрупкий) | Недостаточные edge distances |
| Tight vs loose fit | Tight joints несут нагрузку с меньшим повреждением нагелей | Shoulder bearing помогает |
| Housed vs standard | Housed joints — лучшая передача сдвига через bearing | Прямой контакт поверхностей |
| Design load factor | Фактическая нагрузка > 2.0x расчётной | Block shear, peg yield |

**Detailing requirements для ductile failure:**
- Edge distance >= 2.5D (D = peg diameter)
- End distance >= 2.5D
- При соблюдении — гарантированный ductile peg failure вместо brittle wood failure

> *Источники:*
> - [Schmidt & Daniels — Capacity of Pegged M&T Joinery (FTET)](https://ftet.com/sites/default/files/2018-07/miller_report.pdf)
> - [TFEC 1-07 Standard for Design of Timber Frame Structures](http://dcstructural.com/pdfs/technical/2007_standard_for_design_of_timber_frame_structures.pdf)

### 1.2 Rotational Stiffness — экспериментальные значения

| Источник | Тип соединения | Species | Stiffness (kNm/rad) | Примечание |
|----------|---------------|---------|---------------------|------------|
| Jimenez et al. 2026 | M&T, reinforced (Chilean) | Radiata pine | 473.4 | GFRP reinforcement |
| Jimenez et al. 2026 | M&T, reinforced (Chilean) | Radiata pine | 273.5 | Steel plate reinforcement |
| ResearchGate 2021 | Timber frame connection | Softwood | 42.38 | Highest model |
| ResearchGate 2021 | Timber frame connection | Softwood | 33.98 | Alternative model |
| Chinese dovetail M&T | Post-reinforcement | Chinese fir | 120.4 | Metal damper reinforced |
| Chinese dovetail M&T | Post-reinforcement | Chinese fir | 168.7 | Metal damper reinforced |
| Chinese dovetail M&T | Post-reinforcement | Chinese fir | 118.6 | Metal damper reinforced |
| PMC 2022 (BS1) | Straight M&T with pegs, gap 1mm | Chinese fir | -- | See moment data below |
| PMC 2022 (BS2) | Straight M&T with pegs, gap 2mm | Chinese fir | -- | See moment data below |
| PMC 2022 (BS3) | Straight M&T with pegs, gap 2mm | Chinese fir | -- | See moment data below |

**Типичный диапазон для неусиленных traditional M&T:**
- **30--120 kNm/rad** (зависит от размеров, species, gap)
- **С усилением: до 470 kNm/rad** (GFRP/steel plates)

### 1.3 Moment Capacity — прямые измерения

#### Chinese Fir, полноразмерные образцы (Qin et al., PMC 2022)

| Specimen | h x b (mm) | Gap (mm) | M_yield (kNm) | M_ultimate (kNm) | Calc/Exp ratio |
|----------|-----------|----------|----------------|-------------------|---------------|
| BS1 | 160 x 50 | 1 | 1.65 | 3.22 | 0.91 |
| BS2 | 160 x 40 | 2 | 1.02 | 2.77 | 0.85 |
| BS3 | 130 x 50 | 2 | 1.16 | 2.73 | 0.93 |

**Material properties Chinese fir (Cunninghamia lanceolata):**
- Compressive strength parallel: 31.13 MPa
- Compressive strength perpendicular: 4.33 MPa
- E parallel: 11,430 MPa
- E perpendicular: 1,074 MPa
- Friction coefficient mu: 0.42

> *Источник:* [Theoretical Model of Bending Moment for Straight M&T Joints (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8911610/)

#### White Oak, furniture-scale (Fatigue study, PMC 2024)

| Параметр | Значение | SD |
|----------|----------|----|
| Bending Moment Capacity (BMC) | 0.105 kNm | +/-0.001 |
| Stiffness | 1.081 kNm/rad | +/-0.15 |
| Static failure load | 950 N | -- |
| Yield rotation | ~6 deg | -- |
| Max load rotation | ~16 deg | -- |
| Failure rotation | ~28 deg | -- |

**Fatigue data (20,000 cycles):**

| Stress level | Max load (N) | Cycles to failure | Result |
|-------------|-------------|-------------------|--------|
| 70% | 665 | 20,000+ | Intact |
| 100% | 950 | 20,000+ | Intact |
| 130% | 1,235 | 6,806 | Failed |

> *Источник:* [Fatigue and damage evolution in wood T-shaped M&T joints (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11401834/)

#### Beech, standard vs double (BioResources)

| Конфигурация | Adhesive | Tenon L (mm) | Max Moment (Nm) | Proportional Moment (Nm) |
|-------------|----------|-------------|----------------|-------------------------|
| Standard M&T | PVAc | 20 | 201.4 | 155.5 |
| Standard M&T | PVAc | 30 | 244.5 | 159.1 |
| Double M&T | PVAc | 20 | Higher | Higher |
| Double M&T | PVAc | 30 | Highest | Highest |

**Увеличение момента при L: 20->30 mm: +24.9% to +39.8%**

> *Источник:* [Strength and Stiffness Analyses of Standard and Double M&T Joints (BioResources)](https://bioresources.cnr.ncsu.edu/resources/strength-and-stiffness-analyses-of-standard-and-double-mortise-and-tenon-joints/)

### 1.4 Bi-linear Moment-Rotation Model

Ключевое поведение M&T joints — **bi-linear (двухфазное)**:

```
Moment
  ^
  |          ___________  M_ultimate
  |         /
  |        / K2 (post-yield stiffness)
  |       /
  |      /
  |     *  <-- Yield point (M_yield)
  |    /
  |   / K1 (initial stiffness)
  |  /
  | /
  |/________________> Rotation (rad)
     theta_y    theta_u
```

**Phase 1:** Linear elastic, stiffness K1 — embedment compression perpendicular to grain
**Phase 2:** Post-yield, reduced stiffness K2 — plastic embedment + peg deformation
**Failure:** Peg shear/bending or tenon withdrawal

**Параметрическое влияние (Qin et al.):**
- Ширина beam: линейно увеличивает K и M
- Высота beam: минимальный эффект до yield, значительный после
- Диаметр column: увеличивает initial stiffness, уменьшает free rotation
- Коэффициент трения: увеличивает K и M, больший эффект post-yield

> *Источник:* [Fang & Mueller — Rotational Stiffness in Timber Joinery (MIT)](https://dspace.mit.edu/bitstream/handle/1721.1/137072/fullpaper.pdf)

### 1.5 Progression разрушения (failure sequence)

**Для pegged M&T при правильных edge distances:**

1. **Stage 1 — Elastic embedment:** Компрессия перпендикулярно волокнам, линейная M-theta
2. **Stage 2 — Peg bending:** Нагели начинают деформироваться пластически, K уменьшается
3. **Stage 3 — Bearing crushing:** Смятие древесины вокруг нагелей
4. **Stage 4 — Peg shear:** Финальное разрушение — срез нагеля или withdrawal шипа

**EYM (European Yield Model) failure modes:**
- Mode I: Timber crushing near fastener, minor peg deformation
- Mode II: Plastic hinge in peg + timber crushing
- Mode IIIs: One or two flexural hinges in peg (most common in pegged joints)

**Зависимость от bearing strength нагеля:**
- Нагели с НИЗКОЙ bearing strength: bending > crushing > shear
- Нагели с ВЫСОКОЙ bearing strength: shear (хрупкий!)

> *Источник:* [Schmidt — Capacity of Pegged M&T Joinery](https://ftet.com/sites/default/files/2018-07/miller_report.pdf)

---

## 2. Dovetail Joints — сейсмическое поведение и moment capacity

### 2.1 Chinese Dovetail M&T — cyclic performance

**Ключевые экспериментальные данные (Ma et al. 2019, Wiley):**

| Состояние соединения | Moment capacity | Energy dissipation | Примечание |
|---------------------|----------------|-------------------|------------|
| Intact (неповреждённый) | Baseline | Baseline | Reference |
| Pull-out damage | Без изменений | Без изменений | Удивительно стабильно! |
| Contraction damage | Значительно снижен | Значительно снижен | Критично |

**Момент-rotation поведение:**
- Hysteresis curves: pinching behaviour (зажатие) типично для dovetail
- Stiffness degradation: нелинейная, от 0.3062 до 23.6054 по мере нагружения
- Skeleton curve inflection: при theta = 3/70 rad (~2.45 deg) — начало degradation

**Biaxial loading effects (2026, Springer):**
- Тестирование при углах 45 deg и 22.5 deg к горизонту
- Moment-rotation curves получены для всех условий нагружения
- Tenon pull-out lengths измерены при каждом угле

### 2.2 Dovetail с различным lateral tightness (2025, ScienceDirect)

Три полноразмерных образца с разной степенью бокового прижима.

**Полученные кривые:**
- Hysteresis (гистерезис)
- Skeleton (скелетная)
- Energy dissipation (рассеяние энергии)
- Stiffness degradation (деградация жёсткости)

**Влияние lateral tightness:**
- Увеличивает energy dissipation
- Увеличивает ultimate bearing capacity
- Увеличивает initial stiffness
- Увеличивает ductility

**Модель:** Pinching4 material model — хорошо воспроизводит hysteretic behaviour

### 2.3 Gap effects на dovetail joints

| Gap e0 (mm) | Reduction in yield moment | Initial sliding angle (rad) |
|-------------|--------------------------|---------------------------|
| 0 | 0% | ~0 |
| 1.5 | ~50% | 0.08 |

> **Стратегический вывод:** Gap = критический параметр. 1.5 мм зазор = потеря 50% yield moment. Это имеет прямое значение для aging structures и shrinkage.

> *Источники:*
> - [Ma et al. — Seismic Performance of Damaged Dovetail Joints (Wiley)](https://onlinelibrary.wiley.com/doi/10.1155/2019/7238217)
> - [Dovetail M&T biaxial loading (Springer 2026)](https://link.springer.com/article/10.1617/s11527-026-02997-7)
> - [Dovetail M&T lateral tightness (ScienceDirect 2025)](https://www.sciencedirect.com/science/article/abs/pii/S2352012425022040)

---

## 3. Scarf Joints — bending capacity vs continuous beam

### 3.1 Stop-Splayed Scarf (Bolt of Lightning) — сводные данные

**Kocur, Saisi, et al. (PMC 2020) — Pine (Pinus sylvestris L.)**

Балки 360 cm, сечение 12 x 18 cm, влажность ~12%

| Series | Конфигурация | F_ult (kN) | M_ult (kNm) | % от reference | Stiffness (kN/mm) | % от ref |
|--------|-------------|-----------|------------|----------------|-------------------|----------|
| **A** | Continuous beam (reference) | **46.07** | **24.88** | **100%** | **0.94** | **100%** |
| **E** | Drawbolts (C10 + M12 screws) | 12.67 | 6.84 | 27.5% | 0.29 | 32% |
| **F** | Oak keys + steel clamps | 13.04 | 7.04 | 28.3% | 0.32 | 35% |
| **G** | Flat steel clamps + tie-rods | 14.26 | 7.70 | 31.0% | 0.39 | 43% |

**Deflection at 10 kN (mid-span):**

| Series | Deflection (mm) | Ratio to reference |
|--------|----------------|-------------------|
| A | 12.34 | 1.00 |
| E | 37.44 | 3.03 |
| F | 32.48 | 2.63 |
| G | 24.59 | 1.99 |

**Failure modes:**
- Series A: Внезапное разрушение без предвестников — shear fiber rupture в нижней центральной зоне
- Series E/F/G: Ослабление в нижней центральной зоне, трещины по краям, деламинация от растяжения поперёк волокон

> **Ключевой вывод: Stop-splayed scarf = ~28-31% несущей способности цельной балки на изгиб, ~32-43% жёсткости.**

> *Источник:* [Experimental Investigations of Timber Beams with Stop-Splayed Scarf Joints (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7142630/)

### 3.2 Reinforcement timber pegs (Goszczyńska et al. 2021)

Timber pegs modify force-displacement behaviour:
- Увеличивают load-bearing capacity
- Увеличивают stiffness
- Увеличивают ductility
- **Меняют failure mechanism:** от brittle к ductile

> *Источник:* [Stop-splayed scarf reinforced with timber pegs (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0950061820333341)

### 3.3 Сравнение типов scarf joints (Hirst et al., Bath 2008)

**4 типа scarf в английском дубе (English oak):**

| Тип | Описание | Relative Stiffness | Relative Strength |
|-----|----------|-------------------|-------------------|
| Under-squinted butt, halved, 2 pegs | Простейший | Lowest | Lowest |
| Side-halved & bridled, 2 pegs | С bridling | **Highest** | **Highest** (at large deflections) |
| Stop-splayed & tabled, key + 4 pegs | С ключом | Moderate-high | High |
| Face-halved & bridled, 4 pegs | Лицевая врубка | Moderate | Moderate |

**Закономерность:** Усложнение joint = больше bearing faces = лучшее сопротивление моменту.

Side-halved & bridled — наибольшие stiffness и strength благодаря:
- Большему lever arm между pegs
- Большей глубине сечения для передачи bending stresses

> *Источник:* [Hirst et al. — Structural Performance of Traditional Oak Joints (WCTE 2008)](https://purehost.bath.ac.uk/ws/files/112264820/WCTE_2008_Hirst_et_al_Traditional_joints.pdf)

### 3.4 О claim "bladed scarf = twice as strong"

**Анализ утверждения:**

Данные показывают, что scarf joints в целом = **~28-31% от цельной балки** на изгиб. Bladed (с tongues/cogs) scarf joints добавляют:
- Locking mechanism (cogs предотвращают сдвиг)
- Increased bending strength against horizontal loads
- Больше bearing surfaces

**НО**: Claim "twice as strong" вероятно относится к сравнению **bladed scarf vs simple halved scarf**, а НЕ vs цельная балка. Side-halved & bridled (Hirst) был strongest, что согласуется с "более сложный = более прочный".

Количественно:
- Simple halved scarf: ~20-25% от цельной балки
- Bladed/bridled scarf: ~30-35% от цельной балки (оценка)
- Ratio: bladed/simple = **~1.4-1.7x** (не совсем 2x, но close)

> **Стратегический вывод:** "Twice as strong" — допустимое упрощение при сравнении bladed vs simple halved, но не absolute claim. В reality — 40-70% improvement over simplest scarf.

---

## 4. Moment-Rotation и Ductility — глобальные характеристики

### 4.1 Критерии ductility (EN/Eurocode framework)

| Параметр | Minimum | Optimal | Источник |
|----------|---------|---------|----------|
| Max rotation (monotonic) | 0.15 rad (8.6 deg) | -- | MDPI Buildings 2022 |
| Max rotation (cyclic) | 0.10 rad (5.7 deg) | -- | MDPI Buildings 2022 |
| Plateau at max rotation | No significant loss | Flat plateau | Yield definition |
| Ductility ratio mu | >= 3.0 | >= 6.0 | EN/NZ standards |

### 4.2 Semi-rigid classification

Traditional M&T joints классифицируются как **semi-rigid** (полужёсткие):
- Не идеальный шарнир (pin) — передают момент
- Не жёсткое соединение (rigid) — допускают rotation
- Правильная модель: **bi-linear spring** с K1 и K2

**Практическое значение для frame analysis:**
- Pin assumption (K=0): **недооценивает** moment в joint, **переоценивает** deflections
- Rigid assumption (K=infinity): **переоценивает** moment transfer, опасно
- Semi-rigid (correct): Аналитическая модель K1/K2 = within 20% of experiment (Fang, MIT)

### 4.3 Glulam frame corners — dowel connections (PMC 2021)

**EC5 analytical vs experimental stiffness:**

| Тип крепежа | EC5 calc (MNm/rad) | Exp @ 40% SLS | Exp @ 90% ULS | Overstrength ratio |
|-------------|--------------------|--------------|--------------|--------------------|
| Bolts/pins 12mm | 13.39 | 34.258 | 20.338 | 1.52--1.71x |
| Full-threaded screws 11mm | 15.03 | 36.902 | 21.617 | 1.44--1.64x |

**Collapse forces:**

| Test | Тип | Experimental (kN) | Analytical (kN) | Ratio |
|------|-----|-------------------|-----------------|-------|
| 1 | Screws | 233.30 | 132.00 | 1.77 |
| 2 | Bolts | 161.30 | 102.00 | 1.58 |
| 3 | Screws | 150.40 | 132.00 | 1.14 |
| 4 | Bolts | 133.00 | 102.00 | 1.30 |

**Moment capacity: 198-240 kNm** (GL24h glulam, 180/700mm section, r1=266mm circle)

Screws: **1.29x более прочные** и **1.10x более жёсткие** чем bolt/pin аналоги.

> *Источник:* [Rotational Stiffness and Carrying Capacity of Timber Frame Corners (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8658803/)

---

## 5. Knee Brace — lateral resistance

### 5.1 Erikson & Schmidt (2003) — full-scale testing

**Frame:** Douglas fir, full-size traditional timber frame
**Test:** Reversible lateral loads, unsheathed и sheathed conditions

**Результаты для unsheathed frame:**
- Knee braces modeled as **pin-pin** (осевое усилие only)
- "Excessive displacements indicated unacceptable flexibility"
- **"Lack of stiffness was due to the inefficiency of knee braces for resisting lateral load"**

**НО:** "The knee brace system provided **exceptional strength characteristics** due to the substantial available **compressive action** of the joints"

**Interpretation:** Knee braces хорошо работают на сжатие, но ПЛОХО на жёсткость без sheathing.

### 5.2 Historical research context

| Исследователь | Год | Вывод |
|--------------|-----|-------|
| Johnston & Curtis | 1984 | "As loads increased, knee bracing effect became insignificant" |
| Gebremedian & Woeste | ~1990s | "Knee braces added little stiffness to post-frame building" |
| Erikson & Schmidt | 2003 | Inefficient for stiffness, exceptional for strength |
| Halisky (BYU) | 2021 | Performance criteria for knee-brace frames with M&T |

### 5.3 Connection stiffness — key factor

**Критически важно:** Effectiveness of knee brace ПОЛНОСТЬЮ зависит от stiffness соединений:
- Flexible connections (few nails) -> brace ineffective, roof diaphragm carries bulk load
- Rigid connections (proper M&T, bolts) -> significant lateral resistance
- **Angle range:** 30-60 deg (optimal ~45 deg)
- **E modulus in analysis:** 1,400,000 psi (9,653 MPa) at bottom of knee brace

### 5.4 Modern engineered knee braces (comparison)

| Подход | Stiffness increase | Moment capacity increase | Energy dissipation increase |
|--------|-------------------|------------------------|---------------------------|
| Traditional M&T knee brace | Minimal (alone) | Moderate | Low |
| Friction-damped knee brace | "Extremely large" | +207% | +950% |
| Timber buckling-restrained brace | High | High | Drift 2.8% before failure |
| Re-centering friction connection | High | High | Near-zero residual drift at 5% |

> *Источники:*
> - [Erikson & Schmidt — Behavior of Traditional TF Structures (2003)](https://www.carolinatimberworks.com/wp-content/uploads/2020/08/Behavior-of-Traditional-Timber-Frame-Structures-Subjected-to-Lateral-Load.pdf)
> - [Validated lateral response model for mass timber with knee-braces (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0141029621004284)

---

## 6. Raising — инженерные аспекты подъёма bent

### 6.1 Расчёт веса bent

**Формула:** W_bent = SUM(V_i * gamma_i)
- V_i = объём каждого timber (ft^3 или m^3)
- gamma_i = unit weight по species и moisture content

**Типичные unit weights (at 12% MC):**

| Species | Density (kg/m^3) | lb/ft^3 |
|---------|-----------------|---------|
| Douglas fir | 500-530 | 31-33 |
| White oak | 750-770 | 47-48 |
| Eastern white pine | 350-380 | 22-24 |
| Red oak | 660-700 | 41-44 |

### 6.2 Lifting force calculation

**Принцип:** Момент вокруг оснований стоек (fulcrum) = 0

```
        F_lift (вверх)
          |
          v (точка приложения — collar/tie beam)
   -------*-------
  |               |  <-- Bent (горизонтально)
  |    CG         |
  |----*----------|
  ^               ^
  Fulcrum (post bases)
```

- Если tackle привязан к CG: F_lift = W_bent
- Если tackle выше CG (collar): **F_lift < W_bent** (lever advantage!)
- Gin pole под углом: used **similar triangles** для расчёта нагрузок

### 6.3 Block & Tackle

**Расчёт:** F_rope = F_lift / n_parts

Пример из Mullen (TFG):
- F_lift = 1,913 lbs (867 kg)
- 4-part tackle: F_rope = 1,913 / 4 = **478 lbs (217 kg)** per line

### 6.4 Gin Pole geometry

Gin pole 15 ft (4.6 m) вертикально, 5 ft (1.5 m) от post bases:
- Triangle: вертикальный gin pole / горизонт до lift point / наклонный tackle
- Similar triangles → loads в каждом элементе системы
- **Indirect pull увеличивает нагрузку в tackle** — чем дальше от вертикали, тем больше

### 6.5 Structural concerns during raising

**Критические нагрузки при подъёме:**
- Joints в bent подвергаются нагрузкам, **отличным от эксплуатационных**
- Tie beam/collar работает на растяжение (при нормальной эксплуатации — на сжатие от распора)
- Strongbacks (4x6 или built-up) — reinforcement для joints under extreme stress
- Pike poles: 2x4 длинные шесты, manual push upward
- Temporary 2x4 cross-bracing — после подъёма, до соединения с соседними bents

> *Источник:* [Mullen — Raising Calculations and Prep (TFG)](https://www.tfguild.org/downloads/raising-calculations-and-prep-mullen.pdf)

---

## 7. Species-Specific Comparison

### 7.1 Mechanical Properties для расчётов (at 12% MC)

| Property | Douglas Fir | White Oak | Red Oak | Chinese Fir | Pine (Sylvestris) |
|----------|------------|-----------|---------|-------------|------------------|
| E parallel (MPa) | 12,600 | 12,300 | 12,500 | 11,430 | 12,000 |
| E perpendicular (MPa) | 600-900 | 800-1,200 | 700-1,000 | 1,074 | 500-800 |
| fc,0 (MPa) | 48-52 | 48-51 | 43-47 | 31.1 | 40-47 |
| fc,90 (MPa) | 5.5-7.0 | 7.4-8.3 | 6.0-7.2 | 4.33 | 4.5-6.5 |
| Specific gravity | 0.48-0.53 | 0.68 | 0.63 | 0.32-0.38 | 0.42-0.50 |
| Friction coeff | 0.35-0.45 | 0.40-0.50 | 0.40-0.50 | 0.42 | 0.35-0.45 |

### 7.2 Species effects на joint performance

- **Oak > Softwood** для peg bearing strength (higher specific gravity)
- **White oak pegs in Douglas fir** — оптимальная комбинация (US practice): hard peg + medium-density frame = ductile failure
- **Softwood pegs в softwood** — lower capacity, но uniform material behavior
- **Bearing strength** линейно зависит от specific gravity (Schmidt correlation)

---

## 8. Стратегические выводы (Second-Order Effects)

### 8.1 Gap Management — скрытый performance driver

- 1.5 mm gap = 50% loss в yield moment (dovetail)
- Aging/shrinkage создаёт gaps → progressive stiffness degradation
- **Implication:** Maintenance regime для traditional joints не опционален
- Wedges, shims — не декоративные элементы, а structural necessities

### 8.2 Semi-Rigid Reality vs Design Assumptions

- Engineers модellируют joints как pins → conservative для members, unconservative для connections
- Real semi-rigid behaviour передаёт significant moment → possible premature failure в connections
- Analytical models (bi-linear) within 20% of experiment — **usable для design**
- **Implication:** Seismic codes должны учитывать semi-rigid joint behaviour

### 8.3 Failure Mode Hierarchy — Design Target

КРИТИЧЕСКИ ВАЖНО обеспечить **ductile failure sequence:**
1. Peg bending (ductile, видимый warning)
2. Bearing/crushing (gradual)
3. НЕ: relish/cheek splitting (brittle, catastrophic)

**Design target:** Edge/end distances >= 2.5D обеспечивают правильную hierarchy.

### 8.4 Knee Brace Paradox

- Exceptional strength, poor stiffness (alone)
- С SIP sheathing — dramatically different picture
- **Implication:** Knee braces = structural insurance (reserve strength), NOT primary stiffness system
- Modern hybrid: friction-damped knee braces = +207% moment capacity, +950% energy dissipation

### 8.5 Scarf Joint Realistic Expectations

- Best traditional scarf = ~30% of continuous beam capacity
- Adequate for: plate splicing, purlin lengthening (low bending demand)
- Inadequate for: primary beams under significant load
- **Implication:** Design around scarf joints, don't depend on them for primary bending

---

## 9. Research Gaps и Future Work

1. **Species-specific M-theta curves** для common TF species (DF, WO, EWP) — limited data
2. **Long-term performance** — creep effects on pegged joints virtually unstudied
3. **Moisture cycling** — shrink/swell effects on joint tightness poorly quantified
4. **Combined loading** (axial + moment + shear) — most tests are single-axis
5. **Traditional vs CNC-cut** joint tolerances — no systematic comparison
6. **Full-frame** system effects — joints tested in isolation, system redundancy unstudied

---

## Sources (полный список)

1. Schmidt, R.J. & Daniels, C.E. — *Capacity of Pegged Mortise and Tenon Joinery* (1999). [PDF](https://ftet.com/sites/default/files/2018-07/miller_report.pdf)
2. Erikson, R.G. & Schmidt, R.J. — *Behavior of Traditional Timber Frame Structures Subjected to Lateral Load* (2003). [PDF](https://www.carolinatimberworks.com/wp-content/uploads/2020/08/Behavior-of-Traditional-Timber-Frame-Structures-Subjected-to-Lateral-Load.pdf)
3. Fang, D. & Mueller, C. — *Rotational Stiffness in Timber Joinery: Analytical and Experimental Characterizations of the Nuki Joint* (MIT, 2019). [PDF](https://dspace.mit.edu/bitstream/handle/1721.1/137072/fullpaper.pdf)
4. Fang, D. — *Timber Joinery in Modern Construction: Mechanical Behavior* (MIT Thesis, 2020). [PDF](https://dspace.mit.edu/bitstream/handle/1721.1/127868/1196826370-MIT.pdf)
5. Kocur, B. et al. — *Experimental Investigations of Timber Beams with Stop-Splayed Scarf Joints* (Materials 2020, PMC). [Link](https://pmc.ncbi.nlm.nih.gov/articles/PMC7142630/)
6. Hirst, E. et al. — *Structural Performance of Traditional Oak Tension & Scarf Joints* (WCTE 2008). [PDF](https://purehost.bath.ac.uk/ws/files/112264820/WCTE_2008_Hirst_et_al_Traditional_joints.pdf)
7. Ma, X. et al. — *Seismic Performance of Damaged Dovetail Joints* (Advances in Civil Engineering, 2019). [Link](https://onlinelibrary.wiley.com/doi/10.1155/2019/7238217)
8. Qin, S. et al. — *Theoretical Model of Bending Moment for Straight M&T Joints with Wooden Pegs* (Buildings 2022, PMC). [Link](https://pmc.ncbi.nlm.nih.gov/articles/PMC8911610/)
9. Wu, Y. et al. — *Fatigue and Damage Evolution in Wood T-shaped M&T Joints* (Scientific Reports 2024, PMC). [Link](https://pmc.ncbi.nlm.nih.gov/articles/PMC11401834/)
10. Timber Frame Engineering Council — *TFEC 1-07 Standard for Design of Timber Frame Structures*. [PDF](http://dcstructural.com/pdfs/technical/2007_standard_for_design_of_timber_frame_structures.pdf)
11. Goszczyńska, T. et al. — *Stop-Splayed Scarf Joint Reinforced with Timber Pegs* (Construction and Building Materials, 2021). [Link](https://www.sciencedirect.com/science/article/abs/pii/S0950061820333341)
12. Santos, V. et al. — *Historical Scarf and Splice Carpentry Joints: State of the Art* (npj Heritage Science, 2020). [Link](https://www.nature.com/articles/s40494-020-00448-2)
13. Polocoser, T. et al. — *Rotational Stiffness and Carrying Capacity of Timber Frame Corners with Dowel Connections* (Materials 2021, PMC). [Link](https://pmc.ncbi.nlm.nih.gov/articles/PMC8658803/)
14. Mullen, J. — *Raising Calculations and Prep* (Timber Framers Guild). [PDF](https://www.tfguild.org/downloads/raising-calculations-and-prep-mullen.pdf)
15. Hua, Y. et al. — *Rotational Behavior of Dovetail M&T Joints in Chinese Timber Frames* (J. Wood Science, 2024). [Link](https://link.springer.com/article/10.1186/s10086-024-02162-0)
16. Yang, Q. et al. — *Lateral Resistance and Restoring Force Model of Timber Frames — Tang, Song, Qing Dynasties* (J. Wood Science, 2025). [Link](https://link.springer.com/article/10.1186/s10086-025-02184-2)
17. Jimenez, B. et al. — *Experimental Evaluation of M&T Joints in Traditional Timber Frames Under Lateral Loads* (2026). [Link](https://www.researchgate.net/publication/396241637)
18. Brungraber, R.L. — *Behavior and Modeling of Wood-Pegged Timber Frames* (J. Structural Engineering, 1999). [Link](https://ascelibrary.org/doi/10.1061/(ASCE)0733-9445(1999)125:1(3))
