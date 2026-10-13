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

  /**
   * 1. TEMPO REAL (O 'Agora' - Current Weather API)
   * Fonte: WeatherAPI ou OpenWeatherMap com fallback para /api/dashboard/nowcast
   * Alimenta com exclusividade: Temperatura Atual, Condição, Umidade, Vento e Chuva Agora (mm/h).
   */
  async fetchNowcast(lat = -23.5505, lon = -46.6333) {
    const weatherApiKey = window.WEATHER_API_KEY || localStorage.getItem('WEATHER_API_KEY');
    const openWeatherKey = window.OPENWEATHER_API_KEY || localStorage.getItem('OPENWEATHER_API_KEY');

    // 1.1 WeatherAPI se configurada
    if (weatherApiKey) {
      try {
        const url = `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${lat},${lon}&lang=pt`;
        const res = await _origFetch(url, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json();
          const curr = data.current || {};
          const cond = curr.condition || {};
          const code = Number(cond.code) || 0;
          const text = cond.text || 'Estável';
          const isStorm = [1087, 1273, 1276, 1279, 1282].includes(code) ||
            /tempestade|trovoada|raio|thunder/i.test(text);
          const rain = Number(curr.precip_mm) || 0;
          return {
            temperature: Math.round(curr.temp_c ?? 20),
            feelsLike: Math.round(curr.feelslike_c ?? curr.temp_c ?? 20),
            condition: text,
            conditionIcon: isStorm ? '⛈️' : (rain > 0 ? '🌧️' : '⛅'),
            humidity: Math.round(curr.humidity ?? 65),
            wind: Math.round(curr.wind_kph ?? 10),
            rainNow: Number(rain.toFixed(1)),
            isThunderstorm: isStorm,
            weatherCode: code,
            source: 'weatherapi'
          };
        }
      } catch (e) {
        console.warn('[Nowcast] WeatherAPI:', e.message);
      }
    }

    // 1.2 OpenWeatherMap se configurada
    if (openWeatherKey) {
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherKey}&units=metric&lang=pt_br`;
        const res = await _origFetch(url, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json();
          const main = data.main || {};
          const wind = data.wind || {};
          const w0 = (data.weather && data.weather[0]) || {};
          const code = Number(w0.id) || 800;
          const isStorm = w0.main === 'Thunderstorm' || (code >= 200 && code <= 232);
          const rain = Number(data.rain?.['1h'] || data.rain?.['3h'] || 0);
          return {
            temperature: Math.round(main.temp ?? 20),
            feelsLike: Math.round(main.feels_like ?? main.temp ?? 20),
            condition: (w0.description || 'Estável').charAt(0).toUpperCase() + (w0.description || 'Estável').slice(1),
            conditionIcon: isStorm ? '⛈️' : (rain > 0 ? '🌧️' : '⛅'),
            humidity: Math.round(main.humidity ?? 65),
            wind: Math.round((wind.speed ?? 3) * 3.6),
            rainNow: Number(rain.toFixed(1)),
            isThunderstorm: isStorm,
            weatherCode: code,
            source: 'openweathermap'
          };
        }
      } catch (e) {
        console.warn('[Nowcast] OpenWeatherMap:', e.message);
      }
    }

    // 1.3 Backend FastAPI Nowcast Proxy (/api/dashboard/nowcast)
    try {
      const nowcastUrl = `/api/dashboard/nowcast?lat=${lat}&lon=${lon}`;
      const res = await fetch(nowcastUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        return {
          temperature: Math.round(data.temperature ?? 20),
          feelsLike: Math.round(data.feels_like ?? data.temperature ?? 20),
          condition: data.condition || 'Estável',
          conditionIcon: data.condition_icon || (data.is_thunderstorm ? '⛈️' : (data.rain_mm_h > 0 ? '🌧️' : '⛅')),
          humidity: Math.round(data.humidity ?? 65),
          wind: Math.round(data.wind_kph ?? 10),
          rainNow: Number((data.rain_mm_h ?? 0).toFixed(1)),
          isThunderstorm: Boolean(data.is_thunderstorm),
          weatherCode: Number(data.weather_code) || 1,
          source: data.source || 'internal-nowcast'
        };
      }
    } catch (e) {
      console.warn('[Nowcast] Proxy interno:', e.message);
    }

    // 1.4 Fallback Open-Meteo Current
    try {
      const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,wind_speed_10m&models=icon_seamless&timezone=America%2FSao_Paulo`;
      const res = await _origFetch(omUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        const curr = data.current || {};
        const wCode = Number(curr.weather_code) || 1;
        const isStorm = [82, 95, 96, 99].includes(wCode);
        const rain = Number(curr.precipitation ?? curr.rain ?? 0);
        return {
          temperature: Math.round(curr.temperature_2m ?? 20),
          feelsLike: Math.round(curr.apparent_temperature ?? curr.temperature_2m ?? 20),
          condition: isStorm ? 'Tempestade com Raios' : (rain > 0 ? 'Chuva' : 'Estável'),
          conditionIcon: isStorm ? '⛈️' : (rain > 0 ? '🌧️' : '⛅'),
          humidity: Math.round(curr.relative_humidity_2m ?? 65),
          wind: Math.round(curr.wind_speed_10m ?? 10),
          rainNow: Number(rain.toFixed(1)),
          isThunderstorm: isStorm,
          weatherCode: wCode,
          source: 'open-meteo-nowcast'
        };
      }
    } catch (_) {}

    return {
      temperature: 20,
      feelsLike: 20,
      condition: 'Estável',
      conditionIcon: '🌤️',
      humidity: 65,
      wind: 10,
      rainNow: 0.0,
      isThunderstorm: false,
      weatherCode: 1,
      source: 'fallback'
    };
  },

  /**
   * 2. PREVISÃO (O 'Futuro' - Open-Meteo API)
   * Busca a previsão horária (precipitação e probabilidade das próximas 24 horas).
   * Alvo no UI: Gráfico de 'Projeção 24h'.
   */
  async fetchHourlyForecast(lat = -23.5505, lon = -46.6333) {
    const directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation,rain,showers,precipitation_probability,soil_moisture_0_to_1cm&daily=precipitation_sum,precipitation_probability_max&past_days=1&forecast_days=2&timezone=America%2FSao_Paulo`;
    const proxyUrl = `/api/dashboard/weather?lat=${lat}&lon=${lon}`;

    try {
      const res = await _origFetch(directUrl, { signal: AbortSignal.timeout(4500) });
      if (res.ok) {
        const data = await res.json();
        if (data && data.hourly) return data;
      }
    } catch (_) {}

    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(4500) });
      if (res.ok) {
        const data = await res.json();
        if (data && data.hourly) return data;
      }
    } catch (_) {}

    return null;
  },

  /**
   * ARQUITETURA CLIMÁTICA HÍBRIDA (NOWCASTING + FORECASTING)
   * Chamadas em paralelo via Promise.all + Data Merge no Gráfico + Override de Segurança
   */
  async fetchHybridWeather(lat = -23.5505, lon = -46.6333) {
    // Execução paralela garantida
    const [nowcast, forecast] = await Promise.all([
      this.fetchNowcast(lat, lon),
      this.fetchHourlyForecast(lat, lon)
    ]);

    // 3. A FUSÃO (Sincronização no Gráfico):
    // Substitui o valor do índice da 'hora atual' (Hora 0) no array da Open-Meteo
    // pelo valor real de precipitação trazido pela API de Tempo Real.
    let currentIdx = -1;
    if (forecast && forecast.hourly) {
      const times = forecast.hourly.time || [];
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const localHourStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}`;
      currentIdx = times.findIndex(t => t.startsWith(localHourStr));
      if (currentIdx === -1) currentIdx = Math.max(0, times.length - 24);

      if (currentIdx >= 0) {
        if (Array.isArray(forecast.hourly.precipitation)) {
          forecast.hourly.precipitation[currentIdx] = nowcast.rainNow;
        }
        if (Array.isArray(forecast.hourly.rain)) {
          forecast.hourly.rain[currentIdx] = nowcast.rainNow;
        }
      }
      forecast._currentIdx = currentIdx;
    }

    // 4. NOVA REGRA DO DIAGNÓSTICO DE RISCO (Override de Segurança)
    let riskOverride = null;
    const cIdx = currentIdx >= 0 ? currentIdx : 0;
    const forecastRains = forecast?.hourly?.precipitation || forecast?.hourly?.rain || [];
    
    // Pico das próximas 3 horas (+1h, +2h, +3h)
    const peakNext3h = Math.max(
      Number(forecastRains[cIdx + 1] || 0),
      Number(forecastRains[cIdx + 2] || 0),
      Number(forecastRains[cIdx + 3] || 0)
    );

    // Gatilho Imediato (Prioridade 1):
    // Se a API de Tempo Real reportar precipitação > 5mm/h ou código de tempestade (Thunderstorm),
    // o painel DEVE ficar Vermelho/Alto Risco, independentemente do que a previsão diga.
    if (nowcast.rainNow > 5.0 || nowcast.isThunderstorm) {
      const stormDesc = nowcast.isThunderstorm
        ? 'Tempestade Ativa com Raios (Thunderstorm)'
        : `Chuva Torrencial de ${nowcast.rainNow.toFixed(1)} mm/h`;
      riskOverride = {
        active: true,
        priority: 1,
        level: 'critical',
        color: '#EF4444',
        label: '🚨 ALTO RISCO (TEMPO REAL)',
        badge: 'CRÍTICO',
        score: Math.max(80, Math.min(98, Math.round(75 + nowcast.rainNow * 1.5))),
        title: 'Gatilho Imediato de Segurança (Prioridade 1)',
        message: `API de Tempo Real detectou ${stormDesc}. Painel elevado para Vermelho/Alto Risco independente da previsão horária.`
      };
    }
    // Gatilho Futuro (Prioridade 2):
    // Se agora não chove, mas a Open-Meteo prevê pico > 10mm nas próximas 3 horas,
    // o painel fica Amarelo/Alerta Antecipado.
    else if (nowcast.rainNow <= 0.1 && peakNext3h > 10.0) {
      riskOverride = {
        active: true,
        priority: 2,
        level: 'warning',
        color: '#F59E0B',
        label: '⚠️ ALERTA ANTECIPADO (+3h)',
        badge: 'ATENÇÃO',
        score: Math.max(50, Math.min(68, Math.round(42 + peakNext3h * 1.2))),
        title: 'Gatilho Futuro — Previsão Preditiva (Prioridade 2)',
        message: `Sem chuva no momento (0.0 mm/h), porém projeção horária indica pico de temporal de ${peakNext3h.toFixed(1)} mm nas próximas 3 horas. Alerta preventivo acionado.`
      };
    }

    return {
      nowcast,
      forecast,
      peakNext3h,
      riskOverride
    };
  }
};
