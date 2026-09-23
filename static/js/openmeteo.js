/**
 * Módulo de Integração Open-Meteo & Regras de Alerta Preditivo (Com Modo Simulação FECART)
 * Dados meteorológicos em tempo real calibrados com a escala oficial da Defesa Civil / CGE.
 */

let realWeatherDataCache = null;
let currentSimulatedScenario = null;
let activeTempMode = 0; // 0: Atual, 1: Sensação, 2: Min/Max

// ─── Dicionário de Códigos Meteorológicos Oficiais da OMM (WMO Weather Code) ───
const WMO_WEATHER_CODES = {
    0:  { text: "Céu Limpo",               icon: "☀️" },
    1:  { text: "Principalmente Limpo",    icon: "🌤️" },
    2:  { text: "Parcialmente Nublado",    icon: "⛅" },
    3:  { text: "Nublado",                 icon: "☁️" },
    45: { text: "Nevoeiro / Névoa",        icon: "🌫️" },
    48: { text: "Nevoeiro com Geada",      icon: "🌫️" },
    51: { text: "Garoa / Chuvisco Leve",   icon: "🌦️" },
    53: { text: "Garoa Moderada",          icon: "🌦️" },
    55: { text: "Garoa Densa",             icon: "🌧️" },
    61: { text: "Chuva Fraca",             icon: "🌦️" },
    63: { text: "Chuva Moderada",          icon: "🌧️" },
    65: { text: "Chuva Forte",             icon: "🌧️" },
    80: { text: "Pancadas de Chuva Leves", icon: "🌦️" },
    81: { text: "Pancadas de Chuva",       icon: "🌧️" },
    82: { text: "Pancadas Violentas",      icon: "⛈️" },
    95: { text: "Tempestade com Raios",    icon: "⛈️" },
    96: { text: "Tempestade com Granizo",  icon: "⛈️" },
    99: { text: "Tempestade Severa",       icon: "⛈️" }
};

function getWmoInfo(code) {
    return WMO_WEATHER_CODES[Number(code)] || { text: "Estável", icon: "🌤️" };
}

/**
 * Busca dados da Open-Meteo diretamente, com fallback seguro para o endpoint interno /api/dashboard/weather.
 */
async function fetchOpenMeteoData(lat = -23.5505, lon = -46.6333) {
    // Modelo ICON (icon_seamless) é mais preciso para o Brasil/América do Sul e usa grade de alta resolução (~2km)
    // Parâmetros: temperatura atual, umidade, sensação térmica, precipitação, código meteorológico, vento
    const directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,wind_speed_10m&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min&models=icon_seamless&timezone=America%2FSao_Paulo`;
    const proxyUrl = `/api/dashboard/weather?lat=${lat}&lon=${lon}`;
    
    let data = null;

    // 1. Tentar chamada direta ao Open-Meteo
    try {
        const response = await fetch(directUrl, { signal: AbortSignal.timeout(4000) });
        if (response.ok) {
            data = await response.json();
        }
    } catch (e) {
        console.warn("Chamada direta Open-Meteo falhou, tentando proxy interno...", e);
    }

    // 2. Fallback para a API interna do backend
    if (!data || !data.current) {
        try {
            const proxyRes = await fetch(proxyUrl);
            if (proxyRes.ok) {
                data = await proxyRes.json();
            }
        } catch (e) {
            console.error("Falha também no proxy interno de clima:", e);
        }
    }

    if (!data || !data.current) {
        return realWeatherDataCache;
    }

    const current = data.current || {};
    const daily = data.daily || {};
    
    // Chuva atual caindo neste instante (mm/h)
    const chuvaInstatanea = Number(current.precipitation ?? current.rain ?? 0);
    // Acumulado previsto ou ocorrido no dia todo (mm)
    const chuvaHojeAcumulada = Number(daily.precipitation_sum?.[0] ?? 0);
    const probChuva = Number(daily.precipitation_probability_max?.[0] ?? 0);
    const wCode = Number(current.weather_code ?? 1);
    const wInfo = getWmoInfo(wCode);

    realWeatherDataCache = {
        cidade: "São Paulo, SP",
        temperatura: Math.round(current.temperature_2m ?? 20),
        sensacao: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 20),
        umidade: Math.round(current.relative_humidity_2m ?? 65),
        chuvaAtual: Number(chuvaInstatanea).toFixed(1),
        chuvaAcumuladaHoje: Number(chuvaHojeAcumulada).toFixed(1),
        probabilidadeChuvaHoje: Math.round(probChuva),
        weatherCode: wCode,
        condicaoTexto: wInfo.text,
        condicaoIcone: wInfo.icon,
        vento: Math.round(current.wind_speed_10m ?? 10),
        tempMax: Math.round(daily.temperature_2m_max?.[0] ?? 23),
        tempMin: Math.round(daily.temperature_2m_min?.[0] ?? 14),
        horarioAtualizacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        alertaInfo: evaluateRainAlertRule(chuvaInstatanea, chuvaHojeAcumulada, wCode, probChuva)
    };

    return realWeatherDataCache;
}

/**
 * Regra de Alerta Baseada na Chuva em Tempo Real — Escala Meteorológica Oficial:
 * - VERMELHO (>30 mm/h ou tempestade severa ativa): Risco Crítico de Enchente
 * - LARANJA (10–30 mm/h ou tempestade com raios): Risco Alto
 * - AMARELO (2.5–10 mm/h ou chuva moderada contínua): Risco Moderado / Atenção
 * - VERDE (<2.5 mm/h ou sem chuva): Condição Estável / Normal
 */
function evaluateRainAlertRule(currentRainRate, dailyAcc = 0, weatherCode = 0, prob = 0) {
    const rainNow = Number(currentRainRate) || 0;
    const acc = Number(dailyAcc) || 0;
    const code = Number(weatherCode) || 0;
    const isStormCode = [82, 95, 96, 99].includes(code);
    const isHeavyCode = [65, 81].includes(code);

    // VERMELHO — Tempestade / Chuva Torrencial
    if (rainNow > 30 || (acc > 50 && rainNow > 5) || (isStormCode && rainNow > 15)) {
        return {
            level: 'red',
            status: 'VERMELHO (Tempestade / Chuva Torrencial)',
            message: 'Alerta máximo de enchente! Risco elevado de inundação e transbordamento de rios.',
            badgeClass: 'chip-critico',
            bgStyle: 'background: rgba(239, 68, 68, 0.25); border: 2px solid rgba(239, 68, 68, 0.7); color: #FCA5A5;'
        };
    }

    // LARANJA — Chuva Forte (10–30 mm/h)
    if (rainNow >= 10 || isStormCode || (acc > 35 && rainNow >= 2.5) || (isHeavyCode && rainNow >= 5)) {
        return {
            level: 'orange',
            status: 'LARANJA (Chuva Forte — Risco Alto)',
            message: 'Alerta: Possibilidade de alagamentos em pontos baixos e calhas fluviais.',
            badgeClass: 'chip-alto',
            bgStyle: 'background: rgba(249, 115, 22, 0.25); border: 2px solid rgba(249, 115, 22, 0.7); color: #FDBA74;'
        };
    }

    // AMARELO — Chuva Moderada (2.5–10 mm/h)
    if (rainNow >= 2.5 || (acc >= 25 && rainNow > 0) || isHeavyCode) {
        return {
            level: 'yellow',
            status: 'AMARELO (Chuva Moderada — Atenção)',
            message: 'Atenção: Chuva moderada em andamento. Acompanhe a evolução nos pontos críticos.',
            badgeClass: 'chip-moderado',
            bgStyle: 'background: rgba(245, 158, 11, 0.25); border: 2px solid rgba(245, 158, 11, 0.7); color: #FDE047;'
        };
    }

    // VERDE — Chuva Fraca / Garoa (<2.5 mm/h) ou Sem Chuva (0.0 mm/h)
    const infoW = getWmoInfo(code);
    return {
        level: 'green',
        status: 'VERDE (Normal — Risco Baixo)',
        message: rainNow > 0
            ? `Chuva Fraca / Garoa: ${rainNow.toFixed(1)} mm/h (${infoW.text}). Sem risco de enchente no momento.`
            : `Tempo Estável: ${infoW.icon} ${infoW.text}. Sem chuva caindo no momento (Acumulado 24h: ${acc.toFixed(1)} mm).`,
        badgeClass: 'chip-baixo',
        bgStyle: 'background: rgba(16, 185, 129, 0.25); border: 2px solid rgba(16, 185, 129, 0.7); color: #6EE7B7;'
    };
}

/**
 * Atualiza a interface com o conjunto de dados meteorológicos
 */
function renderWeatherData(weather, isSimulation = false, scenarioName = '') {
    if (!weather) return;

    const elRainAcc = document.getElementById('om-rain-acc');
    const elRainProb = document.getElementById('om-rain-prob');
    const elTemp = document.getElementById('om-temp');
    const elHumidity = document.getElementById('om-humidity');
    const elWind = document.getElementById('om-wind');
    const elTime = document.getElementById('om-time');

    // Chuva atual e acumulada
    if (elRainAcc) {
        if (Number(weather.chuvaAtual) > 0) {
            elRainAcc.textContent = `${weather.chuvaAtual} mm/h`;
            elRainAcc.title = `Chuva caindo agora: ${weather.chuvaAtual} mm/h • Acumulado hoje: ${weather.chuvaAcumuladaHoje} mm`;
        } else {
            elRainAcc.textContent = `0.0 mm/h`;
            elRainAcc.title = `Sem chuva agora • Acumulado hoje: ${weather.chuvaAcumuladaHoje} mm`;
        }
    }

    // Probabilidade e Condição do Céu
    if (elRainProb) {
        elRainProb.textContent = `${weather.probabilidadeChuvaHoje}%`;
        elRainProb.title = `Condição: ${weather.condicaoIcone} ${weather.condicaoTexto}`;
    }

    // Temperatura
    if (elTemp) {
        if (activeTempMode === 1) {
            elTemp.textContent = `Sensação ${weather.sensacao}°C`;
        } else if (activeTempMode === 2) {
            elTemp.textContent = `${weather.tempMin}°C / ${weather.tempMax}°C`;
        } else {
            elTemp.textContent = `${weather.temperatura}°C`;
        }
    }

    // Umidade e Vento
    if (elHumidity) elHumidity.textContent = `${weather.umidade}%`;
    if (elWind) elWind.textContent = `${weather.vento} km/h`;
    
    // Horário e status
    if (elTime) {
        if (isSimulation) {
            elTime.textContent = `🧪 SIMULAÇÃO FECART: ${scenarioName.toUpperCase()}`;
        } else {
            elTime.textContent = `${weather.condicaoIcone} ${weather.condicaoTexto} • Atualizado às ${weather.horarioAtualizacao}`;
        }
    }

    // Atualiza o Banner Dinâmico de Alerta
    const alertBanner = document.getElementById('om-alert-banner');
    if (alertBanner) {
        const info = weather.alertaInfo;
        const simBadge = isSimulation ? `<span class="chip chip-moderado" style="margin-left: 8px;">[MODO DEMO FECART]</span>` : '';
        const labelChuva = isSimulation ? 'Taxa de Chuva:' : 'Chuva Agora:';
        
        alertBanner.setAttribute('style', `padding: 24px; border-radius: 14px; margin-top: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; transition: all 0.4s ease; ${info.bgStyle}`);
        alertBanner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 16px;">
                <div style="font-size: 32px;">${info.level === 'red' ? '🚨' : info.level === 'orange' ? '🌧️' : info.level === 'yellow' ? '⚠️' : '✅'}</div>
                <div>
                    <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                        Status: <span class="chip ${info.badgeClass}">${info.status}</span> ${simBadge}
                    </div>
                    <div style="font-size: 15px; margin-top: 6px; font-weight: 700; color: #FFFFFF;">
                        ${info.message}
                    </div>
                </div>
            </div>
            <div style="font-size: 13px; opacity: 0.95; text-align: right; background: rgba(0,0,0,0.25); padding: 8px 16px; border-radius: 8px;">
                <div>${labelChuva} <strong style="font-size: 18px; color: #38BDF8;">${weather.chuvaAtual} mm/h</strong></div>
                <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">Acumulado Hoje: <strong>${weather.chuvaAcumuladaHoje} mm</strong></div>
            </div>
        `;
    }
}

/**
 * Função para simular cenários específicos durante a apresentação na FECART
 */
function simularCenario(chuvaMmHora, nomeCenario, temp = 22, prob = 90) {
    currentSimulatedScenario = nomeCenario;
    
    const simulatedData = {
        cidade: "São Paulo, SP (Simulação)",
        temperatura: Math.round(temp),
        sensacao: Math.round(temp - 1),
        umidade: chuvaMmHora > 30 ? 95 : (chuvaMmHora >= 10 ? 85 : (chuvaMmHora >= 2.5 ? 70 : 45)),
        chuvaAtual: Number(chuvaMmHora).toFixed(1),
        chuvaAcumuladaHoje: Number(chuvaMmHora * 1.5).toFixed(1),
        probabilidadeChuvaHoje: Math.round(prob),
        weatherCode: chuvaMmHora > 30 ? 95 : (chuvaMmHora >= 10 ? 65 : (chuvaMmHora >= 2.5 ? 63 : 1)),
        condicaoTexto: nomeCenario,
        condicaoIcone: chuvaMmHora > 30 ? '⛈️' : (chuvaMmHora >= 10 ? '🌧️' : (chuvaMmHora >= 2.5 ? '🌦️' : '🌤️')),
        vento: chuvaMmHora > 30 ? 45 : (chuvaMmHora >= 10 ? 30 : (chuvaMmHora >= 2.5 ? 18 : 8)),
        tempMax: Math.round(temp + 4),
        tempMin: Math.round(temp - 4),
        horarioAtualizacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        alertaInfo: evaluateRainAlertRule(chuvaMmHora, chuvaMmHora * 1.5, chuvaMmHora > 30 ? 95 : (chuvaMmHora >= 10 ? 65 : 63), prob)
    };

    renderWeatherData(simulatedData, true, nomeCenario);
}

/**
 * Restaura os dados reais vindos da Open-Meteo API
 */
async function restaurarDadosReais() {
    currentSimulatedScenario = null;
    const weather = await fetchOpenMeteoData();
    renderWeatherData(weather, false);
}

function setupTempClickToggle() {
    const elTemp = document.getElementById('om-temp');
    if (!elTemp) return;
    const parentContainer = elTemp.closest('.card') || elTemp.parentElement;
    if (parentContainer) {
        elTemp.style.cursor = 'pointer';
        elTemp.title = 'Clique para alternar entre Temperatura Atual, Sensação Térmica e Mín/Máx';
        elTemp.onclick = () => {
            activeTempMode = (activeTempMode + 1) % 3;
            if (currentSimulatedScenario) {
                const scenarioMap = {
                    'Chuva Fraca / Garoa': { mm: 1.2, temp: 24, prob: 20 },
                    'Chuva Moderada': { mm: 6.0, temp: 21, prob: 55 },
                    'Chuva Forte': { mm: 18.5, temp: 20, prob: 80 },
                    'Tempestade / Torrencial': { mm: 42.0, temp: 18, prob: 98 }
                };
                const sc = scenarioMap[currentSimulatedScenario] || { mm: 1.2, temp: 22, prob: 50 };
                simularCenario(sc.mm, currentSimulatedScenario, sc.temp, sc.prob);
            } else if (realWeatherDataCache) {
                renderWeatherData(realWeatherDataCache, false);
            }
        };
    }
}

async function updateWeatherWidget() {
    setupTempClickToggle();
    if (currentSimulatedScenario) return;

    // Tenta obter localização exata do usuário para temperatura precisa
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const userLat = pos.coords.latitude;
                const userLon = pos.coords.longitude;
                // Só usa coords do usuário se estiver na Grande SP (lat: -24 a -23, lon: -47 a -46)
                const isGrandeSP = userLat > -24.0 && userLat < -23.0 && userLon > -47.0 && userLon < -46.0;
                const lat = isGrandeSP ? userLat : -23.5505;
                const lon = isGrandeSP ? userLon : -46.6333;
                const weather = await fetchOpenMeteoData(lat, lon);
                renderWeatherData(weather, false);
            },
            async () => {
                // Permissão negada: usa SP Centro como default
                const weather = await fetchOpenMeteoData();
                renderWeatherData(weather, false);
            },
            { timeout: 4000, maximumAge: 120000 } // Aceita cache de 2 min para não travar
        );
    } else {
        const weather = await fetchOpenMeteoData();
        renderWeatherData(weather, false);
    }
}

document.addEventListener('DOMContentLoaded', updateWeatherWidget);
setInterval(updateWeatherWidget, 300000);
