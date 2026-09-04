---
name: jewel-buddy
description: Turn a vague jewelry idea into a confirmed brief and real design images through a four-stage WorkBuddy MCP Apps interview. Use when the user asks for Jewel Buddy, wants a visual jewelry interview, or has no clear product, concept, and output direction. Do not use for an already executable brief or one ordinary clarification.
---

# Jewel Buddy for WorkBuddy

## Purpose

Help a beginner discover and articulate what jewelry they want to design. Complete four purposeful
discovery rounds plus a separate confirmation round, preserve every answer, then use an image
generation tool available in the current WorkBuddy session to generate the requested real designs.

## Visible Response Contract

- The Apps UI card is the primary and only user-facing response during interview rounds. Place each
  interview UI tool call first in a normal visible assistant response, with no prose preamble. If the
  host requires text before a tool call, use at most one short sentence.
- For final delivery, complete WorkBuddy's native image or file presentation first, wait for that
  presentation to succeed, and only then call `show_jewel_results` as the last presentation step.
  Show the images first and the result UI second; add no explanatory prose between them.
- Never invoke either UI tool from analysis, reasoning, or hidden planning. Do not put a roadmap,
  question list, answer recap, brief, or usage instructions before or after the card.
- After the UI tool succeeds, end the turn immediately. Do not restate the card's questions, options,
  answers, progress, gallery, images, or next step. If the host requires trailing text, use one short
  sentence only.

## Interview

1. Read `references/design-frontier.md`. Reuse facts from the conversation and attachments, then
   complete foundation, meaning, design language, and variation/delivery as four submitted Apps UI
   rounds. A known fact moves its stage to a deeper decision; it does not remove the stage.
2. For every round, call `ask_grill_me_questions` as the primary interaction surface with the exact
   `stage` and sequential `round`. Ask one to four currently answerable fields. Discover that exact
   tool name before calling it. If discovery, the call, or Apps UI rendering fails, report that MCP/UI
   blocker and stop the interview for repair. Never replace the Apps UI with native conversation cards,
   prose questions, or a simulated form.
3. Use stable lowercase field and option ids that start with a letter. For example, use `gold_18k`,
   never `18k_gold`. Offer an `other` option when a useful answer may fall
   outside the list. In foundation, ask `delivery_count` unless the user already supplied a count;
   offer `count_1`, `count_2`, `count_4`, `count_8`, and a custom value. Never ask for providers,
   concurrency, internal job ids, API keys, or cost.
4. After submission, update the accumulated state silently from the widget context and continue with
   the next stage. Never repeat the submitted answers in prose and never answer the user's side of the
   interview.
5. In variation/delivery, split locked facts from flexible axes. For multiple outputs, define named
   candidate branches that each change at least three visible design axes while preserving product
   identity, wearing logic, and the central story.
6. After four discovery rounds, present the assembled brief through one final
   `ask_grill_me_questions` confirmation round with `stage: confirmation` and `round` 5 or greater. Ask
   whether to confirm it or revise it, with a text field for corrections when needed. Set
   `required: false` on that correction field and on every other field described as optional; never
   make a confirmed user type a placeholder such as "no changes".
7. After confirmation, read `references/image2-generation.md`, compile one production prompt per
   requested design, discover the real image-generation tool available in WorkBuddy, and invoke it.
   Prefer a native image tool or an installed image-generation MCP. The confirmed brief is the
   source of truth; do not resume interviewing during generation and never invent a tool result. Wait
   until every image-generation tool call has returned successfully before preparing the result UI.
8. Inspect the completed image tool result and verify that every requested image has a real local
   absolute path or PNG/JPEG/WebP data URI. Never call `show_jewel_results` in parallel with image
   generation, in the same tool-call batch, while a provider reports queued or pending, or before all
   requested image data exists. Complete the host's native image presentation and wait for success;
   if the host requires a separate file-presentation tool, call and finish it before
   `show_jewel_results`. Only then call `show_jewel_results` exactly once with all results. Use
   `mode: text_to_image` for generated images alone. Use `mode: image_to_image` only when both the
   user's real source image and each generated result are available locally; pass `source_path` and
   `result_path` so the UI can render a draggable before/after comparison. Do not pass a URL, invent
   a path, or call the result tool before generation succeeds. If the image provider returns only a
   host-private attachment, keep the native inline image and explain that the result card could not
   be populated.
9. Treat the successful `show_jewel_results` card as the complete visible delivery and end the turn.
   Only if that result UI cannot be rendered, return a compact Markdown brief and the real generated
   images inline, clearly naming the UI blocker. Never claim an image exists unless the tool returned it.

## Question Design

- Keep each round to at most four fields and each option set to at most eight choices.
- Prefer single choice for product identity and output intent, multi choice for style or motifs,
  and text only when the answer cannot be represented honestly with options.
- Set `required: false` explicitly for optional fields. Omitted `required` defaults to true in the
  Apps UI.
- Make choices mutually understandable to a beginner. Avoid internal jewelry workflow jargon.
- A known fact remains immutable unless the user explicitly corrects it.
- Do not invent gemstone grade, origin, certification, size, budget, brand, or manufacturing facts.
- Delivery count is part of the interview, not a hidden default. Preserve an explicit count;
  otherwise collect 1, 2, 4, 8, or a custom count once. Generate that many independent images and
  never use a contact sheet as a substitute.

## Completion

- Confirm that the user explicitly requested the interview or the original idea lacked product,
  concept, and output clarity.
- Confirm every unresolved round used the Apps UI form unless an actual discovery/call failure was
  reported and the interview was stopped. Confirm no native conversation card or prose-question
  fallback was used.
- Confirm all four discovery stages were submitted before the separate confirmation round.
- Confirm no round exceeded four fields or repeated an established fact.
- Confirm the accepted delivery count matches the number of generated images.
- Confirm every multi-image candidate changes at least three visible design axes rather than only
  wording, crop, lighting, background, or camera angle.
- Confirm the final brief was explicitly accepted or corrected by the user.
- Confirm the selected WorkBuddy image tool returned the requested number of readable image assets. If image generation
  is unavailable or fails, report the real blocker and keep the confirmed brief for retry; do not
  present a text brief as completed visual delivery.
- Confirm every image-generation call completed before `show_jewel_results` was invoked, with no
  parallel or same-batch result UI call.
- Confirm native image or file presentation completed before `show_jewel_results`, so the user sees
  the real image before the result UI opens.
- Confirm `show_jewel_results` received the same real image count whenever usable local paths or data
  URIs were returned. For image-to-image work, confirm every result item includes its matching source
  and result image so the comparison slider is truthful.
