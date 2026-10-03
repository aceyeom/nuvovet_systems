/**
 * The binding outputs of EMR popup spec §8.1, copied verbatim from
 * docs/portfolio/EMR_DUR_POPUP_SPEC.md ("Raw output, binding" and "Card decisions,
 * binding"). They were produced by executing the reference adapter on the revised
 * engine; every line is asserted by scenarios.test.js and cards.test.js.
 */

export const RAW_OUTPUT = `
E01
  verdict=contraindicated complete=true
  findings: MDR1_PGP_ML/contraindicated[ivermectin+ketoconazole]
  doses: ivermectin:7.2mg:within(0.5) plan=10 mg/mL 0.72 mL, ketoconazole:120mg:within(1) plan=200 mg 정제 ½정
  notes: rounding_ketoconazole_1, admin_ketoconazole_0, admin_ketoconazole_1
  rows: rx-1=iver_dog_demodex rx-2=keto_dog_malassezia
E02
  verdict=moderate complete=true
  findings: CYP_INDUCTION/moderate[phenobarbital+ciclosporin], IMMUNOSUPPRESSION_ADDITIVE/minor[ciclosporin+prednisolone], CYP_INDUCTION/minor[phenobarbital+prednisolone]
  doses: phenobarbital:15mg:within(0.833) plan=15 mg 정제 1정, ciclosporin:30mg:within(0.746) plan=10 mg 캡슐 3개, prednisolone:3mg:within(0.5) plan=5 mg 정제 ½정
  notes: rounding_prednisolone_2, admin_phenobarbital_0, admin_phenobarbital_1, admin_ciclosporin_0, admin_ciclosporin_1
  rows: rx-1=pb_dog_epilepsy rx-2=csa_dog_ad rx-3=pred_dog_ad
E03
  verdict=moderate complete=true
  findings: METHIMAZOLE_CKD/moderate[methimazole]
  doses: methimazole:2.5mg:within(1) plan=2.5 mg 정제 1정, amlodipine:0.625mg:within(0.25) plan=2.5 mg 정제 ¼정, maropitant:4.1mg:within(0.345) plan=16 mg 정제 ½정
  notes: rounding_maropitant_2, admin_methimazole_0, admin_amlodipine_0
  rows: rx-1=mmi_cat_start rx-2=amlo_cat_htn rx-3=maro_cat_ckd_po
E04
  verdict=contraindicated complete=false (dose_noref_permethrin; protocol.permethrin; rx-1:protocol_none)
  findings: SPECIES_HARDSTOP/contraindicated[permethrin]
  doses: permethrin:nullmg:no_reference
  notes: dose_noref_permethrin
  rows: rx-1=∅!protocol_none
E05
  verdict=none complete=true
  findings: —
  doses: amoxicillin_clavulanate:375mg:within(0.5) plan=375 mg 정제 1정, maropitant:60mg:within plan=60 mg 정제 1정
  notes: —
  rows: rx-1=ac_dog_eu~EU/UK 라벨 기준(자동) rx-2=maro_dog_vomit
E06
  verdict=moderate complete=true
  findings: NSAID_RENAL/moderate[meloxicam+furosemide+benazepril]
  doses: meloxicam:0.32mg:within(1) plan=1.5 mg/mL 0.21 mL, furosemide:6.4mg:within(1) plan=12.5 mg 정제 ½정, pimobendan:0.8mg:within(1) plan=1.25 mg 츄어블 ½개, benazepril:1.6mg:within(0.125) plan=5 mg 정제 ½정
  notes: rounding_pimobendan_2, rounding_benazepril_3, admin_meloxicam_0, admin_furosemide_0, admin_benazepril_0
  rows: rx-1=melox_dog_oa rx-2=furo_dog_chf rx-3=pimo_dog_chf rx-4=bena_dog_htn
E06b
  verdict=moderate complete=true
  findings: NSAID_RENAL/moderate[meloxicam+furosemide+benazepril]
  doses: meloxicam:0.315mg:within(0.984) plan=1.5 mg/mL 0.21 mL, furosemide:6.4mg:within(1) plan=12.5 mg 정제 ½정, pimobendan:0.8mg:within(1) plan=1.25 mg 츄어블 ½개, benazepril:1.6mg:within(0.125) plan=5 mg 정제 ½정
  notes: rounding_pimobendan_2, rounding_benazepril_3, admin_meloxicam_0, admin_furosemide_0, admin_benazepril_0
  rows: rx-1=melox_dog_oa rx-2=furo_dog_chf rx-3=pimo_dog_chf rx-4=bena_dog_htn
E07
  verdict=major complete=true
  findings: NSAID_CORTICOSTEROID/major[carprofen+prednisolone], SEROTONERGIC/moderate[tramadol+trazodone]
  doses: carprofen:123.2mg:within(1) plan=100 mg 정제 1정, prednisolone:14mg:within(0.5) plan=5 mg 정제 3정, tramadol:140mg:within(1) plan=50 mg 정제 3정, trazodone:280mg:within(0.833) plan=100 mg 정제 3정
  notes: rounding_carprofen_0, admin_carprofen_0
  rows: rx-1=carp_dog_pain rx-2=pred_dog_ad rx-3=tram_dog_pain rx-4=traz_dog_previsit
E07b
  verdict=major complete=true
  findings: NSAID_CORTICOSTEROID/major[carprofen+prednisolone], SEROTONERGIC/moderate[tramadol+trazodone], DOSE_RANGE/minor[tramadol]
  doses: carprofen:123.2mg:within(1) plan=100 mg 정제 1정, prednisolone:14mg:within(0.5) plan=5 mg 정제 3정, tramadol:140mg:below(1) plan=50 mg 정제 3정, trazodone:280mg:within(0.833) plan=100 mg 정제 3정
  notes: rounding_carprofen_0, admin_carprofen_0
  rows: rx-1=carp_dog_pain rx-2=pred_dog_ad rx-3=tram_dog_pain rx-4=traz_dog_previsit
E08
  verdict=major complete=true
  findings: ENRO_FELINE_RETINA/major[enrofloxacin]
  doses: enrofloxacin:34mg:above(1.943) plan=68 mg 정제 ½정, meloxicam:1.05mg:within(1) plan=5 mg/mL 0.21 mL
  notes: admin_enrofloxacin_0, caution_enrofloxacin_0, admin_meloxicam_0, caution_meloxicam_0
  rows: rx-1=enro_cat rx-2=melox_cat_periop@Tx
E08b
  verdict=major complete=true
  findings: ENRO_FELINE_RETINA/major[enrofloxacin], SPECIES_HARDSTOP/major[meloxicam]
  doses: enrofloxacin:34mg:above(1.943) plan=68 mg 정제 ½정, meloxicam:1.05mg:above plan=5 mg/mL 0.21 mL
  notes: admin_enrofloxacin_0, caution_enrofloxacin_0, admin_meloxicam_0
  rows: rx-1=enro_cat rx-2=melox_cat_periop@Tx
E09
  verdict=contraindicated complete=true
  findings: DRUG_CONDITION/contraindicated[fluoxetine]
  doses: fluoxetine:16mg:within(1) plan=16 mg 츄어블 1개, phenobarbital:20mg:within(0.833) plan=30 mg 정제 ½정
  notes: rounding_phenobarbital_1, admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=flx_dog_sep rx-2=pb_dog_epilepsy
E10
  verdict=major complete=true
  findings: ALLERGY_CLASS/major[amoxicillin_clavulanate]
  doses: amoxicillin_clavulanate:150mg:within(0.5) plan=250 mg 정제 ½정
  notes: rounding_amoxicillin_clavulanate_0
  rows: rx-1=ac_dog_eu~EU/UK 라벨 기준(자동)
E11
  verdict=contraindicated complete=true
  findings: DRUG_CONDITION/contraindicated[phenobarbital]
  doses: phenobarbital:20mg:within(0.833) plan=30 mg 정제 ½정
  notes: rounding_phenobarbital_0, admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy
E12
  verdict=moderate complete=true
  findings: GASTRIC_PH_AZOLE/moderate[ketoconazole+omeprazole]
  doses: ketoconazole:300mg:within(1) plan=200 mg 정제 1½정, omeprazole:30mg:within(1) plan=10 mg 캡슐 3개
  notes: admin_ketoconazole_0, admin_ketoconazole_1
  rows: rx-1=keto_dog_malassezia rx-2=ome_dog_acid
E13
  verdict=major complete=true
  findings: NSAID_DUPLICATE/major[carprofen+meloxicam]
  doses: carprofen:123.2mg:within(1) plan=100 mg 정제 1정, meloxicam:2.8mg:within(1) plan=1.5 mg/mL 1.9 mL
  notes: rounding_carprofen_0, admin_carprofen_0, admin_meloxicam_0
  rows: rx-1=carp_dog_pain rx-2=melox_dog_oa
E14
  verdict=none complete=false (weight_missing; weightKg)
  findings: —
  doses: carprofen:nullmg:unit_mismatch
  notes: weight_missing, admin_carprofen_0
  rows: rx-1=carp_dog_pain
E15
  verdict=none complete=false (dose_noref_maropitant; protocol.maropitant; rx-1:protocol_indication)
  findings: —
  doses: maropitant:60mg:no_reference plan=60 mg 정제 1정
  notes: dose_noref_maropitant
  rows: rx-1=∅!protocol_indication
E16
  verdict=none complete=false (freq_amoxicillin_clavulanate_0; frequency.amoxicillin_clavulanate; rx-1:freq_missing; unmapped:RX-XYZ-999)
  findings: —
  doses: amoxicillin_clavulanate:375mg:within(0.5) plan=375 mg 정제 1정
  notes: freq_amoxicillin_clavulanate_0
  rows: rx-1=ac_dog_eu!freq_missing~EU/UK 라벨 기준(자동)
E17
  verdict=contraindicated complete=false (dose_unit_ivermectin; rx-1:unit_needs_record)
  findings: MDR1_PGP_ML/contraindicated[ivermectin+ketoconazole]
  doses: ivermectin:nullmg:unit_mismatch, ketoconazole:120mg:within(1) plan=200 mg 정제 ½정
  notes: rounding_ketoconazole_1, dose_unit_ivermectin, admin_ketoconazole_0, admin_ketoconazole_1
  rows: rx-1=iver_dog_demodex!unit_needs_record rx-2=keto_dog_malassezia
E18
  supported=false (species_unsupported)
E19
  verdict=none complete=true
  findings: —
  doses: maropitant:8mg:within plan=16 mg 정제 ½정
  notes: —
  rows: rx-1=maro_dog_vomit
E20
  verdict=none complete=true
  findings: —
  doses: carprofen:50mg:within(1.033) plan=25 mg 정제 2정
  notes: rounding_carprofen_0, admin_carprofen_0
  rows: rx-1=carp_dog_pain
E21
  verdict=none complete=false (rx-1:split_not_allowed)
  findings: —
  doses: robenacoxib:10mg:within(0.5) plan=20 mg 정제 ½정
  notes: —
  rows: rx-1=robe_dog_postop!split_not_allowed
E22
  verdict=none complete=true
  findings: —
  doses: phenobarbital:15mg:within(0.833) plan=15 mg 정제 1정
  notes: admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy~calc_mismatch
  adapterNotes: weight_stale
E23
  verdict=none complete=true
  findings: —
  doses: enrofloxacin:17.5mg:within(1) plan=22.7 mg 정제 1정
  notes: rounding_enrofloxacin_0, ceiling_plan_enrofloxacin_0, admin_enrofloxacin_0, caution_enrofloxacin_0
  rows: rx-1=enro_cat
E24
  verdict=none complete=true
  findings: —
  doses: carprofen:100mg:within(1.015) plan=100 mg 정제 1정 Σ125mg, carprofen:25mg:within(1.015) plan=25 mg 정제 1정 Σ125mg
  notes: combined_carprofen, admin_carprofen_0
  rows: rx-1=carp_dog_pain rx-2=carp_dog_pain
E25
  verdict=major complete=true
  findings: DOSE_RANGE/major[carprofen]
  doses: carprofen:123.2mg:above(2) plan=100 mg 정제 1정 Σ246.4mg, carprofen:123.2mg:above(2) plan=25 mg 정제 5정 Σ246.4mg
  notes: rounding_carprofen_0, combined_carprofen, admin_carprofen_0
  rows: rx-1=carp_dog_pain rx-2=carp_dog_pain
E26
  verdict=moderate complete=false (dose_noref_meloxicam; protocol.meloxicam; tx-1:protocol_route)
  findings: DUPLICATE_INGREDIENT/moderate[meloxicam]
  doses: meloxicam:5.6mg:no_reference plan=5 mg/mL 1.1 mL, meloxicam:2.8mg:within(1) plan=1.5 mg/mL 1.9 mL
  notes: dose_noref_meloxicam, admin_meloxicam_0
  rows: tx-1=∅!protocol_route@Tx rx-1=melox_dog_oa
E27
  verdict=major complete=false (dose_noref_meloxicam; protocol.meloxicam; tx-1:protocol_route)
  findings: NSAID_DUPLICATE/major[meloxicam+carprofen]
  doses: meloxicam:5.6mg:no_reference plan=5 mg/mL 1.1 mL, carprofen:123.2mg:within(1) plan=100 mg 정제 1정
  notes: rounding_carprofen_1, dose_noref_meloxicam, admin_meloxicam_0, admin_carprofen_0
  rows: tx-1=∅!protocol_route@Tx rx-1=carp_dog_pain
E28
  verdict=moderate complete=true
  findings: METHIMAZOLE_CKD/moderate[methimazole], DOSE_RANGE/minor[methimazole]
  doses: methimazole:5mg:above(2) plan=2.5 mg 정제 2정
  notes: admin_methimazole_0
  rows: rx-1=mmi_cat_start
E29
  verdict=minor complete=true
  findings: DOSE_RANGE/minor[phenobarbital]
  doses: phenobarbital:24mg:above(1.333) plan=15 mg 정제 1½정
  notes: admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy
E30
  verdict=none complete=false (dose_noref_trazodone; protocol.trazodone; rx-1:protocol_repeat_none)
  findings: —
  doses: trazodone:140mg:no_reference plan=100 mg 정제 1½정
  notes: dose_noref_trazodone
  rows: rx-1=∅!protocol_repeat_none
E31
  verdict=moderate complete=false (dose_noref_gabapentin; protocol.gabapentin; rx-1:protocol_repeat_none)
  findings: RENAL_ADJUST/moderate[gabapentin]
  doses: gabapentin:100mg:no_reference plan=100 mg 캡슐 1개
  notes: dose_noref_gabapentin, admin_gabapentin_0
  rows: rx-1=∅!protocol_repeat_none
E32
  verdict=none complete=false (dose_noref_meloxicam; protocol.meloxicam; rx-1:protocol_indication)
  findings: —
  doses: meloxicam:2.8mg:no_reference plan=1.5 mg/mL 1.9 mL
  notes: dose_noref_meloxicam, admin_meloxicam_0
  rows: rx-1=∅!protocol_indication
E33
  verdict=none complete=true
  findings: —
  doses: amoxicillin_clavulanate:375mg:within(0.5) plan=375 mg 정제 1정
  notes: —
  rows: rx-1=ac_dog_eu~EU/UK 라벨 기준(자동)
E34
  verdict=none complete=false (rx-1:freq_conflict)
  findings: —
  doses: phenobarbital:15mg:within(0.833) plan=15 mg 정제 1정
  notes: admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy!freq_conflict
E35
  verdict=major complete=false (rx-1:freq_conflict)
  findings: ENRO_FELINE_RETINA/major[enrofloxacin]
  doses: enrofloxacin:17.5mg:above(3) plan=22.7 mg 정제 1정
  notes: rounding_enrofloxacin_0, admin_enrofloxacin_0, caution_enrofloxacin_0
  rows: rx-1=enro_cat!freq_conflict
E36
  verdict=none complete=false (dose_unit_carprofen)
  findings: —
  doses: carprofen:123.2mg:unit_mismatch plan=100 mg 정제 1정
  notes: rounding_carprofen_0, dose_unit_carprofen, admin_carprofen_0
  rows: rx-1=carp_dog_pain
E36b
  verdict=major complete=true
  findings: DOSE_RANGE/major[carprofen]
  doses: carprofen:123.2mg:above(2) plan=100 mg 정제 1정
  notes: rounding_carprofen_0, admin_carprofen_0
  rows: rx-1=carp_dog_pain~prn_max_per_day
E37
  verdict=none complete=true
  findings: —
  doses: maropitant:8mg:within plan=16 mg 정제 ½정
  notes: —
  rows: rx-1=maro_dog_vomit
E38
  verdict=minor complete=true
  findings: DOSE_RANGE/minor[carprofen]
  doses: carprofen:112mg:below(0.909) plan=100 mg 정제 1정
  notes: rounding_carprofen_0, admin_carprofen_0
  rows: rx-1=carp_dog_pain
E39
  verdict=minor complete=true
  findings: DOSE_RANGE/minor[pimobendan]
  doses: pimobendan:0.64mg:below(0.8) plan=1.25 mg 츄어블 ½개
  notes: —
  rows: rx-1=pimo_dog_chf
E40
  verdict=major complete=false (allergy_text_recognised)
  findings: ALLERGY_CLASS/major[amoxicillin_clavulanate]
  doses: amoxicillin_clavulanate:150mg:within(0.5) plan=250 mg 정제 ½정
  notes: rounding_amoxicillin_clavulanate_0
  rows: rx-1=ac_dog_eu~EU/UK 라벨 기준(자동)
  adapterNotes: allergy_text_recognised
E40b
  verdict=none complete=false (allergy_free_text)
  findings: —
  doses: amoxicillin_clavulanate:150mg:within(0.5) plan=250 mg 정제 ½정
  notes: rounding_amoxicillin_clavulanate_0
  rows: rx-1=ac_dog_eu~EU/UK 라벨 기준(자동)
  adapterNotes: allergy_free_text
E41
  verdict=none complete=false (dx_unmapped:D-NEU-099)
  findings: —
  doses: fluoxetine:16mg:within(1) plan=16 mg 츄어블 1개
  notes: —
  rows: rx-1=flx_dog_sep
E41b
  verdict=contraindicated complete=false (dx_text_recognised:D-NEU-099)
  findings: DRUG_CONDITION/contraindicated[fluoxetine]
  doses: fluoxetine:16mg:within(1) plan=16 mg 츄어블 1개
  notes: —
  rows: rx-1=flx_dog_sep
  adapterNotes: dx_text_recognised:D-NEU-099
E42
  verdict=moderate complete=false (lab_stale_creatinine)
  findings: NSAID_RENAL/moderate[meloxicam]
  doses: meloxicam:0.32mg:within(1) plan=1.5 mg/mL 0.21 mL
  notes: admin_meloxicam_0
  rows: rx-1=melox_dog_oa
  adapterNotes: lab_stale_creatinine
E42b
  verdict=none complete=false (lab_stale_creatinine)
  findings: —
  doses: meloxicam:0.32mg:within(1) plan=1.5 mg/mL 0.21 mL
  notes: admin_meloxicam_0
  rows: rx-1=melox_dog_oa
  adapterNotes: lab_stale_creatinine
E43
  verdict=moderate complete=false (breed_unresolved)
  findings: MDR1_PGP_ML/moderate[ivermectin]
  doses: ivermectin:7.2mg:within(0.5) plan=10 mg/mL 0.72 mL
  notes: —
  rows: rx-1=iver_dog_demodex
  adapterNotes: breed_unresolved
E44
  verdict=minor complete=true
  findings: MDR1_PGP_ML/minor[ivermectin]
  doses: ivermectin:0.272mg:within(0.227) plan=272 mcg 츄어블 1개
  notes: —
  rows: rx-1=iver_dog_hw
E45a
  verdict=major complete=true
  findings: ENRO_FELINE_RETINA/major[enrofloxacin]
  doses: enrofloxacin:34mg:above(1.943) plan=68 mg 정제 ½정
  notes: admin_enrofloxacin_0, caution_enrofloxacin_0
  rows: rx-1=enro_cat
E45b
  verdict=major complete=true
  findings: ENRO_FELINE_RETINA/major[enrofloxacin]
  doses: enrofloxacin:34mg:above(2.72) plan=68 mg 정제 ½정
  notes: admin_enrofloxacin_0, caution_enrofloxacin_0
  rows: rx-1=enro_cat
E46
  verdict=none complete=false (dose_strength_carprofen_0; dose_unit_carprofen)
  findings: —
  doses: carprofen:nullmg:unit_mismatch
  notes: dose_strength_carprofen_0, dose_unit_carprofen, admin_carprofen_0
  rows: rx-1=carp_dog_pain
E47
  verdict=none complete=false (dose_unit_phenobarbital; rx-1:unit_needs_record)
  findings: —
  doses: phenobarbital:nullmg:unit_mismatch
  notes: dose_unit_phenobarbital, admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy!unit_needs_record
E48
  verdict=major complete=true
  findings: NSAID_RENAL/major[meloxicam]
  doses: meloxicam:1.23mg:within(1) plan=5 mg/mL 0.25 mL
  notes: admin_meloxicam_0, caution_meloxicam_0
  rows: rx-1=melox_cat_periop
E49
  verdict=none complete=false (age_under_1y)
  findings: —
  doses: enrofloxacin:60mg:within(0.25) plan=68 mg 정제 1정
  notes: rounding_enrofloxacin_0, admin_enrofloxacin_0
  rows: rx-1=enro_dog
  adapterNotes: age_under_1y
E50
  verdict=none complete=false (dose_noref_carprofen; protocol.carprofen; rx-1:route_missing+protocol_route)
  findings: —
  doses: carprofen:123.2mg:no_reference plan=100 mg 정제 1정
  notes: rounding_carprofen_0, dose_noref_carprofen, admin_carprofen_0
  rows: rx-1=∅!route_missing+protocol_route
E51
  verdict=moderate complete=true
  findings: METHIMAZOLE_CKD/moderate[methimazole]
  doses: methimazole:2.5mg:within(1) plan=2.5 mg 정제 1정, amlodipine:0.625mg:within(0.25) plan=2.5 mg 정제 ¼정, maropitant:4.1mg:within(0.345) plan=16 mg 정제 ½정
  notes: rounding_maropitant_2, admin_methimazole_0, admin_amlodipine_0
  rows: rx-1=mmi_cat_start rx-2=amlo_cat_htn rx-3=maro_cat_ckd_po~powder
E52
  supported=false (species_missing)
E53
  verdict=none complete=false (rx-1:freq_conflict)
  findings: —
  doses: phenobarbital:20mg:within(0.833) plan=30 mg 정제 ½정
  notes: rounding_phenobarbital_0, admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy!freq_conflict
`

export const CARD_DECISIONS = `
E01 gate=yes(1) MDR1_PGP_ML/contraindicated primary=[rx-1] related=[rx-2] sugg=[delete:ivermectin] hash=1113501192
E02 gate=no CYP_INDUCTION/moderate primary=[rx-1,rx-2] related=[] sugg=[delete:phenobarbital,delete:ciclosporin] hash=1833895896 | IMMUNOSUPPRESSION_ADDITIVE/minor primary=[rx-2,rx-3] related=[] sugg=[delete:ciclosporin,delete:prednisolone] hash=2555986845 | CYP_INDUCTION/minor primary=[rx-1,rx-3] related=[] sugg=[delete:phenobarbital,delete:prednisolone] hash=4034938451
E03 gate=no METHIMAZOLE_CKD/moderate primary=[rx-1] related=[] sugg=[delete:methimazole] hash=4156413528
E04 gate=yes(1) SPECIES_HARDSTOP/contraindicated primary=[rx-1] related=[] sugg=[delete:permethrin] hash=1254720168
E05 gate=no 
E06 gate=no NSAID_RENAL/moderate primary=[rx-1] related=[rx-2,rx-4] sugg=[delete:meloxicam] hash=3737784754
E06b gate=no NSAID_RENAL/moderate primary=[rx-1] related=[rx-2,rx-4] sugg=[delete:meloxicam] hash=4276780090
E07 gate=yes(1) NSAID_CORTICOSTEROID/major primary=[rx-1,rx-2] related=[] sugg=[delete:carprofen,delete:prednisolone] hash=2644650050 | SEROTONERGIC/moderate primary=[rx-3,rx-4] related=[] sugg=[delete:tramadol,delete:trazodone] hash=1003006340
E07b gate=yes(1) NSAID_CORTICOSTEROID/major primary=[rx-1,rx-2] related=[] sugg=[delete:carprofen,delete:prednisolone] hash=2644650050 | SEROTONERGIC/moderate primary=[rx-3,rx-4] related=[] sugg=[delete:tramadol,delete:trazodone] hash=3129004573 | DOSE_RANGE/minor primary=[rx-3] related=[] sugg=[delete:tramadol] hash=82840716
E08 gate=yes(1) ENRO_FELINE_RETINA/major primary=[rx-1] related=[] sugg=[delete:enrofloxacin] hash=3480445930
E08b gate=yes(2) ENRO_FELINE_RETINA/major primary=[rx-1] related=[] sugg=[delete:enrofloxacin] hash=3480445930 | SPECIES_HARDSTOP/major primary=[rx-2] related=[] sugg=[] hash=2269827218
E09 gate=yes(1) DRUG_CONDITION/contraindicated primary=[rx-1] related=[] sugg=[delete:fluoxetine] hash=2879388551
E10 gate=yes(1) ALLERGY_CLASS/major primary=[rx-1] related=[] sugg=[delete:amoxicillin_clavulanate] hash=1019729993
E11 gate=yes(1) DRUG_CONDITION/contraindicated primary=[rx-1] related=[] sugg=[delete:phenobarbital] hash=951747739
E12 gate=no GASTRIC_PH_AZOLE/moderate primary=[rx-1,rx-2] related=[] sugg=[delete:ketoconazole,delete:omeprazole] hash=4205693331
E13 gate=yes(1) NSAID_DUPLICATE/major primary=[rx-1,rx-2] related=[] sugg=[delete:carprofen,delete:meloxicam] hash=986197227
E14 gate=no 
E15 gate=no 
E16 gate=no 
E17 gate=yes(1) MDR1_PGP_ML/contraindicated primary=[rx-1] related=[rx-2] sugg=[delete:ivermectin] hash=2226859729
E18 unsupported
E19 gate=no 
E20 gate=no 
E21 gate=no 
E22 gate=no 
E23 gate=no 
E24 gate=no 
E25 gate=yes(1) DOSE_RANGE/major primary=[rx-1,rx-2] related=[] sugg=[delete-row:rx-1,delete-row:rx-2] hash=2590710596
E26 gate=no DUPLICATE_INGREDIENT/moderate primary=[tx-1,rx-1] related=[] sugg=[delete-row:rx-1] hash=2821584937
E27 gate=yes(1) NSAID_DUPLICATE/major primary=[tx-1,rx-1] related=[] sugg=[delete:carprofen] hash=1312775726
E28 gate=no METHIMAZOLE_CKD/moderate primary=[rx-1] related=[] sugg=[delete:methimazole] hash=3038530700 | DOSE_RANGE/minor primary=[rx-1] related=[] sugg=[delete:methimazole] hash=603280856
E29 gate=no DOSE_RANGE/minor primary=[rx-1] related=[] sugg=[delete:phenobarbital] hash=888402511
E30 gate=no 
E31 gate=no RENAL_ADJUST/moderate primary=[rx-1] related=[] sugg=[delete:gabapentin] hash=1263472678
E32 gate=no 
E33 gate=no 
E34 gate=no 
E35 gate=yes(1) ENRO_FELINE_RETINA/major primary=[rx-1] related=[] sugg=[delete:enrofloxacin] hash=1367876703
E36 gate=no 
E36b gate=yes(1) DOSE_RANGE/major primary=[rx-1] related=[] sugg=[delete:carprofen] hash=4098270830
E37 gate=no 
E38 gate=no DOSE_RANGE/minor primary=[rx-1] related=[] sugg=[delete:carprofen] hash=978836129
E39 gate=no DOSE_RANGE/minor primary=[rx-1] related=[] sugg=[delete:pimobendan] hash=1338643402
E40 gate=yes(1) ALLERGY_CLASS/major primary=[rx-1] related=[] sugg=[delete:amoxicillin_clavulanate] hash=1019729993
E40b gate=no 
E41 gate=no 
E41b gate=yes(1) DRUG_CONDITION/contraindicated primary=[rx-1] related=[] sugg=[delete:fluoxetine] hash=2879388551
E42 gate=no NSAID_RENAL/moderate primary=[rx-1] related=[] sugg=[delete:meloxicam] hash=2946563526
E42b gate=no 
E43 gate=no MDR1_PGP_ML/moderate primary=[rx-1] related=[] sugg=[delete:ivermectin] hash=2984923831
E44 gate=no MDR1_PGP_ML/minor primary=[rx-1] related=[] sugg=[delete:ivermectin] hash=3959588977
E45a gate=yes(1) ENRO_FELINE_RETINA/major primary=[rx-1] related=[] sugg=[delete:enrofloxacin] hash=3480445930
E45b gate=yes(1) ENRO_FELINE_RETINA/major primary=[rx-1] related=[] sugg=[delete:enrofloxacin] hash=2790775771
E46 gate=no 
E47 gate=no 
E48 gate=yes(1) NSAID_RENAL/major primary=[rx-1] related=[] sugg=[delete:meloxicam] hash=1231811710
E49 gate=no 
E50 gate=no 
E51 gate=no METHIMAZOLE_CKD/moderate primary=[rx-1] related=[] sugg=[delete:methimazole] hash=4156413528
E52 unsupported
E53 gate=no 
`
