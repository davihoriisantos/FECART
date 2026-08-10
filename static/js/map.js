let map;
let zoneLayers = [];
let historicoLayers = [];
let heatLayer;

// ─── Configurações de Limiar de Chuva ─────────────────────────────────────────
const RAIN_THRESHOLDS = [10, 30, 50]; // mm
const RAIN_COLORS     = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

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
        let acc24h = 0;
        let acc72h = 0;
        
        for (let i = 0; i < 72; i++) {
            const idx = currentIdx - i;
            if (idx >= 0 && rains[idx] !== null) {
                acc72h += rains[idx];
                if (i < 24) acc24h += rains[idx];
            }
        }

        const result = { current: currentRain, acc24h, acc72h };
        rainCache[key] = result;
        return result;
    } catch (e) {
        console.warn('Erro ao buscar chuva para', key, e);
        const fallback = { current: 0, acc24h: 0, acc72h: 0 };
        rainCache[key] = fallback;
        return fallback;
    }
}

// ─── Calcula risco geral considerando encharcamento do solo ───────────────────
function calcularRiscoGeral(rainData, ponto = null) {
    let effectiveRain = rainData.current;
    
    // Fator de encharcamento do solo (Acumulado 72h e 24h)
    if (rainData.acc72h > 50 || rainData.acc24h > 30) {
        effectiveRain += 15; // Penalidade base por solo saturado
        effectiveRain *= 1.5; // Multiplicador de sensibilidade
    }

    // Fator Geográfico (Altitude e Proximidade do Rio)
    if (ponto && ponto.distancia_rio_m !== undefined && ponto.altitude_m !== undefined) {
        let fatorGeo = 1.0;
        
        // Quanto mais perto do rio, maior o multiplicador
        if (ponto.distancia_rio_m <= 50) fatorGeo += 0.4;
        else if (ponto.distancia_rio_m <= 150) fatorGeo += 0.2;
        
        // Altitudes menores em SP (fundo de vale) aumentam o risco
        if (ponto.altitude_m <= 725) fatorGeo += 0.3;
        else if (ponto.altitude_m <= 735) fatorGeo += 0.15;

        effectiveRain *= fatorGeo;
    }

    if (effectiveRain < RAIN_THRESHOLDS[0]) return { nivel: 'Baixo', cor: RAIN_COLORS[0] };
    if (effectiveRain < RAIN_THRESHOLDS[1]) return { nivel: 'Moderado', cor: RAIN_COLORS[1] };
    if (effectiveRain < RAIN_THRESHOLDS[2]) return { nivel: 'Alto', cor: RAIN_COLORS[2] };
    return { nivel: 'Crítico', cor: RAIN_COLORS[3] };
}

// ─── Calcula risco real cruzando histórico + chuva atual/acumulada ───────────
function calcularRiscoReal(ponto, rainData) {
    const riscoBase = calcularRiscoGeral(rainData, ponto);
    const nivelChuva = riscoBase.nivel;
    const historico_severidade = ponto.historico_severidade;

    // Matriz de risco composta: histórico × chuva efetiva
    if (historico_severidade === 'Crítico') {
        if (nivelChuva === 'Crítico' || nivelChuva === 'Alto') return { nivel: 'EMERGÊNCIA', cor: '#dc2626', alerta: true };
        if (nivelChuva === 'Moderado') return { nivel: 'Crítico', cor: '#ef4444', alerta: true };
        return { nivel: 'Alto (Histórico)', cor: '#f97316', alerta: false };
    }
    if (historico_severidade === 'Alto') {
        if (nivelChuva === 'Crítico') return { nivel: 'Crítico', cor: '#ef4444', alerta: true };
        if (nivelChuva === 'Alto') return { nivel: 'Alto', cor: '#f97316', alerta: false };
        return { nivel: 'Moderado (Histórico)', cor: '#eab308', alerta: false };
    }
    if (historico_severidade === 'Moderado') {
        if (nivelChuva === 'Crítico') return { nivel: 'Alto', cor: '#f97316', alerta: false };
        if (nivelChuva === 'Alto') return { nivel: 'Moderado', cor: '#eab308', alerta: false };
        return { nivel: 'Baixo', cor: '#22c55e', alerta: false };
    }
    // severidade Baixo
    return { nivel: nivelChuva, cor: riscoBase.cor, alerta: false };
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
function popupHistorico(ponto, rainData, risco) {
    const alertaBanner = risco.alerta
        ? `<div style="background:#dc2626;color:#fff;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-weight:700;font-size:13px;">
               ⚠️ ÁREA COM HISTÓRICO RECORRENTE DE ENCHENTE<br>
               <span style="font-weight:400;font-size:12px;">Solo saturado / Chuva intensa + histórico crítico confirmado.</span>
           </div>`
        : '';

    const tagCor = {
        'Crítico': '#ef4444', 'Alto': '#f97316', 'Moderado': '#eab308',
        'EMERGÊNCIA': '#dc2626', 'Alto (Histórico)': '#f97316',
        'Moderado (Histórico)': '#eab308', 'Baixo': '#22c55e'
    }[risco.nivel] || '#94a3b8';
    
    // Indicador de solo encharcado
    const soloSaturado = (rainData.acc72h > 50 || rainData.acc24h > 30) 
        ? `<span style="background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b55;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">⚠️ Solo Saturado</span>`
        : '';

    return `
        <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:240px;max-width:280px;">
            ${alertaBanner}
            <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:4px;">${ponto.nome}</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:10px;">📍 ${ponto.bairro} · Fonte: ${ponto.fonte}</div>
            <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                <span style="background:${tagCor}22;color:${tagCor};border:1px solid ${tagCor}55;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">
                    🎯 Risco Real: ${risco.nivel}
                </span>
                <span style="background:#0ea5e922;color:#0ea5e9;border:1px solid #0ea5e955;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">
                    💧 Chuva Atual: ${rainData.current.toFixed(1)} mm
                </span>
                ${soloSaturado}
            </div>
            <div style="border-top:1px solid #e2e8f0;padding-top:8px;margin-top:4px;">
                <div style="font-size:12px;color:#475569;margin-bottom:6px;"><b>Geografia:</b> Altitude: ${ponto.altitude_m}m | Dist. Rio: ${ponto.distancia_rio_m}m</div>
                <div style="font-size:12px;color:#475569;margin-bottom:6px;"><b>Acumulados:</b> 24h: ${rainData.acc24h.toFixed(1)} mm | 72h: ${rainData.acc72h.toFixed(1)} mm</div>
                <div style="font-size:12px;color:#475569;margin-bottom:6px;"><b>Histórico (Defesa Civil):</b></div>
                <div style="font-size:12px;color:#64748b;margin-bottom:6px;">${ponto.descricao}</div>
                <div style="font-size:11px;color:#94a3b8;">
                    🔁 Ocorrências/ano: <b style="color:#0f172a;">${ponto.ocorrencias_anuais}</b> &nbsp;|&nbsp;
                    Severidade histórica: <b style="color:${tagCor};">${ponto.historico_severidade}</b>
                </div>
            </div>
        </div>`;
}

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

    HISTORICO_DEFESA_CIVIL.forEach((ponto, i) => {
        const rainData = rains[i];
        const risco  = calcularRiscoReal(ponto, rainData);
        const icone  = criarIconeHistorico(risco.cor, risco.alerta);
        const popup  = popupHistorico(ponto, rainData, risco);

        const marker = L.marker([ponto.lat, ponto.lon], { icon: icone })
            .addTo(map)
            .bindPopup(popup, { maxWidth: 300 });

        historicoLayers.push({ marker, ponto, risco });
    });
}

// ─── Inicializa o mapa ────────────────────────────────────────────────────────
async function initMap() {
    map = L.map('map').setView([-23.5580, -46.5970], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    try {
        // 1. Camada de Zonas do Sistema (API interna)
        const zones = await API.get('/api/zones');
        for (const zone of zones) {
            const rainData = await fetchRain(zone.latitude_centro, zone.longitude_centro);
            const riscoGeral = calcularRiscoGeral(rainData);
            const color = riscoGeral.cor;
            const level = riscoGeral.nivel;
            const rec   = level === 'Baixo' ? 'Sem ação necessária.' :
                          level === 'Moderado' ? 'Evite áreas propensas a alagamento.' :
                          level === 'Alto' ? 'Evite áreas baixas.' : 'Procure refúgio imediato.';

            let coords;
            try { coords = JSON.parse(zone.polygon_coords); } catch (e) { coords = []; }

            const popupText = `<b>${zone.nome}</b><br>💧 Chuva Atual: ${rainData.current.toFixed(1)} mm (24h: ${rainData.acc24h.toFixed(1)}mm)<br>🎯 Risco: ${level}<br>${rec}`;

            if (coords.length > 0) {
                const layer = L.polygon(coords, { color, fillColor: color, fillOpacity: 0.35, weight: 2 })
                    .addTo(map).bindPopup(popupText);
                zoneLayers.push(layer);
            } else {
                const layer = L.circle([zone.latitude_centro, zone.longitude_centro],
                    { radius: zone.raio_metros, color, fillColor: color, fillOpacity: 0.25, weight: 2 })
                    .addTo(map).bindPopup(popupText);
                zoneLayers.push(layer);
            }
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

        // 4. Botões de simulação
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

document.addEventListener('DOMContentLoaded', initMap);
