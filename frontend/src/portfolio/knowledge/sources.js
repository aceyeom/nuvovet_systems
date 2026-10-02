/**
 * Citation registry (clean-room).
 *
 * Every DOI / PMID below was looked up on PubMed during the build on 2026-10-02
 * (see docs/portfolio/SOURCES_VERIFIED.md for title, journal and the claim each
 * one supports). Label sources name the product and the regulator only; no
 * approval numbers are given because they were not independently confirmed.
 *
 * Shape: { [id]: { kind: 'doi'|'pmid'|'label'|'guideline', cite, title?, doi?, pmid?, url?, note? } }
 */

export const SOURCES = {
  // ── MDR1 / P-glycoprotein / macrocyclic lactones ─────────────────────────
  mealey2001: {
    kind: 'doi',
    cite: 'Mealey et al. 2001, Pharmacogenetics',
    title: 'Ivermectin sensitivity in collies is associated with a deletion mutation of the mdr1 gene',
    doi: '10.1097/00008571-200111000-00012',
    pmid: '11692082',
  },
  mealey2008: {
    kind: 'doi',
    cite: 'Mealey 2008, Vet Parasitol',
    title: 'Canine ABCB1 and macrocyclic lactones: heartworm prevention and pharmacogenetics',
    doi: '10.1016/j.vetpar.2008.09.009',
    pmid: '18922637',
  },
  gramer2010: {
    kind: 'doi',
    cite: 'Gramer et al. 2010, Vet J',
    title: 'Breed distribution of the nt230(del4) MDR1 mutation in dogs',
    doi: '10.1016/j.tvjl.2010.06.012',
    pmid: '20655253',
    note: 'Published online 2010; print issue Vet J 2011;189:67–71.',
  },
  mealeyMeurs2008: {
    kind: 'doi',
    cite: 'Mealey & Meurs 2008, JAVMA',
    title: 'Breed distribution of the ABCB1-1Δ (multidrug sensitivity) polymorphism among dogs undergoing ABCB1 genotyping',
    doi: '10.2460/javma.233.6.921',
    pmid: '18795852',
  },
  schrickx2014: {
    kind: 'doi',
    cite: 'Schrickx 2014, Vet J',
    title: 'Spinosad is a potent inhibitor of canine P-glycoprotein',
    doi: '10.1016/j.tvjl.2014.01.012',
    pmid: '24582422',
  },
  mueller2020: {
    kind: 'doi',
    cite: 'Mueller et al. 2020, Vet Dermatol (WAVD guideline)',
    title: 'Diagnosis and treatment of demodicosis in dogs and cats: clinical consensus guidelines of the World Association for Veterinary Dermatology',
    doi: '10.1111/vde.12806',
    pmid: '31957202',
  },
  mayer2008: {
    kind: 'doi',
    cite: 'Mayer et al. 2008, Vet Dermatol',
    title: 'Adverse effects of ketoconazole in dogs — a retrospective study',
    doi: '10.1111/j.1365-3164.2008.00675.x',
    pmid: '18547382',
  },
  negre2009: {
    kind: 'doi',
    cite: 'Negre et al. 2009, Vet Dermatol',
    title: 'Evidence-based veterinary dermatology: a systematic review of interventions for Malassezia dermatitis in dogs',
    doi: '10.1111/j.1365-3164.2008.00721.x',
    pmid: '19152584',
  },

  // ── CYP interactions, ciclosporin ────────────────────────────────────────
  graham2006: {
    kind: 'doi',
    cite: 'Graham et al. 2006, J Biochem Mol Toxicol',
    title: 'Temporal kinetics and concentration-response relationships for induction of CYP1A, CYP2B, and CYP3A in primary cultures of beagle dog hepatocytes',
    doi: '10.1002/jbt.20118',
    pmid: '16615094',
  },
  archer2014: {
    kind: 'doi',
    cite: 'Archer et al. 2014, J Vet Intern Med',
    title: 'Oral cyclosporine treatment in dogs: a review of the literature',
    doi: '10.1111/jvim.12265',
    pmid: '24341787',
  },
  myre1991: {
    kind: 'doi',
    cite: 'Myre et al. 1991, Pharmacology',
    title: 'Critical ketoconazole dosage range for ciclosporin clearance inhibition in the dog',
    doi: '10.1159/000138850',
    pmid: '1784623',
  },
  olivry2015: {
    kind: 'doi',
    cite: 'Olivry et al. 2015, BMC Vet Res (ICADA guideline)',
    title: 'Treatment of canine atopic dermatitis: 2015 updated guidelines from the International Committee on Allergic Diseases of Animals (ICADA)',
    doi: '10.1186/s12917-015-0514-6',
    pmid: '26276051',
  },

  // ── Epilepsy ─────────────────────────────────────────────────────────────
  bhatti2015: {
    kind: 'doi',
    cite: 'Bhatti et al. 2015, BMC Vet Res (IVETF consensus)',
    title: 'International Veterinary Epilepsy Task Force consensus proposal: medical treatment of canine epilepsy in Europe',
    doi: '10.1186/s12917-015-0464-z',
    pmid: '26316233',
  },
  gieger2000: {
    kind: 'doi',
    cite: 'Gieger et al. 2000, J Vet Intern Med',
    title: 'Thyroid function and serum hepatic enzyme activity in dogs after phenobarbital administration',
    doi: '10.1892/0891-6640(2000)014<0277:tfashe>2.3.co;2',
    pmid: '10830541',
  },

  // ── NSAIDs, GI protection ────────────────────────────────────────────────
  lascelles2005: {
    kind: 'doi',
    cite: 'Lascelles et al. 2005, JAVMA',
    title: 'Gastrointestinal tract perforation in dogs treated with a selective cyclooxygenase-2 inhibitor: 29 cases (2002–2003)',
    doi: '10.2460/javma.2005.227.1112',
    pmid: '16220672',
  },
  sparkes2010: {
    kind: 'doi',
    cite: 'Sparkes et al. 2010, J Feline Med Surg (ISFM/AAFP guideline)',
    title: 'ISFM and AAFP consensus guidelines: long-term use of NSAIDs in cats',
    doi: '10.1016/j.jfms.2010.05.004',
    pmid: '20610311',
  },
  macphail1998: {
    kind: 'pmid',
    cite: 'MacPhail et al. 1998, JAVMA',
    title: 'Hepatocellular toxicosis associated with administration of carprofen in 21 dogs',
    pmid: '9638189',
  },
  marks2018: {
    kind: 'doi',
    cite: 'Marks et al. 2018, J Vet Intern Med (ACVIM consensus)',
    title: 'ACVIM consensus statement: support for rational administration of gastrointestinal protectants to dogs and cats',
    doi: '10.1111/jvim.15337',
    pmid: '30378711',
  },
  bersenas2005: {
    kind: 'doi',
    cite: 'Bersenas et al. 2005, Am J Vet Res',
    title: 'Effects of ranitidine, famotidine, pantoprazole, and omeprazole on intragastric pH in dogs',
    doi: '10.2460/ajvr.2005.66.425',
    pmid: '15822586',
  },
  tolbert2011: {
    kind: 'doi',
    cite: 'Tolbert et al. 2011, J Vet Intern Med',
    title: 'Efficacy of oral famotidine and 2 omeprazole formulations for the control of intragastric pH in dogs',
    doi: '10.1111/j.1939-1676.2010.0651.x',
    pmid: '21143305',
  },

  // ── Feline thyroid / kidney ──────────────────────────────────────────────
  williams2010: {
    kind: 'doi',
    cite: 'Williams et al. 2010, J Vet Intern Med',
    title: 'Association of iatrogenic hypothyroidism with azotemia and reduced survival time in cats treated for hyperthyroidism',
    doi: '10.1111/j.1939-1676.2010.0566.x',
    pmid: '20695989',
  },
  daminet2014: {
    kind: 'doi',
    cite: 'Daminet et al. 2014, J Small Anim Pract',
    title: 'Best practice for the pharmacological management of hyperthyroid cats with antithyroid drugs',
    doi: '10.1111/jsap.12157',
    pmid: '24372075',
  },
  quimby2015: {
    kind: 'doi',
    cite: 'Quimby et al. 2015, J Feline Med Surg',
    title: 'Chronic use of maropitant for the management of vomiting and inappetence in cats with chronic kidney disease: a blinded, placebo-controlled clinical trial',
    doi: '10.1177/1098612X14555441',
    pmid: '25336450',
  },
  quimby2022: {
    kind: 'doi',
    cite: 'Quimby et al. 2022, J Feline Med Surg',
    title: 'Serum concentrations of gabapentin in cats with chronic kidney disease',
    doi: '10.1177/1098612X221077017',
    pmid: '35195476',
  },
  acierno2018: {
    kind: 'doi',
    cite: 'Acierno et al. 2018, J Vet Intern Med (ACVIM consensus)',
    title: 'ACVIM consensus statement: guidelines for the identification, evaluation, and management of systemic hypertension in dogs and cats',
    doi: '10.1111/jvim.15331',
    pmid: '30353952',
  },
  king2006: {
    kind: 'doi',
    cite: 'King et al. 2006, J Vet Intern Med',
    title: 'Tolerability and efficacy of benazepril in cats with chronic kidney disease',
    doi: '10.1892/0891-6640(2006)20[1054:taeobi]2.0.co;2',
    pmid: '17063696',
  },
  iris2023: {
    kind: 'guideline',
    cite: 'IRIS 2023, Staging of CKD',
    title: 'International Renal Interest Society — staging of chronic kidney disease (modified 2023)',
    url: 'https://www.iris-kidney.com/iris-staging-system',
    note: 'Not PubMed-indexed. Used only for the creatinine cut-offs that separate IRIS stage 1 from stage 2 (dog 1.4 mg/dL, cat 1.6 mg/dL).',
  },

  // ── Fluoroquinolones ─────────────────────────────────────────────────────
  wiebe2002: {
    kind: 'doi',
    cite: 'Wiebe & Hamilton 2002, JAVMA',
    title: 'Fluoroquinolone-induced retinal degeneration in cats',
    doi: '10.2460/javma.2002.221.1568',
    pmid: '12479325',
  },
  gelatt2001: {
    kind: 'doi',
    cite: 'Gelatt et al. 2001, Vet Ophthalmol',
    title: 'Enrofloxacin-associated retinal degeneration in cats',
    doi: '10.1046/j.1463-5224.2001.00182.x',
    pmid: '11422990',
  },

  // ── Antimicrobials, GI ───────────────────────────────────────────────────
  langlois2020: {
    kind: 'doi',
    cite: 'Langlois et al. 2020, J Vet Intern Med',
    title: 'Metronidazole treatment of acute diarrhea in dogs: a randomized double blinded placebo-controlled clinical trial',
    doi: '10.1111/jvim.15664',
    pmid: '31742807',
  },
  evans2003: {
    kind: 'doi',
    cite: 'Evans et al. 2003, J Vet Intern Med',
    title: 'Diazepam as a treatment for metronidazole toxicosis in dogs: a retrospective study of 21 cases',
    doi: '10.1111/j.1939-1676.2003.tb02452.x',
    pmid: '12774970',
  },

  // ── Analgesia, behaviour ─────────────────────────────────────────────────
  kukanich2004: {
    kind: 'doi',
    cite: 'KuKanich & Papich 2004, J Vet Pharmacol Ther',
    title: 'Pharmacokinetics of tramadol and the metabolite O-desmethyltramadol in dogs',
    doi: '10.1111/j.1365-2885.2004.00578.x',
    pmid: '15305853',
  },
  budsberg2018: {
    kind: 'doi',
    cite: 'Budsberg et al. 2018, JAVMA',
    title: 'Lack of effectiveness of tramadol hydrochloride for the treatment of pain and joint dysfunction in dogs with chronic osteoarthritis',
    doi: '10.2460/javma.252.4.427',
    pmid: '29393744',
  },
  mohammadzadeh2008: {
    kind: 'doi',
    cite: 'Mohammad-Zadeh et al. 2008, J Vet Pharmacol Ther',
    title: 'Serotonin: a review',
    doi: '10.1111/j.1365-2885.2008.00944.x',
    pmid: '18471139',
  },
  kim2022: {
    kind: 'doi',
    cite: 'Kim et al. 2022, JAVMA',
    title: 'Effects of trazodone on behavioral and physiological signs of stress in dogs during veterinary visits: a randomized double-blind placebo-controlled crossover clinical trial',
    doi: '10.2460/javma.20.10.0547',
    pmid: '35333743',
  },
  fries2019: {
    kind: 'doi',
    cite: 'Fries et al. 2019, J Feline Med Surg',
    title: 'Effects of oral trazodone on echocardiographic and hemodynamic variables in healthy cats',
    doi: '10.1177/1098612X18814565',
    pmid: '30499766',
  },
  stevens2016: {
    kind: 'doi',
    cite: 'Stevens et al. 2016, JAVMA',
    title: 'Efficacy of a single dose of trazodone hydrochloride given to cats prior to veterinary visits to reduce signs of transport- and examination-related anxiety',
    doi: '10.2460/javma.249.2.202',
    pmid: '27379596',
  },
  orlando2015: {
    kind: 'doi',
    cite: 'Orlando et al. 2016, J Feline Med Surg',
    title: 'Use of oral trazodone for sedation in cats: a pilot study',
    doi: '10.1177/1098612X15587956',
    pmid: '26037387',
    note: 'Published online 2015; print issue J Feline Med Surg 2016;18:476–482.',
  },
  indrawirawan2014: {
    kind: 'doi',
    cite: 'Indrawirawan & McAlees 2014, J Feline Med Surg',
    title: 'Tramadol toxicity in a cat: case report and literature review of serotonin syndrome',
    doi: '10.1177/1098612X14539088',
    pmid: '24966282',
  },
  fitzgerald2013: {
    kind: 'doi',
    cite: 'Fitzgerald & Bronstein 2013, Top Companion Anim Med',
    title: 'Selective serotonin reuptake inhibitor exposure',
    doi: '10.1053/j.tcam.2013.03.003',
    pmid: '23796482',
  },
  vanhaaften2017: {
    kind: 'doi',
    cite: 'van Haaften et al. 2017, JAVMA',
    title: 'Effects of a single preappointment dose of gabapentin on signs of stress in cats during transportation and veterinary examination',
    doi: '10.2460/javma.251.10.1175',
    pmid: '29099247',
  },
  radulovic1995: {
    kind: 'pmid',
    cite: 'Radulovic et al. 1995, Drug Metab Dispos',
    title: 'Disposition of gabapentin (Neurontin) in mice, rats, dogs, and monkeys',
    pmid: '7600909',
  },

  // ── Cardiology ───────────────────────────────────────────────────────────
  boswood2016: {
    kind: 'doi',
    cite: 'Boswood et al. 2016, J Vet Intern Med (EPIC)',
    title: 'Effect of pimobendan in dogs with preclinical myxomatous mitral valve disease and cardiomegaly: the EPIC study — a randomized clinical trial',
    doi: '10.1111/jvim.14586',
    pmid: '27678080',
  },
  keene2019: {
    kind: 'doi',
    cite: 'Keene et al. 2019, J Vet Intern Med (ACVIM consensus)',
    title: 'ACVIM consensus guidelines for the diagnosis and treatment of myxomatous mitral valve disease in dogs',
    doi: '10.1111/jvim.15488',
    pmid: '30974015',
  },

  // ── Feline toxicology ────────────────────────────────────────────────────
  linnett2008: {
    kind: 'doi',
    cite: 'Linnett 2008, Aust Vet J',
    title: 'Permethrin toxicosis in cats',
    doi: '10.1111/j.1751-0813.2007.00198.x',
    pmid: '18271821',
  },
  peacock2015: {
    kind: 'doi',
    cite: 'Peacock et al. 2015, J Vet Emerg Crit Care',
    title: 'A randomized, controlled clinical trial of intravenous lipid emulsion as an adjunctive treatment for permethrin toxicosis in cats',
    doi: '10.1111/vec.12322',
    pmid: '26088727',
  },
  rumbeiha1995: {
    kind: 'pmid',
    cite: 'Rumbeiha et al. 1995, Am J Vet Res',
    title: 'Comparison of N-acetylcysteine and methylene blue, alone or in combination, for treatment of acetaminophen toxicosis in cats',
    pmid: '8585668',
  },

  // ── Product labels (regulator named; approval numbers deliberately omitted)
  heartgard_label: {
    kind: 'label',
    cite: 'Heartgard (ivermectin) chewables — US FDA-approved label',
    note: 'Minimum 6 mcg/kg once monthly, dosed by weight band; label reports no signs of toxicity in ivermectin-sensitive Collies at 10× the recommended dose (60 mcg/kg).',
  },
  atopica_label: {
    kind: 'label',
    cite: 'Atopica (ciclosporin) — US FDA-approved labels for dogs and cats',
    note: 'Dogs 5 mg/kg once daily (capsule table 3.3–6.7 mg/kg); cats 7 mg/kg once daily (initial dose). Dog field study: vomiting 30.9%, diarrhoea 20.0%.',
  },
  felimazole_label: {
    kind: 'label',
    cite: 'Felimazole (methimazole) — US FDA-approved label',
    note: 'Starting dose 2.5 mg every 12 hours, titrated on total T4 after 3 weeks; haematology, biochemistry and T4 rechecked at 3 and 6 weeks; hepatopathy, thrombocytopenia and agranulocytosis listed as potentially serious adverse reactions.',
  },
  metacam_label: {
    kind: 'label',
    cite: 'Metacam (meloxicam) — US FDA-approved labels',
    note: 'Dogs 0.2 mg/kg on day 1 then 0.1 mg/kg once daily; cats a single 0.3 mg/kg SC injection only (boxed warning on repeated use).',
  },
  rimadyl_label: {
    kind: 'label',
    cite: 'Rimadyl (carprofen) — US FDA-approved label',
    note: '4.4 mg/kg per day, once daily or divided twice daily.',
  },
  onsior_label: {
    kind: 'label',
    cite: 'Onsior (robenacoxib) tablets — US FDA-approved labels',
    note: 'Dogs 2 mg/kg (range 2–4 mg/kg) once daily; cats 1 mg/kg (range 1–2.4 mg/kg, cats ≥ 2.5 kg) once daily; maximum 3 days.',
  },
  cerenia_label: {
    kind: 'label',
    cite: 'Cerenia (maropitant) — US FDA-approved labels',
    note: 'Dog tablets minimum 2 mg/kg once daily (acute vomiting), 8 mg/kg for motion sickness; dog injection 1 mg/kg SC or IV once daily for up to 5 days; cat injection 1 mg/kg SC or IV once daily for up to 5 days; caution in hepatic dysfunction (hepatic CYP metabolism).',
  },
  clavamox_label: {
    kind: 'label',
    cite: 'Clavamox (amoxicillin–clavulanate) — US FDA-approved label',
    note: 'Dogs 6.25 mg/lb (13.75 mg/kg) twice daily; cats 62.5 mg twice daily.',
  },
  synulox_label: {
    kind: 'label',
    cite: 'Synulox (amoxicillin–clavulanate) tablets — UK VMD product SPC',
    note: '12.5 mg/kg twice daily; may be doubled to 25 mg/kg twice daily in refractory cases.',
  },
  baytril_label: {
    kind: 'label',
    cite: 'Baytril (enrofloxacin) tablets — US FDA-approved label',
    note: 'Dogs 5–20 mg/kg per day; cats 5 mg/kg per day (feline dose limited after reports of blindness).',
  },
  vetmedin_label: {
    kind: 'label',
    cite: 'Vetmedin (pimobendan) — US FDA-approved label',
    note: 'Total 0.5 mg/kg per day divided into two doses about 12 h apart.',
  },
  reconcile_label: {
    kind: 'label',
    cite: 'Reconcile (fluoxetine) chewable tablets — US FDA-approved label',
    note: '1–2 mg/kg once daily; contraindicated in dogs with epilepsy or a history of seizures.',
  },
}

export function getSource(id) {
  return SOURCES[id] || null
}

/** A resolvable link for a source, or null. No network is ever used — this is only an href. */
export function sourceHref(id) {
  const s = SOURCES[id]
  if (!s) return null
  if (s.doi) return `https://doi.org/${s.doi}`
  if (s.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`
  if (s.url) return s.url
  return null
}

export const SOURCE_IDS = Object.keys(SOURCES)
