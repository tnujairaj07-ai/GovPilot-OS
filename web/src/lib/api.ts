/**
 * API facade for GovPilot OS.
 *
 * Every dashboard talks to these functions. They resolve against the in-memory
 * store seeded from `mock-data.ts`, with a small simulated latency so loading
 * states are exercised. There is no fetch, no database driver and no native
 * dependency, so `next dev` / `next build` work on a clean checkout.
 *
 * If a live Express backend is later reintroduced, only this file needs to
 * change: the component contracts stay identical.
 */

import * as store from "./store";
import type { StartupRegistrationInput } from "./store";
import { DEFAULT_EVALUATION_WEIGHTS } from "./mock-data";
import type {
  AdminPortalData,
  Challenge,
  DashboardData,
  Evaluation,
  ExpertPortalData,
  Kpi,
  KpiSnapshot,
  Milestone,
  Pilot,
  PilotAgreement,
  Proposal,
  ProposedMilestone,
  ReadinessScorecard,
  Role,
  ScaleDecision,
  Sector,
  StartupPortalData,
  User,
} from "./types";

/** Simulated network latency in milliseconds. */
const LATENCY = 140;

function delay<T>(value: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ */
/* Session                                                            */
/* ------------------------------------------------------------------ */

export async function fetchCurrentUser(): Promise<User> {
  return delay(store.getCurrentUser(), 60);
}

export async function switchRole(role: Role): Promise<User> {
  return delay(store.setCurrentRole(role), 60);
}

export async function signInAs(userId: string): Promise<User> {
  store.setCurrentUserId(userId);
  return delay(store.getCurrentUser(), 60);
}

export async function fetchUsers(role?: Role): Promise<User[]> {
  return delay(store.listUsers(role), 60);
}

export async function fetchExperts(): Promise<User[]> {
  return delay(store.listUsers("expert"), 60);
}

export async function fetchStartups(): Promise<User[]> {
  return delay(store.listUsers("startup"), 60);
}

export async function resetDemoData(): Promise<void> {
  store.resetStore();
  return delay(undefined, 60);
}

export async function registerStartup(input: StartupRegistrationInput): Promise<User> {
  return delay(store.registerStartup(input), 120);
}

/* ------------------------------------------------------------------ */
/* Government officer dashboard                                        */
/* ------------------------------------------------------------------ */

export async function fetchDashboard(): Promise<DashboardData> {
  return delay({
    challenges: store.selectChallenges(),
    proposals: store.selectProposals(),
    pilots: store.selectPilots(),
    milestones: store.selectMilestones(),
    kpis: store.selectKpis(),
    snapshots: store.selectSnapshots(),
    evaluations: store.selectEvaluations(),
    scaleDecisions: store.selectScaleDecisions(),
    experts: store.listUsers("expert"),
  });
}

/** Lightweight challenge-creation payload for the officer console. */
export interface CreateChallengeInput {
  title: string;
  sector: Sector;
  department: string;
  district: string;
  problem_statement: string;
  outcome_metric: string;
  expected_impact: string;
  pilot_budget_min: number;
  pilot_budget_max: number;
  submission_deadline?: string;
  programme?: string;
  description?: string;
  beneficiaries?: string;
  dpiit_eligible?: boolean;
  priority?: "low" | "medium" | "high" | "critical";
  tags?: string;
  contact_person?: string;
  contact_email?: string;
  min_trl?: number;
  maharashtra_presence_required?: boolean;
  duration_weeks?: number;
}

export async function createChallenge(input: CreateChallengeInput): Promise<Challenge> {
  const created = store.createChallenge({
    title: input.title,
    description: input.description ?? input.problem_statement,
    problem_statement: input.problem_statement,
    desired_outcomes: input.expected_impact,
    success_criteria: input.outcome_metric,
    sector: input.sector,
    department: input.department,
    district: input.district,
    budget_min: input.pilot_budget_min,
    budget_max: input.pilot_budget_max,
    duration_weeks: input.duration_weeks ?? 26,
    status: "open",
    priority: input.priority ?? "high",
    tags: input.tags,
    contact_person: input.contact_person,
    contact_email: input.contact_email,
    outcome_targets: [
      {
        id: uid("ot"),
        statement: input.outcome_metric,
        baseline: "To be established at pilot kick-off",
        target: input.outcome_metric,
        measurement_method: "Verified KPI snapshots on the platform",
      },
    ],
    eligibility: {
      dpiit_required: input.dpiit_eligible ?? true,
      min_trl: input.min_trl ?? 4,
      maharashtra_presence_required: input.maharashtra_presence_required ?? true,
      conditions: [],
    },
    evaluation_weights: DEFAULT_EVALUATION_WEIGHTS,
    expert_panel: [],
    min_expert_evaluations: 3,
    submission_deadline: input.submission_deadline,
    msins_programme: input.programme ?? "MSINS Innovation Challenge",
  });
  return delay(created);
}

export async function updateChallenge(
  id: string,
  patch: Partial<Challenge>,
): Promise<Challenge | null> {
  return delay(store.updateChallenge(id, patch));
}

export async function setProposalStatus(
  id: string,
  status: Proposal["status"],
): Promise<Proposal | null> {
  return delay(store.setProposalStatus(id, status));
}

export async function assignExperts(
  proposalId: string,
  expertIds: string[],
  dueDate?: string,
): Promise<Evaluation[]> {
  return delay(store.assignExperts(proposalId, expertIds, dueDate));
}

/** Alias used by the government console. */
export const assignExpertsToProposal = assignExperts;

/**
 * Promote a shortlisted proposal to a pilot, generating the milestone payment
 * schedule from the startup's proposed plan.
 */
export async function createPilotFromProposal(
  proposalId: string,
  opts?: { title?: string; duration_months?: number; nodal_officer?: string },
): Promise<Pilot | null> {
  const proposal = store.getRawData().proposals.find((p) => p.id === proposalId);
  if (!proposal) return delay(null);
  const months = opts?.duration_months ?? 9;
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + months);
  return delay(
    store.createPilotFromProposal({
      proposal_id: proposalId,
      budget_allocated: proposal.budget_estimate,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      nodal_officer: opts?.nodal_officer,
      summary: opts?.title,
    }),
  );
}

export async function updatePilotStatus(
  id: string,
  status: Pilot["status"],
): Promise<Pilot | null> {
  return delay(store.updatePilot(id, { status }));
}

export async function createKpi(input: Omit<Kpi, "id">): Promise<Kpi> {
  return delay(store.createKpi(input));
}

export async function recordKpiSnapshot(input: {
  kpi_id: string;
  pilot_id: string;
  reported_value?: number;
  reported_text?: string;
  notes?: string;
  period?: string;
}): Promise<KpiSnapshot> {
  return delay(store.recordKpiSnapshot(input));
}

export async function verifySnapshot(id: string): Promise<KpiSnapshot | null> {
  return delay(store.verifySnapshot(id));
}

/* ------------------------------------------------------------------ */
/* Startup portal                                                      */
/* ------------------------------------------------------------------ */

export async function fetchStartupPortal(): Promise<StartupPortalData> {
  const me = store.getCurrentUser();
  const myProposals = store.selectProposals().filter((p) => p.startup_id === me.id);
  const myPilots = store.selectPilots().filter((p) => p.startup_id === me.id);
  const pilotIds = new Set(myPilots.map((p) => p.id));
  const proposalIds = new Set(myProposals.map((p) => p.id));

  return delay({
    profile: me,
    availableChallenges: store
      .selectChallenges()
      .filter((c) => c.status === "open" || c.status === "in_review"),
    myProposals,
    myPilots,
    myMilestones: store.selectMilestones().filter((m) => pilotIds.has(m.pilot_id)),
    myKpis: store.selectKpis().filter((k) => k.pilot_id && pilotIds.has(k.pilot_id)),
    mySnapshots: store.selectSnapshots().filter((s) => pilotIds.has(s.pilot_id)),
    myEvaluations: store
      .selectEvaluations()
      .filter((e) => proposalIds.has(e.proposal_id) && e.status === "submitted"),
    myAgreements: store.selectAgreements().filter((a) => pilotIds.has(a.pilot_id)),
    legalTemplates: store.selectLegalTemplates(),
  });
}

export interface CreateProposalInput {
  challenge_id: string;
  title: string;
  summary: string;
  solution_approach: string;
  budget_estimate: number;
  timeline_weeks: number;
  trl_level?: number;
  proposed_milestones?: ProposedMilestone[];
  submission_notes?: string;
}

const DEFAULT_MILESTONE_PLAN: ProposedMilestone[] = [
  { title: "M1 · Solution architecture & integration", week: 4, deliverable: "Architecture sign-off and pilot integration plan", payment_percentage: 20 },
  { title: "M2 · Deployment & baseline measurement", week: 10, deliverable: "Live deployment at sites; baseline KPI reading captured", payment_percentage: 30 },
  { title: "M3 · Outcome delivery & verification", week: 18, deliverable: "Target KPI achievement verified by department", payment_percentage: 50 },
];

export async function createProposal(input: CreateProposalInput): Promise<Proposal> {
  const me = store.getCurrentUser();
  if (!me.dpiit_verified) {
    throw new Error(
      "DPIIT recognition is mandatory for MSINS pilot funding. Complete DPIIT verification before submitting.",
    );
  }
  const created = store.createProposal({
    challenge_id: input.challenge_id,
    title: input.title,
    description: input.summary,
    solution_approach: input.solution_approach,
    timeline_weeks: input.timeline_weeks,
    budget_estimate: input.budget_estimate,
    team_description: me.bio ?? `${me.organization ?? ""} delivery team`,
    trl_level: input.trl_level ?? 6,
    accepted_data_ip_clauses: true,
    proposed_milestones: input.proposed_milestones ?? DEFAULT_MILESTONE_PLAN,
    submission_notes: input.submission_notes,
  });
  return delay(created);
}

export async function submitMilestone(
  id: string,
  evidenceNames: string[],
): Promise<Milestone | null> {
  return delay(store.submitMilestone(id, evidenceNames));
}

export async function signAgreement(id: string): Promise<PilotAgreement | null> {
  return delay(store.updateAgreementStatus(id, "signed_by_startup"));
}

/* ------------------------------------------------------------------ */
/* Expert evaluator portal                                             */
/* ------------------------------------------------------------------ */

export async function fetchExpertPortal(): Promise<ExpertPortalData> {
  const me = store.getCurrentUser();
  const assignments = store.selectEvaluations().filter((e) => e.expert_id === me.id);
  const proposalIds = new Set(assignments.map((a) => a.proposal_id));
  const proposals = store.selectProposals().filter((p) => proposalIds.has(p.id));
  const challengeIds = new Set(proposals.map((p) => p.challenge_id));

  return delay({
    profile: me,
    assignments,
    proposals,
    challenges: store.selectChallenges().filter((c) => challengeIds.has(c.id)),
    panelEvaluations: store.selectEvaluations().filter((e) => {
      if (!proposalIds.has(e.proposal_id)) return false;
      const mine = assignments.find((a) => a.proposal_id === e.proposal_id);
      return mine?.status === "submitted";
    }),
    experts: store.listUsers("expert"),
  });
}

export async function saveEvaluationDraft(
  id: string,
  patch: store.EvaluationSubmission,
): Promise<Evaluation | null> {
  return delay(store.saveEvaluationDraft(id, patch));
}

export async function submitEvaluation(
  id: string,
  patch: store.EvaluationSubmission,
): Promise<Evaluation | null> {
  return delay(store.submitEvaluation(id, patch));
}

export async function declareConflict(id: string, note: string): Promise<Evaluation | null> {
  return delay(store.declareConflict(id, note));
}

/* ------------------------------------------------------------------ */
/* Platform admin console                                              */
/* ------------------------------------------------------------------ */

export async function fetchAdminPortal(): Promise<AdminPortalData> {
  return delay({
    users: store.listUsers(),
    challenges: store.selectChallenges(),
    proposals: store.selectProposals(),
    pilots: store.selectPilots(),
    milestones: store.selectMilestones(),
    kpis: store.selectKpis(),
    snapshots: store.selectSnapshots(),
    evaluations: store.selectEvaluations(),
    legalTemplates: store.selectLegalTemplates(),
    agreements: store.selectAgreements(),
    scaleDecisions: store.selectScaleDecisions(),
    activity: store.selectActivity(),
  });
}

export async function reviewMilestone(
  id: string,
  decision: "approved" | "rejected" | "under_review",
  notes: string,
): Promise<Milestone | null> {
  return delay(store.reviewMilestone(id, decision, notes));
}

export async function releasePayment(
  id: string,
  mode: Milestone["payment_mode"] = "PFMS",
): Promise<Milestone | null> {
  return delay(store.releaseMilestonePayment(id, mode));
}

/** Alias used by the government console. */
export const releaseMilestonePayment = releasePayment;

export async function generateAgreement(input: {
  pilot_id: string;
  template_ids: string[];
  ip_ownership: PilotAgreement["ip_ownership"];
  data_classification: PilotAgreement["data_classification"];
  data_retention_months: number;
  data_residency_in_india: boolean;
  notes?: string;
}): Promise<PilotAgreement> {
  return delay(store.generateAgreement(input));
}

export async function updateAgreementStatus(
  id: string,
  status: PilotAgreement["status"],
): Promise<PilotAgreement | null> {
  return delay(store.updateAgreementStatus(id, status));
}

export async function setDpiitVerification(
  userId: string,
  verified: boolean,
): Promise<User | null> {
  return delay(store.setDpiitVerification(userId, verified));
}

export async function updateUser(userId: string, patch: Partial<User>): Promise<User | null> {
  return delay(store.updateUser(userId, patch));
}

/* ------------------------------------------------------------------ */
/* Procurement & scale-up                                              */
/* ------------------------------------------------------------------ */

export async function fetchScaleDecisions(): Promise<ScaleDecision[]> {
  return delay(store.selectScaleDecisions());
}

export async function createScaleDecision(
  input: Parameters<typeof store.createScaleDecision>[0],
): Promise<ScaleDecision | null> {
  return delay(store.createScaleDecision(input));
}

export async function advanceGemStage(
  id: string,
  patch: Partial<ScaleDecision["gem"]>,
): Promise<ScaleDecision | null> {
  return delay(store.advanceGemStage(id, patch));
}

export async function actOnApproval(
  decisionId: string,
  stage: string,
  status: "approved" | "rejected",
  remark: string,
): Promise<ScaleDecision | null> {
  return delay(store.actOnApproval(decisionId, stage, status, remark));
}

export async function fetchReadiness(pilotId: string): Promise<ReadinessScorecard> {
  return delay(store.readinessScorecard(pilotId), 60);
}

export async function fetchKpiAchievement(kpi: Kpi): Promise<number | undefined> {
  return delay(store.kpiAchievement(kpi), 40);
}

/* ------------------------------------------------------------------ */
/* Synchronous helpers (safe to call during render)                     */
/* ------------------------------------------------------------------ */

export const {
  computeWeightedScore,
  recommendationFromScore,
  kpiAchievement,
  pilotKpiAchievement,
  readinessScorecard,
  latestSnapshot,
} = store;
