/**
 * FloodGuard AI - Utilitários Gerais
 * Funções auxiliares usadas em toda a aplicação
 */

const App = {
  /**
   * Formata data para DD/MM/YYYY
   */
  formatDate(date) {
    if (!date) return '--';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },

  /**
   * Formata data e hora para DD/MM/YYYY HH:mm
   */
  formatDateTime(date) {
    if (!date) return '--';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  /**
   * Formata hora para HH:mm
   */
  formatTime(date) {
    if (!date) return '--';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  /**
   * Formata número com locale brasileiro
   */
  formatNumber(n, decimals = 0) {
    if (n === null || n === undefined) return '--';
    return Number(n).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  /**
   * Retorna tempo relativo (ex: "há 5 minutos")
   */
  timeAgo(date) {
    if (!date) return '--';
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);

    if (diff < 60) return 'agora mesmo';
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
    return App.formatDate(date);
  },

  /**
   * Exibe notificação toast
   */
  showNotification(message, type = 'info') {
    // Cria container se não existe
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      ${icons[type] || icons.info}
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove após 5 segundos
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  },

  /**
   * Debounce
   */
  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * Throttle
   */
  throttle(fn, limit = 300) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Seletor DOM curto
   */
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  /**
   * Seletor DOM múltiplo
   */
  $$(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  },

  /**
   * Cria elemento com atributos
   */
  createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, val]) => {
      if (key === 'className') el.className = val;
      else if (key === 'innerHTML') el.innerHTML = val;
      else if (key === 'textContent') el.textContent = val;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
      else el.setAttribute(key, val);
    });
    children.forEach((child) => {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child) el.appendChild(child);
    });
    return el;
  },

  /**
   * Retorna cor CSS para nível de risco
   */
  getRiskColor(level) {
    const colors = {
      baixo: '#10B981',
      moderado: '#F59E0B',
      alto: '#F97316',
      critico: '#EF4444',
    };
    return colors[level?.toLowerCase()] || '#94A3B8';
  },

  /**
   * Retorna classe CSS para nível de risco
   */
  getRiskClass(level) {
    const classes = {
      baixo: 'chip-baixo',
      moderado: 'chip-moderado',
      alto: 'chip-alto',
      critico: 'chip-critico',
    };
    return classes[level?.toLowerCase()] || 'chip-neutral';
  },

  /**
   * Capitaliza primeira letra
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Traduz tipo de sensor
   */
  translateSensorType(type) {
    const types = {
      pluviometro: 'Pluviômetro',
      nivel_rio: 'Nível do Rio',
      umidade_solo: 'Umidade do Solo',
    };
    return types[type] || type;
  },

  /**
   * Retorna unidade do sensor
   */
  getSensorUnit(type) {
    const units = {
      pluviometro: 'mm/h',
      nivel_rio: 'm',
      umidade_solo: '%',
    };
    return units[type] || '';
  },

  /**
   * Retorna cor do sensor por tipo
   */
  getSensorColor(type) {
    const colors = {
      pluviometro: '#10B981',
      nivel_rio: '#3B82F6',
      umidade_solo: '#92400E',
    };
    return colors[type] || '#94A3B8';
  },

  /**
   * Mostra loading skeleton
   */
  showSkeleton(container, count = 3) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="card" style="padding: 24px; margin-bottom: 12px;">
          <div class="skeleton skeleton-title" style="margin-bottom: 12px;"></div>
          <div class="skeleton skeleton-text" style="width: 80%; margin-bottom: 8px;"></div>
          <div class="skeleton skeleton-text" style="width: 60%;"></div>
        </div>
      `;
    }
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }
    if (container) {
      container.innerHTML = html;
    }
  },

  /**
   * Inicializa observador de scroll para animações
   */
  initScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observer.observe(el);
    });
  },
};
