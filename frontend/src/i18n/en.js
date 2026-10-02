// English UI strings for the main app (landing page hero and feature sections).
// The retired DUR product pages' strings were removed with them (recoverable from git history).
const en = {
  lang: 'en',

  landing: {
    heroBadge: 'Pet-insurance claims infrastructure',
    heroTitle: 'From veterinary records',
    heroTitleAccent: 'to explained payouts',
    heroDesc: 'Standardize clinic invoices into coded claims and adjudicate them with coverage, clinical and pricing rules. Insurers cut review time; clinics field fewer owner calls.',
    ctaPrimary: 'Open demo',
    ctaSecondary: 'Engine performance',
    // Feature sections
    feat1Label: 'Explainable review',
    feat1Title: 'Every decision\ncomes with evidence',
    feat1Desc: 'Auto-approve, review, or deny-recommended — each finding carries its rule ID, amount at risk and a plain-language explanation, with literature or benchmark evidence where one exists. The engine never auto-denies.',
    feat2Label: 'Prescription plausibility',
    feat2Title: 'From Korean brand\nnames to doses',
    feat2Desc: 'Resolves Korean product names to ingredients and compares doses with species references to catch decimal-shift errors and inflated quantities.',
    feat3Label: 'Pre-existing signals',
    feat3Title: 'Find the condition\nthe claim left out',
    feat3Desc: 'A heart drug on an ear-infection claim, a thyroid drug on a skin claim — prescriptions the claimed diagnosis cannot explain signal an undisclosed chronic condition.',
    feat4Label: 'Claim integrity',
    feat4Title: 'Wrong animal,\nduplicate claims',
    feat4Desc: 'Flags dog-only vaccines on cat claims, weights that do not fit the breed, same-day resubmissions, and care before the policy started.',
  },
};

export default en;
