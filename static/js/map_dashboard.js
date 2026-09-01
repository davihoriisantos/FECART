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
    // Centro & Região FECAP
    { nome: "FECAP — Campus Liberdade", bairro: "Liberdade / Centro", lat: -23.5574, lon: -46.6367, alt: 735, icon: "🎓" },
    { nome: "Liberdade", bairro: "Centro", lat: -23.5594, lon: -46.6362, alt: 732, icon: "🏮" },
    { nome: "Baixada do Glicério", bairro: "Centro / Glicério", lat: -23.5592, lon: -46.6288, alt: 719, icon: "🚨" },
    { nome: "Viaduto do Chá / Anhangabaú", bairro: "Centro Histórico", lat: -23.5475, lon: -46.6378, alt: 721, icon: "🏛️" },
    { nome: "Praça da Sé", bairro: "Centro", lat: -23.5505, lon: -46.6333, alt: 730, icon: "⛪" },
    { nome: "Bela Vista / Bixiga", bairro: "Centro-Sul", lat: -23.5560, lon: -46.6450, alt: 745, icon: "🍝" },
    { nome: "República", bairro: "Centro", lat: -23.5427, lon: -46.6428, alt: 734, icon: "🏙️" },
    { nome: "Consolação / Av. Paulista", bairro: "Centro / Jardins", lat: -23.5568, lon: -46.6580, alt: 760, icon: "🏢" },

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
let geocodeCache = {};
let searchTimeout = null;

// ─── INICIALIZAÇÃO GERAL ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initLeafletMap();
    setupSearchListeners();
    setupRouteAutocomplete();

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
    for (const zone of CHRONIC_FLOOD_ZONES) {
        const dy = (lat - zone.lat) * 111000;
        const dx = (lon - zone.lon) * 102000;
        const dist = Math.hypot(dx, dy);
        if (dist <= zone.raio) {
            return { isChronic: true, zoneName: zone.nome, dist: Math.round(dist) };
        }
    }
    return { isChronic: false, zoneName: null, dist: null };
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
        attributionControl: false
    }).setView([currentSelectedPoint.lat, currentSelectedPoint.lon], 15);

    // Tiles modernos e nítidos do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    // Adiciona escala métrica
    L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(map);

    // Clique em qualquer parte do mapa -> Análise dinâmica instantânea
    map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        
        // Exibe loader instantâneo no card
        document.getElementById('hero-location-name').innerHTML = `<span>⏳</span> Identificando região...`;
        document.getElementById('hero-location-coord').textContent = `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        // Busca o nome do local via Reverse Geocoding e altitude via OpenTopoData
        const [locationName, realAlt] = await Promise.all([
            reverseGeocode(lat, lng),
            getElevation(lat, lng)
        ]);

        await analyzePoint(lat, lng, locationName.nome, locationName.bairro, realAlt);
    });
}

// ─── ANALISAR PONTO DINAMICAMENTE (API CLIMA + IA + GRÁFICO) ─────────────────
async function analyzePoint(lat, lon, nome, bairro = "São Paulo - SP", alt = null) {
    // Se a altitude não foi passada, consulta em tempo real na API de Elevação
    const realAlt = alt !== null && alt !== undefined ? alt : await getElevation(lat, lon);
    const altInfo = getAltitudeClassification(realAlt);

    currentSelectedPoint = { lat, lon, nome, bairro, alt: realAlt };

    // 1. Atualizar Header do Local
    document.getElementById('hero-location-name').innerHTML = `<span>📍</span> ${nome}`;
    document.getElementById('hero-location-coord').textContent = `Coordenadas: ${lat.toFixed(4)}, ${lon.toFixed(4)} • ${realAlt}m (${altInfo.tipo})`;

    // 2. Buscar Dados Climáticos da Open-Meteo para a coordenada
    const weatherData = await fetchWeatherData(lat, lon);

    // 3. Processar Série Temporal e Calcular Risco Preditivo com os 4 Pilares Geográficos
    const analysis = processRiskAnalysis(weatherData, realAlt, lat, lon);

    // 4. Atualizar os Cards e Métricas da UI
    updateUIWithAnalysis(analysis, realAlt, lat, lon);

    // 5. Atualizar Marcador e Zona Dinâmica no Mapa
    updateMapMarker(lat, lon, nome, analysis, realAlt, lat, lon);

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

        const risk = calculateRiskFormula(rainVal, localAcc, probVal, altitude, lat, lon);
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

        // Se houver cenário simulado para a FECART
        if (simulatedScenario === 'tempestade') {
            rainVal = f === 1 ? 18.0 : (f === 2 ? 38.0 : 20.0);
            probVal = 98;
        } else if (simulatedScenario === 'moderada') {
            rainVal = f === 1 ? 4.0 : (f === 2 ? 5.5 : 3.0);
            probVal = 70;
        }

        forecastRainTotal += rainVal;
        const risk = calculateRiskFormula(rainVal, acc24h + forecastRainTotal, probVal, altitude, lat, lon);

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
function calculateRiskFormula(rainMm, acc24h, prob, alt, lat, lon) {
    // ─── PILAR 3: VOLUME INSTANTÂNEO E ACÚMULO DE CHUVA (METEOROLÓGICO) ──────
    let rainBase = 0;

    if (rainMm <= 0.2) {
        rainBase = prob > 60 ? 6 : (prob > 30 ? 3 : 1);
    } else if (rainMm <= 5.0) {
        rainBase = 8 + (rainMm / 5.0) * 14;          // 8% a 22%
    } else if (rainMm <= 15.0) {
        rainBase = 25 + ((rainMm - 5.0) / 10.0) * 20; // 25% a 45%
    } else if (rainMm <= 30.0) {
        rainBase = 48 + ((rainMm - 15.0) / 15.0) * 20; // 48% a 68%
    } else {
        // Volume altíssimo (>30mm/h) -> A base já começa em 70%
        rainBase = 70 + Math.min(18, ((rainMm - 30.0) / 20.0) * 18); // 70% a 88%
    }

    // Impacto do solo encharcado pelas 24h anteriores
    let soilBonus = 0;
    if (acc24h > 35) soilBonus = 16;
    else if (acc24h > 20) soilBonus = 9;
    else if (acc24h > 10) soilBonus = 4;

    let meteorologicalBase = rainBase + soilBonus;

    // Se tempo totalmente limpo (sem chuva presente/futura e solo seco), risco é residual
    if (rainMm <= 0.1 && acc24h < 4 && prob < 30 && simulatedScenario === 'real') {
        return Math.max(1, Math.round(meteorologicalBase));
    }

    // ─── PILAR 1: TOPOGRAFIA E ALTITUDE (FATOR DE RELEVO) ────────────────────
    // - Regiões altas (>780m): desconto drástico de -40% (multiplier = 0.60)
    // - Regiões de vale (<730m): acréscimo agressivo de +40% (multiplier = 1.40)
    // - Entre 730m e 780m: gradiente contínuo
    let topoMultiplier = 1.0;
    if (alt >= 780) {
        topoMultiplier = 0.60; // -40%
    } else if (alt <= 730) {
        topoMultiplier = 1.40; // +40%
    } else {
        topoMultiplier = 1.40 - ((alt - 730) / 50.0) * 0.80;
    }

    // ─── PILAR 2: PROXIMIDADE DE CORPOS HÍDRICOS (FATOR DE TRANSBORDAMENTO) ───
    // - Menos de 500m de um rio/córrego: multiplica o risco por 1.8x
    // - Mais de 2km de qualquer bacia e em área elevada: impacto reduzido para zero
    const riverInfo = getMinDistanceToRivers(lat, lon);
    const riverDist = riverInfo.distance;
    let riverMultiplier = 1.0;

    if (riverDist < 500) {
        riverMultiplier = 1.80; // 1.8x
    } else if (riverDist <= 1200) {
        riverMultiplier = 1.80 - ((riverDist - 500) / 700.0) * 0.55;
    } else if (riverDist <= 2000) {
        riverMultiplier = 1.25 - ((riverDist - 1200) / 800.0) * 0.25;
    } else {
        // Mais de 2km do rio
        riverMultiplier = alt >= 765 ? 0.85 : 1.00;
    }

    // ─── PILAR 4: HISTÓRICO DO LOCAL (FATOR DE INCIDÊNCIA DEFESA CIVIL / CGE) ─
    // Se rua/bairro tem histórico crônico E há chuva (ou previsão): +25% fixos
    const chronicInfo = checkChronicFloodZone(lat, lon);
    let historyBonus = 0;
    if (chronicInfo.isChronic && (rainMm >= 0.25 || prob > 30 || simulatedScenario !== 'real' || acc24h > 15)) {
        historyBonus = 25; // +25% fixos
    }

    // ─── EQUAÇÃO MULTIFATORIAL FINAL ──────────────────────────────────────────
    // Combinação: (Base Meteorológica × Multiplicador Topográfico × Multiplicador Hidrográfico) + Bônus Histórico
    let calculatedRisk = (meteorologicalBase * topoMultiplier * riverMultiplier) + historyBonus;

    // Em tempestades extremas em pontos baixos colados a rios com histórico ruim, garante teto crítico
    if (rainMm >= 25 && riverDist < 500 && alt <= 730) {
        calculatedRisk = Math.max(96, calculatedRisk);
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
function updateMapMarker(lat, lon, nome, analysis, alt, latParam, lonParam) {
    if (!map) return;

    // Remove camadas anteriores
    if (activeMarker) map.removeLayer(activeMarker);
    if (activeRiskCircle) map.removeLayer(activeRiskCircle);

    const risk = analysis.maxForecastRisk;
    const color = getRiskColor(risk);
    const altInfo = getAltitudeClassification(alt);
    const riverInfo = getMinDistanceToRivers(lat, lon);
    const chronicInfo = checkChronicFloodZone(lat, lon);

    // Ícone dinâmico espaçoso, elegante e com porcentagem 100% visível
    const iconHtml = `
        <div style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${color}; opacity: 0.35; animation: pulse-dot-anim 1.8s infinite;"></div>
            <div style="width: 46px; height: 46px; border-radius: 50%; background: ${color}; border: 3px solid #FFFFFF; box-shadow: 0 4px 18px rgba(0,0,0,0.5), 0 0 16px ${color}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFFFFF; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; user-select: none;">
                <span style="font-size: 13px; font-weight: 900; line-height: 1; text-shadow: 0 1px 3px rgba(0,0,0,0.7);">${risk}%</span>
                <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.95; margin-top: 1px;">RISCO</span>
            </div>
        </div>
    `;

    const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [56, 56], iconAnchor: [28, 28] });

    // Círculo de calor / zona de influência proporcional ao risco
    const radius = risk >= 75 ? 450 : (risk >= 50 ? 320 : 200);
    activeRiskCircle = L.circle([lat, lon], {
        radius: radius,
        color: color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '5, 5'
    }).addTo(map);

    // Marcador com Popup rico com os 4 Pilares
    const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 6px; min-width: 220px;">
            <div style="font-size: 15px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">${nome}</div>
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
    map.flyTo([lat, lon], 15, { duration: 1.0, easeLinearity: 0.25 });
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

// ─── CONFIGURAR BUSCA UNIVERSAL COM AUTOCOMPLETE E NOMINATIM ──────────────────
function setupSearchListeners() {
    const input = document.getElementById('universal-search-input');
    const dropdown = document.getElementById('universal-search-dropdown');
    const clearBtn = document.getElementById('btn-search-clear');

    if (!input) return;

    input.addEventListener('input', () => {
        const val = input.value.trim();
        clearBtn.style.display = val.length > 0 ? 'block' : 'none';

        if (val.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const localResults = filterLocalNeighborhoods(val);
            renderSearchDropdown(localResults);

            // Se tiver poucos resultados locais, busca na API do Nominatim/OSM
            if (localResults.length < 4 && val.length >= 3) {
                const nominatimResults = await searchNominatim(val);
                const merged = [...localResults, ...nominatimResults].slice(0, 8);
                renderSearchDropdown(merged);
            }
        }, 220);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const firstItem = dropdown.querySelector('.search-item');
            if (firstItem) firstItem.click();
        }
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box-wrapper')) {
            dropdown.style.display = 'none';
        }
    });
}

function filterLocalNeighborhoods(query) {
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return SP_NEIGHBORHOODS.filter(n => {
        const nome = n.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const bairro = n.bairro.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nome.includes(q) || bairro.includes(q);
    });
}

async function searchNominatim(query) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' São Paulo')}&limit=5&countrycodes=br&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        const data = await res.json();
        return data.map(item => ({
            nome: item.display_name.split(',')[0],
            bairro: item.display_name.split(',').slice(1, 3).join(',').trim(),
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            alt: 730,
            icon: "🔍"
        }));
    } catch (_) {
        return [];
    }
}

function renderSearchDropdown(results) {
    const dropdown = document.getElementById('universal-search-dropdown');
    if (!dropdown) return;

    if (results.length === 0) {
        dropdown.innerHTML = `<div style="padding: 12px; font-size: 12px; color: #94A3B8; text-align: center;">Nenhum local encontrado em SP. Tente outro termo.</div>`;
        dropdown.style.display = 'block';
        return;
    }

    dropdown.innerHTML = results.map(item => `
        <div class="search-item" onclick="selectSearchResult(${item.lat}, ${item.lon}, '${escapeHtml(item.nome)}', '${escapeHtml(item.bairro)}', ${item.alt !== undefined ? item.alt : 'null'})">
            <span style="font-size: 16px;">${item.icon || '📍'}</span>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 700; font-size: 13px; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${item.nome}
                </div>
                <div style="font-size: 11px; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${item.bairro}
                </div>
            </div>
            <span style="font-size: 10px; color: #38BDF8; font-weight: 700;">CALCULAR</span>
        </div>
    `).join('');

    dropdown.style.display = 'block';
}

function selectSearchResult(lat, lon, nome, bairro, alt = null) {
    document.getElementById('universal-search-input').value = nome;
    document.getElementById('universal-search-dropdown').style.display = 'none';
    analyzePoint(lat, lon, nome, bairro, alt);
}

function clearSearchInput() {
    document.getElementById('universal-search-input').value = '';
    document.getElementById('btn-search-clear').style.display = 'none';
    document.getElementById('universal-search-dropdown').style.display = 'none';
}

// ─── REVERSE GEOCODING (COORDENADA -> NOME DO BAIRRO) ─────────────────────────
async function reverseGeocode(lat, lon) {
    // Procura na base local mais próximo
    let closest = null;
    let minDist = 999999;
    for (const n of SP_NEIGHBORHOODS) {
        const d = Math.hypot(n.lat - lat, n.lon - lon);
        if (d < minDist) { minDist = d; closest = n; }
    }

    if (closest && minDist < 0.008) {
        return { nome: closest.nome, bairro: closest.bairro, alt: closest.alt };
    }

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        const data = await res.json();
        const address = data.address || {};
        const road = address.road || address.suburb || address.neighbourhood || "Região de SP";
        const suburb = address.suburb || address.city_district || "São Paulo - SP";
        return { nome: road, bairro: suburb, alt: 730 };
    } catch (_) {
        return { nome: `Local (${lat.toFixed(4)}, ${lon.toFixed(4)})`, bairro: "São Paulo - SP", alt: 730 };
    }
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

// ─── AUTOCOMPLETE DA ABA DE ROTAS ─────────────────────────────────────────────
function setupRouteAutocomplete() {
    const setupField = (inputId, dropdownId) => {
        const input = document.getElementById(inputId);
        const dd = document.getElementById(dropdownId);
        if (!input || !dd) return;

        input.addEventListener('input', () => {
            const val = input.value.trim();
            if (val.length < 2) { dd.style.display = 'none'; return; }
            const results = filterLocalNeighborhoods(val).slice(0, 5);
            dd.innerHTML = results.map(r => `
                <div class="search-item" onclick="document.getElementById('${inputId}').value='${r.nome}'; document.getElementById('${dropdownId}').style.display='none';">
                    <span>${r.icon || '📍'}</span>
                    <div style="font-size: 12px; color: #fff;">${r.nome} <small style="color:#94A3B8;">(${r.bairro})</small></div>
                </div>
            `).join('');
            dd.style.display = 'block';
        });
    };

    setupField('route-origem', 'route-origem-dropdown');
    setupField('route-destino', 'route-destino-dropdown');
}

function useCurrentLocationForRoute() {
    if (!navigator.geolocation) {
        alert("Geolocalização não suportada.");
        return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
        document.getElementById('route-origem').value = `Minha Localização (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
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

    const [origem, destino] = await Promise.all([
        resolveLocation(origemVal),
        resolveLocation(destinoVal)
    ]);

    if (!origem || !destino) {
        alert("Não foi possível localizar um dos endereços informados.");
        return;
    }

    processRouteTrajectory(origem, destino, false);
}

function runFecapDemoRoute() {
    switchDashboardTab('rota');
    document.getElementById('route-origem').value = "FECAP — Campus Liberdade";
    document.getElementById('route-destino').value = "Viaduto do Chá / Anhangabaú";

    const origem = { lat: -23.5574, lon: -46.6367, nome: "FECAP — Campus Liberdade" };
    const destino = { lat: -23.5475, lon: -46.6378, nome: "Viaduto do Chá / Anhangabaú" };
    processRouteTrajectory(origem, destino, true);
}

async function resolveLocation(query) {
    const local = SP_NEIGHBORHOODS.find(n => n.nome.toLowerCase().includes(query.toLowerCase()));
    if (local) return local;

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' São Paulo')}&limit=1&countrycodes=br`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        const data = await res.json();
        if (data.length > 0) {
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), nome: data[0].display_name.split(',')[0] };
        }
    } catch (_) {}
    return null;
}

function processRouteTrajectory(origem, destino, isDemo) {
    // Limpa rota anterior
    routeLayers.forEach(l => { try { map.removeLayer(l); } catch(_) {} });
    routeLayers = [];

    const SAMPLES = 30;
    const pts = [];
    for (let i = 0; i <= SAMPLES; i++) {
        const t = i / SAMPLES;
        pts.push({
            lat: origem.lat + (destino.lat - origem.lat) * t,
            lon: origem.lon + (destino.lon - origem.lon) * t
        });
    }

    // Identifica interseções com pontos críticos conhecidos (ex: Baixada do Glicério / Anhangabaú)
    const dangerousPoints = [
        { nome: "Baixada do Glicério", lat: -23.5592, lon: -46.6288, risk: 85, nivel: "Crítico" },
        { nome: "Viaduto do Chá / Anhangabaú", lat: -23.5475, lon: -46.6378, risk: 78, nivel: "Crítico" },
        { nome: "Av. do Estado", lat: -23.5528, lon: -46.6268, risk: 65, nivel: "Alto" }
    ];

    const detectedDangers = [];
    const segRisks = [];

    for (let i = 0; i < pts.length - 1; i++) {
        const midLat = (pts[i].lat + pts[i + 1].lat) / 2;
        const midLon = (pts[i].lon + pts[i + 1].lon) / 2;

        let segDanger = null;
        for (const dp of dangerousPoints) {
            const dist = Math.hypot(midLat - dp.lat, midLon - dp.lon);
            const threshold = isDemo ? 0.007 : 0.004;
            if (dist < threshold) {
                segDanger = dp;
                if (!detectedDangers.find(d => d.nome === dp.nome)) detectedDangers.push(dp);
            }
        }
        segRisks.push(segDanger);
    }

    // Desenha Linha de Rota
    for (let i = 0; i < pts.length - 1; i++) {
        const danger = segRisks[i];
        const color = danger ? (danger.risk >= 75 ? '#EF4444' : '#F97316') : '#10B981';
        const weight = danger ? 7 : 5;

        const seg = L.polyline([[pts[i].lat, pts[i].lon], [pts[i + 1].lat, pts[i + 1].lon]], {
            color,
            weight,
            opacity: 0.95
        }).addTo(map);
        routeLayers.push(seg);
    }

    // Marcador Partida e Destino
    const m1 = L.marker([origem.lat, origem.lon]).addTo(map).bindPopup(`<b>🚀 Partida:</b> ${origem.nome}`);
    const m2 = L.marker([destino.lat, destino.lon]).addTo(map).bindPopup(`<b>🏁 Destino:</b> ${destino.nome}`);
    routeLayers.push(m1, m2);

    // Ajusta visualização do mapa para a rota
    map.fitBounds([[Math.min(origem.lat, destino.lat) - 0.005, Math.min(origem.lon, destino.lon) - 0.005], [Math.max(origem.lat, destino.lat) + 0.005, Math.max(origem.lon, destino.lon) + 0.005]]);

    // Renderiza Card de Alerta de Rota
    const alertBox = document.getElementById('route-alert-box');
    if (detectedDangers.length > 0) {
        const worst = detectedDangers[0];
        alertBox.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 10px; padding: 12px; font-size: 12px; color: #FCA5A5; line-height: 1.5;">
                🚨 <strong>Atenção:</strong> Seu trajeto passa por <strong>${detectedDangers.length} ponto(s) de risco crítico</strong> (${worst.nome} - Risco ${worst.risk}%).<br>
                <span style="color: #E2E8F0; margin-top: 4px; display: block;">Recomendamos alterar a rota ou evitar este trecho durante chuvas intensas.</span>
            </div>
        `;
    } else {
        alertBox.innerHTML = `
            <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 10px; padding: 12px; font-size: 12px; color: #6EE7B7; line-height: 1.5;">
                ✅ <strong>Trajeto Seguro:</strong> Nenhum ponto de alagamento detectado no caminho entre ${origem.nome} e ${destino.nome}.
            </div>
        `;
    }
    alertBox.style.display = 'block';
}

// ─── BOTÕES DE CONTROLE RÁPIDO DO MAPA ────────────────────────────────────────
function flyToSaoPauloCenter() {
    if (map) map.flyTo([-23.5505, -46.6333], 13, { duration: 1.2 });
}

function flyToFECAP() {
    selectSearchResult(-23.5574, -46.6367, "FECAP — Campus Liberdade", "Liberdade", 735);
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
