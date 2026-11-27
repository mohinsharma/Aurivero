/**
 * MINDMARK — API CLIENT SERVICE
 * Connects frontend React application to the FastAPI Python Backend.
 * Features automatic offline/local fallback for zero-interruption development.
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8005';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('mindmark_auth_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('mindmark_auth_token', token);
    } else {
      localStorage.removeItem('mindmark_auth_token');
    }
  }

  public getToken(): string | null {
    return this.token || localStorage.getItem('mindmark_auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: any; isFallback?: boolean }> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        return {
          success: false,
          error: errorBody
        };
      }

      const json = await response.json();
      return {
        success: true,
        data: json.data !== undefined ? json.data : json
      };
    } catch (err: any) {
      console.warn(`[ApiClient] Backend unreachable at ${url}. Operating in local simulation mode.`, err.message);
      return {
        success: false,
        error: { message: 'Backend unreachable. Operating in offline simulation mode.' },
        isFallback: true
      };
    }
  }

  // 1. Auth Endpoints
  public auth = {
    demoLogin: async () => {
      const res = await this.request<any>('/api/auth/demo-login', { method: 'POST' });
      if (res.success && res.data?.access_token) {
        this.setToken(res.data.access_token);
      }
      return res;
    },
    login: async (credentials: { email: string; password: string }) => {
      const res = await this.request<any>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (res.success && res.data?.access_token) {
        this.setToken(res.data.access_token);
      }
      return res;
    },
    register: async (payload: { email: string; full_name: string; password: string; experience_level?: string }) => {
      const res = await this.request<any>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.success && res.data?.access_token) {
        this.setToken(res.data.access_token);
      }
      return res;
    },
    getMe: () => this.request<any>('/api/auth/me'),
    logout: () => this.setToken(null)
  };

  // 2. Portfolio Endpoints
  public portfolio = {
    get: () => this.request<any>('/api/portfolio'),
    reset: () => this.request<any>('/api/portfolio/reset', { method: 'POST' })
  };

  // 3. Trade Execution Endpoints
  public trades = {
    execute: (order: {
      symbol: string;
      type: 'BUY' | 'SELL';
      quantity: number;
      order_type?: 'MARKET' | 'LIMIT';
      product_type?: 'CNC' | 'MIS_LEVERAGED' | 'OPTIONS';
      leverage_multiplier?: number;
      limit_price?: number;
      stop_loss?: number;
      target_price?: number;
      reason_tag?: string;
    }) => this.request<any>('/api/trades/execute', {
      method: 'POST',
      body: JSON.stringify(order)
    }),
    getHistory: () => this.request<any>('/api/trades/history')
  };

  // 4. Behavioral Insights Endpoints
  public insights = {
    get: () => this.request<any>('/api/insights')
  };

  // 5. Historical Replay Endpoints
  public replay = {
    getScenarios: () => this.request<any>('/api/replay/scenarios'),
    submitDecision: (decision: {
      scenario_id: string;
      checkpoint_index: number;
      action_id: string;
      reasoning?: string;
      user_cash: number;
      user_units: number;
    }) => this.request<any>('/api/replay/decision', {
      method: 'POST',
      body: JSON.stringify(decision)
    })
  };

  // 6. News Explainer Endpoints
  public news = {
    getAll: (category?: string) => this.request<any>(category ? `/api/news?category=${encodeURIComponent(category)}` : '/api/news'),
    getById: (id: string) => this.request<any>(`/api/news/${id}`)
  };

  // 7. Challenges & Quests Endpoints
  public challenges = {
    getSummary: () => this.request<any>('/api/challenges'),
    claimQuest: (questId: string) => this.request<any>('/api/challenges/claim', {
      method: 'POST',
      body: JSON.stringify({ quest_id: questId })
    })
  };

  // 8. AI Grounded Explainer Endpoints
  public ai = {
    getStatus: () => this.request<any>('/api/ai/status'),
    explainConcept: (conceptName: string, userContext?: string) => this.request<any>('/api/ai/explain-concept', {
      method: 'POST',
      body: JSON.stringify({ concept_name: conceptName, user_context: userContext })
    }),
    explainNews: (payload: {
      headline: string;
      source: string;
      published_at: string;
      sector: string;
      article_body?: string;
    }) => this.request<any>('/api/ai/explain-news', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    debriefTrade: (payload: {
      symbol: string;
      action: string;
      quantity: number;
      price: number;
      reason_tag: string;
      portfolio_weight_percent: number;
      has_stop_loss: boolean;
      is_after_loss: boolean;
    }) => this.request<any>('/api/ai/debrief-trade', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  };

  // 9. Crypto & Forex Market Intelligence Endpoints
  public marketIntelligence = {
    getCrypto: (category?: string, search?: string) => {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.append('category', category);
      if (search) params.append('search', search);
      const qs = params.toString();
      return this.request<any>(qs ? `/api/market-intelligence/crypto?${qs}` : '/api/market-intelligence/crypto');
    },
    getCryptoDetail: (symbol: string) => this.request<any>(`/api/market-intelligence/crypto/${symbol}`),
    getForex: (search?: string) => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      return this.request<any>(`/api/market-intelligence/forex${qs}`);
    },
    convertCurrency: (from_currency: string, to_currency: string, amount: number) => this.request<any>('/api/market-intelligence/convert', {
      method: 'POST',
      body: JSON.stringify({ from_currency, to_currency, amount })
    })
  };

  // 10. Hot Topics & News Endpoints
  public hotTopics = {
    getCategories: () => this.request<any>('/api/hot-topics/categories'),
    getArticles: (params: { category?: string; search?: string; trending?: boolean; breaking?: boolean; limit?: number; offset?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.category && params.category !== 'All') q.append('category', params.category);
      if (params.search) q.append('search', params.search);
      if (params.trending) q.append('trending', 'true');
      if (params.breaking) q.append('breaking', 'true');
      if (params.limit) q.append('limit', params.limit.toString());
      if (params.offset) q.append('offset', params.offset.toString());
      const qs = q.toString();
      return this.request<any>(qs ? `/api/hot-topics?${qs}` : '/api/hot-topics');
    },
    getArticleDetail: (articleId: string) => this.request<any>(`/api/hot-topics/${articleId}`),
    toggleBookmark: (articleId: string) => this.request<any>(`/api/hot-topics/${articleId}/bookmark`, {
      method: 'POST'
    })
  };

  // 11. Community Forums Endpoints
  public forums = {
    getCategories: () => this.request<any>('/api/forums/categories'),
    getThreads: (params: { category?: string; subcategory?: string; search?: string; sort_by?: string; limit?: number; offset?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.category && params.category !== 'All') q.append('category', params.category);
      if (params.subcategory && params.subcategory !== 'All') q.append('subcategory', params.subcategory);
      if (params.search) q.append('search', params.search);
      if (params.sort_by) q.append('sort_by', params.sort_by);
      if (params.limit) q.append('limit', params.limit.toString());
      if (params.offset) q.append('offset', params.offset.toString());
      const qs = q.toString();
      return this.request<any>(qs ? `/api/forums/threads?${qs}` : '/api/forums/threads');
    },
    getThreadDetail: (threadId: string) => this.request<any>(`/api/forums/threads/${threadId}`),
    createThread: (payload: { category: string; subcategory: string; title: string; content: string; tags: string }) => this.request<any>('/api/forums/threads', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    addComment: (payload: { thread_id: string; parent_id?: string; content: string }) => this.request<any>('/api/forums/comments', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    react: (payload: { thread_id?: string; comment_id?: string; reaction_type?: 'UPVOTE' | 'LIKE' }) => this.request<any>('/api/forums/react', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    toggleBookmark: (threadId: string) => this.request<any>('/api/forums/bookmark', {
      method: 'POST',
      body: JSON.stringify({ thread_id: threadId })
    }),
    report: (payload: { content_type: 'THREAD' | 'COMMENT'; content_id: string; reason: string; details?: string }) => this.request<any>('/api/forums/report', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  };

  // 12. Learn & Teach Academy Endpoints
  public academy = {
    getTracks: () => this.request<any>('/api/academy/tracks'),
    getCourses: (params: { track?: string; level?: string; search?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.track && params.track !== 'ALL') q.append('track', params.track);
      if (params.level && params.level !== 'All') q.append('level', params.level);
      if (params.search) q.append('search', params.search);
      const qs = q.toString();
      return this.request<any>(qs ? `/api/academy/courses?${qs}` : '/api/academy/courses');
    },
    getCourseDetail: (courseId: string) => this.request<any>(`/api/academy/courses/${courseId}`),
    getLessonDetail: (lessonId: string) => this.request<any>(`/api/academy/lessons/${lessonId}`),
    markProgress: (lessonId: string, courseId: string) => this.request<any>(`/api/academy/progress?lesson_id=${lessonId}&course_id=${courseId}`, {
      method: 'POST'
    }),
    getQuiz: (quizId: string) => this.request<any>(`/api/academy/quizzes/${quizId}`),
    submitQuiz: (quizId: string, answers: Record<number, number>) => this.request<any>(`/api/academy/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ quiz_id: quizId, answers })
    }),
    createCourse: (payload: { track: string; title: string; description: string; level: string; duration_minutes?: number; prerequisites?: string; thumbnail_url?: string }) => this.request<any>('/api/academy/courses', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  };

  // 13. Personalization & Watchlists Endpoints
  public personalization = {
    getHub: () => this.request<any>('/api/personalization/hub'),
    getNotifications: () => this.request<any>('/api/personalization/notifications'),
    markNotificationRead: (notifId: string) => this.request<any>(`/api/personalization/notifications/${notifId}/read`, {
      method: 'POST'
    }),
    addToWatchlist: (payload: { asset_type: 'CRYPTO' | 'FOREX' | 'STOCK'; symbol: string; name: string; target_price?: number; alert_enabled?: boolean; notes?: string }) => this.request<any>('/api/personalization/watchlists', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    removeFromWatchlist: (symbol: string) => this.request<any>(`/api/personalization/watchlists/${symbol}`, {
      method: 'DELETE'
    }),
    toggleFollowTopic: (topic: string) => this.request<any>(`/api/personalization/follow-topic?topic=${encodeURIComponent(topic)}`, {
      method: 'POST'
    })
  };

  // 14. Admin Moderation Endpoints
  public admin = {
    getStats: () => this.request<any>('/api/admin/stats'),
    getReports: (status?: string) => this.request<any>(status ? `/api/admin/reports?status=${status}` : '/api/admin/reports'),
    moderate: (payload: { content_type: 'THREAD' | 'COMMENT' | 'REPORT'; content_id: string; action: 'APPROVE' | 'DELETE' | 'LOCK' | 'PIN' | 'DISMISS'; moderator_notes?: string }) => this.request<any>('/api/admin/moderate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    getUsers: (limit?: number) => this.request<any>(limit ? `/api/admin/users?limit=${limit}` : '/api/admin/users'),
    updateUserRole: (userId: string, newRole: string) => this.request<any>(`/api/admin/users/${userId}/role?new_role=${newRole}`, {
      method: 'POST'
    })
  };
}

export const api = new ApiClient();
export default api;
