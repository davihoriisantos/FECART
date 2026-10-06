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
    const labels = hourlyData.time.map((t) => {
      const d = new Date(t);
      return d.getHours() + 'h';
    });
    const rainData = hourlyData.precipitation || [];
    const probData = hourlyData.precipitation_probability || [];

    if (rainChartInstance) rainChartInstance.destroy();

    const ctx = canvas.getContext('2d');

    const gradientRain = ctx.createLinearGradient(0, 0, 0, 220);
    gradientRain.addColorStop(0, 'rgba(56,189,248,0.55)');
    gradientRain.addColorStop(1, 'rgba(56,189,248,0.02)');

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
            borderColor: '#38BDF8',
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: '#38BDF8',
            tension: 0.45,
            yAxisID: 'y',
          },
          {
            label: 'Prob. Chuva (%)',
            data: probData,
            fill: false,
            borderColor: '#34D399',
            borderWidth: 2,
            pointRadius: 2,
            pointBackgroundColor: '#34D399',
            borderDash: [5, 4],
            tension: 0.4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: {
              color: '#94A3B8',
              font: { size: 12 },
              usePointStyle: true,
              boxWidth: 8,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.92)',
            borderColor: 'rgba(56,189,248,0.4)',
            borderWidth: 1,
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            padding: 10,
          },
        },
        scales: {
          x: {
            ticks: { color: '#64748B', maxTicksLimit: 12, font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
          y: {
            position: 'left',
            title: { display: true, text: 'mm', color: '#38BDF8', font: { size: 11 } },
            ticks: { color: '#38BDF8', font: { size: 11 } },
            grid: { color: 'rgba(56,189,248,0.06)' },
          },
          y1: {
            position: 'right',
            title: { display: true, text: '%', color: '#34D399', font: { size: 11 } },
            ticks: { color: '#34D399', font: { size: 11 }, max: 100 },
            grid: { display: false },
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
   *  MÓDULO 2 – COUNT-UP ANIMADO (Consequências)
   * ───────────────────────────────────────────── */
  function animateCountUp(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
    const duration = 1800;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = target * ease;
      el.textContent = prefix + current.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  // Observar cada contador quando visível
  document.querySelectorAll('.count-up').forEach((el) => {
    onVisible(el, animateCountUp, 0.2);
  });

  /* ─────────────────────────────────────────────
   *  MÓDULO 2 – GRÁFICO DONUT (Consequências)
   * ───────────────────────────────────────────── */
  let donutInstance = null;

  function buildDonutChart() {
    const canvas = document.getElementById('impact-donut');
    if (!canvas || typeof Chart === 'undefined') return;
    if (donutInstance) return; // já renderizado

    const ctx = canvas.getContext('2d');
    donutInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pessoas Afetadas (B)', 'Mortes (mil)', 'Prejuízos (B USD)'],
        datasets: [
          {
            data: [3.2, 218, 28],
            backgroundColor: [
              'rgba(56,189,248,0.80)',
              'rgba(239,68,68,0.80)',
              'rgba(251,191,36,0.80)',
            ],
            borderColor: [
              'rgba(56,189,248,1)',
              'rgba(239,68,68,1)',
              'rgba(251,191,36,1)',
            ],
            borderWidth: 2,
            hoverOffset: 10,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94A3B8',
              font: { size: 12 },
              usePointStyle: true,
              padding: 18,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.95)',
            borderColor: 'rgba(56,189,248,0.4)',
            borderWidth: 1,
            titleColor: '#F8FAFC',
            bodyColor: '#CBD5E1',
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed}`,
            },
          },
        },
        animation: { animateRotate: true, duration: 1200, easing: 'easeInOutQuart' },
      },
    });
  }

  onVisible(document.getElementById('impact-donut'), buildDonutChart, 0.1);

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
   *  ENTRADA ANIMADA (Fade + slide sections)
   * ───────────────────────────────────────────── */
  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.anim-fade-up').forEach((el) => {
      onVisible(el, (target) => target.classList.add('is-visible'), 0.1);
    });
  });
})();
