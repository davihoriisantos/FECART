let map;
let heatLayer;

async function initMap() {
    map = L.map('map').setView([-23.5580, -46.5970], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    try {
        const heatmapData = await API.get('/api/zones/heatmap');
        const heatPoints = heatmapData.map(p => [p.latitude, p.longitude, p.intensity * 200]); // Multiply intensity for visual effect
        
        heatLayer = L.heatLayer(heatPoints, {radius: 40, blur: 25, maxZoom: 15}).addTo(map);

        const zones = await API.get('/api/zones');
        zones.forEach(zone => {
            let color = 'green';
            if (zone.nivel_risco === 'critico') color = 'red';
            else if (zone.nivel_risco === 'alto') color = 'orange';
            else if (zone.nivel_risco === 'moderado') color = 'yellow';

            let coords;
            try {
                coords = JSON.parse(zone.polygon_coords);
            } catch (e) {
                coords = [];
            }
            
            if (coords.length > 0) {
                L.polygon(coords, {color: color, fillColor: color, fillOpacity: 0.2})
                 .addTo(map)
                 .bindPopup(`<b>${zone.nome}</b><br>Risco: ${zone.nivel_risco.toUpperCase()}<br>Probabilidade: ${Math.round(zone.probabilidade_enchente)}%`);
            } else {
                 L.circle([zone.latitude_centro, zone.longitude_centro], {radius: zone.raio_metros, color: color, fillColor: color, fillOpacity: 0.2})
                 .addTo(map)
                 .bindPopup(`<b>${zone.nome}</b><br>Risco: ${zone.nivel_risco.toUpperCase()}<br>Probabilidade: ${Math.round(zone.probabilidade_enchente)}%`);
            }
        });

        const sensors = await API.get('/api/sensors');
        sensors.forEach(sensor => {
            L.circleMarker([sensor.latitude, sensor.longitude], {radius: 6, color: '#38BDF8', fillColor: '#38BDF8', fillOpacity: 1})
             .addTo(map)
             .bindPopup(`<b>${sensor.nome}</b><br>Tipo: ${sensor.tipo}`);
        });
    } catch (e) {
        console.error("Erro ao carregar mapa", e);
    }
}

document.addEventListener('DOMContentLoaded', initMap);
