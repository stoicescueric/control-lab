# Decision Records

Architecture decision records for Control Lab. Each one captures why a choice was
made and what regression it exists to prevent.

**Nothing here is deleted when it is reversed.** Three of the four ADRs below are
history, kept because the reasoning is still worth reading and because a reversed
decision tends to get re-proposed by whoever has not read it. Only ADR 0004 is
current.

## Current

| ADR | Status | One line |
| --- | --- | --- |
| [0004 — Java everywhere; retire the pseudocode component](./0004-java-everywhere-retire-pseudocode.md) | **Accepted — this is the live rule** | Every algorithm in the curriculum is a `<JavaCode>` block, method-level only, with derivation prompts in `<Exercise>` rather than comments. |

## History

| ADR | Status | One line |
| --- | --- | --- |
| [0001 — Defer the feedforward module](./0001-defer-feedforward-module.md) | Superseded | Argued against extracting a `feedforward` module on a one-consumer count; a second consumer later appeared and `src/lib/domain/feedforward.ts` was extracted. |
| [0002 — Teach algorithms as pseudocode](./0002-pseudocode-over-drop-in-code.md) | Superseded by 0003, then 0004 | Converted 70 Java blocks to pseudocode to stop shipping paste-ready FTC subsystems. The pseudocode is gone; the no-paste-ready-subsystems rule it established is still in force. |
| [0003 — Java in the foundations](./0003-java-in-the-foundations-exercises-out-of-comments.md) | Superseded by 0004 | Split the curriculum — Java in Modules 1–3, pseudocode after. The split was dropped a day later; its two other rules (method-level Java, prompts in `<Exercise>`) carried forward. |

## Reading order

If you only read one, read **0004** — it states the rules that apply today.

0002 and 0003 are worth reading for the argument, not the rule: 0002 is why the
curriculum does not ship compilable subsystems, and 0003 is why derivation
prompts live in `<Exercise>` instead of code comments. Both conclusions survived
into 0004. Their notation rules did not.

0002, 0003, and 0004 were written within about twenty-four hours of each other,
so the chain reads as one argument revised twice rather than three separate
decisions.

## Adding a new ADR

Number sequentially, name the file
`NNNN-short-hyphenated-title.md`, and follow the existing heading structure:
a `# ADR NNNN — Title` line, a metadata list (`Status`, `Date`, `Supersedes` where
it applies, `Context source`), then `## Context`, `## Decision`, `## Consequences`.

When an ADR supersedes another, edit the superseded one's `Status` line to point
forward and add a note in its `## Decision` section — do not delete it — then
update the tables above.
