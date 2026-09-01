const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const users = [];
const challenges = [];
const proposals = [];
const evaluations = [];
const pilots = [];
const milestones = [];
const kpis = [];
const kpiSnapshots = [];
const scaleDecisions = [];
const notifications = [];
const activityLog = [];

const passwordHash = bcrypt.hashSync('password123', 10);

const govId = uuidv4();
const expertIds = [uuidv4(), uuidv4()];
const startupIds = [uuidv4(), uuidv4(), uuidv4()];

users.push(
  { id: govId, email: 'officer@govpilot.gov', password_hash: passwordHash, full_name: 'Sarah Chen', role: 'government', organization: 'Ministry of Digital Affairs', bio: 'Senior policy officer focused on innovation and digital transformation', expertise: null, created_at: '2025-01-15T10:00:00Z', updated_at: '2025-01-15T10:00:00Z' },
  { id: uuidv4(), email: 'admin@govpilot.gov', password_hash: passwordHash, full_name: 'James Wilson', role: 'admin', organization: 'GovPilot Platform', bio: 'Platform administrator', expertise: null, created_at: '2025-01-10T08:00:00Z', updated_at: '2025-01-10T08:00:00Z' },
  { id: startupIds[0], email: 'startup@innovate.ai', password_hash: passwordHash, full_name: 'Alex Rivera', role: 'startup', organization: 'InnovateAI Solutions', bio: 'AI-driven startup focused on public sector automation', expertise: null, created_at: '2025-02-01T14:00:00Z', updated_at: '2025-02-01T14:00:00Z' },
  { id: startupIds[1], email: 'startup2@green.tech', password_hash: passwordHash, full_name: 'Priya Patel', role: 'startup', organization: 'GreenTech Labs', bio: 'Sustainability and climate tech startup', expertise: null, created_at: '2025-02-05T11:00:00Z', updated_at: '2025-02-05T11:00:00Z' },
  { id: expertIds[0], email: 'expert@university.edu', password_hash: passwordHash, full_name: 'Dr. Michael Torres', role: 'expert', organization: 'State University', bio: 'Professor of Public Administration and Innovation', expertise: 'public administration, policy evaluation, innovation management', created_at: '2025-01-20T09:00:00Z', updated_at: '2025-01-20T09:00:00Z' },
  { id: expertIds[1], email: 'expert2@consulting.com', password_hash: passwordHash, full_name: 'Dr. Lisa Nakamura', role: 'expert', organization: 'Policy Insights Consulting', bio: 'Independent evaluation specialist', expertise: 'program evaluation, impact assessment, data analytics', created_at: '2025-01-25T13:00:00Z', updated_at: '2025-01-25T13:00:00Z' },
  { id: startupIds[2], email: 'startup3@health.tech', password_hash: passwordHash, full_name: "Dr. Kevin O'Brien", role: 'startup', organization: 'HealthBridge Technologies', bio: 'Health tech startup focused on digital health solutions', expertise: null, created_at: '2025-03-01T10:00:00Z', updated_at: '2025-03-01T10:00:00Z' },
);

const c1 = uuidv4();
const c2 = uuidv4();
const c3 = uuidv4();

challenges.push(
  { id: c1, title: 'AI-Powered Citizen Request Triage', description: 'Implement an intelligent system to categorize and route citizen service requests to the appropriate government departments.', problem_statement: 'Citizens currently wait an average of 5 business days for their requests to be correctly routed. Manual triage is error-prone and creates bottlenecks.', desired_outcomes: 'Reduce routing time to under 1 hour, improve first-contact resolution by 40%, reduce misrouted requests by 60%.', success_criteria: '95% accuracy in request categorization, <1 hour average routing time, 40% reduction in processing time.', budget_range: '$50,000 - $150,000', duration_weeks: 12, status: 'open', priority: 'high', department: 'Citizen Services', contact_person: 'Sarah Chen', tags: 'AI, NLP, citizen-services, automation', ai_match_enabled: 1, min_expert_evaluations: 2, created_by: govId, created_at: '2025-03-01T09:00:00Z', updated_at: '2025-03-01T09:00:00Z' },
  { id: c2, title: 'Carbon Footprint Tracking Dashboard', description: 'Build a real-time dashboard for municipal carbon emissions monitoring across all city facilities and operations.', problem_statement: 'The city lacks a unified view of carbon emissions, making it difficult to track progress toward climate goals and identify reduction opportunities.', desired_outcomes: 'Real-time emissions tracking, automated report generation, actionable insights for reduction strategies.', success_criteria: '100% facility coverage, automated monthly reports, identification of 5+ actionable reduction opportunities within 6 months.', budget_range: '$30,000 - $80,000', duration_weeks: 16, status: 'open', priority: 'medium', department: 'Environmental Services', contact_person: 'Sarah Chen', tags: 'climate, sustainability, dashboards, IoT', ai_match_enabled: 1, min_expert_evaluations: 2, created_by: govId, created_at: '2025-03-05T11:00:00Z', updated_at: '2025-03-05T11:00:00Z' },
  { id: c3, title: 'Blockchain Land Registry Pilot', description: 'Pilot a blockchain-based land registry system to improve transparency and reduce fraud in property transactions.', problem_statement: 'Current land registry processes are paper-based and prone to fraud, with title disputes taking years to resolve.', desired_outcomes: 'Reduce title processing time by 70%, eliminate forged documents, provide citizens with real-time property records.', success_criteria: '50% reduction in processing time, zero fraud incidents, 90% citizen satisfaction with new system.', budget_range: '$100,000 - $250,000', duration_weeks: 24, status: 'in_review', priority: 'critical', department: 'Land Administration', contact_person: 'Sarah Chen', tags: 'blockchain, land-registry, transparency, fraud-prevention', ai_match_enabled: 1, min_expert_evaluations: 2, created_by: govId, created_at: '2025-02-15T14:00:00Z', updated_at: '2025-02-15T14:00:00Z' }
);

const p1 = uuidv4();
const p2 = uuidv4();
const p3 = uuidv4();
const p4 = uuidv4();
const p5 = uuidv4();

proposals.push(
  { id: p1, challenge_id: c1, startup_id: startupIds[0], title: 'NLP-Powered Request Router', description: 'Deploy a fine-tuned NLP model that classifies citizen requests and routes them automatically.', solution_approach: 'We will use a transformer-based model trained on historical request data, with a human-in-the-loop fallback for edge cases.', timeline_weeks: 10, budget_estimate: 85000, team_description: '3 ML engineers, 1 backend developer, 1 UX designer with government service experience.', past_projects: 'Deployed similar system for City of Portland, achieving 94% classification accuracy.', innovation_score: 5, feasibility_score: 4, impact_score: 5, overall_score: 4.67, status: 'shortlisted', submission_notes: null, created_at: '2025-03-10T16:00:00Z', updated_at: '2025-03-10T16:00:00Z' },
  { id: p2, challenge_id: c1, startup_id: startupIds[1], title: 'Smart Triage Assistant', description: 'A rule-based hybrid system combining keyword classification with lightweight ML for faster deployment.', solution_approach: 'Rapid deployment using keyword matching enhanced with a small BERT model for semantic understanding.', timeline_weeks: 6, budget_estimate: 45000, team_description: '2 full-stack developers, 1 NLP specialist.', past_projects: 'Built triage systems for 3 state agencies, reducing processing time by 55%.', innovation_score: 3, feasibility_score: 5, impact_score: 3, overall_score: 3.67, status: 'under_review', submission_notes: null, created_at: '2025-03-12T09:00:00Z', updated_at: '2025-03-12T09:00:00Z' },
  { id: p3, challenge_id: c2, startup_id: startupIds[0], title: 'EcoMetrics Platform', description: 'IoT-connected emissions monitoring platform with real-time analytics and reporting.', solution_approach: 'Deploy IoT sensors across facilities, build a cloud analytics platform with automated reporting.', timeline_weeks: 14, budget_estimate: 72000, team_description: 'IoT team (2 engineers), cloud platform team (3 engineers), data visualization specialist.', past_projects: 'Built similar platform for University campus, tracking 200+ buildings.', innovation_score: 4, feasibility_score: 4, impact_score: 5, overall_score: 4.33, status: 'shortlisted', submission_notes: null, created_at: '2025-03-15T10:00:00Z', updated_at: '2025-03-15T10:00:00Z' },
  { id: p4, challenge_id: c3, startup_id: startupIds[1], title: 'ChainTitle - Blockchain Land Registry', description: 'A permissioned blockchain solution for land title management with government-controlled validators.', solution_approach: 'Implement a private blockchain network with government-run validator nodes, smart contracts for title transfers.', timeline_weeks: 22, budget_estimate: 180000, team_description: 'Blockchain architect, 2 Solidity developers, 2 backend engineers, 1 compliance specialist.', past_projects: 'Piloted blockchain voting system for local election in Estonia.', innovation_score: 5, feasibility_score: 3, impact_score: 5, overall_score: 4.33, status: 'under_review', submission_notes: null, created_at: '2025-03-08T14:00:00Z', updated_at: '2025-03-08T14:00:00Z' },
  { id: p5, challenge_id: c3, startup_id: startupIds[2], title: 'HealthChain Registry', description: 'Adapted blockchain technology for land registry with strong identity verification.', solution_approach: 'Use zero-knowledge proofs for privacy-preserving title verification, with government KYC integration.', timeline_weeks: 20, budget_estimate: 150000, team_description: 'Cryptography expert, 3 blockchain developers, 1 government liaison.', past_projects: 'Implemented blockchain-based health records system in Rwanda.', innovation_score: 5, feasibility_score: 4, impact_score: 4, overall_score: 4.33, status: 'rejected', submission_notes: null, created_at: '2025-03-09T11:00:00Z', updated_at: '2025-03-09T11:00:00Z' }
);

const eval1 = uuidv4();
const eval2 = uuidv4();
const eval3 = uuidv4();
const eval4 = uuidv4();
const eval5 = uuidv4();
const eval6 = uuidv4();

evaluations.push(
  { id: eval1, proposal_id: p1, expert_id: expertIds[0], innovation_score: 5, feasibility_score: 4, impact_score: 5, overall_comment: 'Strong use of modern NLP techniques with solid feasibility.', recommendation: 'strongly_accept', confidence_level: 5, created_at: '2025-03-11T10:00:00Z', updated_at: '2025-03-11T10:00:00Z' },
  { id: eval2, proposal_id: p1, expert_id: expertIds[1], innovation_score: 4, feasibility_score: 4, impact_score: 4, overall_comment: 'Good approach, but budget might be tight for 10-week timeline.', recommendation: 'accept', confidence_level: 4, created_at: '2025-03-11T14:00:00Z', updated_at: '2025-03-11T14:00:00Z' },
  { id: eval3, proposal_id: p2, expert_id: expertIds[0], innovation_score: 3, feasibility_score: 5, impact_score: 3, overall_comment: 'Pragmatic approach but lacks innovation in solution design.', recommendation: 'neutral', confidence_level: 4, created_at: '2025-03-13T09:00:00Z', updated_at: '2025-03-13T09:00:00Z' },
  { id: eval4, proposal_id: p3, expert_id: expertIds[1], innovation_score: 4, feasibility_score: 4, impact_score: 5, overall_comment: 'Excellent combination of IoT and analytics. Strong team background.', recommendation: 'strongly_accept', confidence_level: 4, created_at: '2025-03-16T10:00:00Z', updated_at: '2025-03-16T10:00:00Z' },
  { id: eval5, proposal_id: p4, expert_id: expertIds[0], innovation_score: 5, feasibility_score: 3, impact_score: 5, overall_comment: 'Very innovative but blockchain adoption in government requires significant change management.', recommendation: 'accept', confidence_level: 4, created_at: '2025-03-09T10:00:00Z', updated_at: '2025-03-09T10:00:00Z' },
  { id: eval6, proposal_id: p5, expert_id: expertIds[1], innovation_score: 5, feasibility_score: 4, impact_score: 4, overall_comment: 'Novel approach with ZK proofs, good privacy considerations.', recommendation: 'accept', confidence_level: 3, created_at: '2025-03-10T11:00:00Z', updated_at: '2025-03-10T11:00:00Z' }
);

const pilot1 = uuidv4();
pilots.push(
  { id: pilot1, proposal_id: p3, challenge_id: c2, startup_id: startupIds[0], status: 'active', start_date: '2025-04-01T00:00:00Z', end_date: '2025-07-21T00:00:00Z', budget_allocated: 72000, budget_spent: 41000, progress_percentage: 62, summary: 'Sensor deployment across 12 facilities complete.', outcomes: null, lessons_learned: null, created_at: '2025-04-01T00:00:00Z', updated_at: '2025-06-15T00:00:00Z' }
);

const kpi1 = uuidv4();
const kpi2 = uuidv4();
kpis.push(
  { id: kpi1, challenge_id: null, pilot_id: pilot1, name: 'Facility Sensor Coverage', description: 'Percentage of facilities with live sensors.', metric_type: 'quantitative', unit: '%', target_value: 100, target_description: null, weight: 1, created_at: '2025-04-01T00:00:00Z' },
  { id: kpi2, challenge_id: null, pilot_id: pilot1, name: 'Monthly Automated Reports', description: 'Number of automated reports generated.', metric_type: 'milestone', unit: 'reports', target_value: 6, target_description: null, weight: 1, created_at: '2025-04-01T00:00:00Z' }
);

const snap1 = uuidv4();
kpiSnapshots.push(
  { id: snap1, kpi_id: kpi1, pilot_id: pilot1, reported_value: 83, reported_text: null, notes: '9 of 12 facilities online.', reported_by: govId, created_at: '2025-06-15T00:00:00Z' }
);

const m1 = uuidv4();
const m2 = uuidv4();
const m3 = uuidv4();
milestones.push(
  { id: m1, pilot_id: pilot1, seq: 1, title: 'Sensor Deployment & Baseline Ingestion', amount: 25000, due_date: '2025-05-01T00:00:00Z', status: 'paid', paid_at: '2025-05-02T10:00:00Z', kpi_links: [kpi1], created_at: '2025-04-01T00:00:00Z' },
  { id: m2, pilot_id: pilot1, seq: 2, title: 'Automated Emissions Reporting & Analytics', amount: 25000, due_date: '2025-06-15T00:00:00Z', status: 'approved', paid_at: null, kpi_links: [kpi2], created_at: '2025-04-01T00:00:00Z' },
  { id: m3, pilot_id: pilot1, seq: 3, title: 'Final Pilot Review & Department Handover', amount: 22000, due_date: '2025-07-21T00:00:00Z', status: 'pending', paid_at: null, kpi_links: [], created_at: '2025-04-01T00:00:00Z' }
);

function getUserById(id) {
  return users.find(u => u.id === id) || null;
}

function getUserByEmail(email) {
  return users.find(u => u.email === email) || null;
}

function getChallengeById(id) {
  return challenges.find(c => c.id === id) || null;
}

function getProposalById(id) {
  return proposals.find(p => p.id === id) || null;
}

function getPilotById(id) {
  return pilots.find(p => p.id === id) || null;
}

function insert(table, record) {
  const arr = getArray(table);
  record.id = record.id || uuidv4();
  record.created_at = record.created_at || new Date().toISOString();
  record.updated_at = record.updated_at || new Date().toISOString();
  arr.push(record);
  return record;
}

function update(table, id, changes) {
  const arr = getArray(table);
  const idx = arr.findIndex(r => r.id === id);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...changes, updated_at: new Date().toISOString() };
  return arr[idx];
}

function remove(table, id) {
  const arr = getArray(table);
  const idx = arr.findIndex(r => r.id === id);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  return true;
}

function getAll(table) {
  return [...getArray(table)];
}

function getArray(table) {
  switch (table) {
    case 'users': return users;
    case 'challenges': return challenges;
    case 'proposals': return proposals;
    case 'evaluations': return evaluations;
    case 'pilots': return pilots;
    case 'milestones': return milestones;
    case 'kpis': return kpis;
    case 'kpi_snapshots': return kpiSnapshots;
    case 'scale_decisions': return scaleDecisions;
    case 'notifications': return notifications;
    case 'activity_log': return activityLog;
    default: throw new Error(`Unknown table: ${table}`);
  }
}

function count(table) {
  return getArray(table).length;
}

function query(table, predicate) {
  return getArray(table).filter(predicate);
}

function logActivity(userId, action, entityType, entityId, details = null) {
  insert('activity_log', {
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details ? JSON.stringify(details) : null,
  });
}

module.exports = {
  users,
  challenges,
  proposals,
  evaluations,
  pilots,
  milestones,
  kpis,
  kpiSnapshots,
  scaleDecisions,
  notifications,
  activityLog,
  getUserById,
  getUserByEmail,
  getChallengeById,
  getProposalById,
  getPilotById,
  insert,
  update,
  remove,
  getAll,
  count,
  query,
  logActivity,
  passwordHash
};
