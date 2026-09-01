# SHASTRA SYNC - Team Operations Manual

**Welcome to the Hackathon!** 
Because we are building a massive, distributed AI product in just a few days, we are using a highly modular "AI-First" development strategy. 

You do not need to be a senior developer to build this. You are an **AI Manager**. Your job is to command your AI IDE (specifically **Kiro**, which excels at this) to write the code for your specific piece of the puzzle, and then make sure your piece connects to everyone else's.

Because Kiro is uniquely built for **"spec-driven development,"** it is going to absolutely love the God Document we just created.

Here is exactly how our team will operate.

---

## 1. The "God Document"
In the root of this project folder, there is a file called `AI_DEVELOPMENT_MASTER_FILE.md`. 
**This is the single most important file in the project.** It contains the exact blueprints, JSON schemas, and architectural logic for the entire system.

**How to use it with Kiro IDE:**
Kiro doesn't just want to "vibe code"; it wants a technical specification first. 
1. Open Kiro and load your project folder.
2. Point Kiro's agent directly to the `AI_DEVELOPMENT_MASTER_FILE.md` as your primary technical specification.
3. Tell Kiro: *"I am Teammate [X]. Read the master specification and orchestrate the tasks to build my module."*
Kiro will then break down your module into a task list and execute it perfectly according to our God Document.

---

## 2. Your Daily AI Workflow (The 4 Steps)

You are no longer typing syntax. You are managing an AI worker. Follow this loop:

### Step 1: The Initial Prompt
Open your AI chat and explicitly state your role. 
> *"I am Teammate [Your Number]. Read the God Document and build my entire module from scratch."*

### Step 2: Run the Commands
The AI will spit out terminal commands (like `npm install`, `pip install`, `flutter create`).
*   **Your Job:** Open your terminal and run those exact commands. If the AI tells you to create a `.env` file for API keys, go create it and paste the keys in. 

### Step 3: Run the Code & "Vibe Check"
The AI will write the code. Now you must run your module (`npm run dev` or `python main.py`).
*   **Your Job:** Look at what the AI built. Is the button too small? Is the text the wrong color? 
*   **The Fix:** Tell the AI: *"The UI looks bad. Make the button take up 50% of the screen and turn the background black."* The AI is your frontend designer; tell it what you want to see.

### Step 4: The Error Ping-Pong
The code will inevitably crash or throw an error. Do not panic.
*   **Your Job:** Copy the giant wall of red error text from your terminal. Paste it directly into the AI chat and say: *"I got this error when I ran the code. Fix it."*
*   The AI will apologize, find the bug, and rewrite the code. Repeat until it works.

---

## 3. Team Integration & Communication

Our system is divided into 5 strictly isolated modules. We only communicate via HTTP JSON payloads and WebSockets. **If you change the JSON structure, you break the entire team's code.**

### The 5 Roles:
1.  **Teammate 1 (The Hub - Python/FastAPI):** You run the database and the central WebSocket server on `localhost:8000`. Everyone else connects to you.
2.  **Teammate 2 (The Brain - Python/LLM):** You build the LangGraph agent that listens for events, thinks, and sends decisions back.
3.  **Teammate 3 (The Edge - Flutter):** You build the tablet app for the elder. It must have a giant panic button and read WebSocket alerts out loud using Text-To-Speech.
4.  **Teammate 4 (The Observer - Next.js):** You build the dashboard for the family. It connects to the WebSocket and flashes red when critical alerts arrive.
5.  **Teammate 5 (The Puppeteer - Python/CLI):** You build the fake hardware. You run a script that injects "Fall Detected" JSON payloads into Teammate 1's server to drive our live demo.

### How to test together (Integration):
You must talk to each other! 
*   "Hey Teammate 1, is the database running?"
*   "Hey Teammate 5, push the 'Fall' button so I can see if my Next.js dashboard flashes red."

---

## 4. Live Deployment Checklist

When we are ready to present to the judges, we must push this live to the internet.
1.  **Push to GitHub:** Commit all your AI-generated code to our shared repo.
2.  **Teammates 1 & 2:** Deploy the FastAPI core and Agent to **Railway.app** or **Render.com**. You will get a live URL (e.g., `api.shastrasync.com`).
3.  **Teammates 3, 4, & 5:** Update your `.env` files. Change `localhost:8000` to the new live URL.
4.  **Teammate 4:** Deploy the Next.js dashboard to **Vercel**.
5.  **Teammate 3:** Build the Flutter APK and install it on our presentation tablet.

Good luck. Trust the AI, but verify the code by running it constantly!
