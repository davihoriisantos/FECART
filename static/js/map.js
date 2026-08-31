let map;
let zoneLayers = [];
let historicoLayers = [];
let heatLayer;

// ─── Configurações de Limiar de Chuva — Escala Meteorológica Oficial (mm/h) ───
const RAIN_THRESHOLDS = [2.5, 10, 30]; // mm/h — <2.5 Fraca, 2.5–10 Moderada, 10–30 Forte, >30 Tempestade
const RAIN_COLORS     = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
const RAIN_LABELS     = ['Chuva Fraca / Garoa', 'Chuva Moderada', 'Chuva Forte', 'Tempestade / Chuva Torrencial'];
const RAIN_MESSAGES   = [
    '',
    'Atenção: Acompanhe a evolução da chuva',
    'Alerta: Possibilidade de alagamentos em pontos baixos',
    'Alerta máximo de enchente! Procure refúgio imediato.'
];

// ─── Cache de dados de chuva para não repetir chamadas ────────────────────────
const rainCache = {};

async function fetchRain(lat, lon) {
    const key = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
    if (rainCache[key] !== undefined) return rainCache[key];

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=rain&timezone=America%2FSao_Paulo&past_days=3`;
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        const now = new Date();
        const times = data.hourly.time;
        const rains = data.hourly.rain;
        let currentIdx = times.findIndex(t => {
            const d = new Date(t);
            return d.getDate() === now.getDate() && d.getHours() === now.getHours();
        });
        if (currentIdx === -1) currentIdx = times.length - 1;
        
        const currentRain = rains[currentIdx] ?? 0;
        let acc3h = 0;
        let acc24h = 0;
        let acc72h = 0;
        
        for (let i = 0; i < 72; i++) {
            const idx = currentIdx - i;
            if (idx >= 0 && rains[idx] !== null) {
                acc72h += rains[idx];
                if (i < 24) acc24h += rains[idx];
                if (i < 3) acc3h += rains[idx];
            }
        }

        const result = { current: currentRain, acc3h, acc24h, acc72h };
        rainCache[key] = result;
        return result;
    } catch (e) {
        console.warn('Erro ao buscar chuva para', key, e);
        const fallback = { current: 0, acc3h: 0, acc24h: 0, acc72h: 0 };
        rainCache[key] = fallback;
        return fallback;
    }
}

// ─── Calcula risco geral considerando encharcamento do solo ───────────────────
function calcularRiscoGeral(rainData, ponto = null) {
    let effectiveRain = rainData.current;

    const riskPercentage = calcularPorcentagemRisco(rainData.current, rainData.acc24h, ponto, 100);
    const dynamicColor = getRiskColor(riskPercentage);

    // Regra de acúmulo: >40mm em 3h = Crítico direto
    if (rainData.acc3h !== undefined && rainData.acc3h > 40) {
        return { nivel: 'Crítico', cor: dynamicColor, label: RAIN_LABELS[3], mensagem: RAIN_MESSAGES[3], riskPercentage };
    }

    // Fator de encharcamento do solo (reduzido para não inflar chuvas fracas)
    if (rainData.acc72h > 50 || rainData.acc24h > 30) {
        effectiveRain += 5;     // Penalidade moderada por solo saturado
        effectiveRain *= 1.2;   // Multiplicador conservador
    }

    // Fator Geográfico (Altitude e Proximidade do Rio) — reduzido
    if (ponto && ponto.distancia_rio_m !== undefined && ponto.altitude_m !== undefined) {
        let fatorGeo = 1.0;

        // Quanto mais perto do rio, maior o multiplicador (valores reduzidos)
        if (ponto.distancia_rio_m <= 50) fatorGeo += 0.2;
        else if (ponto.distancia_rio_m <= 150) fatorGeo += 0.1;

        // Altitudes menores em SP (fundo de vale) aumentam o risco (valores reduzidos)
        if (ponto.altitude_m <= 725) fatorGeo += 0.15;
        else if (ponto.altitude_m <= 735) fatorGeo += 0.08;

        effectiveRain *= fatorGeo;
    }

    // Classificação por faixa — Escala Meteorológica Oficial (mm/h)
    if (effectiveRain < RAIN_THRESHOLDS[0]) {
        return { nivel: 'Baixo', cor: dynamicColor, label: RAIN_LABELS[0], mensagem: RAIN_MESSAGES[0], riskPercentage };
    }
    if (effectiveRain < RAIN_THRESHOLDS[1]) {
        return { nivel: 'Moderado', cor: dynamicColor, label: RAIN_LABELS[1], mensagem: RAIN_MESSAGES[1], riskPercentage };
    }
    if (effectiveRain < RAIN_THRESHOLDS[2]) {
        return { nivel: 'Alto', cor: dynamicColor, label: RAIN_LABELS[2], mensagem: RAIN_MESSAGES[2], riskPercentage };
    }
    return { nivel: 'Crítico', cor: dynamicColor, label: RAIN_LABELS[3], mensagem: RAIN_MESSAGES[3], riskPercentage };
}

// ─── Calcula risco real cruzando histórico + chuva atual/acumulada ───────────
function calcularRiscoReal(ponto, rainData) {
    const riscoBase = calcularRiscoGeral(rainData, ponto);
    const nivelChuva = riscoBase.nivel;
    const historico_severidade = ponto.historico_severidade;
    
    const riskPercentage = calcularPorcentagemRisco(rainData.current, rainData.acc24h, ponto, 100);
    const dynamicColor = getRiskColor(riskPercentage);

    // Matriz de risco composta: histórico × chuva efetiva
    if (historico_severidade === 'Crítico') {
        if (nivelChuva === 'Crítico' || nivelChuva === 'Alto') return { nivel: 'EMERGÊNCIA', cor: dynamicColor, alerta: true, label: RAIN_LABELS[3], mensagem: RAIN_MESSAGES[3], riskPercentage };
        if (nivelChuva === 'Moderado') return { nivel: 'Crítico', cor: dynamicColor, alerta: true, label: riscoBase.label, mensagem: riscoBase.mensagem, riskPercentage };
        return { nivel: 'Alto (Histórico)', cor: dynamicColor, alerta: false, label: riscoBase.label, mensagem: riscoBase.mensagem, riskPercentage };
    }
    if (historico_severidade === 'Alto') {
        if (nivelChuva === 'Crítico') return { nivel: 'Crítico', cor: dynamicColor, alerta: true, label: riscoBase.label, mensagem: riscoBase.mensagem, riskPercentage };
        if (nivelChuva === 'Alto') return { nivel: 'Alto', cor: dynamicColor, alerta: false, label: riscoBase.label, mensagem: riscoBase.mensagem, riskPercentage };
        return { nivel: 'Moderado (Histórico)', cor: dynamicColor, alerta: false, label: riscoBase.label, mensagem: riscoBase.mensagem, riskPercentage };
    }
    if (historico_severidade === 'Moderado') {
        if (nivelChuva === 'Crítico') return { nivel: 'Alto', cor: dynamicColor, alerta: false, label: riscoBase.label, mensagem: riscoBase.mensagem, riskPercentage };
        if (nivelChuva === 'Alto') return { nivel: 'Moderado', cor: dynamicColor, alerta: false, label: riscoBase.label, mensagem: riscoBase.mensagem, riskPercentage };
        return { nivel: 'Baixo', cor: dynamicColor, alerta: false, label: riscoBase.label, mensagem: riscoBase.mensagem, riskPercentage };
    }
    // severidade Baixo
    return { nivel: nivelChuva, cor: dynamicColor, alerta: false, label: riscoBase.label, mensagem: riscoBase.mensagem, riskPercentage };
}

// ─── Ícone personalizado para marcadores de histórico ────────────────────────
function criarIconeHistorico(cor, alerta) {
    const pulso = alerta
        ? `<div style="position:absolute;top:-4px;left:-4px;width:30px;height:30px;border-radius:50%;background:${cor};opacity:0.35;animation:pulse-hist 1.4s infinite;"></div>`
        : '';
    const emoji = alerta ? '⚠️' : '📍';
    const html = `
        <div style="position:relative;text-align:center;width:22px;">
            ${pulso}
            <div style="width:22px;height:22px;border-radius:50%;background:${cor};border:2px solid rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 0 8px ${cor}99;">
                ${emoji}
            </div>
        </div>`;
    return L.divIcon({ className: '', html, iconSize: [22, 22], iconAnchor: [11, 11] });
}

// ─── Popup HTML para ponto de histórico ──────────────────────────────────────
function popupHistorico(ponto, rainData, risco, confirmCount) {
    const alertaBanner = risco.alerta
        ? `<div style="background:#dc2626;color:#fff;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-weight:700;font-size:13px;">
               ⚠️ ÁREA COM HISTÓRICO RECORRENTE DE ENCHENTE<br>
               <span style="font-weight:400;font-size:12px;">Solo saturado / Chuva intensa + histórico crítico confirmado.</span>
           </div>`
        : '';

    const dynColor = risco.cor || '#94a3b8';
    const dynPct = risco.riskPercentage !== undefined ? risco.riskPercentage : '--';
    
    // Indicador de solo encharcado
    const soloSaturado = (rainData.acc72h > 50 || rainData.acc24h > 30) 
        ? `<span style="background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b55;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">⚠️ Solo Saturado</span>`
        : '';

    return `
        <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:240px;max-width:280px; border: 2px solid ${dynColor}; border-radius: 8px; padding: 12px; background: #fff; box-sizing: border-box; margin: -14px; /* remove default padding do leaflet */">
            ${alertaBanner}
            <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:4px;">${ponto.nome}</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:10px;">📍 ${ponto.bairro} · Fonte: ${ponto.fonte}</div>
            
            <div style="background:${dynColor}22; color:#0f172a; border-left: 4px solid ${dynColor}; padding:8px 10px; border-radius:4px; margin-bottom:10px;">
                <div style="font-size:14px; font-weight:800;">Risco Preditivo: ${dynPct}%</div>
                <div style="font-size:12px; font-weight:600; color:#475569;">Nível: ${risco.nivel}</div>
            </div>

            <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                <span style="background:#0ea5e922;color:#0ea5e9;border:1px solid #0ea5e955;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">
                    💧 Chuva Atual: ${rainData.current.toFixed(1)} mm/h
                </span>
                ${soloSaturado}
            </div>
            ${risco.mensagem ? `<div style="font-size:12px;color:#0f172a;font-weight:700;margin-bottom:10px;padding:6px 10px;background:#f1f5f9;border-left: 3px solid ${dynColor};border-radius:4px;">⚡ ${risco.mensagem}</div>` : ''}
            <div style="border-top:1px solid #e2e8f0;padding-top:8px;margin-top:4px;">
                <div style="font-size:12px;color:#475569;margin-bottom:6px;"><b>Geografia:</b> Altitude: ${ponto.altitude_m}m | Dist. Rio: ${ponto.distancia_rio_m}m</div>
                <div style="font-size:12px;color:#475569;margin-bottom:6px;"><b>Acumulados:</b> 24h: ${rainData.acc24h.toFixed(1)} mm | 72h: ${rainData.acc72h.toFixed(1)} mm</div>
                <div style="font-size:12px;color:#475569;margin-bottom:6px;"><b>Histórico (Defesa Civil):</b></div>
                <div style="font-size:12px;color:#64748b;margin-bottom:6px;">${ponto.descricao}</div>
                <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">
                    🔁 Ocorrências/ano: <b style="color:#0f172a;">${ponto.ocorrencias_anuais}</b> &nbsp;|&nbsp;
                    Severidade histórica: <b style="color:#0f172a;">${ponto.historico_severidade}</b>
                </div>
                <div style="background:#f1f5f9;border-radius:6px;padding:8px;text-align:center;">
                    <div style="font-size:11px;color:#475569;margin-bottom:6px;font-weight:600;">
                        👥 <span id="count-${ponto.id}">${confirmCount}</span> confirmações nas últimas 6h
                    </div>
                    <button onclick="confirmarAlagamento('${ponto.id}')" style="background:#0f172a;color:#fff;border-radius:4px;width:100%;padding:8px;font-size:12px;border:none;cursor:pointer;font-weight:700;">
                        🚨 Confirmar Alagamento Aqui
                    </button>
                </div>
            </div>
        </div>`;
}

window.confirmarAlagamento = async function(pointId) {
    try {
        await API.post(`/api/confirmations/${pointId}`, {});
        const countSpan = document.getElementById(`count-${pointId}`);
        if (countSpan) {
            let current = parseInt(countSpan.innerText) || 0;
            countSpan.innerText = current + 1;
        }
        alert("Obrigado! Sua confirmação ajuda a alertar outras pessoas em tempo real.");
    } catch (e) {
        console.error(e);
        alert("Você precisa estar logado no sistema para confirmar.");
    }
};

// ─── Monta camada de Histórico Defesa Civil no mapa ──────────────────────────
async function renderizarHistoricoDefesaCivil() {
    // Animação de pulso para marcadores críticos
    if (!document.getElementById('pulse-hist-style')) {
        const style = document.createElement('style');
        style.id = 'pulse-hist-style';
        style.textContent = `
            @keyframes pulse-hist {
                0%   { transform: scale(0.8); opacity: 0.6; }
                70%  { transform: scale(1.8); opacity: 0; }
                100% { transform: scale(0.8); opacity: 0; }
            }`;
        document.head.appendChild(style);
    }

    // Busca chuva para todos os pontos em paralelo
    const rainPromises = HISTORICO_DEFESA_CIVIL.map(p => fetchRain(p.lat, p.lon));
    const rains = await Promise.all(rainPromises);

    // Busca contagem de confirmações
    let counts = {};
    try {
        const res = await API.get('/api/confirmations/counts');
        counts = res.counts || {};
    } catch (e) {
        console.warn('Erro ao buscar contagens de confirmação', e);
    }

    HISTORICO_DEFESA_CIVIL.forEach((ponto, i) => {
        const rainData = rains[i];
        const risco  = calcularRiscoReal(ponto, rainData);
        const icone  = criarIconeHistorico(risco.cor, risco.alerta);
        const count  = counts[ponto.id] || 0;
        const popup  = popupHistorico(ponto, rainData, risco, count);

        // Círculo pontilhado de risco para cada região de SP
        const circleRadius = ponto.historico_severidade === 'Crítico' ? 300 : (ponto.historico_severidade === 'Alto' ? 240 : 180);
        const circleZone = L.circle([ponto.lat, ponto.lon], {
            radius: circleRadius,
            color: risco.cor,
            fillColor: risco.cor,
            fillOpacity: 0.20,
            weight: 2.5,
            dashArray: '6, 6'
        }).addTo(map).bindPopup(popup, { maxWidth: 300 });
        zoneLayers.push(circleZone);

        const marker = L.marker([ponto.lat, ponto.lon], { icon: icone })
            .addTo(map)
            .bindPopup(popup, { maxWidth: 300 });

        historicoLayers.push({ marker, circleZone, ponto, risco });
    });
}

// ─── Inicializa o mapa ────────────────────────────────────────────────────────
async function initMap() {
    // Focado no entorno da FECAP (Liberdade e Centro Histórico)
    map = L.map('map').setView([-23.5545, -46.6330], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    try {
        // 1. Camada de Zonas do Sistema (Convertidas em Círculos Pontilhados)
        const zones = await API.get('/api/zones');
        for (const zone of zones) {
            const rainData = await fetchRain(zone.latitude_centro, zone.longitude_centro);
            const riscoGeral = calcularRiscoGeral(rainData);
            const color = riscoGeral.cor;
            const level = riscoGeral.nivel;
            const rec   = level === 'Baixo' ? 'Sem ação necessária.' :
                          level === 'Moderado' ? 'Evite áreas propensas a alagamento.' :
                          level === 'Alto' ? 'Evite áreas baixas.' : 'Procure refúgio imediato.';
            const labelText = riscoGeral.label || '';
            const riskPct = riscoGeral.riskPercentage !== undefined ? riscoGeral.riskPercentage : '--';
            const popupText = `<div style="border: 2px solid ${color}; border-radius: 8px; padding: 12px; font-family:'Plus Jakarta Sans',sans-serif; min-width: 200px; box-sizing: border-box; margin: -14px;">
                <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:8px;">${zone.nome}</div>
                <div style="background:${color}22; color:#0f172a; border-left: 4px solid ${color}; padding:8px 10px; border-radius:4px; margin-bottom:10px;">
                    <div style="font-size:14px; font-weight:800;">Risco Preditivo: ${riskPct}%</div>
                    <div style="font-size:12px; font-weight:600; color:#475569;">Nível: ${level}</div>
                </div>
                <div style="font-size:12px; color:#475569; margin-bottom: 6px;">💧 Chuva Atual: ${rainData.current.toFixed(1)} mm/h</div>
                <div style="font-size:12px; color:#475569; margin-bottom: 10px;">🌧️ Acumulado 24h: ${rainData.acc24h.toFixed(1)} mm</div>
                ${riscoGeral.mensagem ? `<div style="font-size:12px;color:#0f172a;font-weight:700;margin-bottom:10px;padding:6px 10px;background:#f1f5f9;border-left: 3px solid ${color};border-radius:4px;">⚡ ${riscoGeral.mensagem}</div>` : ''}
                <div style="font-size:12px; font-weight:600; color:#475569;">🛡️ ${rec}</div>
            </div>`;

            // Círculo Pontilhado em vez de polígono quadrado
            const layer = L.circle([zone.latitude_centro, zone.longitude_centro], {
                radius: zone.raio_metros || 220,
                color: color,
                fillColor: color,
                fillOpacity: 0.22,
                weight: 2.5,
                dashArray: '6, 6'
            }).addTo(map).bindPopup(popupText);
            zoneLayers.push(layer);
        }

        // 2. Camada de Sensores
        const sensors = await API.get('/api/sensors');
        sensors.forEach(sensor => {
            L.circleMarker([sensor.latitude, sensor.longitude],
                { radius: 7, color: '#38BDF8', fillColor: '#38BDF8', fillOpacity: 1 })
                .addTo(map)
                .bindPopup(`<b>${sensor.nome}</b><br>Tipo: ${sensor.tipo}`);
        });

        // 3. Camada de Histórico — Defesa Civil SP
        await renderizarHistoricoDefesaCivil();

        // 4. Inicializa o Painel Lateral Retrátil (Sidebar & Gráfico)
        initSidebarController();

        // 5. Botões de simulação do mapa
        document.getElementById('btn-enchente')?.addEventListener('click', () => {
            zoneLayers.forEach(l => l.setStyle({ color: 'red', fillColor: 'red' }));
        });
        document.getElementById('btn-limpo')?.addEventListener('click', () => {
            zoneLayers.forEach(l => l.setStyle({ color: '#22c55e', fillColor: '#22c55e' }));
        });

    } catch (e) {
        console.error('Erro ao carregar mapa', e);
    }
}

// ─── GERENCIADOR DO PAINEL LATERAL RETRÁTIL & GRÁFICO DE RISCO (24H + 3H) ─────

let riskTrendChart = null;
let currentSidebarPointId = 'sp_media';
let currentSimulatedForecastScenario = null;
let cachedTimeSeriesData = null;

function toggleSidebar() {
    const sidebar = document.getElementById('risk-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    if (sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

function openSidebar() {
    const sidebar = document.getElementById('risk-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('active');

    // Carrega/atualiza os dados e o gráfico
    atualizarDadosSidebar(currentSidebarPointId);
}

function closeSidebar() {
    const sidebar = document.getElementById('risk-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
}

// Fecha no clique fora ou tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
});

// Inicializa controles da Sidebar (Preenche o Select de Pontos)
function initSidebarController() {
    const select = document.getElementById('sidebar-point-select');
    if (select && typeof HISTORICO_DEFESA_CIVIL !== 'undefined') {
        // Limpa opções antigas mantendo a média geral
        select.innerHTML = `<option value="sp_media">🌆 Média Geral — Região Metropolitana de SP</option>`;
        HISTORICO_DEFESA_CIVIL.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `📍 ${p.nome} (${p.bairro})`;
            select.appendChild(opt);
        });
    }
}

function onSidebarPointChange(pointId) {
    currentSidebarPointId = pointId;
    currentSimulatedForecastScenario = null; // reseta simulação ao trocar de ponto
    atualizarDadosSidebar(pointId);
}

// ─── Busca série horária (Passado 48h + Futuro 24h) da Open-Meteo ──────────────
async function fetchHourlyTimeSeries(lat = -23.5505, lon = -46.6333) {
    const key = `series_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    if (cachedTimeSeriesData && cachedTimeSeriesData[key]) {
        return cachedTimeSeriesData[key];
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=rain,precipitation_probability&timezone=America%2FSao_Paulo&past_days=2&forecast_days=2`;
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        const now = new Date();
        const times = data.hourly.time;
        const rains = data.hourly.rain;
        const probs = data.hourly.precipitation_probability || [];
        
        let currentIdx = times.findIndex(t => {
            const d = new Date(t);
            return d.getDate() === now.getDate() && d.getHours() === now.getHours();
        });
        if (currentIdx === -1) currentIdx = times.length - 10;
        
        const result = { times, rains, probs, currentIdx };
        if (!cachedTimeSeriesData) cachedTimeSeriesData = {};
        cachedTimeSeriesData[key] = result;
        return result;
    } catch (e) {
        console.warn("Erro ao buscar série horária de chuva:", e);
        return null;
    }
}

// ─── Calcula a Porcentagem de Risco (0 a 100%) para uma Hora Específica ────────
function calcularPorcentagemRisco(rainMm, acc24h, ponto = null, prob = 0) {
    let score = 5; // Base ambiental mínima

    // Contribuição da precipitação na hora
    if (rainMm <= 0.2) {
        score += (prob > 50 ? 10 : 2);
    } else if (rainMm < 2.5) {
        score += 8 + (rainMm / 2.5) * 16;       // 8% a 24% (Baixo)
    } else if (rainMm < 10) {
        score += 28 + ((rainMm - 2.5) / 7.5) * 20; // 28% a 48% (Moderado)
    } else if (rainMm < 30) {
        score += 52 + ((rainMm - 10) / 20) * 22;  // 52% a 74% (Alto)
    } else {
        score += 76 + Math.min(22, ((rainMm - 30) / 20) * 20); // 76% a 98% (Crítico)
    }

    // Contribuição da saturação do solo nas 24h anteriores
    if (acc24h > 30) score += 10;
    else if (acc24h > 15) score += 5;

    // Fator Geográfico e Histórico do Ponto
    if (ponto) {
        if (ponto.distancia_rio_m && ponto.distancia_rio_m <= 80) score += 8;
        else if (ponto.distancia_rio_m && ponto.distancia_rio_m <= 150) score += 4;

        if (ponto.altitude_m && ponto.altitude_m <= 725) score += 6;
        if (ponto.historico_severidade === 'Crítico') score += 8;
        else if (ponto.historico_severidade === 'Alto') score += 4;
    }

    return Math.max(2, Math.min(100, Math.round(score)));
}

// ─── Atualiza Dados, KPIs e Gráfico da Sidebar ────────────────────────────────
async function atualizarDadosSidebar(pointId) {
    let lat = -23.5505;
    let lon = -46.6333;
    let pontoObj = null;

    if (pointId !== 'sp_media' && typeof HISTORICO_DEFESA_CIVIL !== 'undefined') {
        pontoObj = HISTORICO_DEFESA_CIVIL.find(p => p.id === pointId);
        if (pontoObj) {
            lat = pontoObj.lat;
            lon = pontoObj.lon;
        }
    }

    const series = await fetchHourlyTimeSeries(lat, lon);
    if (!series) return;

    const { times, rains, probs, currentIdx } = series;

    // 1. Constrói os dados das últimas 24 horas (idx: currentIdx - 23 até currentIdx)
    const labels = [];
    const historyData = [];
    const forecastData = [];

    let acc24hAtual = 0;

    for (let i = 23; i >= 0; i--) {
        const idx = currentIdx - i;
        const timeStr = times[idx] || '';
        const d = new Date(timeStr);
        const hora = isNaN(d.getTime()) ? `${24 - i}h` : `${d.getHours().toString().padStart(2, '0')}h`;
        
        // Acumulado nas 24h antes desse instante
        let localAcc24h = 0;
        for (let j = 0; j < 24; j++) {
            if (idx - j >= 0) localAcc24h += (rains[idx - j] || 0);
        }

        const rainVal = (idx >= 0 && rains[idx] !== null) ? rains[idx] : 0;
        const probVal = (idx >= 0 && probs[idx] !== null) ? probs[idx] : 0;
        const riskPct = calcularPorcentagemRisco(rainVal, localAcc24h, pontoObj, probVal);

        labels.push(i === 0 ? `Agora (${hora})` : hora);
        historyData.push(riskPct);
        forecastData.push(null); // nulo no histórico

        if (i === 0) acc24hAtual = localAcc24h;
    }

    const currentRisk = historyData[historyData.length - 1];

    // O ponto de conexão: no momento "Agora", o forecast tem o mesmo valor do histórico
    forecastData[forecastData.length - 1] = currentRisk;

    // 2. Constrói a Previsão da IA para as Próximas 3 Horas (+1h, +2h, +3h)
    let forecastRainTotal = 0;
    const forecastRisks = [];

    for (let f = 1; f <= 3; f++) {
        const idx = currentIdx + f;
        const timeStr = times[idx] || '';
        const d = new Date(timeStr);
        const hora = isNaN(d.getTime()) ? `+${f}h` : `+${f}h (${d.getHours().toString().padStart(2, '0')}h)`;
        
        let rainVal = (idx < rains.length && rains[idx] !== null) ? rains[idx] : 0;
        let probVal = (idx < probs.length && probs[idx] !== null) ? probs[idx] : 0;

        // Se houver simulação ativa para a Fecart, sobrepõe os valores da previsão
        if (currentSimulatedForecastScenario === 'tempestade') {
            rainVal = f === 1 ? 15.0 : (f === 2 ? 25.0 : 18.0);
            probVal = 95;
        } else if (currentSimulatedForecastScenario === 'moderada') {
            rainVal = f === 1 ? 3.0 : (f === 2 ? 4.5 : 2.0);
            probVal = 70;
        }

        forecastRainTotal += rainVal;
        const riskPct = calcularPorcentagemRisco(rainVal, acc24hAtual + forecastRainTotal, pontoObj, probVal);

        labels.push(hora);
        historyData.push(null); // nulo na projeção futura
        forecastData.push(riskPct);
        forecastRisks.push(riskPct);
    }

    const maxForecastRisk = Math.max(...forecastRisks);

    // 3. Atualiza os KPIs na Interface
    const elCurrent = document.getElementById('sidebar-kpi-current');
    const elCurrentLabel = document.getElementById('sidebar-kpi-current-label');
    const elForecast = document.getElementById('sidebar-kpi-forecast');
    const elForecastTrend = document.getElementById('sidebar-kpi-forecast-trend');
    const elAcc24h = document.getElementById('sidebar-kpi-acc24h');
    const elRainForecast = document.getElementById('sidebar-kpi-rain-forecast');

    if (elCurrent) {
        elCurrent.textContent = `${currentRisk}%`;
        elCurrent.style.color = getRiskColorByPercent(currentRisk);
    }
    if (elCurrentLabel) {
        elCurrentLabel.textContent = getRiskLabelByPercent(currentRisk);
    }

    if (elForecast) {
        elForecast.textContent = `${maxForecastRisk}%`;
        elForecast.style.color = getRiskColorByPercent(maxForecastRisk);
    }
    if (elForecastTrend) {
        const diff = maxForecastRisk - currentRisk;
        if (diff > 5) {
            elForecastTrend.innerHTML = `<span style="color:#EF4444;">↗️ Tendência Alta (+${diff}%)</span>`;
        } else if (diff < -5) {
            elForecastTrend.innerHTML = `<span style="color:#10B981;">↘️ Tendência Queda (${diff}%)</span>`;
        } else {
            elForecastTrend.innerHTML = `<span style="color:#38BDF8;">➡️ Estabilidade (+0%)</span>`;
        }
    }

    if (elAcc24h) elAcc24h.textContent = `${acc24hAtual.toFixed(1)} mm`;
    if (elRainForecast) elRainForecast.textContent = `+${forecastRainTotal.toFixed(1)} mm`;

    // 4. Atualiza o Diagnóstico IA
    const elInsightText = document.getElementById('sidebar-ai-insight-text');
    if (elInsightText) {
        if (maxForecastRisk >= 75) {
            elInsightText.innerHTML = `🚨 <strong style="color:#FCA5A5;">ALERTA MÁXIMO DA IA:</strong> Projeção de acúmulo hídrico crítico nas próximas 3 horas (+${forecastRainTotal.toFixed(1)}mm). Risco de inundação severa estimado em <strong>${maxForecastRisk}%</strong>. Aconselha-se evacuação preventiva das áreas baixas.`;
        } else if (maxForecastRisk >= 50) {
            elInsightText.innerHTML = `⚠️ <strong style="color:#FDBA74;">ATENÇÃO ELEVADA:</strong> Modelo preditivo detectou probabilidade de alagamento pontual (${maxForecastRisk}%) com chuva esperada de +${forecastRainTotal.toFixed(1)}mm. Monitoramento ativo em cursos d'água.`;
        } else if (maxForecastRisk >= 30) {
            elInsightText.innerHTML = `🟡 <strong style="color:#FDE047;">MONITORAMENTO MODERADO:</strong> Variação de risco estável em ${maxForecastRisk}%. Sem expectativa de transbordamentos imediatos nas próximas 3h.`;
        } else {
            elInsightText.innerHTML = `✅ <strong style="color:#6EE7B7;">CONDIÇÃO FAVORÁVEL:</strong> Sem previsão de chuva significativa nas próximas 3 horas (+${forecastRainTotal.toFixed(1)}mm). O índice de risco permanece seguro em ${maxForecastRisk}%.`;
        }
    }

    // 5. Renderiza/Atualiza o Gráfico Chart.js
    renderRiskTrendChart(labels, historyData, forecastData, maxForecastRisk);
}

// ─── Renderizador do Gráfico de Linha Chart.js ────────────────────────────────
function renderRiskTrendChart(labels, historyData, forecastData, maxForecastRisk) {
    const canvas = document.getElementById('riskTrendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (riskTrendChart) {
        riskTrendChart.destroy();
    }

    // Gradiente para a linha de histórico (Azul Ciano)
    const gradientHistory = ctx.createLinearGradient(0, 0, 0, 200);
    gradientHistory.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    gradientHistory.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    // Gradiente para a linha de previsão (Âmbar / Laranja ou Vermelho)
    const forecastColor = maxForecastRisk >= 75 ? '#EF4444' : (maxForecastRisk >= 50 ? '#F97316' : '#F59E0B');
    const gradientForecast = ctx.createLinearGradient(0, 0, 0, 200);
    gradientForecast.addColorStop(0, maxForecastRisk >= 75 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.3)');
    gradientForecast.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    riskTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Histórico Real (24h)',
                    data: historyData,
                    borderColor: '#38BDF8',
                    backgroundColor: gradientHistory,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.3,
                    pointRadius: (ctx) => {
                        const index = ctx.dataIndex;
                        // Destaca o ponto "Agora"
                        return index === 23 ? 5 : 2;
                    },
                    pointBackgroundColor: (ctx) => {
                        const index = ctx.dataIndex;
                        return index === 23 ? '#FFFFFF' : '#38BDF8';
                    },
                    pointBorderColor: '#38BDF8',
                    pointBorderWidth: 2,
                    spanGaps: false
                },
                {
                    label: 'Previsão IA (Próximas 3h)',
                    data: forecastData,
                    borderColor: forecastColor,
                    backgroundColor: gradientForecast,
                    borderWidth: 2.5,
                    borderDash: [6, 6], // Linha pontilhada solicitada
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: forecastColor,
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 1.5,
                    spanGaps: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false // Usamos a legenda HTML customizada
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#FFFFFF',
                    bodyColor: '#E2E8F0',
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            if (context.raw === null) return '';
                            const val = context.raw;
                            const tag = getRiskLabelByPercent(val);
                            return ` ${context.dataset.label}: ${val}% (${tag})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94A3B8',
                        font: { size: 10 },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: (context) => {
                            // Linhas guias nos limiares críticos
                            if (context.tick.value === 30) return 'rgba(245, 158, 11, 0.2)';
                            if (context.tick.value === 50) return 'rgba(249, 115, 22, 0.2)';
                            if (context.tick.value === 75) return 'rgba(239, 68, 68, 0.3)';
                            return 'rgba(255, 255, 255, 0.05)';
                        },
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94A3B8',
                        font: { size: 10 },
                        stepSize: 25,
                        callback: (value) => `${value}%`
                    }
                }
            }
        }
    });
}

function getRiskColor(riskPercentage) {
    if (riskPercentage <= 25) {
        let l = 25 + (riskPercentage / 25) * 20; // 25% a 45% (Verde Escuro para Verde Claro)
        return `hsl(120, 100%, ${l}%)`;
    } else if (riskPercentage <= 50) {
        let pct = (riskPercentage - 25) / 25;
        let h = 80 - pct * 25; // 80 a 55 (Amarelo-esverdeado para Amarelo Vivo)
        return `hsl(${h}, 100%, 50%)`;
    } else if (riskPercentage <= 75) {
        let pct = (riskPercentage - 50) / 25;
        let h = 45 - pct * 30; // 45 a 15 (Laranja Claro para Laranja Escuro)
        let l = 55 - pct * 10; // 55% a 45%
        return `hsl(${h}, 100%, ${l}%)`;
    } else {
        let pct = (Math.min(riskPercentage, 100) - 75) / 25;
        let l = 50 - pct * 25; // 50% a 25% (Vermelho Vivo para Vermelho Escuro/Vinho)
        return `hsl(0, 100%, ${l}%)`;
    }
}

function getRiskColorByPercent(pct) {
    return getRiskColor(pct);
}

function getRiskLabelByPercent(pct) {
    if (pct >= 75) return 'Crítico';
    if (pct >= 50) return 'Alto';
    if (pct >= 30) return 'Moderado';
    return 'Baixo';
}

// ─── Função de Demonstração Rápida na FECART ──────────────────────────────────
function simularPrevisaoSidebar(cenario) {
    currentSimulatedForecastScenario = cenario === 'normal' ? null : cenario;
    atualizarDadosSidebar(currentSidebarPointId);
}

document.addEventListener('DOMContentLoaded', initMap);

