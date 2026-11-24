# MINDMARK (BULLSEYE) — AI Financial Market Learning Platform

> **Tagline:** *Learn the market. Train your decisions. Protect your future.*

MINDMARK is an educational financial learning command center and paper trading simulator built specifically for Indian retail beginners. It combines real-time portfolio simulation with AI-driven behavioral feedback to foster disciplined, long-term decision-making.

---

## 🏛️ Educational Philosophy & SEBI Compliance

MINDMARK is strictly an **EDUCATIONAL SIMULATOR**, not a stock recommendation platform or advisory service.
- **Zero Real-Money Risk:** Every user begins with **₹1,00,000** (or reset up to ₹10,00,000) in virtual trading capital. No real deposits or withdrawals are supported.
- **No Stock Tips:** No buy/sell calls, advisory signals, or speculative gambling mechanics.
- **Behavioral Focus:** Over 85% of retail losses stem from psychological biases (FOMO, revenge trading, loss chasing, panic selling). MINDMARK identifies these habits in real time to build psychological discipline.
- **Indian Market Context:** Tailored to Dalal Street (NSE & BSE equities, NIFTY 50, SENSEX, T+1 settlement emulation).

---

## 📦 Required Dependencies & Prerequisites

To run this project locally, you need the following runtime environments and dependencies:

### 1. System Prerequisites
| Requirement | Minimum Version | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` | `v20.x` or `v22.x LTS` | Required for React frontend & Vite build tooling |
| **npm** | `>= 9.0.0` | Latest | Or `yarn` / `pnpm` |
| **Python** | `>= 3.10` | `3.11` / `3.12` / `3.14` | Required for FastAPI backend server |
| **pip** | `>= 23.0` | Latest | Python package installer |

---

### 2. Frontend Dependencies (`package.json`)

#### Production Dependencies
Installed via `npm install`:
- **`react`** (`^18.3.1`): Declarative UI component library.
- **`react-dom`** (`^18.3.1`): DOM rendering engine for React.
- **`react-router-dom`** (`^6.28.0`): Client-side routing, navigation guards, and route params.
- **`lucide-react`** (`^1.16.0`): Icon suite for financial metrics, badges, charts, and trading alerts.
- **`clsx`** (`^2.1.1`): Fast utility for constructing conditional CSS class names.
- **`tailwind-merge`** (`^2.5.5`): Safely merges Tailwind CSS classes without conflict.

#### Development & Build Dependencies
- **`vite`** (`^6.0.1`): Next-generation ultra-fast frontend build tool and development server.
- **`typescript`** (`^5.6.3`): Static type analysis for components, state models, and API clients.
- **`@vitejs/plugin-react`** (`^4.3.4`): Babel/Fast Refresh integration for Vite.
- **`tailwindcss`** (`^3.4.16`): Utility-first CSS engine for dark fintech terminal UI.
- **`postcss`** (`^8.4.49`): CSS tool for transforming styles with JS plugins.
- **`autoprefixer`** (`^10.4.20`): Automatically adds vendor prefixes to CSS rules.
- **`jsdom`** (`^29.1.1`) & **`@types/jsdom`** (`^30.0.0`): Pure JavaScript DOM implementation for testing.
- **`@types/react`** (`^18.3.12`) & **`@types/react-dom`** (`^18.3.1`): TypeScript typings for React 18.

---

### 3. Backend Dependencies (`backend/requirements.txt`)

Installed via `pip install -r backend/requirements.txt`:
- **`fastapi`** (`>=0.110.0`): High-performance, async REST API web framework based on OpenAPI standards.
- **`uvicorn`** (`>=0.28.0`): Production-grade ASGI web server for running FastAPI asynchronously.
- **`pydantic`** (`>=2.7.0`): Strict schema validation and data parsing using Python type annotations.
- **`pydantic-settings`** (`>=2.2.0`): Environment variable parsing with typed configurations.
- **`pyjwt`** (`>=2.8.0`): Secure JSON Web Token encoding, decoding, and session verification.
- **`httpx`** (`>=0.27.0`): Asynchronous HTTP client for Supabase REST endpoints and market data feeds.
- **`google-generativeai`** (`>=0.4.0`): Official Google Gemini 1.5 Flash SDK (with deterministic local fallback when offline).
- **`python-dotenv`** (`>=1.0.0`): Loads configuration from `.env` files into application environment.

---

## 🚀 Quick Start Guide

### Step 1: Clone and Setup Environment Variables

```bash
# Copy example backend environment configuration
cp backend/.env.example backend/.env

# (Optional) Copy example frontend environment configuration
cp .env.example .env
```

### Step 2: Install Dependencies

#### Backend:
```bash
# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

#### Frontend:
```bash
# Install frontend npm dependencies
npm install
```

### Step 3: Run the Development Servers

#### Terminal 1 — Start FastAPI Backend:
```bash
# From repository root
uvicorn backend.app.main:app --host 0.0.0.0 --port 8005 --reload
```
Backend API will be live at:
- **API Base:** `http://localhost:8005`
- **Swagger Docs:** `http://localhost:8005/docs`
- **ReDoc:** `http://localhost:8005/redoc`

#### Terminal 2 — Start Frontend:
```bash
npm run dev
```
Frontend application will be accessible at:
- **Web App:** `http://localhost:3000` (or `http://localhost:3001`)

---

## 🧪 Testing & Verification

### Run Backend Automated API Test Suite
```bash
python3 backend/tests/test_api.py
```
*Executes 17 comprehensive automated tests across all endpoints (authentication, trade execution, portfolio calculations, risk checks, behavior analysis, and replay engines).*

### Run Frontend Typecheck & Production Build
```bash
npm run build
```
*Compiles TypeScript without errors and generates production-ready bundle in `dist/`.*

---

## 🎨 Design System & Color Palette

Dark fintech aesthetic combining modern terminal utility with glass surfaces and clean typography:

| Role | Color Code | Purpose |
| :--- | :--- | :--- |
| **Background** | `#0B1017` | Deep midnight canvas |
| **Surface** | `#141C25` | Card panels and sidebars |
| **Elevated Surface** | `#1A2531` | Hover states, modals, active elements |
| **Primary (Emerald)** | `#45D6B5` | Positive signals, executions, profits |
| **Secondary (Electric Blue)** | `#78A9FF` | Curriculum, badges, AI insights |
| **Warning (Amber)** | `#F5B942` | Caution, volatility warnings, historical replays |
| **Danger (Red)** | `#F16D75` | Losses, risk alerts, square-offs |
| **Text Primary** | `#F3F6F8` | Crisp financial typography |
| **Text Secondary** | `#93A2B4` | Supporting metrics & descriptions |

---

## 🗺️ Application Architecture & Routes

| # | Route | Module Name | Core Features |
| :--- | :--- | :--- | :--- |
| 1 | `/` | **Landing / Welcome** | Hero, live simulated ticker, terminal preview, 3 pillars, SEBI pledge |
| 2 | `/auth` | **Authentication** | Sign in / Sign up toggle + 1-click instant guest access |
| 3 | `/onboarding` | **Skill Diagnostic** | 4-step assessment of experience, risk tolerance, and F&O awareness |
| 4 | `/dashboard` | **Main Dashboard** | Portfolio net worth, day P&L, market pulse, behavioral score, active positions |
| 5 | `/learn` | **Learn & Courses** | 5 structured tracks (Foundations, Charts, Fundamentals, Risk, F&O Warning) |
| 6 | `/simulator` | **Paper Simulator** | NSE stock selector, interactive charts, Buy/Sell panel, Stop-Loss / Target, Pre-Trade Risk Check |
| 7 | `/portfolio` | **Portfolio Analytics** | Capital allocation (Cash vs Sectors), win/loss ratio, benchmark alpha |
| 8 | `/behavioral-insights` | **Behavioral Insights** | AI bias meters (FOMO, Revenge Trading, Loss Chasing, Panic Selling) |
| 9 | `/market-replay` | **Historical Market Replay** | COVID-19 March 2020 crash, 2024 Election volatility, 2008 Lehman collapse |
| 10 | `/news-explainer` | **Market News Explainer** | Real headlines translated into 5-point concept bridge (What, Why, What it Means) |
| 11 | `/challenges` | **Challenges & Progression**| 5-tier level progression, habit-forming quests, and ethical discipline leaderboard |
| 12 | `/settings` | **Settings & Controls** | Reset virtual capital to ₹1,00,000, toggle alerts, sound settings |

---

## 🔒 Git & Security Compliance

All private keys, environment secrets, and binary artifacts are safely ignored via [`.gitignore`](file:///.gitignore):
- `node_modules/` (Frontend package cache)
- `venv/` / `.venv/` (Python virtual environment)
- `.env` / `backend/.env` (Local secrets — use `.env.example` templates)
- `mindmark.db` / `*.sqlite` (Local runtime SQLite databases)
- `dist/` (Compiled production bundle)
- `logs/` / `*.log` (Debug logs)
