/**
 * Fictional EMR diagnosis codes → engine condition ids (EMR popup spec Appendix A.2),
 * plus the protocol-choice helpers used by the adapter's protocol policy (§4.2).
 *
 * PROTOCOL_CONDITIONS links protocols to diagnoses for protocol choice only; it is
 * not a clinical fact. Extend it only with a source-backed indication match.
 */

export const CONDITION_MAP = {
  'D-DERM-012': 'demodicosis',
  'D-EAR-004': 'malassezia_otitis',
  'D-NEU-001': 'epilepsy',
  'D-DERM-001': 'atopic_dermatitis',
  'D-END-003': 'hyperthyroidism',
  'D-URO-010': 'ckd',
  'D-DERM-020': 'skin_infection',
  'D-GI-001': 'vomiting_diarrhoea',
  'D-MSK-002': 'osteoarthritis',
  'D-CAR-005': 'mmvd_chf',
  'D-BEH-001': 'anxiety',
  'D-URO-002': 'uti',
  'D-HEP-001': 'hepatopathy',
  'D-GI-007': 'gi_ulcer_history',
  'D-CAR-009': 'hypertension',
}

export const PROTOCOL_CONDITIONS = {
  iver_dog_demodex: ['demodicosis'],
  iver_dog_hw: [],
  maro_dog_vomit: ['vomiting_diarrhoea'],
  maro_dog_motion: [],
  pimo_dog_chf: ['mmvd_chf'],
  pimo_dog_b2: [],
}

/** Protocols that share one indication: the group's primary is used, with a row note. */
export const SAME_INDICATION = [
  { ids: ['ac_dog_eu', 'ac_dog_us'], primary: 'ac_dog_eu', label: 'EU/UK 라벨 기준(자동)' },
]
