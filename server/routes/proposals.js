const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize, logActivity } = require('../middleware/auth');

const router = express.Router();
const db = require('../db/store');

// 1. GET /api/proposals/challenge/:challengeId
router.get('/challenge/:challengeId', authenticate, (req, res) => {
  try {
    let results = db.getAll('proposals').filter(p => p.challenge_id === req.params.challengeId);
    
    const users = db.getAll('users');
    const evaluations = db.getAll('evaluations');

    results = results.map(p => {
      const pEvals = evaluations.filter(e => e.proposal_id === p.id);
      const avgScore = pEvals.length > 0
        ? pEvals.reduce((sum, e) => sum + (e.overall_score || (e.innovation_score + e.feasibility_score + e.impact_score) / 3), 0) / pEvals.length
        : p.overall_score;

      return {
        ...p,
        startup_name: users.find(u => u.id === p.startup_id)?.full_name || null,
        startup_org: users.find(u => u.id === p.startup_id)?.organization || null,
        evaluations_count: pEvals.length,
        weighted_score: avgScore ? Math.round(avgScore * 100) / 100 : null,
      };
    });
    
    if (req.user.role === 'startup') {
      results = results.filter(p => p.startup_id === req.user.id);
    }
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/proposals/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    let proposal = db.getAll('proposals').find(p => p.id === req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    
    const users = db.getAll('users');
    const challenge = db.getChallengeById(proposal.challenge_id);
    const evaluations = db.getAll('evaluations').filter(e => e.proposal_id === proposal.id);

    proposal = {
      ...proposal,
      startup_name: users.find(u => u.id === proposal.startup_id)?.full_name || null,
      startup_org: users.find(u => u.id === proposal.startup_id)?.organization || null,
      challenge_title: challenge?.title || null,
      evaluations_count: evaluations.length,
      evaluations: evaluations.map(e => ({
        ...e,
        expert_name: users.find(u => u.id === e.expert_id)?.full_name || 'Independent Evaluator',
        expert_org: users.find(u => u.id === e.expert_id)?.organization || 'Evaluation Panel',
      })),
    };
    
    if (req.user.role === 'startup' && proposal.startup_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    res.json(proposal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/proposals - Submit proposal
router.post('/', authenticate, authorize('startup'), (req, res) => {
  try {
    const id = uuidv4();
    const { challenge_id, title, description, solution_approach, timeline_weeks, budget_estimate, team_description, past_projects, trl_level } = req.body;
    
    const proposal = db.insert('proposals', {
      id,
      challenge_id,
      startup_id: req.user.id,
      title,
      description,
      solution_approach,
      timeline_weeks: timeline_weeks || 12,
      budget_estimate: Number(budget_estimate) || 750000,
      team_description: team_description || 'Engineering and deployment core team',
      past_projects: past_projects || null,
      trl_level: trl_level || 5,
      status: 'submitted',
      dpiit_verified: true,
    });
    
    logActivity(req.user.id, 'submit_proposal', 'proposal', id, { title });
    res.status(201).json({ id, title, proposal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /api/proposals/:id/assign-experts - Convene independent expert evaluation panel
router.post('/:id/assign-experts', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const proposal = db.getProposalById(req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    const { expert_ids, due_date } = req.body;
    if (!Array.isArray(expert_ids) || expert_ids.length === 0) {
      return res.status(400).json({ error: 'At least 1 independent expert ID is required' });
    }

    const users = db.getAll('users');
    const existingEvals = db.getAll('evaluations').filter(e => e.proposal_id === req.params.id);
    const assignedRecords = [];

    expert_ids.forEach(expertId => {
      const expertUser = users.find(u => u.id === expertId);
      if (!expertUser) return;

      // Conflict of Interest (COI) check
      if (expertUser.organization && proposal.startup_org && expertUser.organization === proposal.startup_org) {
        return; // Recuse expert if affiliated
      }

      const alreadyAssigned = existingEvals.some(e => e.expert_id === expertId);
      if (!alreadyAssigned) {
        const newEval = db.insert('evaluations', {
          id: uuidv4(),
          proposal_id: req.params.id,
          expert_id: expertId,
          innovation_score: 4,
          feasibility_score: 4,
          impact_score: 4,
          overall_score: 4.0,
          status: 'assigned',
          due_date: due_date || '2026-09-30',
          recommendation: 'accept',
          confidence_level: 4,
        });
        assignedRecords.push(newEval);
      }
    });

    db.update('proposals', req.params.id, {
      status: 'under_review',
      expert_panel_assigned: true,
      updated_at: new Date().toISOString(),
    });

    logActivity(req.user.id, 'assign_experts', 'proposal', req.params.id, {
      expert_count: assignedRecords.length,
      expert_ids,
    });

    res.json({
      message: `Evaluation panel convened with ${assignedRecords.length} expert(s)`,
      proposal_id: req.params.id,
      assigned_count: assignedRecords.length,
      assigned_evaluations: assignedRecords,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/proposals/:id/evaluation-summary - Weighted scoring engine & consensus
router.get('/:id/evaluation-summary', authenticate, (req, res) => {
  try {
    const proposal = db.getProposalById(req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    const challenge = db.getChallengeById(proposal.challenge_id);
    const evaluations = db.getAll('evaluations').filter(e => e.proposal_id === req.params.id);
    const users = db.getAll('users');

    if (evaluations.length === 0) {
      return res.json({
        proposal_id: proposal.id,
        evaluations_count: 0,
        consensus_recommendation: 'pending_evaluation',
        weighted_score: null,
        message: 'No expert evaluations recorded yet.',
      });
    }

    const weights = challenge?.evaluation_weights || {
      problem_solution_fit: 20,
      innovation_novelty: 15,
      technical_feasibility: 15,
      operational_fit: 15,
      expected_impact: 15,
      scalability: 10,
      cost_effectiveness: 5,
      security_compliance: 5,
    };

    const avgInnovation = evaluations.reduce((sum, e) => sum + (e.innovation_score || 3), 0) / evaluations.length;
    const avgFeasibility = evaluations.reduce((sum, e) => sum + (e.feasibility_score || 3), 0) / evaluations.length;
    const avgImpact = evaluations.reduce((sum, e) => sum + (e.impact_score || 3), 0) / evaluations.length;
    const compositeScore = (avgInnovation * 0.35 + avgFeasibility * 0.35 + avgImpact * 0.30);

    let consensus = 'neutral';
    if (compositeScore >= 4.2) consensus = 'strongly_accept';
    else if (compositeScore >= 3.5) consensus = 'accept';
    else if (compositeScore < 2.5) consensus = 'reject';

    res.json({
      proposal_id: proposal.id,
      proposal_title: proposal.title,
      evaluations_count: evaluations.length,
      weighted_score: Math.round(compositeScore * 100) / 100,
      consensus_recommendation: consensus,
      dimensions: {
        innovation_score: Math.round(avgInnovation * 10) / 10,
        feasibility_score: Math.round(avgFeasibility * 10) / 10,
        impact_score: Math.round(avgImpact * 10) / 10,
      },
      expert_evaluations: evaluations.map(e => ({
        id: e.id,
        expert_name: users.find(u => u.id === e.expert_id)?.full_name || 'Independent Expert',
        recommendation: e.recommendation || 'accept',
        comment: e.overall_comment,
        score: e.overall_score || ((e.innovation_score + e.feasibility_score + e.impact_score) / 3).toFixed(2),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. POST /api/proposals/batch-decision - Bulk shortlist or reject
router.post('/batch-decision', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const { proposal_ids, action, notes } = req.body;
    if (!Array.isArray(proposal_ids) || proposal_ids.length === 0) {
      return res.status(400).json({ error: 'Array of proposal_ids is required' });
    }

    const targetStatus = action === 'shortlist' ? 'shortlisted' : (action === 'reject' ? 'rejected' : action);
    const validStatuses = ['shortlisted', 'rejected', 'under_review', 'submitted'];
    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({ error: `Invalid action. Must be shortlist or reject.` });
    }

    const updated = [];
    proposal_ids.forEach(id => {
      const prop = db.getProposalById(id);
      if (prop) {
        db.update('proposals', id, {
          status: targetStatus,
          decision_notes: notes || null,
          updated_at: new Date().toISOString(),
        });
        updated.push(id);
      }
    });

    logActivity(req.user.id, 'batch_proposal_decision', 'proposal', req.user.id, {
      action: targetStatus,
      count: updated.length,
      proposal_ids: updated,
    });

    res.json({
      message: `Batch action completed: ${updated.length} proposal(s) moved to '${targetStatus}'`,
      updated_count: updated.length,
      updated_ids: updated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. PUT /api/proposals/:id/status - Single status transition
router.put('/:id/status', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const { status } = req.body;
    const proposal = db.getProposalById(req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    
    db.update('proposals', req.params.id, { status, updated_at: new Date().toISOString() });
    logActivity(req.user.id, 'update_proposal_status', 'proposal', req.params.id, { status });
    res.json({ message: `Proposal status updated to '${status}'` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
