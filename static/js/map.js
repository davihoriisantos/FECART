let map;
let zoneLayers = [];
let heatLayer;

async function initMap() {
    map = L.map('map').setView([-23.5580, -46.5970], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    try {
        // Heatmap layer removed per request – keep only geometric shapes


        const zones = await API.get('/api/zones');

        // Helper to fetch current rain (mm) for a coordinate using Open‑Meteo
        async function fetchRain(lat, lon) {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=rain&timezone=America%2FSao_Paulo`;
            try {
                const resp = await fetch(url);
                const data = await resp.json();
                const now = new Date();
                const times = data.hourly.time;
                const rains = data.hourly.rain;
                let idx = times.findIndex(t => new Date(t).getHours() === now.getHours());
                if (idx === -1) idx = times.length - 1;
                return rains[idx] ?? 0;
            } catch (e) {
                console.error('Erro ao buscar chuva', e);
                return 0;
            }
        }

        // Rain thresholds (mm) → color mapping (Verde, Amarelo, Laranja, Vermelho)
        const RAIN_THRESHOLDS = [10, 30, 50];
        const RAIN_COLORS = ['green', 'yellow', 'orange', 'red'];

        // Fetch rain per zone using its centroid coordinates
        for (const zone of zones) {
            const rain = await fetchRain(zone.latitude_centro, zone.longitude_centro);
            let color;
            if (rain < RAIN_THRESHOLDS[0]) color = RAIN_COLORS[0];
            else if (rain < RAIN_THRESHOLDS[1]) color = RAIN_COLORS[1];
            else if (rain < RAIN_THRESHOLDS[2]) color = RAIN_COLORS[2];
            else color = RAIN_COLORS[3];

            // Determine risk level and recommendation based on rain amount
            let riskLevel, recommendation;
            if (rain < RAIN_THRESHOLDS[0]) {
                riskLevel = 'Baixo';
                recommendation = 'Sem ação necessária.';
            } else if (rain < RAIN_THRESHOLDS[1]) {
                riskLevel = 'Moderado';
                recommendation = 'Evite áreas propensas a alagamento.';
            } else if (rain < RAIN_THRESHOLDS[2]) {
                riskLevel = 'Alto';
                recommendation = 'Evite áreas baixas.';
            } else {
                riskLevel = 'Crítico';
                recommendation = 'Procure refúgio imediato.';
            }

            let coords;
            try { coords = JSON.parse(zone.polygon_coords); } catch (e) { coords = []; }

            if (coords.length > 0) {
                let layer = L.polygon(coords, {color, fillColor: color, fillOpacity: 0.4})
                 .addTo(map)
                 .bindPopup(`<b>${zone.nome}</b><br>Chuva: ${rain.toFixed(1)} mm<br>Risco: ${riskLevel}<br>${recommendation}`);
                zoneLayers.push(layer);
            } else {
                let layer = L.circle([zone.latitude_centro, zone.longitude_centro], {radius: zone.raio_metros, color, fillColor: color, fillOpacity: 0})
                 .addTo(map)
                 .bindPopup(`<b>${zone.nome}</b><br>Chuva: ${rain.toFixed(1)} mm<br>Risco: ${riskLevel}<br>${recommendation}`);
                zoneLayers.push(layer);
            }
        }

        const sensors = await API.get('/api/sensors');
        sensors.forEach(sensor => {
            L.circleMarker([sensor.latitude, sensor.longitude], {radius: 6, color: '#38BDF8', fillColor: '#38BDF8', fillOpacity: 1})
             .addTo(map)
             .bindPopup(`<b>${sensor.nome}</b><br>Tipo: ${sensor.tipo}`);
        });

        // Simulation button handlers
        const btnEnchente = document.getElementById('btn-enchente');
        const btnLimpo = document.getElementById('btn-limpo');
        if (btnEnchente && btnLimpo) {
            btnEnchente.addEventListener('click', () => {
                zoneLayers.forEach(l => l.setStyle({color: 'red', fillColor: 'red'}));
            });
            btnLimpo.addEventListener('click', () => {
                zoneLayers.forEach(l => l.setStyle({color: 'green', fillColor: 'green'}));
            });
        }
    } catch (e) {
        console.error("Erro ao carregar mapa", e);
    }
}

document.addEventListener('DOMContentLoaded', initMap);
