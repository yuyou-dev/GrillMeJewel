---
name: grill-me-jewel
description: Turn a vague or unformed jewelry idea into a confirmed brief and real gpt-image-2 jewelry design images through a short multi-round Apps UI interview. Use when the user explicitly asks for “Grill Me 珠宝”, “Grill Me Jewel”, “你到底想要设计什么”, help discovering a jewelry direction, or has no clear jewelry product, concept, and intended output. Do not use when the request is already specific enough to execute or only needs one ordinary factual clarification.
---

# Grill Me Jewel

## Purpose

Help a beginner discover and articulate what jewelry they want to design. Ask a few focused
questions at a time, preserve every answer, confirm one designer-readable brief, then use Codex
gpt-image-2 to generate the requested real design images.

## Interview

1. Read `references/design-frontier.md`. Identify only the unresolved decisions; reuse facts from
   the conversation and attachments instead of asking them again.
2. For every unresolved round, call `ask_grill_me_questions` as the primary interaction surface.
   Ask one to four currently answerable fields. Discover that exact tool name before falling back
   to prose. Use concise chat questions only after real tool discovery fails or the call errors.
3. Use stable lowercase field and option ids. Offer an `other` option when a useful answer may fall
   outside the list. Never ask for providers, concurrency, internal job ids, API keys, or cost.
4. After submission, summarize only the newly established facts and preserve all earlier answers.
   Continue with the next unresolved frontier; never answer the user's side of the interview.
5. Stop when product identity, design system, concept direction, essential materials or source
   roles, and intended output are sufficient to write a coherent brief. Apply reversible defaults
   to optional details rather than extending the interview indefinitely.
6. Present the assembled brief through one final `ask_grill_me_questions` confirmation round. Ask
   whether to confirm it or revise it, with a text field for corrections when needed.
7. After confirmation, read `references/image2-generation.md`, compile one production prompt per
   requested design, and invoke Codex `$imagegen` / gpt-image-2. The confirmed brief is the source
   of truth; do not resume interviewing during generation.
8. Return the final brief in Markdown under: Objective, Product, Design Direction, Materials and
   Craft, Source Assets, Output Intent, Locked Facts, Flexible Details. Present every real generated
   image inline. Never claim an image exists unless the tool returned it.

## Question Design

- Keep each round to at most four fields and each option set to at most eight choices.
- Prefer single choice for product identity and output intent, multi choice for style or motifs,
  and text only when the answer cannot be represented honestly with options.
- Make choices mutually understandable to a beginner. Avoid internal jewelry workflow jargon.
- A known fact remains immutable unless the user explicitly corrects it.
- Do not invent gemstone grade, origin, certification, size, budget, brand, or manufacturing facts.
- If the user did not request a count, state a reversible default of one design image in the final
  confirmation. If they requested N designs, generate N independent images; never use a contact
  sheet as a substitute.

## Completion

- Confirm that the user explicitly requested the interview or the original idea lacked product,
  concept, and output clarity.
- Confirm every unresolved round used the Apps UI form unless an actual discovery/call failure was
  reported.
- Confirm no round exceeded four fields or repeated an established fact.
- Confirm the final brief was explicitly accepted or corrected by the user.
- Confirm gpt-image-2 returned the requested number of readable image assets. If image generation
  is unavailable or fails, report the real blocker and keep the confirmed brief for retry; do not
  present a text brief as completed visual delivery.
