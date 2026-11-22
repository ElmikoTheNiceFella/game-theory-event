# Game Theory Event

A live, team-based workshop on probability, strategy and decision-making. Round 1 is a fast individual Blooket quiz. Round 2 is a case-based team game played through this Next.js app: one projector screen for the organizer and everyone's phones for the participants.

---

## The event at a glance

| | Round 1: Warm-up quiz | Round 2: Case challenges |
|---|---|---|
| Played on | [Blooket](https://www.blooket.com) | This app |
| Played as | Individuals | Teams (5–10 teams, ~20 people) |
| Format | 9 multiple-choice questions, 30s each | Story scene → team answer → presentations → peer votes |
| Scoring | Blooket's own scoring | 2 pts for a correct answer + average vote from other teams |
| Ends with | Blooket podium | Animated top-3 reveal, then the full leaderboard |

---

## Round 1: Blooket quiz

Import [`Blooket_Round1_Probability.xlsx`](./Blooket_Round1_Probability.xlsx) into Blooket (**Create → Spreadsheet Import**). It contains 9 questions, 30 seconds each:

1. **The Birthday Paradox**: how many people for a >50% shared birthday?
2. **The Positive Test Paradox**: base rates and false positives
3. **Fewer Than Two Legs**: why "average" can mislead
4. **The Viral Video Challenge**: P(at least one success)
5. **The AI Hiring System**: conditional probability in selection
6. **The Friendship Paradox**: sampling bias in social networks
7. **The Gambler's Fallacy**: independence of coin flips
8. **The Safe Bet**: expected value vs. loss aversion
9. **The Hot Hand** *(optional)*: streaks vs. randomness

---

## Round 2: Case challenges (this app)

### Roles
- **Organizer** opens `/host` on the projector laptop and enters the organizer PIN. They add and remove teams, choose which question to play, step through the story, and control every stage and timer.
- **Participants** open the site on their phones (scan the QR code shown in the lobby), enter their name and tap a team to join. They can switch or leave teams at any time, except while a presentation or vote is in progress.

### How a question plays out
1. **Story scene**: the projector plays the problem as a visual-novel dialogue with illustrated scenes and faceless characters. The organizer advances each line with **Space / → / click** (← goes back). Phones show *"Watch the screen"*.
2. **Answering (5 min)**: the projector shows a summary of the problem and a live **"X / N teams submitted"** counter. On their phones, each team submits **one answer** (multiple choice, or a number for the Two-Thirds Game) plus **a written explanation**. Any team member can submit, and the latest submission counts. The window closes early once every team has submitted. The organizer can pause it, add a minute or end it early.
3. **Presentations**: the app picks teams **at random** until every team has presented. The chosen team stands up and has **60 seconds** to explain its reasoning, with a countdown on the projector and on that team's phones.
4. **Voting (30 s)**: after each presentation, **every other team casts one vote from 0 to 10**. Any member can cast it, and the latest vote counts. Voting ends early once all teams have voted. Only averages are ever shown, never who voted what.
5. **Reveal**: the projector shows the correct answer, the key insight, and each team's answer, average vote and points for the question.
6. **Leaderboard**: running team totals. The organizer then picks the next question.

The organizer can **skip** the remaining presentations at any time and jump straight to the reveal.

### Scoring

```
points for a question = (2 if the answer is correct, else 0) + average of the votes from other teams
```
- A team never votes on itself, and its own vote never affects its own score.
- A team that didn't submit can still earn its vote average by presenting.
- If no team votes on a presentation, its vote part is 0.
- **Two-Thirds Game special rule:** **+2** goes to every team that picked **0** (the Nash equilibrium) **and** to the team(s) closest to the actual ⅔-of-average target.
- Totals add up across all questions.

### The questions
The organizer can play them in any order. **The Voting Game is meant to be played last.**

| Code | Question | Concept |
|---|---|---|
| 1A | **The Three Doors**: stay or switch after the host opens an empty door? | Conditional probability (Monty Hall) |
| 1B | **The DNA Evidence**: a 1-in-a-million match in a city of 8 million. Guilty? | Base rates, prosecutor's fallacy |
| 1C | **Choosing the Better Surgeon**: 95% vs 90% overall. Teams lock in a pick, *then* see the mild/severe breakdown and must explain the reversal. | Simpson's paradox |
| 2A | **The Two-Thirds Game**: pick 0–100; closest to ⅔ of the average wins. The reveal shows everyone's numbers, the average and the target. | Iterated reasoning, Nash equilibrium |
| 2B | **Cooperate or Defect**: a payoff matrix for one round. The reveal also shows a just-for-fun pairing of teams. | Prisoner's dilemma, dominant strategies |
| 3A | **Justice vs. Wrongful Conviction**: if convicting an innocent person is 10× worse than freeing a guilty one, how sure must a jury be? | Decision thresholds, false positives vs. negatives |
| ★ | **The Missing Bullet Holes**: where should the armor go on returning WWII planes? | Survivorship bias |
| ∞ | **The Voting Game**: given this event's own scoring rules, how should a team vote to maximize its rank? | Game theory of the event itself |

> **Facilitators:** answers and talking points are in [`lib/answers.ts`](./lib/answers.ts). Note that this repo is public, so participants could look them up.

**Why the Voting Game is last:** the event's peer voting is itself a game. Your vote can't change your own score, but it can raise or lower your rivals' scores. Seeing the incentive behind that is the final lesson, so the app deliberately uses a plain average with no protection against strategic voting.

### The finale
After the last question, the organizer skips the regular leaderboard and triggers the **Finale**. To a drumroll caption, **3rd**, then **2nd**, then **1st** place rise onto a podium, with confetti for the champions. Then the full final leaderboard is shown.

### Stage flow

```
lobby → rules → [question select → story → answering (5:00)
                 → presenting (60s) ⇄ voting (30s) … → reveal → leaderboard] × N
              → finale (top 3) → final leaderboard
```

---

## Running it

**Stack:** Next.js 16 (App Router) on Vercel, Supabase (Postgres + Realtime). All game state lives in Supabase, so phones only need ordinary internet access, which works on restrictive networks like eduroam.

### 1. Supabase
Create a project, then run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL editor. It creates the tables, row-level security (phones can only *read* game, teams and participants; answers and votes stay private) and the realtime publication.

### 2. Environment (`.env.local`, and the same values in Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET=sb_secret_...        # server only, never exposed to phones
ORGANIZER_PIN=<pick one>
```

### 3. Develop / test / deploy
```bash
npm install
npm run dev        # http://localhost:3000 (participants), /host (organizer)
npm test           # scoring unit tests
npm run build
```
Deploy by importing the repo into Vercel and adding the environment variables.

### Event-day checklist
- [ ] Projector laptop: open `/host`, log in with the PIN, add the teams.
- [ ] Put the lobby QR code on screen and let everyone join.
- [ ] Play Round 1 in Blooket.
- [ ] Round 2: Rules → questions (Voting Game last) → **Finale** after the last reveal.
- [ ] To rehearse beforehand, use **Reset event** on `/host`. It clears answers, votes and scores but keeps teams and players.
