# FinVoice: AI-Powered Multilingual Financial Assistant 🎙️💸

**FinVoice** is a modern, voice-first financial management and advisory web application designed to help users effortlessly track expenses, manage budgets, and receive personalized financial advice in Indian languages (English, Hindi, Marathi) powered by **Sarvam AI**.

---

## ✨ Key Features

- 🎙️ **Sarvam AI Voice Recognition (Saaras)**: Record transactions and queries naturally in English, Hindi, or Marathi with native Indian language speech-to-text recognition.
- 🧠 **Sarvam AI Financial Reasoning (`sarvam-105b`)**: Intelligent categorization of expenses (Food, Medical, Education, Others, Savings) and conversational financial advisory.
- 📊 **Real-time Financial Dashboards**: Visual breakdown of your income, expenses, and category totals using Recharts.
- 🎯 **Smart Goal Planner**: Track savings goals with automated completion triggers.
- 🔒 **Secure Authentication**: Firebase Authentication for user accounts and Realtime Database/Firestore syncing.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 7
- **Routing**: React Router DOM v7
- **Database & Auth**: Firebase (Auth, Realtime Database, Firestore)
- **AI & Speech Recognition**:
  - **Speech-to-Text**: Sarvam AI Saaras Model (`saaras:v3`)
  - **Financial LLM / Chat**: Sarvam AI (`sarvam-105b`)
- **Data Visualization**: Recharts
- **Styling**: CSS Modules, Modern Glassmorphism & Animations

---

## 🚀 Getting Started

### 1. Prerequisites
- [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/) (v18+)
- Sarvam AI API Key from [Sarvam AI Dashboard](https://dashboard.sarvam.ai/)
- Firebase Project credentials configured in `src/firebase.js`

### 2. Installation
Clone the repository and install dependencies:
```bash
bun install
# or
npm install
```

### 3. Environment Variables Setup
Create a `.env` file in the project root based on `.env.example`:
```env
VITE_SARVAM_API_KEY=your_sarvam_api_key_here
SARVAM_API_KEY=your_sarvam_api_key_here
```

### 4. Running the Development Server
```bash
bun run dev
# or
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Testing Sarvam AI Integration
Run the automated integrity test script to verify Sarvam AI speech and text endpoints:
```bash
bun run test:sarvam
# or
npm run test:sarvam
```

### 6. Production Build
```bash
bun run build
```

---

## 💡 How to Utilize FinVoice

1. **Dashboard & Voice Expense Logging**:
   - Tap the microphone button in the navigation bar or dashboard.
   - Speak an expense naturally: *"Spent 450 rupees on dinner"* or *"दवाइयों पर 300 रुपये खर्च किए"*.
   - Sarvam AI transcribes and extracts the category and amount, automatically logging it to your balance.
2. **FinVoice Chat**:
   - Navigate to `/chat` to consult the AI advisor.
   - Type or use voice input to ask about budgeting, investments, debt management, or SIP planning.
3. **Voice Agent Hub**:
   - Navigate to `/agent` for hands-free financial management with live soundwave visualization and language selection.

---

## 👨‍💻 Team Members
- **Sarthak Patil**
- **Satyam Singh**
- **Utkarsh Yadav**
- **Prathamesh Yewale**
