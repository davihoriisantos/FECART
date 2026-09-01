/**
 * FloodGuard AI — Sistema de Navegação Inteligente e Pesquisa Regional v2.0
 * Integração completa com painel lateral (sidebar) e verificador de risco de trajeto.
 */

// ─── BASE DE DADOS LOCAL DE PONTOS DE INTERESSE ───────────────────────────────
const SP_POI = [
    { id: "fecap_campus",     nome: "FECAP — Campus Liberdade",      bairro: "Liberdade",            lat: -23.5574, lon: -46.6367, icon: "🎓", sev: null,       hist: "Baixo",    rio: 450, alt: 735 },
    { id: "fecap_001",        nome: "Baixada do Glicério",            bairro: "Glicério / Liberdade", lat: -23.5592, lon: -46.6288, icon: "🚨", sev: "critico",  hist: "Crítico",  rio: 60,  alt: 719 },
    { id: "fecap_002",        nome: "Viaduto do Chá / Anhangabaú",   bairro: "Centro Histórico",     lat: -23.5475, lon: -46.6378, icon: "🌊", sev: "critico",  hist: "Crítico",  rio: 150, alt: 721 },
    { id: "fecap_003",        nome: "Av. do Estado (Trecho Radial)", bairro: "Sé / Liberdade",       lat: -23.5528, lon: -46.6268, icon: "⚠️", sev: "alto",     hist: "Alto",     rio: 80,  alt: 723 },
    { id: "fecap_004",        nome: "Rua Conselheiro Furtado",       bairro: "Liberdade",            lat: -23.5558, lon: -46.6315, icon: "⚠️", sev: "alto",     hist: "Alto",     rio: 200, alt: 726 },
    { id: "fecap_005",        nome: "Praça da Sé",                   bairro: "Centro / Sé",          lat: -23.5505, lon: -46.6333, icon: "🟡", sev: "moderado", hist: "Moderado", rio: 300, alt: 730 },
    { id: "fecap_006",        nome: "Av. Liberdade (Frente FECAP)",  bairro: "Liberdade",            lat: -23.5574, lon: -46.6367, icon: "🛡️", sev: "baixo",    hist: "Baixo",    rio: 450, alt: 735 },
    { id: "sp_mooca",         nome: "Mooca",                         bairro: "Mooca",                lat: -23.5590, lon: -46.5950, icon: "📍", sev: "critico",  hist: "Crítico",  rio: 70,  alt: 720 },
    { id: "sp_margtietê",     nome: "Marginal Tietê",                bairro: "Bom Retiro",           lat: -23.5180, lon: -46.6340, icon: "📍", sev: "critico",  hist: "Crítico",  rio: 30,  alt: 715 },
    { id: "sp_margpinheiros", nome: "Marginal Pinheiros",            bairro: "Pinheiros",            lat: -23.5610, lon: -46.7020, icon: "📍", sev: "critico",  hist: "Crítico",  rio: 40,  alt: 716 },
    { id: "sp_tatuape",       nome: "Tatuapé",                       bairro: "Tatuapé",              lat: -23.5430, lon: -46.5610, icon: "📍", sev: "critico",  hist: "Crítico",  rio: 90,  alt: 720 },
    { id: "sp_santana",       nome: "Santana",                       bairro: "Santana",              lat: -23.5150, lon: -46.6230, icon: "📍", sev: "critico",  hist: "Crítico",  rio: 50,  alt: 717 },
    { id: "sp_cambuci",       nome: "Cambuci / Glicério",            bairro: "Cambuci",              lat: -23.5631, lon: -46.6326, icon: "📍", sev: "critico",  hist: "Crítico",  rio: 75,  alt: 719 },
    { id: "sp_lapa",          nome: "Lapa",                          bairro: "Lapa",                 lat: -23.5189, lon: -46.7020, icon: "📍", sev: "alto",     hist: "Alto",     rio: 110, alt: 722 },
    { id: "sp_brooklin",      nome: "Brooklin",                      bairro: "Brooklin",             lat: -23.6120, lon: -46.6780, icon: "📍", sev: "alto",     hist: "Alto",     rio: 200, alt: 728 },
    { id: "sp_leopoldina",    nome: "Vila Leopoldina",               bairro: "Vila Leopoldina",      lat: -23.5320, lon: -46.7350, icon: "📍", sev: "alto",     hist: "Alto",     rio: 100, alt: 723 },
    { id: "sp_sacomã",        nome: "Sacomã",                        bairro: "Sacomã",               lat: -23.5998, lon: -46.5501, icon: "📍", sev: "alto",     hist: "Alto",     rio: 180, alt: 724 },
    { id: "sp_ipiranga",      nome: "Ipiranga",                      bairro: "Ipiranga",             lat: -23.5850, lon: -46.6080, icon: "📍", sev: "moderado", hist: "Moderado", rio: 250, alt: 730 },
    { id: "sp_itaquera",      nome: "Itaquera",                      bairro: "Itaquera",             lat: -23.5395, lon: -46.4580, icon: "📍", sev: "moderado", hist: "Moderado", rio: 300, alt: 733 },
    { id: "sp_rodoviaria",    nome: "Rodoviária do Tietê",           bairro: "Carandiru",            lat: -23.5161, lon: -46.6269, icon: "🚌", sev: "alto",     hist: "Alto",     rio: 80,  alt: 718 },
    { id: "sp_luz",           nome: "Estação da Luz / Pinacoteca",   bairro: "Santa Ifigênia",       lat: -23.5343, lon: -46.6340, icon: "🚂", sev: "moderado", hist: "Moderado", rio: 200, alt: 730 },
    { id: "sp_liberdade",     nome: "Liberdade (Bairro)",            bairro: "Liberdade",            lat: -23.5594, lon: -46.6362, icon: "📍", sev: "alto",     hist: "Alto",     rio: 300, alt: 730 },
    { id: "sp_republica",     nome: "Praça da República",            bairro: "República",            lat: -23.5427, lon: -46.6428, icon: "📍", sev: null,       hist: "Baixo",    rio: 400, alt: 735 },
    { id: "sp_paulista",      nome: "Avenida Paulista",              bairro: "Bela Vista",           lat: -23.5613, lon: -46.6557, icon: "📍", sev: null,       hist: "Baixo",    rio: 600, alt: 752 },
    { id: "sp_pinheiros",     nome: "Pinheiros",                     bairro: "Pinheiros",            lat: -23.5640, lon: -46.6902, icon: "📍", sev: null,       hist: "Baixo",    rio: 350, alt: 733 },
    { id: "sp_bras",          nome: "Brás",                          bairro: "Brás",                 lat: -23.5420, lon: -46.6210, icon: "📍", sev: null,       hist: "Baixo",    rio: 350, alt: 734 },
    { id: "sp_consolacao",    nome: "Consolação",                    bairro: "Consolação",           lat: -23.5490, lon: -46.6570, icon: "📍", sev: null,       hist: "Baixo",    rio: 500, alt: 742 },
    { id: "sp_ibirapuera",    nome: "Parque Ibirapuera",             bairro: "Vila Mariana",         lat: -23.5874, lon: -46.6574, icon: "🌳", sev: null,       hist: "Baixo",    rio: 700, alt: 760 },
];

// ID especial para pontos pesquisados que não existem no banco de dados
const NAV_CUSTOM_ID = '_nav_search_custom';

// ─── ESTADO DA NAVEGAÇÃO ──────────────────────────────────────────────────────
let _navMode        = 'explorar';
let _routeLayers    = [];
let _searchMarker   = null;
let _geocodeCache   = {};
let _navResults     = [];  // resultados do autocomplete explorar
let _origemResults  = [];
let _destinoResults = [];

// ─── INICIALIZAÇÃO ─────────────────────────────────────────────────────────────
function initNavigation() {
    if (typeof map === 'undefined' || !map) {
        setTimeout(initNavigation, 700);
        return;
    }

    // Listener no campo de busca de região
    const searchInput = document.getElementById('nav-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => handleSearchInput(searchInput.value));
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Escape') _closeDD('nav-autocomplete-dropdown');
            if (e.key === 'Enter' && _navResults.length > 0) selectNavItem(0);
        });
    }

    // Fechar dropdowns ao clicar no mapa
    document.getElementById('map')?.addEventListener('click', () => {
        _closeDD('nav-autocomplete-dropdown');
        _closeDD('nav-dropdown-origem');
        _closeDD('nav-dropdown-destino');
    });
}

// ─── TROCAR ABA ────────────────────────────────────────────────────────────────
function switchNavTab(tab) {
    _navMode = tab;

    const tabEx = document.getElementById('nav-tab-explorar');
    const tabRo = document.getElementById('nav-tab-rota');
    const cEx   = document.getElementById('nav-content-explorar');
    const cRo   = document.getElementById('nav-content-rota');

    const ON  = 'background:rgba(56,189,248,0.12);color:#38BDF8;border-bottom:2px solid #38BDF8;';
    const OFF = 'background:transparent;color:#94A3B8;border-bottom:2px solid transparent;';
    const ONV = 'background:rgba(168,85,247,0.12);color:#A855F7;border-bottom:2px solid #A855F7;';

    if (tab === 'explorar') {
        tabEx.setAttribute('style', _tabBase(tabEx) + ON);
        tabRo.setAttribute('style', _tabBase(tabRo) + OFF);
        cEx.style.display = 'block';
        cRo.style.display = 'none';
    } else {
        tabRo.setAttribute('style', _tabBase(tabRo) + ONV);
        tabEx.setAttribute('style', _tabBase(tabEx) + OFF);
        cRo.style.display = 'block';
        cEx.style.display = 'none';
    }
}

function _tabBase(el) {
    return (el.getAttribute('style') || '')
        .replace(/background:[^;]+;/g, '')
        .replace(/color:[^;]+;/g, '')
        .replace(/border-bottom:[^;]+;/g, '');
}

// ─── AUTOCOMPLETAR — EXPLORAR REGIÃO ──────────────────────────────────────────
function handleSearchInput(val) {
    const dd = document.getElementById('nav-autocomplete-dropdown');
    if (!val || val.length < 2) { dd.style.display = 'none'; return; }

    const local = _filterPOI(val, 6);
    _navResults = local;
    _renderDD(local, 'nav-autocomplete-dropdown', 'selectNavItem');

    // Nominatim como fallback se poucos resultados locais
    if (local.length < 3 && val.length >= 3) {
        _nominatim(val).then(extra => {
            const merged = [
                ...local,
                ...extra.filter(r => !local.find(l => _dist2d(l.lat, l.lon, r.lat, r.lon) < 300))
            ].slice(0, 7);
            _navResults = merged;
            _renderDD(merged, 'nav-autocomplete-dropdown', 'selectNavItem');
        });
    }
}

function selectNavItem(idx) {
    const item = _navResults[idx];
    if (!item) return;
    const searchInput = document.getElementById('nav-search-input');
    if (searchInput) searchInput.value = item.nome;
    _closeDD('nav-autocomplete-dropdown');
    _zoomToItem(item);
    _openSidebarForItem(item);
}

// ─── ZOOM NO LOCAL SELECIONADO ─────────────────────────────────────────────────
function _zoomToItem(item) {
    if (typeof map === 'undefined' || !map) return;

    map.flyTo([item.lat, item.lon], 16, { duration: 1.2, easeLinearity: 0.25 });

    if (_searchMarker) { try { map.removeLayer(_searchMarker); } catch(_) {} _searchMarker = null; }

    const color = _riskColor(item.sev || item.severidade);
    const iconHtml = `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 14px ${color}99;">${item.icon || '📍'}</div>`;
    const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [32, 32], iconAnchor: [16, 16] });

    const sev = item.sev || item.severidade;
    const badge = sev ? `<div style="margin-top:8px;padding:4px 10px;border-radius:6px;background:${color}22;color:${color};font-weight:700;font-size:11px;border:1px solid ${color}55;text-align:center;text-transform:uppercase;">Risco ${sev}</div>` : '';

    _searchMarker = L.marker([item.lat, item.lon], { icon })
        .addTo(map)
        .bindPopup(`<div style="font-family:sans-serif;padding:6px;min-width:175px;"><div style="font-weight:800;font-size:14px;color:#0f172a;">${item.nome}</div><div style="font-size:12px;color:#475569;margin-top:2px;">📍 ${item.bairro}</div>${badge}</div>`, { maxWidth: 240 })
        .openPopup();
}

// ─── INTEGRAR COM O PAINEL LATERAL ────────────────────────────────────────────
function _openSidebarForItem(item) {
    // 1. Verificar se já existe no HISTORICO_DEFESA_CIVIL pelo ID
    if (typeof HISTORICO_DEFESA_CIVIL !== 'undefined' && item.id && !item.id.startsWith('nom_')) {
        const existing = HISTORICO_DEFESA_CIVIL.find(p => p.id === item.id);
        if (existing) {
            _selectSidebarPoint(item.id, item.nome, item.bairro);
            return;
        }
    }

    // 2. Para pontos genéricos, injetar temporariamente em HISTORICO_DEFESA_CIVIL
    if (typeof HISTORICO_DEFESA_CIVIL !== 'undefined') {
        // Remover entrada customizada anterior
        const prevIdx = HISTORICO_DEFESA_CIVIL.findIndex(p => p.id === NAV_CUSTOM_ID);
        if (prevIdx >= 0) HISTORICO_DEFESA_CIVIL.splice(prevIdx, 1);

        // Injetar entrada com dados reais do POI para que o sidebar carregue clima correto
        HISTORICO_DEFESA_CIVIL.push({
            id:                   NAV_CUSTOM_ID,
            nome:                 item.nome,
            bairro:               item.bairro,
            lat:                  item.lat,
            lon:                  item.lon,
            historico_severidade: _sevToLabel(item.sev || item.severidade),
            distancia_rio_m:      item.rio    ?? 400,
            altitude_m:           item.alt    ?? 732,
            descricao:            'Ponto pesquisado via FloodGuard AI — Navegação Inteligente',
            ocorrencias_anuais:   0,
            fonte:                'Pesquisa de Navegação',
        });
    }

    _selectSidebarPoint(NAV_CUSTOM_ID, item.nome, item.bairro);
}

function _selectSidebarPoint(pointId, nome, bairro) {
    const select = document.getElementById('sidebar-point-select');
    if (select) {
        // Remover opção customizada antiga
        const old = select.querySelector(`option[value="${NAV_CUSTOM_ID}"]`);
        if (old) old.remove();

        // Se o ponto não existe como opção, adicioná-lo no topo
        if (!select.querySelector(`option[value="${pointId}"]`)) {
            const opt = document.createElement('option');
            opt.value       = pointId;
            opt.textContent = `🔍 ${nome} (${bairro})`;
            select.insertBefore(opt, select.firstChild);
        }
        select.value = pointId;
    }

    // Chamar a atualização do sidebar e abri-lo
    if (typeof onSidebarPointChange === 'function') {
        onSidebarPointChange(pointId);
    }
    if (typeof openSidebar === 'function') {
        openSidebar();
    }
}

// ─── AUTOCOMPLETAR — CAMPOS DE ROTA ───────────────────────────────────────────
function handleRouteFieldInput(fieldId, dropdownId, val) {
    const dd = document.getElementById(dropdownId);
    if (!val || val.length < 2) { dd.style.display = 'none'; return; }

    const results = _filterPOI(val, 5);
    if (dropdownId === 'nav-dropdown-origem') {
        _origemResults = results;
        _renderDD(results, dropdownId, 'selectOrigemItem');
    } else {
        _destinoResults = results;
        _renderDD(results, dropdownId, 'selectDestinoItem');
    }
}

function selectOrigemItem(idx) {
    const item = _origemResults[idx];
    if (!item) return;
    document.getElementById('nav-origem').value = item.nome;
    _closeDD('nav-dropdown-origem');
}

function selectDestinoItem(idx) {
    const item = _destinoResults[idx];
    if (!item) return;
    document.getElementById('nav-destino').value = item.nome;
    _closeDD('nav-dropdown-destino');
}

function usarLocalAtual() {
    if (!navigator.geolocation) { alert('Geolocalização não suportada neste navegador.'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
        const label = `Minha Localização (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
        document.getElementById('nav-origem').value = label;
        _geocodeCache[label] = { lat: pos.coords.latitude, lon: pos.coords.longitude, nome: 'Minha Localização' };
    }, () => alert('Não foi possível obter sua localização.'));
}

// ─── CALCULAR RISCO DO TRAJETO ─────────────────────────────────────────────────
async function calcularRiscoTrajeto() {
    const origemVal  = (document.getElementById('nav-origem')?.value  || '').trim();
    const destinoVal = (document.getElementById('nav-destino')?.value || '').trim();

    if (!origemVal || !destinoVal) {
        showRouteAlert('warning', '⚠️ Preencha o <strong>ponto de partida</strong> e o <strong>destino</strong>.');
        return;
    }

    const alertEl = document.getElementById('nav-route-alert');
    alertEl.innerHTML = `<div style="padding:12px 16px;font-size:13px;color:#38BDF8;display:flex;align-items:center;gap:8px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.3);border-radius:10px;">⏳ Localizando e calculando risco do trajeto...</div>`;
    alertEl.style.display = 'block';

    const [origem, destino] = await Promise.all([_geocodeQuery(origemVal), _geocodeQuery(destinoVal)]);

    if (!origem) { showRouteAlert('error', `❌ Ponto de partida não encontrado: <em>"${origemVal}"</em>.`); return; }
    if (!destino) { showRouteAlert('error', `❌ Destino não encontrado: <em>"${destinoVal}"</em>.`); return; }

    _processRoute(origem, destino, false);
}

// ─── DEMO FECAP → ANHANGABAÚ ──────────────────────────────────────────────────
function testarRotaFECAP() {
    switchNavTab('rota');
    document.getElementById('nav-origem').value  = 'FECAP — Campus Liberdade';
    document.getElementById('nav-destino').value = 'Viaduto do Chá / Anhangabaú';

    _processRoute(
        { lat: -23.5574, lon: -46.6367, nome: 'FECAP — Campus Liberdade' },
        { lat: -23.5475, lon: -46.6378, nome: 'Viaduto do Chá / Anhangabaú' },
        true  // isDemo → raio ampliado para mostrar pontos de risco
    );
}

// ─── PROCESSAMENTO PRINCIPAL DA ROTA ──────────────────────────────────────────
function _processRoute(origem, destino, isDemo) {
    clearRoute();

    const zonas       = _getZonasRisco();
    const NUM_SAMPLES = 50;
    const pts         = [];

    for (let i = 0; i <= NUM_SAMPLES; i++) {
        const t = i / NUM_SAMPLES;
        pts.push({
            lat: origem.lat + (destino.lat - origem.lat) * t,
            lon: origem.lon + (destino.lon - origem.lon) * t,
        });
    }

    // ── Avaliar risco de cada segmento ──
    const segRisks  = [];
    const riskyZones = [];
    const seenIds   = new Set();

    for (let i = 0; i < pts.length - 1; i++) {
        const mLat = (pts[i].lat + pts[i+1].lat) / 2;
        const mLon = (pts[i].lon + pts[i+1].lon) / 2;
        let worst = null, worstLvl = 0;

        for (const z of zonas) {
            const dist   = _haversine(mLat, mLon, z.lat, z.lon);
            const radius = isDemo ? 700 : (z.raio_m || 450);
            if (dist <= radius) {
                const lvl = _sevLevel(z.severidade);
                if (lvl > worstLvl) { worstLvl = lvl; worst = z; }
            }
        }
        segRisks.push({ lvl: worstLvl, zona: worst });

        if (worst && worstLvl >= 3 && !seenIds.has(worst.id)) {
            seenIds.add(worst.id);
            riskyZones.push({ ...worst, lvl: worstLvl });
        }
    }

    _drawRoute(pts, segRisks, origem, destino, riskyZones);
    _showRouteResult(riskyZones, origem, destino);

    // Ajustar câmera
    if (typeof map !== 'undefined') {
        map.fitBounds([
            [Math.min(origem.lat, destino.lat) - 0.005, Math.min(origem.lon, destino.lon) - 0.008],
            [Math.max(origem.lat, destino.lat) + 0.005, Math.max(origem.lon, destino.lon) + 0.008]
        ], { padding: [80, 80], animate: true });
    }
}

// ─── DESENHAR ROTA ─────────────────────────────────────────────────────────────
function _drawRoute(pts, segRisks, origem, destino, riskyZones) {
    if (typeof map === 'undefined') return;

    // Sombra
    _routeLayers.push(
        L.polyline(pts.map(p => [p.lat, p.lon]), { color: '#000', weight: 10, opacity: 0.25, lineJoin: 'round', lineCap: 'round' }).addTo(map)
    );

    // Segmentos coloridos
    for (let i = 0; i < pts.length - 1; i++) {
        const r = segRisks[i];
        const color  = r.lvl >= 4 ? '#EF4444' : r.lvl === 3 ? '#F97316' : r.lvl === 2 ? '#F59E0B' : '#10B981';
        const weight = r.lvl >= 3 ? 7 : 5;
        _routeLayers.push(
            L.polyline([[pts[i].lat, pts[i].lon], [pts[i+1].lat, pts[i+1].lon]], { color, weight, opacity: 0.9, lineJoin: 'round' }).addTo(map)
        );
    }

    // Marcador Origem
    _routeLayers.push(
        L.marker([origem.lat, origem.lon], { icon: _pinIcon('#38BDF8', '🚀') }).addTo(map)
            .bindPopup(`<b>🚀 Partida:</b> ${origem.nome}`)
    );
    // Marcador Destino
    _routeLayers.push(
        L.marker([destino.lat, destino.lon], { icon: _pinIcon('#A855F7', '🏁') }).addTo(map)
            .bindPopup(`<b>🏁 Destino:</b> ${destino.nome}`)
    );

    // Marcadores de aviso nos pontos de risco
    for (const z of riskyZones) {
        const bColor = z.lvl >= 4 ? '#EF4444' : '#F97316';
        _routeLayers.push(
            L.marker([z.lat, z.lon], { icon: _pinIcon(bColor, '⚠️', 28) }).addTo(map)
                .bindPopup(`<div style="font-family:sans-serif;padding:4px;"><b style="color:${bColor};">⚠️ ${z.nome}</b><br><small>Risco ${z.severidade?.toUpperCase()} — Área sujeita a alagamento</small></div>`)
                .openPopup()
        );
    }
}

function _pinIcon(color, emoji, size = 34) {
    return L.divIcon({
        className: '',
        html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:${size * 0.44}px;box-shadow:0 0 14px ${color}99;">${emoji}</div>`,
        iconSize: [size, size], iconAnchor: [size/2, size/2]
    });
}

// ─── LIMPAR ROTA ───────────────────────────────────────────────────────────────
function clearRoute() {
    if (typeof map !== 'undefined') {
        _routeLayers.forEach(l => { try { map.removeLayer(l); } catch(_) {} });
    }
    _routeLayers = [];
    const alertEl = document.getElementById('nav-route-alert');
    if (alertEl) alertEl.style.display = 'none';
}

// ─── RESULTADO DO ALERTA DA ROTA ──────────────────────────────────────────────
function _showRouteResult(riskyZones, origem, destino) {
    if (riskyZones.length > 0) {
        riskyZones.sort((a, b) => b.lvl - a.lvl);
        const worst = riskyZones[0];
        const prob  = worst.prob ?? (worst.lvl >= 4 ? 85 : 65);
        const nível = worst.lvl >= 4 ? 'crítico' : 'alto';
        const extra = riskyZones.slice(1).map(z => z.nome).join(', ');

        showRouteAlert('danger',
            `<strong>⚠️ Atenção: Seu trajeto passa por ${riskyZones.length} ponto(s) de risco ${nível}.</strong><br>` +
            `<span style="color:#FCA5A5;">🚨 ${worst.nome} — Risco ${prob}%</span>` +
            (extra ? `<br><span style="color:#FDBA74;font-size:11px;">+ Outros pontos: ${extra}</span>` : '') +
            `<br><small style="color:#CBD5E1;">Recomendamos alterar a rota ou evitar esta região durante chuvas intensas.</small>`
        );
    } else {
        showRouteAlert('success',
            `<strong>✅ Trajeto Seguro!</strong><br>` +
            `<span style="color:#6EE7B7;">Nenhum ponto de alagamento detectado no caminho de <em>${origem.nome}</em> até <em>${destino.nome}</em>.</span>`
        );
    }
}

// ─── EXIBIR CARD DE ALERTA ─────────────────────────────────────────────────────
function showRouteAlert(type, message) {
    const el = document.getElementById('nav-route-alert');
    if (!el) return;

    const cfg = {
        danger:  { bg: 'rgba(239,68,68,0.13)',   border: 'rgba(239,68,68,0.5)' },
        success: { bg: 'rgba(16,185,129,0.13)',   border: 'rgba(16,185,129,0.5)' },
        warning: { bg: 'rgba(245,158,11,0.13)',   border: 'rgba(245,158,11,0.5)' },
        error:   { bg: 'rgba(239,68,68,0.07)',    border: 'rgba(239,68,68,0.3)' },
    }[type] || { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.2)' };

    el.innerHTML = `
        <div style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:10px;padding:13px 16px;font-size:13px;line-height:1.6;color:#E2E8F0;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div style="flex:1;">${message}</div>
                <button onclick="clearRoute()" title="Fechar" style="background:transparent;border:none;color:#94A3B8;cursor:pointer;font-size:18px;padding:0;line-height:1;flex-shrink:0;">✕</button>
            </div>
        </div>`;
    el.style.display = 'block';
}

// ─── FECHAR DROPDOWN ──────────────────────────────────────────────────────────
function _closeDD(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

// ─── RENDERIZAR DROPDOWN ──────────────────────────────────────────────────────
function _renderDD(results, ddId, fnName) {
    const el = document.getElementById(ddId);
    if (!el) return;

    if (!results.length) {
        el.innerHTML = `<div style="padding:12px 16px;color:#94A3B8;font-size:13px;">Nenhum resultado encontrado.</div>`;
        el.style.display = 'block';
        return;
    }

    el.innerHTML = results.map((r, idx) => {
        const sev     = r.sev || r.severidade;
        const rColor  = _riskColor(sev);
        const badge   = sev ? `<span style="font-size:10px;padding:2px 7px;border-radius:8px;background:${rColor}22;color:${rColor};border:1px solid ${rColor}66;font-weight:700;text-transform:uppercase;white-space:nowrap;">${sev}</span>` : '';
        return `<div onclick="${fnName}(${idx})" style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,0.04);" onmouseover="this.style.background='rgba(56,189,248,0.08)'" onmouseout="this.style.background='transparent'">
            <span style="font-size:17px;flex-shrink:0;">${r.icon || '📍'}</span>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:13px;color:#FFFFFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.nome}</div>
                <div style="font-size:11px;color:#94A3B8;overflow:hidden;text-overflow:ellipsis;">${r.bairro}</div>
            </div>
            ${badge}
        </div>`;
    }).join('');
    el.style.display = 'block';
}

// ─── FILTRAR POI LOCAL ─────────────────────────────────────────────────────────
function _filterPOI(val, limit) {
    const q = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Incluir também pontos do historico_defesa_civil.js se disponível
    const extra = typeof HISTORICO_DEFESA_CIVIL !== 'undefined'
        ? HISTORICO_DEFESA_CIVIL
            .filter(p => p.id !== NAV_CUSTOM_ID)
            .map(p => ({
                id: p.id, nome: p.nome, bairro: p.bairro,
                lat: p.lat, lon: p.lon, icon: '📌',
                sev: _labelToSev(p.historico_severidade),
                rio: p.distancia_rio_m, alt: p.altitude_m
            }))
        : [];

    const all = [...SP_POI, ...extra.filter(e => !SP_POI.find(s => s.id === e.id))];

    return all.filter(p => {
        const nome   = (p.nome   || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const bairro = (p.bairro || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nome.includes(q) || bairro.includes(q);
    }).slice(0, limit);
}

// ─── GEOCODIFICAÇÃO ───────────────────────────────────────────────────────────
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

async function _nominatim(query) {
    try {
        const url  = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' São Paulo')}&limit=4&countrycodes=br`;
        const resp = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        const data = await resp.json();
        return data.map(item => ({
            id: 'nom_' + item.place_id,
            nome: item.display_name.split(',')[0],
            bairro: item.display_name.split(',').slice(1, 3).join(',').trim(),
            lat: parseFloat(item.lat), lon: parseFloat(item.lon),
            icon: '🔍', sev: null
        }));
    } catch (_) { return []; }
}

// ─── ZONAS DE RISCO ───────────────────────────────────────────────────────────
function _getZonasRisco() {
    const base = typeof HISTORICO_DEFESA_CIVIL !== 'undefined' ? HISTORICO_DEFESA_CIVIL : [];
    return base
        .filter(p => p.id !== NAV_CUSTOM_ID)
        .map(p => ({
            id: p.id, nome: p.nome, bairro: p.bairro,
            lat: p.lat, lon: p.lon,
            severidade: _labelToSev(p.historico_severidade || 'Baixo'),
            prob: p.historico_severidade === 'Crítico' ? 85 : p.historico_severidade === 'Alto' ? 65 : 40,
            raio_m: p.historico_severidade === 'Crítico' ? 520 : p.historico_severidade === 'Alto' ? 420 : 300
        }));
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────
function _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000, r = Math.PI / 180;
    const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function _dist2d(lat1, lon1, lat2, lon2) {
    return Math.sqrt(((lat2-lat1)*111000)**2 + ((lon2-lon1)*85000)**2);
}

function _riskColor(sev) {
    return sev === 'critico'  ? '#EF4444' :
           sev === 'alto'     ? '#F97316' :
           sev === 'moderado' ? '#F59E0B' :
           sev === 'baixo'    ? '#10B981' : '#38BDF8';
}

function _sevLevel(sev) {
    if (!sev) return 0;
    const s = sev.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s === 'critico' ? 4 : s === 'alto' ? 3 : s === 'moderado' ? 2 : s === 'baixo' ? 1 : 0;
}

// Converte label do banco (ex: 'Crítico') → sev interno (ex: 'critico')
function _labelToSev(label) {
    if (!label) return null;
    const l = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (l.includes('critico') || l.includes('crtico')) return 'critico';
    if (l.includes('alto'))     return 'alto';
    if (l.includes('moderado')) return 'moderado';
    if (l.includes('baixo'))    return 'baixo';
    return null;
}

// Converte sev interno → label para banco
function _sevToLabel(sev) {
    if (!sev) return 'Baixo';
    const s = sev.toLowerCase();
    return s === 'critico' ? 'Crítico' : s === 'alto' ? 'Alto' : s === 'moderado' ? 'Moderado' : 'Baixo';
}

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => setTimeout(initNavigation, 900));
