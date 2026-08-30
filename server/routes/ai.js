const express = require('express');
const router = express.Router();

const JWT_SECRET = require('../middleware/auth').JWT_SECRET;

router.post('/challenge-copilot', (req, res) => {
  try {
    const { description } = req.body;
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'A description string is required' });
    }

    const result = generateCopilotResponse(description);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function generateCopilotResponse(raw) {
  const text = raw.trim();
  const keywords = extractKeywords(text);
  const domain = guessDomain(text, keywords);

  const problemStatement = `Current ${domain} processes show measurable failures, leading to inefficiencies and service gaps for ${keywords.slice(0, 2).join(' and ')} stakeholders. Existing workflows are manual, fragmented, or lack real-time visibility, causing delays and inconsistent outcomes.`;

  const desiredOutcome = `Implement a solution that reduces failures by at least 40%, cuts resolution time by 50%, and improves stakeholder satisfaction by 35% within the pilot period.`;

  const kpis = [
    { name: 'Failure Reduction Rate', description: 'Percentage decrease in identified failure events.', metric_type: 'quantitative', unit: '%', target_value: 40, weight: 1.0 },
    { name: 'Resolution Time', description: 'Average time from detection to resolution.', metric_type: 'quantitative', unit: 'hours', target_value: null, weight: 0.8 },
    { name: 'Service Coverage', description: 'Percentage of relevant areas/systems covered by the solution.', metric_type: 'quantitative', unit: '%', target_value: 90, weight: 0.7 },
    { name: 'Stakeholder Satisfaction', description: 'Satisfaction score from affected users or departments.', metric_type: 'qualitative', unit: 'score', target_value: 4.0, weight: 0.6 },
  ];

  const pilotScope = {
    duration_weeks: 12,
    budget_range: '$40,000 - $120,000',
    departments: [domain.charAt(0).toUpperCase() + domain.slice(1)],
    constraints: 'Must integrate with existing legacy systems where applicable; require minimal staff retraining; operate within current IT security boundaries.',
  };

  const eligibility = [
    'Demonstrated experience delivering at least one similar public-sector or civic technology project.',
    'Team composition includes a project lead, a technical architect, and a domain specialist familiar with local government operations.',
    'Proposal must include a clear data governance and privacy compliance plan aligned with applicable regulations.',
    'Proposed technology stack must support scalable deployment within the defined pilot scope.',
    'Ability to provide a maintenance and handover plan at pilot completion.',
  ];

  const evaluationFramework = {
    scoringDimensions: [
      { dimension: 'Innovation', description: 'Degree to which the solution introduces a novel approach or technology.', weight: 0.3 },
      { dimension: 'Feasibility', description: 'Realism of the proposed timeline, budget, and technical approach.', weight: 0.3 },
      { dimension: 'Impact', description: 'Magnitude of improvement relative to the stated failure rates and stakeholder pain points.', weight: 0.25 },
      { dimension: 'Team Capability', description: 'Strength of past performance, domain expertise, and organizational stability.', weight: 0.15 },
    ],
    thresholds: {
      strongly_accept: '>= 4.0 overall with strong feasibility and team capability',
      accept: '>= 3.5 overall',
      neutral: '>= 2.8 overall',
      reject: '< 2.8 overall',
    },
  };

  return {
    problem_statement: problemStatement,
    desired_outcomes: desiredOutcome,
    kpis,
    pilot_scope: pilotScope,
    eligibility_criteria: eligibility,
    evaluation_framework: evaluationFramework,
    suggested_title: `AI-Powered ${domain.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Improvement Initiative`,
    suggested_tags: keywords.slice(0, 4).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', '),
  };
}

function extractKeywords(text) {
  const stop = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','must','can','could','i','we','you','he','she','it','they','them','their','his','her','our','my','your','this','that','these','those','and','but','or','nor','for','yet','so','in','on','at','to','from','by','with','about','against','between','through','during','before','after','above','below','of','as','into','over','after','under','again','further','then','once','here','there','when','where','why','how','all','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','than','too','very','just','because','if','while','although','though','until','since','whether','while','want','need','reduce','city','our','help','using','based','new','way','system','systems','improve','solutions','service','services','data','process','processes']);
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !stop.has(w));
}

function guessDomain(text, keywords) {
  const lower = text.toLowerCase();
  const map = [
    { keys: ['waste','trash','garbage','recycling','refuse'], label: 'waste management' },
    { keys: ['transport','traffic','transit','mobility','commute','parking'], label: 'urban transport' },
    { keys: ['water','flood','drain','sewer','irrigation'], label: 'water infrastructure' },
    { keys: ['health','hospital','clinic','patient','medical'], label: 'public health' },
    { keys: ['education','school','student','learning','teacher'], label: 'education services' },
    { keys: ['energy','power','solar','grid','electricity'], label: 'energy systems' },
    { keys: ['safety','crime','police','emergency','fire'], label: 'public safety' },
    { keys: ['housing','homeless','shelter','rent','affordable'], label: 'housing services' },
    { keys: ['environment','carbon','climate','pollution','emissions','green'], label: 'environmental services' },
    { keys: ['tax','revenue','finance','budget','payment','billing'], label: 'revenue and finance' },
    { keys: ['citizen','service','request','complaint','permit','license'], label: 'citizen services' },
    { keys: ['land','property','registry','title','zoning'], label: 'land administration' },
    { keys: ['agriculture','farm','crop','food','livestock'], label: 'agriculture and food systems' },
    { keys: ['job','employment','workforce','career','training'], label: 'workforce development' },
  ];
  for (const m of map) {
    if (m.keys.some(k => lower.includes(k))) return m.label;
  }
  const first = keywords.slice(0, 2).join(' ') || 'civic operations';
  return first;
}

module.exports = router;
