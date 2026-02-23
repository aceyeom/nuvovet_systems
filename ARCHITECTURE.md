# Veterinary Pharmacy OS - Architecture Guide

## Overview

This is a professional veterinary pharmacy drug utilization review (DUR) system built with React and Vite. The application helps pharmacists identify drug interactions, dosage issues, allergies, and disease contraindications for pet prescriptions.

## 💾 Complete File Structure

```
FullStackDemoPractice/
├── src/
│   ├── components/                 # All React components
│   │   ├── Layout/
│   │   │   └── Header.jsx         # Top navigation with workflow title
│   │   ├── Sidebar/
│   │   │   └── Sidebar.jsx        # Left navigation bar
│   │   ├── PatientPanel/
│   │   │   └── PatientPanel.jsx   # Patient info & medical history sidebar
│   │   ├── Workflow/               # Main workflow components
│   │   │   ├── PrescriptionEntry.jsx    # Prescription input form
│   │   │   ├── AnalysisLoader.jsx       # Analysis animation screen
│   │   │   ├── SafetyReview.jsx         # Alert review & resolution
│   │   │   └── PrescriptionSummary.jsx  # Final prescription printout
│   │   └── Modals/
│   │       └── DrugDictionaryModal.jsx  # Drug search & selection modal
│   ├── data/                       # Static data & constants
│   │   ├── patientData.js         # Patient profile data
│   │   └── drugDictionary.js      # Drug formulary database
│   ├── hooks/                      # Custom React hooks
│   │   ├── usePrescriptionManager.js  # Prescription CRUD operations
│   │   └── useWorkflowState.js       # Workflow state management
│   ├── utils/                      # Utility functions
│   │   └── durAnalysis.js         # Gemini API integration for DUR analysis
│   ├── App.jsx                     # Main app component (orchestrator)
│   ├── main.jsx                    # React entry point
│   └── index.css                   # Tailwind CSS imports
├── index.html                      # HTML entry point
├── vite.config.js                  # Vite build configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── postcss.config.js               # PostCSS configuration
├── package.json                    # NPM dependencies & scripts
├── .gitignore                      # Git ignore rules
└── NEW_README.md                   # Feature documentation
```

## 🔄 Workflow Architecture

The app follows a 4-step workflow:

```
ENTRY → ANALYZING → REVIEW → ORDER
```

### 1. **ENTRY** - Prescription Entry
- Shows PrescriptionEntry component
- User adds/edits/removes medications
- Drug Dictionary Modal for searching drugs
- Triggers DUR analysis when user clicks "Execute DUR Scan"

### 2. **ANALYZING** - Analysis Loading
- Shows AnalysisLoader component with visual animations
- Sequences 4 checks: DDI, Dosage, Allergy, Disease
- Calls `runDURAnalysis()` from durAnalysis.js
- Simulates processing with staggered timeouts

### 3. **REVIEW** - Safety Assessment
- Shows SafetyReview component
- Displays safety score (0-100%)
- Lists all detected alerts with severity levels
- User can resolve alerts or adjust prescription
- Each resolved alert improves safety score

### 4. **ORDER** - Final Summary
- Shows PrescriptionSummary component
- Final prescription details
- AI-generated owner instructions
- Print labels & finish session

## 🧩 Component Breakdown

### **src/App.jsx** (Main Orchestrator)
- Manages all workflow state and prescription data
- Coordinates between all child components
- Handles API calls and state transitions
- ~150 lines, manages everything

**Key Functions:**
- `handleExecuteDUR()` - Starts analysis workflow
- `handleApplyAlert(alert)` - Resolves safety alerts
- `handleAddDrug(drug)` - Adds drug from dictionary
- `handleGenerateSummary()` - Generates owner instructions

### **src/components/Layout/Header.jsx**
- Top navigation bar
- Shows current workflow step title
- Displays "Execute DUR Scan" button in entry step

### **src/components/Sidebar/Sidebar.jsx**
- Left navigation sidebar (16px width)
- Icon buttons for navigation
- Dark theme with hover effects

### **src/components/PatientPanel/PatientPanel.jsx**
- Right information panel (320px width)
- Patient vitals, lab results, allergies, conditions
- Clinical history and diagnostic baseline
- Scrollable content area

### **src/components/Workflow/PrescriptionEntry.jsx**
- Main prescription form
- Editable drug name, dosage, frequency fields
- Add/remove drug buttons
- Maps over prescription array

### **src/components/Workflow/AnalysisLoader.jsx**
- Animated analysis screen
- Shows 4-step check sequence (DDI → Dosage → Allergy → Disease)
- Visual indicator that processing is happening
- Auto-completes in ~4 seconds

### **src/components/Workflow/SafetyReview.jsx**
- Circular safety score visualization (0-100%)
- Color changes: red (critical) → amber (warning) → green (safe)
- Lists all alerts from API response
- "Resolve Issue" button for each alert

### **src/components/Workflow/PrescriptionSummary.jsx**
- Professional prescription printout
- Medication list with dosages
- Owner instructions section with AI-generated text
- Print labels & finish session buttons

### **src/components/Modals/DrugDictionaryModal.jsx**
- Searchable drug database
- 6 sample drugs with categories and dosages
- Click to add drug to prescription
- Search filters by drug name

## 🪝 Custom Hooks

### **usePrescriptionManager.js**
```javascript
const { prescription, addDrug, removeDrug, updateDrug, applyAlert, setPrescription } = usePrescriptionManager(initialData)
```
- Manages prescription CRUD operations
- `addDrug(drug)` - Add new drug to prescription
- `removeDrug(id)` - Remove drug by ID
- `updateDrug(id, field, value)` - Edit drug property
- `applyAlert(alert, drugDictionary)` - Apply alert action (replace/update/remove)

### **useWorkflowState.js**
```javascript
const { workflowStep, setWorkflowStep, checkSequence, updateCheckSequence, screeningResult, ... } = useWorkflowState()
```
- Manages workflow navigation state
- Tracks check sequence (ddi, dose, allergy, disease)
- Stores screening results and owner instructions
- `startAnalysis()` - Initialize analysis mode
- `completeAnalysis(result)` - Transition to review

## 📊 Data Structure

### Patient Object
```javascript
{
  name: "Max",
  species: "Canine",
  breed: "Shetland Sheepdog",
  weight: "5.2 kg",
  age: "4y 2m",
  sex: "Male Neutered",
  allergies: ["Penicillin", "Sulfonamides"],
  conditions: ["Early Stage Renal Failure", "MDR1 Deficient"],
  labResults: { creatinine: "1.8 mg/dL", bun: "32 mg/dL", ... }
}
```

### Prescription Item
```javascript
{
  id: 1234567890,           // Timestamp ID
  name: "Ivermectin",       // Drug name
  dosage: "0.5",            // Dosage amount
  unit: "mg/kg",            // Dosage unit
  freq: "SID",              // Frequency (SID/BID/TID)
  category: "Antiparasitic" // Drug category
}
```

### Alert Object
```javascript
{
  type: "Disease",          // "Interaction" | "Dose" | "Allergy" | "Disease"
  severity: "Critical",     // "Critical" | "Warning"
  title: "MDR1 Sensitivity",
  shortFix: "Switch to Selamectin",
  action: {
    type: "replace",        // "replace" | "update" | "remove"
    target: "Ivermectin",
    value: "Selamectin"     // New value or drug name
  }
}
```

## 🔌 API Integration

### **src/utils/durAnalysis.js**
Two main API functions:

#### `runDURAnalysis(patient, prescription)`
- Calls Gemini API with clinical prompt
- Returns analysis with safety score (0-100) and alerts array
- Falls back to demo data if API fails or key missing

#### `generateOwnerInstructions(prescription)`
- Generates medication instructions for pet owner
- Returns object with main text and bullet points
- Also has fallback demo data

### Adding Your API Key
Edit `src/utils/durAnalysis.js`:
```javascript
const API_KEY = "paste-your-gemini-api-key-here";
```

## 🎨 Styling

All styling uses **Tailwind CSS** utility classes:
- Color scheme: Slate (grays), Indigo (primary), Red/Amber/Green (alerts)
- Spacing: Consistent padding (p-*) and margins (mb-*, gap-*)
- Typography: Font sizes with numeric scale (text-xs, text-sm, etc.)
- Responsive: Uses grid and flex layouts
- Effects: Shadows, rounded corners, transitions, animations

### Key Tailwind Classes Used
- `bg-slate-950` - Dark backgrounds
- `text-indigo-600` - Primary accent
- `border-slate-200` - Subtle borders
- `rounded-2xl` / `rounded-[2.5rem]` - Rounded corners
- `shadow-sm` / `shadow-2xl` - Box shadows
- `hover:bg-indigo-600` - Interactions
- `animate-pulse` / `animate-spin` - Animations

## 🚀 Running the Application

### Development
```bash
npm run dev
```
Starts Vite dev server on http://localhost:5173

### Build for Production
```bash
npm run build
```
Creates optimized dist/ folder

### Preview Production Build
```bash
npm run preview
```
Serves the production build locally

## 📝 How to Edit & Extend

### Adding a New Drug to Dictionary
Edit `src/data/drugDictionary.js`:
```javascript
{ name: "NewDrug", cat: "Category", dose: "5", unit: "mg/kg", freq: "BID" }
```

### Modifying Patient Data
Edit `src/data/patientData.js`:
```javascript
export const PATIENT_DATA = { /* your data */ }
```

### Adding New Workflow Step
1. Create new component in `src/components/Workflow/`
2. Add new case in App.jsx workflow state
3. Update Header.jsx with new step title

### Customizing Styling
Edit Tailwind classes directly in component JSX files, or:
- `tailwind.config.js` - Add custom colors/themes
- `src/index.css` - Global styles

### Adding New Modal
1. Create in `src/components/Modals/`
2. Add state in App.jsx
3. Pass callbacks as props

## 🔧 Technical Stack

- **React 18** - UI framework
- **Vite 5** - Build tool (fast, modern)
- **Tailwind CSS 3** - Utility-first styling
- **Lucide React** - Icon library (20+ icons)
- **Gemini API** - AI DUR analysis (optional)
- **Postcss + Autoprefixer** - CSS processing

## 💡 Key Design Patterns

1. **Component Composition** - Small, focused components
2. **Hook-based State** - Custom hooks for business logic
3. **Data-driven Rendering** - Maps over arrays for lists
4. **Callback Props** - Child → Parent communication
5. **Conditional Rendering** - `workflowStep` controls UI
6. **Utility-first CSS** - Tailwind for rapid styling

## 🐛 Debugging Tips

1. Check browser console for errors (F12)
2. React DevTools helps inspect component state
3. Terminal shows Vite compilation errors
4. Check network tab for API calls to Gemini
5. Patient data is mocked - edit `src/data/patientData.js`
6. Drug dictionary is in `src/data/drugDictionary.js`

## 📦 Production Deployment

1. Run `npm run build` to create dist/
2. Deploy dist/ folder to any static hosting:
   - Vercel
   - Netlify
   - GitHub Pages
   - AWS S3 + CloudFront
3. For Gemini API, consider using environment variables:
   ```
   VITE_GEMINI_API_KEY=your-key-here
   ```

---

**Happy developing! This architecture makes it easy to understand, edit, and scale the application.** 🚀
