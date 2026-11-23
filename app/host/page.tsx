"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  addTeam,
  addTime,
  advance,
  amOrganizer,
  dialogueStep,
  getPresentation,
  goTo,
  kickParticipant,
  organizerLogin,
  removeTeam,
  resetEvent,
  skipToReveal,
  startQuestion,
  toggleExtra,
  togglePause,
  type Presentation,
} from "../actions";
import { useGame, useRemaining, useResults } from "@/lib/useGame";
import { QUESTIONS, questionById, type Question } from "@/lib/questions";
import { ANSWER_SECONDS, MATCH_SECONDS, PD_ROUNDS, PRESENT_SECONDS, VOTE_SECONDS, type Game, type Match, type Participant, type Stage as StageName, type Team } from "@/lib/types";
import { C, LETTERS, QUESTION_ICONS, TOKENS } from "@/lib/theme";
import { DialogueStage } from "@/components/Dialogue";
import { Finale } from "@/components/Finale";
import { HostLeaderboard, HostReveal, MatchCard, PayoffMatrix, SurgeonTable } from "@/components/Panels";
import { Btn, Bullets, CodePill, ConfirmModal, ControlBar, Glyph, HostHeader, I, Ring, Sep, Stage, StatusChip, Token } from "@/components/ui";

const TIMED: StageName[] = ["answering", "matches", "presenting", "voting"];
const MID_QUESTION: StageName[] = ["dialogue", "answering", "matches", "presenting", "voting"];

export default function HostPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    amOrganizer().then(setAuthed);
  }, []);
  if (authed === null) return <Stage>{null}</Stage>;
  if (!authed) return <PinGate onOk={() => setAuthed(true)} />;
  return <Host />;
}

/* ---------------- PIN gate: a backstage pass ---------------- */

function PinGate({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Stage>
      <div className="paper" style={{ position: "absolute", inset: 0 }}>
        <HostHeader right="/host" />
        <div style={{ position: "absolute", left: 0, right: 0, top: 96, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <form
            className="gte-pop"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              const r = await organizerLogin(pin).catch(() => ({ error: "failed" }));
              setBusy(false);
              if (r.error) setErr(true);
              else onOk();
            }}
            style={{ width: 580, position: "relative", display: "flex", flexDirection: "column", background: C.paper2, border: `3px solid ${C.ink}`, borderRadius: 28, boxShadow: `10px 10px 0 ${C.ink}` }}
          >
            <div className="label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 34px", background: C.ink, color: C.paper, borderRadius: "24px 24px 0 0", fontSize: 15, letterSpacing: "0.16em" }}>
              <span>Backstage pass</span>
              <span style={{ display: "flex", gap: 6 }} aria-hidden="true">
                {TOKENS.map((t) => (
                  <span key={t.color} style={{ width: 14, height: 14, borderRadius: 4, background: t.color }} />
                ))}
              </span>
            </div>
            <div style={{ height: 0, borderTop: `3px dashed ${C.line}`, margin: "0 26px" }} />
            <span aria-hidden="true" style={{ position: "absolute", left: -19, top: 52, width: 32, height: 32, borderRadius: 999, background: C.paper, border: `3px solid ${C.ink}`, clipPath: "inset(0 0 0 50%)" }} />
            <span aria-hidden="true" style={{ position: "absolute", right: -19, top: 52, width: 32, height: 32, borderRadius: 999, background: C.paper, border: `3px solid ${C.ink}`, clipPath: "inset(0 50% 0 0)" }} />
            <div style={{ padding: "34px 42px 42px", display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h1 style={{ margin: 0, fontSize: 72, lineHeight: 0.95, fontWeight: 800, letterSpacing: "-0.04em" }}>Organizer</h1>
                <p style={{ margin: 0, fontSize: 24, lineHeight: 1.3, color: C.ink2 }}>Enter the PIN to run the show.</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label htmlFor="pin" className="label" style={{ fontSize: 15, color: C.muted }}>
                  PIN
                </label>
                <input
                  id="pin"
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => (setPin(e.target.value), setErr(false))}
                  className="mono"
                  style={{ height: 72, boxSizing: "border-box", padding: "0 22px", border: `3px solid ${err ? C.vermDark : C.ink}`, borderRadius: 16, background: "#fff", color: C.ink, fontSize: 32, fontWeight: 800, letterSpacing: "0.4em", outline: "none" }}
                />
                {err && (
                  <p role="alert" className="gte-in" style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontSize: 20, fontWeight: 700, color: C.vermDark }}>
                    <I.alert size={22} />
                    That PIN didn&apos;t match. Try again.
                  </p>
                )}
              </div>
              <button type="submit" disabled={busy} aria-busy={busy || undefined} className="btn btn-primary" style={{ height: 72, fontSize: 26, boxShadow: `5px 5px 0 ${C.ink}` }}>
                {busy && <span className="gte-spinner" aria-hidden="true" />}
                Enter
                <I.arrow size={24} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </Stage>
  );
}

/* ---------------- the show ---------------- */

function Host() {
  const { game, teams, participants, matches, reload } = useGame();
  const remaining = useRemaining(game);
  const results = useResults(game);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [hideBar, setHideBar] = useState(false);
  const [finaleDonePhase, setFinaleDonePhase] = useState(-1);
  const [finaleRun, setFinaleRun] = useState(0);
  const [origin] = useState(() => window.location.origin); // Host only renders client-side, after the PIN check
  const firedFor = useRef(-1);

  const act = async (fn: () => Promise<{ error?: string }>) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      setToast(r.error && r.error !== "stale" ? r.error : ""); // stale = double press / realtime lag; harmless
      await reload();
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
      if (e.key === "h" || e.key === "H") setHideBar((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!game) return <Stage>{null}</Stage>;
  const q = questionById(game.question_id);
  const P = game.phase;
  const paused = game.paused_remaining_ms !== null;
  const members = (teamId: string) => participants.filter((p) => p.team_id === teamId);
  const active = teams.filter((t) => members(t.id).length > 0); // empty teams don't answer, present or vote
  const idx = (id: string) => teams.findIndex((t) => t.id === id);

  let screen: ReactNode = null;
  switch (game.stage) {
    case "lobby":
      screen = <Lobby teams={teams} participants={participants} origin={origin} onAdd={(n) => act(() => addTeam(n))} onRemove={(id) => act(() => removeTeam(id))} onKick={async (id) => {
            // not via act(): the modal must never close without kicking because another action was in flight
            const r = await kickParticipant(id).catch((e) => ({ error: e instanceof Error ? e.message : "Kick failed" }));
            setToast(r.error ?? "");
            await reload();
          }} busy={busy} />;
      break;
    case "rules":
      screen = <Rules />;
      break;
    case "select":
      screen = <Select game={game} teams={teams} members={members} activeCount={active.length} busy={busy} onStart={(id) => act(() => startQuestion(P, id))} onAdd={(n) => act(() => addTeam(n))} onRemove={(id) => act(() => removeTeam(id))} />;
      break;
    case "dialogue":
      screen = q && <DialogueStage q={q} index={game.dialogue_index} raised={!hideBar} onNext={() => act(() => dialogueStep(P, 1))} onPrev={() => act(() => dialogueStep(P, -1))} />;
      break;
    case "answering":
      screen = q && <Answering q={q} game={game} active={active} idx={idx} remaining={remaining} paused={paused} table={game.show_extra ? results?.table ?? null : null} />;
      break;
    case "matches":
      screen = q && <Matches q={q} matches={matches} teams={teams} remaining={remaining} paused={paused} />;
      break;
    case "presenting":
      screen = q && <Presenting q={q} game={game} active={active} teams={teams} remaining={remaining} paused={paused} />;
      break;
    case "voting":
      screen = <Voting game={game} active={active} teams={teams} idx={idx} remaining={remaining} paused={paused} />;
      break;
    case "reveal":
      screen = q && (
        <div className="paper" style={{ position: "absolute", inset: 0 }}>
          <HostHeader right="The reveal" />
          {results?.reveal && <HostReveal q={q} results={results} teams={teams} showMath={game.show_extra} />}
        </div>
      );
      break;
    case "leaderboard":
    case "final":
      screen = (
        <div className="paper" style={{ position: "absolute", inset: 0 }}>
          <HostHeader right="Round 2 · Case challenges" />
          {results && <HostLeaderboard standings={results.standings} final={game.stage === "final"} played={game.finished_question_ids.map((id) => questionById(id)?.code ?? id)} />}
        </div>
      );
      break;
    case "finale":
      screen = results && <Finale key={finaleRun} standings={results.standings} onDone={() => setFinaleDonePhase(P)} />;
      break;
  }

  const timed = TIMED.includes(game.stage);
  const toQuestions = () => (!MID_QUESTION.includes(game.stage) || confirm("Abort this question? Its answers and votes will be discarded.")) && act(() => goTo(P, "select"));
  const questionsBtn = (
    <Btn className="ctrl" onClick={toQuestions}>
      <I.list size={18} />
      Questions
    </Btn>
  );
  const resetBtn = (
    <Btn className="ctrl" onClick={() => confirm("Reset the whole event? All answers, votes and scores are deleted (teams stay).") && act(resetEvent)}>
      <I.reset size={18} />
      Reset
    </Btn>
  );
  const STAGE_LABEL: Record<StageName, string> = {
    lobby: "Lobby",
    rules: "Rules",
    select: "Select",
    dialogue: "Story",
    answering: "Answering",
    matches: "Matches",
    presenting: "Presenting",
    voting: "Voting",
    reveal: "Reveal",
    leaderboard: "Leaderboard",
    finale: "Finale",
    final: "Final",
  };

  return (
    <Stage>
      <div key={`${game.stage}-${game.question_id}-${game.presenting_team_id}`} className="gte-stagein" style={{ position: "absolute", inset: 0 }}>
        {screen}
      </div>
      {toast && (
        <button
          onClick={() => setToast("")}
          className="gte-pop"
          style={{ position: "absolute", top: 22, left: "50%", transform: "translateX(-50%)", zIndex: 30, display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", border: `2.5px solid ${C.vermDark}`, borderRadius: 14, background: "#FCE3DC", color: "#7A1F0E", fontSize: 18, fontWeight: 800, boxShadow: `4px 4px 0 ${C.ink}`, cursor: "pointer" }}
        >
          <I.alert size={20} />
          {toast}
          <I.x size={14} />
        </button>
      )}
      {!hideBar && (
        <ControlBar label={STAGE_LABEL[game.stage]}>
          <Sep />
          {game.stage === "lobby" && (
            <Btn className="ctrl ctrl-primary" onClick={() => act(() => goTo(P, "rules"))}>
              Show rules
              <I.play />
            </Btn>
          )}
          {game.stage === "rules" && (
            <>
              <Btn className="ctrl" onClick={() => act(() => goTo(P, "lobby"))}>
                <I.back />
                Lobby
              </Btn>
              <Btn className="ctrl ctrl-primary" onClick={() => act(() => goTo(P, "select"))}>
                Start questions
                <I.play />
              </Btn>
            </>
          )}
          {game.stage === "select" && <span style={{ padding: "0 10px", fontSize: 16, fontWeight: 600, color: "#DCD5C8" }}>Click a card to start its story</span>}
          {game.stage === "dialogue" && (
            <>
              <Btn className="ctrl" onClick={() => act(() => dialogueStep(P, -1))}>
                <I.back />
                Back
              </Btn>
              <Btn className="ctrl ctrl-primary" onClick={() => act(() => dialogueStep(P, 1))}>
                {q && game.dialogue_index >= q.dialogue.length - 1 ? (q.kind === "pd" ? "Start matches" : "Start answering") : "Next line"}
                <I.play />
              </Btn>
            </>
          )}
          {timed && (
            <>
              <Btn className={`ctrl ${paused ? "ctrl-on" : ""}`} onClick={() => act(() => togglePause(P))}>
                {paused ? <I.play /> : <I.pause />}
                {paused ? "Resume" : "Pause"}
              </Btn>
              <Btn className="ctrl" onClick={() => act(() => addTime(P, 60))}>
                <I.plus size={16} />1 min
              </Btn>
              <Btn className={`ctrl ${game.stage === "answering" ? "" : "ctrl-primary"}`} onClick={() => act(() => advance(P))}>
                <I.end />
                End now
              </Btn>
              <Btn className="ctrl ctrl-warn" onClick={() => act(() => skipToReveal(P))}>
                Skip to reveal
              </Btn>
              {game.stage === "answering" && q?.lockChoice && (
                <Btn className={`ctrl ${game.show_extra ? "ctrl-on" : ""}`} onClick={() => act(() => toggleExtra(P))}>
                  {game.show_extra ? "Hide table" : "Show table"}
                </Btn>
              )}
            </>
          )}
          {game.stage === "reveal" && (
            <>
              <Btn className={`ctrl ${game.show_extra ? "ctrl-on" : ""}`} onClick={() => act(() => toggleExtra(P))}>
                {game.show_extra ? "Hide the math" : "Show the math"}
              </Btn>
              <Btn className="ctrl ctrl-primary" onClick={() => act(() => goTo(P, "leaderboard"))}>
                Leaderboard
                <I.play />
              </Btn>
              <Btn className="ctrl ctrl-gold" onClick={() => act(() => goTo(P, "finale"))}>
                <I.trophyOutline size={18} />
                Finale
              </Btn>
            </>
          )}
          {game.stage === "leaderboard" && (
            <>
              <Btn className="ctrl ctrl-primary" onClick={() => act(() => goTo(P, "select"))}>
                Next question
                <I.play />
              </Btn>
              <Btn className="ctrl ctrl-gold" onClick={() => act(() => goTo(P, "finale"))}>
                <I.trophyOutline size={18} />
                Finale
              </Btn>
            </>
          )}
          {game.stage === "finale" && (
            <>
              <Btn className="ctrl" onClick={() => (setFinaleRun((n) => n + 1), setFinaleDonePhase(-1))}>
                <I.reset size={18} />
                Play the reveal
              </Btn>
              <Btn disabled={finaleDonePhase !== P} className={`ctrl ${finaleDonePhase === P ? "ctrl-primary" : ""}`} onClick={() => act(() => goTo(P, "final"))}>
                Show full leaderboard
                <I.play />
              </Btn>
            </>
          )}
          {!["lobby", "rules", "select", "leaderboard"].includes(game.stage) && (
            <>
              <Sep />
              {questionsBtn}
            </>
          )}
          {game.stage !== "finale" && resetBtn}
        </ControlBar>
      )}
    </Stage>
  );
}

/* ---------------- stage screens ---------------- */

function Lobby({ teams, participants, origin, onAdd, onRemove, onKick, busy }: { teams: Team[]; participants: Participant[]; origin: string; onAdd: (n: string) => void; onRemove: (id: string) => void; onKick: (id: string) => Promise<unknown>; busy: boolean }) {
  const [name, setName] = useState("");
  const [kick, setKick] = useState<Participant | null>(null);
  const kickTeam = teams.find((t) => t.id === kick?.team_id);
  return (
    <div className="paper" style={{ position: "absolute", inset: 0 }}>
      <HostHeader right="Round 2 · Case challenges" />
      <div style={{ position: "absolute", left: 56, top: 116, width: 560, display: "flex", flexDirection: "column", gap: 34 }}>
        <h1 className="gte-drop" style={{ margin: 0, fontSize: 118, lineHeight: 0.84, fontWeight: 800, letterSpacing: "-0.05em", textShadow: `6px 5px 0 ${C.verm}` }}>
          Game
          <br />
          Theory
          <br />
          Event
        </h1>
        <div className="card gte-pop" style={{ display: "flex", gap: 26, alignItems: "stretch", padding: 22, borderWidth: 3, borderRadius: 24, boxShadow: `8px 8px 0 ${C.ink}` }}>
          <div style={{ width: 232, height: 232, flex: "none", background: "#fff", border: `2px solid ${C.line}`, borderRadius: 12, display: "grid", placeItems: "center" }}>
            {origin && <QRCodeSVG value={origin} size={212} fgColor={C.ink} bgColor="#ffffff" title="QR code to join" />}
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>Scan to join</span>
              <span style={{ fontSize: 20, color: C.ink2 }}>or open</span>
              <span className="mono" style={{ fontSize: 20, fontWeight: 800, wordBreak: "break-all" }}>
                {origin.replace(/^https?:\/\//, "")}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span className="gte-live" style={{ width: 14, height: 14, borderRadius: 999, background: C.verm, alignSelf: "center" }} />
              <span key={participants.length} className="mono gte-press" style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
                {participants.length}
              </span>
              <span style={{ fontSize: 24, fontWeight: 700 }}>joined</span>
            </div>
          </div>
        </div>
      </div>

      <section style={{ position: "absolute", left: 680, right: 56, top: 116, bottom: 110, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 className="label" style={{ margin: 0, fontSize: 18 }}>
            Teams
          </h2>
          <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: C.muted }}>
            {teams.length} teams · {participants.length} players
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18, overflowY: "auto", padding: "16px 16px 12px 0", margin: "-16px -16px 0 0" }}>
          {teams.map((t, i) => {
            const m = participants.filter((p) => p.team_id === t.id);
            return (
              <article
                key={t.id}
                className="team-card token-hover gte-pop lift"
                style={{ position: "relative", height: 132, boxSizing: "border-box", padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: `color-mix(in srgb, ${t.color} 16%, ${C.paper2})`, border: `2.5px solid ${C.ink}`, borderRadius: 18, boxShadow: `4px 4px 0 ${C.ink}` }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <Token team={t} index={i} size={46} radius={13} />
                  <h3 style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 25, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-0.02em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.name}</h3>
                  <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: C.ink2 }}>
                    {m.length}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 500, color: m.length ? C.ink2 : C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.length ? m.map((x) => x.name).join(" · ") : "— no players yet"}</p>
                <button
                  type="button"
                  className="team-x"
                  aria-label={`Remove ${t.name}`}
                  onClick={() => confirm(`Remove ${t.name}?`) && onRemove(t.id)}
                  style={{ position: "absolute", top: -15, right: -15, width: 42, height: 42, placeItems: "center", border: `2.5px solid ${C.ink}`, borderRadius: 999, background: C.verm, color: C.ink, cursor: "pointer" }}
                >
                  <I.x size={18} />
                </button>
              </article>
            );
          })}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) onAdd(name);
              setName("");
            }}
            style={{ height: 132, boxSizing: "border-box", padding: "16px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: `2.5px dashed ${C.muted}`, borderRadius: 18 }}
          >
            <label htmlFor="newteam" className="label" style={{ fontSize: 14, letterSpacing: "0.12em", color: C.muted }}>
              New team name
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <input id="newteam" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nash Bros" style={{ flex: 1, minWidth: 0, height: 52, boxSizing: "border-box", padding: "0 16px", border: `2.5px solid ${C.ink}`, borderRadius: 12, background: "#fff", color: C.ink, fontFamily: "inherit", fontSize: 20 }} />
              <button type="submit" disabled={busy} aria-busy={busy || undefined} className="btn btn-dark" style={{ height: 52, padding: "0 18px", borderRadius: 12, fontSize: 19, boxShadow: "none" }}>
                {busy ? <span className="gte-spinner" aria-hidden="true" /> : <I.plus size={18} />}
                Add team
              </button>
            </div>
          </form>
        </div>
        <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="label" style={{ margin: 0, display: "flex", justifyContent: "space-between", fontSize: 18 }}>
            <span>Players</span>
            <span style={{ color: C.muted, fontSize: 15 }}>Click a name to kick</span>
          </h2>
          {participants.length ? (
            <ul style={{ margin: 0, padding: "2px 4px 4px 2px", listStyle: "none", display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 196, overflowY: "auto" }}>
              {participants.map((p) => {
                const ti = teams.findIndex((t) => t.id === p.team_id);
                return (
                  <li key={p.id} className="gte-pop">
                    <button
                      type="button"
                      onClick={() => setKick(p)}
                      aria-label={`Kick ${p.name}`}
                      className="lift"
                      style={{ height: 42, boxSizing: "border-box", padding: "0 12px 0 5px", display: "flex", alignItems: "center", gap: 8, border: `2px solid ${C.ink}`, borderRadius: 999, background: C.paper2, color: C.ink, fontFamily: "inherit", fontSize: 18, fontWeight: 800, cursor: "pointer" }}
                    >
                      {ti >= 0 ? <Token team={teams[ti]} index={ti} size={30} radius={999} border={2} /> : <span title="No team yet" style={{ width: 30, height: 30, boxSizing: "border-box", borderRadius: 999, border: `2px dashed ${C.faint}` }} />}
                      <span style={{ maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                      <I.x size={13} style={{ color: C.muted }} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: 20, color: C.muted }}>No one has joined yet.</p>
          )}
        </div>
      </section>
      {kick && (
        <ConfirmModal
          title={`Kick ${kick.name}?`}
          body={
            <>
              They&apos;ll be removed{kickTeam ? ` from ${kickTeam.name}` : ""} and sent back to the join screen. They can rejoin by scanning the QR code again.
            </>
          }
          confirmLabel="Kick"
          onConfirm={() => onKick(kick.id)}
          onClose={() => setKick(null)}
        />
      )}
    </div>
  );
}

function RuleCard({ n, children, dark = false, delay }: { n: number; children: ReactNode; dark?: boolean; delay: number }) {
  return (
    <li
      className="gte-pop"
      style={{ height: 262, boxSizing: "border-box", padding: "26px 28px", display: "flex", gap: 20, background: dark ? C.ink : C.paper2, color: dark ? C.paper : C.ink, border: `2.5px solid ${C.ink}`, borderRadius: 20, boxShadow: `5px 5px 0 ${dark ? C.verm : C.ink}`, animationDelay: `${delay}s` }}
    >
      <span className="mono" style={{ width: 60, height: 60, flex: "none", display: "grid", placeItems: "center", borderRadius: 14, background: dark ? C.paper : C.ink, color: dark ? C.ink : C.paper, fontSize: 30, fontWeight: 800 }}>
        {n}
      </span>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0, fontSize: 25, lineHeight: 1.28, fontWeight: 500 }}>{children}</div>
    </li>
  );
}

function Rules() {
  const b = (t: string) => <strong style={{ fontWeight: 800 }}>{t}</strong>;
  const m = (t: string) => (
    <mark className="hl" style={{ fontWeight: 800 }}>
      {t}
    </mark>
  );
  return (
    <div className="paper" style={{ position: "absolute", inset: 0 }}>
      <HostHeader right="Round 2 · Case challenges" />
      <div style={{ position: "absolute", left: 56, right: 56, top: 112, display: "flex", flexDirection: "column", gap: 30 }}>
        <h1 className="gte-drop" style={{ margin: 0, fontSize: 92, lineHeight: 0.9, fontWeight: 800, letterSpacing: "-0.045em" }}>
          How it works
        </h1>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24 }}>
          <RuleCard n={1} delay={0}>
            <p style={{ margin: 0 }}>
              Each team submits {b("one answer")} plus a {b("written explanation")} per question. Any member can submit; the latest submission counts.
            </p>
          </RuleCard>
          <RuleCard n={2} delay={0.08}>
            <p style={{ margin: 0 }}>You have {m("5 minutes")} to answer.</p>
            <span aria-hidden="true" className="mono" style={{ fontSize: 76, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>
              5:00
            </span>
          </RuleCard>
          <RuleCard n={3} delay={0.16}>
            <p style={{ margin: 0 }}>
              Teams are then picked {b("at random")} to present: you get {m("60 seconds")} to explain your answer out loud.
            </p>
          </RuleCard>
          <RuleCard n={4} delay={0.24}>
            <p style={{ margin: 0 }}>
              After each presentation, every other team gives {b("one vote")} from {m("0 to 10")}.
            </p>
            <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(11, minmax(0, 1fr))", border: `2px solid ${C.ink}`, borderRadius: 8, overflow: "hidden" }}>
              {Array.from({ length: 11 }, (_, v) => (
                <span key={v} className="mono" style={{ height: 34, display: "grid", placeItems: "center", borderLeft: v ? `2px solid ${C.ink}` : 0, fontSize: 15, fontWeight: 800 }}>
                  {v}
                </span>
              ))}
            </div>
          </RuleCard>
          <RuleCard n={5} dark delay={0.32}>
            <span className="label" style={{ fontSize: 17, letterSpacing: "0.12em", color: "#BFB8AA" }}>
              Points per question
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", alignItems: "end", columnGap: 14, rowGap: 8 }}>
              <span className="mono" style={{ fontSize: 72, fontWeight: 800, lineHeight: 0.9, color: C.mari }}>
                2
              </span>
              <span style={{ fontSize: 52, fontWeight: 800, lineHeight: 0.9 }}>+</span>
              <span className="mono" style={{ fontSize: 72, fontWeight: 800, lineHeight: 0.9, color: C.cobaltLight }}>
                avg
              </span>
              <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>for a correct answer</span>
              <span />
              <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>of the votes you received</span>
            </div>
          </RuleCard>
          <RuleCard n={6} delay={0.4}>
            <p style={{ margin: 0 }}>Points add up across all questions. {b("Highest total wins!")}</p>
            <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 4h8v5a4 4 0 0 1-8 0z" fill={C.mari} />
              <path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 3.6M16 6h2.5a2.5 2.5 0 0 1-2.6 3.6M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z" />
            </svg>
          </RuleCard>
        </ol>
      </div>
    </div>
  );
}

function Select({ game, teams, members, activeCount, busy, onStart, onAdd, onRemove }: { game: Game; teams: Team[]; members: (id: string) => Participant[]; activeCount: number; busy: boolean; onStart: (id: string) => void; onAdd: (n: string) => void; onRemove: (id: string) => void }) {
  const [name, setName] = useState("");
  const [starting, setStarting] = useState("");
  const done = game.finished_question_ids;
  return (
    <div className="paper" style={{ position: "absolute", inset: 0 }}>
      <HostHeader right="Round 2 · Case challenges" />
      <div style={{ position: "absolute", left: 56, right: 56, top: 108, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
          <h1 className="gte-drop" style={{ margin: 0, fontSize: 76, lineHeight: 0.9, fontWeight: 800, letterSpacing: "-0.045em" }}>
            Choose the next challenge
          </h1>
          <span className="mono" style={{ fontSize: 20, fontWeight: 800, paddingBottom: 6 }}>
            {done.length} of {QUESTIONS.length} played
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 20 }}>
          {QUESTIONS.map((x, i) => {
            const played = done.includes(x.id);
            const last = !!x.last;
            return (
              <button
                key={x.id}
                type="button"
                disabled={played || busy}
                onClick={() => (setStarting(x.id), onStart(x.id))}
                aria-busy={(busy && starting === x.id) || undefined}
                aria-label={`${x.code} ${x.title}${played ? ", played" : last ? ", play last" : ""}`}
                className={`gte-pop ${played ? "" : "btn"}`}
                style={{
                  position: "relative",
                  height: 212,
                  boxSizing: "border-box",
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "stretch",
                  textAlign: "left",
                  border: played ? `2.5px dashed ${C.faint}` : `2.5px solid ${C.ink}`,
                  borderRadius: 20,
                  background: last ? C.ink : played ? C.played : C.paper2,
                  color: last ? C.paper : played ? C.muted : C.ink,
                  boxShadow: played ? "none" : last ? `6px 6px 0 ${C.verm}` : `5px 5px 0 ${C.ink}`,
                  fontFamily: "inherit",
                  cursor: played ? "default" : "pointer",
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <span className="mono" style={{ fontSize: 60, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 0.9 }}>
                    {x.code}
                  </span>
                  {busy && starting === x.id ? (
                    <span className="gte-spinner" aria-hidden="true" style={{ fontSize: 44 }} />
                  ) : !played && (
                    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={QUESTION_ICONS[x.id]} />
                    </svg>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.02em" }}>{x.title}</span>
                  <span className="label" style={{ fontSize: 14, letterSpacing: "0.1em", color: x.kind === "pd" && !played && activeCount % 2 ? C.vermDark : last ? "#BFB8AA" : C.muted }}>
                    {x.kind === "pd" && !played && activeCount % 2 ? `Needs an even number of teams (now ${activeCount})` : x.topic}
                  </span>
                </div>
                {played && (
                  <span className="mono gte-stamp" style={{ position: "absolute", top: 24, right: 18, display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", border: `3px solid ${C.cobalt}`, borderRadius: 10, background: C.paper, color: C.cobalt, fontSize: 16, fontWeight: 800, letterSpacing: "0.1em", transform: "rotate(7deg)" }}>
                    <I.check size={16} />
                    PLAYED
                  </span>
                )}
                {last && !played && (
                  <span className="label" style={{ position: "absolute", top: -14, left: 20, padding: "5px 12px", border: `2.5px solid ${C.ink}`, borderRadius: 999, background: C.mari, color: C.ink, fontSize: 14, letterSpacing: "0.1em" }}>
                    Play last
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <section style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
          <h2 className="label" style={{ margin: 0, fontSize: 16, color: C.muted }}>
            Teams
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px 20px" }}>
            {teams.map((t, i) => (
              <div key={t.id} className="token-hover" style={{ height: 50, boxSizing: "border-box", padding: "0 6px 0 7px", display: "flex", alignItems: "center", gap: 10, background: C.paper2, border: `2px solid ${C.ink}`, borderRadius: 999 }}>
                <Token team={t} index={i} size={34} radius={999} border={2} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 19, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                <span className="mono" style={{ fontSize: 15, fontWeight: 800, color: C.ink2 }}>
                  {members(t.id).length}
                </span>
                <button type="button" aria-label={`Remove ${t.name}`} onClick={() => confirm(`Remove ${t.name}?`) && onRemove(t.id)} style={{ width: 34, height: 34, flex: "none", display: "grid", placeItems: "center", border: 0, borderRadius: 999, background: "transparent", color: C.muted, cursor: "pointer" }}>
                  <I.x size={15} />
                </button>
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) onAdd(name);
                setName("");
              }}
              style={{ height: 50, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 6, padding: "0 6px 0 16px", border: `2px dashed ${C.muted}`, borderRadius: 999 }}
            >
              <input aria-label="New team name" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} placeholder="Add team…" style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", fontFamily: "inherit", fontSize: 19, fontWeight: 800, outline: "none" }} />
              <button type="submit" aria-label="Add team" style={{ width: 36, height: 36, flex: "none", display: "grid", placeItems: "center", border: `2px solid ${C.ink}`, borderRadius: 999, background: C.ink, color: C.paper, cursor: "pointer" }}>
                <I.plus size={16} />
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function Answering({ q, game, active, idx, remaining, paused, table }: { q: Question; game: Game; active: Team[]; idx: (id: string) => number; remaining: number | null; paused: boolean; table: NonNullable<ReturnType<typeof useResults>>["table"] | null }) {
  const long = q.summary.join(" ").length > 170;
  const four = q.choices.length >= 4;
  return (
    <div className="paper" style={{ position: "absolute", inset: 0 }}>
      <HostHeader right="Answer on your phones" />
      <div style={{ position: "absolute", left: 56, top: 110, width: 1040, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <CodePill code={q.code} />
          <span className="label" style={{ fontSize: 18, letterSpacing: "0.12em", color: C.muted }}>
            {q.topic}
          </span>
        </div>
        <h1 style={{ margin: "12px 0 0", fontSize: q.title.length > 26 ? 64 : 80, lineHeight: 0.95, fontWeight: 800, letterSpacing: "-0.045em" }}>{q.title}</h1>
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: table ? "minmax(0,1fr) 520px" : "minmax(0,1fr)", gap: 32, alignItems: "start" }}>
          <Bullets items={q.summary} size={long ? 22 : 25} gap={long ? 10 : 14} />
          {table && <SurgeonTable table={table} />}
        </div>
        <p style={{ margin: "24px 0 0", fontSize: 33, lineHeight: 1.42, fontWeight: 800, letterSpacing: "-0.015em" }}>
          <mark className="hl" style={{ padding: "2px 8px" }}>
            {q.prompt}
          </mark>
        </p>
        {q.kind === "mcq" ? (
          <ol style={{ margin: "20px 0 0", padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: `repeat(${four ? 2 : 3}, minmax(0, 1fr))`, gap: four ? 12 : 16 }}>
            {q.choices.map((c, i) => (
              <li key={c} className="gte-pop" style={{ minHeight: four ? 70 : 92, boxSizing: "border-box", padding: "12px 18px", display: "flex", alignItems: "center", gap: 16, background: C.paper2, border: `2.5px solid ${C.ink}`, borderRadius: 16, animationDelay: `${0.06 * i}s` }}>
                <span className="mono" style={{ width: 46, height: 46, flex: "none", display: "grid", placeItems: "center", borderRadius: 11, background: C.ink, color: C.paper, fontSize: 24, fontWeight: 800 }}>
                  {LETTERS[i]}
                </span>
                <span style={{ fontSize: four ? 22 : 25, lineHeight: 1.15, fontWeight: 700 }}>{c}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="card" style={{ marginTop: 20, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            {[0, 25, 50, 75, 100].map((v) => (
              <span key={v} className="mono" style={{ fontSize: 40, fontWeight: 800, color: v === 0 ? C.cobalt : C.ink }}>
                {v}
              </span>
            ))}
          </div>
        )}
      </div>

      <aside style={{ position: "absolute", left: 1150, right: 56, top: 110, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <Ring ms={remaining} total={ANSWER_SECONDS} size={290} paused={paused} tag="to answer" fontSize={76} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span className="mono" style={{ fontSize: 68, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>
            <span key={game.submitted_team_ids.length} className="gte-press" style={{ display: "inline-block" }}>
              {game.submitted_team_ids.length}
            </span>
            <span style={{ color: C.faint }}> / </span>
            {active.length}
          </span>
          <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>
            teams
            <br />
            submitted
          </span>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", width: "100%", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {active.map((t) => (
            <StatusChip key={t.id} team={t} index={idx(t.id)} done={game.submitted_team_ids.includes(t.id)} label="submitted" />
          ))}
        </ul>
      </aside>
    </div>
  );
}

function Matches({ q, matches, teams, remaining, paused }: { q: Question; matches: Match[]; teams: Team[]; remaining: number | null; paused: boolean }) {
  const finished = matches.filter((m) => m.round > PD_ROUNDS).length;
  return (
    <div className="paper" style={{ position: "absolute", inset: 0 }}>
      <HostHeader right="Play on your phones" />
      <div style={{ position: "absolute", left: 56, top: 108, width: 480, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <CodePill code={q.code} />
          <span className="label" style={{ fontSize: 16, letterSpacing: "0.12em", color: C.muted }}>
            How it works
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: 60, lineHeight: 0.95, fontWeight: 800, letterSpacing: "-0.045em" }}>{q.title}</h1>
        <Bullets items={q.summary} size={21} gap={10} dot={9} />
        <PayoffMatrix />
      </div>
      <section style={{ position: "absolute", left: 588, right: 56, top: 104, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h2 className="label" style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontSize: 18 }}>
              <span className="gte-live" style={{ width: 12, height: 12, borderRadius: 999, background: C.verm }} />
              Live matches
            </h2>
            <span className="mono" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
              <span key={finished} className="gte-press" style={{ display: "inline-block" }}>
                {finished}
              </span>
              <span style={{ color: C.faint }}> / </span>
              {matches.length}
              <span style={{ fontSize: 22, letterSpacing: 0 }}> finished</span>
            </span>
          </div>
          <Ring ms={remaining} total={MATCH_SECONDS} size={150} paused={paused} fontSize={44} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: matches.length > 1 ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)", gap: 16, alignContent: "start" }}>
          {matches.map((m) => (
            <MatchCard key={m.id} m={m} teams={teams} />
          ))}
        </div>
      </section>
    </div>
  );
}

const explainSize = (n: number) => (n > 1200 ? 19 : n > 600 ? 22 : n > 250 ? 26 : 32);

function Presenting({ q, game, active, teams, remaining, paused }: { q: Question; game: Game; active: Team[]; teams: Team[]; remaining: number | null; paused: boolean }) {
  const [pres, setPres] = useState<Presentation | null>(null);
  const presenter = game.presenting_team_id;
  useEffect(() => {
    // retry a few times so one dropped request doesn't blank the screen for the whole presentation
    let live = true;
    const load = (tries: number) =>
      getPresentation().then(
        (p) => live && (p ? setPres(p) : tries > 0 && setTimeout(() => load(tries - 1), 1500)),
        () => live && tries > 0 && setTimeout(() => load(tries - 1), 1500),
      );
    load(3);
    return () => {
      live = false;
    };
  }, [presenter]);
  const ti = teams.findIndex((t) => t.id === presenter);
  const team = teams[ti];
  const tok = TOKENS[TOKENS.findIndex((t) => t.color === team?.color)] ?? TOKENS[Math.max(0, ti) % TOKENS.length];
  const presented = game.presented_team_ids.filter((id) => id !== presenter);
  const upcoming = active.filter((t) => !game.presented_team_ids.includes(t.id));
  const order = [...presented.map((id) => ({ id, s: "done" as const })), { id: presenter!, s: "cur" as const }, ...upcoming.map((t) => ({ id: t.id, s: "next" as const }))];
  if (!team) return null;
  const picks = pres?.picks ?? [];
  const mine = picks.find((p) => p.teamId === team.id);
  const myPick = !mine ? null : q.kind === "number" ? (mine.number !== null ? String(mine.number) : null) : mine.choice !== null ? `${LETTERS[mine.choice]} · ${q.choices[mine.choice]}` : null;
  const explanation = pres?.explanation.trim() ?? "";
  const unanswered = active.filter((t) => !picks.some((p) => p.teamId === t.id && (q.kind === "number" ? p.number !== null : p.choice !== null)));
  const tokenOf = (id: string) => {
    const k = teams.findIndex((t) => t.id === id);
    return <Token key={id} team={teams[k]} index={k} size={30} radius={9} border={2} />;
  };
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", backgroundColor: tok.color, backgroundImage: "radial-gradient(rgba(23,22,28,0.12) 1.4px, transparent 1.8px)", backgroundSize: "16px 16px" }}>
      <svg className="gte-spin" width="1100" height="1100" viewBox="0 0 24 24" aria-hidden="true" style={{ position: "absolute", right: -300, top: -140, opacity: 0.09 }}>
        <path d={tok.d} fill={C.ink} fillRule="evenodd" />
      </svg>
      <header className="mono" style={{ position: "absolute", left: 56, right: 56, top: 30, display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: `2.5px solid ${C.ink}`, fontSize: 18, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <rect x="1.5" y="1.5" width="23" height="23" fill={C.paper2} stroke={C.ink} strokeWidth="2.5" />
            <path d="M13 1.5V24.5M1.5 13H24.5" stroke={C.ink} strokeWidth="2.5" />
            <rect x="14.5" y="14.5" width="8.5" height="8.5" fill={C.ink} />
          </svg>
          Game Theory Event
        </span>
        <span>
          {q.code} · {q.title}
        </span>
      </header>
      <div style={{ position: "absolute", left: 56, width: 1000, top: 112, bottom: 236, display: "flex", flexDirection: "column", gap: 18 }}>
        <span className="label" style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 12, height: 48, padding: "0 22px 0 16px", borderRadius: 999, background: C.ink, color: C.paper, fontSize: 18 }}>
          <span className="gte-wob" style={{ display: "flex" }}>
            <I.mic size={22} />
          </span>
          Now presenting
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span className="gte-pop">
            <Token team={team} index={ti} size={92} radius={24} border={4} inverted shadow={`6px 6px 0 ${C.ink}`} />
          </span>
          <h1 className="gte-drop" style={{ margin: 0, fontSize: team.name.length > 16 ? 72 : 96, lineHeight: 0.9, fontWeight: 800, letterSpacing: "-0.05em", textWrap: "balance" }}>
            {team.name}
          </h1>
        </div>
        <section className="gte-pop" aria-label="Their submitted answer" style={{ flex: 1, minHeight: 0, boxSizing: "border-box", padding: "18px 26px 20px", display: "flex", flexDirection: "column", gap: 12, background: C.paper2, border: `3px solid ${C.ink}`, borderRadius: 22, boxShadow: `7px 7px 0 ${C.ink}`, animationDelay: ".1s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span className="label" style={{ fontSize: 15, letterSpacing: "0.12em", color: C.muted }}>
              Their answer
            </span>
            <span style={{ padding: "4px 14px", borderRadius: 999, background: myPick ? C.ink : "transparent", border: myPick ? 0 : `2px dashed ${C.faint}`, color: myPick ? C.paper : C.muted, fontSize: 22, fontWeight: 800 }}>{myPick ?? "No answer submitted"}</span>
          </div>
          <p style={{ margin: 0, flex: 1, minHeight: 0, overflowY: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: explainSize(explanation.length), lineHeight: 1.35, fontWeight: 500, color: explanation ? C.ink : C.muted }}>
            {pres === null ? "" : explanation ? `“${explanation}”` : "No written explanation. Over to you: explain it out loud!"}
          </p>
        </section>
      </div>
      <div style={{ position: "absolute", left: 56, bottom: 110, display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="label" style={{ fontSize: 18, letterSpacing: "0.12em" }}>
          Team {presented.length + 1} of {order.length}
        </span>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", alignItems: "center", gap: 14 }}>
          {order.map((o) => {
            const t = teams.find((x) => x.id === o.id);
            const ix = teams.findIndex((x) => x.id === o.id);
            const tk = TOKENS[TOKENS.findIndex((x) => x.color === t?.color)] ?? TOKENS[Math.max(0, ix) % TOKENS.length];
            const cur = o.s === "cur";
            const size = cur ? 64 : 48;
            return (
              <li
                key={o.id}
                aria-label={`${t?.name}, ${o.s === "done" ? "presented" : cur ? "presenting now" : "up next"}`}
                style={{ width: size, height: size, display: "grid", placeItems: "center", boxSizing: "border-box", borderRadius: 14, border: cur ? `4px solid ${C.ink}` : o.s === "done" ? `2.5px solid ${C.ink}` : `2.5px dashed ${C.ink}`, background: o.s === "done" ? tk.color : cur ? C.paper2 : "transparent", boxShadow: cur ? `5px 5px 0 ${C.ink}` : "none" }}
              >
                <Glyph d={tk.d} size={cur ? 34 : 24} color={o.s === "next" ? "rgba(23,22,28,0.45)" : C.ink} />
              </li>
            );
          })}
        </ol>
      </div>
      <aside style={{ position: "absolute", right: 56, top: 108, width: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <Ring ms={remaining} total={PRESENT_SECONDS} size={236} paused={paused} fontSize={88} onColor states={false} tag="to explain" />
        <section aria-label="Every team's pick" style={{ width: "100%", boxSizing: "border-box", padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10, background: C.paper2, border: `2.5px solid ${C.ink}`, borderRadius: 18, boxShadow: `5px 5px 0 ${C.ink}` }}>
          <h2 className="label" style={{ margin: 0, fontSize: 14, letterSpacing: "0.12em" }}>
            What every team picked
          </h2>
          {q.kind === "number" ? (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[...picks].filter((p) => p.number !== null).sort((a, b) => a.number! - b.number!).map((p) => (
                <li key={p.teamId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px 3px 3px", border: `2px solid ${p.teamId === team.id ? C.ink : C.line}`, borderRadius: 999 }}>
                  {tokenOf(p.teamId)}
                  <span className="mono" style={{ fontSize: 22, fontWeight: 800 }}>
                    {p.number}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {q.choices.map((c, i) => {
                const who = picks.filter((p) => p.choice === i);
                return (
                  <li key={c} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 36, opacity: who.length ? 1 : 0.55 }}>
                    <span className="mono" style={{ width: 30, height: 30, flex: "none", display: "grid", placeItems: "center", borderRadius: 8, background: C.ink, color: C.paper, fontSize: 16, fontWeight: 800 }}>
                      {LETTERS[i]}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 16, lineHeight: 1.15, fontWeight: 700, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c}</span>
                    <span style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 4, maxWidth: 170 }}>
                      {who.length ? who.map((p) => tokenOf(p.teamId)) : <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: C.muted }}>0</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {pres && unanswered.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8, borderTop: `2px solid ${C.line}` }}>
              <span className="label" style={{ flex: 1, fontSize: 12, letterSpacing: "0.1em", color: C.muted }}>
                No answer
              </span>
              {unanswered.map((t) => tokenOf(t.id))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

function Voting({ game, active, teams, idx, remaining, paused }: { game: Game; active: Team[]; teams: Team[]; idx: (id: string) => number; remaining: number | null; paused: boolean }) {
  const team = teams.find((t) => t.id === game.presenting_team_id);
  const voters = active.filter((t) => t.id !== game.presenting_team_id);
  if (!team) return null;
  return (
    <div className="paper" style={{ position: "absolute", inset: 0 }}>
      <HostHeader right="Vote on your phones" />
      <div style={{ position: "absolute", left: 56, top: 118, width: 1060, display: "flex", flexDirection: "column", gap: 22 }}>
        <h1 style={{ margin: 0, fontSize: 56, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.03em" }}>
          Vote now, <span className="mono" style={{ fontWeight: 800 }}>0</span> to <span className="mono" style={{ fontWeight: 800 }}>10</span>, for
        </h1>
        <div className="gte-pop" style={{ alignSelf: "flex-start", maxWidth: 1000, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 24, padding: "18px 30px 22px 20px", background: team.color, border: `3px solid ${C.ink}`, borderRadius: 24, boxShadow: `8px 8px 0 ${C.ink}` }}>
          <Token team={team} index={idx(team.id)} size={92} radius={24} border={3} inverted glyph={0.56} />
          <span style={{ fontSize: 82, lineHeight: 0.92, fontWeight: 800, letterSpacing: "-0.05em", textWrap: "balance" }}>{team.name}</span>
        </div>
      </div>
      <div style={{ position: "absolute", right: 64, top: 112 }}>
        <Ring ms={remaining} total={VOTE_SECONDS} size={320} paused={paused} fontSize={120} states={false} />
      </div>
      <div aria-hidden="true" style={{ position: "absolute", left: 56, right: 56, top: 488, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(11, minmax(0, 1fr))", background: C.paper2, border: `3px solid ${C.ink}`, borderRadius: 20, overflow: "hidden", boxShadow: `6px 6px 0 ${C.ink}` }}>
          {Array.from({ length: 11 }, (_, v) => (
            <div key={v} className="gte-drop" style={{ height: 118, position: "relative", display: "grid", placeItems: "center", borderLeft: v ? `3px solid ${C.ink}` : 0, animationDelay: `${v * 0.03}s` }}>
              <span style={{ position: "absolute", top: 0, left: "50%", width: 3, height: 16, marginLeft: -1.5, background: C.ink }} />
              <span className="mono" style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.05em" }}>
                {v}
              </span>
            </div>
          ))}
        </div>
        <div className="label" style={{ display: "flex", justifyContent: "space-between", fontSize: 17, letterSpacing: "0.12em", color: C.muted }}>
          <span>Not convincing</span>
          <span>Only averages are ever shown</span>
          <span>Very convincing</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 56, right: 56, top: 682, display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flex: "none" }}>
          <span className="mono" style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>
            <span key={game.voted_team_ids.length} className="gte-press" style={{ display: "inline-block" }}>
              {game.voted_team_ids.length}
            </span>
            <span style={{ color: C.faint }}> / </span>
            {voters.length}
          </span>
          <span style={{ fontSize: 22, fontWeight: 700 }}>voted</span>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", flex: 1, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
          {voters.map((t) => (
            <StatusChip key={t.id} team={t} index={idx(t.id)} done={game.voted_team_ids.includes(t.id)} height={52} label="voted" />
          ))}
        </ul>
      </div>
    </div>
  );
}
