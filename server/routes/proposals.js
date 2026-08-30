const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize, logActivity } = require('../middleware/auth');

const router = express.Router();
const db = require('../db/store');

router.get('/challenge/:challengeId', authenticate, (req, res) => {
  try {
    let results = db.getAll('proposals').filter(p => p.challenge_id === req.params.challengeId);
    
    const users = db.getAll('users');
    results = results.map(p => ({
      ...p,
      startup_name: users.find(u => u.id === p.startup_id)?.full_name || null,
      startup_org: users.find(u => u.id === p.startup_id)?.organization || null,
    }));
    
    if (req.user.role === 'startup') {
      results = results.filter(p => p.startup_id === req.user.id);
    }
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    let proposal = db.getAll('proposals').find(p => p.id === req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    
    const users = db.getAll('users');
    proposal = {
      ...proposal,
      startup_name: users.find(u => u.id === proposal.startup_id)?.full_name || null,
      startup_org: users.find(u => u.id === proposal.startup_id)?.organization || null,
    };
    
    if (req.user.role === 'startup' && proposal.startup_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    res.json(proposal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, authorize('startup'), (req, res) => {
  try {
    const id = uuidv4();
    const { challenge_id, title, description, solution_approach, timeline_weeks, budget_estimate, team_description, past_projects } = req.body;
    
    const proposal = db.insert('proposals', {
      id,
      challenge_id,
      startup_id: req.user.id,
      title,
      description,
      solution_approach,
      timeline_weeks,
      budget_estimate,
      team_description,
      past_projects: past_projects || null,
      status: 'submitted',
    });
    
    logActivity(req.user.id, 'submit_proposal', 'proposal', id, { title });
    res.status(201).json({ id, title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/status', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const { status } = req.body;
    const proposal = db.getProposalById(req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    
    db.update('proposals', req.params.id, { status });
    logActivity(req.user.id, 'update_proposal_status', 'proposal', req.params.id, { status });
    res.json({ message: 'Proposal status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
