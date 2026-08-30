const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenges');
const proposalRoutes = require('./routes/proposals');
const evaluationRoutes = require('./routes/evaluations');
const pilotRoutes = require('./routes/pilots');
const kpiRoutes = require('./routes/kpis');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/pilots', pilotRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = require('./db/store');

console.log('In-memory database initialized with seed data');
console.log('Demo accounts:');
console.log('  officer@govpilot.gov / password123 (Government)');
console.log('  startup@innovate.ai / password123 (Startup)');
console.log('  expert@university.edu / password123 (Expert)');
console.log('  admin@govpilot.gov / password123 (Admin)');

app.listen(PORT, () => {
  console.log(`GovPilot OS running on http://localhost:${PORT}`);
});
