/**
 * FloodGuard AI - Módulo de Alertas
 * Renderização de alertas para dashboard e mapa
 */

const Alerts = {
  /**
   * Retorna ícone SVG baseado no tipo de alerta
   */
  getAlertIcon(tipo) {
    const icons = {
      critico: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`,
      alto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`,
      moderado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`,
      baixo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>`,
      inundacao: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>
        <path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>
        <path d="M2 7c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>
      </svg>`,
      chuva: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="16" y1="13" x2="16" y2="21"/>
        <line x1="8" y1="13" x2="8" y2="21"/>
        <line x1="12" y1="15" x2="12" y2="23"/>
        <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
      </svg>`,
    };

    return icons[tipo] || icons.moderado;
  },

  /**
   * Retorna cor baseada no tipo/nível de alerta
   */
  getAlertColor(tipo) {
    const colors = {
      critico: '#EF4444',
      alto: '#F97316',
      moderado: '#F59E0B',
      baixo: '#3B82F6',
      inundacao: '#EF4444',
      chuva: '#3B82F6',
    };
    return colors[tipo] || '#94A3B8';
  },

  /**
   * Retorna classe CSS para o tipo de alerta
   */
  getAlertCardClass(alert) {
    const nivel = alert.nivel || alert.severidade || alert.tipo || '';
    if (['critico', 'alto', 'inundacao'].includes(nivel.toLowerCase())) return 'alert-card-critical';
    if (['moderado', 'chuva'].includes(nivel.toLowerCase())) return 'alert-card-warning';
    return 'alert-card-info';
  },

  /**
   * Formata timestamp para formato brasileiro
   */
  formatTimestamp(ts) {
    if (!ts) return '--';
    const d = new Date(ts);
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
   * Renderiza um card de alerta individual
   */
  renderAlertCard(alert) {
    const cardClass = this.getAlertCardClass(alert);
    const nivel = alert.nivel || alert.severidade || alert.tipo || 'info';
    const icon = this.getAlertIcon(nivel.toLowerCase());
    const time = alert.criado_em || alert.created_at || alert.timestamp;

    return `
      <div class="alert-card ${cardClass}">
        <div class="alert-card-icon">
          ${icon}
        </div>
        <div class="alert-card-content">
          <div class="alert-card-title">${alert.titulo || alert.title || 'Alerta'}</div>
          <div class="alert-card-description">${alert.descricao || alert.description || alert.mensagem || ''}</div>
          <div class="alert-card-time">${this.formatTimestamp(time)}</div>
        </div>
        ${nivel.toLowerCase() === 'critico' ? '<span class="chip chip-critico" style="align-self: flex-start; margin-left: auto;"><span class="chip-dot"></span>Crítico</span>' : ''}
      </div>
    `;
  },

  /**
   * Renderiza banner de alerta (topo da página)
   */
  renderAlertBanner(alert) {
    const nivel = alert.nivel || alert.severidade || alert.tipo || 'warning';
    const bannerClass = ['critico', 'alto'].includes(nivel.toLowerCase()) ? 'alert-critical' : 'alert-warning';
    const icon = this.getAlertIcon(nivel.toLowerCase());

    return `
      <div class="alert-banner ${bannerClass}" id="alert-banner">
        ${icon}
        <span><strong>${alert.titulo || alert.title || 'Alerta'}:</strong> ${alert.descricao || alert.description || alert.mensagem || ''}</span>
        <button class="alert-close" onclick="this.parentElement.remove()" aria-label="Fechar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  },

  /**
   * Renderiza lista de alertas em um container
   */
  renderAlertList(alerts, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!alerts || alerts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <h3>Nenhum alerta ativo</h3>
          <p>O sistema está operando normalmente.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = alerts.map((alert) => this.renderAlertCard(alert)).join('');
  },

  /**
   * Renderiza banners de alerta críticos
   */
  renderCriticalBanners(alerts, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const criticalAlerts = alerts.filter(
      (a) => {
        const nivel = (a.nivel || a.severidade || a.tipo || '').toLowerCase();
        return nivel === 'critico' || nivel === 'alto';
      }
    );

    if (criticalAlerts.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = criticalAlerts
      .slice(0, 2)
      .map((alert) => this.renderAlertBanner(alert))
      .join('');
  },
};
