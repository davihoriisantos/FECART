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
            div.style.padding = '8px 0';
            div.style.borderBottom = '1px solid var(--border-color)';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            
            let chipClass = 'chip-baixo';
            if (r.nivel_risco === 'critico') chipClass = 'chip-critico';
            else if (r.nivel_risco === 'alto') chipClass = 'chip-alto';
            else if (r.nivel_risco === 'moderado') chipClass = 'chip-moderado';

            div.innerHTML = `<span>${r.zone_name}</span> <span class="chip ${chipClass}">${r.nivel_risco.toUpperCase()} (${Math.round(r.probabilidade)}%)</span>`;
            riskList.appendChild(div);
        });

    } catch (e) {
        console.error("Erro ao carregar dashboard", e);
    }
}

document.addEventListener('DOMContentLoaded', loadDashboard);
setInterval(loadDashboard, 30000);
