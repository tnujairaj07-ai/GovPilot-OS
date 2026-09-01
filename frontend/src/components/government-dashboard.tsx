// frontend/src/components/government-dashboard.tsx
"use client";

import * as React from "react";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  Loading,
  SectionLabel,
  StatCard,
  Table,
  Tabs,
  Tag,
  Textarea,
} from "./ui";
import {
  AchievementBar,
  Chips,
  CriterionBars,
  KpiRow,
  MilestoneStrip,
  SectorBadge,
  ScoreChip,
  StatusBadge,
} from "./shared";
import {
  assignExperts,
  batchProposalDecision,
  createChallenge,
  createPilotFromProposal,
  createScaleDecision,
  fetchCurrentUser,
  fetchDashboard,
  fetchExperts,
  kpiAchievement,
  releaseMilestonePayment,
  releasePayment,
  setProposalStatus,
  verifySnapshot,
} from "@/lib/api";
import { buildPilotViews, type PilotView } from "@/lib/derive";
import { formatInrCompact, humanise, relativeDeadline } from "@/lib/utils";
import { CreateChallengeWizard } from "./create-challenge-wizard";
import type { Challenge, DashboardData, Milestone, Proposal, Sector, User } from "@/lib/types";

const GOV_DEPARTMENTS = [
  "Public Works Department (PWD)",
  "Urban Development Department",
  "Water Resources Department",
  "Environment & Climate Change Department",
  "MahaRERA",
];
const GOV_DISTRICTS = [
  "Mumbai",
  "Pune",
  "Nagpur",
  "Nashik",
  "Aurangabad",
  "Konkan",
  "Thane",
  "Kolhapur",
];
const SECTORS: Sector[] = ["PWD", "Urban Waste", "Water Quality"];

export function GovernmentDashboard() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [tab, setTab] = React.useState("overview");
  const [busy, setBusy] = React.useState(false);
  const [challengeOpen, setChallengeOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const refresh = React.useCallback(async () => {
    const [d, u] = await Promise.all([fetchDashboard(), fetchCurrentUser()]);
    setData(d);
    setUser(u);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const q = query.trim().toLowerCase();
  const filtered: DashboardData | null = React.useMemo(() => {
    if (!data) return null;
    if (!q) return data;
    const matches = (...fields: (string | undefined)[]) =>
      fields.some((f) => f?.toLowerCase().includes(q));
    return {
      ...data,
      challenges: data.challenges.filter((c) =>
        matches(c.title, c.challenge_code, c.sector, c.department, c.problem_statement, c.district),
      ),
      proposals: data.proposals.filter((p) =>
        matches(p.title, p.startup_name, p.startup_org, p.challenge_title, p.status, p.description, p.solution_approach),
      ),
      pilots: data.pilots.filter((p) =>
        matches(p.title, p.startup_name, p.district, p.work_order_no, p.summary),
      ),
      kpis: data.kpis.filter((k) =>
        matches(k.name, k.description, k.target_description, k.unit, k.owner),
      ),
    };
  }, [data, q]);

  if (!data || !user || !filtered) return <Loading label="Loading Government dashboard…" />;

  const pendingProposals = data.proposals.filter((p) =>
    ["submitted", "under_review", "draft"].includes(p.status),
  );
  const openChallenges = data.challenges.filter((c) => c.status === "open");
  const activePilots = data.pilots.filter((p) =>
    ["active", "in_pilot", "signed"].includes(p.status),
  );
  const totalAllocated = data.pilots.reduce((s, p) => s + (Number(p.budget_allocated) || 0), 0);
  const totalSpent = data.pilots.reduce((s, p) => s + (Number(p.budget_spent) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">Government Officer Console</h2>
          <p className="text-sm text-slate-500">
            {user.organization ?? "Maharashtra State Innovation Society"} · formulate outcome-based
            challenges, shortlist startups and track pilots against KPIs.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Compact Top Search Filter Bar */}
          <div className="relative w-56 sm:w-64">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="9" r="6" />
                <path d="M14 14l4 4" />
              </svg>
            </span>
            <input
              className="w-full rounded border border-slate-300 bg-white py-1.5 pl-8 pr-12 text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-blue-600 focus:outline-hidden"
              placeholder="Filter across console..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {q && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                onClick={() => setQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <Button onClick={() => setChallengeOpen(true)}>+ New challenge</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Open challenges"
          value={openChallenges.length}
          hint={`${data.challenges.length} total challenges`}
        />
        <StatCard
          label="Proposals in review"
          value={pendingProposals.length}
          hint={`${data.proposals.length} total proposals`}
          tone={pendingProposals.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Active pilots"
          value={activePilots.length}
          hint={`${data.pilots.length} total pilots`}
          tone="success"
        />
        <StatCard
          label="Pilot spend (disbursed)"
          value={formatInrCompact(totalSpent)}
          hint={`${formatInrCompact(totalAllocated)} sanctioned`}
        />
      </div>

      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "challenges", label: `Challenges (${filtered.challenges.length})` },
          { id: "proposals", label: `Proposals (${filtered.proposals.length})` },
          { id: "pilots", label: `Pilots (${filtered.pilots.length})` },
          { id: "kpis", label: `KPIs (${filtered.kpis.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <OverviewTab data={filtered} onOpen={(t) => setTab(t)} onRefresh={refresh} />
      )}
      {tab === "challenges" && <ChallengesTab data={filtered} onRefresh={refresh} />}
      {tab === "proposals" && <ProposalsTab data={filtered} onRefresh={refresh} />}
      {tab === "pilots" && <PilotsTab data={filtered} onRefresh={refresh} />}
      {tab === "kpis" && <KpiTab data={filtered} />}

      {challengeOpen && (
        <CreateChallengeWizard
          onClose={() => setChallengeOpen(false)}
          departmentName={user?.organization || "Department of Urban Development & Water Resources"}
          onCreated={async () => {
            setChallengeOpen(false);
            setBusy(true);
            await refresh();
            setBusy(false);
          }}
        />
      )}
      {busy && <Loading label="Working…" />}
    </div>
  );
}

/* ------------------------------ Overview --------------------------------- */

function formatIstDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm} (IST)`;
}

function ProposalGridCard({
  p,
  challenge,
  onOpenDetail,
}: {
  p: Proposal;
  challenge?: Challenge;
  onOpenDetail?: () => void;
}) {
  const proposalCode = `GEM/2026/P/${p.id.slice(-7).toUpperCase()}`;

  return (
    <div
      onClick={onOpenDetail}
      className="group relative flex flex-col justify-between rounded border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer border-t-[3px] border-t-blue-600 space-y-2.5"
    >
      <div className="space-y-1.5">
        {/* Header: Code & Sector Badge & Status */}
        <div className="flex items-center justify-between gap-1 text-[11px] flex-wrap">
          <span className="font-mono font-bold text-blue-700">{proposalCode}</span>
          <div className="flex items-center gap-1.5">
            {challenge?.sector && <SectorBadge sector={challenge.sector} />}
            <StatusBadge status={p.status} />
          </div>
        </div>

        {/* Title */}
        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-blue-700 transition-colors">
          {p.title}
        </h4>

        {/* Challenge Target & Startup info */}
        <div className="text-[11.5px] text-slate-600 space-y-0.5">
          <p className="line-clamp-1 text-slate-500">
            <span className="font-semibold text-slate-700">Target:</span> {challenge?.title ?? p.challenge_title ?? "Civic Innovation"}
          </p>
          <div className="flex items-center gap-1.5 text-slate-700 flex-wrap">
            <span className="font-medium text-slate-900">{p.startup_org ?? p.startup_name}</span>
            {p.startup_district && <span className="text-slate-400">· {p.startup_district}</span>}
            {p.dpiit_verified && (
              <span className="rounded bg-emerald-50 px-1 py-0.2 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                DPIIT ✓
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics & Footer */}
      <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px]">
        <div>
          <div className="text-[10px] text-slate-400 font-medium uppercase">Budget Ask</div>
          <div className="font-mono font-bold text-slate-900">{formatInrCompact(p.budget_estimate)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-medium uppercase">TRL / Time</div>
          <div className="font-semibold text-indigo-700">L{p.trl_level} · {p.timeline_weeks}w</div>
        </div>
        <div className="text-right">
          <ScoreChip value={p.weighted_score} count={p.evaluations_count} />
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  data,
  onOpen,
  onRefresh,
}: {
  data: DashboardData;
  onOpen: (tab: string) => void;
  onRefresh: () => void;
}) {
  const [selectedProposal, setSelectedProposal] = React.useState<Proposal | null>(null);

  const challengeMap = React.useMemo(() => {
    const map: Record<string, Challenge> = {};
    for (const c of data.challenges) map[c.id] = c;
    return map;
  }, [data.challenges]);

  const underReviewProposals = React.useMemo(
    () => data.proposals.filter((p) => ["submitted", "under_review", "draft"].includes(p.status)),
    [data.proposals]
  );
  const shortlistedProposals = React.useMemo(
    () => data.proposals.filter((p) => ["shortlisted", "piloting", "completed", "scaled"].includes(p.status)),
    [data.proposals]
  );
  const rejectedProposals = React.useMemo(
    () => data.proposals.filter((p) => p.status === "rejected"),
    [data.proposals]
  );

  const displayedProposals = data.proposals;

  const views = buildPilotViews(data);
  const atRisk = views.filter((v) => v.riskLevel === "high");
  const scaleReady = views.filter((v) => v.scaleReadiness === "ready");

  return (
    <div className="space-y-4">
      {/* Main Grid: 2 Columns for Proposals, 1 Column for Attention Required */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Main Left Content Stream (Cols 1-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* =================================================================== */}
          {/* PROPOSALS LIST (SCROLLABLE 2-COLUMN WINDOW)                        */}
          {/* =================================================================== */}
          <div className="space-y-2.5">
            {/* Scrollable Window for Proposals (2 Columns matching user sketch) */}
            <div className="rounded border-2 border-slate-300 bg-slate-100/60 p-3 shadow-inner">
              {displayedProposals.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No proposals found matching the selected filters.
                </div>
              ) : (
                <div className="max-h-[520px] overflow-y-auto pr-2 space-y-3 [scrollbar-width:thin]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {displayedProposals.map((p) => (
                      <ProposalGridCard
                        key={p.id}
                        p={p}
                        challenge={challengeMap[p.challenge_id]}
                        onOpenDetail={() => setSelectedProposal(p)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-0.5">
              <button
                className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1"
                onClick={() => onOpen("proposals")}
              >
                Open full DataTable proposals catalog ({data.proposals.length}) →
              </button>
              <span className="text-[11px] text-slate-400">
                ↕ Scroll inside window to browse all proposals
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Executive Attention Required */}
        <div className="space-y-4">
          <Card className="border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-100 bg-slate-50/75 p-3.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Executive Attention Required
                </h3>
              </div>
            </div>

            {/* Alert metric action rows */}
            <div className="p-4 space-y-2.5">
              {/* Open Challenges */}
              <button
                onClick={() => onOpen("challenges")}
                className="w-full flex items-center justify-between rounded border border-slate-200 bg-slate-50/70 p-2.5 text-xs transition-colors hover:bg-slate-100 text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                  <span className="font-semibold text-slate-700 group-hover:text-slate-900">Open challenges</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-slate-900 font-mono">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-900 text-[11px]">
                    {data.challenges.filter((c) => c.status === "open").length}
                  </span>
                  <span className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </button>

              {/* Proposals Awaiting Action */}
              <button
                onClick={() => onOpen("proposals")}
                className="w-full flex items-center justify-between rounded border border-amber-200/80 bg-amber-50/40 p-2.5 text-xs transition-colors hover:bg-amber-50 text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-100" />
                  <span className="font-semibold text-amber-950 group-hover:text-amber-900">Proposals under review</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold font-mono">
                  <span className="rounded bg-amber-200/80 px-2 py-0.5 text-amber-900 text-[11px]">
                    {underReviewProposals.length}
                  </span>
                  <span className="text-amber-600 group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </button>

              {/* Pilots at Risk */}
              <button
                onClick={() => onOpen("pilots")}
                className={`w-full flex items-center justify-between rounded border p-2.5 text-xs transition-colors text-left group ${
                  atRisk.length > 0
                    ? "border-red-200 bg-red-50/80 hover:bg-red-100/70"
                    : "border-slate-200 bg-slate-50/70 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ring-2 ${atRisk.length > 0 ? "bg-red-600 ring-red-200 animate-pulse" : "bg-slate-400 ring-slate-100"}`} />
                  <span className={`font-semibold ${atRisk.length > 0 ? "text-red-950" : "text-slate-700 group-hover:text-slate-900"}`}>
                    Pilots at risk
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-bold font-mono">
                  <span className={`rounded px-2 py-0.5 text-[11px] ${atRisk.length > 0 ? "bg-red-200 text-red-900 font-bold" : "bg-slate-200 text-slate-700"}`}>
                    {atRisk.length}
                  </span>
                  <span className={`${atRisk.length > 0 ? "text-red-600" : "text-slate-400"} group-hover:translate-x-0.5 transition-transform`}>→</span>
                </div>
              </button>

              {/* Scale-up Ready */}
              <button
                onClick={() => onOpen("pilots")}
                className="w-full flex items-center justify-between rounded border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs transition-colors hover:bg-emerald-50 text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 ring-2 ring-emerald-100" />
                  <span className="font-semibold text-emerald-950 group-hover:text-emerald-900">Scale-up ready (GeM)</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold font-mono">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 text-[11px]">
                    {scaleReady.length}
                  </span>
                  <span className="text-emerald-600 group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </button>

              {/* Official Outcome Contracts Callout */}
              <div className="mt-4 rounded-md border-l-4 border-l-slate-800 border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/90 p-3.5 text-xs text-slate-700 shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1.5 uppercase tracking-wide text-[11px]">
                  <span>🏛️</span>
                  <span>Outcome Contracts Protocol</span>
                </div>
                <p className="leading-relaxed text-[11.5px] text-slate-600">
                  Pilot budgets are disbursed strictly against <strong className="text-slate-900 font-semibold">verified KPI milestone evidence</strong>, not raw inputs. Validated pilots $(\ge 80\%)$ qualify for direct <strong className="text-slate-900 font-semibold">GeM Startup Runway scale-up</strong>.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {selectedProposal && (
        <ProposalDetail
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onChanged={onRefresh}
        />
      )}
    </div>
  );
}

/* ------------------------------ Challenges ------------------------------- */

function ChallengesTab({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  const [open, setOpen] = React.useState<Challenge | null>(null);

  const proposalCountByChallenge = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of data.proposals) map[p.challenge_id] = (map[p.challenge_id] ?? 0) + 1;
    return map;
  }, [data.proposals]);

  const filteredChallenges = data.challenges;

  return (
    <div className="space-y-4">
      {/* Grid of GeM/e-Tender Styled Challenge Cards */}
      {filteredChallenges.length === 0 ? (
        <Card className="p-8 text-center bg-white border border-slate-200">
          <EmptyState title="No challenges found" hint="No challenges match the selected sector and status filters." />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 items-stretch">
          {filteredChallenges.map((c) => {
            const proposalCount = proposalCountByChallenge[c.id] ?? 0;
            const deadlineText = c.submission_deadline
              ? relativeDeadline(c.submission_deadline)
              : "Ongoing";

            return (
              <div
                key={c.id}
                onClick={() => setOpen(c)}
                className="group relative flex flex-col justify-between border border-slate-200 bg-white shadow-xs transition-all duration-200 hover:shadow-md hover:border-slate-300 border-t-[3px] border-t-blue-600 rounded-none md:rounded-xs cursor-pointer"
              >
                <div>
                  {/* Top Header Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">CHALLENGE ID:</span>
                      <span className="font-mono font-bold text-blue-700">{c.challenge_code}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <SectorBadge sector={c.sector} />
                      <StatusBadge status={c.status} />
                    </div>
                  </div>

                  {/* Card Main Body */}
                  <div className="p-4 space-y-3">
                    {/* Title */}
                    <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                      {c.title}
                    </h3>

                    {/* Department and Location Box */}
                    <div className="rounded bg-slate-50 border border-slate-100 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 truncate">{c.department}</span>
                        <span className="text-slate-500 shrink-0 font-medium">{c.district ?? "Statewide"}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        Sponsoring Authority · MSINS Maharashtra
                      </div>
                    </div>

                    {/* Problem Statement Snippet */}
                    <p className="line-clamp-3 text-xs text-slate-600 leading-relaxed">
                      {c.problem_statement}
                    </p>

                    {/* 3 Metric Highlight Tiles */}
                    <div className="grid grid-cols-3 gap-2 border-y border-slate-100 py-2.5 text-center text-xs">
                      <div className="border-r border-slate-100 pr-1">
                        <div className="text-[10.5px] font-medium text-slate-500 uppercase tracking-tight">Budget Envelope</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5 text-xs">
                          {formatInrCompact(c.budget_min)}–{formatInrCompact(c.budget_max)}
                        </div>
                      </div>
                      <div className="border-r border-slate-100 px-1">
                        <div className="text-[10.5px] font-medium text-slate-500 uppercase tracking-tight">Pilot Duration</div>
                        <div className="font-bold text-slate-900 mt-0.5 text-xs">
                          {c.duration_weeks} wks
                        </div>
                      </div>
                      <div className="pl-1">
                        <div className="text-[10.5px] font-medium text-slate-500 uppercase tracking-tight">Proposals</div>
                        <div className="font-mono font-bold text-blue-700 mt-0.5 text-xs">
                          {proposalCount} submitted
                        </div>
                      </div>
                    </div>

                    {/* Key Outcome Target */}
                    {c.outcome_targets && c.outcome_targets.length > 0 && (
                      <div className="text-[11.5px] text-slate-600 bg-blue-50/40 border border-blue-100/60 rounded p-2 flex items-start gap-2">
                        <span className="text-blue-600 font-bold shrink-0">🎯 Target:</span>
                        <span className="line-clamp-1 font-medium text-slate-800">
                          {c.outcome_targets[0].statement}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Strip */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="text-slate-400">📅 Deadline:</span>
                    <span className="font-semibold text-amber-700">{deadlineText}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(c);
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    <span>View Details</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && <ChallengeDetail challenge={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ChallengeDetail({ challenge, onClose }: { challenge: Challenge; onClose: () => void }) {
  return (
    <Dialog title={challenge.title} onClose={onClose} width="max-w-2xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <SectorBadge sector={challenge.sector} />
          <StatusBadge status={challenge.status} />
          <Tag>{challenge.msins_programme ?? "MSINS"}</Tag>
        </div>
        <div>
          <SectionLabel>Problem statement</SectionLabel>
          <p className="mt-1 text-sm text-slate-700">{challenge.problem_statement}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Desired outcomes">
            <p className="text-sm">{challenge.desired_outcomes}</p>
          </Field>
          <Field label="Success criteria">
            <p className="text-sm">{challenge.success_criteria}</p>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Pilot budget" value={`${formatInrCompact(challenge.budget_min)}–${formatInrCompact(challenge.budget_max)}`} />
          <Stat label="Department" value={challenge.department} />
          <Stat label="Deadline" value={challenge.submission_deadline ? relativeDeadline(challenge.submission_deadline) : "—"} />
          <Stat label="Code" value={challenge.challenge_code} />
        </div>
        {challenge.outcome_targets.length > 0 && (
          <div>
            <SectionLabel>Outcome targets (KPI-linked)</SectionLabel>
            <div className="mt-2 space-y-2">
              {challenge.outcome_targets.map((ot) => (
                <div key={ot.id} className="rounded-md border border-slate-100 p-3 text-sm">
                  <p className="font-medium">{ot.statement}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Baseline: {ot.baseline} · Target: {ot.target} · Method: {ot.measurement_method}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        <Chips
          items={[
            challenge.eligibility.dpiit_required ? "DPIIT recognition required" : undefined,
            `Min TRL ${challenge.eligibility.min_trl}`,
            challenge.eligibility.maharashtra_presence_required
              ? "Maharashtra presence required"
              : undefined,
          ]}
        />
      </div>
    </Dialog>
  );
}

/* ------------------------------ Proposals -------------------------------- */

function ProposalsTab({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  const [status, setStatus] = React.useState("all");
  const [open, setOpen] = React.useState<Proposal | null>(null);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [sortField, setSortField] = React.useState<"sno" | "title" | "challenge" | "ask" | "score" | "status">("sno");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  const challengeMap = React.useMemo(() => {
    const map: Record<string, Challenge> = {};
    for (const c of data.challenges) map[c.id] = c;
    return map;
  }, [data.challenges]);

  // Filter by status tab
  const filtered = React.useMemo(() => {
    let list = data.proposals;
    if (status === "under_review") {
      list = data.proposals.filter((p) => ["submitted", "under_review", "draft"].includes(p.status));
    } else if (status === "shortlisted") {
      list = data.proposals.filter((p) => ["shortlisted", "piloting", "completed", "scaled"].includes(p.status));
    } else if (status === "rejected") {
      list = data.proposals.filter((p) => p.status === "rejected");
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else if (sortField === "challenge")
        cmp = (a.challenge_title ?? "").localeCompare(b.challenge_title ?? "");
      else if (sortField === "ask") cmp = a.budget_estimate - b.budget_estimate;
      else if (sortField === "score")
        cmp = (a.weighted_score ?? 0) - (b.weighted_score ?? 0);
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      else cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

      return sortOrder === "asc" ? cmp : -cmp;
    });

    return list;
  }, [data.proposals, status, sortField, sortOrder]);

  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  return (
    <div className="space-y-4">
      {/* Category / Status Filter Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {["all", "under_review", "shortlisted", "rejected"].map((s) => {
            const count =
              s === "all"
                ? data.proposals.length
                : s === "under_review"
                ? data.proposals.filter((p) => ["submitted", "under_review", "draft"].includes(p.status)).length
                : s === "shortlisted"
                ? data.proposals.filter((p) => ["shortlisted", "piloting", "completed", "scaled"].includes(p.status)).length
                : data.proposals.filter((p) => p.status === "rejected").length;
            const label = s === "all" ? "All Proposals" : s === "under_review" ? "Under Review" : humanise(s);
            return (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setCurrentPage(1);
                }}
                className={`rounded border px-3 py-1 text-xs font-semibold transition-colors ${
                  status === s
                    ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
                <span className="ml-1.5 font-mono text-[11px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main DataTable Container */}
      <div className="border border-slate-300 bg-white shadow-xs rounded-none sm:rounded-xs overflow-hidden">
        {/* Top Control Bar: "Show entries" */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-slate-200 bg-white text-xs text-slate-700">
          <div className="flex items-center gap-2 font-medium">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-hidden"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>
        </div>

        {/* Table with Grid Borders */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-50/75 text-slate-800 font-bold">
                <th
                  onClick={() => handleSort("sno")}
                  className="w-14 border-r border-slate-200 px-3 py-3 text-center cursor-pointer select-none hover:bg-slate-100/80"
                >
                  <div className="flex items-center justify-center gap-1 font-bold">
                    <span>S.No.</span>
                    <span className="text-[10px] text-slate-400 font-mono">↑↓</span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("title")}
                  className="border-r border-slate-200 px-3 py-3 cursor-pointer select-none hover:bg-slate-100/80"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <span>Startup / Proposal Title</span>
                    <span className="text-[10px] text-slate-400 font-mono">↑↓</span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("challenge")}
                  className="border-r border-slate-200 px-3 py-3 cursor-pointer select-none hover:bg-slate-100/80"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <span>Challenge Target</span>
                    <span className="text-[10px] text-slate-400 font-mono">↑↓</span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("ask")}
                  className="w-28 border-r border-slate-200 px-3 py-3 cursor-pointer select-none hover:bg-slate-100/80"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <span>Ask (Budget)</span>
                    <span className="text-[10px] text-slate-400 font-mono">↑↓</span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("score")}
                  className="w-32 border-r border-slate-200 px-3 py-3 cursor-pointer select-none hover:bg-slate-100/80"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <span>Panel Score</span>
                    <span className="text-[10px] text-slate-400 font-mono">↑↓</span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="w-28 border-r border-slate-200 px-3 py-3 cursor-pointer select-none hover:bg-slate-100/80"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <span>Status</span>
                    <span className="text-[10px] text-slate-400 font-mono">↑↓</span>
                  </div>
                </th>
                <th className="w-20 px-3 py-3 text-center font-bold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-medium">
                    No matching proposals found in the database.
                  </td>
                </tr>
              ) : (
                paginated.map((p, idx) => {
                  const challenge = challengeMap[p.challenge_id];
                  const sno = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-blue-50/40 cursor-pointer"
                      onClick={() => setOpen(p)}
                    >
                      <td className="border-r border-slate-200 px-3 py-3.5 text-center font-semibold text-slate-600 font-mono">
                        {sno}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-3.5">
                        <div className="font-semibold text-blue-700 hover:underline leading-snug">
                          {p.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                          <span className="font-medium text-slate-800">{p.startup_org ?? p.startup_name}</span>
                          {p.startup_district && <span>· {p.startup_district}</span>}
                          {p.dpiit_verified && (
                            <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                              DPIIT ✓
                            </span>
                          )}
                          <span className="font-mono text-slate-400">TRL {p.trl_level}</span>
                        </div>
                      </td>
                      <td className="border-r border-slate-200 px-3 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          {challenge?.sector && <SectorBadge sector={challenge.sector} />}
                        </div>
                        <div className="font-medium text-slate-800 line-clamp-1">
                          {p.challenge_title ?? challenge?.title ?? "—"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {challenge?.department ?? "MSINS"}
                        </div>
                      </td>
                      <td className="border-r border-slate-200 px-3 py-3.5 font-mono font-bold text-slate-900">
                        {formatInrCompact(p.budget_estimate)}
                        <div className="text-[11px] font-sans font-normal text-slate-500">
                          {p.timeline_weeks} wks
                        </div>
                      </td>
                      <td className="border-r border-slate-200 px-3 py-3.5">
                        <ScoreChip value={p.weighted_score} count={p.evaluations_count} />
                      </td>
                      <td className="border-r border-slate-200 px-3 py-3.5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(p);
                          }}
                          className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{startEntry}</span> to{" "}
            <span className="font-semibold text-slate-900">{endEntry}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalEntries}</span> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`min-w-7 rounded border px-2 py-1 text-xs font-semibold ${
                  currentPage === pageNum
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {open && <ProposalDetail proposal={open} onClose={() => setOpen(null)} onChanged={onRefresh} />}
    </div>
  );
}

function ProposalRow({
  p,
  challenge,
  onChanged,
  onOpenDetail,
}: {
  p: Proposal;
  challenge?: Challenge;
  onChanged: () => void;
  onOpenDetail?: () => void;
}) {
  const proposalCode = `GEM/2026/P/${p.id.slice(-7).toUpperCase()}`;

  return (
    <div className="group relative border border-slate-200 bg-white shadow-xs transition-all duration-200 hover:shadow-md hover:border-slate-300 border-t-[3px] border-t-blue-600 rounded-none md:rounded-xs">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-800 tracking-tight">
            PROPOSAL NO ( Pilot Proposal ) :
          </span>
          <button
            onClick={onOpenDetail}
            className="text-xs font-bold text-blue-700 hover:underline hover:text-blue-900 tracking-wide font-mono"
            title="Click to view full proposal details"
          >
            {proposalCode}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {p.dpiit_verified && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
              ✓ DPIIT Verified
            </span>
          )}
          {challenge?.sector && <SectorBadge sector={challenge.sector} />}
          <StatusBadge status={p.status} />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
        {/* Column 1: Items & Solution Details */}
        <div className="md:col-span-5 space-y-1.5 border-b md:border-b-0 md:border-r border-slate-100 pb-3 md:pb-0 md:pr-4">
          <div>
            <span className="font-bold text-slate-800">Items / Solution: </span>
            <span className="text-slate-700 font-medium">{p.title}</span>
          </div>
          <div>
            <span className="font-bold text-slate-800">Challenge Target: </span>
            <span className="text-slate-600">{challenge?.title ?? p.challenge_title ?? "Civic Innovation Challenge"}</span>
          </div>
          <div className="flex items-center gap-3 pt-1 text-slate-700 flex-wrap">
            <div>
              <span className="font-bold text-slate-800">Budget Ask: </span>
              <span className="font-mono font-bold text-slate-900">{formatInrCompact(p.budget_estimate)}</span>
            </div>
            <div>
              <span className="font-bold text-slate-800">TRL: </span>
              <span className="font-semibold text-indigo-700">Level {p.trl_level}</span>
            </div>
            <div>
              <span className="font-bold text-slate-800">Timeline: </span>
              <span className="font-medium text-slate-700">{p.timeline_weeks} wks</span>
            </div>
          </div>
        </div>

        {/* Column 2: Department Name And Address */}
        <div className="md:col-span-4 space-y-1.5 border-b md:border-b-0 md:border-r border-slate-100 pb-3 md:pb-0 md:pr-4">
          <div>
            <div className="font-bold text-slate-800 mb-0.5">Department Name And Address:</div>
            <div className="text-slate-700 font-medium leading-snug">
              {challenge?.department ?? "Maharashtra State Innovation Society"}
            </div>
            <div className="text-slate-500 text-[11px]">
              {challenge?.district ?? "Statewide"}, Maharashtra
            </div>
          </div>
          <div className="pt-1 text-[11px]">
            <span className="font-bold text-slate-700">Startup: </span>
            <span className="text-slate-800 font-medium">{p.startup_org ?? p.startup_name}</span>
            {p.startup_district && <span className="text-slate-500"> ({p.startup_district})</span>}
          </div>
        </div>

        {/* Column 3: Dates, Panel Score & Quick Actions */}
        <div className="md:col-span-3 space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div>
              <span className="font-bold text-slate-800">Start / Submitted: </span>
              <span className="text-emerald-700 font-semibold">{formatIstDate(p.created_at)}</span>
            </div>
            <div>
              <span className="font-bold text-slate-800">Review Target: </span>
              <span className="text-amber-700 font-semibold">
                {formatIstDate(challenge?.submission_deadline ?? "2026-09-15T18:00:00Z")}
              </span>
            </div>
          </div>

          <div className="pt-1.5 flex items-center justify-between gap-2 flex-wrap border-t border-slate-100">
            <ScoreChip value={p.weighted_score} count={p.evaluations_count} />
            <ProposalActions proposal={p} onChanged={onChanged} onOpenDetail={onOpenDetail} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProposalActions({
  proposal,
  onOpenDetail,
}: {
  proposal: Proposal;
  onChanged?: () => void;
  onOpenDetail?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={proposal.status} />
      {onOpenDetail && (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail();
          }}
        >
          Details →
        </Button>
      )}
    </div>
  );
}

function ProposalDetail({
  proposal,
  onClose,
  onChanged,
}: {
  proposal: Proposal;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [pilotOpen, setPilotOpen] = React.useState(false);

  return (
    <Dialog title={`${proposal.startup_name ?? proposal.title} · proposal`} onClose={onClose} width="max-w-3xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={proposal.status} />
          {proposal.dpiit_verified && (
            <Tag tone="success">DPIIT verified ({proposal.dpiit_number ?? "—"})</Tag>
          )}
          <Tag>{proposal.challenge_title}</Tag>
        </div>

        <p className="text-sm text-slate-700">{proposal.description || proposal.solution_approach}</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Requested" value={formatInrCompact(proposal.budget_estimate)} />
          <Stat label="Timeline" value={`${proposal.timeline_weeks} wk`} />
          <Stat label="TRL" value={String(proposal.trl_level)} />
          <Stat label="Reviews" value={String(proposal.evaluations_count ?? 0)} />
        </div>

        <div>
          <SectionLabel>Independent evaluation panel</SectionLabel>
          <div className="mt-2 rounded-md border border-slate-100 p-3">
            <CriterionBars scores={proposal.criterion_scores} />
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <ScoreChip value={proposal.weighted_score} count={proposal.evaluations_count} />
              <span className="text-xs text-slate-500">
                Panel Recommendation:{" "}
                <span className="font-semibold text-slate-800">
                  {proposal.panel_recommendation ? humanise(proposal.panel_recommendation) : (proposal.status === "shortlisted" ? "Shortlisted by Panel" : proposal.status === "rejected" ? "Rejected by Panel" : "Under Expert Review")}
                </span>
              </span>
            </div>
          </div>
        </div>

        {proposal.status === "shortlisted" && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
            <div>
              <span className="font-semibold">✓ Shortlisted by Evaluation Panel.</span>{" "}
              <span className="text-xs text-emerald-700">Next step: Issue pilot work order.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
                Convene panel
              </Button>
              <Button size="sm" onClick={() => setPilotOpen(true)}>
                Create pilot
              </Button>
            </div>
          </div>
        )}

        {proposal.status === "under_review" && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-center justify-between gap-2">
            <div>
              <span className="font-semibold">⏳ Under Expert Evaluation:</span> Proposal is currently being scored by independent domain experts.
            </div>
            <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
              Assign Experts
            </Button>
          </div>
        )}

        {proposal.status === "rejected" && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-800">
            <span className="font-semibold">✕ Evaluation Outcome:</span> Proposal did not meet the consensus threshold during expert panel review.
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {assignOpen && (
        <AssignExpertDialog
          proposalId={proposal.id}
          onClose={() => setAssignOpen(false)}
          onDone={() => {
            setAssignOpen(false);
            onChanged();
          }}
        />
      )}
      {pilotOpen && (
        <CreatePilotDialog
          proposal={proposal}
          onClose={() => setPilotOpen(false)}
          onDone={() => {
            setPilotOpen(false);
            onClose();
            onChanged();
          }}
        />
      )}
    </Dialog>
  );
}

/* ------------------------------ Pilots ----------------------------------- */

function PilotsTab({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "in_pilot" | "scale_ready" | "at_risk" | "completed">("all");
  const views = buildPilotViews(data);
  const open = views.find((v) => v.pilot.id === openId) ?? null;

  const filteredViews = React.useMemo(() => {
    return views.filter((v) => {
      if (filter === "in_pilot") return v.pilot.status === "active" || v.pilot.status === "planned";
      if (filter === "scale_ready") return v.scaleReadiness === "ready";
      if (filter === "at_risk") return v.riskLevel === "high";
      if (filter === "completed") return v.pilot.status === "completed";
      return true;
    });
  }, [views, filter]);

  return (
    <div className="space-y-4">
      {/* Top Filter Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Pilots", count: views.length },
            {
              id: "in_pilot",
              label: "Active Deployments",
              count: views.filter((v) => v.pilot.status === "active" || v.pilot.status === "planned").length,
            },
            {
              id: "scale_ready",
              label: "Scale-up Ready (GeM)",
              count: views.filter((v) => v.scaleReadiness === "ready").length,
            },
            {
              id: "at_risk",
              label: "Pilots at Risk",
              count: views.filter((v) => v.riskLevel === "high").length,
            },
            {
              id: "completed",
              label: "Completed",
              count: views.filter((v) => v.pilot.status === "completed").length,
            },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={`rounded border px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f.id
                  ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f.label}
              <span className="ml-1.5 font-mono text-[11px] opacity-80">
                ({f.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {filteredViews.length === 0 ? (
        <Card className="p-8 text-center bg-white border border-slate-200">
          <EmptyState title="No matching pilots" hint="No pilots match the selected filter criteria." />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 items-stretch">
          {filteredViews.map((v) => {
            const pilotCode = `PLT/2026/${v.pilot.id.slice(-6).toUpperCase()}`;
            const kpiPercentage = Math.round((v.kpiAchievementAvg ?? 0) * 100);

            return (
              <div
                key={v.pilot.id}
                onClick={() => setOpenId(v.pilot.id)}
                className="group relative flex flex-col justify-between border border-slate-200 bg-white shadow-xs transition-all duration-200 hover:shadow-md hover:border-slate-300 border-t-[3px] border-t-blue-600 rounded-none md:rounded-xs cursor-pointer"
              >
                <div>
                  {/* Top Header Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-700">PILOT REF:</span>
                      <span className="font-mono font-bold text-blue-700">{pilotCode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.riskLevel === "high" && (
                        <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200 animate-pulse">
                          ⚠️ At Risk
                        </span>
                      )}
                      <StatusBadge status={v.pilot.status} />
                    </div>
                  </div>

                  {/* Main Content Body */}
                  <div className="p-4 space-y-3.5">
                    {/* Pilot Title */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                        {v.pilot.title}
                      </h3>
                      <div className="mt-1 text-xs text-slate-500 font-medium">
                        {v.pilot.startup_name} · {v.pilot.district}
                      </div>
                    </div>

                    {/* Milestone Tranche Timeline Strip */}
                    <div className="rounded border border-slate-100 bg-slate-50/60 p-3">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-tight mb-1.5 flex justify-between">
                        <span>Tranche Milestones Schedule</span>
                        <span className="font-mono text-slate-500 font-normal">
                          {v.milestonesPaid} / {v.milestones.length} Paid
                        </span>
                      </div>
                      <MilestoneStrip milestones={v.milestones} />
                    </div>

                    {/* Financials & KPI Achievement Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      {/* Budget Allocated & Spent */}
                      <div className="rounded border border-slate-100 bg-white p-2.5 space-y-1">
                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                          Budget & Spend
                        </div>
                        <div className="flex items-baseline justify-between pt-0.5">
                          <span className="text-slate-500 text-[11px]">Budget:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatInrCompact(v.pilot.budget_allocated)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between border-t border-slate-100 pt-1">
                          <span className="text-slate-500 text-[11px]">Spent:</span>
                          <span className="font-mono font-semibold text-slate-700">
                            {formatInrCompact(v.pilot.budget_spent)}
                          </span>
                        </div>
                      </div>

                      {/* KPI Achievement */}
                      <div className="rounded border border-slate-100 bg-white p-2.5 space-y-1.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                            KPI Achievement
                          </span>
                          <span className="font-mono font-bold text-blue-700 text-xs">
                            {kpiPercentage}%
                          </span>
                        </div>
                        <div>
                          <AchievementBar value={v.kpiAchievementAvg} />
                        </div>
                        <div className="text-[10.5px] text-slate-400">
                          {v.kpis.length} verified indicator{v.kpis.length === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>

                    {/* Scale-Up Ready Callout */}
                    {v.scaleReadiness === "ready" && (
                      <div className="rounded border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <span>🏛️</span>
                          <span>Scale-up ready · GeM pathway open</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-300">
                          Validated
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Strip */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs">
                  <span className="text-slate-500">
                    Spent {formatInrCompact(v.pilot.budget_spent)} · {v.milestonesPaid}/{v.milestones.length} paid
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenId(v.pilot.id);
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    <span>Inspect Details</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && <PilotDetail view={open} onClose={() => setOpenId(null)} onChanged={onRefresh} />}
    </div>
  );
}

function PilotDetail({
  view,
  onClose,
  onChanged,
}: {
  view: PilotView;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { pilot, milestones, kpis } = view;
  const [gemCertOpen, setGemCertOpen] = React.useState(false);
  const [busyMilestone, setBusyMilestone] = React.useState<string | null>(null);

  const isScaleReady = view.scaleReadiness === "ready" || (view.kpiAchievementAvg ?? 0) >= 0.8;
  const gemCertRef = `GeM/STARTUP-RUNWAY/MSINS/${new Date().getFullYear()}/${pilot.id.slice(-6).toUpperCase()}`;

  async function handleReleasePayment(m: Milestone) {
    setBusyMilestone(m.id);
    await releaseMilestonePayment(m.id);
    setBusyMilestone(null);
    onChanged();
  }

  async function handleIssueGeMCertificate() {
    await createScaleDecision({
      pilot_id: pilot.id,
      decision: "gem_procurement",
      gem_category: "PWD / Urban Tech / Water Quality",
      reasoning: `Pilot achieved ${Math.round((view.kpiAchievementAvg ?? 0.85) * 100)}% composite KPI score. Recommended for direct GeM Startup Runway procurement.`,
      budget_allocated: pilot.budget_allocated * 2,
    });
    setGemCertOpen(true);
    onChanged();
  }

  return (
    <Dialog title={pilot.title ?? "Pilot Work Order"} onClose={onClose} width="max-w-3xl">
      <div className="space-y-4">
        {/* Top Header Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {pilot.work_order_no || `PLT/2026/${pilot.id.slice(-6).toUpperCase()}`}
            </span>
            <StatusBadge status={pilot.status} />
            <Tag>{pilot.startup_name}</Tag>
            <Tag>{pilot.district}</Tag>
          </div>
          <div className="flex items-center gap-2">
            <Tag tone={view.scaleReadiness === "ready" ? "success" : "default"}>
              Scale: {humanise(view.scaleReadiness)}
            </Tag>
            <Tag tone={view.riskLevel === "high" ? "danger" : "default"}>
              Risk: {humanise(view.riskLevel)}
            </Tag>
          </div>
        </div>

        {/* 4 Financial Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Budget Allocated" value={formatInrCompact(pilot.budget_allocated)} />
          <Stat label="Disbursed Spend" value={formatInrCompact(pilot.budget_spent)} />
          <Stat label="Milestones Paid" value={`${view.milestonesPaid}/${milestones.length}`} />
          <Stat label="KPI Achievement" value={`${Math.round((view.kpiAchievementAvg ?? 0) * 100)}%`} />
        </div>

        {/* Milestone-linked Tranches with Direct Payment Release */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Milestone-linked tranches (Outcome Disbursements)</SectionLabel>
            <span className="text-xs text-slate-500 font-mono">Disbursed strictly against verified evidence</span>
          </div>
          <div className="space-y-2">
            {milestones.map((m) => {
              const isPaid = m.status === "paid";
              return (
                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900">M{m.seq}</span>
                      <p className="text-xs font-bold text-slate-800 leading-snug">
                        {m.title}
                      </p>
                    </div>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">
                      Tranche: <strong className="font-semibold text-slate-800">{formatInrCompact(m.amount)}</strong> · due {m.due_date ? relativeDeadline(m.due_date) : "—"}
                      {m.payment_utr && <span className="font-mono ml-2 text-emerald-700 font-semibold">UTR: {m.payment_utr}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <StatusBadge status={m.status} />
                    {!isPaid && (
                      <Button
                        size="sm"
                        variant="success"
                        disabled={busyMilestone === m.id}
                        onClick={() => handleReleasePayment(m)}
                      >
                        {busyMilestone === m.id ? "Disbursing…" : `Release ₹${(m.amount / 100000).toFixed(1)}L (PFMS)`}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GeM Scale-Up Direct Procurement Clearance Banner */}
        {isScaleReady && (
          <div className="rounded-md border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  <span>🏛️</span>
                  <span>GeM Direct Procurement Clearance Ready (≥80% Validated)</span>
                </div>
                <p className="text-[11.5px] text-emerald-800">
                  This startup pilot met all key performance outcomes. Qualifies for fast-track state procurement on GeM Startup Runway under Rule 149.
                </p>
              </div>
              <Button
                size="sm"
                variant="success"
                onClick={handleIssueGeMCertificate}
              >
                📜 Award GeM Certificate
              </Button>
            </div>
          </div>
        )}

        {/* KPI Measurement Indicators */}
        <div>
          <SectionLabel>KPI measurement</SectionLabel>
          <div className="mt-2 space-y-2">
            {kpis.length === 0 && <p className="text-xs text-slate-400">No KPIs defined for this pilot.</p>}
            {kpis.map((k) => (
              <KpiRow key={k.id} kpi={k} />
            ))}
          </div>
        </div>

        {/* Modal: GeM Digital Certificate View */}
        {gemCertOpen && (
          <Dialog title="GeM Procurement Readiness Certificate" onClose={() => setGemCertOpen(false)} width="max-w-xl">
            <div className="space-y-4 p-2 text-center border-2 border-emerald-600 rounded bg-white">
              <div className="text-2xl">🏛️</div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-800">
                Government of Maharashtra · MSINS Innovation Sandbox
              </div>
              <h3 className="text-base font-black text-slate-900">
                GeM DIRECT PROCUREMENT READINESS CERTIFICATE
              </h3>
              <p className="text-xs text-slate-600">
                This certifies that <strong className="text-slate-900">{pilot.startup_name}</strong> has successfully completed the outcome-based pilot <strong className="text-slate-900">{pilot.title}</strong> with an audited composite KPI score of <strong className="text-emerald-700 font-bold">{Math.round((view.kpiAchievementAvg ?? 0.88) * 100)}%</strong>.
              </p>
              <div className="rounded bg-slate-50 border border-slate-200 p-3 text-xs font-mono text-left space-y-1">
                <div><strong>Certificate Ref:</strong> {gemCertRef}</div>
                <div><strong>Procurement Path:</strong> Direct GeM Cataloging (Startup Runway)</div>
                <div><strong>Verification Authority:</strong> Departmental Evaluation Committee</div>
                <div><strong>Date of Issuance:</strong> {new Date().toLocaleDateString("en-IN")}</div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setGemCertOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => window.print()}>
                  🖨️ Print Certificate
                </Button>
              </div>
            </div>
          </Dialog>
        )}
      </div>
    </Dialog>
  );
}

/* -------------------------------- KPIs ----------------------------------- */

function KpiTab({ data }: { data: DashboardData }) {
  const [perfFilter, setPerfFilter] = React.useState<"all" | "high" | "medium" | "low">("all");
  const [pilotFilter, setPilotFilter] = React.useState<string>("all");
  const [verifiedSet, setVerifiedSet] = React.useState<Set<string>>(new Set());

  const views = buildPilotViews(data);
  const rows = views.flatMap((v) =>
    v.kpis.map((k) => ({ pilot: v.pilot.title ?? "Pilot", pilotId: v.pilot.id, district: v.pilot.district, k })),
  );

  const filteredRows = React.useMemo(() => {
    return rows.filter((r) => {
      if (pilotFilter !== "all" && r.pilotId !== pilotFilter) return false;

      const achievement = kpiAchievement(r.k);
      const score = typeof achievement === "number" ? achievement : 0;

      if (perfFilter === "high") return score >= 80;
      if (perfFilter === "medium") return score >= 50 && score < 80;
      if (perfFilter === "low") return score < 50;

      return true;
    });
  }, [rows, perfFilter, pilotFilter]);

  const uniquePilots = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.pilotId, r.pilot);
    return Array.from(map.entries());
  }, [rows]);

  async function handleVerify(kpiId: string) {
    await verifySnapshot(kpiId);
    setVerifiedSet((prev) => new Set(prev).add(kpiId));
  }

  return (
    <div className="space-y-4">
      {/* Top Filter Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Performance Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Indicators", count: rows.length },
            {
              id: "high",
              label: "On Track (≥80%)",
              count: rows.filter((r) => (kpiAchievement(r.k) ?? 0) >= 80).length,
            },
            {
              id: "medium",
              label: "In Progress (50-79%)",
              count: rows.filter((r) => {
                const a = kpiAchievement(r.k) ?? 0;
                return a >= 50 && a < 80;
              }).length,
            },
            {
              id: "low",
              label: "Needs Attention (<50%)",
              count: rows.filter((r) => (kpiAchievement(r.k) ?? 0) < 50).length,
            },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setPerfFilter(f.id as typeof perfFilter)}
              className={`rounded border px-3 py-1 text-xs font-semibold transition-colors ${
                perfFilter === f.id
                  ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f.label}
              <span className="ml-1.5 font-mono text-[11px] opacity-80">
                ({f.count})
              </span>
            </button>
          ))}
        </div>

        {/* Pilot Filter Dropdown */}
        {uniquePilots.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Filter by Pilot:</span>
            <select
              value={pilotFilter}
              onChange={(e) => setPilotFilter(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-hidden max-w-[200px] truncate"
            >
              <option value="all">All Active Pilots ({uniquePilots.length})</option>
              {uniquePilots.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filteredRows.length === 0 ? (
        <Card className="p-8 text-center bg-white border border-slate-200">
          <EmptyState title="No KPIs found" hint="No outcome indicators match the selected filter criteria." />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRows.map(({ pilot, district, k }) => {
            const achievement = kpiAchievement(k);
            const scorePct = typeof achievement === "number" ? Math.round(achievement) : null;
            const isVerified = verifiedSet.has(k.id) || (data.snapshots && data.snapshots.some((s) => s.kpi_id === k.id && s.verified));

            return (
              <div
                key={k.id}
                className="group relative border border-slate-200 bg-white shadow-xs transition-all duration-200 hover:shadow-md hover:border-slate-300 border-l-[4px] border-l-blue-600 rounded-none md:rounded-xs p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Column: KPI Info, Pilot context & Target details */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                        {k.name}
                      </h4>
                      {k.weight && (
                        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700 border border-slate-200">
                          Weight: {k.weight}%
                        </span>
                      )}
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 border border-emerald-200">
                          ✓ Officer Verified
                        </span>
                      ) : (
                        <button
                          onClick={() => handleVerify(k.id)}
                          className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100"
                          title="Click to sign off on telemetry data"
                        >
                          Verify Snapshot ✅
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">🏛️ {pilot}</span>
                      {district && <span className="text-slate-400">· {district}</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-500 pt-0.5">
                      <span>
                        <strong className="text-slate-700 font-semibold">Baseline:</strong>{" "}
                        {k.baseline_value != null ? `${k.baseline_value} ${k.unit ?? ""}` : "—"} →{" "}
                        <strong className="text-slate-700 font-semibold">Target:</strong>{" "}
                        {k.target_value != null ? `${k.target_value} ${k.unit ?? ""}` : (k.target_description ?? "—")}
                      </span>
                      {k.direction && <span>· Direction: {humanise(k.direction)}</span>}
                      {k.frequency && <span>· Frequency: {humanise(k.frequency)}</span>}
                      {k.owner && <span className="text-slate-600 font-medium">· Verified by: {k.owner}</span>}
                    </div>
                  </div>

                  {/* Right Column: Score & Achievement Bar */}
                  <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="text-right min-w-[70px]">
                      <div className="text-[11px] uppercase tracking-tight text-slate-400 font-medium">Achievement</div>
                      <div className="font-mono text-sm font-bold text-blue-700">
                        {scorePct != null ? `${scorePct}%` : "Pending"}
                      </div>
                    </div>
                    <div className="w-32 sm:w-40">
                      <AchievementBar value={achievement} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Dialogs --------------------------------- */

function CreateChallengeDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = React.useState({
    title: "",
    sector: "PWD" as Sector,
    department: GOV_DEPARTMENTS[0],
    district: "Mumbai",
    problem_statement: "",
    outcome_metric: "",
    expected_impact: "",
    pilot_budget_min: 500000,
    pilot_budget_max: 50000000,
    submission_deadline: "",
  });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!form.title || !form.problem_statement || !form.outcome_metric) {
      setErr("Title, problem statement and outcome metric are required.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await createChallenge({
        ...form,
        programme: "MSINS Innovation Challenge",
      });
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Dialog title="New outcome-based challenge" onClose={onClose} width="max-w-2xl">
      <div className="space-y-3">
        <Field label="Title">
          <input className="kilo-input" value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sector">
            <select className="kilo-input" value={form.sector} onChange={(e) => set("sector", e.target.value as Sector)}>
              {SECTORS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="District">
            <select className="kilo-input" value={form.district} onChange={(e) => set("district", e.target.value)}>
              {GOV_DISTRICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Department">
          <select className="kilo-input" value={form.department} onChange={(e) => set("department", e.target.value)}>
            {GOV_DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Problem statement">
          <Textarea value={form.problem_statement} onChange={(v) => set("problem_statement", v)} />
        </Field>
        <Field label="Outcome / success metric (KPI-linked)">
          <Textarea value={form.outcome_metric} onChange={(v) => set("outcome_metric", v)} />
        </Field>
        <Field label="Expected impact">
          <Textarea value={form.expected_impact} onChange={(v) => set("expected_impact", v)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pilot budget min (₹)">
            <input
              type="number"
              className="kilo-input"
              value={form.pilot_budget_min}
              onChange={(e) => set("pilot_budget_min", Number(e.target.value))}
            />
          </Field>
          <Field label="Pilot budget max (₹)">
            <input
              type="number"
              className="kilo-input"
              value={form.pilot_budget_max}
              onChange={(e) => set("pilot_budget_max", Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Submission deadline">
          <input
            type="date"
            className="kilo-input"
            value={form.submission_deadline}
            onChange={(e) => set("submission_deadline", e.target.value)}
          />
        </Field>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create challenge"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function AssignExpertDialog({
  proposalId,
  onClose,
  onDone,
}: {
  proposalId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [experts, setExperts] = React.useState<User[]>([]);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    fetchExperts().then(setExperts);
  }, []);

  function toggle(id: string) {
    setChecked((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function submit() {
    if (checked.size === 0) return;
    setBusy(true);
    await assignExperts(proposalId, Array.from(checked));
    setBusy(false);
    onDone();
  }

  return (
    <Dialog title="Convene evaluation panel" onClose={onClose} width="max-w-lg">
      <div className="space-y-2">
        <p className="text-xs text-slate-500">
          Select 2–5 independent experts. The platform enforces domain fit and conflict-of-interest
          recusal automatically.
        </p>
        {experts.map((e) => (
          <label key={e.id} className="flex items-center justify-between rounded-md border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium">{e.full_name}</p>
              <p className="text-xs text-slate-500">
                {(e.expertise ?? "").split(",").slice(0, 3).join(", ")} · {e.organization}
              </p>
            </div>
            <input type="checkbox" checked={checked.has(e.id)} onChange={() => toggle(e.id)} />
          </label>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || checked.size === 0}>
            {busy ? "Assigning…" : `Assign ${checked.size} expert(s)`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function CreatePilotDialog({
  proposal,
  onClose,
  onDone,
}: {
  proposal: Proposal;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = React.useState(`${proposal.startup_name ?? proposal.title} pilot`);
  const [duration, setDuration] = React.useState(9);
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    setBusy(true);
    await createPilotFromProposal(proposal.id, {
      title: name,
      duration_months: duration,
    });
    setBusy(false);
    onDone();
  }

  return (
    <Dialog title="Create pilot from proposal" onClose={onClose} width="max-w-lg">
      <div className="space-y-3">
        <Field label="Pilot name">
          <input className="kilo-input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Duration (months)">
          <input
            type="number"
            className="kilo-input"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </Field>
        <p className="text-xs text-slate-500">
          Budget of {formatInrCompact(proposal.budget_estimate)} will be scheduled into KPI-linked
          tranches. Milestone payments require Platform Admin approval.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create pilot"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ------------------------------- helpers --------------------------------- */

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
      {children}
    </th>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}