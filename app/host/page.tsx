"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import {
  addTeam,
  addTime,
  advance,
  amOrganizer,
  dialogueStep,
  goTo,
  organizerLogin,
  removeTeam,
  resetEvent,
  skipToReveal,
  startQuestion,
  toggleExtra,
  togglePause,
} from "../actions";
import { useGame, useRemaining, useResults } from "@/lib/useGame";
import { QUESTIONS, questionById, RULES } from "@/lib/questions";
import { ANSWER_SECONDS, PRESENT_SECONDS, VOTE_SECONDS, type Stage } from "@/lib/types";
import { DialogueStage } from "@/components/Dialogue";
import { Timer } from "@/components/Timer";
import { Finale } from "@/components/Finale";
import { Leaderboard, QuestionSummary, Reveal, SurgeonTableView, TeamChip } from "@/components/Panels";

const btn = "rounded-xl px-4 py-2 font-bold transition active:scale-95 disabled:opacity-40";
const TIMED: Stage[] = ["answering", "presenting", "voting"];

export default function HostPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    amOrganizer().then(setAuthed);
  }, []);
  if (authed === null) return <main className="grid min-h-dvh place-items-center">Loading…</main>;
  if (!authed) return <Login onOk={() => setAuthed(true)} />;
  return <Host />;
}

function Login({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <form
        className="w-full max-w-xs space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await organizerLogin(pin);
          if (r.error) setErr(r.error);
          else onOk();
        }}
      >
        <h1 className="text-3xl font-black">Organizer</h1>
        <input
          type="password"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          aria-label="Organizer PIN"
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-xl outline-none focus:ring-4 focus:ring-violet-400"
        />
        <button className={`${btn} w-full bg-violet-500`}>Enter</button>
        {err && <p className="text-red-300">{err}</p>}
      </form>
    </main>
  );
}

function Host() {
  const { game, teams, participants } = useGame();
  const remaining = useRemaining(game);
  const results = useResults(game);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [hideBar, setHideBar] = useState(false);
  const [finaleDonePhase, setFinaleDonePhase] = useState(-1);
  const [origin] = useState(() => window.location.origin); // Host only renders client-side, after the PIN check
  const firedFor = useRef(-1);

  const act = async (fn: () => Promise<{ error?: string }>) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      setToast(r.error ?? "");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  // Host drives timed transitions: when the countdown hits 0, advance once per phase.
  useEffect(() => {
    if (!game || !TIMED.includes(game.stage) || game.paused_remaining_ms !== null) return;
    if (remaining === 0 && firedFor.current !== game.phase) {
      firedFor.current = game.phase;
      advance(game.phase);
    }
  }, [game, remaining]);

  // 'h' toggles the control bar for a clean projector view
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "h") setHideBar((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const stage = game?.stage;
  useEffect(() => {
    if (stage === "final") confetti({ particleCount: 150, spread: 120, origin: { y: 0.4 } });
  }, [stage]);

  if (!game) return <main className="grid min-h-dvh place-items-center">Loading…</main>;
  const q = questionById(game.question_id);
  const paused = game.paused_remaining_ms !== null;
  const presenting = teams.find((t) => t.id === game.presenting_team_id);
  const P = game.phase;

  const members = (teamId: string) => participants.filter((p) => p.team_id === teamId);

  let screen: React.ReactNode = null;
  switch (game.stage) {
    case "lobby":
      screen = (
        <div className="flex h-full items-center gap-12 p-12">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-center text-6xl font-black">🎲 Game Theory Event</h1>
            <div className="rounded-3xl bg-white p-6">{origin && <QRCodeSVG value={origin} size={320} />}</div>
            <p className="text-2xl text-white/80">
              Join at <b className="text-white">{origin.replace(/^https?:\/\//, "")}</b>
            </p>
            <p className="text-white/60">{participants.length} joined</p>
          </div>
          <TeamGrid teams={teams} members={members} onRemove={(id) => act(() => removeTeam(id))} onAdd={(n) => act(() => addTeam(n))} />
        </div>
      );
      break;
    case "rules":
      screen = (
        <div className="mx-auto flex h-full max-w-5xl flex-col justify-center gap-6 p-12">
          <h1 className="text-6xl font-black">How it works</h1>
          <ol className="list-decimal space-y-4 pl-10 text-3xl leading-snug">
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </div>
      );
      break;
    case "select":
      screen = (
        <div className="mx-auto flex h-full max-w-6xl flex-col justify-center gap-6 p-12">
          <h1 className="text-5xl font-black">Choose the next challenge</h1>
          <div className="grid grid-cols-4 gap-4">
            {QUESTIONS.map((x) => {
              const done = game.finished_question_ids.includes(x.id);
              return (
                <button
                  key={x.id}
                  disabled={done || busy}
                  onClick={() => act(() => startQuestion(P, x.id))}
                  className={`rounded-3xl p-5 text-left transition hover:scale-105 disabled:opacity-35 disabled:hover:scale-100 ${x.last ? "bg-amber-500/30 ring-2 ring-amber-300" : "bg-white/10"}`}
                >
                  <div className="text-3xl font-black text-violet-300">{x.code}</div>
                  <div className="mt-1 text-xl font-bold">{x.title}</div>
                  <div className="mt-2 text-sm text-white/60">{done ? "✓ played" : x.last ? "Play last" : x.topic}</div>
                </button>
              );
            })}
          </div>
          <TeamGrid compact teams={teams} members={members} onRemove={(id) => act(() => removeTeam(id))} onAdd={(n) => act(() => addTeam(n))} />
        </div>
      );
      break;
    case "dialogue":
      screen = q && (
        <DialogueStage
          q={q}
          index={game.dialogue_index}
          onNext={() => act(() => dialogueStep(P, 1))}
          onPrev={() => act(() => dialogueStep(P, -1))}
        />
      );
      break;
    case "answering":
      screen = q && (
        <div className="mx-auto flex h-full max-w-6xl items-center gap-10 p-12">
          <div className="flex-1">
            <QuestionSummary q={q} big />
            {results?.table && (
              <div className="mt-6">
                <SurgeonTableView table={results.table} />
              </div>
            )}
          </div>
          <div className="flex w-72 flex-col items-center gap-6">
            <Timer ms={remaining} total={ANSWER_SECONDS} paused={paused} size={220} />
            <div className="text-center text-4xl font-black">
              {game.submitted_team_ids.length} / {teams.length}
              <div className="text-lg font-normal text-white/60">teams submitted</div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {teams.map((t) => (
                <TeamChip key={t.id} team={t} dim={!game.submitted_team_ids.includes(t.id)} />
              ))}
            </div>
          </div>
        </div>
      );
      break;
    case "presenting":
      screen = (
        <div className="flex h-full flex-col items-center justify-center gap-8" style={{ background: `radial-gradient(circle, ${presenting?.color ?? "#4c1d95"}55, transparent 70%)` }}>
          <div className="text-3xl text-white/70">🎤 Now presenting</div>
          <div className="text-8xl font-black" style={{ color: presenting?.color }}>
            {presenting?.name}
          </div>
          <Timer ms={remaining} total={PRESENT_SECONDS} paused={paused} size={260} />
          <div className="text-xl text-white/50">
            {game.presented_team_ids.length} / {teams.length} teams
          </div>
        </div>
      );
      break;
    case "voting":
      screen = (
        <div className="flex h-full flex-col items-center justify-center gap-8">
          <div className="text-4xl text-white/80">🗳️ Vote now, 0 to 10, for</div>
          <div className="text-7xl font-black" style={{ color: presenting?.color }}>
            {presenting?.name}
          </div>
          <Timer ms={remaining} total={VOTE_SECONDS} paused={paused} size={200} />
          <div className="flex flex-wrap justify-center gap-2">
            {teams
              .filter((t) => t.id !== game.presenting_team_id)
              .map((t) => (
                <TeamChip key={t.id} team={t} dim={!game.voted_team_ids.includes(t.id)} />
              ))}
          </div>
        </div>
      );
      break;
    case "reveal":
      screen = q && (
        <div className="h-full overflow-y-auto p-12">
          {results ? <Reveal q={q} results={results} teams={teams} /> : "Loading…"}
        </div>
      );
      break;
    case "leaderboard":
    case "final":
      screen = (
        <div className="flex h-full items-center overflow-y-auto p-12">
          {results && <Leaderboard standings={results.standings} title={game.stage === "final" ? "🏆 Final Standings" : "Leaderboard"} />}
        </div>
      );
      break;
    case "finale":
      screen = results ? <Finale standings={results.standings} onDone={() => setFinaleDonePhase(P)} /> : null;
      break;
  }

  const timed = TIMED.includes(game.stage);
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      {screen}
      {toast && (
        <button onClick={() => setToast("")} className="absolute top-4 left-1/2 -translate-x-1/2 rounded-xl bg-red-500/90 px-4 py-2 font-bold">
          {toast} ✕
        </button>
      )}
      {!hideBar && (
        <nav className="absolute right-3 bottom-3 left-3 flex flex-wrap items-center gap-2 rounded-2xl bg-black/70 p-2 text-sm backdrop-blur" onClick={(e) => e.stopPropagation()}>
          <span className="px-2 font-mono text-white/60">
            {game.stage}
            {q ? ` · ${q.code}` : ""}
          </span>
          {game.stage === "lobby" && (
            <button className={`${btn} bg-violet-500`} onClick={() => act(() => goTo(P, "rules"))}>
              Show rules ▶
            </button>
          )}
          {game.stage === "rules" && (
            <>
              <button className={`${btn} bg-white/10`} onClick={() => act(() => goTo(P, "lobby"))}>
                ◀ Lobby
              </button>
              <button className={`${btn} bg-violet-500`} onClick={() => act(() => goTo(P, "select"))}>
                Start questions ▶
              </button>
            </>
          )}
          {game.stage === "dialogue" && (
            <button className={`${btn} bg-violet-500`} onClick={() => act(() => dialogueStep(P, 1))}>
              Next line ▶
            </button>
          )}
          {timed && (
            <>
              <button className={`${btn} bg-white/10`} onClick={() => act(() => togglePause(P))}>
                {paused ? "▶ Resume" : "⏸ Pause"}
              </button>
              <button className={`${btn} bg-white/10`} onClick={() => act(() => addTime(P, 60))}>
                +1 min
              </button>
              <button className={`${btn} bg-white/10`} onClick={() => act(() => advance(P))}>
                End now ⏭
              </button>
              <button className={`${btn} bg-amber-500 text-black`} onClick={() => act(() => skipToReveal(P))}>
                Skip to reveal
              </button>
            </>
          )}
          {game.stage === "answering" && q?.lockChoice && (
            <button className={`${btn} bg-white/10`} onClick={() => act(() => toggleExtra(P))}>
              {game.show_extra ? "Hide table" : "Show table"}
            </button>
          )}
          {game.stage === "reveal" && (
            <>
              <button className={`${btn} bg-violet-500`} onClick={() => act(() => goTo(P, "leaderboard"))}>
                Leaderboard ▶
              </button>
              <button className={`${btn} bg-amber-500 text-black`} onClick={() => act(() => goTo(P, "finale"))}>
                🏆 Finale
              </button>
            </>
          )}
          {game.stage === "leaderboard" && (
            <>
              <button className={`${btn} bg-violet-500`} onClick={() => act(() => goTo(P, "select"))}>
                Next question ▶
              </button>
              <button className={`${btn} bg-amber-500 text-black`} onClick={() => act(() => goTo(P, "finale"))}>
                🏆 Finale
              </button>
            </>
          )}
          {game.stage === "finale" && (
            <button disabled={finaleDonePhase !== P} className={`${btn} bg-violet-500`} onClick={() => act(() => goTo(P, "final"))}>
              Show full leaderboard ▶
            </button>
          )}
          <span className="flex-1" />
          {["dialogue", "answering", "presenting", "voting", "reveal", "final"].includes(game.stage) && (
            <button
              className={`${btn} bg-white/10`}
              onClick={() =>
                (game.stage === "reveal" || game.stage === "final" || confirm("Abort this question? Its answers and votes will be discarded.")) &&
                act(() => goTo(P, "select"))
              }
            >
              ☰ Questions
            </button>
          )}
          <button
            className={`${btn} bg-red-500/30`}
            onClick={() => confirm("Reset the whole event? All answers, votes and scores are deleted (teams stay).") && act(resetEvent)}
          >
            Reset
          </button>
          <span className="px-1 text-white/40">h = hide</span>
        </nav>
      )}
    </main>
  );
}

function TeamGrid({
  teams,
  members,
  onRemove,
  onAdd,
  compact,
}: {
  teams: { id: string; name: string; color: string }[];
  members: (id: string) => { id: string; name: string }[];
  onRemove: (id: string) => void;
  onAdd: (name: string) => void;
  compact?: boolean;
}) {
  const [name, setName] = useState("");
  return (
    <div className={`flex-1 space-y-3 ${compact ? "" : "max-h-full overflow-y-auto"}`}>
      <div className={`grid gap-3 ${compact ? "grid-cols-5" : "grid-cols-2"}`}>
        {teams.map((t) => (
          <div key={t.id} className="group relative rounded-2xl p-4" style={{ background: `${t.color}33`, border: `3px solid ${t.color}` }}>
            <div className="text-2xl font-black">{t.name}</div>
            {!compact && <div className="mt-1 text-white/80">{members(t.id).map((m) => m.name).join(", ") || "—"}</div>}
            {compact && <div className="text-sm text-white/60">{members(t.id).length} players</div>}
            <button
              onClick={() => confirm(`Remove ${t.name}?`) && onRemove(t.id)}
              className="absolute top-2 right-3 hidden text-xl text-white/60 group-hover:block hover:text-red-300"
              aria-label={`Remove ${t.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onAdd(name);
          setName("");
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="New team name"
          aria-label="New team name"
          className="flex-1 rounded-xl bg-white/10 px-4 py-2 outline-none focus:ring-2 focus:ring-violet-400"
        />
        <button className={`${btn} bg-emerald-500`}>+ Add team</button>
      </form>
    </div>
  );
}
