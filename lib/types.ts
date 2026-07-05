export type Pair = {
  id: string;
  case_id: string;
  model: string;
  problem: string;
  triz: string;
  control: string;
};

// Server-side round (knows which side is TRIZ)
export type Round = {
  pairId: string;
  caseId: string;
  model: string;
  problem: string;
  left: string;
  right: string;
  trizSide: "left" | "right";
};

// What the browser receives — note: NO arm labels, only an opaque signed token.
export type ClientRound = {
  roundIndex: number;
  problem: string;
  left: string;
  right: string;
  token: string;
};

export type StoredResponse = {
  sessionId: string;
  raterLabel?: string | null;
  expertise?: string | null;
  pairId: string;
  caseId: string;
  model: string;
  trizSide: string;
  chosenSide: string;
  chosenArm: "triz" | "control";
  roundIndex: number;
  timeMs: number;
  userAgent?: string | null;
};
