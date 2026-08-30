const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize, logActivity } = require('../middleware/auth');

const router = express.Router();
const db = require('../db/store');

router.get('/', authenticate, (req, res) => {
  try {
    const { status, proposal_id } = req.query;
    let results = db.getAll('challenges');
    
    if (status) results = results.filter(c => c.status === status);
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

router.get('/:id', authenticate, (req, res) => {
  try {
    const challenge = db.getChallengeById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const id = uuidv4();
    const { title, description, problem_statement, desired_outcomes, success_criteria, budget_range, duration_weeks, priority, department, tags, contact_person } = req.body;
    
    const challenge = db.insert('challenges', {
      id,
      title,
      description,
      problem_statement,
      desired_outcomes,
      success_criteria,
      budget_range: budget_range || null,
      duration_weeks: duration_weeks || 12,
      status: 'open',
      priority: priority || 'medium',
      department: department || '',
      contact_person: contact_person || '',
      tags: tags || '',
      ai_match_enabled: 1,
      min_expert_evaluations: 2,
      created_by: req.user.id,
    });
    
    logActivity(req.user.id, 'create_challenge', 'challenge', id, { title });
    res.status(201).json({ id, title, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const challenge = db.getChallengeById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    
    const { title, description, status, priority, budget_range, duration_weeks } = req.body;
    const updated = db.update('challenges', req.params.id, {
      title: title || challenge.title,
      description: description || challenge.description,
      status: status || challenge.status,
      priority: priority || challenge.priority,
      budget_range: budget_range !== undefined ? budget_range : challenge.budget_range,
      duration_weeks: duration_weeks !== undefined ? duration_weeks : challenge.duration_weeks,
    });
    
    logActivity(req.user.id, 'update_challenge', 'challenge', req.params.id, { title });
    res.json({ message: 'Challenge updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const challenge = db.getChallengeById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    db.remove('challenges', req.params.id);
    logActivity(req.user.id, 'delete_challenge', 'challenge', req.params.id);
    res.json({ message: 'Challenge deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
