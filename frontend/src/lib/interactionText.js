function normalizeToken(value) {
  return String(value || '').trim().toLowerCase();
}

function collectDrugTokens(drug) {
  const values = [
    drug?.name,
    drug?.id,
    drug?.activeSubstance,
    ...(drug?.brandNames || []),
  ];
  const tokens = new Set();

  values.forEach((value) => {
    const normalized = normalizeToken(value);
    if (!normalized) return;
    tokens.add(normalized);

    const firstWord = normalized.split(/[\s(/,+-]/)[0];
    if (firstWord && firstWord.length >= 4) {
      tokens.add(firstWord);
    }
  });

  return Array.from(tokens).filter(token => token.length >= 3);
}

function findEvidenceFromSource(sourceDrug, targetDrug) {
  const interactions = sourceDrug?.rawInteractions || [];
  const targetTokens = collectDrugTokens(targetDrug);

  for (const interaction of interactions) {
    const interactionDrug = normalizeToken(interaction?.drug);
    if (!interactionDrug) continue;

    const matched = targetTokens.some(token => (
      interactionDrug.includes(token) || token.includes(interactionDrug)
    ));

    if (matched) {
      return {
        sourceDrug: sourceDrug?.name || '',
        targetDrug: targetDrug?.name || '',
        evidence: interaction?.evidence || '',
        keywords: interaction?.keywords || [],
        severity: interaction?.severity || null,
      };
    }
  }

  return null;
}

function collectPairEvidence(interaction) {
  const forward = findEvidenceFromSource(interaction?.drugAData, interaction?.drugBData);
  const backward = findEvidenceFromSource(interaction?.drugBData, interaction?.drugAData);
  const evidenceItems = [forward, backward].filter(Boolean);
  const seen = new Set();

  return evidenceItems.filter((item) => {
    const key = [item.sourceDrug, item.targetDrug, item.evidence].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectEffectsMechanism(interaction) {
  const parts = [];
  if (interaction?.drugAData?.commonMechanism) {
    parts.push(`${interaction.drugA}: ${interaction.drugAData.commonMechanism}`);
  }
  if (interaction?.drugBData?.commonMechanism) {
    parts.push(`${interaction.drugB}: ${interaction.drugBData.commonMechanism}`);
  }
  return parts.join(' / ');
}

function collectLiteratureRefs(interaction) {
  const refs = [
    ...(interaction?.literature || []).map(ref => ({
      title: ref.title,
      source: ref.source,
      confidence: ref.confidence,
    })),
    ...((interaction?.drugAData?.evidenceReferences || []).map(ref => ({
      title: ref.title,
      source: ref.source || ref.pmc_id || ref.url,
      confidence: ref.confidence || ref.relevance_score,
      pmc_id: ref.pmc_id,
      url: ref.url,
    }))),
    ...((interaction?.drugBData?.evidenceReferences || []).map(ref => ({
      title: ref.title,
      source: ref.source || ref.pmc_id || ref.url,
      confidence: ref.confidence || ref.relevance_score,
      pmc_id: ref.pmc_id,
      url: ref.url,
    }))),
  ];

  const seen = new Set();
  return refs.filter((ref) => {
    const key = [ref.title, ref.source, ref.pmc_id].join('|');
    if (!ref.title || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

export function buildGroundedFormatPayload(interaction) {
  const evidenceItems = collectPairEvidence(interaction);
  const rawEvidenceText = evidenceItems
    .map(item => `${item.sourceDrug} -> ${item.targetDrug}: ${item.evidence}`)
    .filter(Boolean)
    .join(' / ');
  const rawKeywords = Array.from(new Set(
    evidenceItems.flatMap(item => item.keywords || []).filter(Boolean)
  ));

  return {
    drug_a_name: interaction?.drugA || '',
    drug_b_name: interaction?.drugB || '',
    interaction_type: interaction?.rule?.toLowerCase().includes('disease') ? 'drug-disease' : 'drug-drug',
    severity: interaction?.severity?.label || 'Unknown',
    rule_name: interaction?.rule || '',
    mechanism_text: interaction?.mechanism || '',
    recommendation_text: interaction?.recommendation || '',
    alternative_suggestion: interaction?.alternativeSuggestion || '',
    literature_summary: interaction?.literatureSummary || '',
    raw_interaction_evidence: rawEvidenceText,
    raw_interaction_keywords: rawKeywords,
    effects_mechanism: collectEffectsMechanism(interaction),
    drug_a_class: interaction?.drugAClass || '',
    drug_b_class: interaction?.drugBClass || '',
    literature_refs: collectLiteratureRefs(interaction),
  };
}

export function buildAlertTranslationPayloads({ interactions = [], patientAlerts = [], flaggedDrugs = [], speciesNotes = [], lang = 'en' }) {
  if (lang !== 'ko') return [];

  const payloads = [];

  interactions.forEach((interaction, index) => {
    payloads.push({
      id: `ix-${index}`,
      title: '',
      subtitle: interaction.rule || '',
      mechanism: interaction.mechanism || '',
      recommendation: interaction.recommendation || '',
      alternative: interaction.alternativeSuggestion || '',
      literatureSummary: interaction.literatureSummary || '',
    });
  });

  patientAlerts.forEach((alert, index) => {
    payloads.push({
      id: `pa-${index}`,
      title: alert.rule || alert.drug || '',
      subtitle: '',
      mechanism: alert.mechanism || '',
      recommendation: alert.recommendation || '',
      alternative: '',
      literatureSummary: '',
    });
  });

  flaggedDrugs.forEach((drugFlag, index) => {
    payloads.push({
      id: `df-${index}`,
      title: '',
      subtitle: (drugFlag.flags || []).map(flag => flag.label).join(', '),
      mechanism: (drugFlag.flags || []).map(flag => flag.description).filter(Boolean).join(' '),
      recommendation: drugFlag.speciesNote || '',
      alternative: '',
      literatureSummary: '',
    });
  });

  speciesNotes.forEach((speciesNote, index) => {
    payloads.push({
      id: `sn-${index}`,
      title: '',
      subtitle: '',
      mechanism: speciesNote.note || '',
      recommendation: '',
      alternative: '',
      literatureSummary: '',
    });
  });

  return payloads.filter(item => (
    item.title || item.subtitle || item.mechanism || item.recommendation || item.alternative || item.literatureSummary
  ));
}