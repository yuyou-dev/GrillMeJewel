# Jewelry Image Generation

After the user confirms the brief, generate real design images with Codex `$imagegen` / built-in
image generation. The complete accepted brief, not a style summary, is the source of truth.

## Prompt Order

Build one independent prompt per candidate in this order, using the user's language:

1. **Deliverable:** one jewelry design image, exact category, accepted aspect ratio, and piece/pair
   count. Image count is separate from the number of objects inside one image.
2. **Identity lock:** confirmed silhouette, proportions, gemstones, metal, motif, wearing structure,
   explicit per-piece and total stone/pearl counts, and each reference's accepted role.
3. **Design translation:** describe physical form expressing the story, not decorative keywords.
   Write the named candidate's actual geometry and at least three visible changes for a set.
4. **Physical construction:** plausible settings, joins, closures, thickness, balance, and wearing
   clearance. Read only the relevant category/material section of
   [design-presets.md](design-presets.md) when needed.
5. **Material behavior:** metal hue and finish, gemstone cut and transparency, enamel or other
   confirmed craft; readable facets, prong edges, metal contours, and pearl volume.
6. **Presentation:** carry the accepted Presentation Lock. For ordinary studio stills use
   [white-studio-presentation.md](white-studio-presentation.md): square 1:1, opaque pure white,
   complete object or pair, controlled reflections, and a small faint contact shadow. Explicit
   user choices override defaults; remove incompatible white/square clauses for other presentations.
7. **Negative constraints:** only likely failures, including extra products, floating stones,
   impossible connections, unrequested text/logo/watermark, and contact sheets.

## Reference Authority And Output Settings

A design source governs the approved jewelry identity, counts, and materials. A presentation
reference guides only accepted framing and lighting, not jewelry geometry. A source photo's gray
background, crop, or aspect ratio does not override the Presentation Lock. Specify replacement of
background in open ring interiors, gaps between earrings, and other negative spaces.

The current Codex route exposes prompt and references, not image-model, aspect-ratio, or resolution
controls. Request the accepted format in the prompt and inspect the real returned dimensions.
Do not invent API parameters, promise a 2K setting, or stretch/crop away jewelry to meet a size.
The host chooses the model; report its identity only when verifiable provider evidence is returned.
Otherwise leave it unknown. Prompt wording does not select or prove Sunburst or Flare.

## Multiple Designs

For N requested designs, assign stable IDs starting at `GMJ-A` and extending beyond `GMJ-H` when
needed. Generate N independent images from the confirmed matrix; never ask for generic variations
or increase the count because style or materials remain flexible. Preserve category, wearing logic,
central story, and locked materials. Each candidate changes at least three available visible axes:
silhouette, setting architecture, motif translation, stone layout, negative space, massing, or craft.
Resolve any conflict with locked facts in the brief rather than silently changing category.

Keep the Presentation Lock constant across the set. Crop, background, lighting, camera angle,
and adjective changes do not count as design distance. A grid preview does not count as N assets.

## Completion And Requested Refinement

Check real file readability, actual dimensions, delivered count, requested jewelry type/piece count,
and required reference use. Report actual delivered and missing counts and known specification
mismatches. An attempted generation is not a delivered image. Missing verification does not prove
success and is distinct from a provider-generation failure. Keep any returned preview honestly
labeled and preserve the brief if generation is blocked.

Do not add automatic aesthetic ranking or regeneration. On a user-requested change to one design,
update the affected brief facts, use that delivered image and required design references, and edit
only that candidate. Preserve its other identity/presentation locks and all successful siblings.
