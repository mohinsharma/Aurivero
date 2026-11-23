import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Play,
  Award,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Compass,
  TrendingUp,
  FileText,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { COURSE_MODULES } from '../data/mockData';
import { CourseModule, CourseLesson } from '../types';

export const LearnPage: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<CourseModule>(COURSE_MODULES[0]);
  const [activeLessonModal, setActiveLessonModal] = useState<CourseLesson | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const handleOpenLesson = (lesson: CourseLesson) => {
    setActiveLessonModal(lesson);
    setQuizAnswer(null);
    setQuizSubmitted(false);
  };

  const getTrackIcon = (trackId: string) => {
    switch (trackId) {
      case 'foundations': return <Compass size={20} className="text-primary" />;
      case 'reading-charts': return <TrendingUp size={20} className="text-secondary" />;
      case 'fundamental-analysis': return <FileText size={20} className="text-warning" />;
      case 'risk-management': return <Shield size={20} className="text-primary" />;
      case 'derivatives-warning': return <AlertTriangle size={20} className="text-danger" />;
      default: return <BookOpen size={20} className="text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
              Financial Literacy Curriculum
            </span>
            <Badge variant="secondary" size="sm">Dalal Street Edition</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            Structured Market Education for Indian Beginners
          </h1>
          <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Move step-by-step from understanding how exchanges and Demat accounts operate, to valuation formulas, risk controls, and avoiding the F&O derivatives trap.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-surface-elevated border border-border text-center">
            <div className="text-lg font-bold font-mono text-primary">5 Tracks</div>
            <div className="text-[10px] text-text-muted">Comprehensive</div>
          </div>
          <div className="p-3 rounded-xl bg-surface-elevated border border-border text-center">
            <div className="text-lg font-bold font-mono text-secondary">20 Modules</div>
            <div className="text-[10px] text-text-muted">Interactive</div>
          </div>
        </div>
      </div>

      {/* Main Track Selection & Lesson Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Track List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-text-muted px-1">
            Learning Pathways
          </div>

          {COURSE_MODULES.map((module) => {
            const isSelected = selectedModule.id === module.id;
            return (
              <div
                key={module.id}
                onClick={() => setSelectedModule(module)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-surface-elevated border-primary/50 shadow-glow'
                    : 'bg-surface border-border hover:border-text-secondary/40 hover:bg-surface-elevated/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    {getTrackIcon(module.trackId)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                        {module.level}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                        <Clock size={11} /> {module.duration}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs text-text-primary mt-1.5">
                      {module.trackTitle}
                    </h3>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/40">
                  <div className="flex justify-between text-[10px] font-mono text-text-muted mb-1">
                    <span>Progress</span>
                    <span className={module.progress === 100 ? 'text-primary font-semibold' : ''}>
                      {module.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        module.progress === 100 ? 'bg-primary' : 'bg-secondary'
                      }`}
                      style={{ width: `${module.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Active Track Detail & Lesson Items (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card variant="elevated" className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/60">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-primary">
                  {selectedModule.level} Pathway
                </span>
                <h2 className="text-lg font-bold text-text-primary mt-0.5">
                  {selectedModule.trackTitle}
                </h2>
              </div>
              <Badge variant="primary" size="sm">
                {selectedModule.lessons.length} Lessons • {selectedModule.duration}
              </Badge>
            </div>

            <p className="text-xs text-text-secondary mt-3 leading-relaxed">
              {selectedModule.description}
            </p>

            <div className="mt-4 p-3 rounded-xl bg-surface border border-primary/20 text-xs">
              <span className="font-semibold text-primary font-mono flex items-center gap-1.5">
                <Sparkles size={13} /> Golden Market Axiom:
              </span>
              <p className="text-text-primary mt-1 italic">
                "{selectedModule.keyTakeaway}"
              </p>
            </div>

            {/* Lesson Cards */}
            <div className="mt-6 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
                Curriculum Lessons
              </div>

              {selectedModule.lessons.map((lesson, idx) => (
                <div
                  key={lesson.id}
                  onClick={() => handleOpenLesson(lesson)}
                  className="p-3.5 rounded-xl bg-surface border border-border/70 hover:border-primary/40 hover:bg-surface-elevated transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                      lesson.completed
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-background text-text-muted border border-border'
                    }`}>
                      {lesson.completed ? <CheckCircle2 size={15} /> : idx + 1}
                    </div>

                    <div>
                      <h4 className="font-semibold text-xs text-text-primary group-hover:text-primary transition-colors">
                        {lesson.title}
                      </h4>
                      <p className="text-[11px] text-text-muted truncate max-w-sm sm:max-w-md">
                        {lesson.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-text-muted hidden sm:inline">
                      {lesson.duration}
                    </span>
                    <Button
                      variant={lesson.completed ? 'ghost' : 'outline'}
                      size="sm"
                      className="text-[11px]"
                    >
                      {lesson.completed ? 'Review' : 'Start'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Lesson Reader & Interactive Checkpoint Modal */}
      {activeLessonModal && (
        <Modal
          isOpen={true}
          onClose={() => setActiveLessonModal(null)}
          title={activeLessonModal.title}
          description={`Interactive Learning Module • ${activeLessonModal.duration}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface border border-border text-xs leading-relaxed text-text-secondary space-y-2">
              <p>
                In the Indian equity ecosystem, every trade you execute passes through regulated channels governed by SEBI. When you invest in companies like Reliance Industries or TCS, your ownership is registered with CDSL or NSDL depositories in your Demat account.
              </p>
              <p>
                Trading is not about outsmarting the market in a single afternoon. Professional portfolio managers survive decades by understanding that position sizing and preserving cash during bear markets creates mathematical advantages.
              </p>
            </div>

            {/* Checkpoint Question */}
            <div className="p-4 rounded-xl bg-surface border border-primary/20 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-primary font-semibold flex items-center gap-1.5">
                  <Award size={14} /> Quick Understanding Checkpoint
                </span>
                <span className="text-text-muted">+50 XP</span>
              </div>

              <p className="text-xs font-semibold text-text-primary">
                Why does SEBI mandate T+1 settlement in Indian financial markets?
              </p>

              <div className="space-y-2 text-xs">
                {[
                  'To reduce counterparty risk and ensure shares or funds settle within 24 hours of trade execution.',
                  'To force retail investors to day-trade without holding overnight positions.',
                  'To increase brokerage fees collected by banks and clearing members.'
                ].map((opt, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (!quizSubmitted) setQuizAnswer(idx);
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      quizAnswer === idx
                        ? 'bg-primary/10 border-primary text-text-primary'
                        : 'bg-surface-elevated border-border text-text-secondary hover:border-text-secondary/40'
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>

              {quizSubmitted && (
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-mono">
                  ✓ Correct! India transitioned to T+1 settlement to give retail and institutional investors rapid access to their capital and minimize clearing defaults.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveLessonModal(null)}>
                Close
              </Button>
              {!quizSubmitted ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={quizAnswer === null}
                  onClick={() => setQuizSubmitted(true)}
                >
                  Verify Answer
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveLessonModal(null)}
                >
                  Complete Lesson
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
