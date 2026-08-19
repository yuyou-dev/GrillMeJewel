# Image-2 Jewelry Generation

After the user confirms the brief, generate real design images with Codex `$imagegen` / gpt-image-2.

## Prompt Order

Build each prompt in this order:

1. **Deliverable:** one photorealistic jewelry design image and the exact jewelry category.
2. **Identity lock:** confirmed silhouette, proportions, gemstones, metal, motif, wearing structure,
   and any reference-image role.
3. **Design translation:** convert the meaning and style into visible form, not decorative keywords.
4. **Physical construction:** plausible settings, joins, closures, thickness, balance, and wearing
   clearance appropriate to the category.
5. **Material behavior:** metal finish, gemstone cut and transparency, enamel or other confirmed craft.
6. **Presentation:** premium product photography, clean neutral background, readable full object,
   natural shadow, no text or layout board unless requested.
7. **Negative constraints:** no extra products, no contradictory category, no floating stones,
   no impossible connections, no watermark, caption, logo, or contact sheet.

## Multiple Designs

For N requested designs, assign `GMJ-A` through `GMJ-H` in order and call image generation N times.
Start from the confirmed candidate matrix; do not ask the image model to improvise generic
"variations." Keep category, wearing logic, central story, and locked materials identical. For each
candidate, write its branch role and at least three explicit visible changes across silhouette,
setting architecture, motif translation, stone layout, negative space, massing, or material craft.

Keep presentation sufficiently consistent for comparison. Crop, background, lighting, camera angle,
and adjective changes do not count as design distance. Each result is a separate image asset; a grid
preview does not count as N deliverables.

## Completion

Verify the tool returned the accepted `delivery_count` of readable images, the visible product type
matches the confirmed category, and the candidates exhibit their planned structural differences.
Do not perform subjective ranking or automatic regeneration unless the user explicitly asks for
critique or revision.
