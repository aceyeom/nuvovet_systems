// Drug Utilization Review API Service
// Set your Gemini API key here to enable real AI analysis
// Get one free at: https://makersuite.google.com/app/apikey
const API_KEY = ""; // Leave empty to use mock data

// Mock analysis result for demo/offline use
const MOCK_ANALYSIS = {
  score: 65,
  alerts: [
    {
      type: "Disease",
      severity: "Critical",
      title: "⚠️ MDR1 Gene Mutation Detected",
      shortFix: "Switch Ivermectin to Selamectin (safer for MDR1-deficient dogs)",
      action: { type: "replace", target: "Ivermectin", value: "Selamectin" }
    },
    {
      type: "Dose",
      severity: "Warning",
      title: "⚠️ Dosage Check - Renal Impairment",
      shortFix: "Reduce dosage by 25% due to early-stage renal failure (Creatinine 1.8)",
      action: { type: "update", target: "Ivermectin", value: "0.375" }
    }
  ]
};

// Mock owner instructions
const MOCK_INSTRUCTIONS = {
  text: "Administer medication with food. Monitor patient for lethargy and ensure adequate hydration. Contact veterinarian if adverse reactions occur.",
  bullets: [
    "Give with food to improve absorption",
    "Ensure constant access to fresh water",
    "Monitor for signs of lethargy or loss of appetite",
    "Complete full course even if symptoms improve",
    "Keep follow-up appointment for renal panel recheck in 2 weeks"
  ]
};

export const runDURAnalysis = async (patient, prescription) => {
  // If no API key, use mock data (instant response)
  if (!API_KEY) {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('📋 Using demo data (no API key configured)');
        resolve(MOCK_ANALYSIS);
      }, 1000);
    });
  }

  // Real API call with key
  const prompt = `Veterinary DUR Audit: Patient ${patient.name}. Weight: ${patient.weight}. Conditions: ${patient.conditions.join(', ')}. Allergies: ${patient.allergies.join(', ')}. Labs: ${JSON.stringify(patient.labResults)}. Current Orders: ${JSON.stringify(prescription)}.
    JSON Schema: { "score": 0-100, "alerts": [{ "type": "Interaction"|"Dose"|"Disease"|"Allergy", "severity": "Critical"|"Warning", "title": "string", "shortFix": "string", "action": { "type": "replace"|"update"|"remove", "target": "drugName", "value": "newNameOrDose" } }] }`;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
  } catch (err) {
    console.warn('API call failed, falling back to demo data:', err.message);
    return MOCK_ANALYSIS;
  }
};

export const generateOwnerInstructions = async (prescription) => {
  // If no API key, use mock data
  if (!API_KEY) {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('📋 Using demo instructions (no API key configured)');
        resolve(MOCK_INSTRUCTIONS);
      }, 800);
    });
  }

  // Real API call with key
  const prompt = `Short summary for owner. Meds: ${JSON.stringify(prescription)}. JSON: { "text": "string", "bullets": ["string"] }`;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
  } catch (e) {
    console.warn('API call failed, falling back to demo data:', e.message);
    return MOCK_INSTRUCTIONS;
  }
};

/**
 * To enable real AI analysis:
 * 1. Go to https://makersuite.google.com/app/apikey
 * 2. Create a free API key
 * 3. Paste it here: const API_KEY = "your-key-here";
 * 4. Refresh the browser
 * 
 * Without an API key, the app uses realistic demo data for testing.
 */

