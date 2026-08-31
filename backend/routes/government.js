const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const db = require('../db/store');

const router = express.Router();

/**
 * GET /api/government/dashboard
 * Consolidated dashboard payload for Government Officers
 */
router.get('/dashboard', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const challenges = db.getAll('challenges');
    const proposals = db.getAll('proposals');
    const pilots = db.getAll('pilots');
    const milestones = db.getAll('milestones');
    const kpis = db.getAll('kpis');
    const snapshots = db.getAll('kpi_snapshots');
    const evaluations = db.getAll('evaluations');
    const scaleDecisions = db.getAll('scale_decisions');
    const users = db.getAll('users');

    // 1. KPI Counters
    const openChallenges = challenges.filter(c => c.status === 'open');
    const pendingProposals = proposals.filter(p => ['submitted', 'under_review'].includes(p.status));
    const activePilots = pilots.filter(p => ['active', 'in_pilot'].includes(p.status));
    const totalAllocated = pilots.reduce((sum, p) => sum + (Number(p.budget_allocated) || 0), 0);
    const totalDisbursed = pilots.reduce((sum, p) => sum + (Number(p.budget_spent) || 0), 0);

    // 2. Risk Engine & Scale-Up Readiness Computation per Pilot
    const enrichedPilots = pilots.map(p => {
      const pMilestones = milestones.filter(m => m.pilot_id === p.id);
      const pKpis = kpis.filter(k => k.pilot_id === p.id);
      
      // Calculate KPI achievements
      let totalKpiWeight = 0;
      let weightedKpiSum = 0;
      pKpis.forEach(k => {
        const latestSnap = snapshots
          .filter(s => s.kpi_id === k.id)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        
        let achievement = 0;
        if (latestSnap && typeof latestSnap.reported_value === 'number' && typeof k.target_value === 'number') {
          const baseline = k.baseline_value || 0;
          if (k.direction === 'decrease') {
            achievement = baseline <= k.target_value ? (latestSnap.reported_value <= k.target_value ? 100 : 0)
              : Math.max(0, Math.min(100, ((baseline - latestSnap.reported_value) / (baseline - k.target_value)) * 100));
          } else {
            achievement = k.target_value <= baseline ? (latestSnap.reported_value >= k.target_value ? 100 : 0)
              : Math.max(0, Math.min(100, ((latestSnap.reported_value - baseline) / (k.target_value - baseline)) * 100));
          }
        }
        const weight = k.weight || 1;
        totalKpiWeight += weight;
        weightedKpiSum += (achievement * weight);
      });

      const avgKpiAchievement = totalKpiWeight > 0 ? Math.round(weightedKpiSum / totalKpiWeight) : 0;
      const spendRatio = p.budget_allocated > 0 ? (p.budget_spent / p.budget_allocated) : 0;

      // Risk level heuristic
      let riskLevel = 'low';
      if (spendRatio > 0.6 && avgKpiAchievement < 40) riskLevel = 'high';
      else if (spendRatio > 0.8 && avgKpiAchievement < 60) riskLevel = 'high';
      else if (spendRatio > 0.5 && avgKpiAchievement < 50) riskLevel = 'medium';

      // Scale-up readiness: >= 80% composite KPI score
      const scaleReadiness = avgKpiAchievement >= 80 ? 'ready' : (avgKpiAchievement >= 50 ? 'in_progress' : 'not_ready');

      const challenge = challenges.find(c => c.id === p.challenge_id);
      const startup = users.find(u => u.id === p.startup_id);

      return {
        ...p,
        challenge_title: challenge?.title || null,
        startup_name: startup?.full_name || startup?.organization || 'InnovateAI Solutions',
        district: p.district || 'Mumbai',
        milestones: pMilestones,
        milestones_paid_count: pMilestones.filter(m => m.status === 'paid').length,
        milestones_total_count: pMilestones.length,
        kpis: pKpis,
        kpi_achievement_avg: avgKpiAchievement,
        risk_level: riskLevel,
        scale_readiness: scaleReadiness,
      };
    });

    const pilotsAtRisk = enrichedPilots.filter(p => p.risk_level === 'high');
    const scaleReadyPilots = enrichedPilots.filter(p => p.scale_readiness === 'ready');

    // 3. Enriched Proposals
    const enrichedProposals = proposals.map(prop => {
      const challenge = challenges.find(c => c.id === prop.challenge_id);
      const startup = users.find(u => u.id === prop.startup_id);
      const propEvaluations = evaluations.filter(e => e.proposal_id === prop.id);
      
      const avgScore = propEvaluations.length > 0
        ? Number((propEvaluations.reduce((s, e) => s + (e.overall_score || (e.innovation_score + e.feasibility_score + e.impact_score) / 3), 0) / propEvaluations.length).toFixed(2))
        : (prop.overall_score || null);

      return {
        ...prop,
        challenge_title: challenge?.title || null,
        challenge_department: challenge?.department || null,
        startup_name: startup?.full_name || startup?.organization || 'Registered Startup',
        startup_org: startup?.organization || null,
        evaluations_count: propEvaluations.length,
        panel_score: avgScore,
      };
    });

    // 4. Enriched Challenges with Proposal Count
    const enrichedChallenges = challenges.map(c => {
      const cProposals = proposals.filter(p => p.challenge_id === c.id);
      return {
        ...c,
        proposals_count: cProposals.length,
      };
    });

    res.json({
      summary: {
        open_challenges_count: openChallenges.length,
        proposals_in_review_count: pendingProposals.length,
        active_pilots_count: activePilots.length,
        total_budget_sanctioned: totalAllocated,
        total_budget_disbursed: totalDisbursed,
        pilots_at_risk_count: pilotsAtRisk.length,
        scale_ready_count: scaleReadyPilots.length,
      },
      attention_required: {
        open_challenges: openChallenges,
        proposals_in_triage: enrichedProposals.filter(p => ['submitted', 'under_review'].includes(p.status)),
        pilots_at_risk: pilotsAtRisk,
        scale_up_ready: scaleReadyPilots,
      },
      challenges: enrichedChallenges,
      proposals: enrichedProposals,
      pilots: enrichedPilots,
      milestones,
      kpis,
      snapshots,
      evaluations,
      scale_decisions: scaleDecisions,
      experts: users.filter(u => u.role === 'expert'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
