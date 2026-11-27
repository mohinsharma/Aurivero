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
      case 'foundations': return <Compass size={20} className="text-[#2962FF]" />;
      case 'reading-charts': return <TrendingUp size={20} className="text-[#089981]" />;
      case 'fundamental-analysis': return <FileText size={20} className="text-amber-600" />;
      case 'risk-management': return <Shield size={20} className="text-[#2962FF]" />;
      case 'derivatives-warning': return <AlertTriangle size={20} className="text-[#F23645]" />;
      default: return <BookOpen size={20} className="text-[#2962FF]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-[#2962FF]">
              Financial Literacy Curriculum
            </span>
            <Badge variant="primary" size="sm">Dalal Street Edition</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#131722] mt-1">
            Structured Market Education for Indian Beginners
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Move step-by-step from understanding how exchanges and Demat accounts operate, to valuation formulas, risk controls, and avoiding the F&O derivatives trap.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] text-center">
            <div className="text-lg font-bold text-[#2962FF] tabular-nums">5 Tracks</div>
            <div className="text-[11px] text-[#64748B]">Comprehensive</div>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] text-center">
            <div className="text-lg font-bold text-[#131722] tabular-nums">20 Modules</div>
            <div className="text-[11px] text-[#64748B]">Interactive</div>
          </div>
        </div>
      </div>

      {/* Main Track Selection & Lesson Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Track List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B] px-1">
            Learning Pathways
          </div>

          {COURSE_MODULES.map((module) => {
            const isSelected = selectedModule.id === module.id;
            return (
              <div
                key={module.id}
                onClick={() => setSelectedModule(module)}
                className={`p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between shadow-sm ${
                  isSelected
                    ? 'bg-[#2962FF]/[0.05] border-[#2962FF]/50'
                    : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#F8FAFC]">
                    {getTrackIcon(module.trackId)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B]">
                        {module.level}
                      </span>
                      <span className="text-[11px] text-[#64748B] flex items-center gap-1 tabular-nums">
                        <Clock size={11} /> {module.duration}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs text-[#131722] mt-2">
                      {module.trackTitle}
                    </h3>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-[#E2E8F0]">
                  <div className="flex justify-between text-[11px] text-[#64748B] mb-1.5 tabular-nums">
                    <span>Progress</span>
                    <span className={module.progress === 100 ? 'text-[#089981] font-semibold' : 'font-semibold text-[#131722]'}>
                      {module.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        module.progress === 100 ? 'bg-[#089981]' : 'bg-[#2962FF]'
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
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E2E8F0]">
              <div>
                <span className="text-xs font-semibold text-[#2962FF]">
                  {selectedModule.level} Pathway
                </span>
                <h2 className="text-lg font-bold text-[#131722] mt-0.5">
                  {selectedModule.trackTitle}
                </h2>
              </div>
              <Badge variant="primary" size="sm">
                {selectedModule.lessons.length} Lessons • {selectedModule.duration}
              </Badge>
            </div>

            <p className="text-xs text-[#64748B] mt-3 leading-relaxed">
              {selectedModule.description}
            </p>

            <div className="mt-4 p-4 rounded-xl bg-[#F8FAFC] text-xs">
              <span className="font-semibold text-[#2962FF] flex items-center gap-1.5">
                <Sparkles size={13} /> Golden Market Axiom:
              </span>
              <p className="text-[#131722] mt-1 italic">
                "{selectedModule.keyTakeaway}"
              </p>
            </div>

            {/* Lesson Cards */}
            <div className="mt-6 space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Curriculum Lessons
              </div>

              {selectedModule.lessons.map((lesson, idx) => (
                <div
                  key={lesson.id}
                  onClick={() => handleOpenLesson(lesson)}
                  className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2962FF]/40 hover:bg-white transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums ${
                      lesson.completed
                        ? 'bg-[#089981]/10 text-[#089981]'
                        : 'bg-white text-[#64748B] border border-[#E2E8F0]'
                    }`}>
                      {lesson.completed ? <CheckCircle2 size={16} /> : idx + 1}
                    </div>

                    <div>
                      <h4 className="font-semibold text-xs text-[#131722] group-hover:text-[#2962FF] transition-colors">
                        {lesson.title}
                      </h4>
                      <p className="text-[11px] text-[#64748B] truncate max-w-sm sm:max-w-md mt-0.5">
                        {lesson.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#64748B] hidden sm:inline tabular-nums">
                      {lesson.duration}
                    </span>
                    <Button
                      variant={lesson.completed ? 'ghost' : 'outline'}
                      size="sm"
                      className="text-xs"
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
            <div className="p-4 rounded-xl bg-[#F8FAFC] text-xs leading-relaxed text-[#64748B] space-y-2">
              <p>
                In the Indian equity ecosystem, every trade you execute passes through regulated channels governed by SEBI. When you invest in companies like Reliance Industries or TCS, your ownership is registered with CDSL or NSDL depositories in your Demat account.
              </p>
              <p>
                Trading is not about outsmarting the market in a single afternoon. Professional portfolio managers survive decades by understanding that position sizing and preserving cash during bear markets creates mathematical advantages.
              </p>
            </div>

            {/* Checkpoint Question */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#2962FF] font-semibold flex items-center gap-1.5">
                  <Award size={14} /> Quick Understanding Checkpoint
                </span>
                <span className="text-[#64748B] font-medium tabular-nums">+50 XP</span>
              </div>

              <p className="text-xs font-semibold text-[#131722]">
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
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      quizAnswer === idx
                        ? 'bg-[#2962FF]/10 border-[#2962FF] text-[#131722] font-medium'
                        : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>

              {quizSubmitted && (
                <div className="p-3 rounded-lg bg-[#089981]/10 text-xs text-[#089981] font-medium">
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
