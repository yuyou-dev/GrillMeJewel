# Jewelry Design Frontier

Adaptive mode asks only unresolved decisions that affect the result and skips established facts.
In adaptive mode, skip resolved stages and combine remaining decisions when they fit one round.
Only full mode keeps all four stages; use known facts to ask a relevant deeper decision, never to
repeat an answered question. The numbered rounds below describe full mode; adaptive rounds remain
sequential even when stages are skipped.

## Four discovery stages

1. **Foundation (`stage: foundation`, round 1):** starting point, product identity, wearer or
   occasion, and `delivery_count`. Preserve an explicit count; otherwise offer 1, 2, 4, 8, and custom.
2. **Meaning (`stage: meaning`, round 2):** emotional intent, story, motif, symbolism, recipient,
   memory, and cultural boundaries that could change the concept.
3. **Design language (`stage: design_language`, round 3):** design system, silhouette, visual weight,
   symmetry or movement, gemstones, metal, finish, craft, and reference roles.
4. **Variation and delivery (`stage: variation_delivery`, round 4):** output family, presentation,
   locked facts, flexible axes, exploration spread, and any required source asset.

In full mode, use `stage: deepening` only from round five and confirmation after the four stages.
In adaptive mode, move to a separate confirmation round as soon as the necessary facts are resolved.

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
Codex built-in jewelry image prompt without guessing product identity.

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

## Questions that change the design


Use beginner-readable choices with visible consequences: “a smooth metal rim around the stone”
versus “slender claws that expose more of the stone,” rather than unexplained setting terminology.
Keep option sets to at most eight choices including `other`. Use single choice for identity, multi
choice for compatible tastes, and free text for personal stories or off-list answers. Optional taste
can remain a labeled creative default; it does not need another round. Ask about reference roles
only when a reference exists or is essential to the chosen workflow.

Translate a story into proposed physical form, then carry the accepted translation into the brief:

| User intent | Possible visible translation, subject to the user's locks |
| --- | --- |
| “保护、包容” | A curved rim sheltering the focal stone; rounded skin-facing edges |
| “轻盈、自由” | Open negative space, slender supports, or articulated drops with movement |
| “纪念两个人” | Two distinct focal elements joined by a continuous shared structure |

These are options, not inferred facts. “Two people” does not authorize inventing two stones if the
user has already locked a single stone. Read only the relevant category/material section of
[design-presets.md](design-presets.md) when constructing choices.

## Brief handoff


Keep the confirmed brief understandable without the questionnaire. Include objective, product,
meaning translated into form, materials/construction, reference roles, output intent, locked facts,
flexible details, and the candidate matrix. Separate the number of design images from the pieces
inside each image: four earring designs normally means four images of a pair, not four single
earrings. Preserve any explicit per-piece and total stone/pearl counts without guessing hidden ones.

For ordinary new-design stills, propose a Presentation Lock with the brief: aspect ratio,
background, view, framing, lighting, and shadow/reflection policy. Use the shared
[white-studio-presentation.md](white-studio-presentation.md)
default unless the user chose otherwise. Record an explicit resolution requirement separately from
the actual returned dimensions; do not promise a selectable 2K setting on a prompt-only route.
Presentation choices remain constant across candidates and follow-up edits unless the user changes
them. They are not design-variation axes. This proposal uses the existing final confirmation, not
an additional interview round.

Name actual changed forms in each candidate row. If locked facts leave fewer than three usable
axes, resolve that conflict in the brief rather than silently relaxing locks or adding candidates.
