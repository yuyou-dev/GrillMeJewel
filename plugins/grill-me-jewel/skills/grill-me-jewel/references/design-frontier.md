# Jewelry Design Frontier

Complete every discovery stage once. Ask only unresolved decisions inside that stage, using deeper
questions when the user's prompt already established the obvious facts.

## Four discovery stages

1. **Foundation (`stage: foundation`, round 1):** starting point, product identity, wearer or
   occasion, and `delivery_count`. Preserve an explicit count; otherwise offer 1, 2, 4, 8, and custom.
2. **Meaning (`stage: meaning`, round 2):** emotional intent, story, motif, symbolism, recipient,
   memory, and cultural boundaries that could change the concept.
3. **Design language (`stage: design_language`, round 3):** design system, silhouette, visual weight,
   symmetry or movement, gemstones, metal, finish, craft, and reference roles.
4. **Variation and delivery (`stage: variation_delivery`, round 4):** output family, presentation,
   locked facts, flexible axes, exploration spread, and any required source asset.

Use `stage: deepening` only for a fifth or later discovery round when a material contradiction or
irreversible unknown remains. Use `stage: confirmation` only after the four required stages.

## Routing Rules

- Explicit Grill Me requests always qualify, even when the user already knows one or two facts.
- An otherwise clear request such as “design a platinum sapphire ring” does not need a deep
  interview unless the user asks for one.
- Ask source-role questions only when an attachment exists or the chosen direction requires one.
- Preserve an explicit delivery count. When none is supplied, collect it in foundation rather than
  defaulting silently to one image.
- Do not turn optional taste choices into blockers. Label tasteful defaults as flexible details.

## Final Brief Quality

The brief must distinguish locked facts from flexible details, avoid invented gem or brand claims,
and be understandable without this plugin. It must be precise enough to compile into a professional
gpt-image-2 jewelry prompt without guessing product identity.

For multiple images, the brief also includes a candidate matrix. Keep the jewelry category, wearing
logic, central story, and locked hero materials stable. Adapt the first N roles below to the user's
chosen flexible axes, and change at least three visible axes per candidate.

| Branch | Role | Required distance |
| --- | --- | --- |
| GMJ-A | Commercial core | Wearable hierarchy, restrained motif, resolved proportions |
| GMJ-B | Sculptural shift | New silhouette, volume, and negative-space architecture |
| GMJ-C | Craft signature | New setting language, surface treatment, and material junctions |
| GMJ-D | Narrative reframe | Different form translation, focal rhythm, and motif composition |
| GMJ-E | Lightweight reduction | Airier mass, finer cadence, simplified stone distribution |
| GMJ-F | Architectural geometry | Modular order, sharper spatial logic, structural repetition |
| GMJ-G | High-jewelry drama | Expanded scale rhythm, richer stone choreography, ceremonial presence |
| GMJ-H | Rhythmic series code | Signature unit, repeated cadence, collection-ready construction |

Do not introduce convertible or dual-use construction unless the user requests it.
