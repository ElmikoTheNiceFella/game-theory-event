"use client";

import { useEffect, useState } from "react";
import { castVote, getMySubmission, joinEvent, setTeam, submitAnswer, type Results } from "./actions";
import { useGame, useRemaining, useResults } from "@/lib/useGame";
import { questionById, RULES, type Question } from "@/lib/questions";
import { ANSWER_SECONDS, PRESENT_SECONDS, VOTE_SECONDS, type Game, type Team } from "@/lib/types";
import { Timer } from "@/components/Timer";
import { Leaderboard, QuestionSummary, SurgeonTableView, TeamChip } from "@/components/Panels";

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

// crypto.randomUUID needs a secure context; getRandomValues works on plain-http LAN too
const uuid = () =>
  "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16),
  );

const card = "rounded-3xl bg-white/5 p-5";
const btn = "rounded-2xl px-5 py-3 font-bold transition active:scale-95 disabled:opacity-40";

export default function ParticipantPage() {
  const { game, teams, participants } = useGame();
  const [pid, setPid] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let id = store.get("gte_pid");
    if (!id) {
      id = uuid();
      store.set("gte_pid", id);
    }
    setPid(id);
  }, []);

  const me = participants.find((p) => p.id === pid);
  const myTeam = teams.find((t) => t.id === me?.team_id) ?? null;

  if (!game || !pid) return <Center>Loading…</Center>;
  if (!me) return <Join pid={pid} />;

  const pickTeam = async (teamId: string | null) => {
    const r = await setTeam(pid, teamId);
    if (r.error) setErr(r.error);
    else {
      setErr("");
      setPicking(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="text-sm text-white/60">
          Hi <b className="text-white">{me.name}</b>
        </div>
        <div className="flex items-center gap-2">
          {myTeam && <TeamChip team={myTeam} />}
          {myTeam && (
            <button className="text-sm text-violet-300 underline" onClick={() => setPicking(!picking)}>
              {picking ? "Cancel" : "Switch"}
            </button>
          )}
        </div>
      </header>
      {err && <div className="rounded-xl bg-red-500/20 p-3 text-red-200">{err}</div>}
      {!myTeam || picking ? (
        <TeamPicker teams={teams} participants={participants} current={myTeam?.id ?? null} onPick={pickTeam} />
      ) : (
        <StageView game={game} teams={teams} pid={pid} myTeam={myTeam} />
      )}
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-dvh place-items-center p-6 text-center text-xl">{children}</main>;
}

function Join({ pid }: { pid: string }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Center>
      <form
        className="w-full max-w-sm space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await joinEvent(pid, name);
          setBusy(false);
          if (r.error) setErr(r.error);
        }}
      >
        <h1 className="text-4xl font-black">🎲 Game Theory Event</h1>
        <input
          autoFocus
          maxLength={24}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          className="w-full rounded-2xl bg-white/10 px-5 py-4 text-xl outline-none focus:ring-4 focus:ring-violet-400"
        />
        <button disabled={!name.trim() || busy} className={`${btn} w-full bg-violet-500 text-xl`}>
          Join
        </button>
        {err && <p className="text-red-300">{err}</p>}
      </form>
    </Center>
  );
}

function TeamPicker({
  teams,
  participants,
  current,
  onPick,
}: {
  teams: Team[];
  participants: { team_id: string | null }[];
  current: string | null;
  onPick: (id: string | null) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-black">Pick your team</h2>
      {!teams.length && <p className="text-white/60">Waiting for the organizer to create teams…</p>}
      {teams.map((t) => (
        <button
          key={t.id}
          onClick={() => onPick(t.id)}
          className={`${btn} flex w-full items-center justify-between text-left text-xl ${current === t.id ? "ring-4 ring-white" : ""}`}
          style={{ background: t.color }}
        >
          <span>{t.name}</span>
          <span className="text-base opacity-80">{participants.filter((p) => p.team_id === t.id).length} 👤</span>
        </button>
      ))}
      {current && (
        <button onClick={() => onPick(null)} className={`${btn} w-full bg-white/10`}>
          Leave my team
        </button>
      )}
    </section>
  );
}

function StageView({ game, teams, pid, myTeam }: { game: Game; teams: Team[]; pid: string; myTeam: Team }) {
  const q = questionById(game.question_id);
  const remaining = useRemaining(game);
  const results = useResults(game);
  const paused = game.paused_remaining_ms !== null;
  const presenting = teams.find((t) => t.id === game.presenting_team_id);
  const mine = game.presenting_team_id === myTeam.id;

  switch (game.stage) {
    case "lobby":
      return <Info title="You're in! 🎉" text="Waiting for the organizer to start…" />;
    case "rules":
      return (
        <section className={card}>
          <h2 className="mb-3 text-2xl font-black">How it works</h2>
          <ol className="list-decimal space-y-2 pl-5">
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </section>
      );
    case "select":
      return <Info title="Get ready…" text="The next question is coming up." />;
    case "dialogue":
      return <Info title="👀 Watch the screen" text={q ? `${q.code} · ${q.title}` : ""} />;
    case "answering":
      return q ? (
        <>
          <div className="flex justify-center">
            <Timer ms={remaining} total={ANSWER_SECONDS} paused={paused} size={110} />
          </div>
          <AnswerForm key={q.id} q={q} pid={pid} submitted={game.submitted_team_ids.includes(myTeam.id)} />
        </>
      ) : null;
    case "presenting":
      return (
        <section className={`${card} space-y-4 text-center`}>
          <h2 className="text-3xl font-black">{mine ? "🎤 Your team is up! Stand up and explain your answer." : `${presenting?.name ?? "A team"} is presenting`}</h2>
          <Timer ms={remaining} total={PRESENT_SECONDS} paused={paused} />
          {!mine && <p className="text-white/60">Listen closely. You'll vote next.</p>}
        </section>
      );
    case "voting":
      return mine ? (
        <Info title="Other teams are voting on you…" text="Fingers crossed 🤞" />
      ) : (
        <VoteForm key={game.presenting_team_id} pid={pid} team={presenting} voted={game.voted_team_ids.includes(myTeam.id)} remaining={remaining} paused={paused} />
      );
    case "reveal":
      return q ? <PhoneReveal q={q} results={results} teamId={myTeam.id} /> : null;
    case "leaderboard":
    case "final":
      return results ? <Leaderboard standings={results.standings} highlight={myTeam.id} title={game.stage === "final" ? "Final standings" : "Leaderboard"} /> : null;
    case "finale":
      return <Info title="🥁 Eyes on the screen!" text="The top 3 are about to be revealed…" />;
  }
}

function Info({ title, text }: { title: string; text: string }) {
  return (
    <section className={`${card} space-y-2 py-12 text-center`}>
      <h2 className="text-3xl font-black">{title}</h2>
      <p className="text-white/70">{text}</p>
    </section>
  );
}

function AnswerForm({ q, pid, submitted }: { q: Question; pid: string; submitted: boolean }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [num, setNum] = useState("");
  const [explanation, setExplanation] = useState("");
  const [locked, setLocked] = useState(false);
  const [table, setTable] = useState<Results["table"]>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Load the team's saved answer on mount, and again when a teammate submits (unless we're mid-edit).
  useEffect(() => {
    if (dirty) return;
    getMySubmission(pid).then(({ submission, table }) => {
      setTable(table);
      if (!submission) return;
      setChoice(submission.choice);
      setNum(submission.number?.toString() ?? "");
      setExplanation(submission.explanation);
      setLocked(submission.locked);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, submitted]);

  const send = async (opts?: { lockOnly?: boolean }) => {
    setBusy(true);
    const r = await submitAnswer(pid, { choice, number: num === "" ? null : Number(num), explanation: opts?.lockOnly ? "" : explanation });
    setBusy(false);
    if (r.error) return setMsg(r.error);
    setDirty(false);
    setMsg(opts?.lockOnly ? "Pick locked 🔒" : "Submitted ✓ Teammates can still edit until time's up.");
    const s = await getMySubmission(pid);
    setTable(s.table);
    setLocked(!!s.submission?.locked);
  };

  const needsLock = q.lockChoice && !locked;
  return (
    <section className={`${card} space-y-4`}>
      <QuestionSummary q={q} />
      {q.kind === "number" ? (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={num}
          onChange={(e) => (setNum(e.target.value), setDirty(true))}
          placeholder="0 – 100"
          aria-label="Your number"
          className="w-full rounded-2xl bg-white/10 px-5 py-4 text-center text-4xl font-black outline-none focus:ring-4 focus:ring-violet-400"
        />
      ) : (
        <div className="space-y-2">
          {q.choices.map((c, i) => (
            <button
              key={c}
              disabled={q.lockChoice && locked}
              onClick={() => (setChoice(i), setDirty(true))}
              className={`${btn} w-full text-left ${choice === i ? "bg-violet-500 ring-4 ring-violet-200" : "bg-white/10"}`}
            >
              <b className="mr-2">{String.fromCharCode(65 + i)}.</b>
              {c}
              {q.lockChoice && locked && choice === i && " 🔒"}
            </button>
          ))}
        </div>
      )}
      {needsLock ? (
        <button disabled={choice === null || busy} onClick={() => send({ lockOnly: true })} className={`${btn} w-full bg-amber-500 text-lg`}>
          Lock in our pick 🔒
        </button>
      ) : (
        <>
          {table && (
            <div className="space-y-2">
              <p className="font-bold text-amber-300">Plot twist! Here&apos;s the full breakdown:</p>
              <div className="overflow-x-auto text-sm">
                <SurgeonTableView table={table} />
              </div>
              <p className="text-white/80">How can A have the higher overall rate if B is better in both categories? Explain.</p>
            </div>
          )}
          <textarea
            value={explanation}
            onChange={(e) => (setExplanation(e.target.value), setDirty(true))}
            rows={5}
            maxLength={2000}
            placeholder="Explain your reasoning…"
            aria-label="Explanation"
            className="w-full rounded-2xl bg-white/10 p-4 outline-none focus:ring-4 focus:ring-violet-400"
          />
          <button
            disabled={busy || !explanation.trim() || (q.kind === "number" ? num === "" : choice === null)}
            onClick={() => send()}
            className={`${btn} w-full bg-emerald-500 text-lg`}
          >
            {submitted ? "Update answer" : "Submit answer"}
          </button>
        </>
      )}
      {(msg || submitted) && <p className="text-center text-emerald-300">{msg || "Your team has submitted ✓"}</p>}
    </section>
  );
}

function VoteForm({ pid, team, voted, remaining, paused }: { pid: string; team?: Team; voted: boolean; remaining: number | null; paused: boolean }) {
  const [score, setScore] = useState<number | null>(null);
  const [err, setErr] = useState("");
  return (
    <section className={`${card} space-y-4 text-center`}>
      <div className="flex justify-center">
        <Timer ms={remaining} total={VOTE_SECONDS} paused={paused} size={100} />
      </div>
      <h2 className="text-2xl font-black">How good was {team?.name ?? "their"}&apos;s explanation?</h2>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            onClick={async () => {
              setScore(i);
              const r = await castVote(pid, i);
              setErr(r.error ?? "");
            }}
            className={`${btn} text-2xl ${score === i ? "bg-amber-400 text-black" : "bg-white/10"}`}
          >
            {i}
          </button>
        ))}
      </div>
      {err ? <p className="text-red-300">{err}</p> : voted && <p className="text-emerald-300">Your team voted ✓ (tap again to change)</p>}
    </section>
  );
}

function PhoneReveal({ q, results, teamId }: { q: Question; results: Results | null; teamId: string }) {
  const r = results?.reveal;
  if (!r) return <Info title="Revealing…" text="" />;
  const row = r.rows.find((x) => x.teamId === teamId);
  return (
    <section className={`${card} space-y-3`}>
      <div className="text-sm font-bold tracking-widest text-violet-300 uppercase">
        {q.code} · {q.title}
      </div>
      <h2 className="text-2xl font-black text-emerald-300">✓ {r.answer}</h2>
      <p className="text-white/80">{r.insight}</p>
      {row && (
        <div className="rounded-2xl bg-white/10 p-4 text-lg">
          Your team: {row.correct ? "✅ correct (+2)" : "❌ not correct"} · avg vote {row.votes ? row.voteAvg.toFixed(2) : "—"} ·{" "}
          <b>{row.points.toFixed(2)} pts</b>
        </div>
      )}
    </section>
  );
}
