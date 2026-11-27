import React, { useEffect, useState } from 'react';
import {
  Users,
  Swords,
  MessageSquare,
  Eye,
  GraduationCap,
  Shield,
  Bell,
  ThumbsUp,
  Trash2,
  Plus,
} from 'lucide-react';
import api from '../services/api';

export const CommunityPage: React.FC = () => {
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'squads' | 'debates' | 'crowd' | 'university' | 'feed' | 'privacy'>('squads');
  const [msg, setMsg] = useState<string | null>(null);

  // Squads
  const [squadName, setSquadName] = useState('');
  const [squadDesc, setSquadDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Debates
  const [selectedDebateId, setSelectedDebateId] = useState<string>('');
  const [debInterp, setDebInterp] = useState('');
  const [debEv, setDebEv] = useState('');
  const [debRisks, setDebRisks] = useState('');
  const [debCounter, setDebCounter] = useState('');
  const [debInv, setDebInv] = useState('');

  // Crowd Mirror
  const [crowdResult, setCrowdResult] = useState<any>(null);
  const [crowdAction, setCrowdAction] = useState('');
  const [crowdRisk, setCrowdRisk] = useState('Balanced');
  const [crowdReason, setCrowdReason] = useState('');

  // Feed
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.social.getDashboard();
      const d = res?.data ?? res;
      setDash(d);
      if (d?.debates?.length && !selectedDebateId) {
        setSelectedDebateId(d.debates[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !dash) {
    return <div className="p-8 text-sm text-slate-400">Loading MINDMARK Social Intelligence...</div>;
  }

  const priv = dash?.privacy || {};
  const activeDebate = (dash?.debates || []).find((d: any) => d.id === selectedDebateId) || (dash?.debates || [])[0];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-[#141C25] via-[#101822] to-[#0B1017] border border-border p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#45D6B5]/15 text-[#45D6B5] text-xs font-semibold">
            <Users className="w-3.5 h-3.5" /> MINDMARK SOCIAL INTELLIGENCE
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary">Community & Squads</h1>
          <p className="text-sm text-slate-300">
            {dash?.tagline || 'Think together. Challenge each other. Make smarter decisions.'}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
          <div className="p-3 rounded-xl bg-background border border-border">
            <div className="text-slate-400">Public Handle</div>
            <div className="text-[#45D6B5] font-bold">@{priv.username || 'learner'}</div>
          </div>
          <div className="p-3 rounded-xl bg-background border border-border">
            <div className="text-slate-400">My Squads</div>
            <div className="text-text-primary font-bold">{(dash?.my_squads || []).length}</div>
          </div>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-xl bg-[#45D6B5]/15 border border-[#45D6B5]/40 text-xs text-[#45D6B5]">
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { id: 'squads', label: 'Squads & Battles', icon: Swords },
          { id: 'debates', label: 'Decision Debates', icon: MessageSquare },
          { id: 'crowd', label: 'Crowd Mirror', icon: Eye },
          { id: 'university', label: 'University League', icon: GraduationCap },
          { id: 'feed', label: 'Community Feed', icon: Users },
          { id: 'privacy', label: 'Privacy & Notifications', icon: Shield },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                tab === t.id
                  ? 'bg-[#45D6B5] text-[#0B1017]'
                  : 'bg-surface text-slate-300 border border-border hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'squads' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
            <h2 className="text-sm font-bold text-text-primary uppercase">Create or Join Squad (3–5 Members)</h2>
            <input
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              placeholder="Squad name"
              className="w-full rounded-xl bg-background border border-border p-2.5 text-xs text-text-primary"
            />
            <input
              value={squadDesc}
              onChange={(e) => setSquadDesc(e.target.value)}
              placeholder="Squad focus (e.g. Risk & Fundamentals)"
              className="w-full rounded-xl bg-background border border-border p-2.5 text-xs text-text-primary"
            />
            <button
              onClick={async () => {
                if (squadName.trim().length < 3) return;
                await api.social.createSquad({ name: squadName.trim(), description: squadDesc.trim() });
                setSquadName('');
                setSquadDesc('');
                setMsg('Squad created!');
                load();
              }}
              className="w-full py-2.5 rounded-xl bg-[#45D6B5] text-[#0B1017] text-xs font-bold inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Create Squad
            </button>

            <div className="pt-3 border-t border-border flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Invite code (SQ-...)"
                className="flex-1 rounded-xl bg-background border border-border p-2 text-xs text-text-primary"
              />
              <button
                onClick={async () => {
                  try {
                    await api.social.joinSquadByCode(joinCode);
                    setJoinCode('');
                    setMsg('Joined squad!');
                    load();
                  } catch (e: any) {
                    setMsg(e?.message || 'Invalid code');
                  }
                }}
                className="px-3 py-2 rounded-xl bg-surface-elevated text-xs font-bold text-text-primary"
              >
                Join
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-text-primary uppercase">My Squads & Active Battles</h2>
            {(dash?.my_squads || []).length === 0 ? (
              <div className="p-6 rounded-2xl bg-surface border border-border text-xs text-slate-400">
                You haven't joined a squad yet. Create one or enter an invite code to collaborate with 3–5 peers.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {dash.my_squads.map((sq: any) => (
                  <div key={sq.id} className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-primary text-sm">{sq.name}</span>
                      <span className="text-[11px] font-mono text-[#45D6B5]">{sq.member_count}/5 members</span>
                    </div>
                    <p className="text-xs text-slate-400">{sq.description || 'Collaborative squad'}</p>
                    <div className="text-[11px] font-mono text-slate-300">
                      Role: {sq.my_role} • Code: <span className="text-amber-400">{sq.invite_code}</span>
                    </div>
                    <button
                      onClick={async () => {
                        await api.social.createBattle(sq.id, { title: `${sq.name} Macro Battle` });
                        setMsg('Squad battle launched (+15 XP)!');
                        load();
                      }}
                      className="w-full py-2 rounded-xl bg-surface-elevated hover:bg-[#45D6B5] hover:text-[#0B1017] text-xs font-bold text-text-primary transition"
                    >
                      Launch Squad Battle
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'debates' && activeDebate && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
            <div className="text-[11px] font-mono text-[#78A9FF]">{activeDebate.format} DEBATE</div>
            <h2 className="text-lg font-bold text-text-primary">{activeDebate.title}</h2>
            <p className="text-xs text-slate-300">{activeDebate.case_text}</p>
            <textarea value={debInterp} onChange={(e) => setDebInterp(e.target.value)} rows={2} placeholder="Your interpretation..." className="w-full rounded-xl bg-background border border-border p-2.5 text-xs text-text-primary" />
            <textarea value={debEv} onChange={(e) => setDebEv(e.target.value)} rows={2} placeholder="Supporting evidence..." className="w-full rounded-xl bg-background border border-border p-2.5 text-xs text-text-primary" />
            <textarea value={debRisks} onChange={(e) => setDebRisks(e.target.value)} rows={2} placeholder="Main risks..." className="w-full rounded-xl bg-background border border-border p-2.5 text-xs text-text-primary" />
            <textarea value={debCounter} onChange={(e) => setDebCounter(e.target.value)} rows={2} placeholder="Counterarguments..." className="w-full rounded-xl bg-background border border-border p-2.5 text-xs text-text-primary" />
            <input value={debInv} onChange={(e) => setDebInv(e.target.value)} placeholder="What would change your view?" className="w-full rounded-xl bg-background border border-border p-2.5 text-xs text-text-primary" />
            <button
              onClick={async () => {
                try {
                  await api.social.submitDebate(activeDebate.id, {
                    interpretation: debInterp,
                    evidence: debEv,
                    risks: debRisks,
                    counterarguments: debCounter,
                    invalidation_info: debInv,
                    use_ai: true,
                  });
                  setMsg('Debate argument submitted (+30 XP)!');
                  load();
                } catch (e: any) {
                  setMsg(e?.message || 'Fill all debate fields (min 10 chars)');
                }
              }}
              className="w-full py-2.5 rounded-xl bg-[#45D6B5] text-[#0B1017] text-xs font-bold"
            >
              Submit Debate Argument (+30 XP)
            </button>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-text-primary uppercase">Community Submissions ({activeDebate.submissions?.length || 0})</h2>
            {(activeDebate.submissions || []).map((s: any) => (
              <div key={s.id} className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-[#45D6B5]">@{s.username}</span>
                  <span className="font-mono text-text-primary">Rubric: {s.rubric_score}/100</span>
                </div>
                <p className="text-slate-200">{s.interpretation}</p>
                <p className="text-slate-400">Feedback ({s.ai_source}): {s.ai_feedback}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['Helpful', 'Strong evidence', 'Interesting counterargument'].map((rx) => (
                    <button
                      key={rx}
                      onClick={async () => {
                        await api.social.reactDebate(activeDebate.id, s.id, rx);
                        load();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-background border border-border text-[11px] text-slate-300"
                    >
                      {rx} ({s.reactions?.[rx] || 0})
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'crowd' && (
        <div className="grid md:grid-cols-2 gap-6">
          {(dash?.crowd_scenarios || []).map((sc: any) => (
            <div key={sc.id} className="p-5 rounded-2xl bg-surface border border-border space-y-3">
              <h3 className="text-base font-bold text-text-primary">{sc.title}</h3>
              <p className="text-xs text-slate-300">{sc.summary}</p>
              <div className="flex flex-wrap gap-2">
                {sc.options.map((opt: string) => (
                  <button
                    key={opt}
                    onClick={() => setCrowdAction(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      crowdAction === opt ? 'bg-[#45D6B5] text-[#0B1017] border-[#45D6B5]' : 'bg-background text-slate-300 border-border'
                    }`}
                  >
                    {opt.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <select
                value={crowdRisk}
                onChange={(e) => setCrowdRisk(e.target.value)}
                className="w-full rounded-xl bg-background border border-border p-2 text-xs text-text-primary"
              >
                {['Conservative', 'Balanced', 'Aggressive', 'Wait & Research'].map((rk) => (
                  <option key={rk} value={rk}>{rk}</option>
                ))}
              </select>
              <textarea
                value={crowdReason}
                onChange={(e) => setCrowdReason(e.target.value)}
                rows={2}
                placeholder="Explain your reasoning before unlocking crowd percentages..."
                className="w-full rounded-xl bg-background border border-border p-2.5 text-xs text-text-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await api.social.submitCrowdMirror(sc.id, {
                        action: crowdAction || sc.options[0],
                        risk_category: crowdRisk,
                        reasoning: crowdReason,
                        is_practice: false,
                      });
                      setCrowdResult(res?.data ?? res);
                      load();
                    } catch (e: any) {
                      setMsg(e?.message || 'Enter reasoning (min 10 chars)');
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-[#45D6B5] text-[#0B1017] text-xs font-bold"
                >
                  {sc.user_submitted ? 'Submitted' : 'Lock & Reveal Crowd'}
                </button>
                {sc.user_submitted && (
                  <button
                    onClick={async () => {
                      const res = await api.social.getCrowdResults(sc.id);
                      setCrowdResult(res?.data ?? res);
                    }}
                    className="px-3 py-2 rounded-xl bg-surface-elevated text-xs text-text-primary"
                  >
                    View Crowd
                  </button>
                )}
              </div>
            </div>
          ))}
          {crowdResult && (
            <div className="md:col-span-2 p-5 rounded-2xl bg-surface border border-[#45D6B5]/40 space-y-2 text-xs text-slate-200">
              <div className="font-bold text-[#45D6B5] uppercase">Crowd Mirror Aggregate ({crowdResult.participants_count} participants)</div>
              <p>{crowdResult.sample_notice}</p>
              {!crowdResult.insufficient_sample && crowdResult.action_percentages && (
                <pre className="p-3 rounded-xl bg-background overflow-auto">{JSON.stringify(crowdResult.action_percentages, null, 2)}</pre>
              )}
              <p className="text-slate-400">{crowdResult.educational_note}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'university' && (
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-primary uppercase">University Inter-College League</h2>
            <span className="text-[11px] font-mono text-amber-400">Affiliation: self-reported</span>
          </div>
          <div className="space-y-2">
            {(dash?.university_league?.teams || []).map((t: any) => (
              <div key={t.university_name} className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary">#{t.rank} {t.university_name}</span>
                <span className="text-slate-400">{t.members_count} members • {t.team_points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'feed' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-3 h-fit">
            <h2 className="text-sm font-bold text-text-primary uppercase">Share Learning Milestone</h2>
            <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Headline" className="w-full rounded-xl bg-background border border-border p-2.5 text-xs text-text-primary" />
            <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} rows={3} placeholder="Share a lesson takeaway, badge, or educational insight..." className="w-full rounded-xl bg-background border border-border p-2.5 text-xs text-text-primary" />
            <button
              onClick={async () => {
                try {
                  await api.social.createPost({ post_type: 'INSIGHT', title: postTitle, content: postContent });
                  setPostTitle('');
                  setPostContent('');
                  load();
                } catch (e: any) {
                  setMsg(e?.message || 'Could not post');
                }
              }}
              className="w-full py-2.5 rounded-xl bg-[#45D6B5] text-[#0B1017] text-xs font-bold"
            >
              Publish to Feed
            </button>
          </div>
          <div className="lg:col-span-2 space-y-3">
            {(dash?.feed || []).length === 0 ? (
              <div className="p-6 rounded-2xl bg-surface border border-border text-xs text-slate-400">
                No community posts yet. Share an educational milestone to start the conversation.
              </div>
            ) : (
              dash.feed.map((p: any) => (
                <div key={p.id} className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#45D6B5]">@{p.username} • {p.post_type}</span>
                    {p.is_mine && (
                      <button onClick={async () => { await api.social.deletePost(p.id); load(); }} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-sm font-bold text-text-primary">{p.title}</div>
                  <p className="text-slate-300">{p.content}</p>
                  <button
                    onClick={async () => { await api.social.reactPost(p.id, 'Helpful'); load(); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border text-slate-300"
                  >
                    <ThumbsUp className="w-3 h-3" /> Helpful ({p.reactions?.Helpful || 0})
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'privacy' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
            <h2 className="text-sm font-bold text-text-primary uppercase">Public Profile & Privacy Controls</h2>
            {[
              { key: 'show_university', label: 'Show University on Public Profile' },
              { key: 'show_squads', label: 'Show Squad Memberships' },
              { key: 'show_achievements', label: 'Show Public Achievements' },
              { key: 'show_arena_rank', label: 'Show Arena Rank & League' },
              { key: 'notify_squads', label: 'Squad Notifications' },
              { key: 'notify_challenges', label: 'Friend Challenge Notifications' },
              { key: 'notify_debates', label: 'Debate Reply Notifications' },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border text-xs text-slate-200 cursor-pointer">
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(priv[item.key])}
                  onChange={async (e) => {
                    await api.social.patchPrivacy({ [item.key]: e.target.checked });
                    load();
                  }}
                />
              </label>
            ))}
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
            <h2 className="text-sm font-bold text-text-primary uppercase flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#45D6B5]" /> Social Notifications
            </h2>
            {(dash?.notifications || []).length === 0 ? (
              <div className="text-xs text-slate-400">No notifications yet.</div>
            ) : (
              dash.notifications.map((n: any) => (
                <div key={n.id} className="p-3 rounded-xl bg-background border border-border text-xs text-slate-200">
                  {n.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
