# App Overview (for redesign)

This is everything the app shows and does, screen by screen: which data each screen has, which actions are available, which states it has to handle, and which file renders it. Logic and data stay as they are; everything in this doc is presentation and can be redesigned freely unless it's marked **constraint**.

---

## 1. The two surfaces

| | **Projector / Host** | **Phone / Participant** |
|---|---|---|
| URL | `/host` | `/` |
| Device | Laptop on a projector, 16:9, viewed from across a room | Phones, ~360–430px wide, portrait |
| Who | Organizer (PIN-protected) | Everyone else |
| Role | The "stage": story scenes, timers, results, plus a control bar | The "controller": join, answer, vote, see own results |
| File | `app/host/page.tsx` | `app/page.tsx` |

Both screens update **live** (Supabase Realtime). Neither one navigates between pages: each is a **single page that swaps its content by `game.stage`**.

---

## 2. Stage machine (drives both screens)

```
lobby → rules → select ─┬→ dialogue → answering → presenting ⇄ voting … → reveal ─┬→ leaderboard → select (next question)
                        │                                                         └→ finale → final
                        └─ (organizer can abort any question back to select)
```

| Stage | What's happening | Timed? |
|---|---|---|
| `lobby` | People join and pick teams | – |
| `rules` | Rules shown | – |
| `select` | Organizer picks the next question | – |
| `dialogue` | Story scene plays line by line | – (organizer advances) |
| `answering` | Teams submit an answer and explanation | **5:00** |
| `presenting` | A random team explains out loud | **60s** |
| `voting` | Other teams rate that explanation 0–10 | **30s** |
| `reveal` | Correct answer, insight and per-team points | – |
| `leaderboard` | Running totals | – |
| `finale` | Animated top-3 podium | ~18s animation |
| `final` | Final standings | – |

`presenting → voting` repeats until every (non-empty) team has presented, or the organizer skips.

---

## 3. Data available to the UI

From `lib/types.ts`, `lib/questions.ts` and `app/actions.ts`:

**Game** (live): `stage`, `question_id`, `dialogue_index`, `presenting_team_id`, `presented_team_ids[]`, `submitted_team_ids[]`, `voted_team_ids[]`, `phase_ends_at` (timer end), `paused_remaining_ms`, `finished_question_ids[]`, `show_extra` (1C table toggle)

**Team**: `id`, `name`, `color` (assigned from a 10-color palette, `TEAM_COLORS` in `lib/questions.ts`)

**Participant**: `name`, `team_id`

**Question** (`lib/questions.ts`): `code` (1A, 1B, 1C, 2A, 2B, 3A, ★, ∞), `title`, `topic`, `scene`, `cast` (characters), `dialogue[]` (lines with speaker and pose), `summary[]` (bullets), `prompt`, `kind` (`mcq` | `number` | `pd`), `choices[]`, flags `lockChoice` (1C), `last` (Voting Game)

**Results** (fetched at reveal, leaderboard, finale and final):
- `standings[]`: `{ name, color, total }`, sorted
- `reveal`: `answer` (headline), `insight` (paragraph), `correct[]`, and per team `{ choice | number, correct, voteAvg, votes, points }`
  - 2A extra: `average`, `target`, `closest[]`
  - 2B: head-to-head `matches` (round, revealed moves, scores); each team scores its raw match total
- `table`: the 1C surgeon breakdown (shown only after a team locks its pick, or when the organizer toggles it on)

**Privacy rule (constraint):** individual votes and other teams' answers are never shown before the reveal, and after it only **averages** appear, never who voted what.

---

## 4. Projector screens (`/host`)

The layout is a full-height screen area with a **control bar** at the bottom. Pressing `h` hides the bar for a clean projector view.

### 4.0 PIN gate
- A centered card with a "Organizer" title, a password input and an **Enter** button. On a wrong PIN, an error appears under the button.

### 4.1 Lobby
- **Left:** event title, a big **QR code** to the site URL, a "Join at `<domain>`" line and an "N joined" count.
- **Right:** a grid of **team cards** (name, member names, team color as border and tint). Hovering a card shows a ✕ to remove the team.
- An **"New team name" input + Add team** button.
- States: no teams yet, empty team (shown as "—" in place of member names), many teams (the list scrolls).

### 4.2 Rules
- Big title plus 6 numbered rules (`RULES` in `lib/questions.ts`).

### 4.3 Question select
- Title "Choose the next challenge".
- A **grid of 8 question cards**: code, title and topic. Played questions are dimmed and marked "✓ played". The Voting Game is highlighted with the caption "Play last".
- A compact team grid underneath (member counts), with add and remove.

### 4.4 Dialogue (story scene): **the hero screen**
- A full-bleed **scene backdrop** (SVG), **2–3 characters** standing on the floor line at the left, center and right, and a **dialogue box** at the bottom.
- Dialogue box: a speaker **name tag** (in the character's shirt color; "Narrator" in italics), **typewriter text**, and a "3/9 · Space ▶" progress hint.
- The speaking character bobs and scales up slightly; the others are dimmed. Characters keep their last pose.
- Controls: **Space / → / Enter / click** first finishes typing, then advances. **←** goes back. After the last line the stage moves to answering.
- See §6 for the characters and §7 for the scenes.

### 4.5 Answering
- **Left:** question code and topic (small caps), title, summary bullets, the **prompt** (highlighted), and the MCQ choices in a 2×2 grid as A/B/C/D tiles (not shown for 2A, which takes a number). For 1C, the surgeon table appears when the organizer toggles it.
- **Right:** a big **ring timer** (5:00), an **"X / N teams submitted"** count, and **team chips** that light up as each team submits.

### 4.6 Presenting
- Centered: "🎤 Now presenting", the **team name** huge in its team color, a **60s ring timer** and "k / N teams". The background is a radial glow in the team's color.

### 4.7 Voting
- "🗳️ Vote now, 0 to 10, for" plus the team name, a **30s ring timer**, and chips for the voting teams that light up as each one votes.

### 4.8 Reveal
- The **correct answer** as a big green headline, then the **insight** paragraph.
- Optional blocks: 1C surgeon table; 2A "Average → target → closest team(s)"; 2B final match cards. "Show the math" swaps the insight for step-by-step math.
- A **results table**: team chip | their answer | ✅ +2 / ❌ | avg vote | points.

### 4.9 Leaderboard / Final standings
- A ranked list of horizontal **bars** (team color, width proportional to points), with rank, name and total. The bars animate in.
- `final` uses the title "🏆 Final Standings" and fires confetti once.

### 4.10 Finale (`components/Finale.tsx`)
- A podium with three blocks: 2nd on the left, 1st in the center, 3rd on the right.
- Sequence: a pulsing drumroll caption ("🥁 And in third place…"), then 3rd rises (~3s), then 2nd (~8s), then 1st (~14s), each with its medal emoji, team name and points. Confetti plays for each place, with a long burst for 1st.
- After it finishes, the control bar enables **"Show full leaderboard"**.
- Handles fewer than 3 teams.

### 4.11 Control bar (contextual buttons)
| Stage | Buttons |
|---|---|
| lobby | Show rules ▶ |
| rules | ◀ Lobby · Start questions ▶ |
| dialogue | Next line ▶ |
| answering / presenting / voting | ⏸ Pause / ▶ Resume · +1 min · End now ⏭ · **Skip to reveal** |
| answering (1C only) | Show / Hide table |
| reveal | Leaderboard ▶ · **🏆 Finale** |
| leaderboard | Next question ▶ · 🏆 Finale |
| finale | Show full leaderboard ▶ (disabled until the animation ends) |
| always | stage label · ☰ Questions (abort, with confirm) · Reset (with confirm) · "h = hide" hint |

Errors appear as a red **toast** at the top center; clicking it dismisses it.

---

## 5. Phone screens (`/`)

Everything sits in a single column with max width ~512px. The **header** shows "Hi <name>" on the left and the team chip plus a **Switch** link on the right.

| # | Screen | Content / interactions |
|---|---|---|
| 5.1 | **Join** | Event title, name input (max 24 characters), **Join** button. |
| 5.2 | **Team picker** | "Pick your team", one big button per team in its color with a member count, the current team outlined, and **Leave my team**. It also shows when Switch is tapped, and says "Waiting for organizer…" if there are no teams yet. |
| 5.3 | Lobby | "You're in! 🎉 Waiting for the organizer…" |
| 5.4 | Rules | Rules list |
| 5.5 | Select | "Get ready… next question is coming up" |
| 5.6 | Dialogue | "👀 Watch the screen" plus the question code and title |
| 5.7 | **Answering** | See below |
| 5.8 | Presenting | Own team: "🎤 Your team is up! Stand up and explain" plus a timer. Other teams: "<Team> is presenting" plus a timer and "You'll vote next". |
| 5.9 | **Voting** | Own team: "Other teams are voting on you… 🤞". Others: timer, "How good was <Team>'s explanation?", and a **0–10 grid** (4 columns, 11 buttons); the selected one is highlighted and the vote can be changed. Shows "Your team voted ✓". |
| 5.10 | Reveal | Code/title, correct answer, insight, and a "Your team: ✅/❌ · avg vote · points" card |
| 5.11 | Leaderboard / Final | The same bar leaderboard, with the own team outlined |
| 5.12 | Finale | "🥁 Eyes on the screen!" |

**5.7 Answering (the main interaction):**
- A small ring timer, then a card with the question summary and prompt.
- Input, by question type:
  - **MCQ:** a vertical list of choice buttons (A–D), with the selected one highlighted.
  - **Number (2A):** a big numeric input from 0 to 100.
  - **1C two-step:** the team first picks a surgeon, then taps **"Lock in our pick 🔒"**. The choices become disabled, with 🔒 on the chosen one. A "Plot twist!" **surgeon table** appears, followed by the explanation box.
- An **explanation textarea** (required, 2000 characters) and a **Submit answer** button, which reads **Update answer** once submitted.
- Status line: "Submitted ✓ Teammates can still edit until time's up". Any member of a team can submit; the latest submission wins.
- Errors appear inline in red.

Shared phone states: **Loading…**, inline **error banner** (for example "Wait until the presentation is over to switch teams").

---

## 6. Characters (`components/Character.tsx`)

- Flat SVG people with a 200×420 viewBox: head, hair, neck, torso, two-segment arms, legs and shoes.
- **Constraint: no eyes, mouth or eyebrows.** Faces are plain skin-colored shapes.
- `Look` props: `skin`, `hair` color, `hairStyle` (`short` | `long` | `bun` | `curly` | `bald` | `hijab`), `top`, `bottom`, `accessory` (`tie` | `labcoat` | `robe` | `mic` | `cap`).
- **Poses:** `idle`, `point`, `think`, `shrug`, `cheer`, `wave`. Arms rotate with a springy transition, and `wave` animates.
- Motion: `anim-breathe` while idle, `anim-talk` (bounce) while speaking. Characters slide in from the sides when a scene starts.
- 19 characters across 8 questions; their looks are defined inline in `lib/questions.ts`.

## 7. Scenes (`components/Scene.tsx`)

The scenes are 1600×900 SVG backdrops scaled to cover the screen, with the floor line at y≈720. Characters stand at the far left and right, plus the center when there are three, so **key signage sits in the center-top area**.

| Scene | Question | Key props |
|---|---|---|
| `gameshow` | 1A Three Doors | 3 numbered doors (door 3 open), "PICK-A-DOOR" title, spotlights |
| `lab` | 1B DNA | DNA helix screen with "MATCH: 1 in 1,000,000", lab bench |
| `hospital` | 1C Surgeons | "Surgeon A — 95% / B — 90%" board, red cross, window, bed |
| `classroom` | 2A Two-Thirds | Chalkboard "target = ⅔ × average / pick 0…100", desks |
| `arena` | 2B Cooperate/Defect | Red and blue halves, payoff board, two button podiums |
| `courtroom` | 3A Justice | Wood panels, judge's bench, scales emblem |
| `airfield` | ★ Bullet Holes | Plane with red bullet dots on the wings and tail, sun, runway |
| `hall` | ∞ Voting Game | Stage screen showing "LEADERBOARD" bars |

---

## 8. Question content summary

| Code | Title | Input | Cast |
|---|---|---|---|
| 1A | The Three Doors | MCQ (3) | Maya (host), Omar |
| 1B | The DNA Evidence | MCQ (4) | Det. Karim, Lina (lab) |
| 1C | Choosing the Better Surgeon | MCQ (3), **lock then table** | Sara, Nurse Hadi |
| 2A | The Two-Thirds Game | **Number 0–100** | Yousef, Prof. Nadia, Leen |
| 2B | Cooperate or Defect | Live 4-round head-to-head matches (even team count) | Dana, Rami (host), Zaid |
| 3A | Justice vs. Wrongful Conviction | MCQ (4) | Faris, Judge Amal, Huda |
| ★ | The Missing Bullet Holes | MCQ (4) | Capt. Tariq, Eng. Rana |
| ∞ | The Voting Game (last) | MCQ (4) | Reem, The Host, Ali |

Dialogues run 6–9 lines each. All copy lives in `lib/questions.ts`; answers and insights live in `lib/answers.ts`.

---

## 9. Current visual system

| Token | Value |
|---|---|
| Background | `#0b0820` (deep indigo-black), set in `app/globals.css` |
| Text | `#f8fafc` |
| Accent (primary buttons, labels) | violet `#8b5cf6` / `violet-300` |
| Highlight (prompts, drumroll) | amber `#fcd34d` / `amber-300` |
| Correct | emerald `#6ee7b7` |
| Danger | red `#ef4444` |
| Surfaces | `white/5`, `white/10` translucent cards, `rounded-2xl`/`rounded-3xl` |
| Team colors | red, blue, green, amber, purple, pink, teal, orange, indigo, lime |
| Font | Geist Sans (`next/font`), heavy weights (`font-black`) for headings |
| Timer | SVG ring; green above 50%, amber above 20%, red below that; `m:ss` above 60s |
| Motion | `motion` (Framer Motion) springs, `canvas-confetti`, and CSS keyframes in `globals.css` |
| Styling | Tailwind v4 utility classes inline. There is no component library and no design-token layer beyond the CSS variables. |

---

## 10. Where to change things

| To redesign… | Edit |
|---|---|
| Global colors, fonts, keyframes | `app/globals.css`, `app/layout.tsx` |
| Projector screens and control bar | `app/host/page.tsx` |
| Phone screens | `app/page.tsx` |
| Leaderboard, reveal, question summary, tables, team chip | `components/Panels.tsx` |
| Story scene layout and dialogue box | `components/Dialogue.tsx` |
| Characters | `components/Character.tsx` |
| Backdrops | `components/Scene.tsx` |
| Podium finale | `components/Finale.tsx` |
| Timer | `components/Timer.tsx` |
| Copy, cast, rules, team palette | `lib/questions.ts` |

**Don't touch for a visual redesign:** `app/actions.ts` (game logic and security), `lib/scoring.ts`, `lib/useGame.ts`, `lib/db.ts`, `supabase/schema.sql`.

---

## 11. Constraints and edge cases to design for

- **Faceless characters** (hard requirement).
- **Projector legibility:** viewed from across a room, so keep text big and contrast high, and expect 16:9 at roughly 1600×900 or larger.
- **Phone:** one-thumb use, large tap targets, and the explanation textarea must work with the on-screen keyboard open.
- **Counts:** 1–10 teams, ~20 people, team names up to 30 characters, player names up to 24.
- **Timers:** paused state shows "PAUSED" in the ring; a timer can go past 5:00 after "+1 min".
- **Empty states:** no teams; a team with no members (excluded from presenting and counts); no votes ("—"); no submission ("—").
- **Late joiners and switching:** joining or switching is blocked during presenting and voting, with an inline error.
- **Stale presses:** double presses are silently ignored, so no UI is needed for them.
- **The control bar must stay usable**, but it can be hidden with `h`, so screens must look complete without it.
