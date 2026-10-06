/**
 * FloodGuard AI - Dashboard Interativo da Home
 * Módulos: Gráfico de Chuva, Count-Up, Stepper, Mission Cards
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
   *  UTILITÁRIOS
   * ───────────────────────────────────────────── */
  function onVisible(el, cb, threshold) {
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            cb(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: threshold || 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    obs.observe(el);
  }

  /* ─────────────────────────────────────────────
   *  MÓDULO 1 – GRÁFICO DE CHUVA (Chart.js)
   * ───────────────────────────────────────────── */
  let rainChartInstance = null;

  function buildRainChart(hourlyData) {
    const canvas = document.getElementById('rain-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Prepara labels de hora e valores de precipitação
    const labels = (hourlyData.time || []).map((t) => {
      const d = new Date(t);
      return d.getHours() + 'h';
    });
    const rainData = (hourlyData.precipitation || []).map(v => Number(v) || 0);
    const probData = (hourlyData.precipitation_probability || []).map(v => Number(v) || 0);

    if (rainChartInstance) rainChartInstance.destroy();

    const ctx = canvas.getContext('2d');

    // Gradiente suave para a área de precipitação (Neon Ciano)
    const gradientRain = ctx.createLinearGradient(0, 0, 0, 180);
    gradientRain.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
    gradientRain.addColorStop(0.65, 'rgba(0, 229, 255, 0.12)');
    gradientRain.addColorStop(1, 'rgba(0, 229, 255, 0.00)');

    // Gradiente suave para probabilidade (Verde Esmeralda)
    const gradientProb = ctx.createLinearGradient(0, 0, 0, 180);
    gradientProb.addColorStop(0, 'rgba(52, 211, 153, 0.25)');
    gradientProb.addColorStop(1, 'rgba(52, 211, 153, 0.00)');

    // Identifica os índices dos pontos de pico para destacar
    const maxRain = Math.max(...rainData, 0);
    const maxProb = Math.max(...probData, 0);
    const peakRainIdx = maxRain > 0 ? rainData.indexOf(maxRain) : -1;
    const peakProbIdx = maxProb > 0 ? probData.indexOf(maxProb) : -1;

    // Raios dos pontos normais vs picos
    const rainPointRadii = rainData.map((_, i) => i === peakRainIdx ? 6 : 2.5);
    const rainPointHoverRadii = rainData.map((_, i) => i === peakRainIdx ? 8 : 5);
    const rainPointColors = rainData.map((_, i) => i === peakRainIdx ? '#FFFFFF' : '#00E5FF');
    const rainPointBorders = rainData.map((_, i) => i === peakRainIdx ? '#00E5FF' : 'rgba(15,23,42,0.9)');

    rainChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Precipitação (mm)',
            data: rainData,
            fill: true,
            backgroundColor: gradientRain,
            borderColor: '#00E5FF',
            borderWidth: 2.5,
            pointRadius: rainPointRadii,
            pointHoverRadius: rainPointHoverRadii,
            pointBackgroundColor: rainPointColors,
            pointBorderColor: rainPointBorders,
            pointBorderWidth: 2,
            tension: 0.42,
            yAxisID: 'y',
          },
          {
            label: 'Prob. Chuva (%)',
            data: probData,
            fill: true,
            backgroundColor: gradientProb,
            borderColor: '#34D399',
            borderWidth: 1.8,
            borderDash: [4, 3],
            pointRadius: probData.map((_, i) => i === peakProbIdx ? 5 : 0),
            pointHoverRadius: 5,
            pointBackgroundColor: '#34D399',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 1.5,
            tension: 0.38,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false }, // Legenda elegante personalizada no HTML
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(0, 229, 255, 0.4)',
            borderWidth: 1,
            cornerRadius: 10,
            titleColor: '#FFFFFF',
            titleFont: { size: 12, weight: '700' },
            bodyColor: '#E2E8F0',
            bodyFont: { size: 12 },
            padding: 10,
            displayColors: true,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: {
              title: (items) => `Horário: ${items[0]?.label || ''}`,
              label: (item) => {
                const isRain = item.datasetIndex === 0;
                const isPeak = isRain && item.dataIndex === peakRainIdx && maxRain > 0;
                const peakBadge = isPeak ? ' (Pico do Dia ⚠️)' : '';
                return ` ${item.dataset.label}: ${item.parsed.y}${isRain ? ' mm' : '%'}${peakBadge}`;
              }
            }
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#94A3B8',
              maxTicksLimit: 12,
              font: { size: 10.5, weight: '500' }
            },
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            border: { color: 'rgba(255, 255, 255, 0.08)' }
          },
          y: {
            position: 'left',
            title: {
              display: true,
              text: 'Chuva (mm)',
              color: '#00E5FF',
              font: { size: 10.5, weight: '700' }
            },
            ticks: {
              color: '#00E5FF',
              font: { size: 10 },
              callback: (val) => `${val}mm`
            },
            grid: { color: 'rgba(0, 229, 255, 0.05)' },
            border: { dash: [3, 3], color: 'rgba(0, 229, 255, 0.2)' },
            suggestedMin: 0,
            suggestedMax: Math.max(5, maxRain * 1.25)
          },
          y1: {
            position: 'right',
            title: {
              display: true,
              text: 'Probabilidade (%)',
              color: '#34D399',
              font: { size: 10.5, weight: '700' }
            },
            ticks: {
              color: '#34D399',
              font: { size: 10 },
              callback: (val) => `${val}%`
            },
            grid: { display: false },
            border: { dash: [3, 3], color: 'rgba(52, 211, 153, 0.2)' },
            min: 0,
            max: 100
          },
        },
      },
    });
  }

  function getOrGenerateHourly(weatherObj) {
    if (weatherObj && weatherObj.hourly && weatherObj.hourly.time && weatherObj.hourly.time.length > 0) {
      return weatherObj.hourly;
    }
    // Fallback elegante com base na chuva atual/acumulada
    const nowHour = new Date().getHours();
    const times = [];
    const precips = [];
    const probs = [];
    const baseRain = weatherObj ? parseFloat(weatherObj.chuvaAtual || 0) : 0;
    const baseProb = weatherObj ? parseInt(weatherObj.probabilidadeChuvaHoje || 15) : 15;

    for (let i = 0; i < 24; i++) {
      const d = new Date();
      d.setHours(nowHour + i, 0, 0, 0);
      times.push(d.toISOString());
      // Variação natural
      const noise = Math.sin((i / 24) * Math.PI * 2) * 0.5 + 0.5;
      precips.push(Number((baseRain * noise).toFixed(1)));
      probs.push(Math.min(100, Math.max(5, Math.round(baseProb * noise))));
    }
    return { time: times, precipitation: precips, precipitation_probability: probs };
  }

  // Escuta dados do Open-Meteo
  window.addEventListener('floodguard:weatherUpdate', (e) => {
    const detail = e.detail || {};
    const weather = detail.weather || detail;
    const hourly = getOrGenerateHourly(weather);
    buildRainChart(hourly);
  });

  // Se dados já estão em cache (carregou antes deste script)
  window.addEventListener('DOMContentLoaded', () => {
    const weather = window.realWeatherDataCache;
    const hourly = getOrGenerateHourly(weather);
    buildRainChart(hourly);
  });

  /* ─────────────────────────────────────────────
   *  MÓDULO 2 – 4 GRÁFICOS INDEPENDENTES & ANIMAÇÃO REPETÍVEL
   * ───────────────────────────────────────────── */
  let chartFatalitiesInstance = null;
  let chartEconomicInstance = null;
  let chartAffectedInstance = null;
  let chartHistoricalInstance = null;
  let isConsequencesAnimated = false;
  let countUpAnimFrames = [];

  // Resetar contadores
  function resetCountUps() {
    countUpAnimFrames.forEach(id => cancelAnimationFrame(id));
    countUpAnimFrames = [];
    const section = document.getElementById('consequencias');
    if (!section) return;
    section.querySelectorAll('.count-up').forEach((el) => {
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      el.textContent = `${prefix}0${suffix}`;
    });
  }

  // Executar animação de contagem
  function runCountUps() {
    const section = document.getElementById('consequencias');
    if (!section) return;
    section.querySelectorAll('.count-up').forEach((el) => {
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
      const duration = 1600;
      const startTime = performance.now();

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = target * ease;
        el.textContent = prefix + current.toFixed(decimals) + suffix;
        if (progress < 1) {
          const frameId = requestAnimationFrame(step);
          countUpAnimFrames.push(frameId);
        }
      }
      const frameId = requestAnimationFrame(step);
      countUpAnimFrames.push(frameId);
    });
  }

  // Card 1: Vidas Perdidas no Ano (Doughnut Radial Gauge)
  function renderChartFatalities() {
    const canvas = document.getElementById('chart-fatalities-year');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartFatalitiesInstance) chartFatalitiesInstance.destroy();

    const ctx = canvas.getContext('2d');
    chartFatalitiesInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Fatalidades 2025', 'Meta de Resgate'],
        datasets: [{
          data: [4200, 1800],
          backgroundColor: ['rgba(239, 68, 68, 0.95)', 'rgba(255, 255, 255, 0.08)'],
          borderColor: ['#EF4444', 'rgba(255, 255, 255, 0.12)'],
          borderWidth: 1.5,
          hoverOffset: 4,
          circumference: 240,
          rotation: 240
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '76%',
        animation: { animateRotate: true, duration: 1400, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(239, 68, 68, 0.5)',
            borderWidth: 1,
            cornerRadius: 8,
            titleColor: '#FFFFFF',
            bodyColor: '#FCA5A5',
            callbacks: {
              label: (item) => ` ${item.label}: ${item.parsed.toLocaleString('pt-BR')} vítimas`
            }
          }
        }
      }
    });
  }

  // Card 2: Prejuízos Financeiros (Barras Verticais Comparativas)
  function renderChartEconomic() {
    const canvas = document.getElementById('chart-economic-losses');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartEconomicInstance) chartEconomicInstance.destroy();

    const ctx = canvas.getContext('2d');
    const gradientBar = ctx.createLinearGradient(0, 0, 0, 140);
    gradientBar.addColorStop(0, '#FBBF24');
    gradientBar.addColorStop(1, 'rgba(217, 119, 6, 0.2)');

    chartEconomicInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['2022', '2023', '2024', '2025'],
        datasets: [{
          label: 'Prejuízos (US$ Bi)',
          data: [19, 22, 24, 28],
          backgroundColor: [
            'rgba(251, 191, 36, 0.35)',
            'rgba(251, 191, 36, 0.45)',
            'rgba(251, 191, 36, 0.65)',
            gradientBar
          ],
          borderColor: '#FBBF24',
          borderWidth: 1.5,
          borderRadius: 6,
          barThickness: 22
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1400, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(251, 191, 36, 0.5)',
            borderWidth: 1,
            cornerRadius: 8,
            titleColor: '#FFFFFF',
            bodyColor: '#FDE68A',
            callbacks: {
              label: (item) => ` Perda econômica: US$ ${item.parsed.y} Bilhões`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94A3B8', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#FBBF24',
              font: { size: 9.5 },
              callback: (v) => `$${v}B`
            },
            suggestedMax: 32
          }
        }
      }
    });
  }

  // Card 3: População Afetada (Área Suave)
  function renderChartAffected() {
    const canvas = document.getElementById('chart-affected-people');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartAffectedInstance) chartAffectedInstance.destroy();

    const ctx = canvas.getContext('2d');
    const gradArea = ctx.createLinearGradient(0, 0, 0, 140);
    gradArea.addColorStop(0, 'rgba(0, 229, 255, 0.4)');
    gradArea.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

    chartAffectedInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['1990', '2000', '2010', '2020', 'Hoje'],
        datasets: [{
          label: 'Afetados (Bilhões)',
          data: [1.2, 1.8, 2.3, 2.8, 3.2],
          fill: true,
          backgroundColor: gradArea,
          borderColor: '#00E5FF',
          borderWidth: 2,
          pointRadius: [2, 2, 2, 2, 5],
          pointBackgroundColor: '#00E5FF',
          pointBorderColor: '#FFFFFF',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1500, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(0, 229, 255, 0.5)',
            borderWidth: 1,
            cornerRadius: 8,
            titleColor: '#FFFFFF',
            bodyColor: '#A5F3FC',
            callbacks: {
              label: (item) => ` População impactada: ${item.parsed.y} Bilhões`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94A3B8', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#00E5FF',
              font: { size: 9.5 },
              callback: (v) => `${v}B`
            },
            suggestedMax: 3.8
          }
        }
      }
    });
  }

  // Card 4: Fatalidades Históricas (Linha de Tendência)
  function renderChartHistorical() {
    const canvas = document.getElementById('chart-historical-fatalities');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartHistoricalInstance) chartHistoricalInstance.destroy();

    const ctx = canvas.getContext('2d');
    const gradPurple = ctx.createLinearGradient(0, 0, 0, 140);
    gradPurple.addColorStop(0, 'rgba(167, 139, 250, 0.35)');
    gradPurple.addColorStop(1, 'rgba(167, 139, 250, 0.0)');

    chartHistoricalInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Anos 80', 'Anos 90', 'Anos 00', 'Anos 10', 'Atual'],
        datasets: [{
          label: 'Óbitos Acumulados (mil)',
          data: [65, 110, 155, 192, 218],
          fill: true,
          backgroundColor: gradPurple,
          borderColor: '#A78BFA',
          borderWidth: 2,
          pointRadius: [2, 2, 2, 2, 5],
          pointBackgroundColor: '#A78BFA',
          pointBorderColor: '#FFFFFF',
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1500, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(167, 139, 250, 0.5)',
            borderWidth: 1,
            cornerRadius: 8,
            titleColor: '#FFFFFF',
            bodyColor: '#DDD6FE',
            callbacks: {
              label: (item) => ` Mortes registradas: ${item.parsed.y} mil pessoas`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94A3B8', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#A78BFA',
              font: { size: 9.5 },
              callback: (v) => `${v}k`
            },
            suggestedMax: 250
          }
        }
      }
    });
  }

  // Renderizar todos os 4 gráficos e contadores
  function triggerConsequencesAnimations() {
    runCountUps();
    renderChartFatalities();
    renderChartEconomic();
    renderChartAffected();
    renderChartHistorical();
  }

  // Configura IntersectionObserver REPETÍVEL (Loop no Scroll)
  function initConsequencesScrollLoop() {
    const section = document.getElementById('consequencias');
    if (!section) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!isConsequencesAnimated) {
            isConsequencesAnimated = true;
            triggerConsequencesAnimations();
          }
        } else {
          // Quando o usuário rola para fora da seção, resetamos para que reanime na volta
          if (isConsequencesAnimated) {
            isConsequencesAnimated = false;
            resetCountUps();
          }
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    observer.observe(section);
  }

  window.addEventListener('DOMContentLoaded', initConsequencesScrollLoop);

  /* ─────────────────────────────────────────────
   *  MÓDULO 4 – STEPPER INTERATIVO
   * ───────────────────────────────────────────── */
  function initStepper() {
    const steps = document.querySelectorAll('.step-btn');
    const panels = document.querySelectorAll('.step-panel');
    const progressFill = document.getElementById('stepper-progress');

    if (!steps.length) return;

    function activateStep(idx) {
      steps.forEach((s, i) => {
        s.classList.toggle('active', i === idx);
        s.setAttribute('aria-selected', i === idx);
      });
      panels.forEach((p, i) => {
        p.classList.toggle('active', i === idx);
        p.setAttribute('aria-hidden', i !== idx);
      });
      if (progressFill) {
        const pct = ((idx + 1) / steps.length) * 100;
        progressFill.style.width = pct + '%';
      }
    }

    steps.forEach((btn, idx) => {
      btn.addEventListener('click', () => activateStep(idx));
    });

    activateStep(0);

    // Pulso automático entre etapas a cada 4s quando visível
    const stepperEl = document.getElementById('stepper-section');
    let autoIdx = 0;
    let autoTimer = null;

    function startAuto() {
      if (autoTimer) return;
      autoTimer = setInterval(() => {
        autoIdx = (autoIdx + 1) % steps.length;
        activateStep(autoIdx);
      }, 4000);
    }

    function stopAuto() {
      clearInterval(autoTimer);
      autoTimer = null;
    }

    if (stepperEl) {
      onVisible(stepperEl, startAuto, 0.2);
      stepperEl.addEventListener('mouseenter', stopAuto);
      stepperEl.addEventListener('mouseleave', () => {
        stopAuto();
        startAuto();
      });
    }
  }

  window.addEventListener('DOMContentLoaded', initStepper);

  /* ─────────────────────────────────────────────
   *  ENTRADA ANIMADA (Fade + slide sections & Staggered Cards)
   * ───────────────────────────────────────────── */
  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.anim-fade-up').forEach((el) => {
      onVisible(el, (target) => target.classList.add('is-visible'), 0.1);
    });

    // Animação sequencial (staggered delay) para os cards da missão
    const missionSection = document.getElementById('nossa-missao');
    if (missionSection) {
      onVisible(missionSection, () => {
        const cards = missionSection.querySelectorAll('.mission-pillar-card');
        cards.forEach((card, idx) => {
          setTimeout(() => {
            card.classList.add('is-revealed');
          }, idx * 160);
        });
      }, 0.15);
    }
  });
})();
