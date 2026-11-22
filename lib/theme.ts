// "Game Night Press" design tokens shared by projector and phone.

export const C = {
  paper: "#F4EFE6",
  paper2: "#FBF8F2",
  ink: "#17161C",
  ink2: "#3D3A47",
  muted: "#5E5A69",
  faint: "#8E8798",
  line: "#D6CDBE",
  verm: "#EE5536",
  vermDark: "#B8321C",
  cobalt: "#2B44D1",
  cobaltLight: "#8FA2FF",
  mari: "#FFC531",
  played: "#EAE3D6",
} as const;

/** Team game pieces: color + shape, in palette order (index = team color index). */
export const TOKENS = [
  { color: "#FF6B4A", shape: "Circle", d: "M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0Z" },
  { color: "#6C8CFF", shape: "Square", d: "M5 5h14v14H5Z" },
  { color: "#34C77B", shape: "Triangle", d: "M12 3.5L21 19.5H3Z" },
  { color: "#FFC531", shape: "Diamond", d: "M12 2.5L21.5 12L12 21.5L2.5 12Z" },
  { color: "#B58CFF", shape: "Hexagon", d: "M12 2.8L20 7.4V16.6L12 21.2L4 16.6V7.4Z" },
  { color: "#FF7FB8", shape: "Star", d: "M12 2.5L14.8 9H21.6L16.1 13.1L18.2 20L12 15.8L5.8 20L7.9 13.1L2.4 9H9.2Z" },
  { color: "#22C3C0", shape: "Plus", d: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" },
  { color: "#FF9838", shape: "Dome", d: "M2.5 17a9.5 9.5 0 0 1 19 0Z" },
  { color: "#8F86F0", shape: "Ring", d: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0Z M7.5 12a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0Z" },
  { color: "#A6D93A", shape: "Bolt", d: "M13.5 2L4.5 13.5H11L9.5 22L19.5 9.5H13Z" },
];

/** Token for a team: by its stored color, falling back to its position (older teams). */
export function tokenFor(team: { color: string } | undefined, index = 0) {
  const i = team ? TOKENS.findIndex((t) => t.color.toLowerCase() === team.color.toLowerCase()) : -1;
  return TOKENS[i >= 0 ? i : index % TOKENS.length];
}

/** Line icons for the question cards (24×24, stroked). */
export const QUESTION_ICONS: Record<string, string> = {
  "1a": "M3.5 20V6h5v14M9.5 20V6h5v14M15.5 20V6h5v14M2 20h20",
  "1b": "M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9M8.5 6.5h7M8.5 17.5h7",
  "1c": "M9 3.5h6v5.5h5.5v6H15v5.5H9V15H3.5V9H9z",
  "2a": "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9zM12 11.2v1.6",
  "2b": "M3.5 3.5h17v17h-17zM12 3.5v17M3.5 12h17",
  "3a": "M12 3.5v17M7 20.5h10M4 7h16M6 7l-3 6.5h6zM18 7l-3 6.5h6zM3 13.5a3 2 0 0 0 6 0M15 13.5a3 2 0 0 0 6 0",
  bullets:
    "M12 2.5c1 0 1.6 1.2 1.6 3V10l7.4 4v2l-7.4-2v4.5l2.4 1.7V22L12 21l-4 1v-1.8l2.4-1.7V14L3 16v-2l7.4-4V5.5c0-1.8.6-3 1.6-3z",
  voting: "M12 12c-2-2.6-3.5-4-5.5-4a4 4 0 0 0 0 8c2 0 3.5-1.4 5.5-4zm0 0c2 2.6 3.5 4 5.5 4a4 4 0 0 0 0-8c-2 0-3.5 1.4-5.5 4z",
};

export const fmt1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
export const LETTERS = "ABCDEFGH";
