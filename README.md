# BULLSEYE — AI Financial Market Learning Simulator

> **Tagline:** *Learn the market. Train your decisions. Protect your future.*

BULLSEYE is a premium AI-powered financial education and market simulation platform designed specifically for beginners in India.

---

## 🏛️ Educational Philosophy & SEBI Compliance

BULLSEYE is an **EDUCATIONAL SIMULATOR**, not a stock recommendation platform or advisory service.
- **Zero Real-Money Risk:** Every user begins with **₹10,00,000** in virtual trading capital.
- **No Stock Tips:** No buy/sell calls or guaranteed profit schemes.
- **Behavioral Focus:** Over 85% of retail losses stem from emotional biases (FOMO, revenge trading, disposition effect). BULLSEYE mirrors these habits in real time to build psychological discipline.
- **Indian Market Context:** Tailored to Dalal Street (NSE & BSE equities, NIFTY 50, SENSEX, T+1 settlement emulation).

---

## 🎨 Design System & Color Palette

Built with a dark fintech aesthetic (combining modern terminal utility with glass surfaces and clean typography):

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
| 5 | `/learn` | **Learn & Courses** | 5 structured tracks (Foundations, Charts, Fundamentals, Risk, F&O Warning) with interactive checkpoints |
| 6 | `/simulator` | **Paper Simulator** | NSE stock selector, interactive charts, Buy/Sell panel, stop-loss / target calculators, mandatory trade thesis journaling |
| 7 | `/portfolio` | **Portfolio Analytics** | Capital allocation (Cash vs Sectors), win/loss ratio, benchmark alpha |
| 8 | `/behavioral-insights` | **Behavioral Insights** | AI bias meters (FOMO, Revenge Trading, Disposition Effect) & psychological drills |
| 9 | `/market-replay` | **Historical Market Replay** | Time machine through COVID March 2020 crash, 2024 Election volatility, and 2008 Lehman collapse |
| 10 | `/news-explainer` | **Market News Explainer** | Real headlines translated into plain English with sector impact sensitivity |
| 11 | `/challenges` | **Challenges & XP** | Habit-forming quests (stop-loss discipline, diversification, crisis survival) |
| 12 | `/settings` | **Settings & Controls** | Reset virtual capital to ₹10 Lakhs, toggle FOMO alerts, currency display format |

---

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Production build & typecheck
npm run build
```

Dev server default URL: `http://localhost:3000`
