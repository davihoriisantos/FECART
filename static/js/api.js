const API = {
  baseUrl: '',
  
  getToken() { return localStorage.getItem('floodguard_token'); },
  
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
      
      if (response.status === 401) {
        localStorage.removeItem('floodguard_token');
        // Sistema aberto: sem redirecionamento para login
        return;
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
  patch(endpoint, data) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }); },
};
