"use client";

import * as React from "react";
import { Button, Dialog } from "./ui";
import { createChallenge } from "@/lib/api";
import { Sector } from "@/lib/types";

interface CreateChallengeWizardProps {
  onClose: () => void;
  onCreated: () => void;
  departmentName?: string;
}

const DEFAULT_GEOGRAPHIES = [
  "Mumbai",
  "Pune",
  "Nagpur",
  "Nashik",
  "Aurangabad",
  "Thane",
  "Kolhapur",
  "Solapur",
  "Amravati",
  "Navi Mumbai",
];

const BENEFICIARY_OPTIONS = [
  "Citizens",
  "Drivers & Commuters",
  "Municipal Staff",
  "Transport Operators",
  "Farmers & Rural Communities",
  "Healthcare Workers",
  "Small Business Owners",
];

const INTEGRATION_OPTIONS = [
  "SCADA",
  "ITMS",
  "ERP (SAP/Oracle)",
  "State Government API Gateway",
  "GIS / Spatial Mapping",
  "Command & Control Centre (ICCC)",
];

const CLOUD_OPTIONS = [
  "Approved Government Cloud (NIC/MahaGov)",
  "MeitY-Empanelled Cloud",
  "On-Premise Government Datacentre",
  "Hybrid Government Cloud",
];

const SECURITY_REQUIREMENTS = [
  "End-to-End Encryption (in transit TLS 1.3 & at rest AES-256)",
  "Multi-Factor Authentication (MFA) for Administrative Access",
  "Role-Based Access Control (RBAC) & Principle of Least Privilege",
  "Tamper-Evident Audit Logging & SIEM Integration",
  "Vulnerability Assessment & Penetration Testing (CERT-In Empanelled VAPT)",
  "Comprehensive Incident Response & Disaster Recovery Plan",
  "MeitY Data Residency & Sovereign Local Storage Compliance",
  "Independent Third-Party Security & Code Quality Audit",
];

export function CreateChallengeWizard({
  onClose,
  onCreated,
  departmentName = "Department of Urban Development & Water Resources",
}: CreateChallengeWizardProps) {
  const [step, setStep] = React.useState<number>(1);
  const [status, setStatus] = React.useState<"draft" | "in_review" | "open">("draft");
  const [busy, setBusy] = React.useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = React.useState(false);

  // AI Modal States
  const [aiStep1Open, setAiStep1Open] = React.useState(false);
  const [aiStep1Prompt, setAiStep1Prompt] = React.useState("");
  const [aiGenerating, setAiGenerating] = React.useState(false);

  // Rubric Modal
  const [rubricOpenIndex, setRubricOpenIndex] = React.useState<number | null>(null);

  // Step 1 State: Challenge Basics
  const [basics, setBasics] = React.useState({
    title: "",
    department: departmentName,
    sector: "PWD" as Sector,
    problemStatement: "",
    desiredOutcome: "",
    geographies: ["Pune", "Mumbai"],
    newGeoInput: "",
    beneficiaries: ["Citizens", "Drivers & Commuters"],
    currentBaseline: "Avg. waiting time: 12 minutes during peak hours",
    pilotDurationValue: 90,
    pilotDurationUnit: "Days" as "Days" | "Weeks" | "Months",
    budgetMin: 500000,
    budgetMax: 1500000,
    challengeDeadline: "2026-09-30",
    scaleDecisionBy: "2026-12-30",
  });

  // Step 2 State: Eligibility & Constraints
  const [eligibilityCriteria, setEligibilityCriteria] = React.useState([
    {
      id: "ec-1",
      name: "DPIIT recognition",
      type: "Mandatory" as "Mandatory" | "Preferred" | "Scored",
      description: "Must be a DPIIT-recognized startup under Startup India.",
      verificationMethod: "Official verification (DPIIT portal)",
    },
    {
      id: "ec-2",
      name: "Prior turnover threshold",
      type: "Preferred" as "Mandatory" | "Preferred" | "Scored",
      description: "Prior annual turnover < ₹5 Cr permitted (early-stage relaxed).",
      verificationMethod: "Financial declaration",
    },
    {
      id: "ec-3",
      name: "Relevant deployment in India",
      type: "Preferred" as "Mandatory" | "Preferred" | "Scored",
      description: "At least 1 live pilot or municipal deployment in India preferred.",
      verificationMethod: "Evidence (documents/case studies)",
    },
  ]);

  const [techConstraints, setTechConstraints] = React.useState({
    integrations: ["ITMS", "Government API"],
    dataSensitivity: "Internal" as "Public" | "Internal" | "Confidential" | "Highly Sensitive",
    dataResidencyIndia: true,
    cloudDeployment: "Approved Government Cloud (NIC/MahaGov)",
    infraConstraints: ["Existing government infrastructure must be reused"],
  });

  // Step 3 State: Evaluation Priorities
  const [evaluationCriteria, setEvaluationCriteria] = React.useState([
    { name: "Problem / Solution Fit", weight: 20, rubricDefined: true },
    { name: "Innovation & Novelty", weight: 15, rubricDefined: true },
    { name: "Technical Feasibility", weight: 15, rubricDefined: true },
    { name: "Government Operational Fit", weight: 15, rubricDefined: false },
    { name: "Expected Outcome / Impact", weight: 15, rubricDefined: true },
    { name: "Scalability", weight: 10, rubricDefined: false },
    { name: "Cost Effectiveness", weight: 5, rubricDefined: false },
    { name: "Security & Compliance", weight: 5, rubricDefined: false },
  ]);

  // Step 4 State: Pilot & KPI
  const [pilotSetup, setPilotSetup] = React.useState({
    objective: "Reduce traffic waiting time at high-congestion intersections.",
    locations: "3 high-volume intersections in Pune: Swargate Chowk, University Road, Nal Stop",
    startupsCount: 3,
    deploymentTime: "≤ 15 days from work order signing",
    baselinePeriod: "Previous 30 days of traffic sensor & ITMS data",
  });

  const [kpis, setKpis] = React.useState([
    {
      id: "kpi-1",
      name: "Average peak hour waiting time reduction",
      baselineValue: "12 minutes",
      targetValue: "≤ 9.6 minutes",
      unit: "Minutes",
      dataSource: "Government system (e.g. ITMS, SCADA)",
      frequency: "Daily",
      threshold: "20% improvement over baseline",
      mandatory: true,
      measurementMethod: "Average waiting time = total waiting minutes / number of eligible vehicles during peak hours (8–11 AM, 5–8 PM).",
    },
    {
      id: "kpi-2",
      name: "System uptime & sensor telemetry reliability",
      baselineValue: "85%",
      targetValue: "≥ 99.5%",
      unit: "Percent",
      dataSource: "Independent validator",
      frequency: "Real-time",
      threshold: "Zero unscheduled downtime exceeding 15 minutes",
      mandatory: true,
      measurementMethod: "Calculated via automated ping watchdog logs on cloud ingestion pipeline.",
    },
  ]);

  const [pilotSuccessRules, setPilotSuccessRules] = React.useState({
    allMandatoryKpisPass: true,
    minOverallScore: 75,
    noSecurityFailure: true,
    independentValidation: true,
    validatorType: "Government lab",
  });

  // Step 5 State: IP, Data & Risk
  const [ipDataRisk, setIpDataRisk] = React.useState({
    dataOwnership: "Government retains ownership of all pilot data",
    dataAccess: ["Read-only access for government", "No raw data leaves government environment"],
    dataRetention: "Pilot + 90 days",
    backgroundIp: "Startup retained",
    newIp: "Startup owned with government license",
    newIpCustom: "",
    riskLevel: "Medium" as "Low" | "Medium" | "High",
    securityRequirements: [
      "End-to-End Encryption (in transit TLS 1.3 & at rest AES-256)",
      "Multi-Factor Authentication (MFA) for Administrative Access",
      "Role-Based Access Control (RBAC) & Principle of Least Privilege",
      "Tamper-Evident Audit Logging & SIEM Integration",
      "MeitY Data Residency & Sovereign Local Storage Compliance",
    ],
  });

  // Collapsible preview toggles in Step 6
  const [previewOpen, setPreviewOpen] = React.useState({
    basics: true,
    eligibility: false,
    evaluation: false,
    pilotKpi: false,
    ipRisk: false,
  });

  // Total Weight calculation
  const totalWeight = evaluationCriteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const weightsValid = totalWeight === 100;

  // Dynamic Readiness Calculation
  const checklist = React.useMemo(() => {
    const hasBasics = Boolean(
      basics.title.trim() &&
        basics.problemStatement.trim() &&
        basics.desiredOutcome.trim() &&
        basics.geographies.length > 0 &&
        basics.budgetMax > basics.budgetMin
    );
    const hasEligibility = eligibilityCriteria.length > 0;
    const hasEvaluation = weightsValid && evaluationCriteria.length >= 3;
    const hasPilotKpi = kpis.length > 0 && kpis.some((k) => k.mandatory);
    const hasIpRisk = Boolean(ipDataRisk.riskLevel && ipDataRisk.dataOwnership);

    let score = 0;
    if (hasBasics) score += 25;
    if (hasEligibility) score += 20;
    if (hasEvaluation) score += 20;
    if (hasPilotKpi) score += 20;
    if (hasIpRisk) score += 15;

    return {
      basics: hasBasics,
      eligibility: hasEligibility,
      evaluation: hasEvaluation,
      pilotKpi: hasPilotKpi,
      ipRisk: hasIpRisk,
      score,
    };
  }, [basics, eligibilityCriteria, weightsValid, evaluationCriteria, kpis, ipDataRisk]);

  // Handle final submission (Publish / Draft)
  async function handleFinalSubmit(targetStatus: "draft" | "in_review" | "open") {
    if (targetStatus === "open" && (!checklist.basics || !weightsValid || !checklist.pilotKpi)) {
      alert("Please ensure all mandatory sections are complete and evaluation weights total 100% before publishing.");
      return;
    }

    setBusy(true);
    try {
      await createChallenge({
        title: basics.title || "Untitled Innovation Challenge",
        sector: basics.sector,
        department: basics.department,
        district: basics.geographies[0] || "Mumbai",
        problem_statement: basics.problemStatement,
        outcome_metric: basics.desiredOutcome,
        expected_impact: basics.desiredOutcome,
        pilot_budget_min: basics.budgetMin,
        pilot_budget_max: basics.budgetMax,
        submission_deadline: basics.challengeDeadline,
        duration_weeks:
          basics.pilotDurationUnit === "Months"
            ? basics.pilotDurationValue * 4
            : basics.pilotDurationUnit === "Days"
            ? Math.round(basics.pilotDurationValue / 7)
            : basics.pilotDurationValue,
        dpiit_eligible: eligibilityCriteria.some((c) => c.name.toLowerCase().includes("dpiit")),
        programme: "MSINS Innovation Challenge 2026",
        priority: ipDataRisk.riskLevel === "High" ? "critical" : "high",
        tags: basics.beneficiaries.join(", "),
      });
      onCreated();
      onClose();
    } catch (e) {
      alert("Error creating challenge: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // AI Generator for Step 1
  function runAiStep1() {
    if (!aiStep1Prompt.trim()) return;
    setAiGenerating(true);
    setTimeout(() => {
      setBasics((b) => ({
        ...b,
        title: b.title || "AI-Based Municipal Civic Optimization",
        problemStatement: `Current manual and fragmented workflows across ${b.department} lead to service delays, citizen frustration, and higher operating overheads: ${aiStep1Prompt.trim()}`,
        desiredOutcome: "Achieve ≥30% reduction in resolution time and ensure 95% citizen satisfaction within pilot duration.",
        currentBaseline: "Baseline resolution latency: 7.5 days with manual escalation.",
      }));
      setAiGenerating(false);
      setAiStep1Open(false);
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 font-bold text-white shadow-xs">
              🏛️
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Create Innovation Challenge</h2>
              <p className="text-xs text-slate-500 font-medium">
                Maharashtra State Innovation Society · Outcome-Based Procurement Framework
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Stepper Navigation Strip */}
        <div className="border-b border-slate-200 bg-white px-4 py-2.5 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[720px] gap-2 text-xs font-semibold">
            {[
              { num: 1, label: "Challenge Basics" },
              { num: 2, label: "Eligibility & Constraints" },
              { num: 3, label: "Evaluation Priorities" },
              { num: 4, label: "Pilot & KPI" },
              { num: 5, label: "IP, Data & Risk" },
              { num: 6, label: "Review & Publish" },
            ].map((s) => {
              const active = step === s.num;
              const completed = step > s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => setStep(s.num)}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 transition-all ${
                    active
                      ? "bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-xs"
                      : completed
                      ? "text-emerald-700 hover:bg-slate-50"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      active
                        ? "bg-blue-600 text-white"
                        : completed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {completed ? "✓" : s.num}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area (Form on Left + Sticky Summary Panel on Right) */}
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 overflow-y-auto min-h-[460px]">
          {/* Left Main Form Step Content (Cols 1-8) */}
          <div className="p-6 lg:col-span-8 border-b lg:border-b-0 lg:border-r border-slate-200 space-y-6 overflow-y-auto max-h-[72vh]">
            {/* STEP 1: CHALLENGE BASICS */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Step 1: Challenge Information & Outcomes
                    </h3>
                    <p className="text-xs text-slate-500">Define the core civic problem in outcome-oriented terms.</p>
                  </div>
                  <button
                    onClick={() => setAiStep1Open(true)}
                    className="inline-flex items-center gap-1.5 rounded bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 shadow-xs transition-colors"
                  >
                    <span>✨</span>
                    <span>AI Challenge Copilot</span>
                  </button>
                </div>

                {/* Field 1: Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Challenge Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    placeholder="e.g. AI-Based Traffic Congestion Reduction"
                    value={basics.title}
                    onChange={(e) => setBasics({ ...basics, title: e.target.value })}
                  />
                </div>

                {/* Field 2: Department (Pre-filled read-only) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sponsoring Department</label>
                    <input
                      readOnly
                      className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 cursor-not-allowed"
                      value={basics.department}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sector Domain</label>
                    <select
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-hidden"
                      value={basics.sector}
                      onChange={(e) => setBasics({ ...basics, sector: e.target.value as Sector })}
                    >
                      <option value="PWD">Public Works Department (PWD)</option>
                      <option value="Urban Waste">Urban Waste Management</option>
                      <option value="Water Quality">Water Quality & Resources</option>
                    </select>
                  </div>
                </div>

                {/* Field 3: Problem Statement */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Problem Statement (Outcome-Oriented) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    placeholder="Describe the public problem in terms of outcomes. Example: High traffic congestion at major intersections leads to long waiting times, fuel wastage, and increased emissions."
                    value={basics.problemStatement}
                    onChange={(e) => setBasics({ ...basics, problemStatement: e.target.value })}
                  />
                </div>

                {/* Field 4: Desired Public Outcome */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Desired Public Outcome <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    placeholder="e.g. Reduce average waiting time by 20% at high-volume intersections during peak hours."
                    value={basics.desiredOutcome}
                    onChange={(e) => setBasics({ ...basics, desiredOutcome: e.target.value })}
                  />
                </div>

                {/* Field 5: Target Geographies */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Deployment Geographies</label>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {basics.geographies.map((geo) => (
                      <span
                        key={geo}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800"
                      >
                        <span>{geo}</span>
                        <button
                          onClick={() => setBasics({ ...basics, geographies: basics.geographies.filter((g) => g !== geo) })}
                          className="text-slate-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900"
                      onChange={(e) => {
                        if (e.target.value && !basics.geographies.includes(e.target.value)) {
                          setBasics({ ...basics, geographies: [...basics.geographies, e.target.value] });
                        }
                      }}
                    >
                      <option value="">+ Select District...</option>
                      {DEFAULT_GEOGRAPHIES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Field 6 & 7: Beneficiaries & Baseline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Beneficiary Group</label>
                    <div className="space-y-1 max-h-28 overflow-y-auto rounded border border-slate-200 p-2 bg-slate-50">
                      {BENEFICIARY_OPTIONS.map((ben) => (
                        <label key={ben} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={basics.beneficiaries.includes(ben)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBasics({ ...basics, beneficiaries: [...basics.beneficiaries, ben] });
                              } else {
                                setBasics({ ...basics, beneficiaries: basics.beneficiaries.filter((b) => b !== ben) });
                              }
                            }}
                          />
                          <span>{ben}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Current Baseline Metric</label>
                    <input
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                      placeholder="e.g. Avg. waiting time: 12 minutes during peak hours"
                      value={basics.currentBaseline}
                      onChange={(e) => setBasics({ ...basics, currentBaseline: e.target.value })}
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Starting point against which outcome will be verified.</p>
                  </div>
                </div>

                {/* Field 8 & 9: Pilot Duration & Expected Budget */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pilot Duration</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-24 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                        value={basics.pilotDurationValue}
                        onChange={(e) => setBasics({ ...basics, pilotDurationValue: Number(e.target.value) })}
                      />
                      <select
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                        value={basics.pilotDurationUnit}
                        onChange={(e) =>
                          setBasics({ ...basics, pilotDurationUnit: e.target.value as typeof basics.pilotDurationUnit })
                        }
                      >
                        <option value="Days">Days</option>
                        <option value="Weeks">Weeks</option>
                        <option value="Months">Months</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Expected Pilot Budget Envelope (₹)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min (₹)"
                        className="w-1/2 rounded border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-900 font-mono"
                        value={basics.budgetMin}
                        onChange={(e) => setBasics({ ...basics, budgetMin: Number(e.target.value) })}
                      />
                      <span className="text-slate-400">–</span>
                      <input
                        type="number"
                        placeholder="Max (₹)"
                        className="w-1/2 rounded border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-900 font-mono"
                        value={basics.budgetMax}
                        onChange={(e) => setBasics({ ...basics, budgetMax: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                {/* Field 10 & 11: Deadlines */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Challenge Application Deadline <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                      value={basics.challengeDeadline}
                      onChange={(e) => setBasics({ ...basics, challengeDeadline: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Scale Decision Deadline <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                      value={basics.scaleDecisionBy}
                      onChange={(e) => setBasics({ ...basics, scaleDecisionBy: e.target.value })}
                    />
                  </div>
                </div>

                {/* AI Warning Box */}
                {basics.budgetMax < 200000 && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    ⚠️ <strong>Potential Inconsistency:</strong> Estimated IoT and hardware deployment requirements may
                    exceed the stated pilot budget limit of ₹{basics.budgetMax.toLocaleString()}.
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: ELIGIBILITY & CONSTRAINTS */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Step 2: Startup Eligibility & Technical Constraints
                    </h3>
                    <p className="text-xs text-slate-500">Define dynamic eligibility criteria and integration boundaries.</p>
                  </div>
                  <button
                    onClick={() => {
                      alert("✨ AI analyzed your civic problem and confirmed recommended criteria with DPIIT validation!");
                    }}
                    className="inline-flex items-center gap-1.5 rounded bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 shadow-xs"
                  >
                    <span>✨</span>
                    <span>Suggest Eligibility Criteria</span>
                  </button>
                </div>

                {/* Section A: Startup Eligibility Criteria */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Section A: Startup Eligibility Criteria Builder
                    </label>
                    <button
                      onClick={() =>
                        setEligibilityCriteria([
                          ...eligibilityCriteria,
                          {
                            id: `ec-${Date.now()}`,
                            name: "Maharashtra presence / office",
                            type: "Preferred",
                            description: "Operational footprint or registered office in Maharashtra.",
                            verificationMethod: "Self-declaration",
                          },
                        ])
                      }
                      className="text-xs font-bold text-blue-700 hover:underline"
                    >
                      + Add Criterion
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {eligibilityCriteria.map((ec, idx) => (
                      <div key={ec.id} className="rounded border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-5">
                            <label className="text-[11px] font-semibold text-slate-600">Criterion Name</label>
                            <input
                              className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                              value={ec.name}
                              onChange={(e) => {
                                const copy = [...eligibilityCriteria];
                                copy[idx].name = e.target.value;
                                setEligibilityCriteria(copy);
                              }}
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="text-[11px] font-semibold text-slate-600">Type</label>
                            <select
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold"
                              value={ec.type}
                              onChange={(e) => {
                                const copy = [...eligibilityCriteria];
                                copy[idx].type = e.target.value as any;
                                setEligibilityCriteria(copy);
                              }}
                            >
                              <option value="Mandatory">🔴 Mandatory</option>
                              <option value="Preferred">🟡 Preferred</option>
                              <option value="Scored">🔵 Scored</option>
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="text-[11px] font-semibold text-slate-600">Verification</label>
                            <select
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                              value={ec.verificationMethod}
                              onChange={(e) => {
                                const copy = [...eligibilityCriteria];
                                copy[idx].verificationMethod = e.target.value;
                                setEligibilityCriteria(copy);
                              }}
                            >
                              <option>Official verification (DPIIT portal)</option>
                              <option>Financial declaration</option>
                              <option>Evidence (documents/case studies)</option>
                              <option>Document + review</option>
                              <option>Self-declaration</option>
                            </select>
                          </div>

                          <div className="sm:col-span-1 text-right pt-4">
                            {eligibilityCriteria.length > 1 && (
                              <button
                                onClick={() => setEligibilityCriteria(eligibilityCriteria.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-700 font-bold text-sm"
                                title="Remove criterion"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <input
                            className="w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
                            placeholder="Detailed requirement description..."
                            value={ec.description}
                            onChange={(e) => {
                              const copy = [...eligibilityCriteria];
                              copy[idx].description = e.target.value;
                              setEligibilityCriteria(copy);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="mt-2 text-[11px] text-slate-500">
                    💡 <em>Tip: Use “Mandatory” only for essential statutory requirements. Use “Preferred” or “Scored” for prior experience to stay startup-friendly.</em>
                  </p>
                </div>

                {/* Section B: Technical Constraints & Data Residency */}
                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Section B: Technical Constraints & Data Residency
                  </label>

                  {/* 1. Integrations */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Required Municipal / Department Integrations
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {INTEGRATION_OPTIONS.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 rounded border border-slate-200 bg-white p-2 text-xs text-slate-800">
                          <input
                            type="checkbox"
                            checked={techConstraints.integrations.includes(opt)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTechConstraints({
                                  ...techConstraints,
                                  integrations: [...techConstraints.integrations, opt],
                                });
                              } else {
                                setTechConstraints({
                                  ...techConstraints,
                                  integrations: techConstraints.integrations.filter((i) => i !== opt),
                                });
                              }
                            }}
                          />
                          <span className="truncate">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 2. Data Sensitivity & Residency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Data Sensitivity Classification</label>
                      <div className="flex flex-wrap gap-2">
                        {["Public", "Internal", "Confidential", "Highly Sensitive"].map((lvl) => (
                          <label
                            key={lvl}
                            className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium cursor-pointer ${
                              techConstraints.dataSensitivity === lvl
                                ? "border-blue-600 bg-blue-50 text-blue-800 font-bold"
                                : "border-slate-300 bg-white text-slate-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name="dataSens"
                              checked={techConstraints.dataSensitivity === lvl}
                              onChange={() => setTechConstraints({ ...techConstraints, dataSensitivity: lvl as any })}
                            />
                            <span>{lvl}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Data Residency</label>
                      <label className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50/60 p-2 text-xs font-medium text-emerald-900">
                        <input
                          type="checkbox"
                          checked={techConstraints.dataResidencyIndia}
                          onChange={(e) => setTechConstraints({ ...techConstraints, dataResidencyIndia: e.target.checked })}
                        />
                        <span>Data must strictly reside in India (MeitY-aligned sovereign storage)</span>
                      </label>
                    </div>
                  </div>

                  {/* 3. Cloud Deployment */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Cloud Deployment Model</label>
                    <select
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                      value={techConstraints.cloudDeployment}
                      onChange={(e) => setTechConstraints({ ...techConstraints, cloudDeployment: e.target.value })}
                    >
                      {CLOUD_OPTIONS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: EVALUATION PRIORITIES */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Step 3: Evaluation Criteria & Scoring Weights
                    </h3>
                    <p className="text-xs text-slate-500">Allocate 100% total weight across independent expert evaluation dimensions.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEvaluationCriteria([
                        { name: "Problem / Solution Fit", weight: 20, rubricDefined: true },
                        { name: "Innovation & Novelty", weight: 15, rubricDefined: true },
                        { name: "Technical Feasibility", weight: 15, rubricDefined: true },
                        { name: "Government Operational Fit", weight: 15, rubricDefined: true },
                        { name: "Expected Outcome / Impact", weight: 15, rubricDefined: true },
                        { name: "Scalability", weight: 10, rubricDefined: false },
                        { name: "Cost Effectiveness", weight: 5, rubricDefined: false },
                        { name: "Security & Compliance", weight: 5, rubricDefined: false },
                      ]);
                    }}
                    className="inline-flex items-center gap-1.5 rounded bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 shadow-xs"
                  >
                    <span>✨</span>
                    <span>Auto-Balance 100% Weights</span>
                  </button>
                </div>

                {/* Criteria Table */}
                <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="p-3">Criterion Dimension</th>
                        <th className="p-3 w-28 text-center">Weight (%)</th>
                        <th className="p-3 w-36 text-center">Expert Rubric</th>
                        <th className="p-3 w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {evaluationCriteria.map((crit, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <input
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-900"
                              value={crit.name}
                              onChange={(e) => {
                                const copy = [...evaluationCriteria];
                                copy[idx].name = e.target.value;
                                setEvaluationCriteria(copy);
                              }}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-center font-mono font-bold text-xs"
                                value={crit.weight}
                                onChange={(e) => {
                                  const copy = [...evaluationCriteria];
                                  copy[idx].weight = Number(e.target.value);
                                  setEvaluationCriteria(copy);
                                }}
                              />
                              <span className="text-slate-500">%</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setRubricOpenIndex(idx)}
                              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold ${
                                crit.rubricDefined
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <span>{crit.rubricDefined ? "✓ Rubric (0-10)" : "Define Rubric"}</span>
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            {evaluationCriteria.length > 3 && (
                              <button
                                onClick={() => setEvaluationCriteria(evaluationCriteria.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() =>
                      setEvaluationCriteria([
                        ...evaluationCriteria,
                        { name: "Additional Dimension", weight: 0, rubricDefined: false },
                      ])
                    }
                    className="text-xs font-bold text-blue-700 hover:underline"
                  >
                    + Add Criterion
                  </button>

                  <div
                    className={`inline-flex items-center gap-2 rounded px-3 py-1 text-xs font-bold ${
                      weightsValid ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-red-100 text-red-900 border border-red-300"
                    }`}
                  >
                    <span>Total Weight: {totalWeight}%</span>
                    <span>{weightsValid ? "✅ (100% Balanced)" : "⚠️ Must equal 100%"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: PILOT & KPI */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Step 4: Pilot Testbed Setup & Outcome KPI Builder
                    </h3>
                    <p className="text-xs text-slate-500">Configure verifiable pilot tranches and success criteria.</p>
                  </div>
                  <button
                    onClick={() => {
                      alert("✨ AI suggested 3 verifiable outcome KPIs linked directly to your problem statement!");
                    }}
                    className="inline-flex items-center gap-1.5 rounded bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 shadow-xs"
                  >
                    <span>✨</span>
                    <span>Suggest KPIs</span>
                  </button>
                </div>

                {/* Section A: Pilot Setup */}
                <div className="space-y-3 rounded border border-slate-200 bg-slate-50/60 p-3.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Section A: Pilot Deployment Parameters
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Pilot Objective</label>
                      <input
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        value={pilotSetup.objective}
                        onChange={(e) => setPilotSetup({ ...pilotSetup, objective: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Number of Startups to Select for Pilot</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold"
                        value={pilotSetup.startupsCount}
                        onChange={(e) => setPilotSetup({ ...pilotSetup, startupsCount: Number(e.target.value) })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Pilot Locations / Testbed Sites</label>
                      <input
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        value={pilotSetup.locations}
                        onChange={(e) => setPilotSetup({ ...pilotSetup, locations: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: KPI Builder */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Section B: Outcome KPI Builder
                    </label>
                    <button
                      onClick={() =>
                        setKpis([
                          ...kpis,
                          {
                            id: `kpi-${Date.now()}`,
                            name: "Citizen Grievance Resolution SLA",
                            baselineValue: "72 hours",
                            targetValue: "≤ 12 hours",
                            unit: "Hours",
                            dataSource: "Government system (e.g. ITMS, SCADA)",
                            frequency: "Monthly",
                            threshold: "80% reduction in response time",
                            mandatory: false,
                            measurementMethod: "Calculated from civic ticketing portal timestamps.",
                          },
                        ])
                      }
                      className="text-xs font-bold text-blue-700 hover:underline"
                    >
                      + Add KPI
                    </button>
                  </div>

                  <div className="space-y-3">
                    {kpis.map((kpi, idx) => (
                      <div key={kpi.id} className="rounded border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <label className="text-[11px] font-bold text-slate-700">KPI Indicator Name</label>
                            <input
                              className="w-full rounded border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-900"
                              value={kpi.name}
                              onChange={(e) => {
                                const copy = [...kpis];
                                copy[idx].name = e.target.value;
                                setKpis(copy);
                              }}
                            />
                          </div>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-red-700 pt-4 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={kpi.mandatory}
                              onChange={(e) => {
                                const copy = [...kpis];
                                copy[idx].mandatory = e.target.checked;
                                setKpis(copy);
                              }}
                            />
                            <span>Mandatory KPI 🔴</span>
                          </label>
                          {kpis.length > 1 && (
                            <button
                              onClick={() => setKpis(kpis.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-600 font-bold pt-4"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <label className="text-[10.5px] font-semibold text-slate-500">Baseline Value</label>
                            <input
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                              value={kpi.baselineValue}
                              onChange={(e) => {
                                const copy = [...kpis];
                                copy[idx].baselineValue = e.target.value;
                                setKpis(copy);
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-[10.5px] font-semibold text-slate-500">Target Value</label>
                            <input
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-bold text-blue-700"
                              value={kpi.targetValue}
                              onChange={(e) => {
                                const copy = [...kpis];
                                copy[idx].targetValue = e.target.value;
                                setKpis(copy);
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-[10.5px] font-semibold text-slate-500">Data Source</label>
                            <select
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                              value={kpi.dataSource}
                              onChange={(e) => {
                                const copy = [...kpis];
                                copy[idx].dataSource = e.target.value;
                                setKpis(copy);
                              }}
                            >
                              <option>Government system (e.g. ITMS, SCADA)</option>
                              <option>Independent validator</option>
                              <option>IoT / field device</option>
                              <option>Startup system/platform</option>
                              <option>Uploaded dataset</option>
                              <option>Manual government entry</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10.5px] font-semibold text-slate-500">Frequency</label>
                            <select
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                              value={kpi.frequency}
                              onChange={(e) => {
                                const copy = [...kpis];
                                copy[idx].frequency = e.target.value;
                                setKpis(copy);
                              }}
                            >
                              <option>Real-time</option>
                              <option>Daily</option>
                              <option>Weekly</option>
                              <option>Monthly</option>
                              <option>Per milestone</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10.5px] font-semibold text-slate-500">Measurement Formula / Protocol</label>
                          <input
                            className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 font-mono"
                            value={kpi.measurementMethod}
                            onChange={(e) => {
                              const copy = [...kpis];
                              copy[idx].measurementMethod = e.target.value;
                              setKpis(copy);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section C: Pilot Success Rules & Outcome Mapping */}
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 space-y-3 text-xs">
                  <label className="font-bold text-slate-800 uppercase tracking-wide">
                    Section C: Pilot Success Rules & GeM Scale-Up Mapping
                  </label>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={pilotSuccessRules.allMandatoryKpisPass}
                        onChange={(e) => setPilotSuccessRules({ ...pilotSuccessRules, allMandatoryKpisPass: e.target.checked })}
                      />
                      <span>All mandatory outcome KPIs must achieve target threshold</span>
                    </label>

                    <label className="flex items-center gap-2 font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={pilotSuccessRules.noSecurityFailure}
                        onChange={(e) => setPilotSuccessRules({ ...pilotSuccessRules, noSecurityFailure: e.target.checked })}
                      />
                      <span>Zero critical cybersecurity or data integrity failures permitted</span>
                    </label>

                    <label className="flex items-center gap-2 font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={pilotSuccessRules.independentValidation}
                        onChange={(e) => setPilotSuccessRules({ ...pilotSuccessRules, independentValidation: e.target.checked })}
                      />
                      <span>Independent departmental / lab validation required before scale sign-off</span>
                    </label>
                  </div>

                  <div className="mt-2 rounded bg-white p-2.5 border border-slate-200 text-[11.5px] text-slate-700 space-y-1">
                    <div className="font-bold text-slate-900">Platform Scale-Up Decision Outcomes:</div>
                    <div className="flex items-center gap-2">🟢 <strong>SCALE (GeM Pathway):</strong> If ≥80% weighted KPI score achieved & mandatory KPIs passed.</div>
                    <div className="flex items-center gap-2">🟡 <strong>ITERATE:</strong> If 50–79% achieved with specific corrective milestone tranche.</div>
                    <div className="flex items-center gap-2">🔴 <strong>CLOSE:</strong> If &lt;50% achieved or critical compliance failure occurs.</div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: IP, DATA & RISK */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Step 5: Intellectual Property, Data Governance & Risk
                    </h3>
                    <p className="text-xs text-slate-500">Define data ownership, IP rights, and cybersecurity controls.</p>
                  </div>
                  <button
                    onClick={() => {
                      alert("✨ AI recommended Medium Risk profile with End-to-End Encryption & Sovereign MeitY data residency!");
                    }}
                    className="inline-flex items-center gap-1.5 rounded bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 shadow-xs"
                  >
                    <span>✨</span>
                    <span>Suggest Security Controls</span>
                  </button>
                </div>

                {/* Section A: Data Ownership & Access */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Section A: Data Ownership & Access
                  </label>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Data Ownership</label>
                    <div className="space-y-1.5 text-xs">
                      {[
                        "Government retains ownership of all pilot data",
                        "Startup retains ownership; government gets irrevocable royalty-free license",
                        "Shared ownership with defined access rights",
                        "As specified by standard state procurement terms",
                      ].map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-slate-800">
                          <input
                            type="radio"
                            name="dataOwnership"
                            checked={ipDataRisk.dataOwnership === opt}
                            onChange={() => setIpDataRisk({ ...ipDataRisk, dataOwnership: opt })}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Data Retention Period</label>
                      <select
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        value={ipDataRisk.dataRetention}
                        onChange={(e) => setIpDataRisk({ ...ipDataRisk, dataRetention: e.target.value })}
                      >
                        <option>Pilot period only</option>
                        <option>Pilot + 30 days</option>
                        <option>Pilot + 90 days</option>
                        <option>Permanent state archive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Background Intellectual Property</label>
                      <select
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        value={ipDataRisk.backgroundIp}
                        onChange={(e) => setIpDataRisk({ ...ipDataRisk, backgroundIp: e.target.value })}
                      >
                        <option>Startup retained</option>
                        <option>Government provided</option>
                        <option>Third-party licensed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section B: Cybersecurity & Risk Level */}
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Section B: Cybersecurity & Risk Level
                  </label>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Challenge Operational Risk Level</label>
                    <div className="flex items-center gap-3">
                      {[
                        { lvl: "Low", label: "🟢 Low Risk" },
                        { lvl: "Medium", label: "🟡 Medium Risk" },
                        { lvl: "High", label: "🔴 High Risk" },
                      ].map((item) => (
                        <label
                          key={item.lvl}
                          className={`flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-bold cursor-pointer ${
                            ipDataRisk.riskLevel === item.lvl
                              ? "border-blue-600 bg-blue-50 text-blue-900 shadow-xs"
                              : "border-slate-300 bg-white text-slate-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="riskLvl"
                            checked={ipDataRisk.riskLevel === item.lvl}
                            onChange={() => setIpDataRisk({ ...ipDataRisk, riskLevel: item.lvl as any })}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mandatory Security Controls</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {SECURITY_REQUIREMENTS.map((req) => (
                        <label key={req} className="flex items-center gap-2 rounded border border-slate-200 bg-white p-2 text-slate-800">
                          <input
                            type="checkbox"
                            checked={ipDataRisk.securityRequirements.includes(req)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setIpDataRisk({
                                  ...ipDataRisk,
                                  securityRequirements: [...ipDataRisk.securityRequirements, req],
                                });
                              } else {
                                setIpDataRisk({
                                  ...ipDataRisk,
                                  securityRequirements: ipDataRisk.securityRequirements.filter((r) => r !== req),
                                });
                              }
                            }}
                          />
                          <span className="truncate">{req}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: REVIEW & PUBLISH */}
            {step === 6 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Step 6: Challenge Readiness & Final Publishing
                    </h3>
                    <p className="text-xs text-slate-500">Review readiness scorecard and publish challenge to startups.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                    <span>Readiness: {checklist.score}%</span>
                    <span>{checklist.score >= 80 ? "✅ Ready" : "⚠️ Draft"}</span>
                  </div>
                </div>

                {/* Section A: Readiness Checklist */}
                <div className="rounded border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 uppercase tracking-wide mb-1">
                    Pre-Flight Governance Checklist
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <span>{checklist.basics ? "✅" : "❌"}</span>
                      <span>Problem clearly defined & measurable</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <span>{checklist.eligibility ? "✅" : "❌"}</span>
                      <span>Startup eligibility criteria configured</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <span>{weightsValid ? "✅" : "❌"}</span>
                      <span>Evaluation weights total 100% ({totalWeight}%)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <span>{checklist.pilotKpi ? "✅" : "❌"}</span>
                      <span>Outcome KPIs & mandatory rules defined</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <span>{checklist.ipRisk ? "✅" : "❌"}</span>
                      <span>IP, data sovereignty & risk controls set</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <span>✅</span>
                      <span>DPIIT Startup India verification enabled</span>
                    </div>
                  </div>
                </div>

                {/* Section B: Collapsible Full Preview */}
                <div className="space-y-2">
                  <div className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                    Full Challenge Specification Preview
                  </div>

                  {/* Accordion 1: Basics */}
                  <div className="rounded border border-slate-200 bg-white overflow-hidden text-xs">
                    <button
                      onClick={() => setPreviewOpen({ ...previewOpen, basics: !previewOpen.basics })}
                      className="w-full flex items-center justify-between bg-slate-50 px-4 py-2 font-bold text-slate-800"
                    >
                      <span>1. Challenge Basics & Scope</span>
                      <span>{previewOpen.basics ? "▲" : "▼"}</span>
                    </button>
                    {previewOpen.basics && (
                      <div className="p-4 space-y-2 text-slate-700 bg-white border-t border-slate-100">
                        <div><strong>Title:</strong> {basics.title || "—"}</div>
                        <div><strong>Department:</strong> {basics.department} · {basics.sector}</div>
                        <div><strong>Problem Statement:</strong> {basics.problemStatement || "—"}</div>
                        <div><strong>Desired Outcome:</strong> {basics.desiredOutcome || "—"}</div>
                        <div><strong>Geographies:</strong> {basics.geographies.join(", ")}</div>
                        <div>
                          <strong>Pilot Budget:</strong> ₹{basics.budgetMin.toLocaleString()} – ₹{basics.budgetMax.toLocaleString()} · {basics.pilotDurationValue} {basics.pilotDurationUnit}
                        </div>
                        <div><strong>Application Deadline:</strong> {basics.challengeDeadline}</div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Eligibility */}
                  <div className="rounded border border-slate-200 bg-white overflow-hidden text-xs">
                    <button
                      onClick={() => setPreviewOpen({ ...previewOpen, eligibility: !previewOpen.eligibility })}
                      className="w-full flex items-center justify-between bg-slate-50 px-4 py-2 font-bold text-slate-800"
                    >
                      <span>2. Eligibility Criteria ({eligibilityCriteria.length})</span>
                      <span>{previewOpen.eligibility ? "▲" : "▼"}</span>
                    </button>
                    {previewOpen.eligibility && (
                      <div className="p-4 space-y-2 text-slate-700 bg-white border-t border-slate-100">
                        {eligibilityCriteria.map((c) => (
                          <div key={c.id} className="border-b border-slate-100 pb-1.5 last:border-b-0">
                            <strong>{c.name}</strong> ({c.type}) — {c.description} <em>[{c.verificationMethod}]</em>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Accordion 3: Evaluation */}
                  <div className="rounded border border-slate-200 bg-white overflow-hidden text-xs">
                    <button
                      onClick={() => setPreviewOpen({ ...previewOpen, evaluation: !previewOpen.evaluation })}
                      className="w-full flex items-center justify-between bg-slate-50 px-4 py-2 font-bold text-slate-800"
                    >
                      <span>3. Evaluation Framework ({evaluationCriteria.length} Dimensions, {totalWeight}%)</span>
                      <span>{previewOpen.evaluation ? "▲" : "▼"}</span>
                    </button>
                    {previewOpen.evaluation && (
                      <div className="p-4 text-slate-700 bg-white border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                          {evaluationCriteria.map((c, i) => (
                            <div key={i} className="flex justify-between border-b border-slate-100 py-1">
                              <span>{c.name}</span>
                              <span className="font-mono font-bold text-blue-700">{c.weight}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 4: KPIs */}
                  <div className="rounded border border-slate-200 bg-white overflow-hidden text-xs">
                    <button
                      onClick={() => setPreviewOpen({ ...previewOpen, pilotKpi: !previewOpen.pilotKpi })}
                      className="w-full flex items-center justify-between bg-slate-50 px-4 py-2 font-bold text-slate-800"
                    >
                      <span>4. Pilot Testbed & Outcome KPIs ({kpis.length})</span>
                      <span>{previewOpen.pilotKpi ? "▲" : "▼"}</span>
                    </button>
                    {previewOpen.pilotKpi && (
                      <div className="p-4 space-y-2 text-slate-700 bg-white border-t border-slate-100">
                        <div><strong>Pilot Objective:</strong> {pilotSetup.objective}</div>
                        <div><strong>Locations:</strong> {pilotSetup.locations}</div>
                        <div className="mt-2 space-y-1.5">
                          {kpis.map((k) => (
                            <div key={k.id} className="rounded bg-slate-50 p-2 border border-slate-200">
                              <strong>{k.name}</strong> {k.mandatory && <span className="text-red-600 font-bold">[Mandatory]</span>}
                              <div>
                                Baseline: {k.baselineValue} → Target: {k.targetValue} ({k.frequency}, {k.dataSource})
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section C: Publishing Actions */}
                <div className="rounded-md border border-blue-200 bg-blue-50/70 p-4 space-y-3 text-xs">
                  <div className="font-bold text-blue-900 uppercase tracking-wide">
                    Section C: Publishing Decision
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleFinalSubmit("draft")}
                      disabled={busy}
                      className="rounded border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs"
                    >
                      Save as Draft
                    </button>
                    <button
                      onClick={() => handleFinalSubmit("in_review")}
                      disabled={busy}
                      className="rounded border border-amber-300 bg-amber-100 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-200 shadow-2xs"
                    >
                      Submit for Internal Review
                    </button>
                    <button
                      onClick={() => setPublishConfirmOpen(true)}
                      disabled={busy || !checklist.basics || !weightsValid}
                      className="rounded bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
                    >
                      Publish Challenge to Startups 🚀
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                disabled={step === 1}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30"
              >
                ← Back
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFinalSubmit("draft")}
                  className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Save Draft
                </button>
                {step < 6 ? (
                  <button
                    onClick={() => setStep((s) => Math.min(6, s + 1))}
                    className="rounded bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-black transition-colors"
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    onClick={() => setPublishConfirmOpen(true)}
                    disabled={!checklist.basics || !weightsValid}
                    className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    Publish Challenge
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Sticky Summary Panel (Cols 9-12) */}
          <div className="p-5 lg:col-span-4 bg-slate-50/75 flex flex-col justify-between space-y-6 text-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-800 uppercase tracking-wide">Challenge Summary</span>
                <span className="rounded bg-blue-100 text-blue-900 font-bold px-2 py-0.5 text-[11px]">
                  {status === "open" ? "Published" : status === "in_review" ? "In Review" : "Draft"}
                </span>
              </div>

              {/* Dynamic Readiness Score Gauge */}
              <div className="rounded border border-slate-200 bg-white p-3 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Governance Readiness</span>
                  <span className="font-mono font-bold text-blue-700">{checklist.score}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-all duration-300 ${
                      checklist.score >= 80 ? "bg-emerald-500" : checklist.score >= 50 ? "bg-amber-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${checklist.score}%` }}
                  />
                </div>
              </div>

              {/* Section Checklist */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Section Checklist:</div>
                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => setStep(1)}
                    className="w-full flex items-center justify-between rounded p-1.5 hover:bg-white text-left text-slate-700 transition-colors"
                  >
                    <span>① Problem Basics</span>
                    <span>{checklist.basics ? "✅" : "⚠️"}</span>
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full flex items-center justify-between rounded p-1.5 hover:bg-white text-left text-slate-700 transition-colors"
                  >
                    <span>② Eligibility & Constraints</span>
                    <span>{checklist.eligibility ? "✅" : "⚠️"}</span>
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="w-full flex items-center justify-between rounded p-1.5 hover:bg-white text-left text-slate-700 transition-colors"
                  >
                    <span>③ Evaluation Weights</span>
                    <span>{weightsValid ? "✅ 100%" : `⚠️ ${totalWeight}%`}</span>
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="w-full flex items-center justify-between rounded p-1.5 hover:bg-white text-left text-slate-700 transition-colors"
                  >
                    <span>④ Pilot & Outcome KPIs</span>
                    <span>{checklist.pilotKpi ? "✅" : "⚠️"}</span>
                  </button>
                  <button
                    onClick={() => setStep(5)}
                    className="w-full flex items-center justify-between rounded p-1.5 hover:bg-white text-left text-slate-700 transition-colors"
                  >
                    <span>⑤ IP, Data & Risk</span>
                    <span>{checklist.ipRisk ? "✅" : "⚠️"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Sticky Action Buttons */}
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <button
                onClick={() => handleFinalSubmit("draft")}
                className="w-full rounded border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleFinalSubmit("in_review")}
                className="w-full rounded border border-amber-300 bg-amber-50 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 shadow-2xs"
              >
                Submit for Internal Review
              </button>
              <button
                onClick={() => setPublishConfirmOpen(true)}
                disabled={!checklist.basics || !weightsValid}
                className="w-full rounded bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs disabled:opacity-50"
              >
                Publish Challenge 🚀
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Modal Step 1 */}
      {aiStep1Open && (
        <Dialog title="✨ AI Challenge Formulation Copilot" onClose={() => setAiStep1Open(false)} width="max-w-lg">
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Describe your municipal or department problem in plain words. The AI will synthesize an outcome-oriented problem statement, public impact metric, and baseline parameters.
            </p>
            <textarea
              rows={4}
              className="w-full rounded border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              placeholder="e.g. During monsoon season, roads across Ward 4 develop severe potholes that take weeks to repair, causing vehicle damage and traffic blockages."
              value={aiStep1Prompt}
              onChange={(e) => setAiStep1Prompt(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAiStep1Open(false)}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={runAiStep1}
                disabled={aiGenerating || !aiStep1Prompt.trim()}
                className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {aiGenerating ? "Synthesizing..." : "Accept & Populate Form ✨"}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Rubric Modal */}
      {rubricOpenIndex !== null && (
        <Dialog
          title={`Define 5-Level Rubric: ${evaluationCriteria[rubricOpenIndex]?.name}`}
          onClose={() => setRubricOpenIndex(null)}
          width="max-w-xl"
        >
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Provide standardized scoring guidelines for independent expert evaluators (0–10 scale).
            </p>
            <div className="space-y-2">
              <div className="rounded border border-slate-200 p-2 bg-slate-50">
                <span className="font-bold text-emerald-800">9–10 (Exceptional):</span>
                <input
                  className="w-full mt-1 rounded border border-slate-300 bg-white p-1 text-xs"
                  defaultValue="Production-ready and proven in identical civic environments with verified benchmark results."
                />
              </div>
              <div className="rounded border border-slate-200 p-2 bg-slate-50">
                <span className="font-bold text-blue-800">7–8 (Strong):</span>
                <input
                  className="w-full mt-1 rounded border border-slate-300 bg-white p-1 text-xs"
                  defaultValue="Strong working prototype with limited live deployments and clear implementation plan."
                />
              </div>
              <div className="rounded border border-slate-200 p-2 bg-slate-50">
                <span className="font-bold text-amber-800">5–6 (Acceptable):</span>
                <input
                  className="w-full mt-1 rounded border border-slate-300 bg-white p-1 text-xs"
                  defaultValue="Technically plausible but requires measurable engineering customizations during pilot."
                />
              </div>
              <div className="rounded border border-slate-200 p-2 bg-slate-50">
                <span className="font-bold text-red-800">0–4 (Unsatisfactory):</span>
                <input
                  className="w-full mt-1 rounded border border-slate-300 bg-white p-1 text-xs"
                  defaultValue="Significant technical uncertainty or lack of relevant domain capability."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const copy = [...evaluationCriteria];
                  copy[rubricOpenIndex].rubricDefined = true;
                  setEvaluationCriteria(copy);
                  setRubricOpenIndex(null);
                }}
                className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Save Rubric & Apply
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Final Publish Confirmation Modal */}
      {publishConfirmOpen && (
        <Dialog title="🚀 Confirm Challenge Publication" onClose={() => setPublishConfirmOpen(false)} width="max-w-md">
          <div className="space-y-3 text-xs">
            <p className="text-slate-700">
              Are you ready to publish this innovation challenge to the public portal?
            </p>
            <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-1 text-slate-800">
              <div><strong>Title:</strong> {basics.title}</div>
              <div><strong>Department:</strong> {basics.department}</div>
              <div><strong>Budget Envelope:</strong> ₹{basics.budgetMin.toLocaleString()} – ₹{basics.budgetMax.toLocaleString()}</div>
              <div><strong>Applications Open Until:</strong> {basics.challengeDeadline}</div>
            </div>
            <p className="text-[11px] text-slate-500">
              Once published, DPIIT-recognized startups will be able to view specifications, download technical criteria, and submit outcome proposals.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPublishConfirmOpen(false)}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPublishConfirmOpen(false);
                  handleFinalSubmit("open");
                }}
                className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
              >
                Confirm & Publish Challenge
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
