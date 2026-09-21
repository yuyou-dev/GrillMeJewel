---
name: grill-me-jewel
description: Turn a vague or unformed jewelry idea into a confirmed brief and real jewelry design images with Codex built-in image generation through an adaptive or full-depth Apps UI interview. Use when the user explicitly asks for “Grill Me 珠宝”, “Grill Me Jewel”, “你到底想要设计什么”, help discovering a jewelry direction, or has no clear jewelry product, concept, and intended output. Do not use when the request is already specific enough to execute or only needs one ordinary factual clarification.
---

# Grill Me Jewel

## Purpose

Help a beginner discover and articulate what jewelry they want to design. Use adaptive discovery by default, or four purposeful discovery rounds for an explicit deep interview.
Both modes end in a separate confirmation round. Preserve every answer, then use Codex image generation to generate the requested real design images.

## Interview

1. Read `references/design-frontier.md`. Reuse facts from the conversation and attachments, then
   use `mode: adaptive` to ask only unresolved decisions that change the result. Skip known facts.
   For an explicit deep interview, use `mode: full` and complete foundation, meaning, design language,
   and variation/delivery as four submitted Apps UI rounds.
2. For every round, call `ask_grill_me_questions` as the primary interaction surface with the exact
   `stage` and sequential `round`. Ask one to four currently answerable fields. Discover that exact
   tool name before falling back to prose. Use concise chat questions only after real tool discovery
   fails or the call errors.
3. Use stable lowercase field and option ids. Offer an `other` option when a useful answer may fall
   outside the list. In foundation, ask `delivery_count` unless the user already supplied a count;
   offer `count_1`, `count_2`, `count_4`, `count_8`, and a custom value. Never ask for providers,
   concurrency, internal job ids, API keys, or cost. Distinguish image count from piece/pair and
   explicit stone/pearl counts inside each image. Flexible materials or style never increase the
   accepted delivery count.
4. After submission, summarize only the newly established facts and preserve all earlier answers.
   Continue with the next unresolved decisions in adaptive mode, or the next stage in full mode;
   never answer the user's side of the interview.
5. In variation/delivery, split locked facts from flexible axes. For multiple outputs, define named
   candidate branches that each change at least three visible design axes while preserving product
   identity, wearing logic, and the central story.
6. After the necessary decisions are resolved (four discovery rounds in full mode), present the assembled brief through one final
   `ask_grill_me_questions` confirmation round with `stage: confirmation` and the next sequential `round` (5 or greater in full mode). Ask
   whether to confirm it or revise it, with a text field for corrections when needed.
   Include the accepted counts, reference roles, visible translation of the story, candidate matrix,
   and Presentation Lock from `references/design-frontier.md`. This uses the existing confirmation,
   not an extra round. Label creative defaults separately from user-supplied facts.
7. After confirmation, read `references/image2-generation.md`, compile one production prompt per
   requested design, and invoke Codex `$imagegen` / built-in image generation. Carry the complete
   accepted brief into every prompt; do not reduce it to a style summary or resume interviewing
   during generation.
8. Return the final brief in Markdown under: Objective, Product, Design Direction, Materials and
   Craft, Source Assets, Output Intent, Locked Facts, Flexible Details. Present every real generated
   image inline. Never claim an image exists unless the tool returned it.

## Question Design

- Keep each round to at most four fields and each option set to at most eight choices.
- Prefer single choice for product identity and output intent, multi choice for style or motifs,
  and text only when the answer cannot be represented honestly with options.
- Make choices mutually understandable to a beginner. Avoid internal jewelry workflow jargon.
  Describe visible consequences, such as a smooth metal rim versus slender claws around the stone.
  Translate stories into proposed physical form; optional taste can remain a labeled default.
- A known fact remains immutable unless the user explicitly corrects it.
- Do not invent gemstone grade, origin, certification, size, budget, brand, or manufacturing facts.
- Delivery count is part of the interview, not a hidden default. Preserve an explicit count;
  otherwise collect 1, 2, 4, 8, or a custom count once. Generate that many independent images and
  never use a contact sheet as a substitute.

## Completion

- Confirm that the user explicitly requested the interview or the original idea lacked product,
  concept, and output clarity.
- Confirm every unresolved round used the Apps UI form unless an actual discovery/call failure was
  reported.
- Confirm full mode completed all four discovery stages; adaptive mode asked only unresolved facts. Both require a separate confirmation round.
- Confirm no round exceeded four fields or repeated an established fact.
- Confirm the accepted delivery count matches the number of generated images.
- Confirm every multi-image candidate changes at least three visible design axes rather than only
  wording, crop, lighting, background, or camera angle.
- Confirm the final brief was explicitly accepted or corrected by the user.
- Confirm Codex built-in image generation returned the requested number of readable image assets. If image generation
  is unavailable or fails, report the real blocker and keep the confirmed brief for retry; do not
  present a text brief as completed visual delivery.
- Report actual delivered and missing counts. A recorded attempt is not a delivered image.
- Preserve the Presentation Lock and explicit piece/pair and stone counts; report actual dimensions
  and any known mismatch rather than claiming a requested size was delivered.

## Requested Refinement

When the user changes one candidate, update only the affected brief facts and that candidate's
prompt. Use its delivered image and required design sources as references. An explicit correction
updates the corresponding lock; preserve all other locks and successful siblings. Do not restart
the interview, regenerate the whole set, or add unsolicited aesthetic review.

Image model identity comes from provider evidence, not prompt wording. If Codex does not expose the actual image model, report it as unknown; do not claim Sunburst or Flare selection.
