import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BrainCircuit,
  Compass,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Target,
  Sparkles,
  TrendingDown,
  Award,
  BookOpen,
  RotateCcw,
  Check,
  AlertTriangle,
  Clock,
  Layers,
  ShieldCheck,
  HelpCircle,
  Zap,
  Flame,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useSimulator } from '../context/SimulatorContext';
import { UserAssessment } from '../types';

// ============================================================================
// DATA STRUCTURES FOR STEPS 2, 3, AND 4
// ============================================================================

interface ExperienceQuestion {
  id: string;
  question: string;
  options: { label: string; score: number; hint: string }[];
}

const EXPERIENCE_QUESTIONS: ExperienceQuestion[] = [
  {
    id: 'invested_in_stocks',
    question: 'Have you ever invested in stocks?',
    options: [
      { label: 'Never bought a share', score: 1, hint: 'Absolute zero experience' },
      { label: 'Once or twice in the past', score: 2, hint: 'Tested the waters casually' },
      { label: 'Yes, actively investing or trading', score: 4, hint: 'Hold an active portfolio' }
    ]
  },
  {
    id: 'trading_app',
    question: 'Have you ever used a trading app?',
    options: [
      { label: 'Never downloaded one', score: 1, hint: 'No Demat or trading app' },
      { label: 'Explored apps (Zerodha, Groww, AngelOne)', score: 3, hint: 'Familiar with user interfaces' },
      { label: 'Use one regularly every week', score: 4, hint: 'Comfortable with order books' }
    ]
  },
  {
    id: 'price_changes',
    question: 'Do you understand how stock prices change?',
    options: [
      { label: 'No idea, seems random', score: 1, hint: 'Need fundamental basics' },
      { label: 'Vaguely know it involves buyers and sellers', score: 2, hint: 'Basic auction intuition' },
      { label: 'Yes, supply, demand, corporate earnings & liquidity', score: 4, hint: 'Clear market comprehension' }
    ]
  },
  {
    id: 'mutual_funds_sip',
    question: 'Have you heard of mutual funds, ETFs, SIPs, and index funds?',
    options: [
      { label: 'Not familiar with these terms', score: 1, hint: 'New to collective investing' },
      { label: 'Heard the terms, but never invested', score: 2, hint: 'General awareness' },
      { label: 'Yes, currently have active SIPs or index investments', score: 4, hint: 'Practical investor' }
    ]
  },
  {
    id: 'futures_and_options',
    question: 'Have you heard of options and futures (F&O)?',
    options: [
      { label: 'Never heard of them', score: 1, hint: 'Protected from derivatives' },
      { label: 'Heard people talk about high-risk F&O', score: 2, hint: 'Aware of derivatives buzz' },
      { label: 'Understand leverage, call/put options & expiry', score: 4, hint: 'Advanced derivatives awareness' }
    ]
  }
];

interface KnowledgeQuestion {
  id: number;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  misconceptionTip: string;
}

const KNOWLEDGE_QUESTIONS: KnowledgeQuestion[] = [
  {
    id: 1,
    topic: 'What a Stock Represents',
    question: 'When you buy a share of an Indian company like Reliance Industries, what does that share fundamentally represent?',
    options: [
      'A personal loan you gave to the company that they must repay with monthly interest.',
      'A fractional legal ownership stake in the real business, its assets, and its future profits.',
      'A lottery ticket that moves randomly each day with no underlying value.',
      'A government bond with a guaranteed 12% annual return.'
    ],
    correctIndex: 1,
    explanation: 'Buying a stock makes you a part-owner of the enterprise. You participate in the business\'s growth, dividends, and earnings power.',
    misconceptionTip: 'Stocks are not debt or fixed-income loans; you are equity owners, so you carry both the business upside and downside risk.'
  },
  {
    id: 2,
    topic: 'Why Stock Prices Change',
    question: 'Why does the market price of a stock continuously change during trading hours (09:15 to 15:30 IST)?',
    options: [
      'The stock exchange officials manually set the prices at fixed hourly intervals.',
      'It shifts continuously based on the dynamic balance between active buyers (demand) and sellers (supply).',
      'The company\'s CEO decides the daily share price based on internal board votes.',
      'The Reserve Bank of India fixes all equity prices to control inflation.'
    ],
    correctIndex: 1,
    explanation: 'Dalal Street is a continuous double auction. When buyers outnumber sellers willing to sell at that price, prices rise; when selling pressure dominates, prices fall.',
    misconceptionTip: 'Prices are not dictated by management or regulators; they reflect immediate collective market sentiment and liquidity.'
  },
  {
    id: 3,
    topic: 'Risk & Returns',
    question: 'What is the fundamental relationship between investment risk and potential returns?',
    options: [
      'Guaranteed high returns with zero risk can easily be achieved through simple stock tips.',
      'Higher potential returns almost always require accepting higher potential volatility and greater downside risk.',
      'Low-risk investments always generate the highest profits over 10-year horizons.',
      'Risk has no mathematical connection to the profit you can expect.'
    ],
    correctIndex: 1,
    explanation: 'In real economics, risk and return are inseparable twins. Assets offering higher potential gains require you to accept real drawdown possibilities.',
    misconceptionTip: 'Any scheme, platform, or influencer promising guaranteed massive returns with zero risk is either deceptive or dangerously leveraged.'
  },
  {
    id: 4,
    topic: 'Portfolio Diversification',
    question: 'What is the primary objective of diversifying your investments across 4 to 5 different economic sectors?',
    options: [
      'To guarantee that you will never experience a single red or losing day in your portfolio.',
      'To ensure that 100% of your money is invested solely in fast-moving technology stocks.',
      'To protect overall wealth by preventing the collapse of any single company or sector from wiping out your capital.',
      'To increase your brokerage and transaction fees paid to stockbrokers.'
    ],
    correctIndex: 2,
    explanation: 'Holding companies across independent sectors (e.g., IT, Banking, FMCG, Pharma, Energy) cushions your wealth if one industry faces a cyclical downturn.',
    misconceptionTip: 'Diversification doesn\'t prevent daily fluctuations; it eliminates catastrophic single-point failure (unsystematic risk).'
  },
  {
    id: 5,
    topic: 'The Power of Compounding',
    question: 'Why is compound interest often called the most powerful force in long-term wealth creation?',
    options: [
      'It allows any novice trader to become a millionaire in 30 days without patience.',
      'You earn returns not only on your original capital, but also on the accumulated returns of prior years.',
      'It completely removes all government taxes on short-term trading gains.',
      'It only functions if you execute more than 20 day-trades every session.'
    ],
    correctIndex: 1,
    explanation: 'Compounding creates exponential growth over decades because your gains generate their own gains, turning consistent modest returns into substantial wealth.',
    misconceptionTip: 'Compounding requires time and patience; attempting to speed it up with excessive leverage usually destroys capital instead.'
  },
  {
    id: 6,
    topic: 'Investing vs Trading',
    question: 'What is the core distinction between long-term investing and short-term trading?',
    options: [
      'Investing is strictly for senior citizens; trading is for everyone in college.',
      'Investing focuses on multi-year business value and earnings power; trading focuses on short-term price momentum and liquidity.',
      'Investors always lose money to inflation; day-traders always outperform index funds.',
      'There is no difference; both are pure gambling.'
    ],
    correctIndex: 1,
    explanation: 'An investor evaluates companies as long-term businesses, while a trader seeks to exploit short-term supply/demand imbalances over days, hours, or minutes.',
    misconceptionTip: 'Conflating the two is dangerous. Buying a speculative stock as a "trade" and turning into a reluctant "long-term investor" after it falls 40% is a classic beginner mistake.'
  },
  {
    id: 7,
    topic: 'Index Funds',
    question: 'What does a NIFTY 50 Index Fund actually do with an investor\'s money?',
    options: [
      'It attempts to hunt down secret small-cap penny stocks that could grow 100x next week.',
      'It passively buys and holds all 50 of India\'s largest corporations in exact proportion to their index weight.',
      'It guarantees an 18% annual return backed by the Ministry of Finance.',
      'It trades aggressive intraday options contracts on Dalal Street.'
    ],
    correctIndex: 1,
    explanation: 'An index fund tracks the performance of the entire Indian economy\'s 50 bellwether enterprises (TCS, Reliance, HDFC, Infosys) with minimal expense ratios.',
    misconceptionTip: 'You do not have to guess which single company will win. Index funds let you capture the broad growth of the entire Indian economy.'
  },
  {
    id: 8,
    topic: 'F&O Derivatives Reality',
    question: 'A landmark study by market regulator SEBI revealed that out of 100 retail traders who trade Futures & Options (F&O):',
    options: [
      'Over 90 out of 100 made life-changing fortunes within their first 6 months.',
      'Approximately 93 out of 100 individual retail traders experienced net financial losses.',
      'All retail traders broke even with zero gains or losses.',
      'Only foreign institutional investors were permitted to trade derivatives.'
    ],
    correctIndex: 1,
    explanation: 'Official SEBI data proved that 93% of retail traders lost an average of ₹1.25 Lakhs per year in F&O due to aggressive leverage and time decay (theta).',
    misconceptionTip: 'Options are not quick lottery tickets; they are sophisticated hedging contracts where beginners face extreme odds without institutional risk controls.'
  }
];

interface BehavioralScenario {
  id: number;
  title: string;
  scenario: string;
  options: {
    label: string;
    biasType: string;
    riskScore: number;
    insight: string;
  }[];
}

const BEHAVIORAL_SCENARIOS: BehavioralScenario[] = [
  {
    id: 1,
    title: 'Scenario 1: The Sudden 10% Drop',
    scenario: 'A stock you bought two days ago suddenly falls 10% on higher-than-average volume. What is your immediate psychological reaction?',
    options: [
      {
        label: 'Panic-sell everything immediately to stop the emotional stress.',
        biasType: 'Panic Selling / Loss Aversion',
        riskScore: 2,
        insight: 'Strong urge to escape discomfort. We will train you to pre-commit exit boundaries before placing orders.'
      },
      {
        label: 'Freeze, close the trading app, and hope it climbs back to my buy price.',
        biasType: 'Disposition Effect / Denial',
        riskScore: 3,
        insight: 'Hoping a falling stock returns to even is the most common reason small losses snowball into 50% blowups.'
      },
      {
        label: 'Immediately double my position size to average down my purchase cost.',
        biasType: 'Martingale / Averaging Trap',
        riskScore: 4,
        insight: 'Averaging down on a falling stock without confirming fundamental support drastically amplifies downside risk.'
      },
      {
        label: 'Review my original trade thesis and execute my pre-planned stop loss.',
        biasType: 'Disciplined Mindset',
        riskScore: 5,
        insight: 'Excellent discipline! Accepting a controlled loss is a normal, healthy part of professional market participation.'
      }
    ]
  },
  {
    id: 2,
    title: 'Scenario 2: The Viral Rally',
    scenario: 'Colleagues and social media groups are buzzing about a speculative green energy stock that has already skyrocketed +30% in 4 trading sessions. What would you do?',
    options: [
      {
        label: 'Rush to buy immediately before it gains another 20%!',
        biasType: 'Severe FOMO (Fear Of Missing Out)',
        riskScore: 1,
        insight: 'Chasing an extended parabolic stock is the classic setup where retail investors end up holding the bag.'
      },
      {
        label: 'Feel a strong urge to buy, but force myself to check company earnings and debt first.',
        biasType: 'Controlled Restraint',
        riskScore: 4,
        insight: 'Great emotional friction! Taking 10 minutes to verify fundamentals prevents impulsive FOMO executions.'
      },
      {
        label: 'Stay away completely; the risk-reward ratio is unfavorable after a 30% gap-up.',
        biasType: 'Risk-First Mentality',
        riskScore: 5,
        insight: 'Professional discipline. The market offers hundreds of setups; missing one rally never justifies a bad entry.'
      },
      {
        label: 'Ask the group for more hot stock tips to see if another stock is about to jump.',
        biasType: 'Tip Dependency',
        riskScore: 2,
        insight: 'Relying on tips strips away your autonomy. MINDMARK will train you to analyze setups independently.'
      }
    ]
  },
  {
    id: 3,
    title: 'Scenario 3: Three Consecutive Losses',
    scenario: 'Your virtual portfolio has suffered 3 consecutive losing trades this week, putting your account down 4%. What are you most likely to do next?',
    options: [
      {
        label: 'Double my position size on the next trade to quickly win back the lost money.',
        biasType: 'Revenge Trading Risk',
        riskScore: 1,
        insight: 'Revenge trading is the #1 killer of trading accounts. Never increase size while emotionally dysregulated.'
      },
      {
        label: 'Feel furious at the market and abandon the simulator for several days.',
        biasType: 'Emotional Frustration',
        riskScore: 2,
        insight: 'Taking a cooling break is good, but viewing losses as personal attacks impedes analytical growth.'
      },
      {
        label: 'Step away from the screen, review my trade log, and reduce position size.',
        biasType: 'Professional Trader Habit',
        riskScore: 5,
        insight: 'Spot on! Top hedge fund managers downsize their position risk when experiencing temporary drawdowns.'
      },
      {
        label: 'Switch to trading penny stocks or intraday options to get faster percentage moves.',
        biasType: 'Desperation Risk Escalation',
        riskScore: 1,
        insight: 'Escalating risk after a drawdown turns a manageable 4% dip into total account ruin.'
      }
    ]
  }
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { saveAssessment } = useSimulator();

  // Storage key for persistent state
  const STORAGE_KEY = 'mindmark_onboarding_v2';

  // State management
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.currentStep || 1;
      } catch (e) {
        return 1;
      }
    }
    return 1;
  });

  // Step 2 state: Experience answers
  const [experienceAnswers, setExperienceAnswers] = useState<{ [key: string]: number }>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved).experienceAnswers || {};
      } catch (e) {}
    }
    return {};
  });

  // Step 3 state: Knowledge Test answers
  const [currentKnowledgeQ, setCurrentKnowledgeQ] = useState<number>(0);
  const [knowledgeAnswers, setKnowledgeAnswers] = useState<{ [qId: number]: number }>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved).knowledgeAnswers || {};
      } catch (e) {}
    }
    return {};
  });
  const [selectedKnowledgeOption, setSelectedKnowledgeOption] = useState<number | null>(null);
  const [hasAnsweredCurrentQ, setHasAnsweredCurrentQ] = useState<boolean>(false);

  // Step 4 state: Behavioral answers
  const [behavioralAnswers, setBehavioralAnswers] = useState<{ [scenarioId: number]: number }>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved).behavioralAnswers || {};
      } catch (e) {}
    }
    return {};
  });

  // Computed results state
  const [assessmentResult, setAssessmentResult] = useState<UserAssessment | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved).assessmentResult || null;
      } catch (e) {}
    }
    return null;
  });

  // Save to localStorage on any state update
  useEffect(() => {
    const payload = {
      currentStep,
      experienceAnswers,
      knowledgeAnswers,
      behavioralAnswers,
      assessmentResult
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [currentStep, experienceAnswers, knowledgeAnswers, behavioralAnswers, assessmentResult]);

  // Restart / Reset
  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(1);
    setExperienceAnswers({});
    setKnowledgeAnswers({});
    setBehavioralAnswers({});
    setCurrentKnowledgeQ(0);
    setSelectedKnowledgeOption(null);
    setHasAnsweredCurrentQ(false);
    setAssessmentResult(null);
  };

  // Step 2 selection
  const handleSelectExperience = (qId: string, score: number) => {
    setExperienceAnswers(prev => ({ ...prev, [qId]: score }));
  };

  const isStep2Complete = EXPERIENCE_QUESTIONS.every(q => experienceAnswers[q.id] !== undefined);

  // Step 3 selection and answer submission
  const activeKQ = KNOWLEDGE_QUESTIONS[currentKnowledgeQ];

  const handleSelectKnowledgeAnswer = (idx: number) => {
    if (hasAnsweredCurrentQ) return;
    setSelectedKnowledgeOption(idx);
    setHasAnsweredCurrentQ(true);
    setKnowledgeAnswers(prev => ({ ...prev, [activeKQ.id]: idx }));
  };

  const handleNextKnowledgeQ = () => {
    if (currentKnowledgeQ < KNOWLEDGE_QUESTIONS.length - 1) {
      setCurrentKnowledgeQ(prev => prev + 1);
      setSelectedKnowledgeOption(null);
      setHasAnsweredCurrentQ(false);
    } else {
      // Completed Step 3 -> proceed to Step 4
      setCurrentStep(4);
    }
  };

  // Step 4 selection
  const handleSelectBehavioral = (scenarioId: number, optionIdx: number) => {
    setBehavioralAnswers(prev => ({ ...prev, [scenarioId]: optionIdx }));
  };

  const isStep4Complete = BEHAVIORAL_SCENARIOS.every(s => behavioralAnswers[s.id] !== undefined);

  // Compute final assessment when transitioning from Step 4 to Step 5
  const calculateFinalResults = () => {
    // 1. Knowledge Score
    let correctCount = 0;
    KNOWLEDGE_QUESTIONS.forEach(kq => {
      if (knowledgeAnswers[kq.id] === kq.correctIndex) {
        correctCount += 1;
      }
    });
    const knowledgeScore = Math.round((correctCount / KNOWLEDGE_QUESTIONS.length) * 100);

    // 2. Market Familiarity (From Step 2)
    const expScores = Object.values(experienceAnswers);
    const totalExp = expScores.reduce((a, b) => a + b, 0);
    const maxExp = EXPERIENCE_QUESTIONS.length * 4;
    const marketFamiliarityScore = Math.min(100, Math.round((totalExp / maxExp) * 100));

    // 3. Emotional Awareness (From Step 4)
    let totalBehavioralScore = 0;
    BEHAVIORAL_SCENARIOS.forEach(sc => {
      const chosenIdx = behavioralAnswers[sc.id] ?? 0;
      totalBehavioralScore += sc.options[chosenIdx].riskScore;
    });
    const maxBehavioral = BEHAVIORAL_SCENARIOS.length * 5;
    const emotionalAwarenessScore = Math.round((totalBehavioralScore / maxBehavioral) * 100);

    // 4. Risk Awareness & Diversification
    const riskAwarenessScore = Math.round((knowledgeScore * 0.4) + (emotionalAwarenessScore * 0.6));
    const diversificationScore = knowledgeAnswers[4] === 2 ? 90 : 40;

    // 5. Pathway Determination
    const compositeScore = Math.round(
      (knowledgeScore * 0.4) + (emotionalAwarenessScore * 0.35) + (marketFamiliarityScore * 0.25)
    );

    let assignedPath: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'BEGINNER';
    let levelTitle = 'Level 1: Market Explorer';
    let recommendedModule = 'Track 1: Indian Market Foundations';
    let estimatedTime = '45 mins';
    let firstChallenge = 'Execute 3 simulated trades with a pre-set stop loss';

    if (compositeScore >= 80) {
      assignedPath = 'ADVANCED';
      levelTitle = 'Level 3: Strategic Practitioner';
      recommendedModule = 'Track 4: Risk Management & Historical Crashes';
      estimatedTime = '90 mins';
      firstChallenge = 'Survive the March 2020 COVID Crash replay with 0 panic-sells';
    } else if (compositeScore >= 55) {
      assignedPath = 'INTERMEDIATE';
      levelTitle = 'Level 2: Disciplined Apprentice';
      recommendedModule = 'Track 2: Demystifying Price Charts & Market Action';
      estimatedTime = '60 mins';
      firstChallenge = 'Construct a diversified portfolio across 4 sectors with no single stock > 25%';
    }

    const finalAssessment: UserAssessment = {
      experienceLevel: levelTitle,
      riskTolerance: emotionalAwarenessScore >= 70 ? 'Disciplined / Moderate' : 'Emotional / Needs Guidance',
      investmentHorizon: 'Medium (1-3 Years)',
      primaryGoal: 'Learn market mechanics & emotional mastery without financial risk',
      completedAt: new Date().toISOString().split('T')[0],
      knowledgeScore,
      totalQuestions: KNOWLEDGE_QUESTIONS.length,
      riskAwarenessScore,
      marketFamiliarityScore,
      emotionalAwarenessScore,
      diversificationScore,
      assignedPath,
      recommendedModule,
      estimatedTime,
      firstChallenge
    };

    setAssessmentResult(finalAssessment);
    saveAssessment(finalAssessment);
    setCurrentStep(5);
  };

  // Helper for SVG Radar Chart calculation
  const renderRadarChart = () => {
    if (!assessmentResult) return null;

    const values = [
      assessmentResult.knowledgeScore || 60,
      assessmentResult.riskAwarenessScore || 65,
      assessmentResult.marketFamiliarityScore || 50,
      assessmentResult.emotionalAwarenessScore || 70,
      assessmentResult.diversificationScore || 75
    ];

    const labels = [
      'Knowledge',
      'Risk Awareness',
      'Market Familiarity',
      'Emotional Discipline',
      'Diversification'
    ];

    const size = 260;
    const center = size / 2;
    const radius = 95;
    const angleStep = (Math.PI * 2) / 5;

    // Background concentric pentagon webs
    const webLevels = [0.25, 0.5, 0.75, 1.0];

    const points = values.map((val, i) => {
      const r = (val / 100) * radius;
      const angle = i * angleStep - Math.PI / 2;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="relative flex flex-col items-center">
        <svg width={size} height={size} className="overflow-visible">
          {/* Concentric rings */}
          {webLevels.map((lvl, idx) => {
            const webPoints = Array.from({ length: 5 }).map((_, i) => {
              const r = lvl * radius;
              const angle = i * angleStep - Math.PI / 2;
              const x = center + r * Math.cos(angle);
              const y = center + r * Math.sin(angle);
              return `${x},${y}`;
            }).join(' ');
            return (
              <polygon
                key={idx}
                points={webPoints}
                fill="none"
                stroke="#223142"
                strokeWidth="1"
                strokeDasharray={idx < 3 ? '3,3' : undefined}
              />
            );
          })}

          {/* Axes lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#223142"
                strokeWidth="1"
              />
            );
          })}

          {/* Skill Radar Area Polygon */}
          <polygon
            points={points}
            fill="rgba(69, 214, 181, 0.25)"
            stroke="#45D6B5"
            strokeWidth="2.5"
          />

          {/* Point markers */}
          {values.map((val, i) => {
            const r = (val / 100) * radius;
            const angle = i * angleStep - Math.PI / 2;
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4.5"
                fill="#45D6B5"
                stroke="#0B1017"
                strokeWidth="2"
              />
            );
          })}
        </svg>

        {/* Labels legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 text-[11px] font-mono w-full">
          {labels.map((lbl, idx) => (
            <div key={lbl} className="p-2 rounded bg-surface border border-border/60 text-center">
              <span className="text-text-muted block text-[10px]">{lbl}</span>
              <span className="font-bold text-primary">{values[idx]}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-text-primary selection:bg-primary/20 selection:text-primary flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header & Progress */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-4 border-b border-border/60">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-background font-bold shadow-glow">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <div>
            <span className="font-mono font-bold text-sm tracking-wider text-text-primary group-hover:text-primary transition-colors">
              MINDMARK
            </span>
            <span className="block text-[10px] text-text-muted font-mono -mt-0.5">
              Smart Skill Diagnostic
            </span>
          </div>
        </Link>

        {/* Step Indicator & Reset action */}
        <div className="flex items-center gap-4">
          <div className="text-right font-mono hidden sm:block">
            <span className="text-[10px] text-text-muted uppercase block">Phase {currentStep} of 7</span>
            <span className="text-xs font-semibold text-primary">
              {currentStep === 1 && 'Welcome'}
              {currentStep === 2 && 'Experience Mapping'}
              {currentStep === 3 && `Knowledge Test (${currentKnowledgeQ + 1}/8)`}
              {currentStep === 4 && 'Behavioral Awareness'}
              {currentStep === 5 && 'Skill Radar Results'}
              {currentStep === 6 && 'Learning Pathway'}
              {currentStep === 7 && 'Journey Ready'}
            </span>
          </div>

          <button
            onClick={handleReset}
            title="Reset Assessment"
            className="p-1.5 rounded-lg text-text-muted hover:text-warning hover:bg-surface transition-colors"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </header>

      {/* Global Stepper Bar */}
      <div className="max-w-4xl mx-auto w-full mt-3">
        <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-300"
            style={{ width: `${(currentStep / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Form Body */}
      <main className="max-w-4xl mx-auto w-full my-8 flex-1 flex flex-col justify-center">
        {/* =================================================================== */}
        {/* STEP 1 — WELCOME                                                    */}
        {/* =================================================================== */}
        {currentStep === 1 && (
          <Card variant="elevated" className="p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 border-primary/20">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-glow">
              <Compass size={32} />
            </div>

            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">
                Financial Readiness Diagnostic
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight leading-tight">
                Before you enter the market, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary">
                  let's understand where you stand.
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed pt-1">
                This is not a financial eligibility test or an exam. There are no wrong answers. It's a personal diagnostic designed to understand your instincts, identify knowledge gaps, and personalize your MINDMARK simulation journey.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-left">
              <div className="p-3.5 rounded-xl bg-surface border border-border/80">
                <span className="font-mono text-primary font-bold text-xs">01. Experience</span>
                <p className="text-[11px] text-text-muted mt-1 leading-snug">
                  Map your familiarity with Demat apps and investing instruments.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface border border-border/80">
                <span className="font-mono text-secondary font-bold text-xs">02. Knowledge</span>
                <p className="text-[11px] text-text-muted mt-1 leading-snug">
                  8 foundational questions on Dalal Street mechanics and risk.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface border border-border/80">
                <span className="font-mono text-warning font-bold text-xs">03. Psychology</span>
                <p className="text-[11px] text-text-muted mt-1 leading-snug">
                  Evaluate emotional triggers like FOMO, panicking, and revenge trading.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setCurrentStep(2)}
                icon={<ArrowRight size={18} />}
                iconPosition="right"
                className="font-bold text-sm px-8"
              >
                Begin Diagnostic (3 Mins)
              </Button>
            </div>
          </Card>
        )}

        {/* =================================================================== */}
        {/* STEP 2 — EXPERIENCE MAPPING                                         */}
        {/* =================================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            <div className="text-center space-y-1">
              <Badge variant="secondary" size="sm">STEP 2 OF 7 • EXPERIENCE MAPPING</Badge>
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                Tell us about your past market exposure
              </h2>
              <p className="text-xs text-text-secondary">
                Select the option that best reflects your real background.
              </p>
            </div>

            <div className="space-y-5">
              {EXPERIENCE_QUESTIONS.map((eq, qIdx) => (
                <Card key={eq.id} variant="default" className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-secondary">0{qIdx + 1}.</span>
                    <h3 className="font-semibold text-sm text-text-primary">{eq.question}</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {eq.options.map((opt) => {
                      const isSelected = experienceAnswers[eq.id] === opt.score;
                      return (
                        <div
                          key={opt.label}
                          onClick={() => handleSelectExperience(eq.id, opt.score)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all text-left flex flex-col justify-between ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-text-primary shadow-glow'
                              : 'bg-surface-elevated border-border hover:border-text-secondary/40 text-text-secondary'
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-xs text-text-primary block leading-snug">
                              {opt.label}
                            </span>
                            <span className="text-[10px] text-text-muted mt-1 block">
                              {opt.hint}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="mt-2 text-primary flex items-center gap-1 text-[10px] font-mono">
                              <Check size={12} /> Selected
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!isStep2Complete}
                onClick={() => setCurrentStep(3)}
                icon={<ArrowRight size={15} />}
                iconPosition="right"
              >
                Proceed to Knowledge Test
              </Button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 3 — KNOWLEDGE TEST (One question at a time with feedback)       */}
        {/* =================================================================== */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between text-xs font-mono">
              <Badge variant="primary" size="sm">
                QUESTION {currentKnowledgeQ + 1} OF {KNOWLEDGE_QUESTIONS.length}
              </Badge>
              <span className="text-text-muted">Topic: {activeKQ.topic}</span>
            </div>

            <Card variant="elevated" className="p-6 sm:p-8 space-y-6">
              <h2 className="text-lg sm:text-xl font-bold text-text-primary leading-snug">
                {activeKQ.question}
              </h2>

              {/* Options */}
              <div className="space-y-3">
                {activeKQ.options.map((optText, optIdx) => {
                  const isSelected = selectedKnowledgeOption === optIdx;
                  const isCorrect = optIdx === activeKQ.correctIndex;

                  let cardStyle = 'bg-surface border-border hover:border-text-secondary/40 text-text-secondary';
                  if (hasAnsweredCurrentQ) {
                    if (isCorrect) {
                      cardStyle = 'bg-primary/10 border-primary text-text-primary';
                    } else if (isSelected && !isCorrect) {
                      cardStyle = 'bg-danger/10 border-danger text-text-primary';
                    } else {
                      cardStyle = 'bg-surface/50 border-border/40 text-text-muted opacity-50';
                    }
                  } else if (isSelected) {
                    cardStyle = 'bg-primary/10 border-primary text-text-primary';
                  }

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectKnowledgeAnswer(optIdx)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${cardStyle}`}
                    >
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-mono ${
                        hasAnsweredCurrentQ && isCorrect
                          ? 'border-primary bg-primary text-background font-bold'
                          : hasAnsweredCurrentQ && isSelected && !isCorrect
                          ? 'border-danger bg-danger text-background font-bold'
                          : isSelected
                          ? 'border-primary text-primary'
                          : 'border-border text-text-muted'
                      }`}>
                        {hasAnsweredCurrentQ && isCorrect ? '✓' : hasAnsweredCurrentQ && isSelected && !isCorrect ? '✕' : String.fromCharCode(65 + optIdx)}
                      </div>
                      <span className="text-xs leading-relaxed font-medium">
                        {optText}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Immediate Feedback Card after selection */}
              {hasAnsweredCurrentQ && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in duration-200 ${
                  selectedKnowledgeOption === activeKQ.correctIndex
                    ? 'bg-primary/10 border-primary/30 text-text-primary'
                    : 'bg-warning/10 border-warning/30 text-text-primary'
                }`}>
                  <div className="flex items-center gap-2 font-mono font-bold">
                    {selectedKnowledgeOption === activeKQ.correctIndex ? (
                      <span className="text-primary flex items-center gap-1">
                        <CheckCircle2 size={16} /> Exactly Right!
                      </span>
                    ) : (
                      <span className="text-warning flex items-center gap-1">
                        <AlertTriangle size={16} /> Common Misconception
                      </span>
                    )}
                  </div>

                  <p className="leading-relaxed text-text-secondary text-xs">
                    {activeKQ.explanation}
                  </p>

                  <div className="p-2.5 rounded-lg bg-background/50 text-[11px] text-text-muted border border-border/40">
                    <span className="text-primary font-semibold font-mono">Learning Takeaway: </span>
                    {activeKQ.misconceptionTip}
                  </div>
                </div>
              )}

              {/* Next Question Navigation */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="md"
                  disabled={!hasAnsweredCurrentQ}
                  onClick={handleNextKnowledgeQ}
                  icon={<ArrowRight size={15} />}
                  iconPosition="right"
                >
                  {currentKnowledgeQ === KNOWLEDGE_QUESTIONS.length - 1 ? 'Go to Behavioral Scenarios' : 'Next Question'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 4 — BEHAVIORAL AWARENESS                                       */}
        {/* =================================================================== */}
        {currentStep === 4 && (
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            <div className="text-center space-y-1">
              <Badge variant="warning" size="sm">STEP 4 OF 7 • BEHAVIORAL AWARENESS</Badge>
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                How do you react under emotional market pressure?
              </h2>
              <p className="text-xs text-text-secondary">
                There are no wrong answers. We do not judge your personality; we illuminate your decision habits.
              </p>
            </div>

            <div className="space-y-5">
              {BEHAVIORAL_SCENARIOS.map((sc) => (
                <Card key={sc.id} variant="elevated" className="p-5 sm:p-6 space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-warning tracking-wider font-semibold">
                      {sc.title}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-text-primary mt-1">
                      {sc.scenario}
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {sc.options.map((opt, optIdx) => {
                      const isSelected = behavioralAnswers[sc.id] === optIdx;
                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleSelectBehavioral(sc.id, optIdx)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all text-left ${
                            isSelected
                              ? 'bg-warning/10 border-warning text-text-primary shadow-glow'
                              : 'bg-surface border-border hover:border-text-secondary/40 text-text-secondary'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-semibold text-xs text-text-primary">
                              {opt.label}
                            </span>
                            {isSelected && (
                              <Badge variant="warning" size="sm">Selected</Badge>
                            )}
                          </div>
                          {isSelected && (
                            <p className="text-[11px] text-text-muted mt-1.5 pt-1.5 border-t border-border/40 font-mono">
                              <span className="text-warning font-semibold">Trait:</span> {opt.biasType} • {opt.insight}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!isStep4Complete}
                onClick={calculateFinalResults}
                icon={<ArrowRight size={15} />}
                iconPosition="right"
              >
                Generate My Diagnostic Profile
              </Button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 5 — RESULTS & SKILL RADAR                                      */}
        {/* =================================================================== */}
        {currentStep === 5 && assessmentResult && (
          <div className="space-y-6 max-w-3xl mx-auto w-full">
            <div className="text-center space-y-1">
              <Badge variant="primary" size="sm">STEP 5 OF 7 • YOUR RESULTS</Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                Your Baseline Financial Skill Profile
              </h2>
              <p className="text-xs text-text-secondary">
                Here is your objective diagnostic breakdown across 5 foundational dimensions.
              </p>
            </div>

            <Card variant="elevated" className="p-6 sm:p-8 space-y-6 border-primary/30">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left 6 cols: Radar Chart */}
                <div className="lg:col-span-6 flex flex-col items-center">
                  <span className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
                    5-Axis Skill Radar
                  </span>
                  {renderRadarChart()}
                </div>

                {/* Right 6 cols: Dimension Explanations */}
                <div className="lg:col-span-6 space-y-3.5 text-xs">
                  <div className="p-3 rounded-xl bg-surface border border-border/70">
                    <div className="flex justify-between font-mono mb-1">
                      <span className="font-bold text-text-primary">Knowledge Score</span>
                      <span className="text-primary font-bold">{assessmentResult.knowledgeScore}%</span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      Measures your comprehension of shares, price discovery, index funds, and F&O risk.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-surface border border-border/70">
                    <div className="flex justify-between font-mono mb-1">
                      <span className="font-bold text-text-primary">Risk Awareness</span>
                      <span className="text-warning font-bold">{assessmentResult.riskAwarenessScore}%</span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      Your instinctive respect for downside capital preservation before chasing gains.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-surface border border-border/70">
                    <div className="flex justify-between font-mono mb-1">
                      <span className="font-bold text-text-primary">Emotional Discipline</span>
                      <span className="text-secondary font-bold">{assessmentResult.emotionalAwarenessScore}%</span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      Ability to resist panic-selling during drops and FOMO impulses on parabolic green spikes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50 flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentStep(6)}
                  icon={<ArrowRight size={15} />}
                  iconPosition="right"
                >
                  View Your Personalized Learning Path
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 6 — PERSONALIZED LEARNING PATH                                 */}
        {/* =================================================================== */}
        {currentStep === 6 && assessmentResult && (
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            <div className="text-center space-y-1">
              <Badge variant="secondary" size="sm">STEP 6 OF 7 • PERSONALIZED PATHWAY</Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                Recommended Pathway: {assessmentResult.assignedPath}
              </h2>
              <p className="text-xs text-text-secondary">
                Tailored according to your diagnostic responses and behavioral baseline.
              </p>
            </div>

            <Card variant="elevated" className="p-6 sm:p-8 space-y-6 border-primary/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <BookOpen size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-primary font-bold">
                    Assigned Pathway Track
                  </span>
                  <h3 className="text-xl font-bold text-text-primary mt-0.5">
                    {assessmentResult.assignedPath === 'BEGINNER' && 'Pathway 1: Foundations & Risk Preservation'}
                    {assessmentResult.assignedPath === 'INTERMEDIATE' && 'Pathway 2: Portfolio Construction & Psychology'}
                    {assessmentResult.assignedPath === 'ADVANCED' && 'Pathway 3: Crisis Scenarios & Advanced Strategy'}
                  </h3>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border/70 text-xs text-text-secondary leading-relaxed space-y-2">
                {assessmentResult.assignedPath === 'BEGINNER' && (
                  <p>
                    Start with market basics, investing vs trading, understanding risk, and building diversification habits. You will master reading candlestick charts and placing basic stop-loss orders in the virtual simulator.
                  </p>
                )}
                {assessmentResult.assignedPath === 'INTERMEDIATE' && (
                  <p>
                    Move directly into portfolio construction, multi-sector balance, fundamental analysis (P/E ratios, cash flows), and training your emotional reflexes against the FOMO trap.
                  </p>
                )}
                {assessmentResult.assignedPath === 'ADVANCED' && (
                  <p>
                    Explore historical crisis replays (March 2020 crash, 2008 Lehman collapse), portfolio drawdowns, and strategy stress-testing under extreme volatility.
                  </p>
                )}
              </div>

              {/* Crucial Disclaimer as requested */}
              <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 text-xs text-warning flex items-start gap-2.5">
                <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Important Ethical Disclaimer:</strong> This score and pathway assignment are strictly educational benchmarks to tailor your simulation experience. A high score does <em>not</em> claim or imply readiness to trade with real money on live exchanges.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(5)}>
                  Back to Scores
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentStep(7)}
                  icon={<ArrowRight size={15} />}
                  iconPosition="right"
                >
                  Confirm & Launch Learning Journey
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 7 — YOUR JOURNEY STARTS HERE (Launch Card)                     */}
        {/* =================================================================== */}
        {currentStep === 7 && assessmentResult && (
          <Card variant="elevated" className="p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 border-primary/40 shadow-glow">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary text-background flex items-center justify-center mx-auto shadow-glow">
              <Award size={32} />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                Profile Provisioned & Saved
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
                Your learning journey starts here.
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                We've credited ₹1,00,000 in virtual paper capital to your account and loaded your tailored curriculum.
              </p>
            </div>

            {/* Launch Card Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left font-mono">
              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] text-text-muted uppercase block">Current Level</span>
                <span className="font-bold text-text-primary text-xs mt-0.5 block truncate">
                  {assessmentResult.experienceLevel}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] text-text-muted uppercase block">Estimated Time</span>
                <span className="font-bold text-secondary text-xs mt-0.5 block">
                  {assessmentResult.estimatedTime}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border col-span-2">
                <span className="text-[10px] text-text-muted uppercase block">Recommended Module</span>
                <span className="font-bold text-primary text-xs mt-0.5 block truncate">
                  {assessmentResult.recommendedModule}
                </span>
              </div>
            </div>

            {/* First Challenge Banner */}
            <div className="p-4 rounded-xl bg-surface-elevated border border-primary/30 text-left flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <Target size={18} />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-primary font-bold">
                  Your First Simulator Challenge
                </span>
                <p className="font-semibold text-xs text-text-primary mt-0.5">
                  {assessmentResult.firstChallenge}
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/dashboard')}
                icon={<ArrowRight size={18} />}
                iconPosition="right"
                className="w-full sm:w-auto font-bold text-sm px-8"
              >
                Go to Main Dashboard
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/learn')}
                className="w-full sm:w-auto font-mono text-xs"
              >
                Start Recommended Module
              </Button>
            </div>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full pt-4 border-t border-border/50 text-center text-[11px] font-mono text-text-muted">
        MINDMARK Financial Simulator • Educational Diagnostic Tool • Progress saved in browser storage.
      </footer>
    </div>
  );
};
