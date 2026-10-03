/** Test helpers: build case inputs with sensible defaults. */
export function makeCase(over = {}) {
  return {
    species: 'dog', weightKg: 20, breedId: null, breedText: '',
    ageYears: 5, sex: null, neutered: null, pregnant: false, lactating: false,
    conditions: [], labs: {}, allergies: [], mdr1Status: 'unknown', meds: [],
    ...over,
  }
}

export function med(drugId, protocolId, value, unit, frequency = 'q24h', extra = {}) {
  return { drugId, protocolId, dose: { value, unit }, route: 'PO', frequency, durationDays: null, strengthId: null, ...extra }
}

export function byRule(result, ruleId) {
  return result.findings.filter((f) => f.ruleId === ruleId || f.trace.rules.some((r) => r.ruleId === ruleId))
}
