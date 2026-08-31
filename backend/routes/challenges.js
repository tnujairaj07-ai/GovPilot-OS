const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize, logActivity } = require('../middleware/auth');

const router = express.Router();
const db = require('../db/store');

// Helper to generate formatted challenge code
function generateChallengeCode(sector = 'MSINS') {
  const prefix = sector ? sector.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) : 'MSINS';
  const year = new Date().getFullYear();
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}/${year}/${num}`;
}

// 1. GET /api/challenges - List challenges with optional filters
router.get('/', authenticate, (req, res) => {
  try {
    const { status, proposal_id, sector, department } = req.query;
    let results = db.getAll('challenges');
    
    if (status) results = results.filter(c => c.status === status);
    if (sector) results = results.filter(c => c.sector?.toLowerCase() === sector.toLowerCase());
    if (department) results = results.filter(c => c.department?.toLowerCase().includes(department.toLowerCase()));
    if (proposal_id) {
      const prop = db.getAll('proposals').find(p => p.id === proposal_id);
      if (prop) results = results.filter(c => c.id === prop.challenge_id);
    }
    
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/challenges/:id/summary - Application count, triage stats, countdown, and readiness
router.get('/:id/summary', authenticate, (req, res) => {
  try {
    const challenge = db.getChallengeById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const proposals = db.getAll('proposals').filter(p => p.challenge_id === req.params.id);
    const pilots = db.getAll('pilots').filter(p => p.challenge_id === req.params.id);

    const submitted = proposals.filter(p => ['submitted', 'under_review'].includes(p.status));
    const shortlisted = proposals.filter(p => ['shortlisted', 'piloting'].includes(p.status));
    const rejected = proposals.filter(p => p.status === 'rejected');

    // Deadline calculations
    let daysRemaining = null;
    if (challenge.submission_deadline) {
      const deadline = new Date(challenge.submission_deadline).getTime();
      const now = new Date().getTime();
      daysRemaining = Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)));
    }

    // Average Proposal Evaluation Score
    const scoredProposals = proposals.filter(p => p.overall_score != null || p.weighted_score != null);
    const avgScore = scoredProposals.length > 0
      ? scoredProposals.reduce((sum, p) => sum + Number(p.overall_score || p.weighted_score || 0), 0) / scoredProposals.length
      : null;

    // Readiness Breakdown
    const hasBasics = Boolean(challenge.title && challenge.problem_statement && (challenge.desired_outcomes || challenge.outcome_metric));
    const hasEligibility = Boolean(challenge.eligibility_criteria && challenge.eligibility_criteria.length > 0);
    const hasEvaluation = Boolean(challenge.evaluation_weights && Object.keys(challenge.evaluation_weights).length >= 3);
    const hasTestbed = Boolean(challenge.testbed_setup && challenge.testbed_setup.objective);
    const hasIpSecurity = Boolean(challenge.ip_governance && challenge.security_controls);

    let readinessScore = 0;
    if (hasBasics) readinessScore += 25;
    if (hasEligibility) readinessScore += 20;
    if (hasEvaluation) readinessScore += 20;
    if (hasTestbed) readinessScore += 20;
    if (hasIpSecurity) readinessScore += 15;

    res.json({
      challenge: {
        id: challenge.id,
        challenge_code: challenge.challenge_code,
        title: challenge.title,
        status: challenge.status,
        department: challenge.department,
        sector: challenge.sector,
        submission_deadline: challenge.submission_deadline,
      },
      summary: {
        total_proposals: proposals.length,
        proposals_in_review: submitted.length,
        shortlisted_proposals: shortlisted.length,
        rejected_proposals: rejected.length,
        active_pilots_count: pilots.length,
        average_proposal_score: avgScore ? Math.round(avgScore * 100) / 100 : null,
        days_remaining: daysRemaining,
        readiness_score: readinessScore,
        checklist: {
          basics: hasBasics,
          eligibility: hasEligibility,
          evaluation: hasEvaluation,
          pilot_kpi: hasTestbed,
          ip_security: hasIpSecurity,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/challenges/:id - Get challenge details with enrichment
router.get('/:id', authenticate, (req, res) => {
  try {
    const challenge = db.getChallengeById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    
    const proposals = db.getAll('proposals').filter(p => p.challenge_id === req.params.id);
    const pilots = db.getAll('pilots').filter(p => p.challenge_id === req.params.id);
    
    res.json({
      ...challenge,
      proposals_count: proposals.length,
      pilots_count: pilots.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /api/challenges - Create new challenge with full 6-step metadata
router.post('/', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const id = uuidv4();
    const {
      title,
      description,
      problem_statement,
      desired_outcomes,
      outcome_metric,
      success_criteria,
      expected_impact,
      budget_range,
      pilot_budget_min,
      pilot_budget_max,
      duration_weeks,
      pilot_duration_value,
      pilot_duration_unit,
      status,
      priority,
      department,
      sector,
      district,
      geographies,
      beneficiary_groups,
      current_baseline,
      submission_deadline,
      scale_decision_deadline,
      eligibility_criteria,
      tech_constraints,
      evaluation_weights,
      rubrics,
      testbed_setup,
      ip_governance,
      security_controls,
      readiness_score,
      tags,
      contact_person,
      dpiit_eligible,
    } = req.body;

    if (!title || !problem_statement) {
      return res.status(400).json({ error: 'Title and problem statement are required' });
    }

    const challengeCode = req.body.challenge_code || generateChallengeCode(sector || 'MSINS');
    const challengeStatus = status || 'open';

    const challenge = db.insert('challenges', {
      id,
      challenge_code: challengeCode,
      title,
      description: description || problem_statement,
      problem_statement,
      desired_outcomes: desired_outcomes || outcome_metric || '',
      outcome_metric: outcome_metric || desired_outcomes || '',
      success_criteria: success_criteria || expected_impact || '',
      expected_impact: expected_impact || '',
      budget_range: budget_range || (pilot_budget_min && pilot_budget_max ? `₹${Number(pilot_budget_min).toLocaleString()} - ₹${Number(pilot_budget_max).toLocaleString()}` : null),
      pilot_budget_min: Number(pilot_budget_min) || 500000,
      pilot_budget_max: Number(pilot_budget_max) || 1500000,
      duration_weeks: duration_weeks || 12,
      pilot_duration_value: pilot_duration_value || 90,
      pilot_duration_unit: pilot_duration_unit || 'Days',
      status: challengeStatus,
      priority: priority || 'high',
      department: department || 'Department of Urban Development & Water Resources',
      sector: sector || 'PWD',
      district: district || (geographies && geographies[0]) || 'Mumbai',
      geographies: geographies || ['Mumbai', 'Pune'],
      beneficiary_groups: beneficiary_groups || ['Citizens', 'Drivers & Commuters'],
      current_baseline: current_baseline || '',
      submission_deadline: submission_deadline || '2026-09-30',
      scale_decision_deadline: scale_decision_deadline || '2026-12-30',
      eligibility_criteria: eligibility_criteria || [
        { id: 'ec-1', name: 'DPIIT recognition', type: 'Mandatory', description: 'Must be DPIIT recognized', verification_method: 'Official verification (DPIIT portal)' },
        { id: 'ec-2', name: 'Prior turnover threshold', type: 'Preferred', description: 'Turnover < ₹5 Cr permitted', verification_method: 'Financial declaration' },
      ],
      tech_constraints: tech_constraints || {
        integrations: ['ITMS', 'Government API'],
        data_sensitivity: 'Internal',
        data_residency_india: true,
        cloud_deployment: 'Approved Government Cloud (NIC/MahaGov)',
      },
      evaluation_weights: evaluation_weights || {
        problem_solution_fit: 20,
        innovation_novelty: 15,
        technical_feasibility: 15,
        operational_fit: 15,
        expected_impact: 15,
        scalability: 10,
        cost_effectiveness: 5,
        security_compliance: 5,
      },
      rubrics: rubrics || {},
      testbed_setup: testbed_setup || {
        objective: desired_outcomes || outcome_metric || '',
        locations: (geographies || ['Pune']).join(', '),
        startups_count: 3,
        deployment_time: '≤ 15 days',
      },
      ip_governance: ip_governance || {
        data_ownership: 'Government retains ownership of all pilot data',
        data_retention: 'Pilot + 90 days',
        background_ip: 'Startup retained',
        new_ip: 'Startup owned with government license',
      },
      security_controls: security_controls || {
        risk_level: priority === 'critical' ? 'High' : 'Medium',
        requirements: ['End-to-End Encryption', 'MFA', 'RBAC', 'MeitY Data Residency'],
      },
      readiness_score: readiness_score != null ? readiness_score : 85,
      dpiit_eligible: dpiit_eligible !== undefined ? dpiit_eligible : true,
      tags: tags || '',
      contact_person: contact_person || '',
      ai_match_enabled: 1,
      min_expert_evaluations: 2,
      created_by: req.user.id,
    });

    logActivity(req.user.id, 'create_challenge', 'challenge', id, { title, status: challengeStatus });
    res.status(201).json({ id, challenge_code: challengeCode, title, status: challengeStatus, challenge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. PUT /api/challenges/:id/publish - Transition lifecycle status (draft -> in_review -> open)
router.put('/:id/publish', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const challenge = db.getChallengeById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const targetStatus = req.body.status || 'open';
    const validStatuses = ['draft', 'in_review', 'open', 'closed', 'archived'];
    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    if (targetStatus === 'open') {
      if (!challenge.title || !challenge.problem_statement) {
        return res.status(400).json({ error: 'Cannot publish challenge without a title and problem statement.' });
      }
    }

    const updated = db.update('challenges', req.params.id, {
      status: targetStatus,
      published_at: targetStatus === 'open' ? new Date().toISOString() : challenge.published_at || null,
      updated_at: new Date().toISOString(),
    });

    logActivity(req.user.id, 'publish_challenge', 'challenge', req.params.id, {
      from: challenge.status,
      to: targetStatus,
    });

    res.json({
      message: `Challenge status transitioned to '${targetStatus}'`,
      challenge: updated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. POST /api/challenges/:id/clone - Clone existing challenge template
router.post('/:id/clone', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const original = db.getChallengeById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Source challenge not found' });

    const newId = uuidv4();
    const newCode = generateChallengeCode(original.sector || 'MSINS');
    const clonedTitle = req.body.title || `Copy of ${original.title}`;

    const clonedChallenge = db.insert('challenges', {
      ...original,
      id: newId,
      challenge_code: newCode,
      title: clonedTitle,
      status: 'draft',
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    logActivity(req.user.id, 'clone_challenge', 'challenge', newId, {
      cloned_from: req.params.id,
      title: clonedTitle,
    });

    res.status(201).json({
      message: 'Challenge cloned successfully as draft template',
      id: newId,
      challenge: clonedChallenge,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. PUT /api/challenges/:id - Update challenge specifications
router.put('/:id', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const challenge = db.getChallengeById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    
    const updated = db.update('challenges', req.params.id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    });
    
    logActivity(req.user.id, 'update_challenge', 'challenge', req.params.id, { title: updated.title });
    res.json({ message: 'Challenge updated successfully', challenge: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. DELETE /api/challenges/:id - Remove challenge
router.delete('/:id', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const challenge = db.getChallengeById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    db.remove('challenges', req.params.id);
    logActivity(req.user.id, 'delete_challenge', 'challenge', req.params.id, { title: challenge.title });
    res.json({ message: 'Challenge deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
