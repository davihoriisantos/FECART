const API_BASE_URL = 'https://fecart-1-2rff.onrender.com';
window.API_BASE_URL = API_BASE_URL;

// Redireciona transparentemente qualquer fetch relativo a /api/ para o backend no Render
const _origFetch = window.fetch;
window.fetch = function(resource, init) {
  if (typeof resource === 'string' && resource.startsWith('/api/')) {
    resource = API_BASE_URL + resource;
  }
  return _origFetch.call(this, resource, init);
};

const API = {
  baseUrl: API_BASE_URL,
  
  getToken() { return localStorage.getItem('fg_token') || localStorage.getItem('floodguard_token'); },
  
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 401) {
        // Preservação de dados: Não desloga o usuário automaticamente
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
  
  get(endpoint) { return this.request(endpoint); },
  post(endpoint, data) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }); },
  put(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }); },
  patch(endpoint, data) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }); },
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); },
};
