import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle,
  PlayCircle,
  FileText,
  Download,
  HelpCircle,
  Award,
  Clock,
  Sparkles,
  PlusCircle,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Layers,
  Coins,
  Globe,
  Share2
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const AcademyPage: React.FC = () => {
  const [tracks, setTracks] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Curriculum / Lesson Modal
  const [activeCourse, setActiveCourse] = useState<any | null>(null);
  const [activeLesson, setActiveLesson] = useState<any | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);

  // Instructor Studio Modal
  const [isInstructorModalOpen, setIsInstructorModalOpen] = useState<boolean>(false);
  const [newCourse, setNewCourse] = useState({
    track: 'BLOCKCHAIN',
    title: '',
    description: '',
    level: 'Beginner',
    duration_minutes: 60,
    prerequisites: 'Basic computer literacy'
  });
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchTracks();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [selectedTrack, selectedLevel]);

  const fetchTracks = async () => {
    const res = await api.academy.getTracks();
    if (res.success && res.data?.tracks) {
      setTracks(res.data.tracks);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    const res = await api.academy.getCourses({
      track: selectedTrack !== 'ALL' ? selectedTrack : undefined,
      level: selectedLevel !== 'All' ? selectedLevel : undefined
    });
    if (res.success && res.data?.courses) {
      setCourses(res.data.courses);
    }
    setLoading(false);
  };

  const openCourseDetail = async (courseId: string) => {
    const res = await api.academy.getCourseDetail(courseId);
    if (res.success && res.data) {
      setActiveCourse(res.data);
    }
  };

  const openLessonDetail = async (lessonId: string) => {
    const res = await api.academy.getLessonDetail(lessonId);
    if (res.success && res.data) {
      setActiveLesson(res.data);
    }
  };

  const markLessonComplete = async (lessonId: string, courseId: string) => {
    const res = await api.academy.markProgress(lessonId, courseId);
    if (res.success) {
      // Refresh course & lesson states
      if (activeLesson) {
        setActiveLesson((prev: any) => ({ ...prev, is_completed: true }));
      }
      openCourseDetail(courseId);
      fetchCourses();
      setActionSuccessMsg('Lesson completed! +75 XP and +10 Reputation awarded.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  const openQuiz = async (quizId: string) => {
    const res = await api.academy.getQuiz(quizId);
    if (res.success && res.data) {
      setActiveQuiz(res.data);
      setQuizAnswers({});
      setQuizResult(null);
    }
  };

  const handleQuizSubmit = async () => {
    if (!activeQuiz) return;
    const res = await api.academy.submitQuiz(activeQuiz.id, quizAnswers);
    if (res.success && res.data) {
      setQuizResult(res.data);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title.trim() || !newCourse.description.trim()) return;

    const res = await api.academy.createCourse(newCourse);
    if (res.success) {
      setIsInstructorModalOpen(false);
      setActionSuccessMsg('Course submitted successfully!');
      setTimeout(() => setActionSuccessMsg(null), 3500);
      fetchCourses();
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-surface-elevated to-surface border border-border/80 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold mb-3">
              <GraduationCap size={14} className="text-primary" />
              LEARN & TEACH ACADEMY
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight font-mono">
              Blockchain, Crypto & Forex Masterclasses
            </h1>
            <p className="text-text-secondary text-sm mt-1.5 max-w-2xl leading-relaxed">
              Curated, peer-reviewed educational tracks designed to build enduring financial literacy, tokenomics engineering mastery, and disciplined FX risk management.
            </p>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={() => setIsInstructorModalOpen(true)}
            className="font-mono text-xs flex-shrink-0"
          >
            <PlusCircle size={15} className="mr-2 text-secondary" />
            Instructor Studio
          </Button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 3 Main Tracks Banner Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tracks.map((track) => {
          const isSelected = selectedTrack === track.id;
          return (
            <Card
              key={track.id}
              variant="interactive"
              onClick={() => setSelectedTrack(isSelected ? 'ALL' : track.id)}
              className={`p-6 cursor-pointer border transition-all ${
                isSelected
                  ? 'border-primary bg-surface-elevated shadow-glow'
                  : 'border-border/70 bg-surface/80 hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-surface-elevated border border-border text-primary">
                  {track.id === 'BLOCKCHAIN' && <Layers size={22} />}
                  {track.id === 'CRYPTO' && <Coins size={22} />}
                  {track.id === 'FOREX' && <Globe size={22} />}
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary border border-border">
                  {track.courses_count || 0} Courses
                </span>
              </div>

              <h3 className="text-base font-bold text-text-primary font-mono">{track.title}</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{track.tagline}</p>

              <div className="mt-4 pt-3 border-t border-border/40 space-y-1">
                {track.topics?.slice(0, 3).map((topic: string) => (
                  <div key={topic} className="text-[11px] font-mono text-text-secondary flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    <span>{topic}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2">
          {['ALL', 'BLOCKCHAIN', 'CRYPTO', 'FOREX'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTrack(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                selectedTrack === t
                  ? 'bg-primary text-background'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border/50'
              }`}
            >
              {t === 'ALL' ? 'All Academy Tracks' : t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-text-muted">Difficulty:</span>
          {['All', 'Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                selectedLevel === lvl
                  ? 'bg-surface-elevated text-text-primary border border-primary/40 font-bold'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-surface/50 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface border border-border">
          <GraduationCap size={36} className="mx-auto text-text-muted mb-3" />
          <h3 className="text-base font-bold text-text-primary">No courses in this category yet</h3>
          <p className="text-text-muted text-xs mt-1">Try another filter or create your own instructor course!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card
              key={course.id}
              variant="interactive"
              onClick={() => openCourseDetail(course.id)}
              className="flex flex-col justify-between cursor-pointer border-border/70 hover:border-primary/40 bg-surface/85 overflow-hidden p-0 group"
            >
              {course.thumbnail_url && (
                <div className="h-36 overflow-hidden relative">
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-background/80 backdrop-blur-md text-[10px] font-mono font-bold text-primary border border-border/50">
                    {course.track}
                  </div>
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-background/80 backdrop-blur-md text-[10px] font-mono text-text-secondary border border-border/50">
                    {course.level}
                  </div>
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-text-muted text-xs mt-2 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {course.duration_minutes} min
                    </span>
                    <span>{course.lessons_count} Lessons</span>
                    <span className="text-warning font-semibold">★ {course.rating.toFixed(2)}</span>
                  </div>

                  {/* Progress Bar if user has enrolled/progress */}
                  {course.progress_percent > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-text-muted">
                        <span>Progress</span>
                        <span className="text-primary font-bold">{course.progress_percent}%</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500"
                          style={{ width: `${course.progress_percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-primary font-bold">
                    <span>{course.progress_percent === 100 ? 'Completed' : 'View Syllabus'}</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Course Detail Syllabus Modal */}
      {activeCourse && (
        <Modal
          isOpen={!!activeCourse}
          onClose={() => setActiveCourse(null)}
          title={activeCourse.title}
          description={`Instructor: ${activeCourse.instructor_name} • Track: ${activeCourse.track} • Level: ${activeCourse.level}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            <p className="text-xs text-text-secondary leading-relaxed">
              {activeCourse.description}
            </p>

            {/* Syllabus Lessons List */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <BookOpen size={14} className="text-primary" />
                Curriculum Lessons ({activeCourse.lessons?.length || 0})
              </h4>

              {activeCourse.lessons?.map((lesson: any, idx: number) => (
                <div
                  key={lesson.id}
                  onClick={() => openLessonDetail(lesson.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    lesson.is_completed
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-surface-elevated/70 border-border/70 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0 mt-0.5 ${
                        lesson.is_completed
                          ? 'bg-primary text-background font-bold'
                          : 'bg-surface border border-border text-text-muted'
                      }`}
                    >
                      {lesson.is_completed ? '✓' : idx + 1}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-text-primary">{lesson.title}</h5>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{lesson.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono flex-shrink-0">
                    <span className="text-text-muted flex items-center gap-1">
                      <Clock size={11} /> {lesson.duration_minutes}m
                    </span>
                    <Button variant="ghost" size="sm" className="text-xs font-mono text-primary p-0">
                      Open →
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quiz Section if exists */}
            {activeCourse.quiz && (
              <div className="p-4 rounded-xl bg-surface border border-secondary/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-text-primary font-mono">
                    <HelpCircle size={14} className="text-secondary" />
                    <span>{activeCourse.quiz.title}</span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Passing score: {activeCourse.quiz.passing_score}%. Test your conceptual retention.
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openQuiz(activeCourse.quiz.id)}
                  className="font-mono text-xs"
                >
                  {activeCourse.quiz.user_passed ? 'Retake Quiz' : 'Start Quiz'}
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Lesson Reader & Markdown Content Modal */}
      {activeLesson && (
        <Modal
          isOpen={!!activeLesson}
          onClose={() => setActiveLesson(null)}
          title={activeLesson.title}
          description={`${activeLesson.course_track} Academy • ${activeLesson.duration_minutes} min read`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-surface-elevated border border-border text-xs font-mono text-text-secondary leading-relaxed">
              <strong>Objective:</strong> {activeLesson.description}
            </div>

            {/* Lesson Body */}
            <div className="text-sm text-text-secondary leading-relaxed space-y-4 whitespace-pre-line bg-surface p-6 rounded-2xl border border-border/60">
              {activeLesson.content_markdown}
            </div>

            {/* Downloadable Resources if present */}
            {activeLesson.resource_url && (
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-text-primary">
                  <Download size={14} className="text-primary" />
                  <span>Download Supplemental Architecture Diagrams (PDF)</span>
                </div>
                <a
                  href={activeLesson.resource_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-primary hover:underline"
                >
                  Download Resource
                </a>
              </div>
            )}

            {/* Footer with Complete Button */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveLesson(null)}
                className="text-xs font-mono"
              >
                Close Lesson
              </Button>

              <Button
                variant={activeLesson.is_completed ? 'outline' : 'primary'}
                size="sm"
                onClick={() => markLessonComplete(activeLesson.id, activeLesson.course_id)}
                className="text-xs font-mono"
              >
                {activeLesson.is_completed ? (
                  <>
                    <CheckCircle size={14} className="mr-1.5 text-primary" />
                    Completed (Review Again)
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="mr-1.5" />
                    Mark Lesson as Completed (+75 XP)
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Interactive Quiz Engine Modal */}
      {activeQuiz && (
        <Modal
          isOpen={!!activeQuiz}
          onClose={() => setActiveQuiz(null)}
          title={activeQuiz.title}
          description={`Pass mark: ${activeQuiz.passing_score}%. Answer all questions carefully.`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {!quizResult ? (
              <div className="space-y-6">
                {activeQuiz.questions?.map((q: any, qIdx: number) => (
                  <div key={q.id} className="p-4 rounded-xl bg-surface border border-border/80 space-y-3">
                    <h5 className="text-xs font-bold text-text-primary font-mono">
                      Question {qIdx + 1}: {q.question}
                    </h5>

                    <div className="space-y-2">
                      {q.options?.map((opt: string, optIdx: number) => {
                        const isSelected = quizAnswers[q.id] === optIdx;
                        return (
                          <div
                            key={optIdx}
                            onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-primary/15 border-primary text-text-primary font-semibold'
                                : 'bg-surface-elevated/70 border-border/60 text-text-secondary hover:text-text-primary hover:border-border'
                            }`}
                          >
                            <span>{opt}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-primary bg-primary text-background' : 'border-border'
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-background" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => setActiveQuiz(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleQuizSubmit}
                    disabled={Object.keys(quizAnswers).length < (activeQuiz.questions?.length || 1)}
                  >
                    Submit Answers for Grading
                  </Button>
                </div>
              </div>
            ) : (
              /* Quiz Score Result */
              <div className="space-y-6">
                <div
                  className={`p-6 rounded-2xl border text-center ${
                    quizResult.passed
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-danger/10 border-danger/30 text-danger'
                  }`}
                >
                  <div className="text-3xl font-mono font-extrabold mb-1">{quizResult.score}%</div>
                  <div className="text-sm font-bold">
                    {quizResult.passed ? '🎉 Congratulations! You Passed!' : 'Need to review concepts and retry.'}
                  </div>
                  <p className="text-xs text-text-muted mt-1 font-mono">
                    You got {quizResult.correct_count} of {quizResult.total_questions} questions correct. +{quizResult.awarded_xp} XP added!
                  </p>
                </div>

                {/* Explanations */}
                <div className="space-y-3">
                  <h5 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">
                    Detailed Explanations & Pedagogical Insights
                  </h5>
                  {quizResult.feedback?.map((f: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs ${
                        f.is_correct ? 'bg-surface border-primary/30' : 'bg-surface border-danger/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold mb-1">
                        {f.is_correct ? (
                          <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
                        ) : (
                          <XCircle size={14} className="text-danger flex-shrink-0" />
                        )}
                        <span className="text-text-primary">{f.question}</span>
                      </div>
                      <p className="text-text-muted mt-1 text-[11px] leading-relaxed">
                        <strong>Insight:</strong> {f.explanation}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => setQuizResult(null)}>
                    Retry Quiz
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setActiveQuiz(null)}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Instructor Course Authoring Modal */}
      <Modal
        isOpen={isInstructorModalOpen}
        onClose={() => setIsInstructorModalOpen(false)}
        title="Instructor Studio — Author Educational Course"
        description="Contribute verified curriculum to the MINDMARK community."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCourse} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-text-muted mb-1">Academy Track</label>
              <select
                value={newCourse.track}
                onChange={(e) => setNewCourse((prev) => ({ ...prev, track: e.target.value }))}
                className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
              >
                <option value="BLOCKCHAIN">Blockchain Academy</option>
                <option value="CRYPTO">Crypto Academy</option>
                <option value="FOREX">Forex Academy</option>
              </select>
            </div>

            <div>
              <label className="block text-text-muted mb-1">Target Difficulty</label>
              <select
                value={newCourse.level}
                onChange={(e) => setNewCourse((prev) => ({ ...prev, level: e.target.value }))}
                className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-muted mb-1">Course Title</label>
            <input
              type="text"
              required
              placeholder="e.g. EVM Memory Layout & Gas Optimization Patterns"
              value={newCourse.title}
              onChange={(e) => setNewCourse((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
            />
          </div>

          <div>
            <label className="block text-text-muted mb-1">Curriculum Summary</label>
            <textarea
              required
              rows={4}
              placeholder="Explain the learning outcomes, prerequisites, and practical applications..."
              value={newCourse.description}
              onChange={(e) => setNewCourse((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsInstructorModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Submit Course for Approval
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
