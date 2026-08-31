const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize, logActivity } = require('../middleware/auth');

const router = express.Router();
const db = require('../db/store');

// 1. GET /api/kpis/pilot/all or /api/kpis/all
router.get('/pilot/all', authenticate, (req, res) => {
  try {
    const kpis = db.getAll('kpis');
    res.json(kpis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', authenticate, (req, res) => {
  try {
    const kpis = db.getAll('kpis');
    res.json(kpis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/kpis/risk-alerts - Automated Risk Engine
router.get('/risk-alerts', authenticate, (req, res) => {
  try {
    const pilots = db.getAll('pilots');
    const milestones = db.getAll('milestones');
    const kpis = db.getAll('kpis');
    const snapshots = db.getAll('kpi_snapshots');
    const challenges = db.getAll('challenges');
    const users = db.getAll('users');

    const alerts = [];

    pilots.forEach(p => {
      const pMilestones = milestones.filter(m => m.pilot_id === p.id);
      const pKpis = kpis.filter(k => k.pilot_id === p.id);
      const ch = challenges.find(c => c.id === p.challenge_id);
      const startup = users.find(u => u.id === p.startup_id);

      // Check overdue milestones
      pMilestones.forEach(m => {
        if (m.status !== 'paid' && m.target_date) {
          const target = new Date(m.target_date).getTime();
          const now = Date.now();
          const daysOverdue = Math.floor((now - target) / (1000 * 60 * 60 * 24));
          if (daysOverdue > 15) {
            alerts.push({
              pilot_id: p.id,
              pilot_title: p.title,
              startup_name: startup?.organization || startup?.full_name || 'InnovateAI',
              sector: ch?.sector || 'PWD',
              alert_type: 'delayed_milestone',
              severity: 'high',
              description: `Milestone "${m.title}" is delayed by ${daysOverdue} days. Immediate intervention required.`,
              days_overdue: daysOverdue,
            });
          }
        }
      });

      // Check low KPI performance
      if (p.budget_spent > 0 && p.budget_allocated > 0) {
        const spendRatio = p.budget_spent / p.budget_allocated;
        if (spendRatio > 0.5 && (p.progress_percentage || 0) < 40) {
          alerts.push({
            pilot_id: p.id,
            pilot_title: p.title,
            startup_name: startup?.organization || startup?.full_name || 'InnovateAI',
            sector: ch?.sector || 'PWD',
            alert_type: 'spend_variance',
            severity: 'medium',
            description: `Disbursed ${Math.round(spendRatio * 100)}% budget, but operational progress is lagging at ${p.progress_percentage}%.`,
          });
        }
      }
    });

    res.json({
      alerts_count: alerts.length,
      alerts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/kpis/pilot/:pilotId
router.get('/pilot/:pilotId', authenticate, (req, res) => {
  try {
    const kpis = db.getAll('kpis').filter(k => k.pilot_id === req.params.pilotId);
    res.json(kpis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /api/kpis - Create KPI definition
router.post('/', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const id = uuidv4();
    const { pilot_id, challenge_id, name, description, metric_type, unit, baseline_value, target_value, target_description, weight, direction } = req.body;
    
    const kpi = db.insert('kpis', {
      id,
      pilot_id: pilot_id || null,
      challenge_id: challenge_id || null,
      name,
      description: description || null,
      metric_type: metric_type || 'quantitative',
      unit: unit || '%',
      baseline_value: Number(baseline_value) || 0,
      target_value: Number(target_value) || 100,
      target_description: target_description || null,
      direction: direction || 'increase',
      weight: weight || 1.0,
    });
    
    logActivity(req.user.id, 'create_kpi', 'kpi', id, { name });
    res.status(201).json({ id, kpi });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. POST /api/kpis/snapshot - Startup submits field reading
router.post('/snapshot', authenticate, (req, res) => {
  try {
    const id = uuidv4();
    const { kpi_id, pilot_id, reported_value, reported_text, notes } = req.body;
    
    const snap = db.insert('kpi_snapshots', {
      id,
      kpi_id,
      pilot_id,
      reported_value: Number(reported_value) || 0,
      reported_text: reported_text || null,
      notes: notes || null,
      verified: false,
      reported_by: req.user.id,
      created_at: new Date().toISOString(),
    });
    
    logActivity(req.user.id, 'create_kpi_snapshot', 'kpi_snapshot', id, { kpi_id, reported_value });
    res.status(201).json({ id, snapshot: snap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. POST /api/kpis/snapshots/:snapshotId/verify - Officer Digital Sign-off
router.post('/snapshots/:snapshotId/verify', authenticate, authorize('government', 'admin'), (req, res) => {
  try {
    const snapshots = db.getAll('kpi_snapshots');
    const snap = snapshots.find(s => s.id === req.params.snapshotId);
    if (!snap) return res.status(404).json({ error: 'KPI snapshot not found' });

    const { verified, remarks } = req.body;
    const isVerified = verified !== false;

    const updated = db.update('kpi_snapshots', snap.id, {
      verified: isVerified,
      verified_by: req.user.id,
      verified_at: new Date().toISOString(),
      verification_remarks: remarks || 'Verified by Departmental Officer via IoT/Field Inspection',
      updated_at: new Date().toISOString(),
    });

    logActivity(req.user.id, 'verify_kpi_snapshot', 'kpi_snapshot', snap.id, {
      verified: isVerified,
      remarks,
    });

    res.json({
      message: isVerified ? 'Field telemetry snapshot digitally verified ✅' : 'Snapshot marked unverified',
      snapshot: updated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET /api/kpis/snapshots/pilot/:pilotId
router.get('/snapshots/pilot/:pilotId', authenticate, (req, res) => {
  try {
    const snapshots = db.getAll('kpi_snapshots')
      .filter(ks => ks.pilot_id === req.params.pilotId)
      .map(ks => ({
        ...ks,
        kpi_name: db.getAll('kpis').find(k => k.id === ks.kpi_id)?.name || null,
      }));
    
    snapshots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
