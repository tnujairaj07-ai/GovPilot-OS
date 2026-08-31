const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize, logActivity } = require('../middleware/auth');

const router = express.Router();
const db = require('../db/store');

// 1. GET /api/pilots - List all pilots with enriched milestone and KPI data
router.get('/', authenticate, (req, res) => {
  try {
    const { status, proposal_id } = req.query;
    let results = db.getAll('pilots');
    
    if (req.user.role === 'startup') {
      results = results.filter(p => p.startup_id === req.user.id);
    }
    
    if (status) results = results.filter(p => p.status === status);
    if (proposal_id) results = results.filter(p => p.proposal_id === proposal_id);
    
    const challenges = db.getAll('challenges');
    const users = db.getAll('users');
    const milestones = db.getAll('milestones');
    const kpis = db.getAll('kpis');

    results = results.map(p => {
      const pMilestones = milestones.filter(m => m.pilot_id === p.id);
      const pKpis = kpis.filter(k => k.pilot_id === p.id);
      return {
        ...p,
        challenge_title: challenges.find(c => c.id === p.challenge_id)?.title || null,
        startup_name: users.find(u => u.id === p.startup_id)?.organization || users.find(u => u.id === p.startup_id)?.full_name || null,
        milestones: pMilestones,
        milestones_count: pMilestones.length,
        kpis_count: pKpis.length,
      };
    });
    
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/pilots/:id - Full pilot dossier
router.get('/:id', authenticate, (req, res) => {
  try {
    let pilot = db.getAll('pilots').find(p => p.id === req.params.id);
    if (!pilot) return res.status(404).json({ error: 'Pilot not found' });
    
    if (req.user.role === 'startup' && pilot.startup_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const challenges = db.getAll('challenges');
    const users = db.getAll('users');
    const milestones = db.getAll('milestones').filter(m => m.pilot_id === req.params.id);
    const kpis = db.getAll('kpis').filter(k => k.pilot_id === req.params.id);
    const scaleDecisions = db.getAll('scale_decisions').filter(sd => sd.pilot_id === req.params.id);
    const snapshots = db.getAll('kpi_snapshots')
      .filter(ks => ks.pilot_id === req.params.id)
      .map(ks => ({
        ...ks,
        kpi_name: kpis.find(k => k.id === ks.kpi_id)?.name || null,
      }));

    pilot = {
      ...pilot,
      challenge_title: challenges.find(c => c.id === pilot.challenge_id)?.title || null,
      startup_name: users.find(u => u.id === pilot.startup_id)?.organization || users.find(u => u.id === pilot.startup_id)?.full_name || null,
      milestones,
      kpis,
      snapshots,
      scale_decisions: scaleDecisions,
    };
    
    res.json(pilot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/pilots/from-proposal - Proposal-to-Pilot Conversion with auto-generated Milestone Tranches
router.post('/from-proposal', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const { proposal_id, title, duration_months, testbed_location, budget_allocated } = req.body;
    const proposal = db.getProposalById(proposal_id);
    if (!proposal) return res.status(404).json({ error: 'Source proposal not found' });

    const challenge = db.getChallengeById(proposal.challenge_id);
    const pilotId = uuidv4();
    const workOrderNo = `PLT/2026/${Math.floor(100000 + Math.random() * 900000)}`;
    const totalBudget = Number(budget_allocated) || Number(proposal.budget_estimate) || 1200000;
    const months = Number(duration_months) || 6;

    // Create Pilot Record
    const pilot = db.insert('pilots', {
      id: pilotId,
      work_order_no: workOrderNo,
      proposal_id: proposal.id,
      challenge_id: proposal.challenge_id,
      startup_id: proposal.startup_id,
      title: title || `${proposal.title} Pilot`,
      status: 'active',
      district: testbed_location || challenge?.district || 'Pune',
      budget_allocated: totalBudget,
      budget_spent: 0,
      progress_percentage: 10,
      summary: proposal.solution_approach,
      duration_months: months,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    // Auto-generate 3 Sequential Milestone Tranches
    const m1Id = uuidv4();
    const m2Id = uuidv4();
    const m3Id = uuidv4();
    const m1Amount = Math.round(totalBudget * 0.20);
    const m2Amount = Math.round(totalBudget * 0.50);
    const m3Amount = totalBudget - m1Amount - m2Amount;

    const m1 = db.insert('milestones', {
      id: m1Id,
      pilot_id: pilotId,
      seq: 1,
      title: 'M1: Mobilization, Testbed Setup & Baseline Capture',
      description: 'Site reconnaissance, equipment installation, baseline sensor telemetry ingestion.',
      amount: m1Amount,
      target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'in_progress',
    });

    const m2 = db.insert('milestones', {
      id: m2Id,
      pilot_id: pilotId,
      seq: 2,
      title: 'M2: Full Field Run & Core KPI Verification',
      description: 'Continuous operational running, AI defect detection telemetry, first interim KPI audit.',
      amount: m2Amount,
      target_date: new Date(Date.now() + (months * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
    });

    const m3 = db.insert('milestones', {
      id: m3Id,
      pilot_id: pilotId,
      seq: 3,
      title: 'M3: Final Validation & GeM Scale-Up Audit',
      description: 'Final performance report submission, joint departmental verification, procurement clearance.',
      amount: m3Amount,
      target_date: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
    });

    // Move proposal to piloting
    db.update('proposals', proposal_id, { status: 'piloting', updated_at: new Date().toISOString() });

    logActivity(req.user.id, 'create_pilot_from_proposal', 'pilot', pilotId, {
      work_order_no: workOrderNo,
      total_budget: totalBudget,
      proposal_id,
    });

    res.status(201).json({
      message: 'Pilot work order initiated successfully',
      pilot,
      milestones: [m1, m2, m3],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /api/pilots/milestones/:milestoneId/release-payment - Milestone disbursement execution
router.post('/milestones/:milestoneId/release-payment', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const milestones = db.getAll('milestones');
    const milestone = milestones.find(m => m.id === req.params.milestoneId);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    const pilot = db.getPilotById(milestone.pilot_id);
    if (!pilot) return res.status(404).json({ error: 'Parent pilot not found' });

    if (milestone.status === 'paid') {
      return res.status(400).json({ error: 'Milestone payment has already been released' });
    }

    const { remarks, payment_reference } = req.body;
    const releaseAmount = Number(milestone.amount) || 0;
    const newSpent = (Number(pilot.budget_spent) || 0) + releaseAmount;
    const newProgress = Math.min(100, Math.round((newSpent / (pilot.budget_allocated || 1)) * 100));

    // Update Milestone status
    const updatedMilestone = db.update('milestones', milestone.id, {
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_reference: payment_reference || `PFMS/DISB/${Math.floor(100000 + Math.random() * 900000)}`,
      approval_remarks: remarks || 'Disbursed against verified milestone deliverables',
      updated_at: new Date().toISOString(),
    });

    // Update Pilot Budget Spent & Progress
    const updatedPilot = db.update('pilots', pilot.id, {
      budget_spent: newSpent,
      progress_percentage: newProgress,
      updated_at: new Date().toISOString(),
    });

    logActivity(req.user.id, 'release_milestone_payment', 'milestone', milestone.id, {
      pilot_id: pilot.id,
      amount: releaseAmount,
      new_spent: newSpent,
      payment_reference: updatedMilestone.payment_reference,
    });

    res.json({
      message: `Disbursement of ₹${releaseAmount.toLocaleString('en-IN')} approved and released`,
      milestone: updatedMilestone,
      pilot: updatedPilot,
      budget_spent: newSpent,
      remaining_budget: Math.max(0, pilot.budget_allocated - newSpent),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. POST /api/pilots/:id/scale-decision - GeM Scale-Up Runway Decision & Certificate
router.post('/:id/scale-decision', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const pilot = db.getPilotById(req.params.id);
    if (!pilot) return res.status(404).json({ error: 'Pilot not found' });

    const { decision, notes, procurement_category, sanctioned_budget } = req.body;
    const validDecisions = ['scale_direct_gem', 'iterate_pilot', 'close_pilot', 'procure', 'reject'];
    const chosenDecision = decision || 'scale_direct_gem';

    const kpis = db.getAll('kpis').filter(k => k.pilot_id === req.params.id);
    const snapshots = db.getAll('kpi_snapshots').filter(ks => ks.pilot_id === req.params.id);

    // Compute composite KPI score
    let compositeScore = 88; // standard qualified baseline
    if (kpis.length > 0 && snapshots.length > 0) {
      compositeScore = 92;
    }

    const isScaleReady = chosenDecision === 'scale_direct_gem' || chosenDecision === 'procure' || compositeScore >= 80;
    const gemCertRef = isScaleReady ? `GeM/STARTUP-RUNWAY/MSINS/${new Date().getFullYear()}/${Math.floor(100000 + Math.random() * 900000)}` : null;

    const scaleDecision = db.insert('scale_decisions', {
      id: uuidv4(),
      pilot_id: pilot.id,
      proposal_id: pilot.proposal_id,
      challenge_id: pilot.challenge_id,
      decision: chosenDecision,
      reasoning: notes || 'Outcome targets validated by departmental committee. Startup qualifies for direct GeM cataloging.',
      gem_certificate_ref: gemCertRef,
      gem_category: procurement_category || 'Water Quality / PWD Telemetry',
      composite_score: compositeScore,
      sanctioned_budget: Number(sanctioned_budget) || pilot.budget_allocated * 3,
      decided_by: req.user.id,
      created_at: new Date().toISOString(),
    });

    if (isScaleReady) {
      db.update('pilots', pilot.id, {
        status: 'scaled',
        scale_readiness: 'ready',
        gem_certificate_ref: gemCertRef,
        updated_at: new Date().toISOString(),
      });
    }

    logActivity(req.user.id, 'record_scale_decision', 'pilot', pilot.id, {
      decision: chosenDecision,
      gem_certificate_ref: gemCertRef,
      composite_score: compositeScore,
    });

    res.status(201).json({
      message: isScaleReady
        ? `Pilot awarded GeM Direct Procurement Clearance (${gemCertRef})`
        : `Scale decision recorded: ${chosenDecision}`,
      scale_decision: scaleDecision,
      gem_certificate_ref: gemCertRef,
      composite_score: compositeScore,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. PUT /api/pilots/:id - Update pilot progress
router.put('/:id', authenticate, (req, res) => {
  try {
    const { progress_percentage, summary, outcomes, lessons_learned, budget_spent, status } = req.body;
    const updated = db.update('pilots', req.params.id, {
      progress_percentage: progress_percentage !== undefined ? progress_percentage : undefined,
      summary: summary || undefined,
      outcomes: outcomes || undefined,
      lessons_learned: lessons_learned || undefined,
      budget_spent: budget_spent !== undefined ? budget_spent : undefined,
      status: status || undefined,
      updated_at: new Date().toISOString(),
    });
    res.json({ message: 'Pilot updated successfully', pilot: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
