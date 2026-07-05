import Link from "next/link";
import Image from "next/image";
import { getTeams } from "@/lib/data";
import { getLiveTournament } from "@/lib/fifa";
import { getLiveOdds } from "@/lib/liveOdds";
import { flagUrl } from "@/lib/flags";
import type { LiveMatch, MatchPhase } from "@/lib/types";
import InsightsCard, {
  type InsightRow,
} from "@/components/dashboard/InsightsCard";
import SimulatorCard, {
  type SimStandingRow,
  type UpcomingMatchInfo,
} from "@/components/dashboard/SimulatorCard";
import StandingsCard, {
  type StandingRow,
} from "@/components/dashboard/StandingsCard";
import ForecastCard, {
  type ForecastMatch,
  type ForecastSide,
} from "@/components/dashboard/ForecastCard";
import {
  CalendarIcon,
  ExpandIcon,
  GaugeIcon,
  RefreshIcon,
  SlidersIcon,
  SparklesIcon,
  TargetIcon,
} from "@/components/dashboard/icons";

const MILESTONES: Record<
  MatchPhase,
  { key: "quarterfinal" | "semifinal" | "final" | "champion"; label: string }
> = {
  "Group stage": { key: "quarterfinal", label: "quarterfinals" },
  "Round of 32": { key: "quarterfinal", label: "quarterfinals" },
  "Round of 16": { key: "quarterfinal", label: "quarterfinals" },
  Quarterfinal: { key: "semifinal", label: "semifinals" },
  Semifinal: { key: "final", label: "final" },
  "Third place": { key: "champion", label: "title" },
  Final: { key: "champion", label: "title" },
};

function fmtKickoff(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const time = d.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${day} · ${time} UTC`;
}

function IconButton({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="glass-chip flex h-9 w-9 items-center justify-center rounded-xl text-white/75 transition hover:text-white"
    >
      {children}
    </Link>
  );
}

export default async function HomePage() {
  const [teams, live, odds] = await Promise.all([
    getTeams(),
    getLiveTournament(),
    getLiveOdds(),
  ]);

  const byCode = Object.fromEntries(teams.map((t) => [t.code, t]));
  const teamName = (code: string | null) =>
    (code && byCode[code]?.name) || code || "TBD";

  const played = live.matches.filter((m) => m.status === "played");
  const liveNow = live.matches.filter(
    (m) => m.status === "live" && m.homeCode && m.awayCode,
  );
  const scheduled = live.matches.filter((m) => m.status === "scheduled");

  /* ---- headline stats ---- */
  const totalGoals = played.reduce(
    (s, m) => s + (m.homeScore ?? 0) + (m.awayScore ?? 0),
    0,
  );
  const goalsPerMatch = played.length ? totalGoals / played.length : 0;
  const peakGoals = played.reduce(
    (mx, m) => Math.max(mx, (m.homeScore ?? 0) + (m.awayScore ?? 0)),
    0,
  );

  /* ---- team of the day: strongest surviving title contender ---- */
  const aliveRanked = live.alive
    .map((code) => byCode[code])
    .filter(Boolean)
    .sort(
      (a, b) =>
        (odds.byTeam[b.code]?.champion ?? 0) -
        (odds.byTeam[a.code]?.champion ?? 0),
    );
  const favorite = aliveRanked[0];
  const powerScore = Math.round(
    (100 * teams.filter((t) => t.powerRating < favorite.powerRating).length) /
      Math.max(1, teams.length - 1),
  );

  /* ---- real group letters from FIFA's draw (teams.json letters are model-assigned) ---- */
  const fifaGroupOf: Record<string, string> = {};
  for (const m of live.matches) {
    if (m.phase !== "Group stage" || !m.group) continue;
    if (m.homeCode) fifaGroupOf[m.homeCode] = m.group;
    if (m.awayCode) fifaGroupOf[m.awayCode] = m.group;
  }

  /* ---- progression insights per group ---- */
  const milestone = MILESTONES[live.currentPhase];
  const insightsByGroup: Record<string, InsightRow[]> = {};
  for (const t of teams) {
    const status = live.status[t.code];
    const out = status?.kind === "eliminated";
    const pct = out
      ? 0
      : status?.kind === "champion"
        ? 100
        : 100 * (odds.byTeam[t.code]?.[milestone.key] ?? 0);
    (insightsByGroup[fifaGroupOf[t.code] ?? t.group] ??= []).push({
      code: t.code,
      name: t.name,
      pct,
      out,
    });
  }
  const groupLetters = Object.keys(insightsByGroup).sort();
  const orderedInsights: Record<string, InsightRow[]> = {};
  for (const g of groupLetters) {
    orderedInsights[g] = insightsByGroup[g].sort((a, b) => b.pct - a.pct);
  }

  /* ---- real group standings from played group-stage matches ---- */
  type Acc = StandingRow & { gf: number; ga: number };
  const table: Record<string, Record<string, Acc>> = {};
  for (const m of played) {
    if (
      m.phase !== "Group stage" ||
      !m.group ||
      !m.homeCode ||
      !m.awayCode ||
      m.homeScore == null ||
      m.awayScore == null
    ) {
      continue;
    }
    const rows = (table[m.group] ??= {});
    for (const side of ["home", "away"] as const) {
      const code = side === "home" ? m.homeCode : m.awayCode;
      const gf = side === "home" ? m.homeScore : m.awayScore;
      const ga = side === "home" ? m.awayScore : m.homeScore;
      const row = (rows[code] ??= {
        code,
        name: teamName(code),
        w: 0,
        d: 0,
        l: 0,
        pts: 0,
        gf: 0,
        ga: 0,
      });
      row.gf += gf;
      row.ga += ga;
      if (gf > ga) {
        row.w += 1;
        row.pts += 3;
      } else if (gf === ga) {
        row.d += 1;
        row.pts += 1;
      } else {
        row.l += 1;
      }
    }
  }
  const standingsByGroup: Record<string, StandingRow[]> = {};
  const simByGroup: Record<string, SimStandingRow[]> = {};
  for (const g of Object.keys(table).sort()) {
    const rows = Object.values(table[g]).sort(
      (a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf,
    );
    standingsByGroup[g] = rows.map((r) => ({
      code: r.code,
      name: r.name,
      w: r.w,
      d: r.d,
      l: r.l,
      pts: r.pts,
    }));
    simByGroup[g] = rows.map((r) => ({
      code: r.code,
      name: r.name,
      pts: r.pts,
      pct: 100 * (byCode[r.code]?.predictions.roundOf32 ?? 0),
    }));
  }
  const initialGroup =
    (favorite && fifaGroupOf[favorite.code]) ??
    Object.keys(standingsByGroup)[0] ??
    "A";

  /* ---- match probabilities ---- */
  const power = (code: string | null) =>
    (code && byCode[code]?.powerRating) || 0;
  const matchPcts = (m: LiveMatch) => {
    if (m.status === "played") {
      const homeWon = m.winnerCode === m.homeCode;
      return {
        homePct: homeWon ? 100 : 0,
        drawPct: 0,
        awayPct: homeWon ? 0 : 100,
      };
    }
    const p =
      odds.matchHomeWinProb[m.matchNumber] ??
      1 / (1 + Math.exp(-(power(m.homeCode) - power(m.awayCode))));
    // knockout ties are settled on penalties; only group games can end level
    const drawPct = m.phase === "Group stage" ? 24 : 0;
    return {
      homePct: (100 - drawPct) * p,
      drawPct,
      awayPct: (100 - drawPct) * (1 - p),
    };
  };

  /* ---- upcoming matches, in kickoff order ---- */
  const upcomingQueue = scheduled
    .filter((m) => m.homeCode && m.awayCode)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  /* ---- featured match for the forecast card ---- */
  const featured =
    liveNow[0] ??
    upcomingQueue[0] ??
    [...played].reverse().find((m) => m.homeCode && m.awayCode) ??
    null;

  /* the simulator panel shows the next fixture not already featured */
  const queueOffset = featured === upcomingQueue[0] ? 1 : 0;
  const upcoming = upcomingQueue[queueOffset] ?? upcomingQueue[0] ?? null;
  let upcomingInfo: UpcomingMatchInfo | null = null;
  if (upcoming) {
    const { homePct, drawPct, awayPct } = matchPcts(upcoming);
    upcomingInfo = {
      dateLabel: fmtKickoff(upcoming.date),
      phase: upcoming.phase,
      homeCode: upcoming.homeCode!,
      homeName: teamName(upcoming.homeCode),
      awayCode: upcoming.awayCode!,
      awayName: teamName(upcoming.awayCode),
      homePct,
      drawPct,
      awayPct,
    };
  }
  const nextUp = upcomingQueue[queueOffset + 1] ?? null;
  const nextLabel = nextUp
    ? `${nextUp.homeCode} vs ${nextUp.awayCode} · ${fmtKickoff(nextUp.date)}`
    : null;

  const PHASE_SHORT: Record<MatchPhase, string> = {
    "Group stage": "GS",
    "Round of 32": "R32",
    "Round of 16": "R16",
    Quarterfinal: "QF",
    Semifinal: "SF",
    "Third place": "3rd",
    Final: "F",
  };

  const sideDetail = (code: string): ForecastSide => {
    const t = byCode[code];
    let goalsFor = 0;
    let goalsAgainst = 0;
    const path = played
      .filter(
        (m) =>
          (m.homeCode === code || m.awayCode === code) &&
          m.homeScore != null &&
          m.awayScore != null,
      )
      .map((m) => {
        const isHome = m.homeCode === code;
        const gf = isHome ? m.homeScore! : m.awayScore!;
        const ga = isHome ? m.awayScore! : m.homeScore!;
        goalsFor += gf;
        goalsAgainst += ga;
        return {
          phase: PHASE_SHORT[m.phase],
          result: `${gf}-${ga} vs ${isHome ? m.awayCode : m.homeCode}`,
        };
      })
      .reverse();
    return {
      code,
      name: teamName(code),
      results: path.slice(0, 2).map((p) => p.result),
      path,
      profile: {
        rank: t?.fifaRank ?? 0,
        attack: t?.attackRating ?? 0,
        defense: t?.defenseRating ?? 0,
        power: t?.powerRating ?? 0,
      },
      championPct: 100 * (odds.byTeam[code]?.champion ?? 0),
      finalPct: 100 * (odds.byTeam[code]?.final ?? 0),
      goalsFor,
      goalsAgainst,
    };
  };

  let forecast: ForecastMatch | null = null;
  if (featured) {
    const { homePct, drawPct, awayPct } = matchPcts(featured);
    forecast = {
      phaseLabel: `${featured.phase}${featured.group ? ` · Group ${featured.group}` : ""}`,
      venue: featured.venue
        ? `${featured.venue}${featured.city ? ` · ${featured.city}` : ""}`
        : null,
      home: sideDetail(featured.homeCode!),
      away: sideDetail(featured.awayCode!),
      scoreLabel:
        featured.status === "scheduled"
          ? "VS"
          : `${featured.homeScore ?? 0} - ${featured.awayScore ?? 0}`,
      status:
        featured.status === "live"
          ? { kind: "live", minute: featured.matchTime }
          : featured.status === "played"
            ? { kind: "ft" }
            : { kind: "kickoff", label: fmtKickoff(featured.date) },
      homePct,
      drawPct,
      awayPct,
    };
  }

  return (
    <>
      <div className="wc-dash min-h-screen">
        <div className="mx-auto max-w-[1760px] px-4 pt-20 pb-4 xl:px-6 xl:pt-4">
          <div className="grid gap-4 xl:grid-rows-[auto_1fr] xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_minmax(300px,360px)]">
            {/* ------------------------------ hero logo ------------------------------
                 first in DOM so it's the first thing seen on mobile (stacked
                 layout, above the dashboard card); pinned to the top of the
                 center column, above the simulator, once the xl 3-column
                 layout kicks in */}
            <div
              className="relative flex items-center justify-center overflow-hidden py-4 xl:col-start-2 xl:row-start-1 xl:-mb-7.5 xl:pt-16"
              style={{ minHeight: "260px", maxHeight: "620px" }}
            >
              <Image
                src="/logo-fifa.png"
                alt="FIFA World Cup 26"
                width={1536}
                height={1024}
                unoptimized
                priority
                className="wc-logo-mask h-auto w-[100%] max-w-none xl:w-[132%]"
              />
            </div>

            {/* ------------------------------ left column ------------------------------ */}
            <aside
              className="flex flex-col gap-3 xl:col-start-1 xl:row-start-1 xl:row-span-2"
              style={{
                WebkitBackdropFilter: "blur(32px)",
                backdropFilter: "blur(32px)",
                padding: "17px",
                borderRadius: "24px",
                background: "#ffffff0e",

                border: "1px solid #ffffff17",
              }}
            >
              <div className="glass rounded-3xl p-5">
                <div className="flex items-start justify-between">
                  <span
                    className=" block h-14 w-14 overflow-hidden rounded-2xl"
                    style={{ marginLeft: "-12px" }}
                  >
                    <Image
                      src="/logo-fifa.png"
                      alt="FIFA World Cup 26"
                      width={1536}
                      height={1024}
                      unoptimized
                      className="h-full w-full scale-[1] object-cover object-[50%_44%]"
                      priority
                    />
                  </span>
                  <div className="flex gap-2">
                    <IconButton href="/methodology" title="How the model works">
                      <SlidersIcon className="h-4 w-4" />
                    </IconButton>
                    <IconButton href="/history" title="Tournament history">
                      <RefreshIcon className="h-4 w-4" />
                    </IconButton>
                    <IconButton href="/bracket" title="Full bracket">
                      <ExpandIcon className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
                <p className="mt-4 text-[11px] font-medium tracking-[0.22em] text-white/60">
                  FIFA WORLD CUP 2026
                </p>
                <h1 className="mt-1 text-[26px] leading-[1.15] font-medium tracking-tight">
                  Intelligent Analytics Dashboard{" "}
                  <SparklesIcon className="inline h-4 w-4 text-white/70" />
                </h1>
                <p className="mt-2 text-sm leading-relaxed font-light text-white/55">
                  AI-powered real-time insights for the world&apos;s biggest
                  football tournament — live from the{" "}
                  {live.currentPhase.toLowerCase()}.
                </p>
              </div>

              <div className="glass rounded-3xl p-5">
                <div className="flex items-start justify-between">
                  <p className="text-base font-medium">Scoring Intensity</p>
                  <span className="glass-chip flex h-9 w-9 items-center justify-center rounded-full text-white/75">
                    <GaugeIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="tabular text-5xl font-semibold tracking-tight">
                    {goalsPerMatch.toFixed(1)}
                  </span>
                  <span className="text-xs text-white/50">Average</span>
                </p>
                <p className="mt-1.5 text-sm font-light text-white/55">
                  Match peak{" "}
                  <span className="tabular text-teal-300">{peakGoals}</span>{" "}
                  goals
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-3xl p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium">Goals</p>
                    <span className="glass-chip flex h-8 w-8 items-center justify-center rounded-full text-white/75">
                      <TargetIcon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="tabular text-4xl font-semibold tracking-tight">
                      {totalGoals}
                    </span>
                    <span className="text-xs text-emerald-400">goals</span>
                  </p>
                  <p className="mt-1 text-xs font-light text-white/50">
                    {goalsPerMatch.toFixed(1)} per match
                  </p>
                </div>
                <div className="glass rounded-3xl p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium">Matches</p>
                    <span className="glass-chip flex h-8 w-8 items-center justify-center rounded-full text-white/75">
                      <CalendarIcon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="tabular text-4xl font-semibold tracking-tight">
                      {played.length}
                    </span>
                    <span className="text-xs text-emerald-400">
                      {liveNow.length > 0 ? `${liveNow.length} live` : "played"}
                    </span>
                  </p>
                  <p className="mt-1 text-xs font-light text-white/50">
                    {scheduled.length} upcoming
                  </p>
                </div>
              </div>

              <Link
                href={`/teams/${favorite.code.toLowerCase()}`}
                className="block rounded-3xl bg-gradient-to-br from-[#5b8cff] via-[#3f6cf0] to-[#2a4fd0] p-4 transition hover:brightness-110"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white/90">
                    AI · Team of the Day
                  </p>
                  <span className="rounded-xl border border-white/25 bg-white/15 px-2.5 py-1 text-center">
                    <span className="block text-[10px] leading-none text-white/75">
                      Score
                    </span>
                    <span className="tabular block text-lg leading-tight font-semibold">
                      {powerScore}
                    </span>
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <Image
                    src={flagUrl(favorite.code, 4)}
                    alt={`${favorite.name} flag`}
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] shrink-0 rounded-full object-cover ring-2 ring-white/40"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-3xl font-semibold tracking-tight">
                      {favorite.name}
                    </p>
                    <p className="mt-1 text-[11px] tracking-[0.14em] text-white/75 uppercase">
                      {favorite.code} · {favorite.confederation} · FIFA #
                      {favorite.fifaRank}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="mt-1 flex items-center justify-between px-1">
                <h2 className="text-xl font-medium">Predictive Insights</h2>
                <Link
                  href="/rankings"
                  className="text-sm text-white/60 hover:text-white"
                >
                  View all
                </Link>
              </div>
              <InsightsCard
                byGroup={orderedInsights}
                initialGroup={initialGroup}
                milestone={milestone.label}
              />
            </aside>

            {/* ------------------------------ center column: simulator ------------------------------
                 the pill nav that used to sit here now lives in the root
                 layout, so it persists across navigations */}
            <div className="xl:col-start-2 xl:row-start-2">
              <SimulatorCard
                byGroup={simByGroup}
                initialGroup={initialGroup}
                match={upcomingInfo}
                nextLabel={nextLabel}
              />
            </div>

            {/* ------------------------------ right column ------------------------------ */}
            <aside className="flex flex-col gap-4 xl:col-start-3 xl:row-start-1 xl:row-span-2">
              {forecast && <ForecastCard match={forecast} />}
              <StandingsCard
                byGroup={standingsByGroup}
                initialGroup={initialGroup}
              />
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
