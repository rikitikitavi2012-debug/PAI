# Glulam Timber Frame Connections -- Research Report

**Date**: 2026-03-12
**Researcher**: Ava Sterling (ClaudeResearcher)
**Scope**: DEEP -- comprehensive analysis
**Queries executed**: 16 parallel searches across 6 dimensions

---

## 1. Glulam Strength Classes -- Reference Data

### GL24h (Homogeneous)
| Property | Value | Unit |
|----------|-------|------|
| Bending strength (f_m,k) | 24 | N/mm2 |
| Tensile strength parallel (f_t,0,k) | 19.2 | N/mm2 |
| Tensile strength perpendicular (f_t,90,k) | 0.5 | N/mm2 |
| Compressive strength parallel (f_c,0,k) | 24 | N/mm2 |
| Compressive strength perpendicular (f_c,90,k) | 2.5 | N/mm2 |
| Shear strength (f_v,k) | 3.5 | N/mm2 |
| Modulus of elasticity mean (E_0,mean) | 11,500 | N/mm2 |
| Modulus of elasticity 5% (E_0,05) | 9,600 | N/mm2 |
| Density mean | 385 | kg/m3 |

### GL28h (Homogeneous)
| Property | Value | Unit |
|----------|-------|------|
| Bending strength (f_m,k) | 28 | N/mm2 |
| Tensile strength parallel (f_t,0,k) | 22.3 | N/mm2 |
| Tensile strength perpendicular (f_t,90,k) | 0.5 | N/mm2 |
| Compressive strength parallel (f_c,0,k) | 28 | N/mm2 |
| Compressive strength perpendicular (f_c,90,k) | 2.5 | N/mm2 |
| Shear strength (f_v,k) | 3.5 | N/mm2 |
| Modulus of elasticity mean (E_0,mean) | 12,600 | N/mm2 |
| Modulus of elasticity 5% (E_0,05) | 10,500 | N/mm2 |
| Density mean | 410 | kg/m3 |

### GL32h (Homogeneous)
| Property | Value | Unit |
|----------|-------|------|
| Bending strength (f_m,k) | 32 | N/mm2 |
| Tensile strength parallel (f_t,0,k) | 25.6 | N/mm2 |
| Tensile strength perpendicular (f_t,90,k) | 0.5 | N/mm2 |
| Compressive strength parallel (f_c,0,k) | 32 | N/mm2 |
| Compressive strength perpendicular (f_c,90,k) | 3.0 | N/mm2 |
| Shear strength (f_v,k) | 3.5 | N/mm2 |
| Modulus of elasticity mean (E_0,mean) | 14,200 | N/mm2 |
| Modulus of elasticity 5% (E_0,05) | 11,800 | N/mm2 |
| Density mean | 430 | kg/m3 |

**Key insight**: Shear strength (3.5 N/mm2) is identical across ALL grades -- this is the critical value for traditional joinery connections where shear governs (mortise-tenon, pegged joints). Upgrading from GL24h to GL32h gains 33% in bending but ZERO in shear. For timber frame joinery, GL24h may be the cost-optimal choice unless bending capacity governs.

**Source**: EN 14080:2013 Tables 4-5; [Hasslacher Glulam Brochure](https://www.hasslacher.com/data/_dateimanager/broschuere/HNT-Brettschichtholz-EN.pdf); [ResearchGate GL properties table](https://www.researchgate.net/figure/Mechanical-properties-of-materials-GL24h-GL28h-GL32h-Glued-Laminated-Timber-grades_tbl1_339994559); [Structural Basics](https://www.structuralbasics.com/glulam-strength-stiffness/)

---

## 2. Glulam-Specific Joint Behavior

### How GL Connections Differ from Solid Timber

**Advantages of glulam in connections**:
- Kiln-dried (2-15% MC) -- significantly less warping and shrinkage than solid timber
- A 24-inch-deep glulam beam decreases ~3mm (1/8 in.) when MC drops from 12% to 8%
- Uniform material properties -- reduced variability vs. natural defects in solid timber
- Larger cross-sections achievable without old-growth timber
- CNC-compatible -- precise mortise-tenon fabrication

**Critical differences**:
- Glue lines introduce potential failure planes not present in solid wood
- Lamination boundaries affect shear flow differently
- Perpendicular-to-grain tension is MORE critical in glulam because glue lines are perpendicular to the loading direction in typical beam orientations
- Finger joints in lamellas can induce cracks to adhesive seams

### Experimental Data on Glulam Mortise-Tenon Joints

**Study**: "Application of Modern Wood Product Glulam in Timber Frame With Tenon-Mortise Joints and Its Structural Behavior" (Journal of Renewable Materials, Vol. 7, No. 5)

- 30 full-scale tenon-mortise joints manufactured with CNC and tested under monotonic loading
- Round rectangular tenon-mortise joints were COMPARABLE with traditional solid timber joints
- Adhesive between tenon and mortise:
  - **Stiffness increase: 4.3x (430%)**
  - **Moment capacity increase: 27.4%**
- CNC fabrication was time and labor saving vs. traditional manual work
- Variables tested: dimension, shape, processing error, adhesive

**Source**: [TechScience JRM](https://www.techscience.com/jrm/v7n5/30552); [ResearchGate](https://www.researchgate.net/publication/333168962)

### Reinforced Glulam Mortise-Tenon Joints

- 27 full-scale specimens tested with bamboo scrimber plate reinforcement
- Initial stiffness increased by 11.4% to 91.8%
- Moment carrying capacity increased by 13.5% to 41.7%

**Source**: [Journal of Wood Science, Springer](https://jwoodscience.springeropen.com/articles/10.1186/s10086-019-1816-2)

### Retrofitting with Laser-Cut Glulam Joints

- Computer-aided laser cutting for precise glulam mortise-tenon retrofitting
- Production accuracy and speed improved
- Reduced need for on-site fabrication
- Various configurations: blind mortise-tenon, corner blind, interlocking, hybrid

**Source**: [PMC/NIH](https://pmc.ncbi.nlm.nih.gov/articles/PMC7203072/); [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2405844020305168)

---

## 3. Delamination Risks at Joint Locations

### Critical Thresholds

- **60% cross-section width delamination** = structural integrity turning point
- Full-width delamination at beam ends affects both strength AND stiffness
- Longer delamination zones = more severe effect
- Non-symmetric delamination causes lateral instability, increasing stresses and deformations

### Location-Dependent Effects

- **Low shear stress areas**: delamination is NOT a problem (symmetric, not full-width)
- **High shear stress areas** (beam ends, connection zones): delamination IS critical
- Finger-joint connections in lamellas can propagate cracks to adhesive seams between lamellas

### Practical Implications for TF Joinery

**CRITICAL FINDING**: Traditional timber frame connections (mortise-tenon, housed joints) concentrate stresses at beam ends and connection zones -- exactly where delamination is MOST dangerous in glulam. This is the primary engineering concern for using glulam in traditional TF joinery.

### Glue Line Testing Standards

- EN 14080 requires delamination testing via moisture gradient cycling
- Moisture gradient induces tensile stresses perpendicular to glue line
- Result: either timber fracture (acceptable) or glue line delamination (failure)
- Block shear tests provide complementary verification of bond integrity

**Sources**: [Tandfonline - Effect of cracks](https://www.tandfonline.com/doi/full/10.1080/17480272.2025.2481453); [ScienceDirect - Failure behaviour](https://www.sciencedirect.com/science/article/abs/pii/S0950061817315507); [Springer - SHM of glulam](https://link.springer.com/article/10.1007/s00107-024-02140-9); [BioResources - Delamination test methods](https://bioresources.cnr.ncsu.edu/resources/comparison-of-test-methods-for-the-determination-of-delamination-in-glued-laminated-timber/)

---

## 4. Connection Failure Modes in Glulam

### Primary Failure: Perpendicular-to-Grain Tension Splitting

This is the **dominant failure mode** in glulam connections:

1. **Mechanism**: Restrained shrinkage + loading creates tension perpendicular to grain
2. **Result**: Splitting parallel to grain, starting at fastener/joint locations
3. **Propagation**: Cracks propagate fast along wood grain toward member ends
4. **Character**: BRITTLE failure (no warning, sudden)

### Causes in Traditional TF Connections

- Notching at beam-column joints (e.g., housed dovetails)
- Eccentric or out-of-plane loading
- Loading beams from the tension side
- Insufficient distance from fasteners to member end
- Restrained shrinkage (bolts that prevent natural wood movement)

### Design Solutions

- **Slotted holes**: Allow wood movement without perpendicular stresses
- **Compression bearing**: Transfer loads through compression whenever possible
- **Self-tapping screws**: As reinforcement against splitting
- **Adequate end/edge distances**: Per Eurocode 5 minimum spacing requirements
- **Moisture management**: Prevent condensation at metal connectors in cold zones

**Source**: [APA Glulam Connection Details](https://www.anthonyforest.com/assets/pdf/apa/glulam/Tech_Note_Glulam_Connection_Details.pdf); [BDC Network](https://www.bdcnetwork.com/blog/basics-glulam-connection-detailing); [Springer - Seismic performance](https://link.springer.com/article/10.1186/s10086-024-02163-z)

---

## 5. Fire Performance

### Char Rate Data

| Parameter | Value | Source |
|-----------|-------|--------|
| Nominal char rate | 0.635 mm/min | USDA Forest Products Lab |
| Equivalent rate | ~38 mm/hr | Calculated |
| Alternative measure | 25 mm per 30 min | Industry guideline |
| Eurocode 5 (EN 1995-1-2) | 0.65 mm/min (softwood glulam) | EC5 Part 1-2 |
| One-directional charring rate | ~1.5 in/hr (38 mm/hr) | APA/Anthony Forest |

### Three-Layer Model

1. **Charred zone**: Completely combusted, zero strength
2. **Heat-affected (pyrolysis) zone**: Temperatures >100C, zero residual resistance
3. **Residual section**: Retains full initial strength and stiffness

For fire-resistance calculations, **effective char depth = nominal char depth + pyrolysis zone** (the "zero-strength" layer). This is always deeper than nominal char.

### Connections Under Fire

**CRITICAL**: Metal fasteners conduct heat directly into the timber member.

- Char rate at connections MUST be increased above standard design values due to steel heat conduction
- Exposed fasteners require fire-rated protection equivalent to the member rating
- For 1-hour rating: 38mm (1.5 in.) wood cover, OR 16mm (5/8 in.) Type X gypsum board
- Concealed connections (recessed steel plates with wood plugs) are preferred for exposed glulam

### Glulam vs. Solid Timber in Fire

Glulam actually performs WELL in fire due to:
- Large cross-sections (heavy timber = slow charring relative to mass)
- Predictable char layer formation
- Adhesive type matters: MUF/PRF adhesives maintain bond above 100C longer than PUR
- EN 14080 requires adhesives meeting bond integrity under fire conditions

**Sources**: [USDA FPL Char Rates](https://www.fpl.fs.usda.gov/documnts/pdf2021/fpl_2021_hasburgh001.pdf); [TimberLab Research](https://timberlab.com/uploads/resources/TE0206-DETERMINATION-OF-CHAR-RATES-FOR-GLULAM-COLUMNS-EXPOSED-TO-A-STANDARD-FIRE-FOR-THREE-HOURS.pdf); [Rothoblaas Fire Safety](https://www.rothoblaas.com/blog/fire-safety-design-and-construction-details-glulam-and-connectors); [Anthony Forest Fire Resistance](https://www.anthonyforest.com/assets/pdf/reports/resistance.pdf)

---

## 6. European Standards Framework

### EN 14080:2013 -- Glulam Manufacturing Standard

- Defines strength classes (GL20h through GL32h for homogeneous; GL20c through GL32c for combined)
- Regulates simple glued joints with full rectangular cross-sections
- Requirements for finger joints, lamella quality, adhesive performance
- Delamination testing requirements (cyclic moisture gradient)

### Eurocode 5 (EN 1995-1-1) -- Structural Design

- Chapter 8: Connection design using Johansen (European Yield Model)
- Dowel-type fastener capacity per shear plane
- Embedment strength depends on timber density (from EN 14080 Tables)
- Minimum spacing, end distances, edge distances
- Load duration factors (k_mod) and partial safety factors

### Related Standards

| Standard | Scope |
|----------|-------|
| EN 14080:2013 | Glulam manufacturing requirements |
| EN 1995-1-1 (EC5) | Structural design of timber, including connections |
| EN 1995-1-2 | Fire design of timber structures |
| EN 14545:2008 | Timber structure connectors |
| EN 14592:2008+A1 | Dowel-type fasteners requirements |
| EN 26891 | Testing of timber connections |

### Dowel-Type Fastener Design (EC5 Simplified)

Capacity per fastener per shear plane based on:
- **Mode (a)**: Embedment of wood (bearing failure)
- **Mode (b)**: Bending of fastener (fastener yields)
- **Mode (c)**: Combined embedment + fastener bending

Key parameters:
- f_h,k = embedment strength (depends on density, fastener diameter, grain angle)
- M_y,k = fastener yield moment
- Minimum of all failure mode capacities governs

**Sources**: [EN 14080 Overview](https://standards.iteh.ai/catalog/standards/cen/f5a36e99-021d-44cb-8dec-9e41df42d7a5/en-14080-2013); [Swedish Wood Glulam Handbook](https://www.swedishwood.com/siteassets/5-publikationer/pdfer/glulamhandbook1-240508.pdf); [Eurocode 5 Handbook](https://www.coford.ie/media/coford/content/publications/TimberHandbook5Part130418.pdf); [COST Action Connections Design](https://www.cost.eu/uploads/2018/11/Design-of-Connections-in-Timber-Structures.pdf)

---

## 7. Russian Standards and Market

### GOST 20850-2014

"Конструкции деревянные клееные несущие. Общие технические условия"
(Wooden glued load-bearing structures. General technical requirements)

Key definitions relevant to connections:
- **Зубчатое соединение** (finger joint): splice created by milling wedge-shaped tenons, then gluing
- **Клеевое соединение** (glued joint): connection using a glue layer between surfaces
- **Многослойный клеёный элемент**: 4+ layers connected by glue layers

Covers: design, manufacturing, quality control for industrial, agricultural, civil, and transport construction.

### GOST 33081-2014

"Конструкции деревянные клееные несущие. Классы прочности элементов конструкций и методы их определения"

Defines Russian strength classes for glulam -- analogous to EN 14080 GL classes but with Russian testing methodology.

### SP 64.13330.2017

"Деревянные конструкции" (Wooden Structures) -- updated version of SNiP II-25-80

- **Section 8**: Calculation of joints in wooden structures (расчёт соединений)
- Design resistances for multilayer laminated timber
- Requirements for adhesively bonded rods (classes A400-600, round steel)
- Corrosion requirements for connections in aggressive environments

### SP 382.1325800.2017

"Конструкции деревянные клееные на вклеенных стержнях. Методы расчёта"

Specifically covers glued-in rod connections for glulam -- a modern European technique increasingly used in Russian practice.

### Russian Market Context

**Manufacturers**:
- **ZAVDOZ Group**: >1,500 m3/month capacity; equipment from Krusi (CH), Top Master (IT), Hundegger (DE)
- **APS DSK**: Fachwerk houses from glulam, Italian ESSETRE TECHNO-TURN production line
- **Ural Fachwerk** (Chelyabinsk): Production of fachwerk house kits
- Multiple manufacturers in Moscow Oblast region

**Costs (2025)**:
- Fachwerk houses (turnkey): 3.5 -- 23 million rubles depending on area and specification
- Comparable to standard frame construction
- Construction time: ~3 months average

**Market dynamics**:
- Northern Kirov region timber preferred for quality
- European CNC equipment standard (Swiss, Italian, German)
- Growing domestic capability -- less import dependence than 5 years ago
- Fachwerk (timber frame) gaining market share as premium housing

**Sources**: [GOST 20850-2014](http://docs.cntd.ru/document/1200115773); [SP 64.13330.2017](http://docs.cntd.ru/document/456082589); [ZAVDOZ](https://zavdoz.ru/en); [Domsebe.com Fachwerk costs 2025](https://domsebe.com/blog/skolko-stoit-fakhverkovyy-dom-2025/)

---

## 8. Cost-Benefit Analysis: Glulam vs. Solid Timber for TF

### Cost Comparison

| Factor | Glulam | Solid Timber |
|--------|--------|--------------|
| Material cost per m3 | Higher (processing + adhesive) | Lower (raw lumber) |
| Waste factor | Lower (smaller stock used) | Higher (large logs, defect cutting) |
| Large section availability | Unlimited (laminated) | Limited by tree size, expensive for large sections |
| CNC machining | Excellent (consistent, uniform) | Good (knots/defects cause issues) |
| Shrinkage/settling | Minimal (kiln-dried, 2-15% MC) | Significant (may be 19%+ MC green) |
| Dimensional stability | Superior | Moderate |

### Performance Comparison for TF Joinery

| Factor | Glulam | Solid Timber |
|--------|--------|--------------|
| Strength-to-weight | Higher (engineered) | Lower (natural variability) |
| Long spans | Excellent (no practical limit) | Limited by available timber |
| Curved elements | Possible | Extremely difficult |
| Traditional aesthetics | Visible glue lines (some dislike) | Natural grain, knots, character |
| Joint cutting (CNC) | Excellent precision | Good, but grain variation affects |
| Delamination at joints | Risk present | Not applicable |
| Fire performance | Predictable, calculable | More variable |

### Strategic Recommendation

**For traditional timber framing specifically**:

1. **Use glulam for**: Long spans, large cross-sections unavailable in solid, curved members, structural elements hidden from view, posts/beams where dimensional stability is paramount
2. **Use solid timber for**: Exposed joinery where aesthetics matter, shorter spans where solid is adequate, connections with heavy notching (no delamination risk), elements where traditional character is valued
3. **Hybrid approach** (most practical): Glulam for primary structure (posts, main beams, ridge), solid timber for secondary members (rafters, braces, decorative elements) and visible joinery

**Source**: [Canadian Timber Frames](https://www.canadiantimberframes.com/news/glulam-beams-vs-timber-framing); [Vermont Timber Works](https://www.vermonttimberworks.com/blog/glulam-vs-solid-beams-which-is-best-for-your-project/); [Timber Frame HQ](https://timberframehq.com/glulams-in-timber-framing/); [Wikipedia - Glulam](https://en.wikipedia.org/wiki/Glued_laminated_timber)

---

## 9. Design Recommendations for Glulam in Traditional TF Joinery

### DO:

1. **Transfer loads in compression** -- design joints so forces pass through bearing surfaces, not tension
2. **Allow for wood movement** -- use slotted holes, oversized mortises where shrinkage occurs cross-grain
3. **Protect metal from moisture** -- any metal in the "cold zone" becomes a condensation point
4. **Orient glue lines strategically** -- avoid glue lines perpendicular to primary shear planes in joints
5. **Use adequate end/edge distances** -- Eurocode 5 minimums are ABSOLUTE minimums; add 20% for glulam
6. **Consider reinforcement** -- self-tapping screws at connections to prevent splitting
7. **Test adhesive compatibility** -- if gluing tenon-to-mortise, ensure adhesive is compatible with existing glulam adhesive
8. **Design for fire** -- recess any steel plates, provide wood cover equal to fire rating requirement

### DO NOT:

1. **Do NOT notch glulam deeply** -- notches concentrate stress at glue lines, high splitting risk
2. **Do NOT restrain shrinkage** -- tight bolts through deep beams WILL cause splitting
3. **Do NOT place glulam on concrete/masonry** -- moisture wicking destroys bottom laminations
4. **Do NOT ignore orientation** -- glulam is strongest with laminations horizontal (normal beam orientation); rotated members have different properties
5. **Do NOT cut through laminations unnecessarily** -- each cut through a glue line at a connection is a potential delamination initiation point
6. **Do NOT assume solid timber design rules transfer** -- perpendicular-to-grain tension capacity of glulam is LOWER than equivalent solid sections

### Critical Design Values for Connections

- **Perpendicular-to-grain tension (f_t,90,k)**: Only 0.5 N/mm2 for ALL GL grades -- this is the weakest link
- **Shear (f_v,k)**: 3.5 N/mm2 across all grades -- governs most traditional joints
- **Embedment strength**: Calculate per EC5 using density from EN 14080
- **Minimum member depth at connections**: Account for effective char depth if fire rating required

---

## 10. Strategic Insights (Second-Order Effects)

### Three Scenarios for Russian TF Market

**Scenario A -- "European Convergence"** (most likely):
Russian glulam production continues adopting European standards (EN 14080 equivalent via GOST 33081). Connection design follows Eurocode 5 principles adapted through SP 64.13330. CNC-cut traditional joinery in glulam becomes standard for premium housing. Timeline: already happening.

**Scenario B -- "Hybrid Innovation"**:
Russian manufacturers develop proprietary connection systems optimized for domestic timber species (Siberian larch, Komi spruce). Combine traditional Russian log building knowledge with European engineered wood technology. Could create competitive advantage. Timeline: 3-5 years.

**Scenario C -- "Import Substitution Pressure"**:
Sanctions/trade restrictions push Russian producers to develop fully domestic adhesive systems and testing protocols. Current reliance on European adhesives (Akzo Nobel, Henkel) is a supply chain vulnerability. If resolved, Russian glulam becomes fully independent. Timeline: already in progress.

### Second-Order Effects to Monitor

1. **Delamination in Russian climate**: Extreme temperature cycling (-40C to +35C) creates more severe moisture gradients than Western European test conditions. Russian glulam may need higher delamination safety margins at connections.

2. **CNC + Traditional Joinery convergence**: As CNC costs drop, traditional timber frame joinery becomes economically viable in glulam. This could revive Russian деревянное зодчество (wooden architecture) traditions using modern materials.

3. **Fire insurance implications**: Glulam's predictable fire performance (calculable char rates) may enable better insurance terms than solid timber, making TF construction more economically competitive vs. masonry/concrete in Russia.

4. **Shear strength ceiling**: The 3.5 N/mm2 shear strength across ALL GL grades means traditional joinery (governed by shear) cannot benefit from higher-grade glulam. This pushes toward hybrid connections (steel reinforcement at joints) for heavy-load applications.

---

## Key Reference Documents

| Document | Relevance |
|----------|-----------|
| [Swedish Glulam Handbook Vol. 1](https://www.swedishwood.com/siteassets/5-publikationer/pdfer/glulamhandbook1-240508.pdf) | Comprehensive design guide |
| [Swedish Glulam Handbook Vol. 3](https://www.swedishwood.com/siteassets/5-publikationer/pdfer/glulamhandbook3-240508.pdf) | Connection details |
| [APA Glulam Connection Details](https://www.anthonyforest.com/assets/pdf/apa/glulam/Tech_Note_Glulam_Connection_Details.pdf) | US practice, detailed drawings |
| [Eurocode 5 Handbook](https://www.coford.ie/media/coford/content/publications/TimberHandbook5Part130418.pdf) | Design calculations |
| [COST Action -- Design of Connections](https://www.cost.eu/uploads/2018/11/Design-of-Connections-in-Timber-Structures.pdf) | European research compilation |
| [Hasslacher Glulam Brochure](https://www.hasslacher.com/data/_dateimanager/broschuere/HNT-Brettschichtholz-EN.pdf) | Manufacturer data |
| [Binderholz Glulam Data](https://www.binderholz.com/fileadmin/user_upload/pdf/products/glulam.pdf) | Manufacturer data |
| [GOST 20850-2014](http://docs.cntd.ru/document/1200115773) | Russian standard |
| [SP 64.13330.2017](http://docs.cntd.ru/document/456082589) | Russian design code |
