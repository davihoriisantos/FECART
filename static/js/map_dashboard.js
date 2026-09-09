/**
 * FloodGuard AI — Motor de Monitoramento Integrado e Busca Universal (Dashboard v3.0)
 * 
 * Funcionalidades:
 * - Layout Integrado Split-Screen (Painel Esquerdo + Moldura do Mapa)
 * - Busca Universal de Bairros, Ruas e CEPs de SP (com Autocomplete e Nominatim)
 * - Cálculo de Risco Dinâmico em Tempo Real por Coordenada (sem marcadores fixos)
 * - Clique no Mapa para Análise Instantânea de Risco
 * - Gráfico de Tendência (Chart.js) 24h Passadas + 3h Futuras
 * - Simulador de Trajeto com Avaliação de Risco e Modo Demo FECART
 */

// ─── BASE DE BAIRROS E PONTOS DE SÃO PAULO ───────────────────────────────────
const SP_NEIGHBORHOODS = [
    // Centro, Paulista & Região FECAP
    { nome: "FECAP — Campus Liberdade", bairro: "Liberdade / Centro", lat: -23.5574, lon: -46.6367, alt: 735, icon: "🎓" },
    { nome: "Tirrenos Restaurante", bairro: "Bela Vista / Cerqueira César", lat: -23.5578, lon: -46.6575, alt: 785, icon: "🍽️" },
    { nome: "Liberdade", bairro: "Centro", lat: -23.5594, lon: -46.6362, alt: 732, icon: "🏮" },
    { nome: "Baixada do Glicério", bairro: "Centro / Glicério", lat: -23.5592, lon: -46.6288, alt: 719, icon: "🚨" },
    { nome: "Viaduto do Chá / Anhangabaú", bairro: "Centro Histórico", lat: -23.5475, lon: -46.6378, alt: 721, icon: "🏛️" },
    { nome: "Praça da Sé", bairro: "Centro", lat: -23.5505, lon: -46.6333, alt: 730, icon: "⛪" },
    { nome: "Bela Vista / Bixiga", bairro: "Centro-Sul", lat: -23.5560, lon: -46.6450, alt: 745, icon: "🍝" },
    { nome: "República", bairro: "Centro", lat: -23.5427, lon: -46.6428, alt: 734, icon: "🏙️" },
    { nome: "Consolação / Av. Paulista", bairro: "Centro / Jardins", lat: -23.5568, lon: -46.6580, alt: 780, icon: "🏢" },
    { nome: "MASP — Museu de Arte de SP", bairro: "Bela Vista / Paulista", lat: -23.5614, lon: -46.6559, alt: 782, icon: "🎨" },

    // Zona Sul & Oeste
    { nome: "Morumbi", bairro: "Zona Oeste / Sul", lat: -23.5989, lon: -46.7020, alt: 740, icon: "📍" },
    { nome: "Pinheiros", bairro: "Zona Oeste", lat: -23.5640, lon: -46.6902, alt: 728, icon: "📍" },
    { nome: "Vila Mariana", bairro: "Zona Sul", lat: -23.5874, lon: -46.6380, alt: 755, icon: "📍" },
    { nome: "Ipiranga", bairro: "Zona Sul", lat: -23.5850, lon: -46.6080, alt: 730, icon: "📍" },
    { nome: "Brooklin", bairro: "Zona Sul", lat: -23.6120, lon: -46.6780, alt: 726, icon: "📍" },
    { nome: "Santo Amaro", bairro: "Zona Sul", lat: -23.6520, lon: -46.7080, alt: 725, icon: "📍" },
    { nome: "Jabaquara", bairro: "Zona Sul", lat: -23.6450, lon: -46.6410, alt: 750, icon: "📍" },
    { nome: "Campo Limpo", bairro: "Zona Sul", lat: -23.6300, lon: -46.7580, alt: 742, icon: "📍" },
    { nome: "Butantã", bairro: "Zona Oeste", lat: -23.5710, lon: -46.7150, alt: 735, icon: "📍" },
    { nome: "Lapa", bairro: "Zona Oeste", lat: -23.5189, lon: -46.7020, alt: 722, icon: "📍" },
    { nome: "Vila Leopoldina", bairro: "Zona Oeste", lat: -23.5320, lon: -46.7350, alt: 723, icon: "📍" },
    { nome: "Perdizes", bairro: "Zona Oeste", lat: -23.5360, lon: -46.6720, alt: 755, icon: "📍" },

    // Zona Leste & Norte
    { nome: "Mooca", bairro: "Zona Leste", lat: -23.5590, lon: -46.5950, alt: 720, icon: "📍" },
    { nome: "Tatuapé", bairro: "Zona Leste", lat: -23.5430, lon: -46.5610, alt: 720, icon: "📍" },
    { nome: "Itaquera", bairro: "Zona Leste", lat: -23.5395, lon: -46.4580, alt: 733, icon: "📍" },
    { nome: "Brás", bairro: "Zona Leste / Centro", lat: -23.5420, lon: -46.6210, alt: 724, icon: "📍" },
    { nome: "Penha", bairro: "Zona Leste", lat: -23.5280, lon: -46.5450, alt: 740, icon: "📍" },
    { nome: "São Mateus", bairro: "Zona Leste", lat: -23.5980, lon: -46.4780, alt: 745, icon: "📍" },
    { nome: "Santana", bairro: "Zona Norte", lat: -23.5150, lon: -46.6230, alt: 725, icon: "📍" },
    { nome: "Tucuruvi", bairro: "Zona Norte", lat: -23.4780, lon: -46.6020, alt: 750, icon: "📍" },
    { nome: "Casa Verde", bairro: "Zona Norte", lat: -23.5080, lon: -46.6580, alt: 722, icon: "📍" }
];

// ─── ESTADO GLOBAL DO DASHBOARD ───────────────────────────────────────────────
let map = null;
let currentSelectedPoint = {
    nome: "FECAP — Campus Liberdade",
    bairro: "Liberdade / Centro",
    lat: -23.5574,
    lon: -46.6367,
    alt: 735
};

let activeMarker = null;
let activeRiskCircle = null;
let riskTrendChart = null;
let simulatedScenario = 'real'; // 'real', 'tempestade', 'moderada'
let routeLayers = [];
let routeRequestId = 0;
let geocodeCache = {};
let searchTimeout = null;
let searchRequestId = 0;
let searchSuggestionResults = [];

// ─── INICIALIZAÇÃO GERAL ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initLeafletMap();
    setupSearchListeners();
    setupRouteAutocomplete();

    // Força o Leaflet a recalcular as dimensões reais do container após o layout flex ser resolvido
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 200);

    // Carrega dados iniciais da FECAP
    await analyzePoint(currentSelectedPoint.lat, currentSelectedPoint.lon, currentSelectedPoint.nome, currentSelectedPoint.bairro, currentSelectedPoint.alt);
});

// ─── CONSULTA DE ALTITUDE EM TEMPO REAL (OPENTOPODATA / OPEN-ELEVATION) ────────
const elevationCache = {};

async function getElevation(lat, lon) {
    const key = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
    if (elevationCache[key] !== undefined) return elevationCache[key];

    // 1. Tenta OpenTopoData API (Dataset ASTER 30m)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const url = `https://api.opentopodata.org/v1/aster30m?locations=${lat},${lon}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0 && data.results[0].elevation !== null && data.results[0].elevation !== undefined) {
                const elev = Math.round(data.results[0].elevation);
                elevationCache[key] = elev;
                return elev;
            }
        }
    } catch (e) {
        console.warn("OpenTopoData indisponível ou timeout, tentando fallback...", e);
    }

    // 2. Fallback: Open-Elevation API
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0 && data.results[0].elevation !== null && data.results[0].elevation !== undefined) {
                const elev = Math.round(data.results[0].elevation);
                elevationCache[key] = elev;
                return elev;
            }
        }
    } catch (e) {
        console.warn("Open-Elevation indisponível ou timeout, tentando Open-Meteo elevation...", e);
    }

    // 3. Fallback: Open-Meteo elevation
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.elevation !== undefined && data.elevation !== null) {
                const elev = Math.round(data.elevation);
                elevationCache[key] = elev;
                return elev;
            }
        }
    } catch (_) {}

    // Fallback padrão se todas falharem (média do planalto SP)
    return 745;
}

// ─── CALHAS HIDROGRÁFICAS PRINCIPAIS DE SÃO PAULO ────────────────────────────
const SP_RIVERS = [
    {
        nome: "Rio Tietê (Marginal Tietê)",
        coords: [
            [-23.502, -46.480], [-23.508, -46.520], [-23.513, -46.570], 
            [-23.518, -46.620], [-23.517, -46.655], [-23.522, -46.705], 
            [-23.526, -46.740], [-23.535, -46.765]
        ]
    },
    {
        nome: "Rio Pinheiros (Marginal Pinheiros)",
        coords: [
            [-23.705, -46.700], [-23.660, -46.715], [-23.615, -46.698],
            [-23.585, -46.690], [-23.560, -46.702], [-23.535, -46.732],
            [-23.528, -46.745]
        ]
    },
    {
        nome: "Rio Tamanduateí / Av. do Estado / Glicério",
        coords: [
            [-23.620, -46.575], [-23.595, -46.600], [-23.570, -46.618],
            [-23.559, -46.628], [-23.545, -46.627], [-23.528, -46.624],
            [-23.518, -46.622]
        ]
    },
    {
        nome: "Rio / Córrego Aricanduva",
        coords: [
            [-23.610, -46.485], [-23.575, -46.510], [-23.548, -46.535],
            [-23.530, -46.555], [-23.518, -46.570]
        ]
    },
    {
        nome: "Córrego Anhangabaú / 23 de Maio",
        coords: [
            [-23.570, -46.643], [-23.558, -46.640], [-23.548, -46.638],
            [-23.542, -46.635]
        ]
    }
];

// ─── PONTOS COM HISTÓRICO CRÔNICO DE ALAGAMENTO (DEFESA CIVIL / CGE) ─────────
const CHRONIC_FLOOD_ZONES = [
    { nome: "Baixada do Glicério", lat: -23.5592, lon: -46.6288, raio: 650 },
    { nome: "Vale do Anhangabaú / Viaduto do Chá", lat: -23.5475, lon: -46.6378, raio: 600 },
    { nome: "Av. do Estado (Trecho Radial / Mercado)", lat: -23.5528, lon: -46.6268, raio: 600 },
    { nome: "Av. Prof. Luiz Ignácio Anhaia Mello", lat: -23.5850, lon: -46.5650, raio: 750 },
    { nome: "Marginal Pinheiros (Ponte Cidade Jardim)", lat: -23.5850, lon: -46.6900, raio: 700 },
    { nome: "Marginal Pinheiros (Jaguaré / Ceagesp)", lat: -23.5350, lon: -46.7350, raio: 700 },
    { nome: "Marginal Tietê (Ponte das Bandeiras)", lat: -23.5180, lon: -46.6340, raio: 700 },
    { nome: "Marginal Tietê (Ponte da Casa Verde)", lat: -23.5120, lon: -46.6600, raio: 700 },
    { nome: "Av. Aricanduva (Shopping / Rio Aricanduva)", lat: -23.5550, lon: -46.5250, raio: 800 },
    { nome: "Praça da Bandeira / Av. 9 de Julho", lat: -23.5500, lon: -46.6400, raio: 550 },
    { nome: "Rua Conselheiro Furtado (Liberdade)", lat: -23.5558, lon: -46.6315, raio: 500 },
    { nome: "Mooca (Rua dos Trilhos / Ibitirama)", lat: -23.5580, lon: -46.5950, raio: 600 },
    { nome: "Marginal Pinheiros (Ponte Roberto Zuccolo)", lat: -23.5280, lon: -46.7150, raio: 600 }
];

// Estruturas de macrodrenagem relevantes para reduzir picos locais de escoamento.
// O efeito é gradual e limitado: a presença de um reservatório não zera o risco.
const SP_DRAINAGE_STRUCTURES = [
    { nome: "Reservatório de Retenção do Pacaembu", lat: -23.5488, lon: -46.6654, raio: 900 },
    { nome: "Piscinão Aricanduva", lat: -23.5685, lon: -46.5175, raio: 1200 },
    { nome: "Piscinão Rincão", lat: -23.5367, lon: -46.5702, raio: 900 },
    { nome: "Piscinão Guamiranga", lat: -23.5797, lon: -46.5909, raio: 900 }
];

// ─── CÁLCULO DE DISTÂNCIA ATÉ O RIO MAIS PRÓXIMO ──────────────────────────────
function getMinDistanceToRivers(lat, lon) {
    let minDistance = 999999;
    let closestRiver = "Bacia Geral";

    for (const river of SP_RIVERS) {
        for (let i = 0; i < river.coords.length - 1; i++) {
            const p1 = river.coords[i];
            const p2 = river.coords[i + 1];
            const dist = distanceToSegment(lat, lon, p1[0], p1[1], p2[0], p2[1]);
            if (dist < minDistance) {
                minDistance = dist;
                closestRiver = river.nome;
            }
        }
    }

    return { distance: Math.round(minDistance), river: closestRiver };
}

function distanceToSegment(lat, lon, lat1, lon1, lat2, lon2) {
    // Projeção métrica precisa para SP (1° lat ~ 111.000m, 1° lon ~ 102.000m)
    const px = (lon - lon1) * 102000;
    const py = (lat - lat1) * 111000;
    const dx = (lon2 - lon1) * 102000;
    const dy = (lat2 - lat1) * 111000;

    const lenSq = dx * dx + dy * dy;
    let param = lenSq !== 0 ? (px * dx + py * dy) / lenSq : -1;
    param = Math.max(0, Math.min(1, param));

    const projX = param * dx;
    const projY = param * dy;

    return Math.hypot(px - projX, py - projY);
}

// ─── VERIFICAÇÃO DE HISTÓRICO CRÔNICO DEFESA CIVIL / CGE ──────────────────────
function checkChronicFloodZone(lat, lon) {
    let nearest = null;

    for (const zone of CHRONIC_FLOOD_ZONES) {
        const dy = (lat - zone.lat) * 111000;
        const dx = (lon - zone.lon) * 102000;
        const dist = Math.hypot(dx, dy);

        if (!nearest || dist < nearest.dist) {
            nearest = { zone, dist };
        }
    }

    if (!nearest) {
        return { isChronic: false, zoneName: null, dist: null, influence: 0 };
    }

    // A influência desaparece gradualmente entre o centro e 2,5 raios.
    // Isso evita o salto artificial de risco ao cruzar a borda de uma zona.
    const normalizedDistance = nearest.dist / nearest.zone.raio;
    const influence = 1 - smoothstep(0.35, 2.5, normalizedDistance);

    return {
        isChronic: influence >= 0.35,
        zoneName: nearest.zone.nome,
        dist: Math.round(nearest.dist),
        influence
    };
}

function getDrainageInfluence(lat, lon) {
    let nearest = null;
    for (const structure of SP_DRAINAGE_STRUCTURES) {
        const dy = (lat - structure.lat) * 111000;
        const dx = (lon - structure.lon) * 102000;
        const distance = Math.hypot(dx, dy);
        if (!nearest || distance < nearest.distance) nearest = { structure, distance };
    }

    if (!nearest) return { influence: 0, name: null, distance: null };
    const influence = 1 - smoothstep(0.25, 2.0, nearest.distance / nearest.structure.raio);
    return { influence, name: nearest.structure.nome, distance: Math.round(nearest.distance) };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
    const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return x * x * (3 - 2 * x);
}

// ─── CLASSIFICAÇÃO TOPOGRÁFICA DE SÃO PAULO ───────────────────────────────────
function getAltitudeClassification(alt) {
    if (alt <= 730) {
        return {
            tipo: "Área de Vale / Depressão",
            badge: "⚠️ Vale (+40% Risco)",
            desc: "Fundo de vale e baixada com alta retenção hídrica",
            color: "#EF4444",
            factorTxt: "+40%"
        };
    } else if (alt >= 780) {
        return {
            tipo: "Área Alta / Colina",
            badge: "🛡️ Colina (-40% Desconto)",
            desc: "Espigão e morro elevado com rápida drenagem pluvial",
            color: "#38BDF8",
            factorTxt: "-40%"
        };
    } else {
        const diff = Math.round(((755 - alt) / 25) * 20);
        const sign = diff >= 0 ? `+${diff}%` : `${diff}%`;
        return {
            tipo: "Planalto Médio",
            badge: `Planalto (${sign})`,
            desc: "Altitude intermediária do planalto paulistano",
            color: "#94A3B8",
            factorTxt: sign
        };
    }
}

// ─── INICIALIZAR MAPA LEAFLET ─────────────────────────────────────────────────
function initLeafletMap() {
    map = L.map('map', {
        zoomControl: true,
        attributionControl: true
    }).setView([currentSelectedPoint.lat, currentSelectedPoint.lon], 15);

    // Mapas-base alternáveis: ruas para navegação e imagem aérea para inspeção do relevo.
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    });
    const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics'
        }
    );

    streetLayer.addTo(map);
    createMapLayerSwitcher(streetLayer, satelliteLayer);

    // Adiciona escala métrica
    L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(map);

    // Clique em qualquer parte do mapa -> Análise dinâmica instantânea
    map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        
        // Exibe loader instantâneo no card e limpa dados anteriores
        document.getElementById('hero-location-name').innerHTML = `<span class="location-pin-badge">⏳</span> <span class="location-title-text">Localizando endereço...</span>`;
        const elBairro = document.getElementById('hero-location-bairro');
        if (elBairro) elBairro.textContent = `Identificando bairro e região...`;
        const elAddress = document.getElementById('hero-location-address');
        if (elAddress) elAddress.textContent = `Consultando base cartográfica...`;
        document.getElementById('hero-location-coord').textContent = `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        // Busca o nome completo do local via Reverse Geocoding e altitude via OpenTopoData
        const [locationName, realAlt] = await Promise.all([
            reverseGeocode(lat, lng),
            getElevation(lat, lng)
        ]);

        await analyzePoint(lat, lng, locationName.nome, locationName.bairro, realAlt, locationName.display_name);
    });
}

// ─── ANALISAR PONTO DINAMICAMENTE (API CLIMA + IA + GRÁFICO) ─────────────────
async function analyzePoint(lat, lon, nome, bairro = "São Paulo - SP", alt = null, fullAddress = null, isUserLocation = false) {
    // Se a altitude não foi passada, consulta em tempo real na API de Elevação
    const realAlt = alt !== null && alt !== undefined ? alt : await getElevation(lat, lon);
    const altInfo = getAltitudeClassification(realAlt);

    const enderecoCompleto = fullAddress || (bairro ? `${nome} — ${bairro}` : nome);
    currentSelectedPoint = { lat, lon, nome, bairro, alt: realAlt, address: enderecoCompleto, isUserLocation };

    // 1. Atualizar Header do Local Completo (Nome, Bairro, Endereço e Coordenadas)
    if (isUserLocation) {
        document.getElementById('hero-location-name').innerHTML = `
            <span class="location-pin-badge" style="background: rgba(56, 189, 248, 0.25); border-color: #38BDF8; color: #38BDF8;">🎯</span>
            <span class="location-title-text">${escapeHtml(nome)} <span style="font-size: 10px; background: rgba(56,189,248,0.22); color: #38BDF8; padding: 2px 7px; border-radius: 4px; font-weight: 800; margin-left: 6px; border: 1px solid rgba(56,189,248,0.4); vertical-align: middle;">VOCÊ ESTÁ AQUI</span></span>
        `;
    } else {
        document.getElementById('hero-location-name').innerHTML = `
            <span class="location-pin-badge">📍</span>
            <span class="location-title-text">${escapeHtml(nome)}</span>
        `;
    }
    
    const elBairro = document.getElementById('hero-location-bairro');
    if (elBairro) {
        elBairro.innerHTML = `🏙️ <strong>${bairro}</strong>`;
    }

    const elAddress = document.getElementById('hero-location-address');
    if (elAddress) {
        elAddress.innerHTML = `📌 <b>Endereço Completo:</b> ${enderecoCompleto}`;
    }
    
    document.getElementById('hero-location-coord').textContent = `Coordenadas: ${lat.toFixed(4)}, ${lon.toFixed(4)} • ${realAlt}m (${altInfo.tipo})`;

    // Atualiza a barra de busca para sincronizar com o ponto clicado sem sobrecarregar
    const searchInput = document.getElementById('universal-search-input');
    if (searchInput && document.activeElement !== searchInput) {
        searchInput.value = isUserLocation ? (nome.includes('Você está') ? enderecoCompleto.split(',')[0] : nome) : nome;
        const clearBtn = document.getElementById('btn-search-clear');
        if (clearBtn) clearBtn.style.display = 'block';
    }

    // 2. Buscar Dados Climáticos da Open-Meteo para a coordenada
    const weatherData = await fetchWeatherData(lat, lon);

    // 3. Processar Série Temporal e Calcular Risco Preditivo com os 4 Pilares Geográficos
    const analysis = processRiskAnalysis(weatherData, realAlt, lat, lon);

    // 4. Atualizar os Cards e Métricas da UI
    updateUIWithAnalysis(analysis, realAlt, lat, lon);

    // 5. Atualizar Marcador e Zona Dinâmica no Mapa
    updateMapMarker(lat, lon, nome, analysis, realAlt, lat, lon, isUserLocation);

    // 6. Atualizar Gráfico Chart.js
    renderTrendChart(analysis.labels, analysis.historyRisks, analysis.forecastRisks, analysis.maxForecastRisk);
}

// ─── BUSCA DE CLIMA NA OPEN-METEO (48h PASSADO + 48h FUTURO) ─────────────────
async function fetchWeatherData(lat, lon) {
    const key = `w_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    if (geocodeCache[key]) return geocodeCache[key];

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=rain,precipitation_probability,soil_moisture_0_to_1cm&current_weather=true&past_days=2&forecast_days=2&timezone=America%2FSao_Paulo`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        geocodeCache[key] = data;
        return data;
    } catch (e) {
        console.warn("Falha ao consultar Open-Meteo, usando fallback seguro.", e);
        return null;
    }
}

// ─── PROCESSADOR DO MOTOR PREDITIVO DE RISCO (4 PILARES) ─────────────────────
function processRiskAnalysis(data, altitude, lat, lon) {
    if (!data || !data.hourly) {
        return getFallbackAnalysis();
    }

    const times = data.hourly.time;
    const rains = data.hourly.rain;
    const probs = data.hourly.precipitation_probability || [];
    const soilMoistures = data.hourly.soil_moisture_0_to_1cm || [];
    const now = new Date();

    // Encontra o índice da hora atual
    let currentIdx = times.findIndex(t => {
        const d = new Date(t);
        return d.getDate() === now.getDate() && d.getHours() === now.getHours();
    });
    if (currentIdx === -1) currentIdx = times.length - 24;

    const currentRain = rains[currentIdx] ?? 0;

    // Acumulado 24h passadas
    let acc24h = 0;
    for (let j = 0; j < 24; j++) {
        const idx = currentIdx - j;
        if (idx >= 0 && rains[idx] !== null) acc24h += rains[idx];
    }

    // Série das últimas 24h
    const labels = [];
    const historyRisks = [];
    const forecastRisks = [];

    for (let i = 23; i >= 0; i--) {
        const idx = currentIdx - i;
        const d = new Date(times[idx]);
        const horaStr = isNaN(d.getTime()) ? `${24 - i}h` : `${d.getHours().toString().padStart(2, '0')}h`;

        let localAcc = 0;
        for (let k = 0; k < 24; k++) {
            if (idx - k >= 0 && rains[idx - k] !== null) localAcc += rains[idx - k];
        }

        const rainVal = (idx >= 0 && rains[idx] !== null) ? rains[idx] : 0;
        const probVal = (idx >= 0 && probs[idx] !== null) ? probs[idx] : 0;
        const soilMoisture = (idx >= 0 && soilMoistures[idx] !== null) ? soilMoistures[idx] : null;

        const risk = calculateRiskFormula(rainVal, localAcc, probVal, altitude, lat, lon, soilMoisture);
        labels.push(i === 0 ? `Agora (${horaStr})` : horaStr);
        historyRisks.push(risk);
        forecastRisks.push(null);
    }

    const currentRisk = historyRisks[historyRisks.length - 1];
    forecastRisks[forecastRisks.length - 1] = currentRisk; // Ponto de conexão

    // Projeção futura (+1h, +2h, +3h)
    let forecastRainTotal = 0;
    const fRisks = [];

    for (let f = 1; f <= 3; f++) {
        const idx = currentIdx + f;
        const d = new Date(times[idx]);
        const horaStr = isNaN(d.getTime()) ? `+${f}h` : `+${f}h (${d.getHours().toString().padStart(2, '0')}h)`;

        let rainVal = (idx < rains.length && rains[idx] !== null) ? rains[idx] : 0;
        let probVal = (idx < probs.length && probs[idx] !== null) ? probs[idx] : 0;
        const soilMoisture = (idx < soilMoistures.length && soilMoistures[idx] !== null)
            ? soilMoistures[idx]
            : (soilMoistures[currentIdx] ?? null);

        // Se houver cenário simulado para a FECART
        if (simulatedScenario === 'tempestade') {
            rainVal = f === 1 ? 18.0 : (f === 2 ? 38.0 : 20.0);
            probVal = 98;
        } else if (simulatedScenario === 'moderada') {
            rainVal = f === 1 ? 4.0 : (f === 2 ? 5.5 : 3.0);
            probVal = 70;
        }

        forecastRainTotal += rainVal;
        const risk = calculateRiskFormula(rainVal, acc24h + forecastRainTotal, probVal, altitude, lat, lon, soilMoisture);

        labels.push(horaStr);
        historyRisks.push(null);
        forecastRisks.push(risk);
        fRisks.push(risk);
    }

    const maxForecastRisk = Math.max(...fRisks);

    return {
        currentRain,
        acc24h,
        forecastRainTotal,
        currentRisk,
        maxForecastRisk,
        labels,
        historyRisks,
        forecastRisks
    };
}

// ─── EQUAÇÃO MULTIFATORIAL DE RISCO GEOGRÁFICO (0 a 100%) ─────────────────────
function calculateRiskFormula(rainMm, acc24h, prob, alt, lat, lon, soilMoisture = null) {
    // Entradas normalizadas em curvas contínuas. Não há limiares que adicionem
    // dezenas de pontos de uma vez ao mudar alguns metros ou décimos de chuva.
    const rain = Math.max(0, Number(rainMm) || 0);
    const accumulated = Math.max(0, Number(acc24h) || 0);
    const probability = clamp(Number(prob) || 0, 0, 100);
    const elevation = Number.isFinite(Number(alt)) ? Number(alt) : 745;

    const rainScore = 100 * (1 - Math.exp(-rain / 16));
    const accumulatedScore = 100 * (1 - Math.exp(-accumulated / 55));
    const probabilityScore = probability * (0.25 + 0.75 * Math.min(1, rain / 2));

    // A Open-Meteo retorna umidade volumétrica (m³/m³). 0,18 é solo seco e
    // 0,46 representa saturação aproximada; valores ausentes são inferidos pelo acumulado.
    const inferredMoisture = 0.18 + 0.28 * (1 - Math.exp(-accumulated / 45));
    const moisture = soilMoisture === null || !Number.isFinite(Number(soilMoisture))
        ? inferredMoisture
        : Number(soilMoisture);
    const soilScore = 100 * smoothstep(0.18, 0.46, moisture);

    const meteorologicalHazard = (
        rainScore * 0.48 +
        accumulatedScore * 0.24 +
        probabilityScore * 0.10 +
        soilScore * 0.18
    );

    // Altitude absoluta é apenas um indicador aproximado. A curva sigmoide
    // impede que 1 m de diferença provoque uma mudança desproporcional.
    const topographicSusceptibility = 1 / (1 + Math.exp((elevation - 748) / 15));

    // Proximidade hidrográfica também decai suavemente, sem fronteiras de 500/1200 m.
    const riverInfo = getMinDistanceToRivers(lat, lon);
    const riverDist = riverInfo.distance;
    const riverSusceptibility = Math.exp(-riverDist / 900);

    // Histórico entra como influência espacial gradual, e não como bônus fixo.
    const chronicInfo = checkChronicFloodZone(lat, lon);
    const drainageInfo = getDrainageInfluence(lat, lon);
    const geographicMultiplier = 0.62
        + topographicSusceptibility * 0.24
        + riverSusceptibility * 0.25
        + chronicInfo.influence * 0.18
        - drainageInfo.influence * 0.10;

    let calculatedRisk = meteorologicalHazard * geographicMultiplier;

    // Mantém risco residual pequeno em tempo seco, inclusive em fundos de vale.
    if (rain < 0.1 && accumulated < 4 && probability < 30 && simulatedScenario === 'real') {
        calculatedRisk = Math.min(calculatedRisk, 8);
    }

    return Math.max(1, Math.min(100, Math.round(calculatedRisk)));
}

// ─── ATUALIZAR UI COM DADOS CALCULADOS E 4 PILARES ───────────────────────────
function updateUIWithAnalysis(analysis, alt, lat, lon) {
    const risk = analysis.maxForecastRisk;
    const color = getRiskColor(risk);
    const label = getRiskLabel(risk);
    const altInfo = getAltitudeClassification(alt);
    const riverInfo = getMinDistanceToRivers(lat, lon);
    const chronicInfo = checkChronicFloodZone(lat, lon);

    // Hero Badge & Porcentagem
    const elPercent = document.getElementById('hero-risk-percent');
    const elBadge = document.getElementById('hero-risk-badge');
    const elLabel = document.getElementById('hero-risk-label');
    const elBar = document.getElementById('hero-risk-bar');
    const elRec = document.getElementById('hero-recommendation');

    elPercent.textContent = `${risk}%`;
    elPercent.style.color = color;

    elBadge.textContent = label;
    elBadge.style.background = `${color}22`;
    elBadge.style.color = color;
    elBadge.style.borderColor = `${color}66`;

    elLabel.textContent = risk >= 75 ? "🚨 Alerta Crítico" : (risk >= 50 ? "⚠️ Atenção Alta" : (risk >= 30 ? "🟡 Atenção Moderada" : "🟢 Condição Segura"));

    elBar.style.width = `${Math.max(8, risk)}%`;
    elBar.style.background = color;

    // Recomendações
    if (risk >= 75) {
        elRec.innerHTML = `🚨 <strong>Risco Crítico de Inundação:</strong> ${alt <= 730 ? 'Ponto baixo de vale com retenção hídrica severa.' : 'Evite áreas baixas e passagens subterrâneas.'} ${riverInfo.distance < 500 ? `Atenção: A apenas ${riverInfo.distance}m do ${riverInfo.river}.` : ''}`;
    } else if (risk >= 50) {
        elRec.innerHTML = `⚠️ <strong>Risco Alto de Alagamento:</strong> Pontos de drenagem lenta podem acumular água nas vias.`;
    } else if (risk >= 30) {
        elRec.innerHTML = `🟡 <strong>Atenção Moderada:</strong> Chuva contínua pode provocar lentidão e bolsões pontuais de água.`;
    } else {
        elRec.innerHTML = `🛡️ <strong>Sem risco iminente:</strong> Drenagem operando normalmente (${altInfo.tipo}).`;
    }

    // Mini KPIs: 4 Pilares
    document.getElementById('kpi-rain-current').textContent = `${analysis.currentRain.toFixed(1)} mm/h`;
    const elForecastSub = document.getElementById('kpi-rain-forecast-sub');
    if (elForecastSub) elForecastSub.textContent = `+${analysis.forecastRainTotal.toFixed(1)} mm prev. (+3h)`;

    document.getElementById('kpi-rain-acc24').textContent = `${analysis.acc24h.toFixed(1)} mm`;
    document.getElementById('kpi-soil-status').textContent = analysis.acc24h > 30 ? "⚠️ Solo Saturado" : "Solo Estável";
    document.getElementById('kpi-soil-status').style.color = analysis.acc24h > 30 ? "#F59E0B" : "#64748B";

    // Distância do Rio
    const elRiverDist = document.getElementById('kpi-river-dist');
    const elRiverName = document.getElementById('kpi-river-name');
    if (elRiverDist) {
        elRiverDist.textContent = riverInfo.distance < 1000 ? `${riverInfo.distance} m` : `${(riverInfo.distance / 1000).toFixed(1)} km`;
        elRiverDist.style.color = riverInfo.distance < 500 ? "#EF4444" : (riverInfo.distance < 1200 ? "#F59E0B" : "#06B6D4");
    }
    if (elRiverName) {
        elRiverName.textContent = riverInfo.river.split('(')[0].trim();
        elRiverName.title = `${riverInfo.river} (${riverInfo.distance}m)`;
    }

    // Altitude Local
    const elAlt = document.getElementById('kpi-altitude');
    const elAltSub = document.getElementById('kpi-altitude-sub');
    if (elAlt) elAlt.textContent = `${alt} m`;
    if (elAltSub) {
        elAltSub.textContent = altInfo.badge;
        elAltSub.style.color = altInfo.color;
    }

    // Insight da IA: Síntese dos 4 Pilares
    const elInsight = document.getElementById('ai-insight-text');
    const riverFactorTxt = riverInfo.distance < 500 ? "1.8x (crítico)" : (riverInfo.distance <= 1200 ? "1.3x" : "neutro");
    const chronicTxt = chronicInfo.isChronic ? `🚨 <strong>Histórico Crônico CGE (+25% bônus em ${chronicInfo.zoneName})</strong>.` : "Sem histórico crônico direto.";

    if (risk >= 75) {
        elInsight.innerHTML = `<strong>ALERTA MÁXIMO DA IA (${risk}%):</strong> Chuva forte de +${analysis.forecastRainTotal.toFixed(1)}mm combinada com <strong>Relevo em ${alt}m (${altInfo.factorTxt})</strong> e proximidade de <strong>${riverInfo.distance}m da calha (${riverFactorTxt})</strong>. ${chronicTxt}`;
    } else if (risk >= 50) {
        elInsight.innerHTML = `<strong>ATENÇÃO ELEVADA (${risk}%):</strong> Precipitação de +${analysis.forecastRainTotal.toFixed(1)}mm. Topografia em ${alt}m (${altInfo.tipo}) a ${riverInfo.distance}m de corpo hídrico. Monitoramento preventivo recomendado.`;
    } else {
        elInsight.innerHTML = `<strong>CONDIÇÃO FAVORÁVEL (${risk}%):</strong> Relevo elevado em ${alt}m (${altInfo.tipo}, ${altInfo.factorTxt}) a ${riverInfo.distance < 1000 ? riverInfo.distance + 'm' : (riverInfo.distance / 1000).toFixed(1) + 'km'} da calha. Alta capacidade de escoamento natural.`;
    }
}

// ─── ATUALIZAR MARCADOR E CÍRCULO DINÂMICO NO MAPA ────────────────────────────
function updateMapMarker(lat, lon, nome, analysis, alt, latParam, lonParam, isUserLocation = false) {
    if (!map) return;

    // Remove camadas anteriores
    if (activeMarker) map.removeLayer(activeMarker);
    if (activeRiskCircle) map.removeLayer(activeRiskCircle);

    const risk = analysis.maxForecastRisk;
    const color = getRiskColor(risk);
    const altInfo = getAltitudeClassification(alt);
    const riverInfo = getMinDistanceToRivers(lat, lon);
    const chronicInfo = checkChronicFloodZone(lat, lon);

    // Ícone dinâmico: se for a localização atual do usuário (GPS), usa badge e efeito de radar cibernético
    let iconHtml = '';
    let iconSize = [56, 56];
    let iconAnchor = [28, 28];

    if (isUserLocation) {
        iconSize = [64, 64];
        iconAnchor = [32, 32];
        iconHtml = `
            <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: #38BDF8; opacity: 0.45; animation: pulse-dot-anim 1.4s infinite;"></div>
                <div style="position: absolute; width: 78%; height: 78%; border-radius: 50%; background: ${color}; opacity: 0.6; animation: pulse-dot-anim 2s infinite;"></div>
                <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #0284C7, ${color}); border: 3px solid #FFFFFF; box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 22px #38BDF8; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFFFFF; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; user-select: none;">
                    <span style="font-size: 10px; line-height: 1; margin-top: 1px;">🎯</span>
                    <span style="font-size: 12px; font-weight: 900; line-height: 1; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${risk}%</span>
                    <span style="font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.95;">VOCÊ</span>
                </div>
            </div>
        `;
    } else {
        iconHtml = `
            <div style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${color}; opacity: 0.35; animation: pulse-dot-anim 1.8s infinite;"></div>
                <div style="width: 46px; height: 46px; border-radius: 50%; background: ${color}; border: 3px solid #FFFFFF; box-shadow: 0 4px 18px rgba(0,0,0,0.5), 0 0 16px ${color}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFFFFF; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; user-select: none;">
                    <span style="font-size: 13px; font-weight: 900; line-height: 1; text-shadow: 0 1px 3px rgba(0,0,0,0.7);">${risk}%</span>
                    <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.95; margin-top: 1px;">RISCO</span>
                </div>
            </div>
        `;
    }

    const icon = L.divIcon({ className: '', html: iconHtml, iconSize: iconSize, iconAnchor: iconAnchor });

    // Círculo de calor / zona de influência proporcional ao risco
    const radius = risk >= 75 ? 450 : (risk >= 50 ? 320 : 200);
    activeRiskCircle = L.circle([lat, lon], {
        radius: radius,
        color: isUserLocation ? '#38BDF8' : color,
        fillColor: color,
        fillOpacity: isUserLocation ? 0.22 : 0.18,
        weight: isUserLocation ? 3 : 2,
        dashArray: isUserLocation ? '4, 4' : '5, 5'
    }).addTo(map);

    // Marcador com Popup rico com os 4 Pilares
    const badgeUserHtml = isUserLocation 
        ? `<div style="display: inline-flex; align-items: center; gap: 4px; background: #0284C7; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 4px; margin-bottom: 4px;">🎯 VOCÊ ESTÁ AQUI (GPS)</div>`
        : '';

    const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 6px; min-width: 220px;">
            ${badgeUserHtml}
            <div style="font-size: 15px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">${isUserLocation ? 'Sua Localização Atual' : nome}</div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">📍 ${currentSelectedPoint.bairro}</div>
            
            <div style="background: ${color}22; border-left: 4px solid ${color}; padding: 8px 10px; border-radius: 6px; margin-bottom: 6px;">
                <div style="font-size: 14px; font-weight: 800; color: #0F172A;">Risco Preditivo: ${risk}% (${getRiskLabel(risk)})</div>
                <div style="font-size: 11px; color: #475569; margin-top: 2px;">💧 Chuva Prevista (+3h): +${analysis.forecastRainTotal.toFixed(1)} mm</div>
            </div>

            <div style="font-size: 10px; color: #475569; border-top: 1px solid #E2E8F0; padding-top: 6px; line-height: 1.5;">
                <div>⛰️ <b>Altitude:</b> ${alt}m (${altInfo.badge})</div>
                <div>🌊 <b>Rio:</b> ${riverInfo.river.split('(')[0].trim()} a ${riverInfo.distance < 1000 ? riverInfo.distance + 'm' : (riverInfo.distance / 1000).toFixed(1) + 'km'}</div>
                ${chronicInfo.isChronic ? `<div style="color: #DC2626; font-weight: 700; margin-top: 2px;">🚨 Ponto Crônico Defesa Civil (+25%)</div>` : ''}
            </div>
        </div>
    `;

    activeMarker = L.marker([lat, lon], { icon }).addTo(map).bindPopup(popupContent);

    // Movimento suave do mapa para o ponto
    map.flyTo([lat, lon], 16, { duration: 1.5, easeLinearity: 0.25 });
}

// ─── RENDERIZAR GRÁFICO CHART.JS (TENDÊNCIA 24H + 3H) ─────────────────────────
function renderTrendChart(labels, historyData, forecastData, maxForecastRisk) {
    const canvas = document.getElementById('riskTrendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (riskTrendChart) {
        riskTrendChart.destroy();
    }

    const mainColor = getRiskColor(maxForecastRisk);

    riskTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Histórico (24h)',
                    data: historyData,
                    borderColor: '#38BDF8',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointRadius: (ctx) => (ctx.dataIndex === 23 ? 5 : 0),
                    pointBackgroundColor: '#38BDF8',
                    spanGaps: false
                },
                {
                    label: 'Previsão IA (+3h)',
                    data: forecastData,
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    borderWidth: 2.5,
                    borderDash: [5, 5],
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: '#F59E0B',
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#94A3B8', boxWidth: 12, font: { size: 10, weight: 'bold' } }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#FFFFFF',
                    bodyColor: '#E2E8F0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => ctx.raw !== null ? ` Risco: ${ctx.raw}%` : ''
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#64748B', font: { size: 9 }, maxTicksLimit: 7 }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.06)' },
                    ticks: { color: '#64748B', font: { size: 9 }, stepSize: 25, callback: (v) => `${v}%` }
                }
            }
        }
    });
}

// ─── CONFIGURAR BUSCA UNIVERSAL (GLOBAL GEOCODING + POI + ENDEREÇOS) ─────────
function setupSearchListeners() {
    const input = document.getElementById('universal-search-input');
    const dropdown = document.getElementById('universal-search-dropdown');
    const clearBtn = document.getElementById('btn-search-clear');

    if (!input) return;

    input.addEventListener('input', () => {
        const val = input.value.trim();
        clearBtn.style.display = val.length > 0 ? 'block' : 'none';
        const requestId = ++searchRequestId;
        clearTimeout(searchTimeout);

        if (val.length < 2) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            searchSuggestionResults = [];
            return;
        }

        // Mostra resultados locais imediatamente (rápido)
        const localResults = filterLocalNeighborhoods(val);
        if (localResults.length > 0) {
            renderSearchDropdown({ local: localResults, nominatim: [], loading: true });
        } else {
            showSearchLoading(val);
        }

        // Debounce: aguarda o usuário parar de digitar antes de chamar a API
        searchTimeout = setTimeout(async () => {
            const nominatimResults = await searchNominatim(val);
            if (requestId !== searchRequestId || input.value.trim() !== val) return;
            renderSearchDropdown({
                local: localResults,
                nominatim: nominatimResults,
                loading: false
            });
        }, 350);
    });

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = input.value.trim();
            if (query.length < 2) return;

            clearTimeout(searchTimeout);
            const requestId = ++searchRequestId;
            showSearchLoading(query);
            const nominatimResults = await searchNominatim(query);
            if (requestId !== searchRequestId || input.value.trim() !== query) return;

            const firstResult = nominatimResults[0] || filterLocalNeighborhoods(query)[0];
            if (firstResult) selectSearchSuggestion(firstResult);
            else showSearchEmpty();
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
            input.blur();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const items = dropdown.querySelectorAll('.search-item');
            if (items.length > 0) items[0].focus();
        }
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box-wrapper')) {
            dropdown.style.display = 'none';
        }
    });
}

// ─── NORMALIZAÇÃO ÚNICA PARA BUSCA REMOTA E BASE LOCAL ───────────────────────
function normalizeText(text) {
    return String(text ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ─── FILTRO LOCAL (Base de Bairros Offline) ────────────────────────────────────
function filterLocalNeighborhoods(query) {
    const q = normalizeText(query);
    if (!q) return [];

    return SP_NEIGHBORHOODS.filter(n => {
        const nome = normalizeText(n.nome);
        const bairro = normalizeText(n.bairro);
        return nome.includes(q) || bairro.includes(q);
    });
}

function createMapLayerSwitcher(streetLayer, satelliteLayer) {
    const container = document.getElementById('map-layer-toolbar');
    if (!container) return;
    const switcher = L.DomUtil.create('div', 'map-layer-switcher', container);
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', 'Tipo de mapa');
    switcher.innerHTML = `
        <button type="button" class="map-layer-option active" data-layer="map" aria-pressed="true">🗺️ Mapa</button>
        <button type="button" class="map-layer-option" data-layer="satellite" aria-pressed="false">🛰️ Satélite</button>
    `;

    L.DomEvent.disableClickPropagation(switcher);
    L.DomEvent.disableScrollPropagation(switcher);

    switcher.querySelectorAll('.map-layer-option').forEach(button => {
        button.addEventListener('click', () => {
            const useSatellite = button.dataset.layer === 'satellite';
            if (useSatellite) {
                if (map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
                if (!map.hasLayer(satelliteLayer)) satelliteLayer.addTo(map);
            } else {
                if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
                if (!map.hasLayer(streetLayer)) streetLayer.addTo(map);
            }

            switcher.querySelectorAll('.map-layer-option').forEach(option => {
                const active = option === button;
                option.classList.toggle('active', active);
                option.setAttribute('aria-pressed', String(active));
            });
        });
    });
}

// ─── NOMINATIM SP: Endereços, números, estabelecimentos e pontos turísticos ──
async function searchNominatim(query) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) return [];

        const searchTerm = `${normalizedQuery}, Sao Paulo, SP, Brasil`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&bounded=1&viewbox=-46.826,-23.383,-46.365,-23.723&limit=5&addressdetails=1&namedetails=1&accept-language=pt-BR`;
        const res = await fetch(url, {
            headers: { 'Accept-Language': 'pt-BR, pt;q=0.9, en;q=0.8' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) return [];
        const data = await res.json();

        return data.map(item => {
            const addr = item.address || {};
            const nameDetails = item.namedetails || {};
            const nome = nameDetails['name:pt'] || nameDetails.name ||
                addr.amenity || addr.leisure || addr.tourism || addr.historic ||
                addr.shop || addr.office || addr.stadium || addr.sports_centre ||
                (addr.building && addr.building !== 'yes' ? addr.building : null) ||
                addr.road || item.display_name.split(',')[0].trim();
            const bairro = addr.suburb || addr.neighbourhood || addr.city_district ||
                addr.quarter || addr.borough || '';
            const cidade = addr.city || addr.town || addr.municipality || addr.county || '';
            const estado = addr.state || '';
            const pais = addr.country || '';
            const contextParts = [bairro, cidade, estado].filter(Boolean);
            const contexto = contextParts.length > 0 ? contextParts.slice(0, 2).join(', ') : pais;

            return {
                nome,
                bairro: contexto || pais,
                display_name: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                alt: null,
                icon: getNominatimIcon(item, addr),
                type: item.type,
                category: item.class
            };
        });
    } catch (err) {
        if (err.name !== 'AbortError') console.warn('Nominatim error:', err);
        return [];
    }
}

// ─── DETECTA ÍCONE PARA O TIPO DE RESULTADO DO NOMINATIM ─────────────────────
function getNominatimIcon(item, addr) {
    const cls = item.class || '';
    const type = item.type || '';

    if (cls === 'amenity') {
        if (['restaurant', 'fast_food', 'cafe', 'bar', 'food_court'].includes(type)) return '🍽️';
        if (['hospital', 'clinic', 'pharmacy', 'dentist'].includes(type)) return '🏥';
        if (['school', 'university', 'college', 'kindergarten'].includes(type)) return '🎓';
        if (['bank', 'atm'].includes(type)) return '🏦';
        if (['fuel', 'parking'].includes(type)) return '⛽';
        if (['place_of_worship', 'church'].includes(type)) return '⛪';
        if (['cinema', 'theatre'].includes(type)) return '🎭';
        if (['library'].includes(type)) return '📚';
        if (['police'].includes(type)) return '🚓';
        if (['fire_station'].includes(type)) return '🚒';
        if (['bus_station', 'taxi'].includes(type)) return '🚌';
        if (['marketplace', 'marketplace'].includes(type)) return '🛒';
        return '📌';
    }
    if (cls === 'tourism') {
        if (['museum', 'gallery'].includes(type)) return '🏛️';
        if (['hotel', 'hostel', 'motel'].includes(type)) return '🏨';
        if (['attraction', 'viewpoint'].includes(type)) return '🗺️';
        if (['theme_park', 'zoo', 'aquarium'].includes(type)) return '🎡';
        return '🌟';
    }
    if (cls === 'leisure') {
        if (['stadium', 'sports_centre'].includes(type)) return '🏟️';
        if (['park', 'garden'].includes(type)) return '🌳';
        if (['swimming_pool'].includes(type)) return '🏊';
        return '⚽';
    }
    if (cls === 'historic') return '🏰';
    if (cls === 'shop') return '🛍️';
    if (cls === 'railway') return '🚇';
    if (cls === 'aeroway') return '✈️';
    if (cls === 'highway') {
        if (['bus_stop'].includes(type)) return '🚌';
        return '🛣️';
    }
    if (cls === 'place') {
        if (['city', 'town', 'village'].includes(type)) return '🏙️';
        if (['suburb', 'neighbourhood'].includes(type)) return '📍';
        return '🗺️';
    }
    if (cls === 'boundary') return '🗺️';
    if (cls === 'waterway') return '🌊';
    if (addr.postcode) return '📮';
    return '📍';
}

// ─── MOSTRAR LOADING E EMPTY STATE NO DROPDOWN ────────────────────────────────
function showSearchLoading(query) {
    const dropdown = document.getElementById('universal-search-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = `
        <div class="search-status-bar loading">
            <div class="search-loading-dot"></div>
            Buscando "${escapeHtml(query)}"...
        </div>
        <div class="search-empty">⏳ Consultando base cartográfica global...</div>
    `;
    dropdown.style.display = 'block';
}

function showSearchEmpty() {
    const dropdown = document.getElementById('universal-search-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = `
        <div class="search-empty">
            📍 Local não encontrado em SP.<br>
            <span style="color:#38BDF8;">Tente adicionar o número da rua ou o nome do bairro.</span>
        </div>
    `;
    dropdown.style.display = 'block';
}

// ─── RENDERIZAR DROPDOWN UNIFICADO COM SEÇÕES ─────────────────────────────────
function renderSearchDropdown({ local = [], nominatim = [], loading = false }) {
    const dropdown = document.getElementById('universal-search-dropdown');
    if (!dropdown) return;

    const hasLocal = local.length > 0;
    const hasNominatim = nominatim.length > 0;

    if (!hasLocal && !hasNominatim && !loading) {
        showSearchEmpty();
        return;
    }

    let html = '';

    // Status bar
    if (loading) {
        html += `<div class="search-status-bar loading"><div class="search-loading-dot"></div>Buscando na base global...</div>`;
    } else if (hasNominatim || hasLocal) {
        const total = local.length + nominatim.length;
        html += `<div class="search-status-bar">🌍 ${total} resultado${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}</div>`;
    }

    // Resultados precisos do Nominatim aparecem primeiro e são priorizados no Enter.
    if (hasNominatim) {
        html += `<div class="search-section-label">📍 Endereços e locais em São Paulo</div>`;
        html += nominatim.map((item, index) => buildSearchItemHtml(item, index)).join('');
    }

    if (hasLocal) {
        html += `<div class="search-section-label">⭐ Pontos de Referência</div>`;
        html += local.map((item, index) => buildSearchItemHtml(item, nominatim.length + index)).join('');
    }

    searchSuggestionResults = [...nominatim, ...local];
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
    dropdown.querySelectorAll('[data-search-index]').forEach(element => {
        element.addEventListener('click', () => {
            const item = searchSuggestionResults[Number(element.dataset.searchIndex)];
            if (item) selectSearchSuggestion(item);
        });
    });
}

// ─── CONSTRÓI HTML DE UM ITEM DO DROPDOWN ─────────────────────────────────────
function buildSearchItemHtml(item, index) {
    const safeNome = escapeHtml(item.nome);
    const safeDisplay = escapeHtml(item.display_name || `${item.nome} — ${item.bairro}`);
    const safeIcon = escapeHtml(item.icon || '📍');

    return `
    <div class="search-item" data-search-index="${index}" role="button" tabindex="0">
        <span style="font-size: 17px; flex-shrink: 0; line-height: 1;">${safeIcon}</span>
        <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: 13px; color: #FFFFFF; line-height: 1.35; word-break: break-word;">
                ${safeNome}
            </div>
            <div style="font-size: 11px; color: #94A3B8; margin-top: 3px; line-height: 1.3; word-break: break-word;">
                ${safeDisplay}
            </div>
        </div>
        <span style="font-size: 10px; color: #38BDF8; font-weight: 700; flex-shrink: 0; background: rgba(56,189,248,0.10); border: 1px solid rgba(56,189,248,0.25); padding: 3px 8px; border-radius: 6px; margin-left: 8px; white-space: nowrap;">IR</span>
    </div>
    `;
}

function selectSearchSuggestion(item) {
    selectSearchResult(item.lat, item.lon, item.nome, item.bairro, item.alt ?? null, item.display_name, item.icon);
}

// ─── SELECIONAR RESULTADO E ANALISAR RISCO DO LOCAL ───────────────────────────
function selectSearchResult(lat, lon, nome, bairro, alt = null, fullAddress = null, icon = '📍') {
    const input = document.getElementById('universal-search-input');
    if (input) {
        input.value = nome;
        input.blur();
    }
    const dropdown = document.getElementById('universal-search-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
    }
    const clearBtn = document.getElementById('btn-search-clear');
    if (clearBtn) clearBtn.style.display = 'block';

    // Move o mapa imediatamente; clima, altitude e marcador são atualizados em seguida.
    if (map) map.flyTo([Number(lat), Number(lon)], 16, { duration: 1.2, easeLinearity: 0.25 });

    // Aciona o motor de análise completo: clima + elevação + risco
    analyzePoint(lat, lon, nome, bairro, alt, fullAddress);
}

function clearSearchInput() {
    searchRequestId++;
    clearTimeout(searchTimeout);
    searchSuggestionResults = [];
    const input = document.getElementById('universal-search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-search-clear');
    if (clearBtn) clearBtn.style.display = 'none';
    const dropdown = document.getElementById('universal-search-dropdown');
    if (dropdown) { dropdown.style.display = 'none'; dropdown.innerHTML = ''; }
}

// ─── REVERSE GEOCODING PRECISO (COORDENADA -> ENDEREÇO / BAIRRO COMPLETO) ────
async function reverseGeocode(lat, lon) {
    const key = `geo_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    if (geocodeCache[key]) return geocodeCache[key];

    // Se estiver extremamente próximo (< 40 metros) de um marco de referência conhecido
    for (const n of SP_NEIGHBORHOODS) {
        const d = Math.hypot(n.lat - lat, n.lon - lon);
        if (d < 0.0004) {
            const res = { nome: n.nome, bairro: n.bairro, alt: n.alt };
            geocodeCache[key] = res;
            return res;
        }
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const res = await fetch(url, { 
            headers: { 'Accept-Language': 'pt-BR, pt' },
            signal: controller.signal 
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};

            // 1. Identifica o nome principal e específico do local
            let nomePrincipal = "";
            if (addr.amenity) nomePrincipal = addr.amenity;
            else if (addr.leisure) nomePrincipal = addr.leisure;
            else if (addr.tourism) nomePrincipal = addr.tourism;
            else if (addr.building && addr.building !== "yes") nomePrincipal = addr.building;
            else if (addr.historic) nomePrincipal = addr.historic;
            else if (addr.bridge) nomePrincipal = addr.bridge;
            else if (addr.road) {
                nomePrincipal = addr.road;
                if (addr.house_number) nomePrincipal += `, ${addr.house_number}`;
            } else if (addr.pedestrian || addr.footway || addr.path || addr.square) {
                nomePrincipal = addr.pedestrian || addr.footway || addr.path || addr.square;
            } else if (data.display_name) {
                nomePrincipal = data.display_name.split(',')[0].trim();
            } else {
                nomePrincipal = `Local (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
            }

            // 2. Identifica Bairro, Distrito e Cidade
            let bairroNome = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.borough;
            const cidade = addr.city || addr.town || addr.municipality || "São Paulo";

            if (!bairroNome) {
                const parts = (data.display_name || '').split(',').map(s => s.trim());
                if (parts.length > 2) bairroNome = parts[1];
                else bairroNome = "São Paulo";
            }

            const bairroFormatado = bairroNome !== cidade ? `${bairroNome} • ${cidade}` : cidade;

            const resultado = {
                nome: nomePrincipal,
                bairro: bairroFormatado,
                display_name: data.display_name || `${nomePrincipal}, ${bairroFormatado}`
            };

            geocodeCache[key] = resultado;
            return resultado;
        }
    } catch (e) {
        console.warn("Falha no reverse geocoding do Nominatim, usando fallback:", e);
    }

    // Fallback: Procura o bairro mais próximo da base local
    let closest = null;
    let minDist = 999999;
    for (const n of SP_NEIGHBORHOODS) {
        const d = Math.hypot(n.lat - lat, n.lon - lon);
        if (d < minDist) { minDist = d; closest = n; }
    }

    if (closest && minDist < 0.015) {
        return { 
            nome: `Próximo a ${closest.nome}`, 
            bairro: `${closest.bairro} • São Paulo`, 
            alt: closest.alt 
        };
    }

    return { 
        nome: `Ponto (${lat.toFixed(4)}, ${lon.toFixed(4)})`, 
        bairro: "São Paulo - SP", 
        alt: 740 
    };
}

// ─── SIMULADOR DE CENÁRIOS FECART ─────────────────────────────────────────────
function simulateScenario(scenario) {
    simulatedScenario = scenario;
    const badge = document.getElementById('chart-status-badge');

    if (scenario === 'tempestade') {
        badge.textContent = "⚡ Simulação: Tempestade (+45mm)";
        badge.style.color = "#EF4444";
        badge.style.background = "rgba(239, 68, 68, 0.15)";
    } else if (scenario === 'moderada') {
        badge.textContent = "🌧️ Simulação: Chuva Moderada (+8mm)";
        badge.style.color = "#F59E0B";
        badge.style.background = "rgba(245, 158, 11, 0.15)";
    } else {
        badge.textContent = "● Em Tempo Real (Open-Meteo)";
        badge.style.color = "#10B981";
        badge.style.background = "rgba(16, 185, 129, 0.15)";
    }

    analyzePoint(currentSelectedPoint.lat, currentSelectedPoint.lon, currentSelectedPoint.nome, currentSelectedPoint.bairro, currentSelectedPoint.alt);
}

// ─── CONTROLE DE ABAS DO PAINEL ───────────────────────────────────────────────
function switchDashboardTab(tab) {
    const tabExplorar = document.getElementById('tab-btn-explorar');
    const tabRota = document.getElementById('tab-btn-rota');
    const panelExplorar = document.getElementById('panel-explorar');
    const panelRota = document.getElementById('panel-rota');

    if (tab === 'explorar') {
        tabExplorar.className = 'dash-tab active-explorar';
        tabRota.className = 'dash-tab';
        panelExplorar.style.display = 'flex';
        panelRota.style.display = 'none';
    } else {
        tabRota.className = 'dash-tab active-rota';
        tabExplorar.className = 'dash-tab';
        panelRota.style.display = 'flex';
        panelExplorar.style.display = 'none';
    }
}

let selectedRouteOrigem = null;
let selectedRouteDestino = null;

// ─── AUTOCOMPLETE DA ABA DE ROTAS (Nominatim + Base Local) ───────────────────
function setupRouteAutocomplete() {
    const setupField = (inputId, dropdownId, isOrigem) => {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        if (!input || !dropdown) return;

        let routeTimeout = null;
        let routeRequestId = 0;

        input.addEventListener('input', () => {
            if (isOrigem) selectedRouteOrigem = null;
            else selectedRouteDestino = null;

            const val = input.value.trim();
            const requestId = ++routeRequestId;
            clearTimeout(routeTimeout);

            if (val.length < 2) {
                dropdown.style.display = 'none';
                dropdown.innerHTML = '';
                return;
            }

            const localResults = filterLocalNeighborhoods(val);
            if (localResults.length > 0) {
                renderRouteDropdown(inputId, dropdownId, localResults, [], true, isOrigem);
            } else {
                dropdown.innerHTML = `<div class="search-status-bar loading"><div class="search-loading-dot"></div>Buscando endereços em SP...</div>`;
                dropdown.style.display = 'block';
            }

            routeTimeout = setTimeout(async () => {
                const nominatimResults = await searchNominatim(val);
                if (requestId !== routeRequestId || input.value.trim() !== val) return;
                renderRouteDropdown(inputId, dropdownId, localResults, nominatimResults, false, isOrigem);
            }, 350);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.style.display = 'none';
                input.blur();
            }
        });
    };

    setupField('route-origem', 'route-origem-dropdown', true);
    setupField('route-destino', 'route-destino-dropdown', false);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.route-field')) {
            const dd1 = document.getElementById('route-origem-dropdown');
            const dd2 = document.getElementById('route-destino-dropdown');
            if (dd1) dd1.style.display = 'none';
            if (dd2) dd2.style.display = 'none';
        }
    });
}

function renderRouteDropdown(inputId, dropdownId, localResults, nominatimResults, loading, isOrigem) {
    const dropdown = document.getElementById(dropdownId);
    const input = document.getElementById(inputId);
    if (!dropdown || !input) return;

    const hasLocal = localResults.length > 0;
    const hasNominatim = nominatimResults.length > 0;

    if (!hasLocal && !hasNominatim && !loading) {
        dropdown.innerHTML = `<div class="search-empty">Nenhum endereço encontrado em SP</div>`;
        dropdown.style.display = 'block';
        return;
    }

    let html = '';

    if (loading) {
        html += `<div class="search-status-bar loading"><div class="search-loading-dot"></div>Buscando na base de São Paulo...</div>`;
    } else {
        const total = localResults.length + nominatimResults.length;
        html += `<div class="search-status-bar">📍 ${total} endereço${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}</div>`;
    }

    if (hasNominatim) {
        html += `<div class="search-section-label">📍 Endereços e Ruas em São Paulo</div>`;
        html += nominatimResults.map((item, index) => buildSearchItemHtml(item, index)).join('');
    }

    if (hasLocal) {
        html += `<div class="search-section-label">⭐ Pontos de Referência</div>`;
        html += localResults.map((item, index) => buildSearchItemHtml(item, nominatimResults.length + index)).join('');
    }

    const currentResults = [...nominatimResults, ...localResults];
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('[data-search-index]').forEach(element => {
        element.addEventListener('click', () => {
            const item = currentResults[Number(element.dataset.searchIndex)];
            if (item) {
                const label = item.nome + (item.bairro ? ` (${item.bairro})` : '');
                input.value = label;
                if (isOrigem) {
                    selectedRouteOrigem = { lat: item.lat, lon: item.lon, nome: label };
                } else {
                    selectedRouteDestino = { lat: item.lat, lon: item.lon, nome: label };
                }
                dropdown.style.display = 'none';
                dropdown.innerHTML = '';
            }
        });
    });
}

function useCurrentLocationForRoute() {
    if (!navigator.geolocation) {
        alert("Geolocalização não suportada.");
        return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
        const locLabel = `Minha Localização (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
        document.getElementById('route-origem').value = locLabel;
        selectedRouteOrigem = { lat: pos.coords.latitude, lon: pos.coords.longitude, nome: locLabel };
    }, () => alert("Não foi possível obter localização."));
}

// ─── CÁLCULO DE RISCO DE ROTA ──────────────────────────────────────────────────
async function calculateRouteRisk() {
    const origemVal = (document.getElementById('route-origem')?.value || '').trim();
    const destinoVal = (document.getElementById('route-destino')?.value || '').trim();

    if (!origemVal || !destinoVal) {
        alert("Preencha ponto de partida e destino!");
        return;
    }

    clearCurrentRoute();
    setRouteStatus('loading', 'Calculando a rota pelas ruas e analisando os riscos...');

    const [origem, destino] = await Promise.all([
        (selectedRouteOrigem && selectedRouteOrigem.nome === origemVal) ? selectedRouteOrigem : resolveLocation(origemVal),
        (selectedRouteDestino && selectedRouteDestino.nome === destinoVal) ? selectedRouteDestino : resolveLocation(destinoVal)
    ]);

    if (!origem || !destino) {
        setRouteStatus('error', 'Não foi possível localizar um dos endereços informados. Confira os dados e tente novamente.');
        return;
    }

    await processRouteTrajectory(origem, destino);
}

async function runFecapDemoRoute() {
    switchDashboardTab('rota');
    document.getElementById('route-origem').value = "FECAP — Campus Liberdade";
    document.getElementById('route-destino').value = "Viaduto do Chá / Anhangabaú";

    const origem = { lat: -23.5574, lon: -46.6367, nome: "FECAP — Campus Liberdade" };
    const destino = { lat: -23.5475, lon: -46.6378, nome: "Viaduto do Chá / Anhangabaú" };
    clearCurrentRoute();
    setRouteStatus('loading', 'Calculando a rota de demonstração pelas ruas...');
    await processRouteTrajectory(origem, destino);
}

async function resolveLocation(query) {
    const normalizedQuery = normalizeText(query);
    const local = SP_NEIGHBORHOODS.find(n => normalizeText(n.nome).includes(normalizedQuery));
    if (local) return local;

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalizedQuery + ', Sao Paulo, SP, Brasil')}&bounded=1&viewbox=-46.826,-23.383,-46.365,-23.723&limit=1&countrycodes=br`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        const data = await res.json();
        if (data.length > 0) {
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), nome: data[0].display_name.split(',')[0] };
        }
    } catch (_) {}
    return null;
}

function clearCurrentRoute() {
    routeRequestId++;
    routeLayers.forEach(l => { try { map.removeLayer(l); } catch(_) {} });
    routeLayers = [];
}

function setRouteStatus(type, message) {
    const alertBox = document.getElementById('route-alert-box');
    if (!alertBox) return;

    const styles = {
        loading: ['rgba(56, 189, 248, 0.14)', 'rgba(56, 189, 248, 0.4)', '#7DD3FC', '⏳'],
        safe: ['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.4)', '#6EE7B7', '✅'],
        moderate: ['rgba(234, 179, 8, 0.15)', 'rgba(234, 179, 8, 0.45)', '#FDE047', '⚠️'],
        danger: ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.45)', '#FCA5A5', '🚨'],
        error: ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.45)', '#FCA5A5', '❌']
    };
    const [background, border, color, icon] = styles[type] || styles.loading;
    alertBox.innerHTML = `
        <div style="background:${background};border:1px solid ${border};border-radius:10px;padding:12px;font-size:12px;color:${color};line-height:1.5;">
            ${icon} ${message}
        </div>
    `;
    alertBox.style.display = 'block';
}

function getRouteRiskStyle(risk) {
    if (risk <= 30) return { level: 'Baixo', color: '#10B981' };
    if (risk <= 50) return { level: 'Moderado', color: '#EAB308' };
    if (risk <= 75) return { level: 'Alto', color: '#F97316' };
    return { level: 'Crítico', color: '#EF4444' };
}

async function fetchOsrmRoute(origem, destino) {
    const coordinates = `${origem.lon},${origem.lat};${destino.lon},${destino.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OSRM respondeu com status ${response.status}`);

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates?.length) {
        throw new Error('O OSRM não encontrou uma rota dirigível entre os pontos.');
    }

    return data.routes[0];
}

function routeDistanceMeters(a, b) {
    const earthRadius = 6371000;
    const toRadians = degrees => degrees * Math.PI / 180;
    const lat1 = toRadians(a[1]);
    const lat2 = toRadians(b[1]);
    const deltaLat = lat2 - lat1;
    const deltaLon = toRadians(b[0] - a[0]);
    const haversine = Math.sin(deltaLat / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getRouteCumulativeDistances(coordinates) {
    const distances = [0];
    for (let index = 1; index < coordinates.length; index++) {
        distances.push(distances[index - 1] + routeDistanceMeters(coordinates[index - 1], coordinates[index]));
    }
    return distances;
}

function selectRouteSamples(coordinates, intervalMeters = 200) {
    if (!coordinates.length) return [];
    const cumulative = getRouteCumulativeDistances(coordinates);
    const totalDistance = cumulative[cumulative.length - 1];
    const targetDistances = [];
    for (let distance = 0; distance < totalDistance; distance += intervalMeters) targetDistances.push(distance);
    if (!targetDistances.length || totalDistance - targetDistances[targetDistances.length - 1] > 1) {
        targetDistances.push(totalDistance);
    }

    let segmentIndex = 0;
    return targetDistances.map(distance => {
        while (segmentIndex < cumulative.length - 2 && cumulative[segmentIndex + 1] < distance) segmentIndex++;
        const startDistance = cumulative[segmentIndex];
        const endDistance = cumulative[segmentIndex + 1] ?? startDistance;
        const progress = endDistance === startDistance ? 0 : (distance - startDistance) / (endDistance - startDistance);
        const start = coordinates[segmentIndex];
        const end = coordinates[segmentIndex + 1] || start;
        return {
            distance,
            lon: start[0] + (end[0] - start[0]) * progress,
            lat: start[1] + (end[1] - start[1]) * progress
        };
    });
}

async function fetchRouteEnvironment(samples) {
    const chunkSize = 35;
    const chunks = [];
    for (let start = 0; start < samples.length; start += chunkSize) {
        chunks.push(samples.slice(start, start + chunkSize));
    }

    const responses = [];
    for (let batchStart = 0; batchStart < chunks.length; batchStart += 3) {
        const batch = chunks.slice(batchStart, batchStart + 3);
        const batchResponses = await Promise.all(batch.map(async chunk => {
            const latitudes = chunk.map(point => point.lat).join(',');
            const longitudes = chunk.map(point => point.lon).join(',');
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&hourly=rain,precipitation_probability,soil_moisture_0_to_1cm&past_days=2&forecast_days=2&timezone=America%2FSao_Paulo`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Open-Meteo respondeu com status ${response.status}`);
            const data = await response.json();
            return Array.isArray(data) ? data : [data];
        }));
        responses.push(...batchResponses);
    }

    return responses.flat();
}

function interpolateRouteRisks(coordinates, samples, sampleRisks) {
    const cumulative = getRouteCumulativeDistances(coordinates);
    let sampleIndex = 0;
    return cumulative.map(distance => {
        while (sampleIndex < samples.length - 2 && samples[sampleIndex + 1].distance < distance) sampleIndex++;
        const start = samples[sampleIndex];
        const end = samples[sampleIndex + 1] || start;
        const progress = end.distance === start.distance ? 0 : (distance - start.distance) / (end.distance - start.distance);
        return Math.round(sampleRisks[sampleIndex] + ((sampleRisks[sampleIndex + 1] ?? sampleRisks[sampleIndex]) - sampleRisks[sampleIndex]) * clamp(progress, 0, 1));
    });
}

function getRouteTerrainContext(samples, elevations, index) {
    const currentElevation = elevations[index];
    const previousIndex = Math.max(0, index - 1);
    const nextIndex = Math.min(samples.length - 1, index + 1);
    const previousElevation = elevations[previousIndex];
    const nextElevation = elevations[nextIndex];
    const horizontalDistance = Math.max(1, samples[nextIndex].distance - samples[previousIndex].distance);
    const gradePercent = ((nextElevation - previousElevation) / horizontalDistance) * 100;
    const neighborAverage = (previousElevation + nextElevation) / 2;
    const relativeHeight = currentElevation - neighborAverage;

    // Depressões acumulam escoamento; cristas favorecem a dispersão. O ajuste é
    // limitado para que uma leitura isolada de elevação não domine clima e histórico.
    const valleyAdjustment = clamp(-relativeHeight * 1.2, -8, 10);
    const slopeAdjustment = clamp(Math.abs(gradePercent) * 0.7, 0, 5);
    const adjustment = clamp(valleyAdjustment + slopeAdjustment, -8, 12);
    const type = relativeHeight <= -2 ? 'vale/depressão'
        : (Math.abs(gradePercent) >= 2 ? (gradePercent > 0 ? 'aclive' : 'declive') : 'relevo estável');

    return { gradePercent, relativeHeight, adjustment, type };
}

function groupRouteSegments(coordinates, risks) {
    const groups = [];
    let current = null;
    for (let index = 0; index < coordinates.length - 1; index++) {
        const segmentRisk = Math.round((risks[index] + risks[index + 1]) / 2);
        const style = getRouteRiskStyle(segmentRisk);
        const start = [coordinates[index][1], coordinates[index][0]];
        const end = [coordinates[index + 1][1], coordinates[index + 1][0]];

        if (!current || current.level !== style.level) {
            current = { ...style, maxRisk: segmentRisk, latlngs: [start, end] };
            groups.push(current);
        } else {
            current.latlngs.push(end);
            current.maxRisk = Math.max(current.maxRisk, segmentRisk);
        }
    }
    return groups;
}

function formatRouteDuration(durationSeconds) {
    const totalMinutes = Math.max(1, Math.round((Number(durationSeconds) || 0) / 60));
    if (totalMinutes < 60) return `${totalMinutes} min`;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes} min` : `${hours}h`;
}

function buildRouteMetrics(distanceKm, baseDurationSeconds, maxRisk) {
    return `
        <span style="display:block;color:#E2E8F0;margin-top:7px;line-height:1.65;">
            <span style="display:block;"><strong>Distância Total:</strong> ${distanceKm} km</span>
        </span>
    `;
}

async function processRouteTrajectory(origem, destino) {
    clearCurrentRoute();
    const requestId = routeRequestId;

    try {
        const osrmRoute = await fetchOsrmRoute(origem, destino);
        if (requestId !== routeRequestId) return;

        const coordinates = osrmRoute.geometry.coordinates;
        const samples = selectRouteSamples(coordinates);
        setRouteStatus('loading', `Rota encontrada. Analisando clima e relevo em ${samples.length} pontos do trajeto...`);

        const environments = await fetchRouteEnvironment(samples);
        if (requestId !== routeRequestId) return;
        if (environments.length !== samples.length) throw new Error('Dados ambientais incompletos para a rota.');

        const elevations = environments.map(weather =>
            Number.isFinite(Number(weather?.elevation)) ? Number(weather.elevation) : 745
        );
        const terrainContexts = samples.map((_, index) => getRouteTerrainContext(samples, elevations, index));
        const sampleRisks = samples.map((point, index) => {
            const baseRisk = processRiskAnalysis(environments[index], elevations[index], point.lat, point.lon).maxForecastRisk;
            return Math.round(clamp(baseRisk + terrainContexts[index].adjustment, 1, 100));
        });
        const vertexRisks = interpolateRouteRisks(coordinates, samples, sampleRisks);
        const groups = groupRouteSegments(coordinates, vertexRisks);

        groups.forEach(group => {
            const outline = L.polyline(group.latlngs, {
                color: '#0F172A',
                weight: group.level === 'Alto' || group.level === 'Crítico' ? 11 : 9,
                opacity: 0.78,
                lineJoin: 'round',
                lineCap: 'round'
            }).addTo(map);
            const segment = L.polyline(group.latlngs, {
                color: group.color,
                weight: group.level === 'Alto' || group.level === 'Crítico' ? 8 : 6,
                opacity: 0.98,
                lineJoin: 'round',
                lineCap: 'round'
            }).addTo(map).bindTooltip(`${group.level}: até ${group.maxRisk}% de risco`);
            routeLayers.push(outline, segment);
        });

        const startMarker = L.marker([origem.lat, origem.lon]).addTo(map).bindPopup(`<b>🚀 Partida:</b> ${escapeHtml(origem.nome)}`);
        const endMarker = L.marker([destino.lat, destino.lon]).addTo(map).bindPopup(`<b>🏁 Destino:</b> ${escapeHtml(destino.nome)}`);
        routeLayers.push(startMarker, endMarker);

        const routeLatLngs = coordinates.map(([lon, lat]) => [lat, lon]);
        map.fitBounds(L.latLngBounds(routeLatLngs), { padding: [32, 32] });

        const maxRisk = Math.max(...sampleRisks);
        const worstSampleIndex = sampleRisks.indexOf(maxRisk);
        const worstPoint = samples[worstSampleIndex];
        const worstStyle = getRouteRiskStyle(maxRisk);
        const worstTerrain = terrainContexts[worstSampleIndex];
        const chronic = checkChronicFloodZone(worstPoint.lat, worstPoint.lon);
        const drainage = getDrainageInfluence(worstPoint.lat, worstPoint.lon);
        const reverseLocation = await reverseGeocode(worstPoint.lat, worstPoint.lon);
        if (requestId !== routeRequestId) return;
        const locationLabel = reverseLocation?.nome
            || (chronic.isChronic ? chronic.zoneName : getMinDistanceToRivers(worstPoint.lat, worstPoint.lon).river);
        const dangerousGroups = groups.filter(group => group.level === 'Alto' || group.level === 'Crítico');
        const distanceKm = (osrmRoute.distance / 1000).toFixed(1);
        const routeMetrics = buildRouteMetrics(distanceKm, osrmRoute.duration, maxRisk);
        const drainageText = drainage.influence > 0.1
            ? ` • Macrodrenagem próxima: ${escapeHtml(drainage.name)}`
            : '';
        const terrainText = `Relevo: ${worstTerrain.type} (${elevations[worstSampleIndex]} m)`;

        const maxRiskIcon = L.divIcon({
            className: '',
            iconSize: [52, 58],
            iconAnchor: [26, 54],
            html: `
                <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 5px 8px rgba(0,0,0,.55));">
                    <div style="min-width:48px;padding:7px 8px;border:3px solid #fff;border-radius:14px;background:${worstStyle.color};color:#fff;font:900 12px 'Plus Jakarta Sans',sans-serif;text-align:center;">⚠ ${maxRisk}%</div>
                    <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:11px solid ${worstStyle.color};margin-top:-1px;"></div>
                </div>`
        });
        const maxRiskMarker = L.marker([worstPoint.lat, worstPoint.lon], { icon: maxRiskIcon, zIndexOffset: 1000 })
            .addTo(map)
            .bindPopup(`<b>Ponto de Risco Máximo: ${maxRisk}%</b><br>${escapeHtml(locationLabel)}<br>Nível ${worstStyle.level}`);
        routeLayers.push(maxRiskMarker);

        if (maxRisk < 30) {
            setRouteStatus('safe', `<strong>Trajeto Limpo e Seguro.</strong> Nenhuma área de risco detectada nas ruas do caminho. <span style="display:block;color:#E2E8F0;margin-top:4px;"><strong>Risco Máximo: ${maxRisk}%</strong> em ${escapeHtml(locationLabel)}${terrainText}${drainageText}</span>${routeMetrics}`);
        } else if (maxRisk <= 50) {
            setRouteStatus('moderate', `<strong>Atenção moderada.</strong> <strong>Risco Máximo: ${maxRisk}%</strong> no trecho de ${escapeHtml(locationLabel)}. Dirija com atenção. <span style="display:block;color:#E2E8F0;margin-top:4px;">${terrainText}${drainageText}</span>${routeMetrics}`);
        } else {
            const trechoLabel = dangerousGroups.length === 1 ? '1 trecho' : `${dangerousGroups.length} trechos`;
            setRouteStatus('danger', `<strong>Atenção:</strong> Seu trajeto passa por ${trechoLabel} de risco alto ou crítico. <strong>Risco Máximo: ${maxRisk}%</strong> no trecho de ${escapeHtml(locationLabel)} (nível ${worstStyle.level}). Mantenha cautela ou altere seu caminho. <span style="display:block;color:#E2E8F0;margin-top:4px;">${terrainText}${drainageText}</span>${routeMetrics}`);
        }
    } catch (error) {
        if (requestId !== routeRequestId) return;
        console.error('Falha ao calcular rota real:', error);
        setRouteStatus('error', 'Não foi possível calcular a rota pelas ruas agora. Verifique sua conexão e tente novamente.');
    }
}

// ─── BOTÕES DE CONTROLE RÁPIDO DO MAPA ────────────────────────────────────────
function flyToSaoPauloCenter() {
    if (map) map.flyTo([-23.5505, -46.6333], 13, { duration: 1.2 });
}

function flyToFECAP() {
    selectSearchResult(-23.5574, -46.6367, "FECAP — Campus Liberdade", "Liberdade", 735);
}

// ─── GEOLOCALIZAÇÃO EM TEMPO REAL (GPS DO USUÁRIO) ───────────────────────────
let isGeolocating = false;
let geoToastTimeout = null;

async function triggerUserGeolocation() {
    if (isGeolocating) return;

    const btnGeo = document.getElementById('btn-geolocate');
    const btnMapGps = document.getElementById('btn-map-gps');

    // 1. Verificação de suporte a Geolocation API no navegador
    if (!navigator.geolocation) {
        showGeoToast(
            'error',
            'Não foi possível acessar sua localização. Por favor, digite seu endereço na barra de pesquisa.'
        );
        focusSearchInput();
        return;
    }

    // 2. Atualizar estado visual para carregando
    isGeolocating = true;
    if (btnGeo) {
        btnGeo.classList.add('is-locating');
        const label = btnGeo.querySelector('.gps-btn-label');
        if (label) label.textContent = 'GPS...';
    }
    if (btnMapGps) {
        btnMapGps.classList.add('is-locating');
        btnMapGps.innerHTML = '🛰️ Localizando...';
    }

    showGeoToast('info', '🛰️ Solicitando sinal de GPS e obtendo suas coordenadas exatas...');

    const geoOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            isGeolocating = false;
            resetGeoButtons();

            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const accuracy = Math.round(position.coords.accuracy || 0);

            showGeoToast('success', `📍 Localização GPS obtida! (Precisão: ±${accuracy}m)`);

            // Exibe estado transitório no card
            document.getElementById('hero-location-name').innerHTML = `
                <span class="location-pin-badge" style="background: rgba(56, 189, 248, 0.25); border-color: #38BDF8; color: #38BDF8;">🎯</span>
                <span class="location-title-text">Sua Localização Atual <span style="font-size: 10px; background: rgba(56,189,248,0.22); color: #38BDF8; padding: 2px 7px; border-radius: 4px; font-weight: 800; margin-left: 6px; border: 1px solid rgba(56,189,248,0.4); vertical-align: middle;">GPS</span></span>
            `;
            const elBairro = document.getElementById('hero-location-bairro');
            if (elBairro) elBairro.innerHTML = `🛰️ Identificando bairro e região...`;
            const elAddress = document.getElementById('hero-location-address');
            if (elAddress) elAddress.innerHTML = `📌 Coordenadas: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;

            // Busca nome reverso e altitude em paralelo
            const [locationInfo, realAlt] = await Promise.all([
                reverseGeocode(lat, lon),
                getElevation(lat, lon)
            ]);

            const displayName = locationInfo.display_name || `${locationInfo.nome} — ${locationInfo.bairro}`;
            const localNome = locationInfo.nome && locationInfo.nome !== 'São Paulo'
                ? `Você está em ${locationInfo.nome}`
                : 'Sua Posição Atual';

            await analyzePoint(lat, lon, localNome, locationInfo.bairro, realAlt, displayName, true);
        },
        (error) => {
            isGeolocating = false;
            resetGeoButtons();

            console.warn('Geolocation error:', error);

            // Alerta amigável e bonito conforme solicitado
            showGeoToast(
                'error',
                'Não foi possível acessar sua localização. Por favor, digite seu endereço na barra de pesquisa.'
            );
            focusSearchInput();
        },
        geoOptions
    );
}

function resetGeoButtons() {
    const btnGeo = document.getElementById('btn-geolocate');
    const btnMapGps = document.getElementById('btn-map-gps');

    if (btnGeo) {
        btnGeo.classList.remove('is-locating');
        const label = btnGeo.querySelector('.gps-btn-label');
        if (label) label.textContent = 'GPS';
    }
    if (btnMapGps) {
        btnMapGps.classList.remove('is-locating');
        btnMapGps.innerHTML = '🎯 Minha Localização';
    }
}

function focusSearchInput() {
    const input = document.getElementById('universal-search-input');
    if (input) {
        setTimeout(() => {
            input.focus();
            input.classList.add('highlight-pulse');
            setTimeout(() => input.classList.remove('highlight-pulse'), 3000);
        }, 300);
    }
}

function showGeoToast(type, message, durationMs = 6000) {
    const toast = document.getElementById('geo-alert-toast');
    if (!toast) return;

    const iconEl = document.getElementById('geo-toast-icon');
    const msgEl = document.getElementById('geo-toast-msg');

    if (type === 'error' || type === 'warning') {
        toast.className = 'geo-toast geo-toast-error';
        if (iconEl) iconEl.innerHTML = '⚠️';
    } else if (type === 'success') {
        toast.className = 'geo-toast geo-toast-success';
        if (iconEl) iconEl.innerHTML = '✅';
    } else {
        toast.className = 'geo-toast geo-toast-info';
        if (iconEl) iconEl.innerHTML = '🛰️';
    }

    if (msgEl) msgEl.innerHTML = message;
    toast.style.display = 'flex';

    clearTimeout(geoToastTimeout);
    if (durationMs > 0) {
        geoToastTimeout = setTimeout(() => {
            hideGeoToast();
        }, durationMs);
    }
}

function hideGeoToast() {
    const toast = document.getElementById('geo-alert-toast');
    if (toast) {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
            toast.style.display = 'none';
            toast.style.animation = '';
        }, 300);
    }
}

// ─── HELPERS E CORES ─────────────────────────────────────────────────────────
function getRiskColor(risk) {
    if (risk >= 75) return '#EF4444'; // Vermelho Crítico
    if (risk >= 50) return '#F97316'; // Laranja Alto
    if (risk >= 30) return '#F59E0B'; // Amarelo Moderado
    return '#10B981';                 // Verde Baixo
}

function getRiskLabel(risk) {
    if (risk >= 75) return 'CRÍTICO';
    if (risk >= 50) return 'ALTO';
    if (risk >= 30) return 'MODERADO';
    return 'BAIXO';
}

function escapeHtml(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function getFallbackAnalysis() {
    return {
        currentRain: 0.0,
        acc24h: 2.0,
        forecastRainTotal: 0.0,
        currentRisk: 12,
        maxForecastRisk: 12,
        labels: ["-24h", "-18h", "-12h", "-6h", "Agora", "+1h", "+2h", "+3h"],
        historyRisks: [8, 10, 12, 11, 12, null, null, null],
        forecastRisks: [null, null, null, null, 12, 12, 12, 12]
    };
}
