import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Compass,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Target,
  Sparkles,
  TrendingDown,
  Award
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useSimulator } from '../context/SimulatorContext';

interface QuestionStep {
  id: number;
  question: string;
  category: string;
  options: {
    label: string;
    description: string;
    score: number;
    tag: string;
  }[];
}

const ASSESSMENT_QUESTIONS: QuestionStep[] = [
  {
    id: 1,
    category: 'Market Background',
    question: 'How much experience do you currently have with the Indian stock market?',
    options: [
      {
        label: 'Complete Beginner',
        description: 'Never bought a share. Terms like Sensex, Nifty, and Demat sound like another language.',
        score: 1,
        tag: 'Novice'
      },
      {
        label: 'Mutual Fund / SIP Investor',
        description: 'I invest in monthly mutual funds but have never picked individual company shares.',
        score: 2,
        tag: 'Passive'
      },
      {
        label: 'Casual Direct Trader',
        description: 'I have a Zerodha or Groww account and have bought a few shares based on news or tips.',
        score: 3,
        tag: 'Casual'
      },
      {
        label: 'Active Market Participant',
        description: 'I read charts, trade intraday or swing, but struggle with emotional consistency.',
        score: 4,
        tag: 'Experienced'
      }
    ]
  },
  {
    id: 2,
    category: 'Risk Awareness',
    question: 'If you invest ₹50,000 into a stock and it falls by 20% in two weeks, what is your immediate reflex?',
    options: [
      {
        label: 'Panic and check phone every 5 minutes',
        description: 'Experience intense anxiety, consider selling immediately to stop the pain.',
        score: 1,
        tag: 'High Anxiety'
      },
      {
        label: 'Immediately buy more to "average down"',
        description: 'Double down without verifying whether the company fundamentals changed.',
        score: 2,
        tag: 'Averaging Trap'
      },
      {
        label: 'Wait and pray it recovers',
        description: 'Ignore the portfolio, hoping it gets back to my buy price so I can break even.',
        score: 2,
        tag: 'Disposition Effect'
      },
      {
        label: 'Execute pre-determined stop loss rule',
        description: 'Admit the trade thesis failed, cut the loss at 5-7%, and preserve capital for better setups.',
        score: 4,
        tag: 'Disciplined Mind'
      }
    ]
  },
  {
    id: 3,
    category: 'Derivatives & F&O Knowledge',
    question: 'A friend tells you that buying Call Options can turn ₹10,000 into ₹1 Lakh by 03:30 PM today. What is the reality?',
    options: [
      {
        label: 'Sounds like a quick way to double my money!',
        description: 'I want high returns fast and will risk small sums for large payouts.',
        score: 1,
        tag: 'Gambler Mindset'
      },
      {
        label: 'Options are easy if you follow Telegram channel calls',
        description: 'Relying on tips and WhatsApp stock tip groups for buy signals.',
        score: 1,
        tag: 'External Dependency'
      },
      {
        label: 'High risk, but I don\'t really understand Theta decay',
        description: 'Aware that people lose money, but unclear about the exact mechanics.',
        score: 2,
        tag: 'Curious Learner'
      },
      {
        label: 'SEBI data shows 93% lose money; options are asymmetric risks',
        description: 'Time decay aggressively erodes option buyers; premium buyers face near-guaranteed erosion without edge.',
        score: 4,
        tag: 'Market Realist'
      }
    ]
  },
  {
    id: 4,
    category: 'Core Objective',
    question: 'What is your primary learning goal in BULLSEYE?',
    options: [
      {
        label: 'Learn fundamentals and value investing',
        description: 'Understand how to find great Indian companies to hold for 3-5 years.',
        score: 3,
        tag: 'Long-term Investor'
      },
      {
        label: 'Master technical analysis & swing setups',
        description: 'Learn chart reading, support/resistance, and risk-to-reward discipline.',
        score: 3,
        tag: 'Swing Trader'
      },
      {
        label: 'Overcome FOMO and emotional impulsive trades',
        description: 'I already know concepts, but greed and fear derail my decisions.',
        score: 4,
        tag: 'Psychology Focused'
      },
      {
        label: 'Test historic crashes without risking real money',
        description: 'Simulate crisis moments like 2020 COVID or 2008 Lehman in the time-machine.',
        score: 3,
        tag: 'Resilience Training'
      }
    ]
  }
];

export const OnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const { saveAssessment } = useSimulator();
  const navigate = useNavigate();

  const handleSelectOption = (index: number) => {
    const updated = [...selectedAnswers];
    updated[currentStep] = index;
    setSelectedAnswers(updated);
  };

  const handleNext = () => {
    if (currentStep < ASSESSMENT_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Calculate assessment result
      const totalScore = selectedAnswers.reduce((acc, ansIdx, stepIdx) => {
        return acc + ASSESSMENT_QUESTIONS[stepIdx].options[ansIdx].score;
      }, 0);

      const level = totalScore <= 6 ? 'Beginner Explorer' : totalScore <= 11 ? 'Intermediate Practitioner' : 'Disciplined Analyst';

      saveAssessment({
        experienceLevel: level,
        riskTolerance: totalScore <= 7 ? 'Conservative' : 'Moderate',
        investmentHorizon: 'Medium (1-3 Years)',
        primaryGoal: 'Learn market mechanics & emotional mastery',
        completedAt: new Date().toISOString().split('T')[0]
      });

      setIsCompleted(true);
    }
  };

  const currentQ = ASSESSMENT_QUESTIONS[currentStep];

  return (
    <div className="min-h-screen bg-background text-text-primary p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
      {/* Top Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-background font-mono font-bold">
            <Compass size={18} />
          </div>
          <div>
            <span className="font-mono font-bold text-sm tracking-wide text-text-primary">
              BULLSEYE DIAGNOSTIC
            </span>
            <span className="block text-[10px] text-text-muted">
              Personalized Trader Readiness Profile
            </span>
          </div>
        </div>

        {!isCompleted && (
          <span className="text-xs font-mono text-primary font-semibold">
            Step {currentStep + 1} of {ASSESSMENT_QUESTIONS.length}
          </span>
        )}
      </div>

      {/* Main Body Content */}
      <div className="max-w-3xl mx-auto w-full my-8">
        {!isCompleted ? (
          <div className="space-y-6">
            {/* Progress bar */}
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / ASSESSMENT_QUESTIONS.length) * 100}%` }}
              />
            </div>

            <div>
              <Badge variant="secondary" size="sm" className="mb-2">
                {currentQ.category}
              </Badge>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                {currentQ.question}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedAnswers[currentStep] === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-text-primary shadow-glow'
                        : 'bg-surface border-border hover:border-text-secondary/40 hover:bg-surface-elevated text-text-secondary'
                    }`}
                  >
                    <div className="pr-4">
                      <div className="font-semibold text-sm text-text-primary flex items-center gap-2">
                        <span>{option.label}</span>
                        {isSelected && <Badge variant="primary" size="sm">{option.tag}</Badge>}
                      </div>
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                        {option.description}
                      </p>
                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected ? 'border-primary bg-primary text-background' : 'border-border'
                    }`}>
                      {isSelected && <CheckCircle2 size={14} />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep(prev => prev - 1)}
              >
                Back
              </Button>

              <Button
                variant="primary"
                size="md"
                disabled={selectedAnswers[currentStep] === undefined}
                onClick={handleNext}
                icon={<ArrowRight size={15} />}
                iconPosition="right"
              >
                {currentStep === ASSESSMENT_QUESTIONS.length - 1 ? 'Generate My Profile' : 'Next Question'}
              </Button>
            </div>
          </div>
        ) : (
          /* Completion State */
          <Card variant="elevated" className="border-primary/30 p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-glow">
              <Award size={32} />
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-primary">Diagnostic Complete</span>
              <h2 className="text-2xl font-bold text-text-primary mt-1">
                Your Baseline Profile: Beginner Explorer
              </h2>
              <p className="text-xs text-text-secondary max-w-md mx-auto mt-2 leading-relaxed">
                We've provisioned your virtual ₹10,00,000 account and customized your recommended learning path with a focus on Risk Management and Market Foundations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-xl mx-auto">
              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] font-mono text-text-muted uppercase">Starting Capital</span>
                <div className="font-mono font-bold text-primary text-sm mt-0.5">₹10,00,000.00</div>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] font-mono text-text-muted uppercase">Curriculum Track</span>
                <div className="font-semibold text-text-primary text-xs mt-0.5">Track 1: Indian Foundations</div>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] font-mono text-text-muted uppercase">AI Guardian Mode</span>
                <div className="font-semibold text-secondary text-xs mt-0.5">Active Bias Alerts</div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/dashboard')}
                icon={<ArrowRight size={16} />}
                iconPosition="right"
              >
                Go to Simulator Dashboard
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="max-w-3xl mx-auto w-full pt-4 border-t border-border/50 text-center text-[11px] font-mono text-text-muted">
        BULLSEYE Educational Simulator • All scores are diagnostic tools for self-improvement and do not constitute credit or advisory assessments.
      </div>
    </div>
  );
};
