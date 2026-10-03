"""
NuvoVet Claims — clinical claims intelligence for pet insurance.

Turns a messy veterinary invoice into a standardized, coded claim and
adjudicates it with deterministic, explainable rules:

  codebook   free-text line items / diagnoses → standard codes
  knowledge  drug resolution, therapeutic class, dose references
  benchmarks price percentiles vs regional distributions and posted fees
  engine     coverage, clinical, pricing and integrity rules → decision
  synthetic  labelled synthetic claims for demos and evaluation

LLMs are used only upstream (document extraction); every decision made here
is reproducible and carries the evidence behind it.
"""

ENGINE_VERSION = "0.1.0"
