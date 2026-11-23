export type Stage =
  | "lobby"
  | "rules"
  | "select"
  | "dialogue"
  | "answering"
  | "matches"
  | "presenting"
  | "voting"
  | "reveal"
  | "leaderboard"
  | "finale"
  | "final";

export type Game = {
  id: number;
  phase: number;
  stage: Stage;
  question_id: string | null;
  dialogue_index: number;
  presenting_team_id: string | null;
  presented_team_ids: string[];
  submitted_team_ids: string[];
  voted_team_ids: string[];
  phase_ends_at: string | null;
  paused_remaining_ms: number | null;
  finished_question_ids: string[];
  show_extra: boolean;
};

export type Team = { id: string; name: string; color: string; created_at: string };
export type Participant = { id: string; name: string; team_id: string | null };

export type Submission = {
  question_id: string;
  team_id: string;
  choice: number | null;
  number: number | null;
  explanation: string;
  locked: boolean;
};

export type Vote = {
  question_id: string;
  presenting_team_id: string;
  voter_team_id: string;
  score: number;
};

/** 2B head-to-head match. Moves are 0 = cooperate, 1 = defect; only resolved rounds are public. */
export type Match = {
  id: number;
  a: string;
  b: string;
  round: number;
  a_moves: number[];
  b_moves: number[];
  a_score: number;
  b_score: number;
  a_ready: boolean;
  b_ready: boolean;
};

export const ANSWER_SECONDS = 300;
export const PRESENT_SECONDS = 60;
export const VOTE_SECONDS = 30;
export const PD_ROUNDS = 4; // all-cooperate = 12 points, the same as a perfect normal question
export const MATCH_SECONDS = 180;
