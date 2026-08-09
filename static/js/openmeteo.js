/**
 * Módulo de Integração Open-Meteo & Regras de Alerta Preditivo (Com Modo Simulação FECART)
 */

let realWeatherDataCache = null;
let currentSimulatedScenario = null;

async function fetchOpenMeteoData(lat = -23.5505, lon = -46.6333) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,wind_speed_10m&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min&timezone=America%2FSao_Paulo`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro na resposta da Open-Meteo API');
        const data = await response.json();
        
        const chuvaHoje = data.daily.precipitation_sum[0] || 0;

        realWeatherDataCache = {
            cidade: "São Paulo, SP",
            temperatura: data.current.temperature_2m,
            sensacao: data.current.apparent_temperature,
            umidade: data.current.relative_humidity_2m,
            chuvaAtual: data.current.precipitation,
            vento: data.current.wind_speed_10m,
            chuvaAcumuladaHoje: chuvaHoje,
            probabilidadeChuvaHoje: data.daily.precipitation_probability_max[0],
            tempMax: data.daily.temperature_2m_max[0],
            tempMin: data.daily.temperature_2m_min[0],
            horarioAtualizacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            alertaInfo: evaluateRainAlertRule(chuvaHoje)
        };

        return realWeatherDataCache;
    } catch (error) {
        console.error("Erro ao buscar dados meteorológicos da Open-Meteo:", error);
        return null;
    }
}

/**
 * Regra de Alerta Baseada na Chuva Acumulada:
 * - < 10mm: Status VERDE (Normal)
 * - 10mm a 30mm: Status AMARELO (Atenção)
 * - > 30mm: Status VERMELHO (Alerta de Enchente) + "Risco alto de alagamento! Busque um local seguro."
 */
function evaluateRainAlertRule(rainAcc) {
    if (rainAcc > 30) {
        return {
            level: 'red',
            status: 'VERMELHO (Alerta de Enchente)',
            message: 'Risco alto de alagamento! Busque um local seguro.',
            badgeClass: 'chip-critico',
            bgStyle: 'background: rgba(239, 68, 68, 0.25); border: 2px solid rgba(239, 68, 68, 0.7); color: #FCA5A5;'
        };
    } else if (rainAcc >= 10) {
        return {
            level: 'yellow',
            status: 'AMARELO (Atenção)',
            message: 'Atenção: Chuva moderada acumulada nas últimas horas. Acompanhe as atualizações.',
            badgeClass: 'chip-alto',
            bgStyle: 'background: rgba(245, 158, 11, 0.25); border: 2px solid rgba(245, 158, 11, 0.7); color: #FDE047;'
        };
    } else {
        return {
            level: 'green',
            status: 'VERDE (Normal)',
            message: 'Condição Normal: Sem risco iminente de enchente no momento.',
            badgeClass: 'chip-baixo',
            bgStyle: 'background: rgba(16, 185, 129, 0.25); border: 2px solid rgba(16, 185, 129, 0.7); color: #6EE7B7;'
        };
    }
}

/**
 * Atualiza a interface com um conjunto de dados meteorológicos
 */
function renderWeatherData(weather, isSimulation = false, scenarioName = '') {
    if (!weather) return;

    const elRainAcc = document.getElementById('om-rain-acc');
    const elRainProb = document.getElementById('om-rain-prob');
    const elTemp = document.getElementById('om-temp');
    const elHumidity = document.getElementById('om-humidity');
    const elWind = document.getElementById('om-wind');
    const elTime = document.getElementById('om-time');

    if (elRainAcc) elRainAcc.textContent = `${weather.chuvaAcumuladaHoje} mm`;
    if (elRainProb) elRainProb.textContent = `${weather.probabilidadeChuvaHoje}%`;
    if (elTemp) elTemp.textContent = `${weather.temperatura}°C`;
    if (elHumidity) elHumidity.textContent = `${weather.umidade}%`;
    if (elWind) elWind.textContent = `${weather.vento} km/h`;
    
    if (elTime) {
        if (isSimulation) {
            elTime.textContent = `🧪 SIMULAÇÃO FECART: ${scenarioName.toUpperCase()}`;
        } else {
            elTime.textContent = `Atualizado às ${weather.horarioAtualizacao}`;
        }
    }

    // Atualiza o Banner Dinâmico de Alerta
    const alertBanner = document.getElementById('om-alert-banner');
    if (alertBanner) {
        const info = weather.alertaInfo;
        const simBadge = isSimulation ? `<span class="chip chip-moderado" style="margin-left: 8px;">[MODO DEMO FECART]</span>` : '';
        
        alertBanner.setAttribute('style', `padding: 24px; border-radius: 14px; margin-top: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; transition: all 0.4s ease; ${info.bgStyle}`);
        alertBanner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 16px;">
                <div style="font-size: 32px;">${info.level === 'red' ? '🚨' : info.level === 'yellow' ? '⚠️' : '✅'}</div>
                <div>
                    <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                        Status: <span class="chip ${info.badgeClass}">${info.status}</span> ${simBadge}
                    </div>
                    <div style="font-size: 16px; margin-top: 6px; font-weight: 700; color: #FFFFFF;">
                        ${info.message}
                    </div>
                </div>
            </div>
            <div style="font-size: 14px; opacity: 0.95; text-align: right; background: rgba(0,0,0,0.2); padding: 8px 16px; border-radius: 8px;">
                Chuva Simulação: <strong style="font-size: 18px; color: #FFFFFF;">${weather.chuvaAcumuladaHoje} mm</strong>
            </div>
        `;
    }
}

/**
 * Função para simular cenários específicos durante a apresentação na FECART
 */
function simularCenario(chuvaMm, nomeCenario, temp = 22, prob = 90) {
    currentSimulatedScenario = nomeCenario;
    
    const simulatedData = {
        cidade: "São Paulo, SP (Simulação)",
        temperatura: temp,
        sensacao: temp,
        umidade: chuvaMm > 30 ? 95 : (chuvaMm >= 10 ? 80 : 50),
        chuvaAtual: chuvaMm / 10,
        vento: chuvaMm > 30 ? 45 : (chuvaMm >= 10 ? 25 : 10),
        chuvaAcumuladaHoje: chuvaMm,
        probabilidadeChuvaHoje: prob,
        tempMax: 26,
        tempMin: 16,
        horarioAtualizacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        alertaInfo: evaluateRainAlertRule(chuvaMm)
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

/**
 * Atualiza o widget normalmente ao carregar
 */
async function updateWeatherWidget() {
    if (currentSimulatedScenario) return; // Se estiver no modo simulação, não sobrescrever com polling
    const weather = await fetchOpenMeteoData();
    renderWeatherData(weather, false);
}

document.addEventListener('DOMContentLoaded', updateWeatherWidget);
setInterval(updateWeatherWidget, 300000); // Atualiza a cada 5 minutos
