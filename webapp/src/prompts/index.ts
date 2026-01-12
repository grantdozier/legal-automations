// LLM Prompts for Deposition Analysis

export const CLAIM_EXTRACTION_PROMPT = `You are a legal assistant analyzing deposition testimony. Your task is to extract atomic claims from witness testimony.

INSTRUCTIONS:
1. Read the witness's answer carefully
2. Extract each distinct claim or assertion made
3. Normalize the language while preserving meaning
4. Identify polarity (affirm/deny/unknown), modality (certain/uncertain/don't recall)
5. Extract temporal scope, entities, and topics
6. Return strict JSON only - no additional commentary

POLARITY:
- "affirm": Witness affirms or confirms something
- "deny": Witness denies or rejects something
- "unknown": Unclear or ambiguous

MODALITY:
- "certain": Definite statements ("I did", "It was", "I always")
- "uncertain": Qualified statements ("I think", "maybe", "probably")
- "dont_recall": Memory-related ("I don't recall", "I can't remember")

ENTITIES: Names, systems, documents, events, locations, organizations

TOPICS: Examples: duty, confidentiality, disclosure, reliance, responsibility, oversight, knowledge, authorization, communication

OUTPUT FORMAT (JSON array):
[
  {
    "normalized_text": "The witness was responsible for overseeing the project",
    "polarity": "affirm",
    "modality": "certain",
    "time_scope": "2020-2021",
    "entities": ["project"],
    "topics": ["responsibility", "oversight"]
  }
]

IMPORTANT:
- Use neutral language
- Preserve the meaning from the original testimony
- Each claim should be atomic (one assertion per claim)
- If multiple claims exist in one answer, separate them
- If witness doesn't recall, still extract the claim structure

WITNESS TESTIMONY TO ANALYZE:
{testimony}

Return only the JSON array, nothing else.`;

export const CONTRADICTION_DETECTION_PROMPT = `You are a legal assistant comparing two claims from deposition testimony to identify inconsistencies.

INSTRUCTIONS:
1. Compare the two claims carefully
2. Identify the type of relationship between them
3. Provide a neutral, factual explanation
4. NEVER use words like "lying", "dishonest", or "false"
5. Instead use: "inconsistent with", "appears to conflict", "differs from", "contradicts"
6. Return strict JSON only

CLASSIFICATION TYPES:
- "CONSISTENT": Claims are compatible or complementary
- "HARD_CONTRADICTION": Claims are mutually exclusive (both cannot be true)
- "SOFT_INCONSISTENCY": Claims show tension but aren't mutually exclusive (hedging, vagueness)
- "SCOPE_SHIFT": Scope changes ("never" → "sometimes", "not responsible" → "oversaw")
- "TEMPORAL_CONFLICT": Timeline inconsistency
- "DEFINITION_DRIFT": Key term is defined or used differently

OUTPUT FORMAT (JSON object):
{
  "label": "HARD_CONTRADICTION",
  "explanation": "In the first statement, witness affirms never being involved in X, but in the second statement affirms direct involvement in X during the same time period",
  "confidence": 0.95
}

CONFIDENCE SCALE:
- 0.9-1.0: Clear contradiction, no ambiguity
- 0.7-0.89: Strong inconsistency with minor ambiguity
- 0.5-0.69: Moderate inconsistency, some ambiguity
- 0.3-0.49: Weak inconsistency, significant ambiguity
- 0.0-0.29: Likely consistent or unclear

CLAIM A:
Citation: {citation_a}
Text: {claim_a}
Polarity: {polarity_a}
Modality: {modality_a}
Time Scope: {time_scope_a}
Topics: {topics_a}

CLAIM B:
Citation: {citation_b}
Text: {claim_b}
Polarity: {polarity_b}
Modality: {modality_b}
Time Scope: {time_scope_b}
Topics: {topics_b}

Compare these claims and return only the JSON object, nothing else.`;

export function buildClaimExtractionPrompt(testimony: string): string {
  return CLAIM_EXTRACTION_PROMPT.replace('{testimony}', testimony);
}

export function buildContradictionPrompt(
  claimA: {
    text: string;
    citation: string;
    polarity: string;
    modality: string;
    timeScope?: string;
    topics: string[];
  },
  claimB: {
    text: string;
    citation: string;
    polarity: string;
    modality: string;
    timeScope?: string;
    topics: string[];
  }
): string {
  return CONTRADICTION_DETECTION_PROMPT
    .replace('{citation_a}', claimA.citation)
    .replace('{claim_a}', claimA.text)
    .replace('{polarity_a}', claimA.polarity)
    .replace('{modality_a}', claimA.modality)
    .replace('{time_scope_a}', claimA.timeScope || 'not specified')
    .replace('{topics_a}', claimA.topics.join(', ') || 'not specified')
    .replace('{citation_b}', claimB.citation)
    .replace('{claim_b}', claimB.text)
    .replace('{polarity_b}', claimB.polarity)
    .replace('{modality_b}', claimB.modality)
    .replace('{time_scope_b}', claimB.timeScope || 'not specified')
    .replace('{topics_b}', claimB.topics.join(', ') || 'not specified');
}
