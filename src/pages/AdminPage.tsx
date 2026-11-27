import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  MessageSquare,
  BookOpen,
  Flag,
  CheckCircle,
  XCircle,
  Lock,
  Pin,
  Trash2,
  Award,
  Sparkles,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

export const AdminPage: React.FC = () => {
  const [stats, setStats] = useState<any | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'moderation'>('reports');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    const [statsRes, reportsRes, usersRes] = await Promise.all([
      api.admin.getStats(),
      api.admin.getReports('ALL'),
      api.admin.getUsers(20)
    ]);

    if (statsRes.success) setStats(statsRes.data);
    if (reportsRes.success) setReports(reportsRes.data?.reports || []);
    if (usersRes.success) setUsersList(usersRes.data?.users || []);
    setLoading(false);
  };

  const handleModerate = async (
    contentType: 'THREAD' | 'COMMENT' | 'REPORT',
    contentId: string,
    action: 'APPROVE' | 'DELETE' | 'LOCK' | 'PIN' | 'DISMISS'
  ) => {
    const res = await api.admin.moderate({
      content_type: contentType,
      content_id: contentId,
      action
    });
    if (res.success) {
      setActionSuccessMsg(`Action '${action}' successfully executed on ${contentId}`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
      fetchAdminData();
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const res = await api.admin.updateUserRole(userId, newRole);
    if (res.success) {
      setActionSuccessMsg(`User role updated to ${newRole}`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
      fetchAdminData();
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-surface-elevated to-surface border border-danger/30 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-danger/10 border border-danger/25 text-danger text-xs font-mono font-semibold mb-3">
              <ShieldAlert size={14} className="text-danger" />
              RESTRICTED ADMINISTRATIVE CONSOLE
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight font-mono">
              Platform Moderation & Ecosystem Governance
            </h1>
            <p className="text-text-secondary text-sm mt-1.5 max-w-2xl leading-relaxed">
              Maintain regulatory safety, inspect flagged community discussions, approve instructor academy submissions, and manage user trust tiers.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-primary font-bold flex items-center gap-2">
            <ShieldCheck size={16} />
            <span>SEBI & Web3 Verified</span>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-mono flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-surface border-border">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Total Members</span>
          <div className="text-xl font-bold font-mono text-text-primary mt-1">{stats?.total_users || 1}</div>
          <span className="text-[11px] text-text-muted">Registered accounts</span>
        </Card>

        <Card className="p-4 bg-surface border-border">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Forum Discussions</span>
          <div className="text-xl font-bold font-mono text-text-primary mt-1">{stats?.total_threads || 4}</div>
          <span className="text-[11px] text-secondary">{stats?.total_comments || 3} comments published</span>
        </Card>

        <Card className="p-4 bg-surface border-border">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Pending Reports</span>
          <div className="text-xl font-bold font-mono text-warning mt-1">{stats?.pending_reports || 0}</div>
          <span className="text-[11px] text-text-muted">Flagged by community</span>
        </Card>

        <Card className="p-4 bg-surface border-border">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Verified News</span>
          <div className="text-xl font-bold font-mono text-primary mt-1">{stats?.total_articles || 6}</div>
          <span className="text-[11px] text-text-muted">Crypto & Forex articles</span>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'bg-danger text-background shadow-md'
              : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border/50'
          }`}
        >
          <Flag size={14} />
          Flagged Reports ({reports.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-primary text-background font-bold shadow-md'
              : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border/50'
          }`}
        >
          <Users size={14} />
          User Permissions & Trust Ranks
        </button>
      </div>

      {/* TAB 1: REPORTS QUEUE */}
      {activeTab === 'reports' && (
        <Card className="p-6 bg-surface border-border space-y-4">
          <h3 className="text-sm font-bold text-text-primary font-mono">Community Moderation Queue</h3>

          {reports.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-text-muted">
              🎉 No pending reports! The community is adhering to disciplined educational guidelines.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep.id} className="p-4 rounded-xl bg-surface-elevated border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-danger/15 text-danger font-bold">
                        {rep.content_type} REPORT
                      </span>
                      <span className="text-text-muted">Reason: <strong className="text-text-primary">{rep.reason}</strong></span>
                      <span className="text-[10px] text-text-muted">({new Date(rep.created_at).toLocaleDateString()})</span>
                    </div>
                    {rep.details && <p className="text-xs text-text-secondary">{rep.details}</p>}
                    <div className="text-[11px] font-mono text-text-muted">Target ID: {rep.content_id}</div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleModerate('REPORT', rep.id, 'DISMISS')}
                      className="text-xs font-mono"
                    >
                      Dismiss
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleModerate(rep.content_type, rep.content_id, 'DELETE')}
                      className="text-xs font-mono"
                    >
                      Delete Content
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: USERS & PERMISSIONS */}
      {activeTab === 'users' && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-surface-elevated/70 text-text-muted border-b border-border text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Reputation</th>
                <th className="py-3 px-4">Learning XP</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4 text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-surface-elevated/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-text-primary">{u.full_name}</td>
                  <td className="py-3.5 px-4 text-text-muted">{u.email}</td>
                  <td className="py-3.5 px-4 text-warning font-bold">★ {u.reputation_points}</td>
                  <td className="py-3.5 px-4 text-primary font-bold">{u.total_learning_xp} XP</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border text-[10px] text-text-primary font-bold">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="p-1.5 bg-surface-elevated border border-border rounded-lg text-[11px] text-text-primary font-mono focus:outline-none"
                    >
                      <option value="USER">USER</option>
                      <option value="INSTRUCTOR">INSTRUCTOR</option>
                      <option value="MODERATOR">MODERATOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
