# White Studio Presentation

Use for ordinary new-design product stills and Grill Me briefs that choose a clean studio image.
This shared reference supplies visual direction; it does not replace workflow-specific output
contracts. An explicit scene, background, ratio, model-wearing, poster, grid, or transparent-cutout
request takes precedence. Remove incompatible default clauses when applying an override.

## Presentation Lock

Carry these choices from the accepted brief into each candidate prompt and requested refinement:

| Choice | Ordinary design default |
| --- | --- |
| Aspect ratio | Square 1:1 |
| Background | Opaque neutral pure white, target sRGB #FFFFFF |
| View | A category-appropriate view that explains the design |
| Framing | Complete object or pair, clear margins; no cropped jewelry |
| Lighting | Soft studio sources with controlled reflections and readable material volume |
| Shadow/reflection | Small faint contact shadow; no broad cast shadow or mirror-floor reflection |

An explicit user choice overrides the corresponding default, including an asymmetric earring
pair or a pendant detail instead of a full necklace. Keep the accepted presentation constant across
candidate branches so camera or staging changes do not masquerade as different designs. Grill Me
includes the lock in its existing brief confirmation. Ordinary design uses these as reversible
defaults without adding a questionnaire.

The current Codex image route exposes prompt and references, not resolution or aspect-ratio
controls. Request the accepted format in the prompt and verify the returned file; do not invent
generation parameters or promise 2K because a prompt requests it. If the user requires exact pixel
dimensions, preserve that requirement and report any mismatch. Do not stretch an image or crop
away jewelry to satisfy it. Model identity also requires provider evidence.

## Category framing

- Ring: a three-quarter view showing the main setting, shoulders, and continuous shank.
- Earrings: the complete specified pair at matching scale with a clear gap; preserve intentional
  left/right differences and explicit per-earring stone or pearl counts.
- Necklace: show the complete necklace when that is the requested product. For a pendant-detail
  image, show the pendant and its approved chain context; do not silently crop a full necklace.
- Bracelet or bangle: show the complete loop or cuff opening and the relevant closure.
- Brooch: front or slight three-quarter view showing motif and depth; do not force hidden back
  hardware to appear in the front view.

## Reusable visual block

Adapt the bracketed parts to the brief; use the user's language in the final prompt:

```text
表现：方形 1:1 珠宝产品摄影。[一件完整珠宝／一对完整耳饰]，以[已确定视角]居中呈现，
完整轮廓四周保留清晰留白。背景为不透明中性纯白，目标 sRGB #FFFFFF；四角、戒圈内部、
耳饰之间及所有镂空处均延续同一白底，无地平线、纹理或渐变。珠宝正下方仅保留小范围、
浅淡柔和的接触阴影，快速消散至白色，无镜面地板倒影。背景与珠宝分开布光；柔光与受控
反光塑造金属明亮高光和窄暗轮廓，保留真实金属颜色、清楚的宝石刻面、爪镶边缘和珍珠
体积。整件设计清晰，包括后侧戒臂和细小镶口；不要用整体提亮来漂白材质。
```

Use only relevant exclusions: no gray field, vignette, textured tabletop, broad shadow, props,
clipped jewelry, blown-out metal, milky gemstones, or blurred construction. Avoid combining this
block with contradictory shallow-focus glamour or dramatic scenic lighting instructions.

## Reference authority

Bind each reference to its accepted role. A design source controls approved geometry, material,
counts, and structure; a presentation reference controls only approved framing and light. A source
photo's gray background, crop, reflection, or aspect ratio does not override the Presentation Lock.
For reference-based generation or editing, state which jewelry details to preserve and which
background areas to replace, including open gaps and holes. Do not copy geometry from a mood or
presentation reference unless the user approved it as a design source.

## Delivery evidence

Follow [image2-generation.md](image2-generation.md) for completion. Record real file
readability and dimensions, delivered count, requested jewelry type/piece count, and required
reference use. Prompt wording and a square preview do not prove the downloaded output's size.
Report a known specification mismatch or unavailable verification plainly; do not label an
unverified property as passed or turn an inspection failure into a provider-generation failure.

These prompt techniques are not a new post-generation aesthetic gate. Do not automatically rank,
critique, or regenerate for perceived whiteness, beauty, or branch distance. When the user requests
a revision, name the observed issue, edit the selected asset, and preserve its other design and
presentation locks. Keep successful sibling designs unchanged.
