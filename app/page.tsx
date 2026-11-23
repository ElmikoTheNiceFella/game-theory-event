"use client";

import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { castVote, getMySubmission, joinEvent, myId, playMove, setTeam, submitAnswer, type Results } from "./actions";
import { useGame, useRemaining, useResults } from "@/lib/useGame";
import { QUESTIONS, questionById, RULES, type Question } from "@/lib/questions";
import { ANSWER_SECONDS, MATCH_SECONDS, PD_ROUNDS, PRESENT_SECONDS, VOTE_SECONDS, type Game, type Match, type Participant, type Team } from "@/lib/types";
import { C, LETTERS, TOKENS, fmt1, tokenFor } from "@/lib/theme";
import { MOVE, MathCard, MoveCells, PAYOFF, PayoffMatrix, PhoneLeaderboard, PlotTwist, matchSide } from "@/components/Panels";
import { Btn, Glyph, I, MiniRing, Ring, TeamPill, Token, clock } from "@/components/ui";

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
  "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16));

// Per-device SECRET token (cached so it stays stable even if storage is blocked).
// Never compare it to participant ids: the public id is its server-side hash (see myId).
let cachedPid: string | null = null;
const getPid = () => {
  if (!cachedPid) {
    cachedPid = store.get("gte_pid") ?? uuid();
    store.set("gte_pid", cachedPid);
  }
  return cachedPid;
};
const noSubscribe = () => () => {};

export default function ParticipantPage() {
  const { game, teams, participants, matches } = useGame();
  const pid = useSyncExternalStore(noSubscribe, getPid, () => null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (pid) myId(pid).then(setPublicId);
  }, [pid]);

  const me = participants.find((p) => p.id === publicId);
  const myIndex = teams.findIndex((t) => t.id === me?.team_id);
  const myTeam = teams[myIndex] ?? null;

  if (!game || !pid || !publicId) return <Shell>{null}</Shell>;
  if (!me) return <Join pid={pid} />;

  const locked = game.stage === "presenting" || game.stage === "voting" || game.stage === "matches";
  const pickTeam = async (teamId: string | null) => {
    const r = await setTeam(pid, teamId);
    if (r.error) setErr(r.error);
    else {
      setErr("");
      setPicking(false);
    }
  };
  const showPicker = !myTeam || picking;

  return (
    <Shell>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 64, boxSizing: "border-box", padding: "10px 10px 10px 20px", borderBottom: `2px solid ${C.ink}` }}>
        <span style={{ fontSize: 18, fontWeight: 800, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Hi {me.name}</span>
        {myTeam ? (
          <span style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
            <TeamPill team={myTeam} index={myIndex} />
            <button
              type="button"
              onClick={() => (locked && !picking ? setErr(game.stage === "matches" ? "Wait until the matches are over to switch teams." : "Wait until the presentation is over to switch teams.") : setPicking(!picking))}
              title={locked ? "Switching is paused right now" : undefined}
              style={{ minHeight: 44, display: "flex", alignItems: "center", padding: "0 10px", border: 0, background: "transparent", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: locked && !picking ? C.faint : C.cobalt, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}
            >
              {picking ? "Cancel" : "Switch"}
            </button>
          </span>
        ) : (
          <span style={{ fontSize: 15, fontWeight: 700, color: C.muted }}>No team yet</span>
        )}
      </header>
      {err && !showPicker && (
        <p role="alert" className="gte-in" style={{ margin: "14px 20px 0", display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", border: `2.5px solid ${C.vermDark}`, borderRadius: 14, background: "#FCE3DC", color: "#7A1F0E", fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>
          <I.alert size={20} style={{ flex: "none", marginTop: 1 }} />
          {err}
        </p>
      )}
      <div key={showPicker ? "picker" : `${game.stage}-${game.question_id}-${game.presenting_team_id}`} className="gte-stagein" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {showPicker ? (
          <TeamPicker teams={teams} participants={participants} current={myTeam?.id ?? null} onPick={pickTeam} error={err} />
        ) : (
          <StageView game={game} teams={teams} participants={participants} matches={matches} pid={pid} me={me} myTeam={myTeam} myIndex={myIndex} />
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="paper-sm" style={{ minHeight: "100dvh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

const h1 = (size: number): CSSProperties => ({ margin: 0, fontSize: size, lineHeight: 0.95, fontWeight: 800, letterSpacing: "-0.045em" });
const centered: CSSProperties = { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: "24px 24px 48px", textAlign: "center" };

/* ---------------- join ---------------- */

const SPOTS = [
  [24, 44, 64, -8],
  [104, 24, 52, 6],
  [170, 58, 72, -4],
  [262, 30, 56, 10],
  [318, 96, 50, -12],
  [36, 136, 54, 12],
  [110, 112, 60, -6],
  [196, 150, 50, 8],
  [258, 128, 66, -10],
  [330, 172, 44, 4],
];

function Join({ pid }: { pid: string }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Shell>
      <div aria-hidden="true" style={{ position: "relative", height: 236, flex: "none" }}>
        {SPOTS.map(([x, y, s, r], i) => (
          <span key={i} className="gte-bob" style={{ position: "absolute", left: `${(x / 390) * 100}%`, top: y, animationDelay: `${(i * 0.27).toFixed(2)}s` }}>
            <span className="gte-pop" style={{ display: "block", animationDelay: `${i * 0.05}s` }}>
              <span style={{ width: s, height: s, display: "grid", placeItems: "center", boxSizing: "border-box", borderRadius: 14, border: `2.5px solid ${C.ink}`, background: TOKENS[i].color, boxShadow: `3px 3px 0 ${C.ink}`, transform: `rotate(${r}deg)` }}>
                <Glyph d={TOKENS[i].d} size={Math.round(s * 0.52)} />
              </span>
            </span>
          </span>
        ))}
      </div>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 30, padding: "8px 24px 32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="label" style={{ fontSize: 13, color: C.muted }}>
            Round 2 · Case challenges
          </span>
          <h1 className="gte-drop" style={{ margin: 0, fontSize: 60, lineHeight: 0.86, fontWeight: 800, letterSpacing: "-0.05em", textShadow: `4px 3px 0 ${C.verm}` }}>
            Game Theory Event
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 18, lineHeight: 1.35, color: C.ink2 }}>Enter your name, then pick your team.</p>
        </div>
        <form
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            const r = await joinEvent(pid, name).catch(() => ({ error: "Couldn't join. Check your connection and try again." }));
            setBusy(false);
            if (r.error) setErr(r.error);
          }}
        >
          <label htmlFor="name" className="label" style={{ fontSize: 13 }}>
            Your name
          </label>
          <input
            id="name"
            autoFocus
            maxLength={24}
            autoComplete="nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Noor"
            style={{ height: 60, boxSizing: "border-box", padding: "0 18px", border: `2.5px solid ${C.ink}`, borderRadius: 14, background: "#fff", color: C.ink, fontFamily: "inherit", fontSize: 22, fontWeight: 600 }}
          />
          <span style={{ fontSize: 14, color: C.muted }}>Up to 24 characters. Teammates will see it.</span>
          <button type="submit" disabled={!name.trim() || busy} aria-busy={busy || undefined} className="btn btn-primary" style={{ marginTop: 14, height: 60, borderRadius: 14, fontSize: 21 }}>
            {busy && <span className="gte-spinner" aria-hidden="true" />}
            Join
            <I.arrow size={20} />
          </button>
          {err && (
            <p role="alert" style={{ margin: 0, color: C.vermDark, fontWeight: 700 }}>
              {err}
            </p>
          )}
        </form>
      </main>
    </Shell>
  );
}

/* ---------------- team picker ---------------- */

function TeamPicker({ teams, participants, current, onPick, error }: { teams: Team[]; participants: Participant[]; current: string | null; onPick: (id: string | null) => Promise<void>; error: string }) {
  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, padding: "22px 20px 24px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 style={h1(38)}>Pick your team</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.35, color: C.ink2 }}>You can switch later, except during presentations and votes.</p>
      </div>
      {error && (
        <p role="alert" className="gte-in" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", border: `2.5px solid ${C.vermDark}`, borderRadius: 14, background: "#FCE3DC", color: "#7A1F0E", fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>
          <I.alert size={20} style={{ flex: "none", marginTop: 1 }} />
          {error}
        </p>
      )}
      {teams.length ? (
        <>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
            {teams.map((t, i) => {
              const mine = t.id === current;
              const n = participants.filter((p) => p.team_id === t.id).length;
              return (
                <li key={t.id} className="gte-rowin" style={{ animationDelay: `${i * 0.05}s` }}>
                  <Btn
                    onClick={() => onPick(t.id)}
                    aria-pressed={mine}
                    className="token-hover lift"
                    style={{ width: "100%", minHeight: 60, boxSizing: "border-box", padding: "8px 14px 8px 8px", display: "flex", alignItems: "center", gap: 12, textAlign: "left", border: `2.5px solid ${C.ink}`, borderRadius: 16, background: tokenFor(t, i).color, color: C.ink, boxShadow: mine ? `0 0 0 3px ${C.paper}, 0 0 0 6px ${C.ink}` : `3px 3px 0 ${C.ink}`, fontFamily: "inherit", cursor: "pointer" }}
                  >
                    <Token team={t} index={i} size={42} radius={12} inverted />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 18, lineHeight: 1.1, fontWeight: 800 }}>{t.name}</span>
                    {mine && (
                      <span className="mono" style={{ flex: "none", padding: "3px 8px", borderRadius: 999, background: C.ink, color: C.paper, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>
                        YOURS
                      </span>
                    )}
                    <span className="mono" style={{ flex: "none", fontSize: 13, fontWeight: 800 }}>
                      {n === 0 ? "empty" : n === 1 ? "1 player" : `${n} players`}
                    </span>
                  </Btn>
                </li>
              );
            })}
          </ul>
          {current && (
            <Btn onClick={() => onPick(null)} style={{ alignSelf: "center", minHeight: 44, padding: "0 16px", display: "flex", alignItems: "center", gap: 8, border: 0, background: "transparent", color: C.cobalt, fontFamily: "inherit", fontSize: 16, fontWeight: 800, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
              Leave my team
            </Btn>
          )}
        </>
      ) : (
        <div style={{ marginTop: 20, padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", border: `2.5px dashed ${C.faint}`, borderRadius: 20 }}>
          <span aria-hidden="true" style={{ display: "flex", gap: 8 }}>
            <span className="gte-d1" style={{ width: 16, height: 16, borderRadius: 999, background: C.ink }} />
            <span className="gte-d2" style={{ width: 16, height: 16, background: C.ink }} />
            <span className="gte-d3" style={{ width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderBottom: `16px solid ${C.ink}` }} />
          </span>
          <span style={{ fontSize: 24, fontWeight: 800 }}>Waiting for organizer…</span>
          <span style={{ fontSize: 16, color: C.ink2 }}>Teams will appear here as soon as they&apos;re added.</span>
        </div>
      )}
    </main>
  );
}

/* ---------------- stages ---------------- */

function StageView({ game, teams, participants, matches, pid, me, myTeam, myIndex }: { game: Game; teams: Team[]; participants: Participant[]; matches: Match[]; pid: string; me: Participant; myTeam: Team; myIndex: number }) {
  const q = questionById(game.question_id);
  const remaining = useRemaining(game);
  const results = useResults(game);
  const paused = game.paused_remaining_ms !== null;
  const pIndex = teams.findIndex((t) => t.id === game.presenting_team_id);
  const presenting = teams[pIndex];
  const mine = game.presenting_team_id === myTeam.id;

  switch (game.stage) {
    case "lobby": {
      const mates = participants.filter((p) => p.team_id === myTeam.id);
      return (
        <main style={centered}>
          <span className="gte-float" style={{ display: "block" }}>
            <Token team={myTeam} index={myIndex} size={132} radius={34} border={3.5} shadow={`7px 7px 0 ${C.ink}`} glyph={0.53} />
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h1 style={h1(52)}>You&apos;re in!</h1>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.35, color: C.ink2 }}>Waiting for the organizer to start…</p>
          </div>
          <div style={{ width: "100%", boxSizing: "border-box", padding: 16, display: "flex", flexDirection: "column", gap: 12, background: C.paper2, border: `2px solid ${C.ink}`, borderRadius: 18, textAlign: "left" }}>
            <span className="label" style={{ fontSize: 12, color: C.muted }}>
              {myTeam.name} · {mates.length} player{mates.length === 1 ? "" : "s"}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {mates.map((m) => (
                <span key={m.id} className="gte-pop" style={{ padding: "6px 12px", borderRadius: 999, fontSize: 15, fontWeight: 800, ...(m.id === me.id ? { background: C.ink, color: C.paper } : { border: `2px solid ${C.ink}` }) }}>
                  {m.name}
                  {m.id === me.id ? " (you)" : ""}
                </span>
              ))}
            </div>
          </div>
        </main>
      );
    }
    case "rules":
      return (
        <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, padding: "24px 20px 28px" }}>
          <h1 style={h1(40)}>How it works</h1>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {RULES.map((r, i) => {
              const dark = i === 4;
              return (
                <li key={r} className="gte-rowin" style={{ display: "flex", gap: 12, padding: "12px 14px", background: dark ? C.ink : C.paper2, color: dark ? C.paper : C.ink, border: `2px solid ${C.ink}`, borderRadius: 14, animationDelay: `${i * 0.06}s` }}>
                  <span className="mono" style={{ width: 28, height: 28, flex: "none", display: "grid", placeItems: "center", borderRadius: 8, background: dark ? C.mari : C.ink, color: dark ? C.ink : C.paper, fontSize: 15, fontWeight: 800 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 15, lineHeight: 1.38, fontWeight: 500 }}>{r}</span>
                </li>
              );
            })}
          </ol>
        </main>
      );
    case "select":
      return (
        <main style={centered}>
          <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, width: 260 }}>
            {QUESTIONS.map((x, i) => {
              const played = game.finished_question_ids.includes(x.id);
              return (
                <span key={x.id} className="mono gte-pop" style={{ height: 58, display: "grid", placeItems: "center", borderRadius: 12, border: played ? `2px dashed ${C.faint}` : `2px solid ${C.ink}`, background: x.last ? C.ink : played ? C.played : C.paper2, color: x.last ? C.paper : played ? C.muted : C.ink, fontSize: 18, fontWeight: 800, boxShadow: played ? "none" : `3px 3px 0 ${C.ink}`, animationDelay: `${i * 0.05}s` }}>
                  {x.code}
                </span>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h1 style={h1(48)}>
              Get ready<span className="gte-d1">.</span>
              <span className="gte-d2">.</span>
              <span className="gte-d3">.</span>
            </h1>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.35, color: C.ink2 }}>The next question is coming up.</p>
          </div>
        </main>
      );
    case "dialogue":
      return (
        <main style={centered}>
          <div aria-hidden="true" style={{ position: "relative", width: 236, height: 168 }}>
            <span style={{ position: "absolute", inset: "0 0 22px 0", border: `3.5px solid ${C.ink}`, borderRadius: 16, background: C.cobalt, boxShadow: `6px 6px 0 ${C.ink}` }} />
            <span style={{ position: "absolute", left: 96, bottom: 0, width: 44, height: 26, background: C.ink, clipPath: "polygon(20% 0, 80% 0, 100% 100%, 0 100%)" }} />
            <span style={{ position: "absolute", left: "50%", top: 18, width: 128, height: 82, marginLeft: -64, display: "grid", placeItems: "center", borderRadius: "999px / 999px", background: C.paper, border: `3.5px solid ${C.ink}` }}>
              <span className="gte-look" style={{ width: 40, height: 40, borderRadius: 999, background: C.ink, display: "grid", placeItems: "center" }}>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: C.paper, margin: "-10px -10px 0 0" }} />
              </span>
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <h1 style={h1(48)}>Watch the screen</h1>
            {q && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 16px 6px 6px", borderRadius: 999, background: C.ink, color: C.paper, fontSize: 17, fontWeight: 800 }}>
                <span className="mono" style={{ padding: "3px 10px", borderRadius: 999, background: C.mari, color: C.ink, fontSize: 15, fontWeight: 800 }}>
                  {q.code}
                </span>
                {q.title}
              </span>
            )}
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.35, color: C.ink2 }}>The story plays on the projector. {q?.kind === "pd" ? "Your match starts" : "Answering opens"} on your phone right after.</p>
          </div>
        </main>
      );
    case "answering":
      return q ? (
        <>
          <TimerStrip ms={remaining} paused={paused} total={ANSWER_SECONDS} />
          <AnswerForm key={q.id} q={q} pid={pid} submitted={game.submitted_team_ids.includes(myTeam.id)} />
        </>
      ) : null;
    case "matches":
      return (
        <>
          <TimerStrip ms={remaining} paused={paused} total={MATCH_SECONDS} />
          <MatchPlay pid={pid} match={matches.find((m) => m.a === myTeam.id || m.b === myTeam.id)} teams={teams} myTeam={myTeam} myIndex={myIndex} />
        </>
      );
    case "presenting":
      return mine ? (
        <main style={{ ...centered, backgroundColor: tokenFor(myTeam, myIndex).color, backgroundImage: "radial-gradient(rgba(23,22,28,.12) 1px, transparent 1.4px)", backgroundSize: "14px 14px" }}>
          <span className="label" style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 46, padding: "0 20px 0 14px", borderRadius: 999, background: C.ink, color: C.paper, fontSize: 15 }}>
            <span className="gte-wob" style={{ display: "flex" }}>
              <I.mic size={22} />
            </span>
            Your team is up!
          </span>
          <h1 className="gte-drop" style={{ margin: 0, fontSize: 58, lineHeight: 0.9, fontWeight: 800, letterSpacing: "-0.05em" }}>
            Stand up and explain
          </h1>
          <Ring ms={remaining} total={PRESENT_SECONDS} size={252} paused={paused} fontSize={96} onColor states={false} />
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.4, fontWeight: 600, maxWidth: 300 }}>Explain your answer to the room. Other teams vote right after.</p>
        </main>
      ) : (
        <main style={{ ...centered, gap: 26 }}>
          {presenting && (
            <span className="gte-pop" style={{ display: "block" }}>
              <Token team={presenting} index={pIndex} size={116} radius={30} border={3.5} shadow={`6px 6px 0 ${C.ink}`} glyph={0.53} />
            </span>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 style={{ ...h1(34), lineHeight: 1, textWrap: "balance" }}>{presenting?.name ?? "A team"}</h1>
            <span style={{ fontSize: 20, fontWeight: 600, color: C.ink2 }}>is presenting</span>
          </div>
          {remaining !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px 12px 12px", border: `2px solid ${C.ink}`, borderRadius: 999, background: C.paper2 }}>
              <MiniRing ms={remaining} total={PRESENT_SECONDS} size={56} />
              <span className="mono" style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.05em" }}>
                {Math.ceil(remaining / 1000)}
                <span style={{ fontSize: 16, letterSpacing: "0.06em" }}> s</span>
              </span>
            </div>
          )}
          <div style={{ width: "100%", boxSizing: "border-box", padding: 16, display: "flex", flexDirection: "column", gap: 12, border: `2px dashed ${C.faint}`, borderRadius: 18 }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>You&apos;ll vote next</span>
            <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(11, minmax(0, 1fr))", border: `2px solid ${C.ink}`, borderRadius: 8, overflow: "hidden", background: C.paper2 }}>
              {Array.from({ length: 11 }, (_, v) => (
                <span key={v} className="mono" style={{ height: 30, display: "grid", placeItems: "center", borderLeft: v ? `1.5px solid ${C.ink}` : 0, fontSize: 12, fontWeight: 800 }}>
                  {v}
                </span>
              ))}
            </div>
            <span style={{ fontSize: 14, color: C.muted }}>How convincing was their explanation, from 0 to 10?</span>
          </div>
        </main>
      );
    case "voting":
      return mine ? (
        <main style={centered}>
          <div aria-hidden="true" style={{ position: "relative", width: 200, height: 150 }}>
            <span style={{ position: "absolute", left: "50%", top: 32, marginLeft: -54 }}>
              <Token team={myTeam} index={myIndex} size={108} radius={28} border={3.5} shadow={`6px 6px 0 ${C.ink}`} glyph={0.52} />
            </span>
            {[
              [10, 16, 0],
              [83, 0, 0.2],
              [156, 16, 0.4],
            ].map(([x, y, d]) => (
              <span key={x} className="gte-wait mono" style={{ position: "absolute", left: x, top: y, width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 10, border: `2px solid ${C.ink}`, background: C.paper2, fontSize: 15, fontWeight: 800, animationDelay: `${d}s` }}>
                ?
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h1 style={{ ...h1(40), lineHeight: 0.98 }}>Other teams are voting on you…</h1>
            <Taunt />
          </div>
          <span style={{ fontSize: 15, color: C.muted }}>Your average shows up at the reveal.</span>
        </main>
      ) : (
        <VoteForm key={game.presenting_team_id} pid={pid} team={presenting} teamIndex={pIndex} voted={game.voted_team_ids.includes(myTeam.id)} remaining={remaining} />
      );
    case "reveal":
      return q ? <PhoneReveal q={q} results={results} team={myTeam} teamIndex={myIndex} teams={teams} showMath={game.show_extra} /> : null;
    case "leaderboard":
    case "final":
      return results ? <PhoneLeaderboard standings={results.standings} final={game.stage === "final"} mine={myTeam.id} playedCount={game.finished_question_ids.length} /> : null;
    case "finale":
      return (
        <main className="inkboard" style={{ ...centered, color: C.paper }}>
          <div aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            {[
              [2, 70, 44, C.faint],
              [1, 100, 52, C.mari],
              [3, 48, 44, C.faint],
            ].map(([n, h, s, c]) => (
              <span key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <span className="mono gte-wait" style={{ width: s, height: s, display: "grid", placeItems: "center", borderRadius: 12, border: `2.5px dashed ${c}`, color: n === 1 ? C.mari : "#BFB8AA", fontSize: 20, fontWeight: 800, animationDelay: `${Number(n) * 0.15}s` }}>
                  ?
                </span>
                <span style={{ width: 76, height: h, borderRadius: "10px 10px 0 0", background: C.paper, color: C.ink, display: "grid", placeItems: "center", fontSize: 36, fontWeight: 800 }}>{n}</span>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1 className="serif gte-drum" style={{ margin: 0, fontSize: 52, lineHeight: 1, color: C.mari }}>
              Eyes on the screen!
            </h1>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.35, color: "#DCD5C8" }}>The top 3 are about to be revealed…</p>
          </div>
        </main>
      );
  }
}

const TAUNTS = ["Hope you have no beef with the audience.", "They're gonna cook you.", "Wrap it up."];

/** Picked once per mount so it doesn't change on every re-render. */
function Taunt() {
  const [line] = useState(() => TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);
  return (
    <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.2, color: C.ink2 }}>
      {line}
    </p>
  );
}

/** Answer timer strip: paper → marigold under half → vermilion in the last fifth. */
function TimerStrip({ ms, paused, total }: { ms: number | null; paused: boolean; total: number }) {
  if (ms === null) return null;
  const f = ms / (total * 1000);
  const hurry = !paused && f <= 0.5;
  const last = !paused && f <= 0.2;
  const bg = last ? C.verm : hurry ? C.mari : C.paper2;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: bg, borderBottom: `2px solid ${C.ink}`, transition: "background 400ms ease" }}>
      <MiniRing ms={Math.min(ms, total * 1000)} total={total} track={hurry ? "rgba(23,22,28,0.2)" : C.line} />
      <span style={{ display: "flex", flexDirection: "column" }}>
        <span className={`mono ${last ? "gte-pulse" : ""}`} style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
          {clock(ms)}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: hurry ? C.ink : C.muted }}>{paused ? "paused" : ms < 60000 ? "seconds left" : total === MATCH_SECONDS ? "left to play" : "left to answer"}</span>
      </span>
      <span className="label" style={{ marginLeft: "auto", fontSize: 12, letterSpacing: "0.12em", textAlign: "right", color: hurry ? C.ink : C.muted, lineHeight: 1.4 }}>
        {paused ? (
          "Timer paused"
        ) : last ? (
          <>
            {total === MATCH_SECONDS ? "Time's" : "Submit"}
            <br />
            {total === MATCH_SECONDS ? "almost up" : "soon"}
          </>
        ) : hurry ? (
          <>
            Under half
            <br />
            the time left
          </>
        ) : total === MATCH_SECONDS ? (
          <>
            {PD_ROUNDS} rounds
            <br />
            per match
          </>
        ) : (
          <>
            One answer
            <br />
            per team
          </>
        )}
      </span>
    </div>
  );
}

function SubmittedNote({ children }: { children: ReactNode }) {
  return (
    <p className="gte-in" role="status" style={{ margin: 0, display: "flex", gap: 10, padding: "12px 14px", borderRadius: 14, background: C.cobalt, color: C.paper, fontSize: 15, lineHeight: 1.4 }}>
      <I.check size={20} style={{ flex: "none", marginTop: 1 }} />
      <span>{children}</span>
    </p>
  );
}

function AnswerForm({ q, pid, submitted }: { q: Question; pid: string; submitted: boolean }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [num, setNum] = useState<number>(33);
  const [explanation, setExplanation] = useState("");
  const [locked, setLocked] = useState(false);
  const [table, setTable] = useState<Results["table"]>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Load the team's saved answer on mount, and again when a teammate submits (unless we're mid-edit).
  useEffect(() => {
    if (dirty) return;
    getMySubmission(pid).then(({ submission, table }) => {
      setTable(table);
      if (!submission) return;
      setChoice(submission.choice);
      if (submission.number !== null) setNum(submission.number);
      setExplanation(submission.explanation);
      setLocked(submission.locked);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, submitted]);

  const send = async (lockOnly = false) => {
    if (busy) return;
    if (!lockOnly && !explanation.trim()) return setErr("Add an explanation before submitting.");
    setBusy(true);
    const r = await submitAnswer(pid, { choice, number: q.kind === "number" ? num : null, explanation: lockOnly ? "" : explanation }).catch(() => ({ error: "Couldn't send. Check your connection and try again." }));
    setBusy(false);
    if (r.error) return setErr(r.error);
    setErr("");
    setDirty(false);
    setMsg(lockOnly ? "locked" : "sent");
    const s = await getMySubmission(pid);
    setTable(s.table);
    setLocked(!!s.submission?.locked);
    if (s.submission) setChoice(s.submission.choice); // a teammate may have locked a different pick first
  };

  const needsLock = q.lockChoice && !locked;
  const isSubmitted = submitted || msg === "sent";
  const stepIdx = locked ? 2 : choice === null ? 0 : 1;
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const edit = () => (setDirty(true), setErr(""));

  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, padding: 20 }}>
      <article style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, background: C.paper2, border: `2px solid ${C.ink}`, borderRadius: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="mono" style={{ padding: "2px 8px", borderRadius: 7, background: C.ink, color: C.paper, fontSize: 14, fontWeight: 800 }}>
            {q.code}
          </span>
          <span className="label" style={{ fontSize: 11, letterSpacing: "0.12em", color: C.muted }}>
            {q.topic}
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.035em" }}>{q.title}</h1>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 16, lineHeight: 1.4, color: C.ink2 }}>
          {q.summary.map((s) => (
            <li key={s} style={{ display: "flex", gap: 10 }}>
              <span style={{ width: 7, height: 7, flex: "none", marginTop: 8, background: C.ink }} />
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <p style={{ margin: "2px 0 0", fontSize: 20, lineHeight: 1.45, fontWeight: 800 }}>
          <mark className="hl">{q.prompt}</mark>
        </p>
      </article>

      {q.lockChoice && (
        <ol aria-label="Steps" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
          {["1 Pick", "2 Lock", "3 Explain"].map((label, i) => (
            <li key={label} aria-current={i === stepIdx ? "step" : undefined} className="label" style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: `2px solid ${i <= stepIdx ? C.ink : "#B9B1A3"}`, background: i === stepIdx ? C.ink : i < stepIdx ? C.played : "transparent", color: i === stepIdx ? C.paper : i < stepIdx ? C.ink2 : C.muted, fontSize: 12, letterSpacing: "0.1em", transition: "background 200ms ease" }}>
              {label}
            </li>
          ))}
        </ol>
      )}

      {q.kind === "number" ? (
        <section className="card" style={{ padding: "18px 16px 16px", display: "flex", flexDirection: "column", gap: 14, boxShadow: `4px 4px 0 ${C.ink}` }}>
          <label htmlFor="num" className="label" style={{ fontSize: 12 }}>
            Your team&apos;s number
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" aria-label="Decrease by one" onClick={() => (setNum(clamp(num - 1)), edit())} className="btn" style={{ width: 64, height: 64, flex: "none", borderRadius: 16, background: C.paper, boxShadow: `3px 3px 0 ${C.ink}` }}>
              <I.minus size={26} />
            </button>
            <input
              id="num"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={num}
              onChange={(e) => (setNum(clamp(parseInt(e.target.value || "0", 10))), edit())}
              className="mono"
              style={{ flex: 1, minWidth: 0, height: 104, boxSizing: "border-box", padding: 0, border: `3px solid ${C.ink}`, borderRadius: 18, background: "#fff", color: C.ink, textAlign: "center", fontSize: 72, fontWeight: 800, letterSpacing: "-0.05em" }}
            />
            <button type="button" aria-label="Increase by one" onClick={() => (setNum(clamp(num + 1)), edit())} className="btn" style={{ width: 64, height: 64, flex: "none", borderRadius: 16, background: C.paper, boxShadow: `3px 3px 0 ${C.ink}` }}>
              <I.plus size={26} />
            </button>
          </div>
          <input type="range" min={0} max={100} step={1} value={num} onChange={(e) => (setNum(clamp(+e.target.value)), edit())} aria-label="Your team's number, 0 to 100" style={{ accentColor: C.ink, width: "100%", height: 28 }} />
          <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: C.muted }}>
            <span>0</span>
            <span>Whole number, 0 to 100</span>
            <span>100</span>
          </div>
        </section>
      ) : (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="pick" className="label" style={{ margin: 0, fontSize: 12 }}>
            {q.lockChoice && locked ? "Your locked pick" : "Your team's answer"}
          </h2>
          <div role="radiogroup" aria-labelledby="pick" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.choices.map((c, i) => {
              const on = choice === i;
              const frozen = !!q.lockChoice && locked;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={frozen}
                  onClick={() => (setChoice(i), edit())}
                  className={on ? "gte-press" : ""}
                  style={{
                    minHeight: 64,
                    boxSizing: "border-box",
                    padding: "10px 14px 10px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "left",
                    border: frozen && !on ? `2px dashed ${C.faint}` : `2px solid ${C.ink}`,
                    borderRadius: 16,
                    background: on ? C.ink : C.paper2,
                    color: on ? C.paper : C.ink,
                    boxShadow: on ? `0 0 0 3px ${C.paper}, 0 0 0 5px ${C.ink}` : frozen ? "none" : `3px 3px 0 ${C.ink}`,
                    opacity: frozen && !on ? 0.55 : 1,
                    fontFamily: "inherit",
                    cursor: frozen ? "default" : "pointer",
                    transition: "background 160ms ease, box-shadow 160ms ease",
                  }}
                >
                  <span className="mono" style={{ width: 36, height: 36, flex: "none", display: "grid", placeItems: "center", borderRadius: 10, background: on ? C.mari : C.ink, color: on ? C.ink : C.paper, fontSize: 17, fontWeight: 800 }}>
                    {LETTERS[i]}
                  </span>
                  <span style={{ flex: 1, fontSize: 17, lineHeight: 1.3, fontWeight: 600 }}>{c}</span>
                  {frozen && on && (
                    <span className="gte-shut" role="img" aria-label="locked" style={{ display: "flex", color: C.mari }}>
                      <I.lock size={22} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {needsLock ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button type="button" disabled={choice === null || busy} aria-busy={busy || undefined} onClick={() => send(true)} className="btn btn-dark shadow-verm" style={{ height: 60, fontSize: 20 }}>
            {busy ? <span className="gte-spinner" aria-hidden="true" /> : <I.lock size={22} />}
            Lock in our pick
          </button>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, textAlign: "center", color: C.muted }}>Once locked, your team can&apos;t change it. Then you&apos;ll see why it matters.</p>
        </div>
      ) : (
        <>
          {table && <PlotTwist table={table} />}
          <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="why" className="label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
              <span>Why? Your explanation</span>
              <span style={{ color: C.muted }}>Required</span>
            </label>
            <textarea
              id="why"
              value={explanation}
              onChange={(e) => (setExplanation(e.target.value), edit())}
              rows={6}
              maxLength={2000}
              placeholder={q.kind === "number" ? "How many steps ahead did your team think?" : table ? "What does the breakdown change, and why?" : "Explain your team's reasoning. You may be picked to present it."}
              style={{ minHeight: 170, boxSizing: "border-box", padding: "14px 16px", border: `2.5px solid ${err ? C.vermDark : C.ink}`, borderRadius: 16, background: "#fff", color: C.ink, fontFamily: "inherit", fontSize: 17, lineHeight: 1.45, resize: "vertical" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
              {err && (
                <span role="alert" style={{ fontWeight: 700, color: C.vermDark }}>
                  {err}
                </span>
              )}
              <span className="mono" style={{ marginLeft: "auto", fontWeight: 700, color: C.muted }}>
                {explanation.length} / 2000
              </span>
            </div>
          </section>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button type="button" disabled={busy || (q.kind === "mcq" && choice === null)} aria-busy={busy || undefined} onClick={() => send()} className={`btn ${isSubmitted ? "btn-paper" : "btn-primary"}`} style={{ height: 60, fontSize: 20 }}>
              {busy && <span className="gte-spinner" aria-hidden="true" />}
              {busy ? "Sending…" : isSubmitted ? "Update answer" : "Submit answer"}
            </button>
            {isSubmitted ? (
              <SubmittedNote>
                <strong>{q.kind === "number" ? `Submitted: ${num}.` : "Submitted."}</strong> Teammates can still edit until time&apos;s up.
              </SubmittedNote>
            ) : (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, textAlign: "center", color: C.muted }}>Any teammate can submit. The latest submission counts.</p>
            )}
          </div>
        </>
      )}
    </main>
  );
}

function VoteForm({ pid, team, teamIndex, voted, remaining }: { pid: string; team?: Team; teamIndex: number; voted: boolean; remaining: number | null }) {
  const [score, setScore] = useState<number | null>(null);
  const [err, setErr] = useState("");
  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, padding: "18px 20px 24px" }}>
      {remaining !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MiniRing ms={remaining} total={VOTE_SECONDS} size={44} width={16} />
          <span className="mono" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.04em" }}>
            {Math.ceil(remaining / 1000)}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.ink2 }}>seconds left to vote</span>
        </div>
      )}
      {team && (
        <div className="gte-pop" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px 14px 12px", background: tokenFor(team, teamIndex).color, border: `2.5px solid ${C.ink}`, borderRadius: 18, boxShadow: `4px 4px 0 ${C.ink}` }}>
          <Token team={team} index={teamIndex} size={52} radius={14} inverted />
          <span style={{ fontSize: 23, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-0.03em" }}>{team.name}</span>
        </div>
      )}
      <h1 id="q" style={{ margin: 0, fontSize: 26, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.03em" }}>
        How good was their explanation?
      </h1>
      <div role="radiogroup" aria-labelledby="q" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
        {Array.from({ length: 11 }, (_, v) => {
          const on = score === v;
          return (
            <Btn
              key={v}
              role="radio"
              aria-checked={on}
              onClick={async () => {
                setScore(v);
                const r = await castVote(pid, v).catch(() => ({ error: "Couldn't send your vote. Try again." }));
                setErr(r.error ?? "");
              }}
              className={`mono ${on ? "gte-press" : "lift"}`}
              style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: `2.5px solid ${C.ink}`, borderRadius: 16, background: on ? C.ink : C.paper2, color: on ? C.mari : C.ink, boxShadow: on ? `0 0 0 3px ${C.paper}, 0 0 0 5px ${C.ink}` : `3px 3px 0 ${C.ink}`, fontSize: 30, fontWeight: 800, cursor: "pointer" }}
            >
              {v}
            </Btn>
          );
        })}
      </div>
      {err ? (
        <p role="alert" style={{ margin: 0, color: C.vermDark, fontWeight: 700 }}>
          {err}
        </p>
      ) : voted || score !== null ? (
        <SubmittedNote>
          <strong>Your team voted{score !== null ? ` ${score}` : ""}.</strong> Tap another number to change it.
        </SubmittedNote>
      ) : (
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4, color: C.ink2 }}>One vote per team. Any teammate can vote; the latest vote counts.</p>
      )}
      <p style={{ margin: "auto 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 600, color: C.muted }}>
        <I.lock size={16} />
        Votes stay private. Only averages are shown.
      </p>
    </main>
  );
}

const did = (c: number) => (c ? "defected" : "cooperated");

/** 2B on the phone: your match, the payoff table, and two big buttons. */
function MatchPlay({ pid, match, teams, myTeam, myIndex }: { pid: string; match?: Match; teams: Team[]; myTeam: Team; myIndex: number }) {
  const [picked, setPicked] = useState<{ round: number; choice: number } | null>(null);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  if (!match)
    return (
      <main style={centered}>
        <h1 style={{ ...h1(36), lineHeight: 1 }}>Your team isn&apos;t in a match this time</h1>
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.4, color: C.ink2 }}>Teams were paired when the matches started. Watch the live scores on the screen!</p>
      </main>
    );
  const side = matchSide(match, myTeam.id);
  const oi = teams.findIndex((t) => t.id === side.opp);
  const opp = teams[oi];
  const oppName = opp?.name ?? "the other team";
  const over = match.round > PD_ROUNDS;
  const mineNow = picked?.round === match.round ? picked.choice : null;
  const last = side.mine.length - 1;
  const play = async (c: number) => {
    setPicked({ round: match.round, choice: c });
    setSending(true); // one move in flight at a time, so taps can't arrive out of order
    const r = await playMove(pid, match.round, c).catch(() => ({ error: "Couldn't send. Check your connection and tap again." }));
    setSending(false);
    setErr(r.error ?? "");
    if (r.error) setPicked(null);
  };
  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, padding: "18px 20px 24px" }}>
      <section className="card" style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 12, boxShadow: `4px 4px 0 ${C.ink}` }}>
        <span className="label" style={{ fontSize: 12, color: over ? C.ink : C.muted }}>
          {over ? "Match over" : `Round ${match.round} of ${PD_ROUNDS}`}
        </span>
        {[
          { id: myTeam.id, t: myTeam, i: myIndex, moves: side.mine, ready: side.ready, score: side.score, you: true },
          { id: side.opp, t: opp, i: oi, moves: side.theirs, ready: side.oppReady, score: side.oppScore, you: false },
        ].map((x) => (
          <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Token team={x.t} index={x.i} size={34} radius={10} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.you ? "You" : (x.t?.name ?? "Removed team")}</span>
            <MoveCells moves={x.moves} round={match.round} ready={x.ready} size={28} />
            <span key={x.score} className="mono gte-press" style={{ width: 36, textAlign: "right", fontSize: 26, fontWeight: 800, letterSpacing: "-0.04em" }}>
              {x.score}
            </span>
          </div>
        ))}
        {last >= 0 && (
          <p key={last} className="gte-in" role="status" style={{ margin: 0, paddingTop: 10, borderTop: `2px solid ${C.line}`, fontSize: 15, lineHeight: 1.4, color: C.ink2 }}>
            <strong>Round {last + 1}:</strong> you {did(side.mine[last])}, {oppName} {did(side.theirs[last])}.{" "}
            <span className="mono" style={{ fontWeight: 800, color: C.ink }}>
              +{PAYOFF[side.mine[last]][side.theirs[last]]} / +{PAYOFF[side.theirs[last]][side.mine[last]]}
            </span>
          </p>
        )}
      </section>

      {over ? (
        <section className="gte-pop" style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 6, background: C.ink, color: C.paper, borderRadius: 18, boxShadow: `4px 4px 0 ${C.verm}`, textAlign: "center" }}>
          <span className="serif" style={{ fontSize: 34, lineHeight: 1.05, color: C.mari }}>
            {side.score > side.oppScore ? "You won the match!" : side.score < side.oppScore ? `${oppName} won the match` : "It's a tie!"}
          </span>
          <span style={{ fontSize: 16, lineHeight: 1.4, color: "#DCD5C8" }}>
            Your <strong style={{ color: C.paper }}>{side.score} points</strong> go on the leaderboard. Watch the screen while the other matches finish.
          </span>
        </section>
      ) : (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="label" style={{ margin: 0, fontSize: 12 }}>
            Round {match.round}: your team&apos;s choice
          </h2>
          <div role="radiogroup" aria-label="Cooperate or defect" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {MOVE.map((mv, c) => {
              const on = mineNow === c;
              return (
                <Btn
                  key={mv.label}
                  role="radio"
                  aria-checked={on}
                  disabled={sending}
                  onClick={() => play(c)}
                  className={`btn ${on ? "gte-press" : ""}`}
                  style={{ height: 96, flexDirection: "column", gap: 4, background: mv.color, fontSize: 22, boxShadow: on ? `0 0 0 3px ${C.paper}, 0 0 0 6px ${C.ink}` : undefined }}
                >
                  {mv.label}
                  <span className="mono" style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em" }}>
                    {on ? "YOUR PICK" : c ? "TAKE MORE" : "SHARE"}
                  </span>
                </Btn>
              );
            })}
          </div>
          {err ? (
            <p role="alert" style={{ margin: 0, color: C.vermDark, fontWeight: 700 }}>
              {err}
            </p>
          ) : (
            <p role="status" style={{ margin: 0, fontSize: 15, lineHeight: 1.4, color: C.ink2 }}>
              {mineNow !== null
                ? `Locked in: ${MOVE[mineNow].label}. ${side.oppReady ? "" : `Waiting for ${oppName}… You can still change it.`}`
                : side.ready
                  ? "A teammate already chose this round. Tap to change it."
                  : `Talk it over, then tap. Any teammate can choose; the latest tap counts.${side.oppReady ? ` ${oppName} has already chosen.` : ""}`}
            </p>
          )}
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 className="label" style={{ margin: 0, fontSize: 12 }}>
          How points work (each round)
        </h2>
        <PayoffMatrix phone />
      </section>
    </main>
  );
}

function PhoneReveal({ q, results, team, teamIndex, teams, showMath }: { q: Question; results: Results | null; team: Team; teamIndex: number; teams: Team[]; showMath: boolean }) {
  const r = results?.reveal;
  if (!r) return null;
  const row = r.rows.find((x) => x.teamId === team.id);
  const match = r.matches?.find((m) => m.a === team.id || m.b === team.id);
  const answered = !row ? "—" : q.kind === "number" ? (row.number ?? "—") : row.choice !== null ? LETTERS[row.choice] : "—";
  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, padding: "20px 20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="mono" style={{ padding: "2px 8px", borderRadius: 7, background: C.ink, color: C.paper, fontSize: 14, fontWeight: 800 }}>
          {q.code}
        </span>
        <span style={{ fontSize: 16, fontWeight: 800 }}>{q.title}</span>
        <span className="mono gte-stamp" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 10px", borderRadius: 999, background: C.cobalt, color: C.paper, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>
          <I.check size={13} />
          ANSWER
        </span>
      </div>
      <p className="serif gte-drop" style={{ margin: 0, fontSize: 36, lineHeight: 1.04, letterSpacing: "-0.01em" }}>
        {r.answer}
      </p>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: C.ink2 }}>{r.insight}</p>
      {showMath && <MathCard steps={r.math} phone />}
      {q.kind === "pd" ? (
        <section aria-label="Your match" className="card gte-pop" style={{ marginTop: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12, animationDelay: ".15s" }}>
          {match ? (
            <>
              <span className="label" style={{ fontSize: 12 }}>
                Your match
              </span>
              {[team.id, matchSide(match, team.id).opp].map((id) => {
                const side = matchSide(match, id);
                const k = teams.findIndex((t) => t.id === id);
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Token team={teams[k]} index={k} size={32} radius={9} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{id === team.id ? "You" : (teams[k]?.name ?? "Removed team")}</span>
                    <MoveCells moves={side.mine} round={match.round} ready={false} size={26} live={false} />
                    <span className="mono" style={{ width: 36, textAlign: "right", fontSize: 24, fontWeight: 800 }}>
                      {side.score}
                    </span>
                  </div>
                );
              })}
              <span style={{ fontSize: 15, color: C.ink2 }}>
                Added to the leaderboard:{" "}
                <mark className="hl mono" style={{ padding: "0 4px", fontWeight: 800 }}>
                  +{matchSide(match, team.id).score}
                </mark>
              </span>
            </>
          ) : (
            <span style={{ fontSize: 16, color: C.ink2 }}>Your team wasn&apos;t in a match, so no points this time.</span>
          )}
        </section>
      ) : row && (
        <section aria-label="Your team's result" className="card gte-pop" style={{ marginTop: "auto", position: "relative", padding: "18px 16px 16px", display: "flex", flexDirection: "column", gap: 16, animationDelay: ".15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Token team={team} index={teamIndex} size={36} radius={10} />
            <span className="label" style={{ fontSize: 12 }}>
              Your team
            </span>
          </div>
          {row.correct ? (
            <span className="mono gte-stamp" style={{ position: "absolute", top: 12, right: 14, display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px", border: `2.5px solid ${C.ink}`, borderRadius: 999, background: C.cobalt, color: C.paper, fontSize: 15, fontWeight: 800, letterSpacing: "0.08em", animationDelay: ".3s" }}>
              <I.check size={16} />
              CORRECT +2
            </span>
          ) : (
            <span className="mono" style={{ position: "absolute", top: 12, right: 14, display: "inline-flex", alignItems: "center", gap: 8, height: 38, padding: "0 14px", border: `2.5px dashed ${C.muted}`, borderRadius: 999, color: C.ink2, fontSize: 15, fontWeight: 800, letterSpacing: "0.08em" }}>
              <I.x size={14} />
              MISSED · 0
            </span>
          )}
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderTop: `2px solid ${C.ink}` }}>
            {[
              ["Answered", String(answered)],
              ["Avg vote", row.votes ? fmt1(row.voteAvg) : "—"],
              ["Points", fmt1(row.points)],
            ].map(([k, v], i) => (
              <div key={k} style={{ padding: i ? "12px 0 0 12px" : "12px 8px 0 0", display: "flex", flexDirection: "column", gap: 4, borderLeft: i ? `2px solid ${C.line}` : undefined }}>
                <dt style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>{k}</dt>
                <dd className="mono" style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em" }}>
                  {i === 2 ? <mark className="hl" style={{ padding: "0 4px" }}>{v}</mark> : v}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </main>
  );
}
