import { cache } from "react";
import type { LiveMatch, LiveTournament, MatchPhase, TeamStatus } from "./types";

const MATCHES_URL =
  "https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&language=en&count=200";

const PHASE_BY_STAGE_NAME: Record<string, MatchPhase> = {
  "First Stage": "Group stage",
  "Round of 32": "Round of 32",
  "Round of 16": "Round of 16",
  "Quarter-final": "Quarterfinal",
  "Semi-final": "Semifinal",
  "Play-off for third place": "Third place",
  Final: "Final",
};

const PHASE_ORDER: MatchPhase[] = [
  "Group stage",
  "Round of 32",
  "Round of 16",
  "Quarterfinal",
  "Semifinal",
  "Third place",
  "Final",
];

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseMatch(raw: any): LiveMatch {
  const stageName: string = raw.StageName?.[0]?.Description ?? "";
  const phase = PHASE_BY_STAGE_NAME[stageName] ?? "Group stage";
  const status: LiveMatch["status"] =
    raw.MatchStatus === 0 ? "played" : raw.MatchStatus === 3 ? "live" : "scheduled";

  const winnerId: string | null = raw.Winner ?? null;
  let winnerCode: string | null = null;
  if (winnerId) {
    if (raw.Home?.IdTeam === winnerId) winnerCode = raw.Home.Abbreviation;
    else if (raw.Away?.IdTeam === winnerId) winnerCode = raw.Away.Abbreviation;
  }

  return {
    matchNumber: raw.MatchNumber,
    phase,
    group: raw.GroupName?.[0]?.Description?.replace("Group ", "") ?? null,
    date: raw.Date,
    status,
    homeCode: raw.Home?.Abbreviation ?? null,
    awayCode: raw.Away?.Abbreviation ?? null,
    homeName: raw.Home?.TeamName?.[0]?.Description ?? null,
    awayName: raw.Away?.TeamName?.[0]?.Description ?? null,
    homeScore: raw.Home?.Score ?? null,
    awayScore: raw.Away?.Score ?? null,
    homePenalties: raw.HomeTeamPenaltyScore ?? null,
    awayPenalties: raw.AwayTeamPenaltyScore ?? null,
    winnerCode,
    venue: raw.Stadium?.Name?.[0]?.Description ?? null,
    city: raw.Stadium?.CityName?.[0]?.Description ?? null,
    matchTime: raw.MatchTime ?? null,
    homePlaceholder: raw.PlaceHolderA ?? null,
    awayPlaceholder: raw.PlaceHolderB ?? null,
    idStage: raw.IdStage,
    idMatch: raw.IdMatch,
    homeTeamId: raw.Home?.IdTeam ?? null,
    awayTeamId: raw.Away?.IdTeam ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function deriveStatuses(matches: LiveMatch[]): {
  alive: string[];
  status: Record<string, TeamStatus>;
  currentPhase: MatchPhase;
} {
  const allCodes = new Set<string>();
  const reached = new Map<string, MatchPhase>(); // deepest phase a team appears in
  const lostAt = new Map<string, MatchPhase>();

  const phaseIdx = (p: MatchPhase) => PHASE_ORDER.indexOf(p);

  for (const m of matches) {
    for (const side of ["home", "away"] as const) {
      const code = side === "home" ? m.homeCode : m.awayCode;
      if (!code) continue;
      allCodes.add(code);
      const prev = reached.get(code);
      if (!prev || phaseIdx(m.phase) > phaseIdx(prev)) reached.set(code, m.phase);
    }
    // knockout loser is eliminated at that phase
    if (m.status === "played" && m.winnerCode && m.phase !== "Group stage" && m.phase !== "Third place") {
      const loser = m.winnerCode === m.homeCode ? m.awayCode : m.homeCode;
      if (loser) lostAt.set(loser, m.phase);
    }
  }

  const finalMatch = matches.find((m) => m.phase === "Final");
  const championCode = finalMatch?.status === "played" ? finalMatch.winnerCode : null;

  // current phase = earliest phase with an unplayed match
  let currentPhase: MatchPhase = "Final";
  for (const p of PHASE_ORDER) {
    if (matches.some((m) => m.phase === p && m.status !== "played")) {
      currentPhase = p;
      break;
    }
  }

  const status: Record<string, TeamStatus> = {};
  const alive: string[] = [];
  const groupStageDone = matches
    .filter((m) => m.phase === "Group stage")
    .every((m) => m.status === "played");

  for (const code of allCodes) {
    if (championCode && code === championCode) {
      status[code] = { kind: "champion" };
      continue;
    }
    const deepest = reached.get(code) ?? "Group stage";
    if (lostAt.has(code)) {
      status[code] = { kind: "eliminated", phase: lostAt.get(code)! };
    } else if (deepest === "Group stage" && groupStageDone) {
      // never advanced past groups and groups are over
      status[code] = { kind: "eliminated", phase: "Group stage" };
    } else if (championCode) {
      // tournament over; runner-up lost the final
      status[code] = { kind: "eliminated", phase: deepest };
    } else {
      status[code] = { kind: "alive", phase: deepest };
      alive.push(code);
    }
  }

  return { alive: alive.sort(), status, currentPhase };
}

/**
 * Live tournament state from FIFA's public API.
 * Revalidated every 2 minutes; deduped per request via React cache.
 */
export const getLiveTournament = cache(async (): Promise<LiveTournament> => {
  const res = await fetch(MATCHES_URL, { next: { revalidate: 120 } });
  if (!res.ok) {
    throw new Error(`FIFA API responded ${res.status}`);
  }
  const data = await res.json();
  const matches: LiveMatch[] = (data.Results ?? [])
    .map(parseMatch)
    .sort((a: LiveMatch, b: LiveMatch) => a.matchNumber - b.matchNumber);

  const { alive, status, currentPhase } = deriveStatuses(matches);

  return {
    fetchedAt: new Date().toISOString(),
    matches,
    alive,
    status,
    currentPhase,
  };
});
