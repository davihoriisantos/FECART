/**
 * FloodGuard AI — Sistema de Navegação Inteligente e Pesquisa Regional
 * Permite buscar bairros/POIs e calcular o risco de alagamento em um trajeto.
 */

// ─── BASE DE DADOS LOCAL DE PONTOS DE INTERESSE ───────────────────────────────
const SP_POI = [
    // ─ Entorno FECAP (Liberdade / Centro / Sé) ─
    { id: "fecap_campus",    nome: "FECAP — Campus Liberdade",       bairro: "Liberdade",           lat: -23.5574, lon: -46.6367, icon: "🎓", severidade: null },
    { id: "fecap_001",       nome: "Baixada do Glicério",             bairro: "Glicério / Liberdade", lat: -23.5592, lon: -46.6288, icon: "🚨", severidade: "critico" },
    { id: "fecap_002",       nome: "Viaduto do Chá / Anhangabaú",    bairro: "Centro Histórico",    lat: -23.5475, lon: -46.6378, icon: "🌊", severidade: "critico" },
    { id: "fecap_003",       nome: "Av. do Estado (Trecho Radial)",  bairro: "Sé / Liberdade",      lat: -23.5528, lon: -46.6268, icon: "⚠️", severidade: "alto" },
    { id: "fecap_004",       nome: "Rua Conselheiro Furtado",        bairro: "Liberdade",           lat: -23.5558, lon: -46.6315, icon: "⚠️", severidade: "alto" },
    { id: "fecap_005",       nome: "Praça da Sé",                    bairro: "Centro / Sé",         lat: -23.5505, lon: -46.6333, icon: "🟡", severidade: "moderado" },
    { id: "fecap_006",       nome: "Av. Liberdade (Frente FECAP)",   bairro: "Liberdade",           lat: -23.5574, lon: -46.6367, icon: "🛡️", severidade: "baixo" },
    // ─ Bairros conhecidos de SP ─
    { id: "sp_mooca",        nome: "Mooca",                          bairro: "Mooca",               lat: -23.5590, lon: -46.5950, icon: "📍", severidade: "critico" },
    { id: "sp_margtietê",    nome: "Marginal Tietê",                 bairro: "Bom Retiro",          lat: -23.5180, lon: -46.6340, icon: "📍", severidade: "critico" },
    { id: "sp_margpinheiros",nome: "Marginal Pinheiros",             bairro: "Pinheiros",           lat: -23.5610, lon: -46.7020, icon: "📍", severidade: "critico" },
    { id: "sp_tatuape",      nome: "Tatuapé",                        bairro: "Tatuapé",             lat: -23.5430, lon: -46.5610, icon: "📍", severidade: "critico" },
    { id: "sp_santana",      nome: "Santana",                        bairro: "Santana",             lat: -23.5150, lon: -46.6230, icon: "📍", severidade: "critico" },
    { id: "sp_cambuci",      nome: "Cambuci / Glicério",             bairro: "Cambuci",             lat: -23.5631, lon: -46.6326, icon: "📍", severidade: "critico" },
    { id: "sp_lapa",         nome: "Lapa",                          bairro: "Lapa",                lat: -23.5189, lon: -46.7020, icon: "📍", severidade: "alto" },
    { id: "sp_brooklin",     nome: "Brooklin",                      bairro: "Brooklin",            lat: -23.6120, lon: -46.6780, icon: "📍", severidade: "alto" },
    { id: "sp_leopoldina",   nome: "Vila Leopoldina",               bairro: "Vila Leopoldina",     lat: -23.5320, lon: -46.7350, icon: "📍", severidade: "alto" },
    { id: "sp_sacomã",       nome: "Sacomã",                        bairro: "Sacomã",              lat: -23.5998, lon: -46.5501, icon: "📍", severidade: "alto" },
    { id: "sp_ipiranga",     nome: "Ipiranga",                      bairro: "Ipiranga",            lat: -23.5850, lon: -46.6080, icon: "📍", severidade: "moderado" },
    { id: "sp_itaquera",     nome: "Itaquera",                      bairro: "Itaquera",            lat: -23.5395, lon: -46.4580, icon: "📍", severidade: "moderado" },
    { id: "sp_republica",    nome: "Praça da República",            bairro: "República",           lat: -23.5427, lon: -46.6428, icon: "📍", severidade: null },
    { id: "sp_paulista",     nome: "Avenida Paulista",              bairro: "Bela Vista",          lat: -23.5613, lon: -46.6557, icon: "📍", severidade: null },
    { id: "sp_bras",         nome: "Brás",                          bairro: "Brás",                lat: -23.5420, lon: -46.6210, icon: "📍", severidade: null },
    { id: "sp_pinheiros",    nome: "Pinheiros",                     bairro: "Pinheiros",           lat: -23.5640, lon: -46.6902, icon: "📍", severidade: null },
    { id: "sp_consolacao",   nome: "Consolação",                    bairro: "Consolação",          lat: -23.5490, lon: -46.6570, icon: "📍", severidade: null },
    { id: "sp_bela_vista",   nome: "Bela Vista / Bixiga",           bairro: "Bela Vista",          lat: -23.5560, lon: -46.6450, icon: "📍", severidade: null },
    { id: "sp_higienopolis", nome: "Higienópolis",                  bairro: "Higienópolis",        lat: -23.5436, lon: -46.6546, icon: "📍", severidade: null },
    { id: "sp_ibirapuera",   nome: "Parque Ibirapuera",             bairro: "Vila Mariana",        lat: -23.5874, lon: -46.6574, icon: "🌳", severidade: null },
    { id: "sp_rodoviaria",   nome: "Rodoviária do Tietê",           bairro: "Carandiru",           lat: -23.5161, lon: -46.6269, icon: "🚌", severidade: "alto" },
    { id: "sp_luz",          nome: "Estação da Luz / Pinacoteca",   bairro: "Santa Ifigênia",      lat: -23.5343, lon: -46.6340, icon: "🚂", severidade: "moderado" },
    { id: "sp_liberdade",    nome: "Liberdade (Bairro)",            bairro: "Liberdade",           lat: -23.5594, lon: -46.6362, icon: "📍", severidade: "alto" },
];

// ─── ESTADO DA NAVEGAÇÃO ──────────────────────────────────────────────────────
let _navMode = 'explorar';
let _routeLayers = [];
let _searchMarker = null;
let _geocodeCache = {};
let _navSearchResults = [];

// ─── INICIALIZAÇÃO ─────────────────────────────────────────────────────────────
function initNavigation() {
    if (typeof map === 'undefined' || !map) {
        setTimeout(initNavigation, 600);
        return;
    }

    const searchInput = document.getElementById('nav-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => handleSearchInput(searchInput.value));
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAutocomplete('nav-autocomplete-dropdown');
            if (e.key === 'Enter' && _navSearchResults.length > 0) selectNavSearchItem(0);
        });
    }

    // Fechar dropdown ao clicar no mapa
    const mapEl = document.getElementById('map');
    if (mapEl) mapEl.addEventListener('click', () => {
        closeAutocomplete('nav-autocomplete-dropdown');
        closeAutocomplete('nav-dropdown-origem');
        closeAutocomplete('nav-dropdown-destino');
    });
}

// ─── TROCAR ABA ────────────────────────────────────────────────────────────────
function switchNavTab(tab) {
    _navMode = tab;

    const tabExplorar   = document.getElementById('nav-tab-explorar');
    const tabRota       = document.getElementById('nav-tab-rota');
    const contExplorar  = document.getElementById('nav-content-explorar');
    const contRota      = document.getElementById('nav-content-rota');

    const ACTIVE_STYLE   = 'background:rgba(56,189,248,0.12);color:#38BDF8;border-bottom:2px solid #38BDF8;';
    const INACTIVE_STYLE = 'background:transparent;color:#94A3B8;border-bottom:2px solid transparent;';

    if (tab === 'explorar') {
        tabExplorar.setAttribute('style', tabExplorar.getAttribute('style').replace(/background:[^;]+;color:[^;]+;border-bottom:[^;]+;/g, '') + ACTIVE_STYLE);
        tabRota.setAttribute('style', tabRota.getAttribute('style').replace(/background:[^;]+;color:[^;]+;border-bottom:[^;]+;/g, '') + INACTIVE_STYLE);
        contExplorar.style.display = 'block';
        contRota.style.display = 'none';
    } else {
        tabRota.setAttribute('style', tabRota.getAttribute('style').replace(/background:[^;]+;color:[^;]+;border-bottom:[^;]+;/g, '') + ACTIVE_STYLE.replace(/#38BDF8/g, '#A855F7'));
        tabExplorar.setAttribute('style', tabExplorar.getAttribute('style').replace(/background:[^;]+;color:[^;]+;border-bottom:[^;]+;/g, '') + INACTIVE_STYLE);
        contRota.style.display = 'block';
        contExplorar.style.display = 'none';
    }

    const alertEl = document.getElementById('nav-route-alert');
    if (alertEl) alertEl.style.display = 'none';
}

// ─── AUTOCOMPLETAR — EXPLORAR REGIÃO ──────────────────────────────────────────
function handleSearchInput(val) {
    const dropdown = document.getElementById('nav-autocomplete-dropdown');
    if (!val || val.length < 2) {
        dropdown.style.display = 'none';
        return;
    }

    const localResults = _filterPOI(val, 6);
    _navSearchResults = localResults;
    _renderAutocompleteDropdown(localResults, 'nav-autocomplete-dropdown', 'selectNavSearchItem');

    // Fallback Nominatim se poucos resultados locais
    if (localResults.length < 3 && val.length >= 3) {
        _fetchNominatim(val).then(extra => {
            const merged = [
                ...localResults,
                ...extra.filter(r => !localResults.find(l => Math.abs(l.lat - r.lat) < 0.002))
            ].slice(0, 6);
            _navSearchResults = merged;
            _renderAutocompleteDropdown(merged, 'nav-autocomplete-dropdown', 'selectNavSearchItem');
        });
    }
}

function selectNavSearchItem(idx) {
    const item = _navSearchResults[idx];
    if (!item) return;

    const input = document.getElementById('nav-search-input');
    if (input) input.value = item.nome;
    closeAutocomplete('nav-autocomplete-dropdown');
    _zoomToItem(item);
    
    // Filtra o sidebar se existir um select
    const sbSelect = document.getElementById('sidebar-point-select');
    if (sbSelect && typeof openSidebar === 'function') {
        // Encontra a opção correspondente e abre a sidebar
        // Por simplicidade na demo, vamos apenas abrir a sidebar se já tiver um item histórico associado
        const opt = Array.from(sbSelect.options).find(o => o.text.toLowerCase().includes(item.nome.toLowerCase()) || (item.id && o.value === item.id));
        if (opt) {
            sbSelect.value = opt.value;
            if (typeof onSidebarPointChange === 'function') {
                onSidebarPointChange(opt.value);
            }
            openSidebar();
        }
    }
}

// ─── AUTOCOMPLETAR — CAMPOS DE ROTA ───────────────────────────────────────────
let _origemResults = [];
let _destinoResults = [];

function handleRouteFieldInput(fieldId, dropdownId, val) {
    const dropdown = document.getElementById(dropdownId);
    if (!val || val.length < 2) {
        dropdown.style.display = 'none';
        return;
    }

    const results = _filterPOI(val, 5);
    if (dropdownId === 'nav-dropdown-origem') {
        _origemResults = results;
        _renderAutocompleteDropdown(results, dropdownId, 'selectOrigemItem');
    } else {
        _destinoResults = results;
        _renderAutocompleteDropdown(results, dropdownId, 'selectDestinoItem');
    }
}

function selectOrigemItem(idx) {
    const item = _origemResults[idx];
    if (!item) return;
    document.getElementById('nav-origem').value = item.nome;
    closeAutocomplete('nav-dropdown-origem');
}

function selectDestinoItem(idx) {
    const item = _destinoResults[idx];
    if (!item) return;
    document.getElementById('nav-destino').value = item.nome;
    closeAutocomplete('nav-dropdown-destino');
}

function usarLocalAtual() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const input = document.getElementById('nav-origem');
            if (input) {
                input.value = `Local Atual (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
                _geocodeCache[input.value] = { lat: pos.coords.latitude, lon: pos.coords.longitude, nome: 'Local Atual' };
            }
        }, () => {
            alert('Não foi possível obter a sua localização.');
        });
    } else {
        alert('Geolocalização não é suportada por este navegador.');
    }
}

// ─── ZOOM NO ITEM SELECIONADO ─────────────────────────────────────────────────
function _zoomToItem(item) {
    if (typeof map === 'undefined' || !map) return;

    map.flyTo([item.lat, item.lon], 16, { duration: 1.2, easeLinearity: 0.25 });

    if (_searchMarker) { map.removeLayer(_searchMarker); _searchMarker = null; }

    const riskColor = _riskColor(item.severidade);
    const iconHtml = `<div style="background:${riskColor};width:30px;height:30px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 14px ${riskColor}99;">${item.icon || '📍'}</div>`;
    const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [30, 30], iconAnchor: [15, 15] });

    const riskBadge = item.severidade
        ? `<div style="margin-top:8px;padding:3px 10px;border-radius:6px;background:${riskColor}22;color:${riskColor};font-weight:700;font-size:11px;border:1px solid ${riskColor}55;text-align:center;text-transform:uppercase;">Risco ${item.severidade}</div>`
        : '';

    _searchMarker = L.marker([item.lat, item.lon], { icon })
        .addTo(map)
        .bindPopup(`<div style="font-family:sans-serif;padding:6px 2px;min-width:170px;"><div style="font-weight:800;font-size:14px;color:#0f172a;">${item.nome}</div><div style="font-size:12px;color:#475569;margin-top:2px;">📍 ${item.bairro}</div>${riskBadge}</div>`, { maxWidth: 240 })
        .openPopup();
}

// ─── CALCULAR RISCO DO TRAJETO ─────────────────────────────────────────────────
async function calcularRiscoTrajeto() {
    const origemVal  = (document.getElementById('nav-origem')?.value  || '').trim();
    const destinoVal = (document.getElementById('nav-destino')?.value || '').trim();

    if (!origemVal || !destinoVal) {
        showRouteAlert('warning', '⚠️ Preencha o <strong>ponto de partida</strong> e o <strong>destino</strong> antes de calcular.');
        return;
    }

    const alertEl = document.getElementById('nav-route-alert');
    alertEl.innerHTML = `<div style="padding:12px 16px;font-size:13px;color:#38BDF8;display:flex;align-items:center;gap:8px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.3);border-radius:10px;">⏳ Calculando risco do trajeto...</div>`;
    alertEl.style.display = 'block';

    const [origem, destino] = await Promise.all([
        _geocodeQuery(origemVal),
        _geocodeQuery(destinoVal)
    ]);

    if (!origem) { showRouteAlert('error', `❌ Ponto de partida não encontrado: <em>"${origemVal}"</em>. Tente um nome mais específico.`); return; }
    if (!destino) { showRouteAlert('error', `❌ Destino não encontrado: <em>"${destinoVal}"</em>. Tente um nome mais específico.`); return; }

    _processRouteRisk(origem, destino, false);
}

// ─── MODO DEMO: FECAP → ANHANGABAÚ ────────────────────────────────────────────
function testarRotaFECAP() {
    switchNavTab('rota');

    document.getElementById('nav-origem').value  = 'FECAP — Campus Liberdade';
    document.getElementById('nav-destino').value = 'Viaduto do Chá / Anhangabaú';

    const origem  = { lat: -23.5574, lon: -46.6367, nome: 'FECAP — Campus Liberdade' };
    const destino = { lat: -23.5475, lon: -46.6378, nome: 'Viaduto do Chá / Anhangabaú' };
    _processRouteRisk(origem, destino, true);
}

// ─── PROCESSAMENTO PRINCIPAL DE RISCO ─────────────────────────────────────────
function _processRouteRisk(origem, destino, isDemo) {
    clearRoute();

    const zonas = _getZonasRisco();
    const NUM_SAMPLES = 40;
    const routePoints = [];

    for (let i = 0; i <= NUM_SAMPLES; i++) {
        const t = i / NUM_SAMPLES;
        routePoints.push({
            lat: origem.lat + (destino.lat - origem.lat) * t,
            lon: origem.lon + (destino.lon - origem.lon) * t
        });
    }

    // ─ Avaliação de risco por segmento ─
    const segmentRisks = [];
    const riskyZones   = [];
    const seenIds      = new Set();

    for (let i = 0; i < routePoints.length - 1; i++) {
        const midLat = (routePoints[i].lat + routePoints[i + 1].lat) / 2;
        const midLon = (routePoints[i].lon + routePoints[i + 1].lon) / 2;

        let worstLevel = 0;
        let worstZone  = null;

        for (const z of zonas) {
            const dist   = _haversine(midLat, midLon, z.lat, z.lon);
            // Em modo demo, raio ampliado para garantir interseção pedagógica
            const radius = isDemo ? 650 : (z.raio_m || 450);

            if (dist <= radius) {
                const lvl = _severityLevel(z.severidade);
                if (lvl > worstLevel) {
                    worstLevel = lvl;
                    worstZone  = z;
                }
            }
        }

        segmentRisks.push({ level: worstLevel, zona: worstZone });

        if (worstZone && worstLevel >= 3 && !seenIds.has(worstZone.id)) {
            seenIds.add(worstZone.id);
            riskyZones.push({ ...worstZone, level: worstLevel });
        }
    }

    _drawRoute(routePoints, segmentRisks, origem, destino);

    // ─ Mostrar alerta ─
    if (riskyZones.length > 0) {
        riskyZones.sort((a, b) => b.level - a.level);
        const worst = riskyZones[0];
        const prob  = worst.prob ?? (worst.level === 4 ? 85 : 65);
        const extra = riskyZones.slice(1).map(z => z.nome).join(', ');

        showRouteAlert('danger',
            `⚠️ <strong>Seu trajeto passa por ${riskyZones.length} ponto(s) de risco ${worst.level === 4 ? 'CRÍTICO' : 'ALTO'}.</strong><br>` +
            `<span style="color:#FCA5A5;font-size:12px;">🚨 ${worst.nome} — Risco ${prob}%</span>` +
            (extra ? `<br><span style="color:#FDBA74;font-size:11px;">Outros pontos afetados: ${extra}</span>` : '') +
            `<br><span style="color:#CBD5E1;font-size:12px;margin-top:4px;display:block;">Recomendamos alterar a rota ou evitar esta região durante chuvas intensas.</span>`
        );
    } else {
        showRouteAlert('success',
            `✅ <strong>Trajeto Seguro!</strong><br>` +
            `<span style="color:#6EE7B7;font-size:12px;">Nenhum ponto de alagamento detectado entre <em>${origem.nome}</em> e <em>${destino.nome}</em>.</span>`
        );
    }

    // Ajustar câmera do mapa
    if (typeof map !== 'undefined') {
        map.fitBounds([
            [Math.min(origem.lat, destino.lat) - 0.004, Math.min(origem.lon, destino.lon) - 0.006],
            [Math.max(origem.lat, destino.lat) + 0.004, Math.max(origem.lon, destino.lon) + 0.006]
        ], { padding: [60, 60], animate: true });
    }
}

// ─── DESENHAR ROTA NO MAPA ─────────────────────────────────────────────────────
function _drawRoute(points, segRisks, origem, destino) {
    if (typeof map === 'undefined') return;

    // Linha sombra (espessura maior, preta)
    const shadowLine = L.polyline(
        points.map(p => [p.lat, p.lon]),
        { color: '#000000', weight: 9, opacity: 0.3, lineJoin: 'round', lineCap: 'round' }
    ).addTo(map);
    _routeLayers.push(shadowLine);

    // Segmentos coloridos
    for (let i = 0; i < points.length - 1; i++) {
        const r = segRisks[i];
        const color  = r.level >= 4 ? '#EF4444' : r.level === 3 ? '#F97316' : r.level === 2 ? '#F59E0B' : '#10B981';
        const weight = r.level >= 3 ? 7 : 5;

        const seg = L.polyline(
            [[points[i].lat, points[i].lon], [points[i + 1].lat, points[i + 1].lon]],
            { color, weight, opacity: 0.9, lineJoin: 'round', lineCap: 'round' }
        ).addTo(map);
        _routeLayers.push(seg);
    }

    // Marcador de origem
    const mOrigem = L.marker([origem.lat, origem.lon], {
        icon: L.divIcon({
            className: '',
            html: `<div style="background:#38BDF8;width:34px;height:34px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 14px rgba(56,189,248,0.7);">🚀</div>`,
            iconSize: [34, 34], iconAnchor: [17, 17]
        })
    }).addTo(map).bindPopup(`<b>🚀 Partida:</b> ${origem.nome}`);
    _routeLayers.push(mOrigem);

    // Marcador de destino
    const mDestino = L.marker([destino.lat, destino.lon], {
        icon: L.divIcon({
            className: '',
            html: `<div style="background:#A855F7;width:34px;height:34px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 14px rgba(168,85,247,0.7);">🏁</div>`,
            iconSize: [34, 34], iconAnchor: [17, 17]
        })
    }).addTo(map).bindPopup(`<b>🏁 Destino:</b> ${destino.nome}`);
    _routeLayers.push(mDestino);

    // Marcadores de aviso nas zonas de risco encontradas
    const seenWarning = new Set();
    segRisks.forEach((s, i) => {
        if (s.level >= 3 && s.zona && !seenWarning.has(s.zona.id)) {
            seenWarning.add(s.zona.id);
            const pt   = points[Math.round((i + Math.min(i + 1, points.length - 1)) / 2)];
            const bColor = s.level >= 4 ? '#EF4444' : '#F97316';
            const warnIcon = L.divIcon({
                className: '',
                html: `<div style="background:${bColor};width:28px;height:28px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 0 10px ${bColor}99;animation:pulse-hist 1.5s infinite;">⚠️</div>`,
                iconSize: [28, 28], iconAnchor: [14, 14]
            });
            const wm = L.marker([s.zona.lat, s.zona.lon], { icon: warnIcon })
                .addTo(map)
                .bindPopup(`<div style="font-family:sans-serif;padding:4px;"><b style="color:${bColor};">⚠️ ${s.zona.nome}</b><br><small>Zona de risco ${s.zona.severidade?.toUpperCase()} — Área sujeita a alagamento</small></div>`);
            _routeLayers.push(wm);
        }
    });
}

// ─── LIMPAR ROTA ───────────────────────────────────────────────────────────────
function clearRoute() {
    if (typeof map !== 'undefined') {
        _routeLayers.forEach(l => { try { map.removeLayer(l); } catch (_) {} });
    }
    _routeLayers = [];
    const alertEl = document.getElementById('nav-route-alert');
    if (alertEl) alertEl.style.display = 'none';
}

// ─── EXIBIR CARD DE ALERTA ─────────────────────────────────────────────────────
function showRouteAlert(type, message) {
    const el = document.getElementById('nav-route-alert');
    if (!el) return;

    const cfg = {
        danger:  { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.5)' },
        success: { bg: 'rgba(16,185,129,0.12)',   border: 'rgba(16,185,129,0.5)' },
        warning: { bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.5)' },
        error:   { bg: 'rgba(239,68,68,0.07)',    border: 'rgba(239,68,68,0.3)' },
    }[type] || { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.2)' };

    el.innerHTML = `
        <div style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:10px;padding:13px 16px;font-size:13px;line-height:1.55;color:#E2E8F0;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div style="flex:1;">${message}</div>
                <button onclick="clearRoute()" title="Fechar" style="background:transparent;border:none;color:#94A3B8;cursor:pointer;font-size:17px;padding:0;line-height:1;flex-shrink:0;margin-top:-1px;">✕</button>
            </div>
        </div>`;
    el.style.display = 'block';
}

// ─── FECHAR DROPDOWN ──────────────────────────────────────────────────────────
function closeAutocomplete(dropdownId) {
    const el = document.getElementById(dropdownId);
    if (el) el.style.display = 'none';
}

// ─── RENDERIZAR DROPDOWN ──────────────────────────────────────────────────────
function _renderAutocompleteDropdown(results, dropdownId, selectFn) {
    const el = document.getElementById(dropdownId);
    if (!el) return;

    if (!results.length) {
        el.innerHTML = `<div style="padding:12px 16px;color:#94A3B8;font-size:13px;">Nenhum resultado encontrado.</div>`;
        el.style.display = 'block';
        return;
    }

    el.innerHTML = results.map((r, idx) => {
        const rColor  = _riskColor(r.severidade);
        const badge   = r.severidade
            ? `<span style="font-size:10px;padding:2px 6px;border-radius:8px;background:${rColor}22;color:${rColor};border:1px solid ${rColor}66;font-weight:700;text-transform:uppercase;white-space:nowrap;">${r.severidade}</span>`
            : '';
        return `<div class="nav-autocomplete-item" onclick="${selectFn}(${idx})" style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
            <span style="font-size:17px;flex-shrink:0;">${r.icon || '📍'}</span>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:13px;color:#FFFFFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.nome}</div>
                <div style="font-size:11px;color:#94A3B8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.bairro}</div>
            </div>
            ${badge}
        </div>`;
    }).join('');
    el.style.display = 'block';
}

// ─── FILTRAR POI LOCAL ─────────────────────────────────────────────────────────
function _filterPOI(val, limit) {
    const q = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const extra = typeof HISTORICO_DEFESA_CIVIL !== 'undefined'
        ? HISTORICO_DEFESA_CIVIL.map(p => ({
            id: p.id, nome: p.nome, bairro: p.bairro,
            lat: p.lat, lon: p.lon, icon: '📌',
            severidade: p.historico_severidade?.toLowerCase() || null
          }))
        : [];

    const all = [...SP_POI, ...extra.filter(e => !SP_POI.find(s => s.id === e.id))];

    return all.filter(p => {
        const nome   = (p.nome   || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const bairro = (p.bairro || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nome.includes(q) || bairro.includes(q);
    }).slice(0, limit);
}

// ─── GEOCODIFICAÇÃO (LOCAL + NOMINATIM) ───────────────────────────────────────
async function _geocodeQuery(query) {
    const local = _filterPOI(query, 1)[0];
    if (local) return { lat: local.lat, lon: local.lon, nome: local.nome };

    if (_geocodeCache[query]) return _geocodeCache[query];
    try {
        const url  = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' São Paulo')}&limit=1&countrycodes=br`;
        const resp = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        const data = await resp.json();
        if (data.length > 0) {
            const r = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), nome: data[0].display_name.split(',')[0] };
            _geocodeCache[query] = r;
            return r;
        }
    } catch (_) {}
    return null;
}

// ─── NOMINATIM PARA AUTOCOMPLETE ──────────────────────────────────────────────
async function _fetchNominatim(query) {
    try {
        const url  = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' São Paulo')}&limit=4&countrycodes=br`;
        const resp = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        const data = await resp.json();
        return data.map(item => ({
            id: 'nom_' + item.place_id,
            nome: item.display_name.split(',')[0],
            bairro: item.display_name.split(',').slice(1, 3).join(',').trim(),
            lat: parseFloat(item.lat), lon: parseFloat(item.lon),
            icon: '🔍', severidade: null
        }));
    } catch (_) { return []; }
}

// ─── ZONAS DE RISCO (da lista historico_defesa_civil) ────────────────────────
function _getZonasRisco() {
    const base = typeof HISTORICO_DEFESA_CIVIL !== 'undefined' ? HISTORICO_DEFESA_CIVIL : [];
    return base.map(p => ({
        id: p.id, nome: p.nome, bairro: p.bairro,
        lat: p.lat, lon: p.lon,
        severidade: p.historico_severidade?.toLowerCase() || 'baixo',
        prob: p.historico_severidade === 'Crítico' ? 85 :
              p.historico_severidade === 'Alto'    ? 65 :
              p.historico_severidade === 'Moderado'? 40 : 15,
        raio_m: p.historico_severidade === 'Crítico' ? 500 :
                p.historico_severidade === 'Alto'    ? 400 : 300
    }));
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────
function _haversine(lat1, lon1, lat2, lon2) {
    const R    = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a    = Math.sin(dLat / 2) ** 2 +
                 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _riskColor(sev) {
    return sev === 'critico'  ? '#EF4444' :
           sev === 'alto'     ? '#F97316' :
           sev === 'moderado' ? '#F59E0B' :
           sev === 'baixo'    ? '#10B981' : '#38BDF8';
}

function _severityLevel(sev) {
    if (!sev) return 0;
    const s = sev.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s === 'critico' ? 4 : s === 'alto' ? 3 : s === 'moderado' ? 2 : s === 'baixo' ? 1 : 0;
}

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => setTimeout(initNavigation, 900));
