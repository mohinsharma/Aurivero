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
}

export const api = new ApiClient();
export default api;
