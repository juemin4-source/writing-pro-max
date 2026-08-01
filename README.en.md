[中文](README.md) | **English**

<img src="banner.svg" alt="Novel Skills" width="100%">

# Writing Pro Max

![Version](https://img.shields.io/badge/version-v1.0.0-gold)
![License](https://img.shields.io/badge/license-CC--BY--NC--4.0-blue)
![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-8b5cf6)
[![GitHub Discussions](https://img.shields.io/badge/Discussions-Open-green)](https://github.com/juemin4-source/novel-skills/discussions)

## From Parts to Fate — Let Stories Grow

AI can rapidly generate settings, characters, outlines, and dialogue.

Yet many stories still end up as parts stitched together: characters with complete dossiers that are never truly pressed by the world; plots that keep happening without changing anyone's fate; endings that are written — and with them, meaning is exhausted.

Novel Skills comes from the original literary theory *Literary Evolution* (文学天演论), and addresses a more fundamental question:

> How does a story grow from a concept — through character, fate, and scene — until it leaves behind an aftershock that cannot be easily used up?

It compiles the theory's core ideas — character generation, world pressure, fate cycles, the twelve time-positions, the twenty-four solar terms, scene judgment, and the aftershock — into four directly usable AI skills.

```text
World mechanism
→ Character under pressure
→ Fate grows
→ Structure takes form
→ Plot enters the scene
→ Scene becomes performance
→ The story ends, and meaning keeps vibrating
```

This system will not assemble a "story-shaped" answer for you with fixed beats.

It keeps asking:

* From which pressure position of the world does the character grow?
* Have their "private, circumstance, conviction, action, becoming" truly entered the action?
* What time-position is this passage in — should it grow, ripen, stop, or be settled?
* Has abstract emotion entered body, object, space, and relationship?
* What did a choice actually change, and who can never return to where they were?
* After the story ends, what remains — a sequel hook, the author's explanation, or an unexhausted aftershock of meaning?

## Four Skills, One Creative Chain

| Skill | The problem it solves | Output |
| ----- | --------------------- | ------ |
| `novel-original-writing` | How does a concept grow into a script with world, character, fate, and aftershock? | World model, character relations, fate structure, scenes, and screenplay |
| `novel-review` | Where exactly did a novel fail? | Evidence-backed diagnosis, red/yellow-card issues, and W-value scoring |
| `novel-to-screen-adaptation` | How do psychology, causality, and theme become visible action on screen? | Adaptation proposition, driver, object system, scene cards, and a shootable screenplay |
| `video-prompt-adapter` | How does the emotion in a script become performance Seedance 2.5 can execute? | Character interior, micro-performance, camera relations, and Seedance 2.5 platform prompts |

## Four Ways In

### From a single idea

> "I only have a vague concept — help me grow it into a story."

Call `novel-original-writing`: from seed, world, character, structure, scene, all the way to the aftershock.

### Diagnose a finished work

> "This novel feels wrong, but I don't know where the problem is."

Call `novel-review`: search the four layers (character, structure, ending, prose) for textual evidence — is it unformed characters, missed time-position, missing scene, or an ending without aftershock?

### Turn a novel into a shootable script

> "Keep what truly matters in this novel and adapt it into a screenplay."

Call `novel-to-screen-adaptation`: preserve causality, theme, and narrative function; find actions, objects, relations, and audiovisual carriers that belong on screen.

### Write performance into video prompts

> "The picture is right, but the character still looks like they're posing for the camera."

Call `video-prompt-adapter`: break the character's inner change into eye movement, breath, action beats, body relations, camera positions, and negative constraints — outputting prompts **tuned for Seedance 2.5** (performance layer + platform formula/@reference/timestamps).

## Director Mode

Every key stage is decided by the user.

```text
AI proposes
→ User chooses, modifies, or rejects
→ Stage output
→ Sample summary
→ Pass / Revise / Self-check / Review
→ Keep growing
```

AI participates boldly in creation, but must justify its judgments. Characters and structure are allowed to be rediscovered in later scenes; a stage sign-off means the current version is good enough to move forward — not that the story has lost its right to change.

## The Theoretical Core

*Literary Evolution* has always been about one process:

> Literature occurs when plot enters the scene — an irreversible change wrought in the character and in the reader.

Characters cannot just carry labels; they must grow from the world's mechanism, their story position, and the "private, circumstance, conviction, action, becoming" of the self.

Structure cannot just arrange events; it must judge whether things are hiding, starting, growing, ripening, stopping, being settled, or returning to storage.

The scene cannot just describe; it must let the abstract enter the body, taking the reader from "knowing what happened" to "having lived through it."

The ending cannot just stop. A true aftershock comes from everything that already happened: the character cannot go back, the relationship cannot be restored, the old answer has failed, and meaning is not yet used up.

Novel Skills brings these judgments into every real act of creation.

---

## Installation

**Option 1: Plugin marketplace (recommended)**

```text
/plugin marketplace add juemin4-source/writing-pro-max
/plugin install writing-pro-max@writing-pro-max
```

**Option 2: Manual copy**

Copy the four directories side-by-side into your project's `.claude/skills/` (or user-level `~/.claude/skills/`) — keep them at the same level, since skill-to-skill references are relative paths.

## Author

**YiYu (一羽老师)** — *Not blindly chasing trends; let's look deeper at the world together.*

- Bilibili (writing theory, in Chinese: solar-terms acceptance, the 38 questions, story evolution): https://space.bilibili.com/8913993
- GitHub: https://github.com/juemin4-source

The *Literary Evolution* series (including *Characters*, *Fate*, and *Story Evolution*) is the author's original methodology; this repository is its Claude Code operationalization.

## License

[CC BY-NC 4.0](LICENSE) (Attribution-NonCommercial) — Share and adapt freely, with attribution; no commercial use.
