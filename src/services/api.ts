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
    getThreads: (params: {
      category?: string;
      subcategory?: string;
      intent?: string;
      region?: string;
      unanswered?: boolean;
      search?: string;
      sort_by?: string;
      limit?: number;
      offset?: number;
    } = {}) => {
      const q = new URLSearchParams();
      if (params.category && params.category !== 'All') q.append('category', params.category);
      if (params.subcategory && params.subcategory !== 'All') q.append('subcategory', params.subcategory);
      if (params.intent && params.intent !== 'All') q.append('intent', params.intent);
      if (params.region && params.region !== 'All') q.append('region', params.region);
      if (params.unanswered) q.append('unanswered', 'true');
      if (params.search) q.append('search', params.search);
      if (params.sort_by) q.append('sort_by', params.sort_by);
      if (params.limit) q.append('limit', params.limit.toString());
      if (params.offset) q.append('offset', params.offset.toString());
      const qs = q.toString();
      return this.request<any>(qs ? `/api/forums/threads?${qs}` : '/api/forums/threads');
    },
    getThreadDetail: (threadId: string) => this.request<any>(`/api/forums/threads/${threadId}`),
    precheck: (payload: { title: string; content: string; category?: string }) => this.request<any>('/api/forums/precheck', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    createThread: (payload: {
      category: string;
      subcategory: string;
      post_type?: string;
      intent_badge?: string;
      region?: string;
      is_anonymous?: boolean;
      related_course_id?: string;
      disclosure_text?: string;
      title: string;
      content: string;
      tags: string;
    }) => this.request<any>('/api/forums/threads', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    acceptAnswer: (threadId: string, commentId: string) => this.request<any>(`/api/forums/threads/${threadId}/accept-answer`, {
      method: 'POST',
      body: JSON.stringify({ comment_id: commentId })
    }),
    addComment: (payload: { thread_id: string; parent_id?: string; content: string }) => this.request<any>('/api/forums/comments', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    react: (payload: { thread_id?: string; comment_id?: string; reaction_type?: 'UPVOTE' | 'LIKE' }) => this.request<any>('/api/forums/react', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    toggleBookmark: (threadId: string) => this.request<any>(`/api/forums/bookmark?thread_id=${encodeURIComponent(threadId)}`, {
      method: 'POST'
    }),
    report: (payload: { content_type: 'THREAD' | 'COMMENT'; content_id: string; reason: string; details?: string }) => this.request<any>('/api/forums/report', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    submitAppeal: (payload: { content_type: 'THREAD' | 'COMMENT'; content_id: string; reason: string }) => this.request<any>('/api/forums/appeal', {
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
    getQuarantined: () => this.request<any>('/api/admin/quarantined'),
    getAuditLogs: (limit?: number) => this.request<any>(limit ? `/api/admin/audit-logs?limit=${limit}` : '/api/admin/audit-logs'),
    getAppeals: () => this.request<any>('/api/admin/appeals'),
    resolveAppeal: (appealId: string, status: 'APPROVED' | 'REJECTED', reviewer_notes?: string) => this.request<any>(`/api/admin/appeals/${appealId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status, reviewer_notes })
    }),
    moderate: (payload: {
      content_type: 'THREAD' | 'COMMENT' | 'REPORT';
      content_id: string;
      action: 'APPROVE' | 'DELETE' | 'LOCK' | 'PIN' | 'DISMISS' | 'QUARANTINE';
      policy_citation?: string;
      moderator_notes?: string;
    }) => this.request<any>('/api/admin/moderate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    getUsers: (limit?: number) => this.request<any>(limit ? `/api/admin/users?limit=${limit}` : '/api/admin/users'),
    updateUserRole: (userId: string, newRole: string) => this.request<any>(`/api/admin/users/${userId}/role?new_role=${newRole}`, {
      method: 'POST'
    })
  };

  // 15. Unified Multi-Asset Markets Endpoints
  public markets = {
    getTicker: () => this.request<any>('/api/markets/ticker'),
    getOverview: () => this.request<any>('/api/markets/overview'),
    search: (q: string, assetClass?: string, limit = 15) => {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (assetClass) params.append('asset_class', assetClass);
      params.append('limit', String(limit));
      return this.request<any>(`/api/markets/search?${params.toString()}`);
    },
    listInstruments: (assetClass: 'STOCK' | 'CRYPTO' | 'FOREX', params?: { q?: string; exchange?: string; limit?: number; offset?: number; with_quotes?: boolean }) => {
      const sp = new URLSearchParams();
      if (params?.q) sp.append('q', params.q);
      if (params?.exchange) sp.append('exchange', params.exchange);
      if (params?.limit !== undefined) sp.append('limit', String(params.limit));
      if (params?.offset !== undefined) sp.append('offset', String(params.offset));
      if (params?.with_quotes !== undefined) sp.append('with_quotes', String(params.with_quotes));
      const qs = sp.toString();
      return this.request<any>(qs ? `/api/markets/instruments/${assetClass}?${qs}` : `/api/markets/instruments/${assetClass}`);
    },
    getQuote: (assetClass: 'STOCK' | 'CRYPTO' | 'FOREX', symbol: string, signal?: AbortSignal) =>
      this.request<any>(`/api/markets/quote/${assetClass}/${encodeURIComponent(symbol)}`, { signal }),
    getCandles: (
      assetClass: 'STOCK' | 'CRYPTO' | 'FOREX',
      symbol: string,
      params?: { timeframe?: string; range?: string; limit?: number; before?: number },
      signal?: AbortSignal
    ) => {
      const sp = new URLSearchParams();
      if (params?.timeframe) sp.append('timeframe', params.timeframe);
      if (params?.range) sp.append('range', params.range);
      if (params?.limit) sp.append('limit', String(params.limit));
      if (params?.before) sp.append('before', String(params.before));
      const qs = sp.toString();
      return this.request<any>(
        qs ? `/api/markets/candles/${assetClass}/${encodeURIComponent(symbol)}?${qs}` : `/api/markets/candles/${assetClass}/${encodeURIComponent(symbol)}`,
        { signal }
      );
    },
    getHealth: () => this.request<any>('/api/markets/health'),
    getSession: () => this.request<any>('/api/markets/session'),
    getFundamentals: (symbol: string) =>
      this.request<any>(`/api/markets/fundamentals/${encodeURIComponent(symbol)}`),
    getRiskAnalytics: (assetClass: string, symbol: string, confidence = 0.95, lookbackDays = 252) =>
      this.request<any>(
        `/api/markets/risk/analytics/${assetClass}/${encodeURIComponent(symbol)}?confidence=${confidence}&lookback_days=${lookbackDays}`
      ),
    getMlRisk: (assetClass: string, symbol: string) =>
      this.request<any>(`/api/markets/risk/ml/${assetClass}/${encodeURIComponent(symbol)}`),
    analyzePortfolioRisk: (payload: {
      positions: Array<{
        symbol: string;
        name?: string;
        assetClass: string;
        quantity: number;
        entryPrice: number;
        currentPrice?: number;
        stopLoss?: number | null;
        sector?: string;
        currency?: string;
      }>;
      cashBalance: number;
      baseCurrency: 'INR' | 'USD';
      confidence?: number;
      lookbackDays?: number;
    }) =>
      this.request<any>('/api/markets/risk/portfolio', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getScreener: (params?: Record<string, string | number | undefined>) => {
      const sp = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '' && v !== 'ALL') sp.append(k, String(v));
        });
      }
      const qs = sp.toString();
      return this.request<any>(qs ? `/api/markets/screener?${qs}` : '/api/markets/screener');
    },
    getHeatmap: (params?: { universe?: string; timeframe?: string; sector?: string; direction?: string; sort_by?: string }) => {
      const sp = new URLSearchParams();
      if (params?.universe) sp.append('universe', params.universe);
      if (params?.timeframe) sp.append('timeframe', params.timeframe);
      if (params?.sector) sp.append('sector', params.sector);
      if (params?.direction) sp.append('direction', params.direction);
      if (params?.sort_by) sp.append('sort_by', params.sort_by);
      const qs = sp.toString();
      return this.request<any>(qs ? `/api/markets/heatmap?${qs}` : '/api/markets/heatmap');
    },
    getWsUrl: (assetClass: 'STOCK' | 'CRYPTO' | 'FOREX', symbol: string) => {
      const wsBase = API_BASE_URL.replace(/^http/, 'ws');
      return `${wsBase}/api/markets/ws/${assetClass}/${encodeURIComponent(symbol)}`;
    }
  };

  // 17. Chart Drawings, Layouts & Custom Indicators
  public charts = {
    listDrawings: (assetClass: string, symbol: string) =>
      this.request<any>(`/api/charts/drawings?asset_class=${assetClass}&symbol=${encodeURIComponent(symbol)}`),
    createDrawing: (payload: {
      asset_class: 'STOCK' | 'CRYPTO' | 'FOREX';
      symbol: string;
      tool_type: string;
      points: { time: number; price: number }[];
      style?: Record<string, any>;
      label?: string;
    }) =>
      this.request<any>('/api/charts/drawings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deleteDrawing: (id: string) =>
      this.request<any>(`/api/charts/drawings/${id}`, { method: 'DELETE' }),
    listLayouts: () => this.request<any>('/api/charts/layouts'),
    saveLayout: (payload: { name: string; layout: Record<string, any> }) =>
      this.request<any>('/api/charts/layouts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deleteLayout: (id: string) =>
      this.request<any>(`/api/charts/layouts/${id}`, { method: 'DELETE' }),
    listCustomIndicators: () => this.request<any>('/api/charts/custom-indicators'),
    createCustomIndicator: (payload: { name: string; expression: string; color?: string; pane?: 'OVERLAY' | 'SEPARATE' }) =>
      this.request<any>('/api/charts/custom-indicators', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deleteCustomIndicator: (id: string) =>
      this.request<any>(`/api/charts/custom-indicators/${id}`, { method: 'DELETE' }),
  };

  // 16. Multi-Watchlist Management Endpoints
  public watchlists = {
    list: (includeQuotes = true) => this.request<any>(`/api/watchlists?include_quotes=${includeQuotes}`),
    create: (payload: { name: string; description?: string }) => this.request<any>('/api/watchlists', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    update: (id: string, payload: { name?: string; description?: string; sort_order?: number }) => this.request<any>(`/api/watchlists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
    delete: (id: string) => this.request<any>(`/api/watchlists/${id}`, { method: 'DELETE' }),
    addItem: (watchlistId: string, payload: { asset_class: 'STOCK' | 'CRYPTO' | 'FOREX'; symbol: string; exchange?: string; name?: string; target_price?: number; alert_enabled?: boolean; notes?: string }) =>
      this.request<any>(`/api/watchlists/${watchlistId}/items`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    removeItem: (watchlistId: string, itemId: string) => this.request<any>(`/api/watchlists/${watchlistId}/items/${itemId}`, {
      method: 'DELETE'
    }),
    reorder: (watchlistId: string, itemIds: string[]) => this.request<any>(`/api/watchlists/${watchlistId}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ item_ids: itemIds })
    })
  };

  // 18. Real Financial News (Moneycontrol, ET, LiveMint, BS, RBI)
  public financialNews = {
    list: (params?: { category?: string; source?: string; q?: string; page?: number; page_size?: number }) => {
      const sp = new URLSearchParams();
      if (params?.category && params.category !== 'All') sp.append('category', params.category);
      if (params?.source && params.source !== 'All') sp.append('source', params.source);
      if (params?.q) sp.append('q', params.q);
      if (params?.page) sp.append('page', String(params.page));
      if (params?.page_size) sp.append('page_size', String(params.page_size));
      const qs = sp.toString();
      return this.request<any>(qs ? `/api/financial-news?${qs}` : '/api/financial-news');
    },
    forInstrument: (assetClass: string, symbol: string, name?: string, limit = 6) => {
      const sp = new URLSearchParams({ limit: String(limit) });
      if (name) sp.append('name', name);
      return this.request<any>(`/api/financial-news/instrument/${assetClass}/${encodeURIComponent(symbol)}?${sp.toString()}`);
    },
    toggleBookmark: (payload: {
      article_id: string;
      title: string;
      url: string;
      source: string;
      category: string;
      published_at_ist: string;
    }) =>
      this.request<any>('/api/financial-news/bookmarks', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    listBookmarks: () => this.request<any>('/api/financial-news/bookmarks'),
  };

  // 19. MINDMARK AI Buddy — Finance-Only Gemini Chatbot
  public aiBuddy = {
    getStatus: () => this.request<any>('/api/ai-buddy/status'),
    chat: (payload: {
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
      context?: {
        current_page?: string;
        learning_level?: string;
        completed_topics?: string[];
        selected_stock?: string;
        selected_stock_data?: Record<string, any>;
        replay_scenario?: string;
        replay_checkpoint?: string;
        allow_portfolio_access?: boolean;
      };
    }) =>
      this.request<any>('/api/ai-buddy/chat', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };
}

export const api = new ApiClient();
export default api;
