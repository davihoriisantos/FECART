/**
 * api.js — FloodGuard AI
 * Wrapper de fetch autenticado para o backend FastAPI (Render).
 * Usado apenas para rotas que NÃO foram migradas para Supabase:
 *   /api/zones, /api/sensors, /api/alerts, /api/river-sensors, /api/dashboard
 *
 * Auth/Histórico/Locais Salvos → Supabase (supabaseClient.js)
 */

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0');

const API_BASE_URL = isLocal ? '' : 'https://fecart-1-2rff.onrender.com';
window.API_BASE_URL = API_BASE_URL;

// Redireciona transparentemente qualquer fetch relativo a /api/ para o backend no Render quando em GitHub Pages
const _origFetch = window.fetch;
window.fetch = function(resource, init) {
  if (typeof resource === 'string' && resource.startsWith('/api/') && API_BASE_URL) {
    resource = API_BASE_URL + resource;
  }
  return _origFetch.call(this, resource, init);
};

const API = {
  baseUrl: API_BASE_URL,

  /**
   * Obtém o token de autenticação a partir de:
   * 1. fg_token (sincronizado do Supabase pelo supabaseClient.js onAuthStateChange)
   * 2. floodguard_token (chave legada de compatibilidade)
   * 3. Sessão Supabase no localStorage (fallback directo do SDK)
   */
  getToken() {
    const local = localStorage.getItem('fg_token') || localStorage.getItem('floodguard_token');
    if (local) return local;

    // Fallback: lê o access_token da sessão Supabase armazenada pelo SDK
    try {
      const sbKey = Object.keys(localStorage).find(
        k => k.startsWith('sb-') && k.endsWith('-auth-token')
      );
      if (sbKey) {
        const session = JSON.parse(localStorage.getItem(sbKey));
        return session?.access_token || null;
      }
    } catch (_) {}
    return null;
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        // Preservação de dados: Não desloga o utilizador automaticamente
        return null;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Erro na requisição' }));
        throw new Error(error.detail || 'Erro na requisição');
      }

      return await response.json();
    } catch (err) {
      throw err;
    }
  },

  get(endpoint)         { return this.request(endpoint); },
  post(endpoint, data)  { return this.request(endpoint, { method: 'POST',   body: JSON.stringify(data) }); },
  put(endpoint, data)   { return this.request(endpoint, { method: 'PUT',    body: JSON.stringify(data) }); },
  patch(endpoint, data) { return this.request(endpoint, { method: 'PATCH',  body: JSON.stringify(data) }); },
  delete(endpoint)      { return this.request(endpoint, { method: 'DELETE' }); },
};
