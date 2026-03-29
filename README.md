# Speech-Driven Human-Computer Interaction for Differently-Abled Learners

Welcome to the **Smart Learning Assistant**, an accessible, multimodal, AI-powered web platform tailored for differently-abled learners. Designed with universal accessibility in mind, this platform allows users to navigate, learn, and test their knowledge intelligently using adaptive interaction modes: voice recognition (Speech-to-Text), real-time hand gesture tracking (MediaPipe natively in-browser), and text fallback.

## 🚀 Key Features

### 1. Adaptive Interaction Modes
- **Visually-Impaired Mode:** Paced audio responses, highly descriptive text-to-speech without relying on visual abstractions.
- **Hearing-Impaired Mode:** Suppressed audio narration; text-heavy, highly structured visual UI components and rich transcripts.
- **Motor-Impaired Mode:** Entirely hands-free interactions! Control the UI effortlessly using your voice or your webcam.

### 2. Live MediaPipe Hand Gestures
For users lacking the ability to speak clearly or use a mouse, the platform employs a real-time floating browser widget tracking hand skeletons via Google MediaPipe. Easily mapped natively to AI inputs:
- 👍 **Thumbs Up** = Yes 
- 👎 **Thumbs Down** = No
- 🖐️ **Open Palm** = Stop Audio / Stop action
- ✌️ **Peace Sign** = Next / Quiz me
- ☝️ **Pointing Up** = Help 

### 3. Smart NLP & AI Fallback Engine
Driven by a local Flask proxy connecting to API services (`llama-3.1-8b-instant`), the assistant dynamically responds via 4W (What, Why, How, When) structured frameworks. 
If the API is ever disconnected, an intelligent Local NLP fallback operates immediately in the browser, extracting context and maintaining 100% core offline functionality!

### 4. Interactive Quizzing
The internal quiz engine dynamically builds context surrounding the syllabus context. You can bypass clicking Multiple-Choice options by vocally saying "A, B, C", or simply directly speaking out the actual answer itself—our Engine parses the words and evaluates correctness automatically.

---

## 💻 Tech Stack
- **Frontend**: Vanilla Javascript (ES6 features), HTML5, CSS3 Variables (Adaptive UI rendering), Web Speech API.
- **Gesture CV**: MediaPipe Camera and Hands Utils (CDN).
- **Backend / Routing**: Python Flask, CORS.
- **AI Processing**: Groq LLM API.

---

## 🛠️ Setup & Installation

### Prerequisites
- Python 3.10+
- A valid Groq API Key

### Step-by-Step

1. **Clone the Repository**
   ```bash
   git clone https://github.com/KSKishore2005/Speech-Driven-HCI-.git
   cd Speech-Driven-HCI-
   ```

2. **Configure the Environment**
   Navigate to the `backend/` directory and configure the environment files.
   ```bash
   cd backend
   echo "GROQ_API_KEY=your_key_here" > .env
   ```

3. **Install Dependencies**
   Install the Python backend server requirements:
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch the Application**
   You need two terminals running simultaneously:
   
   **Terminal 1 (Backend Server):**
   ```bash
   cd backend
   python app.py
   # Server will start on http://localhost:5000
   ```
   
   **Terminal 2 (Frontend Client):**
   ```bash
   cd ..
   python -m http.server 5500
   # Navigate to http://localhost:5500 in Google Chrome
   ```

---

## 🎯 Usage Walkthrough
1. **Selecting a Mode**: Click the accessibility button on the top-right to pick the interaction mode best suited to the user's needs.
2. **Asking Questions**: Click the `🎤` Microphone button or press your `Spacebar` and ask, "Please explain photosynthesis". The AI will intelligently answer. 
3. **Using Gestures**: Click the `✋` Hand button to initialize the camera tracking widget. Hold an Open Palm 🖐️ to forcibly stop the robot speaking mid-sentence.
4. **Taking Quizzes**: Say "Quiz me on Computer Science" to start an interactive test! Let the application narrate the options and speak your answer directly!

## License 
Built for inclusivity. Open-source under MIT bounds.
