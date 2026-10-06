async function loadDashboard() {
    try {
        const stats = await API.get('/api/dashboard/stats');
        document.getElementById('stat-sensors').textContent = stats.total_sensores;
        document.getElementById('stat-alerts').textContent = stats.total_alertas_ativos;
        document.getElementById('stat-critical').textContent = stats.zonas_criticas;
        document.getElementById('stat-warning').textContent = stats.zonas_alerta;

        const risks = await API.get('/api/dashboard/risk-summary');
        const riskList = document.getElementById('risk-list');
        riskList.innerHTML = '';
        risks.forEach(r => {
            const div = document.createElement('div');
            div.style.padding = '14px 18px';
            div.style.marginBottom = '10px';
            div.style.borderRadius = '10px';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.transition = 'all 0.2s ease';
            
            let chipClass = 'chip-baixo';
            let cardBg = 'rgba(16, 185, 129, 0.08)';
            let cardBorder = '1px solid rgba(16, 185, 129, 0.25)';
            let tagColor = '#6EE7B7';

            if (r.nivel_risco === 'critico') {
                chipClass = 'chip-critico';
                cardBg = 'rgba(239, 68, 68, 0.1)';
                cardBorder = '1px solid rgba(239, 68, 68, 0.35)';
                tagColor = '#FCA5A5';
            } else if (r.nivel_risco === 'alto') {
                chipClass = 'chip-alto';
                cardBg = 'rgba(249, 115, 22, 0.1)';
                cardBorder = '1px solid rgba(249, 115, 22, 0.35)';
                tagColor = '#FDBA74';
            } else if (r.nivel_risco === 'moderado') {
                chipClass = 'chip-moderado';
                cardBg = 'rgba(245, 158, 11, 0.1)';
                cardBorder = '1px solid rgba(245, 158, 11, 0.35)';
                tagColor = '#FDE047';
            }

            div.style.background = cardBg;
            div.style.border = cardBorder;

            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">📍</span>
                    <div>
                        <strong style="color: #FFFFFF; font-size: 15px; display: block; font-weight: 700;">${r.zone_name}</strong>
                        <span style="font-size: 12px; color: ${tagColor}; font-weight: 600;">Região Central • Liberdade / Sé</span>
                    </div>
                </div>
                <span class="chip ${chipClass}">${r.nivel_risco.toUpperCase()} (${Math.round(r.probabilidade)}%)</span>
            `;
            riskList.appendChild(div);
        });

    } catch (e) {
        console.error("Erro ao carregar dashboard", e);
    }
}

document.addEventListener('DOMContentLoaded', loadDashboard);
setInterval(loadDashboard, 30000);
