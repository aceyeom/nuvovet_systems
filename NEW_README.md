# Veterinary Pharmacy OS - DUR System

A modern, full-stack veterinary pharmacy drug utilization review (DUR) system built with React and designed for browser-based deployment.

##  Architecture Overview

### Project Structure

src/
├── components/           # React components (organized by feature)
│   ├── Layout/          # Main layout components
│   ├── Sidebar/         # Navigation sidebar
│   ├── PatientPanel/    # Patient information display
│   ├── Workflow/        # Workflow step components
│   │   ├── PrescriptionEntry.jsx
│   │   ├── AnalysisLoader.jsx
│   │   ├── SafetyReview.jsx
│   │   └── PrescriptionSummary.jsx
│   └── Modals/          # Modal dialogs
│       └── DrugDictionaryModal.jsx
├── data/                # Static data and constants
│   ├── patientData.js
│   └── drugDictionary.js
├── hooks/               # Custom React hooks
│   ├── usePrescriptionManager.js
│   └── useWorkflowState.js
├── utils/               # Utility functions
│   └── durAnalysis.js   # DUR analysis API calls
├── App.jsx              # Main app component
├── main.jsx             # React DOM entry point
└── index.css            # Tailwind CSS
```

##  Workflow States

1. **Entry** - Prescription entry and drug selection
2. **Analyzing** - DUR analysis with visual check sequence
3. **Review** - Safety score and alert resolution
4. **Order** - Final prescription summary and owner instructions

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Preview
```bash
npm run preview
```

## 🔧 Configuration

### Gemini API Setup
To enable AI-powered DUR analysis, add your Gemini API key in `src/utils/durAnalysis.js`:

```javascript
const API_KEY = "your-gemini-api-key-here";
```

## 📱 Features

- **Patient Profile Management** - View patient vitals, allergies, and clinical history
- **Prescription Management** - Add, edit, and remove medications
- **Drug Dictionary** - Browse and select from veterinary formulary
- **Safety Analysis** - Automated DUR checks for interactions, dosage, allergies, and disease contraindications
- **Alert Resolution** - Apply recommended changes to prescriptions
- **Owner Instructions** - AI-generated medication instructions for pet owners
- **Prescription Printing** - Generate printable prescription labels

## 🎨 Design System

Built with Tailwind CSS for responsive, modern UI:
- Professional medical interface
- Real-time visual feedback
- Accessibility-first components
- Dark mode support ready

## 📦 Dependencies

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Gemini API** - AI-powered analysis (optional)

## 📄 License

This project is proprietary veterinary pharmacy software.
