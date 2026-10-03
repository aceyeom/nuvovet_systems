/**
 * Engine regressions for the EMR popup scenarios whose expected output depends
 * on an engine change (docs/portfolio/EMR_DUR_POPUP_SPEC.md §5, §8.1).
 *
 * `input` is the engine input the reference adapter (spec Appendix C) produces
 * for the scenario's EMR rows; the expected `findings`, `doses` and `notes`
 * lines are copied verbatim from the spec's binding raw output (§8.1) and are
 * printed here in the same format. Adapter-only fields (row confirm reasons,
 * visit reasons, `complete`) are WP2's tests; this file pins the engine half.
 */
import { describe, it, expect } from 'vitest'
import { analyze } from '../engine.js'

const r3 = (x) => Math.round(x * 1000) / 1000
const fmtFindings = (r) => r.findings.map((x) => `${x.ruleId}/${x.severity}[${x.drugIds.join('+')}]`).join(', ') || '—'
const fmtDoses = (r) => r.doses.map((x) => `${x.drugId}:${x.perDoseMg ?? 'null'}mg:${x.status}${x.ratio != null ? '(' + r3(x.ratio) + ')' : ''}${x.strengthId ? ' plan=' + x.administration?.ko : ''}${x.combined ? ' Σ' + x.combined.totalMg + 'mg' : ''}`).join(', ')
const fmtNotes = (r) => r.notes.map((x) => x.id).join(', ') || '—'

const SCENARIOS = {
  E05: {
    dependsOn: "D14",
    input: {"species":"dog","weightKg":30,"breedId":"labrador_retriever","ageYears":3.6,"conditions":["skin_infection","vomiting_diarrhoea"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"amoxicillin_clavulanate","protocolId":"ac_dog_eu","dose":{"value":12.5,"unit":"mg/kg"},"route":"PO","frequency":"q12h","durationDays":7,"strengthId":"ac_tab_375"},{"drugId":"maropitant","protocolId":"maro_dog_vomit","dose":{"value":2,"unit":"mg/kg"},"route":"PO","frequency":"q24h","durationDays":2,"strengthId":"maro_tab_60"}]},
    verdict: "none",
    findings: "—",
    doses: "amoxicillin_clavulanate:375mg:within(0.5) plan=375 mg 정제 1정, maropitant:60mg:within plan=60 mg 정제 1정",
    notes: "—",
  },
  E06b: {
    dependsOn: "D2",
    input: {"species":"dog","weightKg":3.2,"breedId":"maltese","ageYears":12.1,"conditions":["ckd","osteoarthritis","mmvd_chf"],"labs":{"creatinine":2.1},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"meloxicam","protocolId":"melox_dog_oa","dose":{"value":0.21,"unit":"mL"},"route":"PO","frequency":"q24h","durationDays":14,"strengthId":"melox_susp_1_5"},{"drugId":"furosemide","protocolId":"furo_dog_chf","dose":{"value":2,"unit":"mg/kg"},"route":"PO","frequency":"q12h","durationDays":14,"strengthId":"furo_tab_12_5"},{"drugId":"pimobendan","protocolId":"pimo_dog_chf","dose":{"value":0.25,"unit":"mg/kg"},"route":"PO","frequency":"q12h","durationDays":14,"strengthId":"pimo_chew_1_25"},{"drugId":"benazepril","protocolId":"bena_dog_htn","dose":{"value":0.5,"unit":"mg/kg"},"route":"PO","frequency":"q24h","durationDays":14,"strengthId":"bena_tab_5"}]},
    verdict: "moderate",
    findings: "NSAID_RENAL/moderate[meloxicam+furosemide+benazepril]",
    doses: "meloxicam:0.315mg:within(0.984) plan=1.5 mg/mL 0.21 mL, furosemide:6.4mg:within(1) plan=12.5 mg 정제 ½정, pimobendan:0.8mg:within(1) plan=1.25 mg 츄어블 ½개, benazepril:1.6mg:within(0.125) plan=5 mg 정제 ½정",
    notes: "rounding_pimobendan_2, rounding_benazepril_3, admin_meloxicam_0, admin_furosemide_0, admin_benazepril_0",
  },
  E08: {
    dependsOn: "D11 (label_single_only keeps the single injection checked)",
    input: {"species":"cat","weightKg":3.5,"breedId":"russian_blue","ageYears":9.2,"conditions":["uti"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"enrofloxacin","protocolId":"enro_cat","dose":{"value":0.5,"unit":"tablet"},"route":"PO","frequency":"q24h","durationDays":10,"strengthId":"enro_tab_68"},{"drugId":"meloxicam","protocolId":"melox_cat_periop","dose":{"value":0.3,"unit":"mg/kg"},"route":"SC","frequency":"once","durationDays":1,"strengthId":"melox_inj_5"}]},
    verdict: "major",
    findings: "ENRO_FELINE_RETINA/major[enrofloxacin]",
    doses: "enrofloxacin:34mg:above(1.943) plan=68 mg 정제 ½정, meloxicam:1.05mg:within(1) plan=5 mg/mL 0.21 mL",
    notes: "admin_enrofloxacin_0, caution_enrofloxacin_0, admin_meloxicam_0, caution_meloxicam_0",
  },
  E08b: {
    dependsOn: "D11 (label_single_only: repeats still fire)",
    input: {"species":"cat","weightKg":3.5,"breedId":"russian_blue","ageYears":9.2,"conditions":["uti"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"enrofloxacin","protocolId":"enro_cat","dose":{"value":0.5,"unit":"tablet"},"route":"PO","frequency":"q24h","durationDays":10,"strengthId":"enro_tab_68"},{"drugId":"meloxicam","protocolId":"melox_cat_periop","dose":{"value":0.3,"unit":"mg/kg"},"route":"SC","frequency":"q24h","durationDays":3,"strengthId":"melox_inj_5"}]},
    verdict: "major",
    findings: "ENRO_FELINE_RETINA/major[enrofloxacin], SPECIES_HARDSTOP/major[meloxicam]",
    doses: "enrofloxacin:34mg:above(1.943) plan=68 mg 정제 ½정, meloxicam:1.05mg:above plan=5 mg/mL 0.21 mL",
    notes: "admin_enrofloxacin_0, caution_enrofloxacin_0, admin_meloxicam_0",
  },
  E19: {
    dependsOn: "D14",
    input: {"species":"dog","weightKg":3.8,"breedId":"labrador_retriever","ageYears":3.6,"conditions":["vomiting_diarrhoea"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"maropitant","protocolId":"maro_dog_vomit","dose":{"value":0.5,"unit":"tablet"},"route":"PO","frequency":"q24h","durationDays":2,"strengthId":"maro_tab_16"}]},
    verdict: "none",
    findings: "—",
    doses: "maropitant:8mg:within plan=16 mg 정제 ½정",
    notes: "—",
  },
  E20: {
    dependsOn: "D1",
    input: {"species":"dog","weightKg":11,"breedId":"golden_retriever","ageYears":7.6,"conditions":["osteoarthritis"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"carprofen","protocolId":"carp_dog_pain","dose":{"value":2,"unit":"tablet"},"route":"PO","frequency":"q24h","durationDays":7,"strengthId":"carp_tab_25"}]},
    verdict: "none",
    findings: "—",
    doses: "carprofen:50mg:within(1.033) plan=25 mg 정제 2정",
    notes: "rounding_carprofen_0, admin_carprofen_0",
  },
  E23: {
    dependsOn: "D15",
    input: {"species":"cat","weightKg":3.5,"breedId":"russian_blue","ageYears":9.2,"conditions":["uti"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"enrofloxacin","protocolId":"enro_cat","dose":{"value":5,"unit":"mg/kg"},"route":"PO","frequency":"q24h","durationDays":10,"strengthId":"enro_tab_22_7"}]},
    verdict: "none",
    findings: "—",
    doses: "enrofloxacin:17.5mg:within(1) plan=22.7 mg 정제 1정",
    notes: "rounding_enrofloxacin_0, ceiling_plan_enrofloxacin_0, admin_enrofloxacin_0, caution_enrofloxacin_0",
  },
  E24: {
    dependsOn: "D9 summed within",
    input: {"species":"dog","weightKg":28,"breedId":"golden_retriever","ageYears":7.6,"conditions":["osteoarthritis"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"carprofen","protocolId":"carp_dog_pain","dose":{"value":1,"unit":"tablet"},"route":"PO","frequency":"q24h","durationDays":7,"strengthId":"carp_tab_100"},{"drugId":"carprofen","protocolId":"carp_dog_pain","dose":{"value":1,"unit":"tablet"},"route":"PO","frequency":"q24h","durationDays":7,"strengthId":"carp_tab_25"}]},
    verdict: "none",
    findings: "—",
    doses: "carprofen:100mg:within(1.015) plan=100 mg 정제 1정 Σ125mg, carprofen:25mg:within(1.015) plan=25 mg 정제 1정 Σ125mg",
    notes: "combined_carprofen, admin_carprofen_0",
  },
  E25: {
    dependsOn: "D9 summed major",
    input: {"species":"dog","weightKg":28,"breedId":"golden_retriever","ageYears":7.6,"conditions":["osteoarthritis"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"carprofen","protocolId":"carp_dog_pain","dose":{"value":4.4,"unit":"mg/kg"},"route":"PO","frequency":"q24h","durationDays":7,"strengthId":"carp_tab_100"},{"drugId":"carprofen","protocolId":"carp_dog_pain","dose":{"value":4.4,"unit":"mg/kg"},"route":"PO","frequency":"q24h","durationDays":7,"strengthId":"carp_tab_25"}]},
    verdict: "major",
    findings: "DOSE_RANGE/major[carprofen]",
    doses: "carprofen:123.2mg:above(2) plan=100 mg 정제 1정 Σ246.4mg, carprofen:123.2mg:above(2) plan=25 mg 정제 5정 Σ246.4mg",
    notes: "rounding_carprofen_0, combined_carprofen, admin_carprofen_0",
  },
  E26: {
    dependsOn: "D9 duplicate moderate",
    input: {"species":"dog","weightKg":28,"breedId":"golden_retriever","ageYears":7.6,"conditions":["osteoarthritis"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"meloxicam","protocolId":null,"dose":{"value":0.2,"unit":"mg/kg"},"route":"SC","frequency":"once","durationDays":1,"strengthId":"melox_inj_5"},{"drugId":"meloxicam","protocolId":"melox_dog_oa","dose":{"value":0.1,"unit":"mg/kg"},"route":"PO","frequency":"q24h","durationDays":14,"strengthId":"melox_susp_1_5"}]},
    verdict: "moderate",
    findings: "DUPLICATE_INGREDIENT/moderate[meloxicam]",
    doses: "meloxicam:5.6mg:no_reference plan=5 mg/mL 1.1 mL, meloxicam:2.8mg:within(1) plan=1.5 mg/mL 1.9 mL",
    notes: "dose_noref_meloxicam, admin_meloxicam_0",
  },
  E28: {
    dependsOn: "D10",
    input: {"species":"cat","weightKg":4.1,"breedId":"domestic_shorthair","ageYears":13.2,"conditions":["hyperthyroidism"],"labs":{"creatinine":2},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"methimazole","protocolId":"mmi_cat_start","dose":{"value":2,"unit":"tablet"},"route":"PO","frequency":"q12h","durationDays":30,"strengthId":"mmi_tab_2_5"}]},
    verdict: "moderate",
    findings: "METHIMAZOLE_CKD/moderate[methimazole], DOSE_RANGE/minor[methimazole]",
    doses: "methimazole:5mg:above(2) plan=2.5 mg 정제 2정",
    notes: "admin_methimazole_0",
  },
  E29: {
    dependsOn: "D10",
    input: {"species":"dog","weightKg":6,"breedId":"shih_tzu","ageYears":6.5,"conditions":["epilepsy"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"phenobarbital","protocolId":"pb_dog_epilepsy","dose":{"value":4,"unit":"mg/kg"},"route":"PO","frequency":"q12h","durationDays":30,"strengthId":"pb_tab_15"}]},
    verdict: "minor",
    findings: "DOSE_RANGE/minor[phenobarbital]",
    doses: "phenobarbital:24mg:above(1.333) plan=15 mg 정제 1½정",
    notes: "admin_phenobarbital_0, admin_phenobarbital_1",
  },
  E30: {
    dependsOn: "D11 (adapter sends no protocol)",
    input: {"species":"dog","weightKg":28,"breedId":"golden_retriever","ageYears":7.6,"conditions":["anxiety"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"trazodone","protocolId":null,"dose":{"value":5,"unit":"mg/kg"},"route":"PO","frequency":"q12h","durationDays":14,"strengthId":"traz_tab_100"}]},
    verdict: "none",
    findings: "—",
    doses: "trazodone:140mg:no_reference plan=100 mg 정제 1½정",
    notes: "dose_noref_trazodone",
  },
  E31: {
    dependsOn: "D11 (adapter sends no protocol)",
    input: {"species":"cat","weightKg":4.1,"breedId":"domestic_shorthair","ageYears":13.2,"conditions":[],"labs":{"creatinine":2},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"gabapentin","protocolId":null,"dose":{"value":1,"unit":"capsule"},"route":"PO","frequency":"q12h","durationDays":30,"strengthId":"gaba_cap_100"}]},
    verdict: "moderate",
    findings: "RENAL_ADJUST/moderate[gabapentin]",
    doses: "gabapentin:100mg:no_reference plan=100 mg 캡슐 1개",
    notes: "dose_noref_gabapentin, admin_gabapentin_0",
  },
  E33: {
    dependsOn: "D12",
    input: {"species":"dog","weightKg":30,"breedId":"labrador_retriever","ageYears":3.6,"conditions":["skin_infection"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"amoxicillin_clavulanate","protocolId":"ac_dog_eu","dose":{"value":12.5,"unit":"mg/kg"},"route":"PO","frequency":"once","durationDays":1,"strengthId":"ac_tab_375"}]},
    verdict: "none",
    findings: "—",
    doses: "amoxicillin_clavulanate:375mg:within(0.5) plan=375 mg 정제 1정",
    notes: "—",
  },
  E37: {
    dependsOn: "D14",
    input: {"species":"dog","weightKg":3,"breedId":"labrador_retriever","ageYears":3.6,"conditions":["vomiting_diarrhoea"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"maropitant","protocolId":"maro_dog_vomit","dose":{"value":0.5,"unit":"tablet"},"route":"PO","frequency":"q24h","durationDays":2,"strengthId":"maro_tab_16"}]},
    verdict: "none",
    findings: "—",
    doses: "maropitant:8mg:within plan=16 mg 정제 ½정",
    notes: "—",
  },
  E38: {
    dependsOn: "D13",
    input: {"species":"dog","weightKg":28,"breedId":"golden_retriever","ageYears":7.6,"conditions":["osteoarthritis"],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"carprofen","protocolId":"carp_dog_pain","dose":{"value":4,"unit":"mg/kg"},"route":"PO","frequency":"q24h","durationDays":7,"strengthId":"carp_tab_100"}]},
    verdict: "minor",
    findings: "DOSE_RANGE/minor[carprofen]",
    doses: "carprofen:112mg:below(0.909) plan=100 mg 정제 1정",
    notes: "rounding_carprofen_0, admin_carprofen_0",
  },
  E39: {
    dependsOn: "D13",
    input: {"species":"dog","weightKg":3.2,"breedId":"maltese","ageYears":12.1,"conditions":["mmvd_chf"],"labs":{"creatinine":2.1},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"pimobendan","protocolId":"pimo_dog_chf","dose":{"value":0.2,"unit":"mg/kg"},"route":"PO","frequency":"q12h","durationDays":30,"strengthId":"pimo_chew_1_25"}]},
    verdict: "minor",
    findings: "DOSE_RANGE/minor[pimobendan]",
    doses: "pimobendan:0.64mg:below(0.8) plan=1.25 mg 츄어블 ½개",
    notes: "—",
  },
  E44: {
    dependsOn: "D12",
    input: {"species":"dog","weightKg":24,"breedId":"collie","ageYears":4.3,"conditions":[],"labs":{},"allergies":[],"mdr1Status":"unknown","meds":[{"drugId":"ivermectin","protocolId":"iver_dog_hw","dose":{"value":1,"unit":"chewable"},"route":"PO","frequency":"once","durationDays":1,"strengthId":"iver_chew_272"}]},
    verdict: "minor",
    findings: "MDR1_PGP_ML/minor[ivermectin]",
    doses: "ivermectin:0.272mg:within(0.227) plan=272 mcg 츄어블 1개",
    notes: "—",
  },

}

describe('EMR popup scenarios: engine output (spec §8.1, binding)', () => {
  for (const [id, s] of Object.entries(SCENARIOS)) {
    it(`${id} (${s.dependsOn})`, () => {
      const r = analyze(s.input)
      expect(r.verdict.level).toBe(s.verdict)
      expect(fmtFindings(r)).toBe(s.findings)
      expect(fmtDoses(r)).toBe(s.doses)
      expect(fmtNotes(r)).toBe(s.notes)
    })
  }
})
