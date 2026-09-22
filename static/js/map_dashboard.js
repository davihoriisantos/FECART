/**
 * FloodGuard AI — Motor de Monitoramento Integrado e Busca Universal (Dashboard v3.0)
 * 
 * Funcionalidades:
 * - Layout Integrado Split-Screen (Painel Esquerdo + Moldura do Mapa)
 * - Busca Universal de Bairros, Ruas e CEPs de SP (com Autocomplete e Nominatim)
 * - Cálculo de Risco Dinâmico em Tempo Real por Coordenada (sem marcadores fixos)
 * - Clique no Mapa para Análise Instantânea de Risco
 * - Gráfico de Tendência (Chart.js) 24h Passadas + 3h Futuras
 * - Simulador de Trajeto com Avaliação de Risco e Modo Demo FECART
 */

// ─── BASE DE BAIRROS E PONTOS DE SÃO PAULO ───────────────────────────────────
const SP_NEIGHBORHOODS = [
    // Centro, Paulista & Região FECAP
    { nome: "FECAP — Campus Liberdade", bairro: "Liberdade / Centro", lat: -23.5574, lon: -46.6367, alt: 735, icon: "🎓" },
    { nome: "Tirrenos Restaurante", bairro: "Bela Vista / Cerqueira César", lat: -23.5578, lon: -46.6575, alt: 785, icon: "🍽️" },
    { nome: "Liberdade", bairro: "Centro", lat: -23.5594, lon: -46.6362, alt: 732, icon: "🏮" },
    { nome: "Baixada do Glicério", bairro: "Centro / Glicério", lat: -23.5592, lon: -46.6288, alt: 719, icon: "🚨" },
    { nome: "Viaduto do Chá / Anhangabaú", bairro: "Centro Histórico", lat: -23.5475, lon: -46.6378, alt: 721, icon: "🏛️" },
    { nome: "Praça da Sé", bairro: "Centro", lat: -23.5505, lon: -46.6333, alt: 730, icon: "⛪" },
    { nome: "Bela Vista / Bixiga", bairro: "Centro-Sul", lat: -23.5560, lon: -46.6450, alt: 745, icon: "🍝" },
    { nome: "República", bairro: "Centro", lat: -23.5427, lon: -46.6428, alt: 734, icon: "🏙️" },
    { nome: "Consolação / Av. Paulista", bairro: "Centro / Jardins", lat: -23.5568, lon: -46.6580, alt: 780, icon: "🏢" },
    { nome: "MASP — Museu de Arte de SP", bairro: "Bela Vista / Paulista", lat: -23.5614, lon: -46.6559, alt: 782, icon: "🎨" },

    // Zona Sul & Oeste
    { nome: "Morumbi", bairro: "Zona Oeste / Sul", lat: -23.5989, lon: -46.7020, alt: 740, icon: "📍" },
    { nome: "Pinheiros", bairro: "Zona Oeste", lat: -23.5640, lon: -46.6902, alt: 728, icon: "📍" },
    { nome: "Vila Mariana", bairro: "Zona Sul", lat: -23.5874, lon: -46.6380, alt: 755, icon: "📍" },
    { nome: "Ipiranga", bairro: "Zona Sul", lat: -23.5850, lon: -46.6080, alt: 730, icon: "📍" },
    { nome: "Brooklin", bairro: "Zona Sul", lat: -23.6120, lon: -46.6780, alt: 726, icon: "📍" },
    { nome: "Santo Amaro", bairro: "Zona Sul", lat: -23.6520, lon: -46.7080, alt: 725, icon: "📍" },
    { nome: "Jabaquara", bairro: "Zona Sul", lat: -23.6450, lon: -46.6410, alt: 750, icon: "📍" },
    { nome: "Campo Limpo", bairro: "Zona Sul", lat: -23.6300, lon: -46.7580, alt: 742, icon: "📍" },
    { nome: "Butantã", bairro: "Zona Oeste", lat: -23.5710, lon: -46.7150, alt: 735, icon: "📍" },
    { nome: "Lapa", bairro: "Zona Oeste", lat: -23.5189, lon: -46.7020, alt: 722, icon: "📍" },
    { nome: "Vila Leopoldina", bairro: "Zona Oeste", lat: -23.5320, lon: -46.7350, alt: 723, icon: "📍" },
    { nome: "Perdizes", bairro: "Zona Oeste", lat: -23.5360, lon: -46.6720, alt: 755, icon: "📍" },

    // Zona Leste & Norte
    { nome: "Mooca", bairro: "Zona Leste", lat: -23.5590, lon: -46.5950, alt: 720, icon: "📍" },
    { nome: "Tatuapé", bairro: "Zona Leste", lat: -23.5430, lon: -46.5610, alt: 720, icon: "📍" },
    { nome: "Itaquera", bairro: "Zona Leste", lat: -23.5395, lon: -46.4580, alt: 733, icon: "📍" },
    { nome: "Brás", bairro: "Zona Leste / Centro", lat: -23.5420, lon: -46.6210, alt: 724, icon: "📍" },
    { nome: "Penha", bairro: "Zona Leste", lat: -23.5280, lon: -46.5450, alt: 740, icon: "📍" },
    { nome: "São Mateus", bairro: "Zona Leste", lat: -23.5980, lon: -46.4780, alt: 745, icon: "📍" },
    { nome: "Santana", bairro: "Zona Norte", lat: -23.5150, lon: -46.6230, alt: 725, icon: "📍" },
    { nome: "Tucuruvi", bairro: "Zona Norte", lat: -23.4780, lon: -46.6020, alt: 750, icon: "📍" },
    { nome: "Casa Verde", bairro: "Zona Norte", lat: -23.5080, lon: -46.6580, alt: 722, icon: "📍" }
];

// ─── ESTADO GLOBAL DO DASHBOARD ───────────────────────────────────────────────
let map = null;
let currentSelectedPoint = {
    nome: "FECAP — Campus Liberdade",
    bairro: "Liberdade / Centro",
    lat: -23.5574,
    lon: -46.6367,
    alt: 735
};

let activeMarker = null;
let activeRiskCircle = null;
let riskTrendChart = null;
let hasActiveUserSelection = false;
let simulatedScenario = 'real'; // 'real', 'tempestade', 'moderada'
let currentRiverTelemetry = null; // Guardará o status do rio mais próximo
let routeLayers = [];
let routeRequestId = 0;
let routeStartMarker = null;
let routeEndMarker = null;
let routeMaxRiskMarker = null;
let currentRoutePolyline = null;
let geocodeCache = {};
let currentLocationCoords = null; // Coordenadas salvas do GPS do usuário { lat, lng, lon }
let searchTimeout = null;
let searchRequestId = 0;
let searchSuggestionResults = [];
let activePredictiveAlertPlace = null;
let predictiveAlertCheckInterval = null;

// ─── INICIALIZAÇÃO GERAL ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initLeafletMap();
    setupSearchListeners();
    setupRouteAutocomplete();
    refreshSavedPlaceButtons();
    // Atualiza nome do usuário logado no botão Perfil
    try {
        const rawUser = localStorage.getItem('fg_user');
        if (rawUser) {
            const u = JSON.parse(rawUser);
            const labelEl = document.getElementById('header-user-label');
            if (labelEl && u && u.nome) {
                labelEl.textContent = u.nome.split(' ')[0];
            }
        }
    } catch (_) {}

    // 4. Proteção e Inicialização de Alertas Preditivos (usuários autenticados)
    setTimeout(() => {
        checkAndPromptNotificationPermission();
        checkSavedPlacesRiskAlerts();
    }, 1500);

    // Checagem periódica em background (a cada 5 minutos)
    if (!predictiveAlertCheckInterval) {
        predictiveAlertCheckInterval = setInterval(() => {
            checkSavedPlacesRiskAlerts();
        }, 5 * 60 * 1000);
    }

    // Força o Leaflet a recalcular as dimensões reais do container
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 200);

    // Redimensionamento dinâmico do Leaflet ao alterar tamanho de tela ou girar celular
    window.addEventListener('resize', () => {
        if (map) {
            map.invalidateSize();
        }
    });

    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 300);
    });

    // Verifica se veio de um clique no Histórico de Buscas do Perfil
    try {
        const targetSearch = JSON.parse(localStorage.getItem('fg_target_search') || 'null');
        if (targetSearch && targetSearch.lat && targetSearch.lon) {
            localStorage.removeItem('fg_target_search');
            await analyzePoint(Number(targetSearch.lat), Number(targetSearch.lon), targetSearch.nome, targetSearch.bairro || 'São Paulo - SP');
            if (map) map.flyTo([Number(targetSearch.lat), Number(targetSearch.lon)], 16, { duration: 1.0 });
            return;
        }
    } catch (_) {}

    // Carrega dados iniciais da FECAP
    await analyzePoint(currentSelectedPoint.lat, currentSelectedPoint.lon, currentSelectedPoint.nome, currentSelectedPoint.bairro, currentSelectedPoint.alt);
});

// ─── ATALHOS CASA / TRABALHO VINCULADOS À CONTA ─────────────────────────────
function decodeJwtPayload(token) {
    try {
        const encodedPayload = token.split('.')[1];
        if (!encodedPayload) return null;
        const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
        const decoded = decodeURIComponent(Array.from(binary, char =>
            `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
        return JSON.parse(decoded);
    } catch (_) {
        return null;
    }
}

let currentSimplePlaceType = null; // 'home' | 'work'
let currentSimplePickedPoint = null;
let simplePlaceSearchTimeout = null;

// ─── ESTADO INICIAL OBRIGATÓRIO: NULL (SEM DADOS PRÉ-DEFINIDOS) ─────────────
function getUserPlace(type) {
    const key = `user_${type}`;
    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && parsed.lat && parsed.lon) {
                return parsed;
            }
        }
    } catch (_) {}

    // Fallback para chave por usuário autenticado se existir
    const user = getAuthenticatedUserContext();
    const uid = user?.id || user?.email;
    if (uid) {
        try {
            const storageKey = `floodguard_saved_places:${encodeURIComponent(uid)}`;
            const places = JSON.parse(localStorage.getItem(storageKey) || '{}');
            if (places && places[type] && places[type].lat && places[type].lon) {
                return places[type];
            }
        } catch (_) {}
    }

    // Estritamente null por padrão (sem dados hardcoded)
    return null;
}

function setUserPlace(type, placeData) {
    const key = `user_${type}`;
    if (!placeData) {
        localStorage.removeItem(key);
    } else {
        localStorage.setItem(key, JSON.stringify(placeData));
    }

    const user = getAuthenticatedUserContext();
    const uid = user?.id || user?.email || 'default_user';
    try {
        const storageKey = `floodguard_saved_places:${encodeURIComponent(uid)}`;
        const places = JSON.parse(localStorage.getItem(storageKey) || '{}');
        if (!placeData) {
            delete places[type];
        } else {
            places[type] = placeData;
        }
        localStorage.setItem(storageKey, JSON.stringify(places));
    } catch (_) {}

    refreshSavedPlaceButtons();
    checkAndPromptNotificationPermission();
    checkSavedPlacesRiskAlerts();
}

function getAuthenticatedUserContext() {
    const token = localStorage.getItem('fg_token') || localStorage.getItem('floodguard_token');
    if (!token) {
        try {
            const savedUser = JSON.parse(localStorage.getItem('fg_user') || 'null');
            if (savedUser && (savedUser.id || savedUser.email)) {
                return { id: String(savedUser.id || savedUser.email), email: savedUser.email, nome: savedUser.nome };
            }
        } catch (_) {}
        return null;
    }
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.sub) {
        try {
            const savedUser = JSON.parse(localStorage.getItem('fg_user') || 'null');
            const savedId = savedUser?.email || savedUser?.id;
            return savedId ? { id: String(savedId), email: savedUser?.email, nome: savedUser?.nome } : null;
        } catch (_) {
            return null;
        }
    }
    return { id: String(payload.sub) };
}

// Retorna o local pesquisado / selecionado ativo no card lateral
function getActiveLocationForSave() {
    const searchInput = document.getElementById('universal-search-input');
    const inputVal = searchInput ? searchInput.value.trim() : '';

    if (inputVal && inputVal.length > 2 && currentSelectedPoint && currentSelectedPoint.lat && currentSelectedPoint.lon) {
        return {
            lat: Number(currentSelectedPoint.lat),
            lon: Number(currentSelectedPoint.lon),
            nome: inputVal,
            bairro: currentSelectedPoint.bairro || 'São Paulo - SP',
            alt: currentSelectedPoint.alt ?? null,
            address: currentSelectedPoint.address || inputVal
        };
    }

    if (hasActiveUserSelection && currentSelectedPoint && currentSelectedPoint.lat && currentSelectedPoint.lon) {
        return {
            lat: Number(currentSelectedPoint.lat),
            lon: Number(currentSelectedPoint.lon),
            nome: currentSelectedPoint.nome || 'Local Selecionado',
            bairro: currentSelectedPoint.bairro || 'São Paulo - SP',
            alt: currentSelectedPoint.alt ?? null,
            address: currentSelectedPoint.address || currentSelectedPoint.nome
        };
    }

    const heroTitleEl = document.getElementById('hero-location-name');
    const heroText = heroTitleEl ? heroTitleEl.innerText.trim() : '';
    if (heroText && !heroText.includes('FECAP') && !heroText.includes('Localizando') && !heroText.includes('Carregando') && currentSelectedPoint && currentSelectedPoint.lat && currentSelectedPoint.lon) {
        return {
            lat: Number(currentSelectedPoint.lat),
            lon: Number(currentSelectedPoint.lon),
            nome: heroText,
            bairro: currentSelectedPoint.bairro || 'São Paulo - SP',
            alt: currentSelectedPoint.alt ?? null,
            address: currentSelectedPoint.address || heroText
        };
    }

    return null;
}

// ─── FEEDBACK NOS BOTÕES ────────────────────────────────────────────────────
function refreshSavedPlaceButtons() {
    [['home', 'Casa', '🏠'], ['work', 'Trabalho', '💼']].forEach(([type, label, icon]) => {
        const button = document.getElementById(`saved-place-${type}`);
        const editBtn = document.getElementById(`saved-place-${type}-btn-edit`);
        const place = getUserPlace(type);
        const container = button ? button.closest('.saved-place-control') : null;

        if (place) {
            // Local configurado: muda cor e exibe check (✓)
            if (button) {
                button.innerHTML = `${icon} ${label} <span style="color: #10B981; font-weight: 800; margin-left: 3px;">✓</span>`;
                button.title = `${label} cadastrada: ${place.nome}. Clique para ir.`;
                button.style.color = '#38BDF8';
                button.style.background = 'rgba(56, 189, 248, 0.10)';
            }
            if (container) {
                container.style.borderColor = 'rgba(56, 189, 248, 0.45)';
                container.style.background = 'rgba(15, 23, 42, 0.90)';
            }
            if (editBtn) {
                editBtn.innerHTML = '➕';
                editBtn.title = `Clique para salvar o local ativo como ${label}`;
                editBtn.style.color = '#38BDF8';
                editBtn.style.background = 'rgba(56, 189, 248, 0.16)';
            }
        } else {
            // Não configurado: estado neutro padrão
            if (button) {
                button.innerHTML = `${icon} ${label}`;
                button.title = `Você ainda não cadastrou o seu endereço de ${label}. Clique no '+' para salvar.`;
                button.style.color = '#94A3B8';
                button.style.background = 'transparent';
            }
            if (container) {
                container.style.borderColor = 'rgba(56, 189, 248, 0.22)';
                container.style.background = 'rgba(15, 23, 42, 0.72)';
            }
            if (editBtn) {
                editBtn.innerHTML = '➕';
                editBtn.title = `Salvar local ativo como ${label}`;
                editBtn.style.color = '#94A3B8';
                editBtn.style.background = 'rgba(56, 189, 248, 0.09)';
            }
        }
    });
}

// ─── AÇÕES DOS BOTÕES DE ATALHO ─────────────────────────────────────────────
function openSavedPlace(type) {
    const place = getUserPlace(type);

    if (!place) {
        // Se null, aciona o fluxo inteligente de salvamento pelo botão +
        handlePlacePlusClick(type);
        return;
    }

    // Somente se já configurado: voa até o local e analisa o risco
    if (map) {
        map.flyTo([Number(place.lat), Number(place.lon)], 16, { duration: 1.2, easeLinearity: 0.25 });
    }
    analyzePoint(place.lat, place.lon, place.nome, place.bairro, place.alt, place.address, false);
}

// ─── SALVAMENTO DIRETO E INTELIGENTE PELO BOTÃO + ───────────────────────────
function handlePlacePlusClick(type) {
    const isHome = type === 'home';
    const typeLabel = isHome ? 'Casa' : 'Trabalho';
    const activeLoc = getActiveLocationForSave();

    if (activeLoc && activeLoc.lat && activeLoc.lon) {
        // Se já houver busca/local ativo no card lateral: salva imediatamente
        const placeData = {
            lat: Number(activeLoc.lat),
            lon: Number(activeLoc.lon),
            nome: activeLoc.nome || typeLabel,
            bairro: activeLoc.bairro || 'São Paulo - SP',
            alt: activeLoc.alt ?? null,
            address: activeLoc.address || activeLoc.nome
        };

        setUserPlace(type, placeData);
        showGeoToast('success', `📍 Endereço salvo como ${typeLabel} com sucesso!`);
        return;
    }

    // Se NÃO houver local selecionado: abre o pequeno Modal limpo
    openSimplePlaceModal(type);
}

function editSavedPlace(type) {
    handlePlacePlusClick(type);
}

function openPlaceConfigModal(type) {
    openSimplePlaceModal(type);
}

function closePlaceConfigModal() {
    closeSimplePlaceModal();
}

// ─── MODAL SIMPLES E LIMPO (QUANDO NÃO HOUVER LOCAL SELECIONADO) ────────────
function openSimplePlaceModal(type) {
    currentSimplePlaceType = type;
    currentSimplePickedPoint = null;

    const modal = document.getElementById('simple-place-modal');
    if (!modal) return;

    const isHome = type === 'home';
    const typeLabel = isHome ? 'Casa' : 'Trabalho';
    const typeIcon = isHome ? '🏠' : '💼';

    const titleEl = document.getElementById('simple-place-title');
    const iconEl = document.getElementById('simple-place-icon');
    const typeLabelEl = document.getElementById('simple-place-type-label');
    const inputEl = document.getElementById('simple-place-input');
    const dropdownEl = document.getElementById('simple-place-dropdown');

    if (titleEl) titleEl.textContent = `Salvar ${typeLabel}`;
    if (iconEl) iconEl.textContent = typeIcon;
    if (typeLabelEl) typeLabelEl.textContent = typeLabel;
    if (inputEl) {
        inputEl.value = '';
        inputEl.placeholder = isHome ? 'Ex: Rua Manoel Dutra, 536' : 'Ex: Av. Paulista, 1000';
    }
    if (dropdownEl) {
        dropdownEl.style.display = 'none';
        dropdownEl.innerHTML = '';
    }

    modal.classList.add('open');
    setupSimplePlaceInputListeners();
    setTimeout(() => {
        if (inputEl) inputEl.focus();
    }, 120);
}

function closeSimplePlaceModal(event) {
    const modal = document.getElementById('simple-place-modal');
    if (!modal) return;
    if (event && event.target !== modal && !event.target.classList.contains('auth-modal-backdrop')) {
        return;
    }
    modal.classList.remove('open');
    const dropdownEl = document.getElementById('simple-place-dropdown');
    if (dropdownEl) dropdownEl.style.display = 'none';
}

function setupSimplePlaceInputListeners() {
    const input = document.getElementById('simple-place-input');
    const dropdown = document.getElementById('simple-place-dropdown');
    if (!input || !dropdown || input.dataset.hasSimpleListeners) return;
    input.dataset.hasSimpleListeners = 'true';

    input.addEventListener('input', () => {
        const query = input.value.trim();
        clearTimeout(simplePlaceSearchTimeout);

        if (query.length < 2) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            return;
        }

        const localMatches = filterLocalNeighborhoods(query);
        if (localMatches.length > 0) {
            renderSimplePlaceDropdown(localMatches, []);
        }

        simplePlaceSearchTimeout = setTimeout(async () => {
            const nominatimResults = await searchNominatim(query);
            renderSimplePlaceDropdown(localMatches, nominatimResults);
        }, 300);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitSimplePlaceModal();
        } else if (e.key === 'Escape') {
            closeSimplePlaceModal();
        }
    });
}

function renderSimplePlaceDropdown(local, nominatim) {
    const dropdown = document.getElementById('simple-place-dropdown');
    if (!dropdown) return;

    const all = [...nominatim, ...local];
    if (all.length === 0) {
        dropdown.innerHTML = '<div style="padding:10px 12px; font-size:12px; color:#94A3B8; text-align:center;">Nenhum endereço encontrado em SP.</div>';
        dropdown.style.display = 'block';
        return;
    }

    let html = '';
    all.slice(0, 5).forEach((item, index) => {
        const safeNome = escapeHtml(item.nome);
        const safeDisplay = escapeHtml(item.display_name || `${item.nome} — ${item.bairro}`);
        html += `
            <div class="search-item" data-simple-index="${index}" style="padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 15px;">📍</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 12px; color: #FFFFFF; line-height: 1.3;">${safeNome}</div>
                    <div style="font-size: 11px; color: #94A3B8; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeDisplay}</div>
                </div>
            </div>
        `;
    });

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('[data-simple-index]').forEach(el => {
        el.addEventListener('click', () => {
            const idx = Number(el.dataset.simpleIndex);
            const picked = all[idx];
            if (!picked) return;

            currentSimplePickedPoint = {
                lat: Number(picked.lat),
                lon: Number(picked.lon),
                nome: picked.nome,
                bairro: picked.bairro || 'São Paulo - SP',
                alt: picked.alt ?? null,
                address: picked.display_name || picked.nome
            };

            const input = document.getElementById('simple-place-input');
            if (input) input.value = picked.nome;
            dropdown.style.display = 'none';
        });
    });
}

async function submitSimplePlaceModal() {
    if (!currentSimplePlaceType) return;
    const type = currentSimplePlaceType;
    const isHome = type === 'home';
    const typeLabel = isHome ? 'Casa' : 'Trabalho';

    const input = document.getElementById('simple-place-input');
    const query = input ? input.value.trim() : '';

    if (!query) {
        showGeoToast('warning', `Por favor, digite o endereço da sua ${typeLabel}.`);
        return;
    }

    let target = currentSimplePickedPoint;

    if (!target || target.nome !== query) {
        const localMatches = filterLocalNeighborhoods(query);
        const nomMatches = await searchNominatim(query);
        const best = nomMatches[0] || localMatches[0];

        if (!best || !best.lat || !best.lon) {
            showGeoToast('error', 'Endereço não encontrado em São Paulo. Tente especificar rua e número.');
            return;
        }

        target = {
            lat: Number(best.lat),
            lon: Number(best.lon),
            nome: best.nome || query,
            bairro: best.bairro || 'São Paulo - SP',
            alt: best.alt ?? null,
            address: best.display_name || query
        };
    }

    setUserPlace(type, target);
    closeSimplePlaceModal();
    showGeoToast('success', `📍 Endereço salvo como ${typeLabel} com sucesso!`);
}

// ─── SISTEMA DE ALERTAS PREDITIVOS DE RISCO (CASA / TRABALHO) ───────────────

/**
 * Solicitação de Permissão de Notificação (Web Push API)
 * Apenas para usuários autenticados com locais salvos.
 */
function checkAndPromptNotificationPermission() {
    // 4. Proteção de Acesso: Usuários visitantes ou sem locais salvos não devem receber solicitações
    const user = getAuthenticatedUserContext();
    if (!user) return;

    const homePlace = getUserPlace('home');
    const workPlace = getUserPlace('work');
    if (!homePlace && !workPlace) return;

    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    if (sessionStorage.getItem('fg_notif_prompt_dismissed') === 'true') return;

    const promptEl = document.getElementById('notification-permission-prompt');
    if (promptEl) {
        promptEl.style.display = 'block';
    }
}

async function requestNotificationAlertsPermission() {
    const promptEl = document.getElementById('notification-permission-prompt');
    if (promptEl) promptEl.style.display = 'none';

    if (!('Notification' in window)) {
        showGeoToast('warning', 'Seu navegador não suporta notificações de sistema.');
        return;
    }

    try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
            showGeoToast('success', '🔔 Alertas preventivos para Casa e Trabalho ativados!');
            checkSavedPlacesRiskAlerts();
        } else if (perm === 'denied') {
            showGeoToast('info', 'Permissão de notificações não foi concedida.');
        }
    } catch (e) {
        console.warn('[FloodGuard Alerta] Erro ao solicitar permissão de notificações:', e);
    }
}

function dismissNotificationPrompt() {
    sessionStorage.setItem('fg_notif_prompt_dismissed', 'true');
    const promptEl = document.getElementById('notification-permission-prompt');
    if (promptEl) {
        promptEl.style.display = 'none';
    }
}

/**
 * Checagem Preditiva de Risco em Background para locais salvos
 * Consulta dados meteorológicos (Open-Meteo) para user_home e user_work.
 * Se a previsão indicar acúmulo severo ou Risco Crítico (>75%) nas próximas 1 a 3 horas:
 * - Calcula o horário de pico (ex: "nas próximas 2 horas")
 * - Emite Web Notification nativa (se autorizada)
 * - Exibe Card/Banner de alerta em vermelho no topo da tela com contagem regressiva
 */
async function checkSavedPlacesRiskAlerts() {
    // 4. Proteção de Acesso: visitantes ou usuários sem locais salvos não rodam a checagem
    const user = getAuthenticatedUserContext();
    if (!user) {
        dismissPredictiveAlertBanner();
        return;
    }

    const homePlace = getUserPlace('home');
    const workPlace = getUserPlace('work');

    const targets = [];
    if (homePlace && homePlace.lat && homePlace.lon) {
        targets.push({ type: 'home', label: 'Casa', icon: '🏠', ...homePlace });
    }
    if (workPlace && workPlace.lat && workPlace.lon) {
        targets.push({ type: 'work', label: 'Trabalho', icon: '💼', ...workPlace });
    }

    if (targets.length === 0) {
        dismissPredictiveAlertBanner();
        return;
    }

    let highestRiskAlert = null;

    for (const target of targets) {
        const lat = Number(target.lat);
        const lon = Number(target.lon);
        if (isNaN(lat) || isNaN(lon)) continue;

        let alt = target.alt;
        if (alt === null || alt === undefined || isNaN(Number(alt))) {
            try {
                alt = await getElevation(lat, lon);
            } catch (_) {
                alt = 745;
            }
        }

        let weatherData = null;
        try {
            weatherData = await fetchWeatherData(lat, lon);
        } catch (e) {
            console.warn('[FloodGuard Alerta] Erro ao consultar clima para', target.label, e);
        }

        if (!weatherData || !weatherData.hourly) continue;

        const times = weatherData.hourly.time || [];
        const rains = weatherData.hourly.precipitation || weatherData.hourly.rain || [];
        const probs = weatherData.hourly.precipitation_probability || [];
        const soilMoistures = weatherData.hourly.soil_moisture_0_to_1cm || [];

        const currentTimeStr = (weatherData.current && weatherData.current.time) ? weatherData.current.time : '';
        let currentIdx = -1;
        if (currentTimeStr) {
            currentIdx = times.findIndex(t => t.startsWith(currentTimeStr.slice(0, 13)));
        }
        if (currentIdx === -1) {
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const localHourStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}`;
            currentIdx = times.findIndex(t => t.startsWith(localHourStr));
        }
        if (currentIdx === -1) currentIdx = Math.max(0, times.length - 8);

        // Acumulado 24h
        let acc24h = 0.0;
        if (typeof weatherData.accumulated_24h_mm === 'number') {
            acc24h = weatherData.accumulated_24h_mm;
        } else {
            for (let j = 0; j < 24; j++) {
                const idx = currentIdx - j;
                if (idx >= 0 && rains[idx] !== null && !isNaN(rains[idx])) {
                    acc24h += Number(rains[idx]);
                }
            }
        }

        // Projeção futura (+1h, +2h, +3h)
        let maxRiskInForecast = 0;
        let peakForecastHour = 1;
        let peakRain = 0;
        let forecastRainAccum = 0;

        for (let f = 1; f <= 3; f++) {
            const idx = currentIdx + f;
            let rainVal = (idx < rains.length && rains[idx] !== null) ? Number(rains[idx]) : 0;
            let probVal = (idx < probs.length && probs[idx] !== null) ? Number(probs[idx]) : 0;
            const soilMoisture = (idx < soilMoistures.length && soilMoistures[idx] !== null)
                ? soilMoistures[idx]
                : (soilMoistures[currentIdx] ?? null);

            // Respeita cenários de simulação se ativos
            if (simulatedScenario === 'tempestade') {
                rainVal = f === 1 ? 18.0 : (f === 2 ? 38.0 : 20.0);
                probVal = 98;
            } else if (simulatedScenario === 'moderada') {
                rainVal = f === 1 ? 4.0 : (f === 2 ? 5.5 : 3.0);
                probVal = 70;
            }

            forecastRainAccum += rainVal;
            const risk = calculateRiskFormula(rainVal, acc24h + forecastRainAccum, probVal, alt, lat, lon, soilMoisture);

            if (risk > maxRiskInForecast) {
                maxRiskInForecast = risk;
                peakForecastHour = f;
                peakRain = rainVal;
            }
        }

        // Critério: Risco Crítico (>75%) ou acúmulo severo de chuva nas próximas 1 a 3h
        const isCriticalRisk = maxRiskInForecast >= 75 || peakRain >= 18 || forecastRainAccum >= 35;

        if (isCriticalRisk) {
            const alertItem = {
                target,
                peakForecastHour,
                maxRiskInForecast,
                peakRain,
                forecastRainAccum,
                address: target.address || target.nome
            };

            if (!highestRiskAlert || alertItem.maxRiskInForecast > highestRiskAlert.maxRiskInForecast) {
                highestRiskAlert = alertItem;
            }

            // Emissão de Notificação Nativa Web Push API (se concedida)
            emitWebNotification(alertItem);
        }
    }

    if (highestRiskAlert) {
        showPredictiveAlertBanner(highestRiskAlert);
    } else {
        dismissPredictiveAlertBanner();
    }
}

/**
 * Emite Notificação do Sistema (Web Notification nativa)
 */
function emitWebNotification(alertItem) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }

    const { target, peakForecastHour, address } = alertItem;
    const hourLabel = peakForecastHour === 1 ? '1 hora' : `${peakForecastHour} horas`;
    const notifKey = `fg_notif_sent_${target.type}_${peakForecastHour}_${new Date().getHours()}`;

    // Evita duplicar notificações nativas no mesmo bloco de hora
    if (sessionStorage.getItem(notifKey)) {
        return;
    }
    sessionStorage.setItem(notifKey, 'true');

    try {
        const title = `🚨 ALERTA FLOODGUARD AI: Risco Crítico em ${target.label}`;
        const body = `Atenção: A previsão indica alto risco de alagamento em ${address} em aproximadamente ${hourLabel}. Tome precauções!`;

        const notif = new Notification(title, {
            body: body,
            icon: '/static/img/logo.jpg',
            badge: '/static/img/logo.jpg',
            tag: `floodguard-risk-${target.type}`,
            renotify: true
        });

        notif.onclick = () => {
            window.focus();
            focusPredictiveAlertPlace(target);
        };
    } catch (err) {
        console.warn('[FloodGuard Alerta] Falha ao disparar Notification nativa:', err);
    }
}

/**
 * Banner Interno na Interface: Card/banner de alerta em vermelho no topo da tela
 */
function showPredictiveAlertBanner(alertItem) {
    const banner = document.getElementById('predictive-risk-alert-banner');
    if (!banner) return;

    const { target, peakForecastHour, address, maxRiskInForecast } = alertItem;
    activePredictiveAlertPlace = target;

    const badgeEl = document.getElementById('predictive-alert-place-badge');
    const countdownEl = document.getElementById('predictive-alert-countdown');
    const addressEl = document.getElementById('predictive-alert-address');

    const hourLabel = peakForecastHour === 1 ? 'na próxima 1 hora' : `nas próximas ${peakForecastHour} horas`;

    if (badgeEl) badgeEl.textContent = `${target.icon || '📍'} ${target.label}`;
    if (countdownEl) countdownEl.textContent = `Pico: ${hourLabel} (${Math.round(maxRiskInForecast)}%)`;
    if (addressEl) addressEl.textContent = address;

    banner.style.display = 'block';
}

function dismissPredictiveAlertBanner() {
    const banner = document.getElementById('predictive-risk-alert-banner');
    if (banner) {
        banner.style.display = 'none';
    }
    activePredictiveAlertPlace = null;
}

function focusPredictiveAlertPlace(specificTarget = null) {
    const target = specificTarget || activePredictiveAlertPlace;
    if (!target || !target.lat || !target.lon) return;

    if (map) {
        map.flyTo([Number(target.lat), Number(target.lon)], 16, { duration: 1.2, easeLinearity: 0.25 });
    }
    analyzePoint(target.lat, target.lon, target.nome, target.bairro, target.alt, target.address, false);
}

// ─── AUTOCOMPLETE INTELIGENTE NAS BUSCAS ─────────────────────────────────────
function getPlaceSearchSuggestions(query) {
    const norm = normalizeText(query);
    if (!norm) return [];

    const results = [];
    const homePlace = getUserPlace('home');
    const workPlace = getUserPlace('work');

    const matchesHome = norm.includes('casa') || norm === 'minha casa';
    const matchesWork = norm.includes('trabalh') || norm.includes('trampo') || norm.includes('servico') || norm === 'meu trabalho';

    if (matchesHome) {
        if (homePlace && homePlace.lat && homePlace.lon) {
            results.push({
                isSavedPlace: true,
                placeType: 'home',
                nome: `🏠 Sua Casa - ${homePlace.nome}`,
                rawNome: homePlace.nome,
                bairro: homePlace.bairro || 'Endereço Salvo',
                display_name: homePlace.address || `${homePlace.nome} — ${homePlace.bairro || 'São Paulo'}`,
                lat: Number(homePlace.lat),
                lon: Number(homePlace.lon),
                alt: homePlace.alt ?? null,
                icon: '🏠'
            });
        } else {
            results.push({
                isPlaceConfigAction: true,
                placeType: 'home',
                nome: '➕ Cadastrar endereço de Casa',
                bairro: 'Defina seu endereço residencial para busca rápida',
                display_name: 'Clique para cadastrar o endereço de Casa',
                icon: '🏠'
            });
        }
    }

    if (matchesWork) {
        if (workPlace && workPlace.lat && workPlace.lon) {
            results.push({
                isSavedPlace: true,
                placeType: 'work',
                nome: `💼 Seu Trabalho - ${workPlace.nome}`,
                rawNome: workPlace.nome,
                bairro: workPlace.bairro || 'Endereço Salvo',
                display_name: workPlace.address || `${workPlace.nome} — ${workPlace.bairro || 'São Paulo'}`,
                lat: Number(workPlace.lat),
                lon: Number(workPlace.lon),
                alt: workPlace.alt ?? null,
                icon: '💼'
            });
        } else {
            results.push({
                isPlaceConfigAction: true,
                placeType: 'work',
                nome: '➕ Cadastrar endereço de Trabalho',
                bairro: 'Defina seu endereço profissional para rota e risco',
                display_name: 'Clique para cadastrar o endereço de Trabalho',
                icon: '💼'
            });
        }
    }

    return results;
}

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        closeSavedPlaceAuthModal();
        closeSimplePlaceModal();
    }
});

// ─── CONSULTA DE ALTITUDE EM TEMPO REAL (OPENTOPODATA / OPEN-ELEVATION) ────────
const elevationCache = {};

async function getElevation(lat, lon) {
    const key = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
    if (elevationCache[key] !== undefined) return elevationCache[key];

    // 1. Tenta OpenTopoData API (Dataset ASTER 30m)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const url = `https://api.opentopodata.org/v1/aster30m?locations=${lat},${lon}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0 && data.results[0].elevation !== null && data.results[0].elevation !== undefined) {
                const elev = Math.round(data.results[0].elevation);
                elevationCache[key] = elev;
                return elev;
            }
        }
    } catch (e) {
        console.warn("OpenTopoData indisponível ou timeout, tentando fallback...", e);
    }

    // 2. Fallback: Open-Elevation API
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0 && data.results[0].elevation !== null && data.results[0].elevation !== undefined) {
                const elev = Math.round(data.results[0].elevation);
                elevationCache[key] = elev;
                return elev;
            }
        }
    } catch (e) {
        console.warn("Open-Elevation indisponível ou timeout, tentando Open-Meteo elevation...", e);
    }

    // 3. Fallback: Open-Meteo elevation
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.elevation !== undefined && data.elevation !== null) {
                const elev = Math.round(data.elevation);
                elevationCache[key] = elev;
                return elev;
            }
        }
    } catch (_) {}

    // Fallback padrão se todas falharem (média do planalto SP)
    return 745;
}

// ─── CALHAS HIDROGRÁFICAS PRINCIPAIS DE SÃO PAULO ────────────────────────────
// Traçados longitudinais completos dos principais rios. Cada segmento entre dois
// vértices consecutivos é avaliado geometricamente (distância ortogonal mínima).
const SP_RIVERS = [
    {
        nome: "Rio Tietê (Marginal Tietê)",
        tipo: "principal",
        // Traçado completo: Nascente (leste) → Barragem Edgard de Souza (oeste)
        coords: [
            // Zona Leste — Nascente a Tatuapé
            [-23.536, -46.398], [-23.530, -46.415], [-23.526, -46.432],
            [-23.522, -46.450], [-23.518, -46.468], [-23.513, -46.490],
            // Tietê — Penha / Belém / Brás
            [-23.516, -46.510], [-23.514, -46.528], [-23.512, -46.545],
            [-23.511, -46.562], [-23.510, -46.580], [-23.510, -46.600],
            // Tietê — Anhembi / Ponte das Bandeiras
            [-23.510, -46.618], [-23.511, -46.634], [-23.512, -46.648],
            [-23.513, -46.665], [-23.514, -46.682], [-23.515, -46.698],
            // Tietê — Lapa / Perus / Limão / Freq. do Ó
            [-23.516, -46.712], [-23.518, -46.725], [-23.521, -46.738],
            [-23.525, -46.752], [-23.530, -46.768], [-23.534, -46.782],
            [-23.539, -46.798], [-23.544, -46.814], [-23.548, -46.828]
        ]
    },
    {
        nome: "Rio Pinheiros (Marginal Pinheiros)",
        tipo: "principal",
        // Do reservatório Guarapiranga (sul) até a foz no Tietê (norte)
        coords: [
            [-23.703, -46.698], [-23.680, -46.710], [-23.660, -46.715],
            [-23.640, -46.714], [-23.622, -46.710], [-23.608, -46.706],
            [-23.592, -46.700], [-23.575, -46.697], [-23.560, -46.698],
            [-23.547, -46.703], [-23.538, -46.716], [-23.530, -46.728],
            [-23.524, -46.742], [-23.520, -46.754]
        ]
    },
    {
        nome: "Rio Tamanduateí",
        tipo: "principal",
        // ABC → Ipiranga → Mooca → Av. do Estado → foz no Tietê
        coords: [
            [-23.664, -46.570], [-23.645, -46.578], [-23.628, -46.583],
            [-23.610, -46.588], [-23.595, -46.596], [-23.580, -46.605],
            [-23.568, -46.614], [-23.558, -46.622], [-23.548, -46.626],
            [-23.540, -46.625], [-23.528, -46.622], [-23.518, -46.620],
            [-23.511, -46.618]
        ]
    },
    {
        nome: "Rio Aricanduva",
        tipo: "principal",
        coords: [
            [-23.610, -46.483], [-23.593, -46.500], [-23.577, -46.515],
            [-23.562, -46.528], [-23.549, -46.538], [-23.538, -46.550],
            [-23.527, -46.562], [-23.518, -46.572], [-23.512, -46.582]
        ]
    },
    {
        nome: "Córrego Anhangabaú",
        tipo: "corrego",
        coords: [
            [-23.570, -46.644], [-23.562, -46.641], [-23.554, -46.639],
            [-23.548, -46.637], [-23.543, -46.635], [-23.537, -46.633]
        ]
    },
    {
        nome: "Córrego Lapa / Água Branca",
        tipo: "corrego",
        coords: [
            [-23.533, -46.704], [-23.527, -46.710], [-23.522, -46.718],
            [-23.517, -46.725]
        ]
    },
    {
        nome: "Córrego Ipiranga / Saúde",
        tipo: "corrego",
        coords: [
            [-23.605, -46.608], [-23.598, -46.605], [-23.592, -46.601],
            [-23.585, -46.597]
        ]
    },
    {
        nome: "Córrego Jaguaré",
        tipo: "corrego",
        coords: [
            [-23.572, -46.746], [-23.565, -46.740], [-23.558, -46.736],
            [-23.548, -46.732]
        ]
    },
    {
        nome: "Córrego Mandaqui",
        tipo: "corrego",
        coords: [
            [-23.468, -46.625], [-23.474, -46.622], [-23.480, -46.620],
            [-23.486, -46.619], [-23.492, -46.619], [-23.498, -46.620],
            [-23.504, -46.621], [-23.509, -46.623]
        ]
    },
    {
        nome: "Córrego Pirajuçara",
        tipo: "corrego",
        coords: [
            [-23.630, -46.745], [-23.622, -46.742], [-23.614, -46.739],
            [-23.607, -46.737], [-23.600, -46.735], [-23.593, -46.733],
            [-23.586, -46.732], [-23.579, -46.731]
        ]
    },
    {
        nome: "Córrego Cabuçu de Cima",
        tipo: "corrego",
        coords: [
            [-23.462, -46.605], [-23.468, -46.608], [-23.473, -46.611],
            [-23.479, -46.613], [-23.485, -46.615], [-23.491, -46.616],
            [-23.497, -46.617]
        ]
    },
    {
        nome: "Córrego Saracura",
        tipo: "corrego",
        coords: [
            [-23.566, -46.651], [-23.562, -46.648], [-23.558, -46.646],
            [-23.554, -46.644], [-23.550, -46.642], [-23.546, -46.640]
        ]
    },
    {
        nome: "Córrego Zavuvus",
        tipo: "corrego",
        coords: [
            [-23.575, -46.638], [-23.572, -46.635], [-23.568, -46.633],
            [-23.564, -46.631], [-23.560, -46.630], [-23.556, -46.629]
        ]
    },
    {
        nome: "Córrego Guapira",
        tipo: "corrego",
        coords: [
            [-23.448, -46.638], [-23.454, -46.635], [-23.460, -46.632],
            [-23.466, -46.630], [-23.472, -46.629], [-23.478, -46.628],
            [-23.484, -46.627]
        ]
    },
    {
        nome: "Córrego do Oratório",
        tipo: "corrego",
        coords: [
            [-23.568, -46.598], [-23.564, -46.595], [-23.560, -46.593],
            [-23.556, -46.591], [-23.552, -46.590], [-23.548, -46.589]
        ]
    },
    {
        nome: "Canal Ibirapuera",
        tipo: "corrego",
        coords: [
            [-23.590, -46.660], [-23.587, -46.655], [-23.584, -46.650],
            [-23.581, -46.645], [-23.578, -46.641]
        ]
    },
    {
        nome: "Córrego Itaquera",
        tipo: "corrego",
        coords: [
            [-23.555, -46.478], [-23.549, -46.470], [-23.543, -46.463],
            [-23.537, -46.457], [-23.531, -46.452], [-23.525, -46.448]
        ]
    },
    {
        nome: "Córrego do Carmo",
        tipo: "corrego",
        coords: [
            [-23.590, -46.608], [-23.585, -46.604], [-23.580, -46.601],
            [-23.575, -46.598], [-23.570, -46.596]
        ]
    },
    {
        nome: "Córrego Pacaembu",
        tipo: "corrego",
        coords: [
            [-23.546, -46.668], [-23.549, -46.663], [-23.551, -46.658],
            [-23.553, -46.654], [-23.555, -46.650], [-23.557, -46.646]
        ]
    },
    {
        nome: "Córrego Embu-Mirim",
        tipo: "corrego",
        coords: [
            [-23.650, -46.760], [-23.643, -46.755], [-23.636, -46.750],
            [-23.629, -46.746], [-23.622, -46.742], [-23.615, -46.739],
            [-23.608, -46.736]
        ]
    }
];

// ─── FALLBACK DE CÓRREGOS POR BACIA HIDROGRÁFICA ─────────────────────────────
// Se o ponto estiver longe de todos os traçados, identifica o córrego urbano
// mais provável pela localização geográfica dentro das sub-bacias de SP.
const SP_URBAN_CREEKS_BY_ZONE = [
    // Sub-bacia Anhangabaú / Centro
    { nome: "Córrego Anhangabaú", lat: -23.5477, lon: -46.6368, raio: 1800 },
    // Sub-bacia Lapa / Água Branca
    { nome: "Córrego Lapa / Água Branca", lat: -23.5210, lon: -46.7120, raio: 1500 },
    // Sub-bacia Jaguaré / Pinheiros
    { nome: "Córrego Jaguaré", lat: -23.5631, lon: -46.7398, raio: 1800 },
    // Sub-bacia Ipiranga / Saúde
    { nome: "Córrego Ipiranga", lat: -23.5960, lon: -46.6050, raio: 2000 },
    // Sub-bacia Aricanduva / Penha
    { nome: "Córrego Aricanduva", lat: -23.5450, lon: -46.5052, raio: 2000 },
    // Sub-bacia Mandaqui / Santana
    { nome: "Córrego Mandaqui", lat: -23.4880, lon: -46.6210, raio: 1800 },
    // Sub-bacia Pirajuçara / Butantã
    { nome: "Córrego Pirajuçara", lat: -23.5870, lon: -46.7360, raio: 2000 },
    // Sub-bacia Embu-Mirim / Santo Amaro
    { nome: "Córrego Embu-Mirim", lat: -23.6350, lon: -46.7410, raio: 2500 },
    // Sub-bacia Mooca / Brás
    { nome: "Córrego Mooca / Bresser", lat: -23.5590, lon: -46.5950, raio: 1600 },
    // Sub-bacia Campo Limpo / Itaquera (zona leste/sul genérica)
    { nome: "Córrego Itaquera", lat: -23.5400, lon: -46.4580, raio: 2500 }
];

// ─── CÁLCULO DE DISTÂNCIA ATÉ O RIO MAIS PRÓXIMO ──────────────────────────────
// Usa distância ortogonal mínima até qualquer segmento do traçado.
// Se o ponto está sobre o Tietê, retorna 0–50m corretamente.
function getMinDistanceToRivers(lat, lon) {
    let minDistance = 999999;
    let closestRiver = "Bacia Geral";

    for (const river of SP_RIVERS) {
        if (river.coords.length < 2) continue;
        for (let i = 0; i < river.coords.length - 1; i++) {
            const p1 = river.coords[i];
            const p2 = river.coords[i + 1];
            const dist = distanceToSegment(lat, lon, p1[0], p1[1], p2[0], p2[1]);
            if (dist < minDistance) {
                minDistance = dist;
                closestRiver = river.nome;
            }
        }
    }

    // Fallback: se ainda estiver muito longe, identifica o córrego urbano da sub-bacia
    if (minDistance > 3000) {
        let bestCreek = null;
        let bestCreekDist = 999999;
        for (const creek of SP_URBAN_CREEKS_BY_ZONE) {
            const dy = (lat - creek.lat) * 111000;
            const dx = (lon - creek.lon) * 102000;
            const d = Math.hypot(dx, dy);
            if (d < creek.raio && d < bestCreekDist) {
                bestCreekDist = d;
                bestCreek = creek;
            }
        }
        if (bestCreek) {
            closestRiver = bestCreek.nome;
        }
    }

    // Regra de Tolerância Zero (Snap-to-Water de 100 metros)
    if (minDistance <= 100) {
        minDistance = 0;
    } else {
        minDistance = Math.round(minDistance);
    }

    return { distance: minDistance, river: closestRiver };
}

// ─── PONTOS COM HISTÓRICO CRÔNICO DE ALAGAMENTO (DEFESA CIVIL / CGE) ─────────
const CHRONIC_FLOOD_ZONES = [
    { nome: "Baixada do Glicério", lat: -23.5592, lon: -46.6288, raio: 650 },
    { nome: "Vale do Anhangabaú / Viaduto do Chá", lat: -23.5475, lon: -46.6378, raio: 600 },
    { nome: "Av. do Estado (Trecho Radial / Mercado)", lat: -23.5528, lon: -46.6268, raio: 600 },
    { nome: "Av. Prof. Luiz Ignácio Anhaia Mello", lat: -23.5850, lon: -46.5650, raio: 750 },
    { nome: "Marginal Pinheiros (Ponte Cidade Jardim)", lat: -23.5850, lon: -46.6900, raio: 700 },
    { nome: "Marginal Pinheiros (Jaguaré / Ceagesp)", lat: -23.5350, lon: -46.7350, raio: 700 },
    { nome: "Marginal Tietê (Ponte das Bandeiras)", lat: -23.5180, lon: -46.6340, raio: 700 },
    { nome: "Marginal Tietê (Ponte da Casa Verde)", lat: -23.5120, lon: -46.6600, raio: 700 },
    { nome: "Av. Aricanduva (Shopping / Rio Aricanduva)", lat: -23.5550, lon: -46.5250, raio: 800 },
    { nome: "Praça da Bandeira / Av. 9 de Julho", lat: -23.5500, lon: -46.6400, raio: 550 },
    { nome: "Rua Conselheiro Furtado (Liberdade)", lat: -23.5558, lon: -46.6315, raio: 500 },
    { nome: "Mooca (Rua dos Trilhos / Ibitirama)", lat: -23.5580, lon: -46.5950, raio: 600 },
    { nome: "Marginal Pinheiros (Ponte Roberto Zuccolo)", lat: -23.5280, lon: -46.7150, raio: 600 }
];

// Estruturas de macrodrenagem relevantes para reduzir picos locais de escoamento.
// O efeito é gradual e limitado: a presença de um reservatório não zera o risco.
const SP_DRAINAGE_STRUCTURES = [
    { nome: "Reservatório de Retenção do Pacaembu", lat: -23.5488, lon: -46.6654, raio: 900 },
    { nome: "Piscinão Aricanduva", lat: -23.5685, lon: -46.5175, raio: 1200 },
    { nome: "Piscinão Rincão", lat: -23.5367, lon: -46.5702, raio: 900 },
    { nome: "Piscinão Guamiranga", lat: -23.5797, lon: -46.5909, raio: 900 }
];

// ─── CÁLCULO DE DISTÂNCIA ATÉ O RIO MAIS PRÓXIMO ──────────────────────────────
function getMinDistanceToRivers(lat, lon) {
    let minDistance = 999999;
    let closestRiver = "Bacia Geral";

    for (const river of SP_RIVERS) {
        for (let i = 0; i < river.coords.length - 1; i++) {
            const p1 = river.coords[i];
            const p2 = river.coords[i + 1];
            const dist = distanceToSegment(lat, lon, p1[0], p1[1], p2[0], p2[1]);
            if (dist < minDistance) {
                minDistance = dist;
                closestRiver = river.nome;
            }
        }
    }

    return { distance: Math.round(minDistance), river: closestRiver };
}

function distanceToSegment(lat, lon, lat1, lon1, lat2, lon2) {
    // Projeção métrica precisa para SP (1° lat ~ 111.000m, 1° lon ~ 102.000m)
    const px = (lon - lon1) * 102000;
    const py = (lat - lat1) * 111000;
    const dx = (lon2 - lon1) * 102000;
    const dy = (lat2 - lat1) * 111000;

    const lenSq = dx * dx + dy * dy;
    let param = lenSq !== 0 ? (px * dx + py * dy) / lenSq : -1;
    param = Math.max(0, Math.min(1, param));

    const projX = param * dx;
    const projY = param * dy;

    return Math.hypot(px - projX, py - projY);
}

// ─── VERIFICAÇÃO DE HISTÓRICO UNIVERSAL DEFESA CIVIL / CGE (RAIO 1000m + BACIAS SP) ───
function checkChronicFloodZone(lat, lon) {
    // 1. Prioriza a base oficial expandida do Geo-Spatial Query da Defesa Civil / CGE
    if (typeof queryHistoricalRiskClient === 'function') {
        const clientRes = queryHistoricalRiskClient(lat, lon, 1000);
        return {
            isChronic: clientRes.isChronic,
            zoneName: clientRes.zoneName,
            dist: clientRes.distanceMeters,
            influence: clientRes.influence,
            bacia: clientRes.bacia,
            zona: clientRes.zona,
            statusDescription: clientRes.statusDescription,
            hasRecordsWithinRadius: clientRes.hasRecordsWithinRadius
        };
    }

    // 2. Verificação de proximidade local (raio de 1000m)
    let nearest = null;
    for (const zone of CHRONIC_FLOOD_ZONES) {
        const dy = (lat - zone.lat) * 111000;
        const dx = (lon - zone.lon) * 102000;
        const dist = Math.hypot(dx, dy);

        if (!nearest || dist < nearest.dist) {
            nearest = { zone, dist };
        }
    }

    if (nearest && nearest.dist <= 1000) {
        const distFactor = Math.max(0, 1 - (nearest.dist / 1000));
        return {
            isChronic: distFactor >= 0.25,
            zoneName: nearest.zone.nome,
            dist: Math.round(nearest.dist),
            influence: Number((distFactor * 0.85).toFixed(3)),
            bacia: "Bacia Central",
            zona: "São Paulo",
            statusDescription: `Ponto Crítico CGE/Defesa Civil a ${Math.round(nearest.dist)}m (${nearest.zone.nome})`,
            hasRecordsWithinRadius: true
        };
    }

    // 3. Fallback Dinâmico por Macrozona / Bacia Hidrográfica de São Paulo (cobertura 100%)
    const fallback = (typeof getDynamicBasinFallbackClient === 'function')
        ? getDynamicBasinFallbackClient(lat, lon)
        : { zonaGeografica: "Planalto Metropolitano de SP", baciaHidrografica: "Bacia Hidrográfica Geral", probabilidadeBase: 42 };

    return {
        isChronic: false,
        zoneName: fallback.zonaGeografica,
        dist: nearest ? Math.round(nearest.dist) : null,
        influence: Number(((fallback.probabilidadeBase / 100) * 0.38).toFixed(3)),
        bacia: fallback.baciaHidrografica,
        zona: fallback.zonaGeografica,
        statusDescription: `Padrão hidrológico da ${fallback.zonaGeografica} (${fallback.baciaHidrografica})`,
        hasRecordsWithinRadius: false
    };
}

function getDrainageInfluence(lat, lon) {
    let nearest = null;
    for (const structure of SP_DRAINAGE_STRUCTURES) {
        const dy = (lat - structure.lat) * 111000;
        const dx = (lon - structure.lon) * 102000;
        const distance = Math.hypot(dx, dy);
        if (!nearest || distance < nearest.distance) nearest = { structure, distance };
    }

    if (!nearest) return { influence: 0, name: null, distance: null };
    const influence = 1 - smoothstep(0.25, 2.0, nearest.distance / nearest.structure.raio);
    return { influence, name: nearest.structure.nome, distance: Math.round(nearest.distance) };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
    const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return x * x * (3 - 2 * x);
}

// ─── CLASSIFICAÇÃO TOPOGRÁFICA DE SÃO PAULO ───────────────────────────────────
function getAltitudeClassification(alt) {
    if (alt <= 730) {
        return {
            tipo: "Área de Vale / Depressão",
            badge: "⚠️ Vale (+40% Risco)",
            desc: "Fundo de vale e baixada com alta retenção hídrica",
            color: "#EF4444",
            factorTxt: "+40%"
        };
    } else if (alt >= 780) {
        return {
            tipo: "Área Alta / Colina",
            badge: "🛡️ Colina (-40% Desconto)",
            desc: "Espigão e morro elevado com rápida drenagem pluvial",
            color: "#38BDF8",
            factorTxt: "-40%"
        };
    } else {
        const diff = Math.round(((755 - alt) / 25) * 20);
        const sign = diff >= 0 ? `+${diff}%` : `${diff}%`;
        return {
            tipo: "Planalto Médio",
            badge: `Planalto (${sign})`,
            desc: "Altitude intermediária do planalto paulistano",
            color: "#94A3B8",
            factorTxt: sign
        };
    }
}

// ─── INICIALIZAR MAPA LEAFLET ─────────────────────────────────────────────────
function initLeafletMap() {
    map = L.map('map', {
        zoomControl: true,
        attributionControl: true
    }).setView([currentSelectedPoint.lat, currentSelectedPoint.lon], 15);

    // Mapas-base alternáveis: ruas para navegação e imagem aérea para inspeção do relevo.
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    });
    const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics'
        }
    );

    streetLayer.addTo(map);
    createMapLayerSwitcher(streetLayer, satelliteLayer);

    // Adiciona escala métrica
    L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(map);

    // Clique em qualquer parte do mapa -> Análise dinâmica instantânea
    map.on('click', async (e) => {
        hasActiveUserSelection = true;
        const { lat, lng } = e.latlng;
        
        // Exibe loader instantâneo no card e limpa dados anteriores
        document.getElementById('hero-location-name').innerHTML = `<span class="location-pin-badge">⏳</span> <span class="location-title-text">Localizando endereço...</span>`;
        const elBairro = document.getElementById('hero-location-bairro');
        if (elBairro) elBairro.textContent = `Identificando bairro e região...`;
        const elAddress = document.getElementById('hero-location-address');
        if (elAddress) elAddress.textContent = `Consultando base cartográfica...`;
        document.getElementById('hero-location-coord').textContent = `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        // Busca o nome completo do local via Reverse Geocoding e altitude via OpenTopoData
        const [locationName, realAlt] = await Promise.all([
            reverseGeocode(lat, lng),
            getElevation(lat, lng)
        ]);

        await analyzePoint(lat, lng, locationName.nome, locationName.bairro, realAlt, locationName.display_name);
    });
}

// ─── ANALISAR PONTO DINAMICAMENTE (API CLIMA + IA + GRÁFICO) ─────────────────
async function analyzePoint(lat, lon, nome, bairro = "São Paulo - SP", alt = null, fullAddress = null, isUserLocation = false) {
    // Se a altitude não foi passada, consulta em tempo real na API de Elevação
    const realAlt = alt !== null && alt !== undefined ? alt : await getElevation(lat, lon);
    const altInfo = getAltitudeClassification(realAlt);

    const enderecoCompleto = fullAddress || (bairro ? `${nome} — ${bairro}` : nome);
    currentSelectedPoint = { lat, lon, nome, bairro, alt: realAlt, address: enderecoCompleto, isUserLocation };

    // 1. Atualizar Header do Local Completo (Nome, Bairro, Endereço e Coordenadas)
    if (isUserLocation) {
        document.getElementById('hero-location-name').innerHTML = `
            <span class="location-pin-badge" style="background: rgba(56, 189, 248, 0.25); border-color: #38BDF8; color: #38BDF8;">🎯</span>
            <span class="location-title-text">${escapeHtml(nome)} <span style="font-size: 10px; background: rgba(56,189,248,0.22); color: #38BDF8; padding: 2px 7px; border-radius: 4px; font-weight: 800; margin-left: 6px; border: 1px solid rgba(56,189,248,0.4); vertical-align: middle;">VOCÊ ESTÁ AQUI</span></span>
        `;
    } else {
        document.getElementById('hero-location-name').innerHTML = `
            <span class="location-pin-badge">📍</span>
            <span class="location-title-text">${escapeHtml(nome)}</span>
        `;
    }
    
    const elBairro = document.getElementById('hero-location-bairro');
    if (elBairro) {
        elBairro.innerHTML = `🏙️ <strong>${bairro}</strong>`;
    }

    const elAddress = document.getElementById('hero-location-address');
    if (elAddress) {
        elAddress.innerHTML = `📌 <b>Endereço Completo:</b> ${enderecoCompleto}`;
    }
    
    document.getElementById('hero-location-coord').textContent = `Coordenadas: ${lat.toFixed(4)}, ${lon.toFixed(4)} • ${realAlt}m (${altInfo.tipo})`;

    // Atualiza a barra de busca para sincronizar com o ponto clicado sem sobrecarregar
    const searchInput = document.getElementById('universal-search-input');
    if (searchInput && document.activeElement !== searchInput) {
        searchInput.value = isUserLocation ? (nome.includes('Você está') ? enderecoCompleto.split(',')[0] : nome) : nome;
        const clearBtn = document.getElementById('btn-search-clear');
        if (clearBtn) clearBtn.style.display = 'block';
    }

    // 2. Buscar Dados Climáticos da Open-Meteo para a coordenada
    const weatherData = await fetchWeatherData(lat, lon);

    // 2.5 Buscar Telemetria de Rios (URL relativa — funciona local e em produção)
    try {
        const riverUrl = `/api/rivers/nearest?lat=${lat}&lon=${lon}&radius_m=800`;
        const res = await fetch(riverUrl, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
            currentRiverTelemetry = await res.json();
            console.debug('[FloodGuard] Telemetria de Rio:', 
                currentRiverTelemetry.estacao?.rio,
                '|', currentRiverTelemetry.nivel,
                '|', currentRiverTelemetry.percentual_ocupacao + '%',
                '| Fonte:', currentRiverTelemetry.estacao?.fonte_dados || 'mock'
            );
        } else {
            console.warn('[FloodGuard] River API retornou:', res.status);
            currentRiverTelemetry = null;
        }
    } catch (e) {
        console.warn('[FloodGuard] Telemetria de rio indisponível:', e.message);
        currentRiverTelemetry = null;
    }

    // 3. Processar Série Temporal e Calcular Risco Preditivo com os 4 Pilares Geográficos
    const analysis = processRiskAnalysis(weatherData, realAlt, lat, lon);

    // 4. Atualizar os Cards e Métricas da UI
    updateUIWithAnalysis(analysis, realAlt, lat, lon);

    // 5. Atualizar Marcador e Zona Dinâmica no Mapa
    updateMapMarker(lat, lon, nome, analysis, realAlt, lat, lon, isUserLocation);

    // 6. Atualizar Gráfico Chart.js
    renderTrendChart(analysis.labels, analysis.historyRisks, analysis.forecastRisks, analysis.maxForecastRisk);
}

// ─── BUSCA DE CLIMA NA OPEN-METEO (API REAL EM TEMPO REAL) ───────────────────
async function fetchWeatherData(lat, lon) {
    const key = `w_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const now = Date.now();
    if (geocodeCache[key] && geocodeCache[key].expiresAt && now < geocodeCache[key].expiresAt) {
        return geocodeCache[key].data;
    }

    // API Open-Meteo Oficial: coordenadas exatas, precipitação em tempo real (current) e histórico horário (hourly)
    const directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation,rain,showers&hourly=precipitation,precipitation_probability,soil_moisture_0_to_1cm&daily=precipitation_sum,precipitation_probability_max&past_days=1&forecast_days=1&timezone=America%2FSao_Paulo`;
    const proxyUrl = `/api/dashboard/weather?lat=${lat}&lon=${lon}`;

    let data = null;

    // 1. Chamada direta à API da Open-Meteo
    try {
        const res = await fetch(directUrl, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
            data = await res.json();
        }
    } catch (e) {
        console.warn("[FloodGuard] Chamada direta Open-Meteo falhou, tentando proxy interno...", e.message);
    }

    // 2. Fallback resiliente via backend interno
    if (!data || !data.hourly) {
        try {
            const proxyRes = await fetch(proxyUrl);
            if (proxyRes.ok) {
                data = await proxyRes.json();
            }
        } catch (e) {
            console.warn("[FloodGuard] Proxy meteorológico indisponível:", e.message);
        }
    }

    if (data && data.hourly) {
        geocodeCache[key] = { data, expiresAt: Date.now() + 120000 };
        return data;
    }

    return null;
}

// ─── PROCESSADOR DO MOTOR PREDITIVO DE RISCO (4 PILARES) ─────────────────────
function processRiskAnalysis(data, altitude, lat, lon) {
    if (!data || !data.hourly) {
        return getFallbackAnalysis();
    }

    const times = data.hourly.time || [];
    // Prioriza precipitação total (chuva contínua + pancadas + garoa)
    const rains = data.hourly.precipitation || data.hourly.rain || [];
    const probs = data.hourly.precipitation_probability || [];
    const soilMoistures = data.hourly.soil_moisture_0_to_1cm || [];

    // Localiza o índice da hora atual com base no timestamp retornado pela Open-Meteo
    const currentTimeStr = (data.current && data.current.time) ? data.current.time : '';
    let currentIdx = -1;
    if (currentTimeStr) {
        currentIdx = times.findIndex(t => t.startsWith(currentTimeStr.slice(0, 13)));
    }
    if (currentIdx === -1) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const localHourStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}`;
        currentIdx = times.findIndex(t => t.startsWith(localHourStr));
    }
    if (currentIdx === -1) currentIdx = Math.max(0, times.length - 8);

    // Chuva atual ainda alimenta o motor de risco, mas o card exibe a previsão diária.
    let currentRain = 0.0;
    if (typeof data.current_rain_mm_h === 'number') {
        currentRain = data.current_rain_mm_h;
    } else if (data.current && typeof data.current.precipitation === 'number') {
        currentRain = Number(data.current.precipitation);
    } else if (data.current && typeof data.current.rain === 'number') {
        currentRain = Number(data.current.rain) + Number(data.current.showers || 0);
    } else if (currentIdx >= 0 && rains[currentIdx] !== null) {
        currentRain = Number(rains[currentIdx]) || 0;
    }

    // Acumulado 24h (#kpi-rain-acc24): Soma real das últimas 24 horas de chuva para o ponto selecionado
    let acc24h = 0.0;
    if (typeof data.accumulated_24h_mm === 'number') {
        acc24h = data.accumulated_24h_mm;
    } else {
        for (let j = 0; j < 24; j++) {
            const idx = currentIdx - j;
            if (idx >= 0 && rains[idx] !== null && !isNaN(rains[idx])) {
                acc24h += Number(rains[idx]);
            }
        }
    }

    // Total e maior probabilidade do dia civil atual (fuso América/São Paulo)
    const daily = data.daily || {};
    const spTodayStr = (data.current && data.current.time)
        ? data.current.time.slice(0, 10)
        : new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

    let dailyIndex = Array.isArray(daily.time) ? daily.time.indexOf(spTodayStr) : -1;
    if (dailyIndex === -1 && Array.isArray(daily.time) && daily.time.length > 0) {
        // Pega o último elemento (hoje/previsão), NUNCA o índice 0 (ontem)!
        dailyIndex = daily.time.length - 1;
    }

    let dailyRainTotal = 0.0;
    if (typeof data.today_rain_sum_mm === 'number') {
        dailyRainTotal = data.today_rain_sum_mm;
    } else if (dailyIndex >= 0 && Array.isArray(daily.precipitation_sum)) {
        dailyRainTotal = Math.max(0, Number(daily.precipitation_sum[dailyIndex]) || 0);
    }
    const dailyRainChance = (dailyIndex >= 0 && Array.isArray(daily.precipitation_probability_max))
        ? clamp(Number(daily.precipitation_probability_max[dailyIndex]) || 0, 0, 100)
        : 0;

    // Série das últimas 24h
    const labels = [];
    const historyRisks = [];
    const forecastRisks = [];

    for (let i = 23; i >= 0; i--) {
        const idx = currentIdx - i;
        const d = new Date(times[idx]);
        const horaStr = isNaN(d.getTime()) ? `${24 - i}h` : `${d.getHours().toString().padStart(2, '0')}h`;

        let localAcc = 0;
        for (let k = 0; k < 24; k++) {
            if (idx - k >= 0 && rains[idx - k] !== null) localAcc += rains[idx - k];
        }

        const rainVal = (idx >= 0 && rains[idx] !== null) ? rains[idx] : 0;
        const probVal = (idx >= 0 && probs[idx] !== null) ? probs[idx] : 0;
        const soilMoisture = (idx >= 0 && soilMoistures[idx] !== null) ? soilMoistures[idx] : null;

        const risk = calculateRiskFormula(rainVal, localAcc, probVal, altitude, lat, lon, soilMoisture);
        labels.push(i === 0 ? `Agora (${horaStr})` : horaStr);
        historyRisks.push(risk);
        forecastRisks.push(null);
    }

    const currentRisk = historyRisks[historyRisks.length - 1];
    forecastRisks[forecastRisks.length - 1] = currentRisk; // Ponto de conexão

    // Projeção futura (+1h, +2h, +3h)
    let forecastRainTotal = 0;
    let maxForecastRain = 0;
    const fRisks = [];

    for (let f = 1; f <= 3; f++) {
        const idx = currentIdx + f;
        const d = new Date(times[idx]);
        const horaStr = isNaN(d.getTime()) ? `+${f}h` : `+${f}h (${d.getHours().toString().padStart(2, '0')}h)`;

        let rainVal = (idx < rains.length && rains[idx] !== null) ? rains[idx] : 0;
        let probVal = (idx < probs.length && probs[idx] !== null) ? probs[idx] : 0;
        const soilMoisture = (idx < soilMoistures.length && soilMoistures[idx] !== null)
            ? soilMoistures[idx]
            : (soilMoistures[currentIdx] ?? null);

        // Se houver cenário simulado para a FECART
        if (simulatedScenario === 'tempestade') {
            rainVal = f === 1 ? 18.0 : (f === 2 ? 38.0 : 20.0);
            probVal = 98;
        } else if (simulatedScenario === 'moderada') {
            rainVal = f === 1 ? 4.0 : (f === 2 ? 5.5 : 3.0);
            probVal = 70;
        }

        forecastRainTotal += rainVal;
        maxForecastRain = Math.max(maxForecastRain, rainVal);
        const risk = calculateRiskFormula(rainVal, acc24h + forecastRainTotal, probVal, altitude, lat, lon, soilMoisture);

        labels.push(horaStr);
        historyRisks.push(null);
        forecastRisks.push(risk);
        fRisks.push(risk);
    }

    const maxForecastRisk = Math.max(...fRisks);

    return {
        currentRain,
        acc24h,
        dailyRainTotal,
        dailyRainChance,
        forecastRainTotal,
        maxForecastRain,
        currentRisk,
        maxForecastRisk,
        labels,
        historyRisks,
        forecastRisks
    };
}

// Retorna o teto hidrológico imposto pela chuva. A chuva é condição necessária:
// relevo, histórico ou rio isoladamente nunca produzem alerta alto/crítico.
function getRainRiskCap(rainMm, acc24h) {
    const rain = Math.max(0, Number(rainMm) || 0);
    const accumulated = Math.max(0, Number(acc24h) || 0);
    const strongRain = rain > 15 || accumulated > 40;
    if (strongRain) return 100;

    // ─── 1. REGRA ABSOLUTA DO FATOR CHUVA (GATEKEEPER) ───
    // Se a Chuva Atual for 0.0 mm/h e o acumulado for < 1.0 mm:
    // O Risco Preditivo final NÃO PODE ultrapassar 20% (Status VERDE - Condição Segura / Risco Baixo)
    // em NENHUM PONTO de São Paulo, independentemente da proximidade de córregos, topografia ou dados históricos antigos.
    if (rain === 0.0 && accumulated < 1.0) {
        return 15.0; // Estritamente Risco Baixo (<20%)
    }
    // Ao clicar em qualquer local sem chuva no momento (0.0 mm/h):
    // Obrigatoriamente Risco Baixo (<20%) - Condição Segura
    if (rain === 0.0) {
        if (accumulated <= 10.0) {
            return 18.0; // Risco Baixo (<20%)
        }
        return 19.5; // Teto absoluto sem chuva atual (<20%)
    }

    if (rain >= 0.1 && rain <= 5) return 45;
    // Chuva intermediária ou solo ainda carregado: permite risco alto, não crítico.
    return 75;
}

function applyRainRiskCap(risk, rainMm, acc24h) {
    return Math.min(risk, getRainRiskCap(rainMm, acc24h));
}

// ─── MOTOR PREDITIVO DE IA — HIERARQUIA HIDROLÓGICA (0 a 100%) ───────────────
// Risco = (Chuva * 0.50) + (Rio * 0.30) + (Relevo_Histórico * 0.20)
function calculateRiskFormula(rainMm, acc24h, prob, alt, lat, lon, soilMoisture = null) {
    const rain = Math.max(0, Number(rainMm) || 0);
    const accumulated = Math.max(0, Number(acc24h) || 0);
    const probability = clamp(Number(prob) || 0, 0, 100);
    const elevation = Number.isFinite(Number(alt)) ? Number(alt) : 745;

    // ─── 1. PILAR CLIMA EM TEMPO REAL (OPEN-METEO) [0 a 100] ───
    const rainScore = 100 * (1 - Math.exp(-rain / 16));
    const accumulatedScore = 100 * (1 - Math.exp(-accumulated / 55));
    const probabilityScore = probability * (0.25 + 0.75 * Math.min(1, rain / 2));
    const inferredMoisture = 0.18 + 0.28 * (1 - Math.exp(-accumulated / 45));
    const moisture = soilMoisture === null || !Number.isFinite(Number(soilMoisture))
        ? inferredMoisture
        : Number(soilMoisture);
    const soilScore = 100 * smoothstep(0.18, 0.46, moisture);

    const Score_Clima = (
        rainScore * 0.46 +
        accumulatedScore * 0.24 +
        probabilityScore * 0.12 +
        soilScore * 0.18
    );

    // ─── 2. PILAR TOPOGRAFIA / RELEVO (OPENTOPODATA / ASTER) [0 a 100] ───
    // Vales de SP (715-725m) têm alta suscetibilidade; cotas altas (>770m) dispersam o escoamento
    const Score_Topografia = clamp(100 / (1 + Math.exp((elevation - 744) / 14)), 5, 98);

    // ─── 3. PILAR PROXIMIDADE A CORPOS HÍDRICOS (CALHAS FLUVIAIS DE SP) E TELEMETRIA [0 a 100] ───
    const riverInfo = getMinDistanceToRivers(lat, lon);
    const riverDist = riverInfo.distance;
    const Score_Proximidade_Rio = clamp(100 * Math.exp(-riverDist / 800), 2, 98);

    let riverMultiplier = 1.0;
    const riverSource = currentRiverTelemetry?.estacao?.fonte_dados || '';
    const hasRealRiverTelemetry = currentRiverTelemetry && currentRiverTelemetry.dentro_raio &&
        !currentRiverTelemetry.dados_simulados && riverSource !== 'mock';
    if (hasRealRiverTelemetry) {
        riverMultiplier = currentRiverTelemetry.multiplicador;
    }
    const Score_Nivel_Rio = clamp(Score_Proximidade_Rio * riverMultiplier, 2, 100);

    // ─── 4. PILAR HISTÓRICO DEFESA CIVIL / CGE (RAIO 1000m + FALLBACK DE BACIA) [0 a 100] ───
    const chronicInfo = checkChronicFloodZone(lat, lon);
    let Score_Historico_CGE = 42;
    if (chronicInfo.hasRecordsWithinRadius) {
        const distRatio = Math.max(0, 1 - (chronicInfo.dist / 1000));
        Score_Historico_CGE = clamp(48 + distRatio * 50, 45, 98);
    } else {
        // Fallback dinâmico calibrado pela bacia hidrográfica/zona de SP
        Score_Historico_CGE = clamp((chronicInfo.influence / 0.42) * 62, 35, 75);
    }

    // Histórico da Defesa Civil é prioritário dentro da faixa conjunta de 20%.
    const Score_Relevo_Historico = (Score_Historico_CGE * 0.70) + (Score_Topografia * 0.30);
    const Peso_Chuva = 0.50;
    const Peso_Rio = 0.30;
    const Peso_Relevo_Historico = 0.20;

    let Risco_Multifatorial = (
        (Peso_Chuva * Score_Clima) +
        (Peso_Rio * Score_Nivel_Rio) +
        (Peso_Relevo_Historico * Score_Relevo_Historico)
    );

    // Atenuação por estruturas de macrodrenagem e piscinões
    const drainageInfo = getDrainageInfluence(lat, lon);
    if (drainageInfo && drainageInfo.influence > 0) {
        Risco_Multifatorial *= (1 - drainageInfo.influence * 0.08);
    }

    // ─── REGRA ABSOLUTA DO FATOR CHUVA (GATEKEEPER) ───
    // Se a Chuva Atual for 0.0 mm/h e o acumulado < 1.0 mm:
    // O Risco Preditivo final NÃO PODE ultrapassar 20% (Status VERDE - Condição Segura / Risco Baixo)
    // em NENHUM PONTO de São Paulo, independentemente de córregos, topografia ou histórico.
    if (rain === 0.0 && accumulated < 1.0) {
        Risco_Multifatorial = Math.min(Risco_Multifatorial * 0.15, 15);
    } else if (rain === 0.0) {
        Risco_Multifatorial = Math.min(Risco_Multifatorial * 0.25, 18);
    } else {
        Risco_Multifatorial = applyRainRiskCap(Risco_Multifatorial, rain, accumulated);
    }

    return Math.max(0, Math.min(100, Math.round(Risco_Multifatorial)));
}

// ─── ATUALIZAR UI COM DADOS CALCULADOS E 4 PILARES ───────────────────────────
function updateUIWithAnalysis(analysis, alt, lat, lon) {
    const risk = analysis.currentRisk;
    const color = getRiskColor(risk);
    const label = getRiskLabel(risk);
    const altInfo = getAltitudeClassification(alt);
    const riverInfo = getMinDistanceToRivers(lat, lon);
    const chronicInfo = checkChronicFloodZone(lat, lon);

    // Hero Badge & Porcentagem
    const elPercent = document.getElementById('hero-risk-percent');
    const elBadge = document.getElementById('hero-risk-badge');
    const elLabel = document.getElementById('hero-risk-label');
    const elBar = document.getElementById('hero-risk-bar');
    const elRec = document.getElementById('hero-recommendation');

    elPercent.textContent = `${risk}%`;
    elPercent.style.color = color;

    elBadge.textContent = label;
    elBadge.style.background = `${color}22`;
    elBadge.style.color = color;
    elBadge.style.borderColor = `${color}66`;

    elLabel.textContent = risk >= 75 ? "🚨 Alerta Crítico" : (risk >= 50 ? "⚠️ Atenção Alta" : (risk >= 30 ? "🟡 Atenção Moderada" : "🟢 Condição Segura"));

    elBar.style.width = `${Math.max(8, risk)}%`;
    elBar.style.background = color;

    // ─── CARD DE TELEMETRIA HÍDRICA ───────────────────────────────────────────
    const alertBox    = document.getElementById('river-telemetry-alert');
    const alertOkBox  = document.getElementById('river-telemetry-ok');
    const alertMsg    = document.getElementById('river-telemetry-alert-msg');
    const alertPct    = document.getElementById('river-alert-pct');
    const alertBar    = document.getElementById('river-alert-bar');
    const alertLabel  = document.getElementById('river-alert-label');
    const alertEmoji  = document.getElementById('river-alert-emoji');
    const alertName   = document.getElementById('river-alert-station-name');
    const alertFonte  = document.getElementById('river-alert-fonte');
    const alertReg    = document.getElementById('river-alert-regional');
    const alertRegList= document.getElementById('river-alert-regional-list');

    if (currentRiverTelemetry && currentRiverTelemetry.estacao) {
        const rt = currentRiverTelemetry;
        const nivel = rt.nivel || 'normal';
        const pct   = rt.percentual_ocupacao || 0;
        const nomeEstacao = rt.estacao.nome || rt.estacao.rio;
        const fonte = rt.estacao.fonte_dados || 'mock dinâmico';
        const isSimulatedRiver = rt.dados_simulados || fonte === 'mock' || fonte.startsWith('Simulação');
        const fonteLabel = fonte.includes('tempo real')
            ? '🔴 AO VIVO — SAISP/CGE'
            : (isSimulatedRiver ? '⚪ Telemetria real indisponível' : 'Fonte externa');

        // Cores por nível
        const lvlColors = {
            extravasamento: { border: '#EF4444', bg: 'rgba(239,68,68,0.08)', text: '#EF4444', light: '#FCA5A5' },
            alerta:         { border: '#F97316', bg: 'rgba(249,115,22,0.08)', text: '#F97316', light: '#FDBA74' },
            atencao:        { border: '#EAB308', bg: 'rgba(234,179,8,0.08)',  text: '#EAB308', light: '#FDE047' },
            normal:         { border: '#10B981', bg: 'rgba(16,185,129,0.08)', text: '#10B981', light: '#6EE7B7' },
            indisponivel:   { border: '#64748B', bg: 'rgba(100,116,139,0.08)', text: '#94A3B8', light: '#CBD5E1' },
        };
        const lc = lvlColors[nivel] || lvlColors.normal;

        if (nivel === 'alerta' || nivel === 'extravasamento') {
            // Modo ALERTA — mostra o card vermelho/laranja
            if (alertBox)  alertBox.style.display = 'block';
            if (alertOkBox) alertOkBox.style.display = 'none';

            if (alertBox) alertBox.style.borderColor = lc.border;
            const hdr = document.getElementById('river-alert-header');
            if (hdr) hdr.style.background = `linear-gradient(90deg, ${lc.border}30 0%, ${lc.border}08 100%)`;
            if (alertEmoji) alertEmoji.textContent = rt.emoji;
            if (alertName)  alertName.style.color = lc.light;
            if (alertName)  alertName.textContent = nomeEstacao;
            if (alertPct)   { alertPct.textContent = `${pct}%`; alertPct.style.color = lc.text; }
            if (alertBar)   { alertBar.style.width = `${Math.min(pct, 100)}%`; alertBar.style.background = lc.text; }
            if (alertLabel) { alertLabel.textContent = rt.label || nivel.toUpperCase(); alertLabel.style.color = lc.text; alertLabel.style.background = `${lc.text}22`; }
            if (alertFonte) alertFonte.textContent = `Fonte: ${fonteLabel}`;
            if (alertMsg)   alertMsg.innerHTML = (rt.mensagem_alerta || '') + ` <strong style="color:${lc.text}">IA eleva risco para ${risk}%.</strong>`;

            // Alertas regionais extras
            if (alertReg && alertRegList && rt.alertas_regionais && rt.alertas_regionais.length > 0) {
                alertReg.style.display = 'block';
                alertRegList.innerHTML = rt.alertas_regionais.slice(0, 3)
                    .map(a => `${a.emoji} <b>${a.rio}</b>: ${a.label} (${a.distancia_m}m)`)
                    .join('<br>');
            } else if (alertReg) {
                alertReg.style.display = 'none';
            }
        } else {
            // Modo NORMAL — esconde o card de alerta, mostra indicador OK
            if (alertBox) alertBox.style.display = 'none';
            if (alertOkBox) {
                alertOkBox.style.display = 'flex';
                const okEmoji = document.getElementById('river-ok-emoji');
                const okName  = document.getElementById('river-ok-name');
                const okInfo  = document.getElementById('river-ok-info');
                if (okEmoji) okEmoji.textContent = rt.emoji || '🟢';
                if (okName)  okName.textContent = rt.estacao.rio;
                if (okInfo)  okInfo.textContent = isSimulatedRiver
                    ? 'Dados simulados desconsiderados do risco • aguardando telemetria real'
                    : `${rt.label} — ${pct}% da calha • ${fonteLabel}`;
            }
        }
    } else {
        // Sem dados de telemetria — esconde ambos
        if (alertBox)  alertBox.style.display = 'none';
        if (alertOkBox) alertOkBox.style.display = 'none';
    }

    // Recomendações
    if (risk >= 75) {
        elRec.innerHTML = `🚨 <strong>Risco Crítico de Inundação:</strong> ${alt <= 730 ? 'Ponto baixo de vale com retenção hídrica severa.' : 'Evite áreas baixas e passagens subterrâneas.'} ${riverInfo.distance < 500 ? `Atenção: A apenas ${riverInfo.distance}m do ${riverInfo.river}.` : ''}`;
    } else if (risk >= 50) {
        elRec.innerHTML = `⚠️ <strong>Risco Alto de Alagamento:</strong> Pontos de drenagem lenta podem acumular água nas vias.`;
    } else if (risk >= 30) {
        elRec.innerHTML = `🟡 <strong>Atenção Moderada:</strong> Chuva contínua pode provocar lentidão e bolsões pontuais de água.`;
    } else {
        elRec.innerHTML = `🛡️ <strong>Sem risco iminente:</strong> Drenagem operando normalmente (${altInfo.tipo}).`;
    }

    // ── Mini KPIs: previsão total do dia e histórico das últimas 24h ──────────
    const elRainCurrent = document.getElementById('kpi-rain-current');
    if (elRainCurrent) {
        const rainToday = analysis.dailyRainTotal;
        elRainCurrent.textContent = `${rainToday.toFixed(1)} mm`;
        if (rainToday >= 30) {
            elRainCurrent.style.color = '#EF4444'; // Vermelho — Chuva Forte/Tempestade
        } else if (rainToday >= 10) {
            elRainCurrent.style.color = '#F59E0B'; // Amarelo — Chuva Moderada
        } else if (rainToday > 0) {
            elRainCurrent.style.color = '#38BDF8'; // Azul — Chuva Fraca/Garoa
        } else {
            elRainCurrent.style.color = '#10B981'; // Verde — Sem chuva prevista
        }
    }

    const elForecastSub = document.getElementById('kpi-rain-forecast-sub');
    if (elForecastSub) {
        elForecastSub.textContent = `Chance máxima hoje: ${Math.round(analysis.dailyRainChance)}%`;
    }

    const elRainAcc = document.getElementById('kpi-rain-acc24');
    if (elRainAcc) {
        elRainAcc.textContent = `${analysis.acc24h.toFixed(1)} mm`;
        elRainAcc.style.color = analysis.acc24h >= 50 ? '#EF4444' : (analysis.acc24h >= 20 ? '#F59E0B' : '#38BDF8');
    }

    const elSoil = document.getElementById('kpi-soil-status');
    if (elSoil) {
        if (analysis.acc24h > 50) {
            elSoil.textContent = '🚨 Solo Saturado';
            elSoil.style.color = '#EF4444';
        } else if (analysis.acc24h > 20) {
            elSoil.textContent = '⚠️ Solo Úmido';
            elSoil.style.color = '#F59E0B';
        } else {
            elSoil.textContent = 'Solo Estável';
            elSoil.style.color = '#64748B';
        }
    }

    // Distância do Rio e Corpo Hídrico
    const elRiverDist = document.getElementById('kpi-river-dist');
    const elRiverName = document.getElementById('kpi-river-name');
    
    // Prioriza o cálculo da rede completa vindo do backend se disponível
    const effectiveDistance = (currentRiverTelemetry && typeof currentRiverTelemetry.distancia_calha_m === 'number')
        ? currentRiverTelemetry.distancia_calha_m
        : riverInfo.distance;
    const effectiveRiverName = (currentRiverTelemetry && currentRiverTelemetry.calha_nome)
        ? currentRiverTelemetry.calha_nome
        : riverInfo.river;

    if (elRiverDist) {
        elRiverDist.textContent = effectiveDistance < 1000 ? `${Math.round(effectiveDistance)} m` : `${(effectiveDistance / 1000).toFixed(1)} km`;
        elRiverDist.style.color = effectiveDistance < 500 ? "#EF4444" : (effectiveDistance < 1200 ? "#F59E0B" : "#06B6D4");
    }
    if (elRiverName) {
        elRiverName.textContent = effectiveRiverName.split('(')[0].trim();
        elRiverName.title = `${effectiveRiverName} (${Math.round(effectiveDistance)}m)`;
    }

    // Altitude Local
    const elAlt = document.getElementById('kpi-altitude');
    const elAltSub = document.getElementById('kpi-altitude-sub');
    if (elAlt) elAlt.textContent = `${alt} m`;
    if (elAltSub) {
        elAltSub.textContent = altInfo.badge;
        elAltSub.style.color = altInfo.color;
    }

    // Insight da IA: Síntese dos 5 Pilares (incluindo Telemetria Fluvial)
    const elInsight = document.getElementById('ai-insight-text');
    const riverFactorTxt = riverInfo.distance < 500 ? "×1.8 (crítico)" : (riverInfo.distance <= 1200 ? "×1.3" : "neutro");
    const chronicTxt = chronicInfo.hasRecordsWithinRadius
        ? `🚨 <strong>Defesa Civil:</strong> Ponto Crítico a ${chronicInfo.dist}m (${chronicInfo.zoneName}).`
        : `🌐 <strong>Bacia Hidrográfica:</strong> ${chronicInfo.bacia || chronicInfo.zoneName}.`;

    // Telemetria fluvial no Insight
    let telemetriaTxt = '';
    if (currentRiverTelemetry && currentRiverTelemetry.estacao) {
        const rt = currentRiverTelemetry;
        const multi = rt.dentro_raio ? `×${rt.multiplicador}` : 'fora do raio (800m)';
        const emojiRio = rt.emoji || '🟢';
        const fonteTag = rt.estacao.fonte_dados && rt.estacao.fonte_dados.includes('tempo real')
            ? '<span style="color:#EF4444;font-weight:800;">[AO VIVO]</span>'
            : '<span style="color:#38BDF8;font-weight:700;">[Simulado]</span>';
        telemetriaTxt = ` ${emojiRio} <strong>Telemetria ${rt.estacao.rio}:</strong> ${rt.percentual_ocupacao}% da calha (${rt.label}) ${fonteTag} — Multiplicador ${multi}.`;
    }

    if (risk >= 75) {
        elInsight.innerHTML = `<strong>🚨 ALERTA MÁXIMO DA IA (${risk}%):</strong> Precipitação +${analysis.forecastRainTotal.toFixed(1)}mm • Relevo ${alt}m (${altInfo.factorTxt}) • Calha a ${riverInfo.distance}m (${riverFactorTxt}).${telemetriaTxt} ${chronicTxt}`;
    } else if (risk >= 50) {
        elInsight.innerHTML = `<strong>⚠️ ATENÇÃO ELEVADA (${risk}%):</strong> Chuva +${analysis.forecastRainTotal.toFixed(1)}mm • Topografia ${alt}m (${altInfo.tipo}) • ${riverInfo.distance}m de corpo hídrico.${telemetriaTxt} ${chronicTxt}`;
    } else if (analysis.currentRain === 0 && risk <= 20) {
        elInsight.innerHTML = `<strong>🟢 CONDIÇÃO SEGURA (${risk}%):</strong> Sem chuva no momento (0.0 mm/h). Condição segura e estável para a região • Relevo ${alt}m (${altInfo.tipo}) • Calha a ${riverInfo.distance < 1000 ? riverInfo.distance + 'm' : (riverInfo.distance/1000).toFixed(1)+'km'}.${telemetriaTxt}`;
    } else {
        elInsight.innerHTML = `<strong>🔍 ANÁLISE PREDITIVA (${risk}%):</strong> Relevo ${alt}m (${altInfo.tipo}, ${altInfo.factorTxt}) • Calha a ${riverInfo.distance < 1000 ? riverInfo.distance + 'm' : (riverInfo.distance/1000).toFixed(1)+'km'}.${telemetriaTxt} ${chronicTxt}`;
    }
}


// ─── ATUALIZAR MARCADOR E CÍRCULO DINÂMICO NO MAPA ────────────────────────────
function updateMapMarker(lat, lon, nome, analysis, alt, latParam, lonParam, isUserLocation = false) {
    if (!map) return;

    // Remove camadas anteriores
    if (activeMarker) map.removeLayer(activeMarker);
    if (activeRiskCircle) map.removeLayer(activeRiskCircle);

    const risk = analysis.currentRisk;
    const color = getRiskColor(risk);
    const altInfo = getAltitudeClassification(alt);
    const riverInfo = getMinDistanceToRivers(lat, lon);
    const chronicInfo = checkChronicFloodZone(lat, lon);

    // Ícone dinâmico: se for a localização atual do usuário (GPS), usa badge e efeito de radar cibernético
    let iconHtml = '';
    let iconSize = [56, 56];
    let iconAnchor = [28, 28];

    if (isUserLocation) {
        iconSize = [64, 64];
        iconAnchor = [32, 32];
        iconHtml = `
            <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: #38BDF8; opacity: 0.45; animation: pulse-dot-anim 1.4s infinite;"></div>
                <div style="position: absolute; width: 78%; height: 78%; border-radius: 50%; background: ${color}; opacity: 0.6; animation: pulse-dot-anim 2s infinite;"></div>
                <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #0284C7, ${color}); border: 3px solid #FFFFFF; box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 22px #38BDF8; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFFFFF; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; user-select: none;">
                    <span style="font-size: 10px; line-height: 1; margin-top: 1px;">🎯</span>
                    <span style="font-size: 12px; font-weight: 900; line-height: 1; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${risk}%</span>
                    <span style="font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.95;">VOCÊ</span>
                </div>
            </div>
        `;
    } else {
        iconHtml = `
            <div style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${color}; opacity: 0.35; animation: pulse-dot-anim 1.8s infinite;"></div>
                <div style="width: 46px; height: 46px; border-radius: 50%; background: ${color}; border: 3px solid #FFFFFF; box-shadow: 0 4px 18px rgba(0,0,0,0.5), 0 0 16px ${color}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFFFFF; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; user-select: none;">
                    <span style="font-size: 13px; font-weight: 900; line-height: 1; text-shadow: 0 1px 3px rgba(0,0,0,0.7);">${risk}%</span>
                    <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.95; margin-top: 1px;">RISCO</span>
                </div>
            </div>
        `;
    }

    const icon = L.divIcon({ className: '', html: iconHtml, iconSize: iconSize, iconAnchor: iconAnchor });

    // Círculo de calor / zona de influência proporcional ao risco
    const radius = risk >= 75 ? 450 : (risk >= 50 ? 320 : 200);
    activeRiskCircle = L.circle([lat, lon], {
        radius: radius,
        color: isUserLocation ? '#38BDF8' : color,
        fillColor: color,
        fillOpacity: isUserLocation ? 0.22 : 0.18,
        weight: isUserLocation ? 3 : 2,
        dashArray: isUserLocation ? '4, 4' : '5, 5'
    }).addTo(map);

    // Marcador com Popup rico com os 4 Pilares
    const badgeUserHtml = isUserLocation 
        ? `<div style="display: inline-flex; align-items: center; gap: 4px; background: #0284C7; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 4px; margin-bottom: 4px;">🎯 VOCÊ ESTÁ AQUI (GPS)</div>`
        : '';

    const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 6px; min-width: 220px;">
            ${badgeUserHtml}
            <div style="font-size: 15px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">${isUserLocation ? 'Sua Localização Atual' : nome}</div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">📍 ${currentSelectedPoint.bairro}</div>
            
            <div style="background: ${color}22; border-left: 4px solid ${color}; padding: 8px 10px; border-radius: 6px; margin-bottom: 6px;">
                <div style="font-size: 14px; font-weight: 800; color: #0F172A;">Risco Preditivo: ${risk}% (${getRiskLabel(risk)})</div>
                <div style="font-size: 11px; color: #475569; margin-top: 2px;">💧 Chuva Prevista (+3h): +${analysis.forecastRainTotal.toFixed(1)} mm</div>
            </div>

            <div style="font-size: 10px; color: #475569; border-top: 1px solid #E2E8F0; padding-top: 6px; line-height: 1.5;">
                <div>⛰️ <b>Altitude:</b> ${alt}m (${altInfo.badge})</div>
                <div>🌊 <b>Rio:</b> ${riverInfo.river.split('(')[0].trim()} a ${riverInfo.distance < 1000 ? riverInfo.distance + 'm' : (riverInfo.distance / 1000).toFixed(1) + 'km'}</div>
                <div>🛡️ <b>Defesa Civil:</b> ${chronicInfo.hasRecordsWithinRadius ? `<span style="color: #DC2626; font-weight: 700;">🚨 ${chronicInfo.zoneName} (${chronicInfo.dist}m)</span>` : `<span style="color: #2563EB; font-weight: 600;">🌐 Bacia ${chronicInfo.bacia || chronicInfo.zoneName}</span>`}</div>
            </div>
        </div>
    `;

    activeMarker = L.marker([lat, lon], { icon }).addTo(map).bindPopup(popupContent);

    // Movimento suave do mapa para o ponto
    map.flyTo([lat, lon], 16, { duration: 1.5, easeLinearity: 0.25 });
}

// ─── RENDERIZAR GRÁFICO CHART.JS (TENDÊNCIA 24H + 3H) ─────────────────────────
function renderTrendChart(labels, historyData, forecastData, maxForecastRisk) {
    const canvas = document.getElementById('riskTrendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (riskTrendChart) {
        riskTrendChart.destroy();
    }

    const mainColor = getRiskColor(maxForecastRisk);

    riskTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Histórico (24h)',
                    data: historyData,
                    borderColor: '#38BDF8',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointRadius: (ctx) => (ctx.dataIndex === 23 ? 5 : 0),
                    pointBackgroundColor: '#38BDF8',
                    spanGaps: false
                },
                {
                    label: 'Previsão IA (+3h)',
                    data: forecastData,
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    borderWidth: 2.5,
                    borderDash: [5, 5],
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: '#F59E0B',
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#94A3B8', boxWidth: 12, font: { size: 10, weight: 'bold' } }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#FFFFFF',
                    bodyColor: '#E2E8F0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => ctx.raw !== null ? ` Risco: ${ctx.raw}%` : ''
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#64748B', font: { size: 9 }, maxTicksLimit: 7 }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.06)' },
                    ticks: { color: '#64748B', font: { size: 9 }, stepSize: 25, callback: (v) => `${v}%` }
                }
            }
        }
    });
}

// ─── CONFIGURAR BUSCA UNIVERSAL (GLOBAL GEOCODING + POI + ENDEREÇOS) ─────────
function setupSearchListeners() {
    const input = document.getElementById('universal-search-input');
    const dropdown = document.getElementById('universal-search-dropdown');
    const clearBtn = document.getElementById('btn-search-clear');

    if (!input) return;

    input.addEventListener('input', () => {
        const val = input.value.trim();
        clearBtn.style.display = val.length > 0 ? 'block' : 'none';
        const requestId = ++searchRequestId;
        clearTimeout(searchTimeout);

        if (val.length < 2) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            searchSuggestionResults = [];
            return;
        }

        // Atalhos de Casa e Trabalho + Base Local
        const placeResults = getPlaceSearchSuggestions(val);
        const localResults = filterLocalNeighborhoods(val);

        if (placeResults.length > 0 || localResults.length > 0) {
            renderSearchDropdown({ local: localResults, nominatim: [], places: placeResults, loading: true });
        } else {
            showSearchLoading(val);
        }

        // Debounce: aguarda o usuário parar de digitar antes de chamar a API
        searchTimeout = setTimeout(async () => {
            const nominatimResults = await searchNominatim(val);
            if (requestId !== searchRequestId || input.value.trim() !== val) return;
            renderSearchDropdown({
                local: localResults,
                nominatim: nominatimResults,
                places: placeResults,
                loading: false
            });
        }, 350);
    });

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = input.value.trim();
            if (query.length < 2) return;

            clearTimeout(searchTimeout);
            const requestId = ++searchRequestId;
            showSearchLoading(query);
            const nominatimResults = await searchNominatim(query);
            if (requestId !== searchRequestId || input.value.trim() !== query) return;

            const placeResults = getPlaceSearchSuggestions(query);
            const firstResult = placeResults[0] || nominatimResults[0] || filterLocalNeighborhoods(query)[0];
            if (firstResult) {
                if (firstResult.isPlaceConfigAction) {
                    openPlaceConfigModal(firstResult.placeType);
                } else {
                    selectSearchSuggestion(firstResult);
                }
            } else {
                showSearchEmpty();
            }
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
            input.blur();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const items = dropdown.querySelectorAll('.search-item');
            if (items.length > 0) items[0].focus();
        }
    });

    // Exibir buscas recentes ao focar no campo vazio
    input.addEventListener('focus', () => {
        if (input.value.trim().length === 0 && typeof showRecentSearches === 'function') {
            showRecentSearches();
        }
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box-wrapper')) {
            dropdown.style.display = 'none';
        }
    });
}

// ─── NORMALIZAÇÃO ÚNICA PARA BUSCA REMOTA E BASE LOCAL ───────────────────────
function normalizeText(text) {
    return String(text ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ─── FILTRO LOCAL (Base de Bairros Offline) ────────────────────────────────────
function filterLocalNeighborhoods(query) {
    const q = normalizeText(query);
    if (!q) return [];

    return SP_NEIGHBORHOODS.filter(n => {
        const nome = normalizeText(n.nome);
        const bairro = normalizeText(n.bairro);
        return nome.includes(q) || bairro.includes(q);
    });
}

function createMapLayerSwitcher(streetLayer, satelliteLayer) {
    const container = document.getElementById('map-layer-toolbar');
    if (!container) return;
    const switcher = L.DomUtil.create('div', 'map-layer-switcher', container);
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', 'Tipo de mapa');
    switcher.innerHTML = `
        <button type="button" class="map-layer-option active" data-layer="map" aria-pressed="true">🗺️ Mapa</button>
        <button type="button" class="map-layer-option" data-layer="satellite" aria-pressed="false">🛰️ Satélite</button>
    `;

    L.DomEvent.disableClickPropagation(switcher);
    L.DomEvent.disableScrollPropagation(switcher);

    switcher.querySelectorAll('.map-layer-option').forEach(button => {
        button.addEventListener('click', () => {
            const useSatellite = button.dataset.layer === 'satellite';
            if (useSatellite) {
                if (map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
                if (!map.hasLayer(satelliteLayer)) satelliteLayer.addTo(map);
            } else {
                if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
                if (!map.hasLayer(streetLayer)) streetLayer.addTo(map);
            }

            switcher.querySelectorAll('.map-layer-option').forEach(option => {
                const active = option === button;
                option.classList.toggle('active', active);
                option.setAttribute('aria-pressed', String(active));
            });
        });
    });
}

// ─── NOMINATIM SP: Endereços, números, estabelecimentos e pontos turísticos ──
async function searchNominatim(query) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) return [];

        const searchTerm = `${normalizedQuery}, Sao Paulo, SP, Brasil`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&bounded=1&viewbox=-46.826,-23.383,-46.365,-23.723&limit=5&addressdetails=1&namedetails=1&accept-language=pt-BR`;
        const res = await fetch(url, {
            headers: { 'Accept-Language': 'pt-BR, pt;q=0.9, en;q=0.8' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) return [];
        const data = await res.json();

        return data.map(item => {
            const addr = item.address || {};
            const nameDetails = item.namedetails || {};
            const nome = nameDetails['name:pt'] || nameDetails.name ||
                addr.amenity || addr.leisure || addr.tourism || addr.historic ||
                addr.shop || addr.office || addr.stadium || addr.sports_centre ||
                (addr.building && addr.building !== 'yes' ? addr.building : null) ||
                addr.road || item.display_name.split(',')[0].trim();
            const bairro = addr.suburb || addr.neighbourhood || addr.city_district ||
                addr.quarter || addr.borough || '';
            const cidade = addr.city || addr.town || addr.municipality || addr.county || '';
            const estado = addr.state || '';
            const pais = addr.country || '';
            const contextParts = [bairro, cidade, estado].filter(Boolean);
            const contexto = contextParts.length > 0 ? contextParts.slice(0, 2).join(', ') : pais;

            return {
                nome,
                bairro: contexto || pais,
                display_name: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                alt: null,
                icon: getNominatimIcon(item, addr),
                type: item.type,
                category: item.class
            };
        });
    } catch (err) {
        if (err.name !== 'AbortError') console.warn('Nominatim error:', err);
        return [];
    }
}

// ─── DETECTA ÍCONE PARA O TIPO DE RESULTADO DO NOMINATIM ─────────────────────
function getNominatimIcon(item, addr) {
    const cls = item.class || '';
    const type = item.type || '';

    if (cls === 'amenity') {
        if (['restaurant', 'fast_food', 'cafe', 'bar', 'food_court'].includes(type)) return '🍽️';
        if (['hospital', 'clinic', 'pharmacy', 'dentist'].includes(type)) return '🏥';
        if (['school', 'university', 'college', 'kindergarten'].includes(type)) return '🎓';
        if (['bank', 'atm'].includes(type)) return '🏦';
        if (['fuel', 'parking'].includes(type)) return '⛽';
        if (['place_of_worship', 'church'].includes(type)) return '⛪';
        if (['cinema', 'theatre'].includes(type)) return '🎭';
        if (['library'].includes(type)) return '📚';
        if (['police'].includes(type)) return '🚓';
        if (['fire_station'].includes(type)) return '🚒';
        if (['bus_station', 'taxi'].includes(type)) return '🚌';
        if (['marketplace', 'marketplace'].includes(type)) return '🛒';
        return '📌';
    }
    if (cls === 'tourism') {
        if (['museum', 'gallery'].includes(type)) return '🏛️';
        if (['hotel', 'hostel', 'motel'].includes(type)) return '🏨';
        if (['attraction', 'viewpoint'].includes(type)) return '🗺️';
        if (['theme_park', 'zoo', 'aquarium'].includes(type)) return '🎡';
        return '🌟';
    }
    if (cls === 'leisure') {
        if (['stadium', 'sports_centre'].includes(type)) return '🏟️';
        if (['park', 'garden'].includes(type)) return '🌳';
        if (['swimming_pool'].includes(type)) return '🏊';
        return '⚽';
    }
    if (cls === 'historic') return '🏰';
    if (cls === 'shop') return '🛍️';
    if (cls === 'railway') return '🚇';
    if (cls === 'aeroway') return '✈️';
    if (cls === 'highway') {
        if (['bus_stop'].includes(type)) return '🚌';
        return '🛣️';
    }
    if (cls === 'place') {
        if (['city', 'town', 'village'].includes(type)) return '🏙️';
        if (['suburb', 'neighbourhood'].includes(type)) return '📍';
        return '🗺️';
    }
    if (cls === 'boundary') return '🗺️';
    if (cls === 'waterway') return '🌊';
    if (addr.postcode) return '📮';
    return '📍';
}

// ─── MOSTRAR LOADING E EMPTY STATE NO DROPDOWN ────────────────────────────────
function showSearchLoading(query) {
    const dropdown = document.getElementById('universal-search-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = `
        <div class="search-status-bar loading">
            <div class="search-loading-dot"></div>
            Buscando "${escapeHtml(query)}"...
        </div>
        <div class="search-empty">⏳ Consultando base cartográfica global...</div>
    `;
    dropdown.style.display = 'block';
}

function showSearchEmpty() {
    const dropdown = document.getElementById('universal-search-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = `
        <div class="search-empty">
            📍 Local não encontrado em SP.<br>
            <span style="color:#38BDF8;">Tente adicionar o número da rua ou o nome do bairro.</span>
        </div>
    `;
    dropdown.style.display = 'block';
}

// ─── RENDERIZAR DROPDOWN UNIFICADO COM SEÇÕES ─────────────────────────────────
function renderSearchDropdown({ local = [], nominatim = [], places = [], loading = false }) {
    const dropdown = document.getElementById('universal-search-dropdown');
    if (!dropdown) return;

    const hasPlaces = places.length > 0;
    const hasLocal = local.length > 0;
    const hasNominatim = nominatim.length > 0;

    if (!hasPlaces && !hasLocal && !hasNominatim && !loading) {
        showSearchEmpty();
        return;
    }

    let html = '';

    // Status bar
    if (loading) {
        html += `<div class="search-status-bar loading"><div class="search-loading-dot"></div>Buscando na base global...</div>`;
    } else if (hasNominatim || hasLocal || hasPlaces) {
        const total = places.length + local.length + nominatim.length;
        html += `<div class="search-status-bar">🌍 ${total} resultado${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}</div>`;
    }

    // 1. Atalhos de Casa / Trabalho
    if (hasPlaces) {
        html += `<div class="search-section-label">🏠 Atalhos de Locais</div>`;
        html += places.map((item, index) => buildSearchItemHtml(item, index)).join('');
    }

    // 2. Resultados do Nominatim
    if (hasNominatim) {
        html += `<div class="search-section-label">📍 Endereços e locais em São Paulo</div>`;
        html += nominatim.map((item, index) => buildSearchItemHtml(item, places.length + index)).join('');
    }

    // 3. Resultados locais
    if (hasLocal) {
        html += `<div class="search-section-label">⭐ Pontos de Referência</div>`;
        html += local.map((item, index) => buildSearchItemHtml(item, places.length + nominatim.length + index)).join('');
    }

    searchSuggestionResults = [...places, ...nominatim, ...local];
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
    dropdown.querySelectorAll('[data-search-index]').forEach(element => {
        element.addEventListener('click', () => {
            const item = searchSuggestionResults[Number(element.dataset.searchIndex)];
            if (!item) return;
            if (item.isPlaceConfigAction) {
                dropdown.style.display = 'none';
                openPlaceConfigModal(item.placeType);
            } else {
                selectSearchSuggestion(item);
            }
        });
    });
}

// ─── CONSTRÓI HTML DE UM ITEM DO DROPDOWN ─────────────────────────────────────
function buildSearchItemHtml(item, index) {
    const safeNome = escapeHtml(item.nome);
    const safeDisplay = escapeHtml(item.display_name || `${item.nome} — ${item.bairro}`);
    const safeIcon = escapeHtml(item.icon || '📍');

    return `
    <div class="search-item" data-search-index="${index}" role="button" tabindex="0">
        <span style="font-size: 17px; flex-shrink: 0; line-height: 1;">${safeIcon}</span>
        <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: 13px; color: #FFFFFF; line-height: 1.35; word-break: break-word;">
                ${safeNome}
            </div>
            <div style="font-size: 11px; color: #94A3B8; margin-top: 3px; line-height: 1.3; word-break: break-word;">
                ${safeDisplay}
            </div>
        </div>
        <span style="font-size: 10px; color: ${item.isPlaceConfigAction ? '#F59E0B' : '#38BDF8'}; font-weight: 700; flex-shrink: 0; background: ${item.isPlaceConfigAction ? 'rgba(245,158,11,0.12)' : 'rgba(56,189,248,0.10)'}; border: 1px solid ${item.isPlaceConfigAction ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.25)'}; padding: 3px 8px; border-radius: 6px; margin-left: 8px; white-space: nowrap;">${item.isPlaceConfigAction ? 'CADASTRAR' : 'IR'}</span>
    </div>
    `;
}

function selectSearchSuggestion(item) {
    selectSearchResult(item.lat, item.lon, item.nome, item.bairro, item.alt ?? null, item.display_name, item.icon);
}

// ─── SELECIONAR RESULTADO E ANALISAR RISCO DO LOCAL ───────────────────────────
function selectSearchResult(lat, lon, nome, bairro, alt = null, fullAddress = null, icon = '📍') {
    hasActiveUserSelection = true;
    const input = document.getElementById('universal-search-input');
    if (input) {
        input.value = nome;
        input.blur();
    }
    const dropdown = document.getElementById('universal-search-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
    }
    const clearBtn = document.getElementById('btn-search-clear');
    if (clearBtn) clearBtn.style.display = 'block';

    // Move o mapa imediatamente; clima, altitude e marcador são atualizados em seguida.
    if (map) map.flyTo([Number(lat), Number(lon)], 16, { duration: 1.2, easeLinearity: 0.25 });

    // Aciona o motor de análise completo: clima + elevação + risco
    analyzePoint(lat, lon, nome, bairro, alt, fullAddress);

    // ── Registra no Histórico de Buscas (se o usuário estiver logado) ──
    if (typeof salvarBuscaHistorico === 'function') {
        salvarBuscaHistorico({
            nome,
            lat,
            lon,
            bairro,
            display_name: fullAddress || `${nome} — ${bairro}`
        });
    }
}

function clearSearchInput() {
    searchRequestId++;
    clearTimeout(searchTimeout);
    searchSuggestionResults = [];
    const input = document.getElementById('universal-search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-search-clear');
    if (clearBtn) clearBtn.style.display = 'none';
    const dropdown = document.getElementById('universal-search-dropdown');
    if (dropdown) { dropdown.style.display = 'none'; dropdown.innerHTML = ''; }
}

// ─── REVERSE GEOCODING PRECISO (COORDENADA -> ENDEREÇO / BAIRRO COMPLETO) ────
async function reverseGeocode(lat, lon) {
    const key = `geo_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    if (geocodeCache[key]) return geocodeCache[key];

    // Se estiver extremamente próximo (< 40 metros) de um marco de referência conhecido
    for (const n of SP_NEIGHBORHOODS) {
        const d = Math.hypot(n.lat - lat, n.lon - lon);
        if (d < 0.0004) {
            const res = { nome: n.nome, bairro: n.bairro, alt: n.alt };
            geocodeCache[key] = res;
            return res;
        }
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const res = await fetch(url, { 
            headers: { 'Accept-Language': 'pt-BR, pt' },
            signal: controller.signal 
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};

            // 1. Identifica o nome principal e específico do local
            let nomePrincipal = "";
            if (addr.amenity) nomePrincipal = addr.amenity;
            else if (addr.leisure) nomePrincipal = addr.leisure;
            else if (addr.tourism) nomePrincipal = addr.tourism;
            else if (addr.building && addr.building !== "yes") nomePrincipal = addr.building;
            else if (addr.historic) nomePrincipal = addr.historic;
            else if (addr.bridge) nomePrincipal = addr.bridge;
            else if (addr.road) {
                nomePrincipal = addr.road;
                if (addr.house_number) nomePrincipal += `, ${addr.house_number}`;
            } else if (addr.pedestrian || addr.footway || addr.path || addr.square) {
                nomePrincipal = addr.pedestrian || addr.footway || addr.path || addr.square;
            } else if (data.display_name) {
                nomePrincipal = data.display_name.split(',')[0].trim();
            } else {
                nomePrincipal = `Local (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
            }

            // 2. Identifica Bairro, Distrito e Cidade
            let bairroNome = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.borough;
            const cidade = addr.city || addr.town || addr.municipality || "São Paulo";

            if (!bairroNome) {
                const parts = (data.display_name || '').split(',').map(s => s.trim());
                if (parts.length > 2) bairroNome = parts[1];
                else bairroNome = "São Paulo";
            }

            const bairroFormatado = bairroNome !== cidade ? `${bairroNome} • ${cidade}` : cidade;

            const resultado = {
                nome: nomePrincipal,
                bairro: bairroFormatado,
                display_name: data.display_name || `${nomePrincipal}, ${bairroFormatado}`
            };

            geocodeCache[key] = resultado;
            return resultado;
        }
    } catch (e) {
        console.warn("Falha no reverse geocoding do Nominatim, usando fallback:", e);
    }

    // Fallback: Procura o bairro mais próximo da base local
    let closest = null;
    let minDist = 999999;
    for (const n of SP_NEIGHBORHOODS) {
        const d = Math.hypot(n.lat - lat, n.lon - lon);
        if (d < minDist) { minDist = d; closest = n; }
    }

    if (closest && minDist < 0.015) {
        return { 
            nome: `Próximo a ${closest.nome}`, 
            bairro: `${closest.bairro} • São Paulo`, 
            alt: closest.alt 
        };
    }

    return { 
        nome: `Ponto (${lat.toFixed(4)}, ${lon.toFixed(4)})`, 
        bairro: "São Paulo - SP", 
        alt: 740 
    };
}

// ─── SIMULADOR DE CENÁRIOS FECART ─────────────────────────────────────────────
function simulateScenario(scenario) {
    simulatedScenario = scenario;
    const badge = document.getElementById('chart-status-badge');

    if (scenario === 'tempestade') {
        badge.textContent = "⚡ Simulação: Tempestade (+45mm)";
        badge.style.color = "#EF4444";
        badge.style.background = "rgba(239, 68, 68, 0.15)";
    } else if (scenario === 'moderada') {
        badge.textContent = "🌧️ Simulação: Chuva Moderada (+8mm)";
        badge.style.color = "#F59E0B";
        badge.style.background = "rgba(245, 158, 11, 0.15)";
    } else {
        badge.textContent = "● Em Tempo Real (Open-Meteo)";
        badge.style.color = "#10B981";
        badge.style.background = "rgba(16, 185, 129, 0.15)";
    }

    analyzePoint(currentSelectedPoint.lat, currentSelectedPoint.lon, currentSelectedPoint.nome, currentSelectedPoint.bairro, currentSelectedPoint.alt);
}

// ─── LIMPEZA DE CAMADAS DO MODO EXPLORAR ─────────────────────────────────────
function clearExplorationLayers() {
    if (activeMarker && map) {
        try { map.removeLayer(activeMarker); } catch (_) {}
        activeMarker = null;
    }
    if (activeRiskCircle && map) {
        try { map.removeLayer(activeRiskCircle); } catch (_) {}
        activeRiskCircle = null;
    }
    // Remove qualquer outro círculo ou camada remanescente do modo de exploração
    if (map) {
        map.eachLayer(layer => {
            if (layer instanceof L.Circle) {
                try { map.removeLayer(layer); } catch (_) {}
            }
        });
    }
}

// ─── CONTROLE DE ABAS DO PAINEL ───────────────────────────────────────────────
function switchDashboardTab(tab) {
    const tabExplorar = document.getElementById('tab-btn-explorar');
    const tabRota = document.getElementById('tab-btn-rota');
    const panelExplorar = document.getElementById('panel-explorar');
    const panelRota = document.getElementById('panel-rota');

    if (tab === 'explorar') {
        tabExplorar.className = 'dash-tab active-explorar';
        tabRota.className = 'dash-tab';
        panelExplorar.style.display = 'flex';
        panelRota.style.display = 'none';

        // 1. Ao mudar para 'Explorar Bairro / Região':
        // Remove do mapa a linha da rota (polyline) e os marcadores de Origem/Destino
        clearCurrentRoute();

        // Restaura o marcador e círculo de exploração para o ponto selecionado se não estiverem no mapa
        if (!activeMarker && currentSelectedPoint && map) {
            analyzePoint(
                currentSelectedPoint.lat,
                currentSelectedPoint.lon,
                currentSelectedPoint.nome,
                currentSelectedPoint.bairro,
                currentSelectedPoint.alt
            );
        }
    } else {
        tabRota.className = 'dash-tab active-rota';
        tabExplorar.className = 'dash-tab';
        panelRota.style.display = 'flex';
        panelExplorar.style.display = 'none';

        // 2. Ao mudar para 'Checar Trajeto':
        // Remove imediatamente do mapa o círculo de raio (500m) e o marcador central pertencentes ao modo 'Explorar Bairro/Região'
        clearExplorationLayers();
    }

    // Garante que o mapa do Leaflet redimensione adequadamente ao alternar abas
    setTimeout(() => {
        if (map) {
            map.invalidateSize();
        }
    }, 150);
}

// ─── CONTROLE DO BOTTOM SHEET MOBILE (PAINEL DESLIZANTE) ─────────────────────
function toggleMobileSheet() {
    const sidebar = document.getElementById('dash-sidebar-panel');
    const icon = document.getElementById('sheet-arrow-icon');
    if (!sidebar) return;

    if (sidebar.classList.contains('collapsed')) {
        // Estava recolhido -> abre normal
        sidebar.classList.remove('collapsed');
        sidebar.classList.remove('expanded');
        if (icon) icon.textContent = '▲';
    } else if (sidebar.classList.contains('expanded')) {
        // Estava expandido -> recolhe
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
        if (icon) icon.textContent = '▲';
    } else {
        // Estava padrão -> expande para tela cheia
        sidebar.classList.add('expanded');
        if (icon) icon.textContent = '▼';
    }

    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 320);
}

function setMobileSheetState(state) {
    const sidebar = document.getElementById('dash-sidebar-panel');
    const icon = document.getElementById('sheet-arrow-icon');
    if (!sidebar) return;

    sidebar.classList.remove('collapsed', 'expanded');
    if (state === 'collapsed') {
        sidebar.classList.add('collapsed');
        if (icon) icon.textContent = '▲';
    } else if (state === 'expanded') {
        sidebar.classList.add('expanded');
        if (icon) icon.textContent = '▼';
    } else {
        if (icon) icon.textContent = '▲';
    }

    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 320);
}

// ─── AUTOCOMPLETE DA ABA DE ROTAS (UNIFICADO COM ABA EXPLORAR) ───────────────
const routeSearchTimeouts = {};
const routeSearchRequestIds = { 'route-origem': 0, 'route-destino': 0 };
const routeSearchSuggestions = { 'route-origem': [], 'route-destino': [] };
const selectedRoutePoints = {
    'route-origem': null,
    'route-destino': null,
    'route-origin': null,
    'route-destination': null
};

function setupRouteAutocomplete() {
    const setupField = (inputId, dropdownId, fieldType) => {
        const input = document.getElementById(inputId);
        const dd = document.getElementById(dropdownId);
        if (!input || !dd) return;

        input.addEventListener('input', () => {
            const val = input.value.trim();
            // Se o usuário editou manualmente o campo após selecionar um atalho/endereço, limpa o cache e dataset
            if (input.dataset.selectedNome && input.value !== input.dataset.selectedNome) {
                delete input.dataset.lat;
                delete input.dataset.lon;
                delete input.dataset.lng;
                delete input.dataset.cleanAddress;
                delete input.dataset.placeType;
                delete input.dataset.selectedNome;
                selectedRoutePoints[inputId] = null;
            }
            routeSearchRequestIds[inputId] = (routeSearchRequestIds[inputId] || 0) + 1;
            const requestId = routeSearchRequestIds[inputId];
            clearTimeout(routeSearchTimeouts[inputId]);

            if (val.length < 2) {
                dd.style.display = 'none';
                dd.innerHTML = '';
                routeSearchSuggestions[inputId] = [];
                return;
            }

            const normVal = normalizeText(val);

            // 1. Atalhos de Casa e Trabalho + Minha Localização
            const placeResults = getPlaceSearchSuggestions(val);
            const hasGpsTrigger = normVal.includes('minh') || normVal.includes('loca') || normVal.includes('gps') || normVal.includes('atual');
            const localResults = filterLocalNeighborhoods(val);

            // Exibe feedback imediato com atalhos, base local e loading da base global
            if (placeResults.length > 0 || localResults.length > 0 || hasGpsTrigger) {
                renderRouteSearchDropdown(inputId, dropdownId, fieldType, {
                    local: localResults,
                    nominatim: [],
                    places: placeResults,
                    loading: true,
                    includeGps: hasGpsTrigger
                });
            } else {
                showRouteSearchLoading(dropdownId, val);
            }

            // 2. Debounce para consulta na base cartográfica global (Nominatim)
            routeSearchTimeouts[inputId] = setTimeout(async () => {
                const nominatimResults = await searchNominatim(val);
                if (requestId !== routeSearchRequestIds[inputId] || input.value.trim() !== val) return;
                renderRouteSearchDropdown(inputId, dropdownId, fieldType, {
                    local: localResults,
                    nominatim: nominatimResults,
                    places: placeResults,
                    loading: false,
                    includeGps: hasGpsTrigger
                });
            }, 350);
        });

        // Tecla Enter seleciona o primeiro item automaticamente
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = input.value.trim();
                if (query.length < 2) return;

                clearTimeout(routeSearchTimeouts[inputId]);
                const requestId = ++routeSearchRequestIds[inputId];
                showRouteSearchLoading(dropdownId, query);
                const nominatimResults = await searchNominatim(query);
                if (requestId !== routeSearchRequestIds[inputId] || input.value.trim() !== query) return;

                const placeResults = getPlaceSearchSuggestions(query);
                const firstResult = placeResults[0] || nominatimResults[0] || filterLocalNeighborhoods(query)[0];
                if (firstResult) {
                    if (firstResult.isPlaceConfigAction) {
                        openPlaceConfigModal(firstResult.placeType);
                    } else {
                        selectRouteItem(inputId, dropdownId, fieldType, firstResult);
                    }
                } else {
                    showRouteSearchEmpty(dropdownId);
                }
            } else if (e.key === 'Escape') {
                dd.style.display = 'none';
                input.blur();
            }
        });
    };

    // Suporte aos IDs padrão e aliases
    setupField('route-origem', 'route-origem-dropdown', 'origin');
    setupField('route-destino', 'route-destino-dropdown', 'destination');

    const originAlt = document.getElementById('route-origin');
    if (originAlt) setupField('route-origin', 'route-origin-dropdown', 'origin');
    const destAlt = document.getElementById('route-destination');
    if (destAlt) setupField('route-destination', 'route-destination-dropdown', 'destination');

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.route-field')) {
            const ddOrigem = document.getElementById('route-origem-dropdown');
            const ddDestino = document.getElementById('route-destino-dropdown');
            if (ddOrigem) ddOrigem.style.display = 'none';
            if (ddDestino) ddDestino.style.display = 'none';
        }
    });
}

function positionRouteDropdown(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;
    const rect = input.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = (rect.bottom + 6) + 'px';
    dropdown.style.width = rect.width + 'px';
}

function showRouteSearchLoading(dropdownId, query) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    dropdown.innerHTML = `
        <div class="search-status-bar loading">
            <div class="search-loading-dot"></div>
            Buscando "${escapeHtml(query)}"...
        </div>
        <div class="search-empty">⏳ 🔵 BUSCANDO NA BASE GLOBAL...</div>
    `;
    // Mapear dropdownId -> inputId
    const inputId = dropdownId.replace('-dropdown', '');
    positionRouteDropdown(inputId, dropdownId);
    dropdown.style.display = 'block';
}

function showRouteSearchEmpty(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    dropdown.innerHTML = `
        <div class="search-empty">
            📍 Local não encontrado em SP.<br>
            <span style="color:#38BDF8;">Tente digitar o nome da rua, número ou bairro.</span>
        </div>
    `;
    dropdown.style.display = 'block';
}

function renderRouteSearchDropdown(inputId, dropdownId, fieldType, { local = [], nominatim = [], places = [], loading = false, includeGps = false }) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const hasPlaces = places.length > 0;
    const hasLocal = local.length > 0;
    const hasNominatim = nominatim.length > 0;

    if (!hasPlaces && !hasLocal && !hasNominatim && !includeGps && !loading) {
        showRouteSearchEmpty(dropdownId);
        return;
    }

    let html = '';

    // Status bar com indicador de carregamento
    if (loading) {
        html += `<div class="search-status-bar loading"><div class="search-loading-dot"></div>🔵 BUSCANDO NA BASE GLOBAL...</div>`;
    } else if (hasNominatim || hasLocal) {
        const total = local.length + nominatim.length;
        html += `<div class="search-status-bar">🌍 ${total} resultado${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}</div>`;
    }

    // Atalhos de Casa e Trabalho no Trajeto
    if (hasPlaces) {
        html += `<div class="search-section-label">🏠 Atalhos de Locais</div>`;
        html += places.map((item, index) => buildRouteSearchItemHtml(item, index, fieldType)).join('');
    }

    // Minha Localização
    if (includeGps) {
        html += `
            <div class="search-item" data-action="gps">
                <span style="font-size: 17px; flex-shrink: 0; line-height: 1;">🎯</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 13px; color: #38BDF8; line-height: 1.35;">
                        Minha Localização Atual
                    </div>
                    <div style="font-size: 11px; color: #94A3B8; margin-top: 3px;">
                        Coordenadas via GPS do navegador
                    </div>
                </div>
                <span style="font-size: 10px; color: #38BDF8; font-weight: 700; flex-shrink: 0; background: rgba(56,189,248,0.10); border: 1px solid rgba(56,189,248,0.25); padding: 3px 8px; border-radius: 6px; margin-left: 8px;">USAR</span>
            </div>
        `;
    }

    // Resultados do Nominatim formatados no mesmo padrão
    if (hasNominatim) {
        html += `<div class="search-section-label">📍 Endereços e locais em São Paulo</div>`;
        html += nominatim.map((item, index) => buildRouteSearchItemHtml(item, index, fieldType)).join('');
    }

    // Resultados locais
    if (hasLocal) {
        html += `<div class="search-section-label">⭐ Pontos de Referência</div>`;
        html += local.map((item, index) => buildRouteSearchItemHtml(item, nominatim.length + index, fieldType)).join('');
    }

    routeSearchSuggestions[inputId] = [...places, ...nominatim, ...local];
    dropdown.innerHTML = html;
    positionRouteDropdown(inputId, dropdownId);
    dropdown.style.display = 'block';

    // Eventos de clique
    dropdown.querySelectorAll('[data-action="gps"]').forEach(el => {
        el.addEventListener('click', () => {
            selectMyLocationForField(inputId, dropdownId);
        });
    });

    dropdown.querySelectorAll('[data-route-index]').forEach(element => {
        element.addEventListener('click', () => {
            const item = routeSearchSuggestions[inputId][Number(element.dataset.routeIndex)];
            if (!item) return;
            if (item.isPlaceConfigAction) {
                dropdown.style.display = 'none';
                openPlaceConfigModal(item.placeType);
            } else {
                selectRouteItem(inputId, dropdownId, fieldType, item);
            }
        });
    });
}

function buildRouteSearchItemHtml(item, index, fieldType) {
    const safeNome = escapeHtml(item.nome);
    const safeDisplay = escapeHtml(item.display_name || `${item.nome} — ${item.bairro}`);
    const safeIcon = escapeHtml(item.icon || (fieldType === 'origin' ? '🚀' : '🏁'));
    const actionLabel = item.isPlaceConfigAction ? 'CADASTRAR' : (fieldType === 'origin' ? 'PARTIDA' : 'DESTINO');
    const actionColor = item.isPlaceConfigAction ? '#F59E0B' : (fieldType === 'origin' ? '#10B981' : '#EF4444');

    return `
    <div class="search-item" data-route-index="${index}" role="button" tabindex="0">
        <span style="font-size: 17px; flex-shrink: 0; line-height: 1;">${safeIcon}</span>
        <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: 13px; color: #FFFFFF; line-height: 1.35; word-break: break-word;">
                ${safeNome}
            </div>
            <div style="font-size: 11px; color: #94A3B8; margin-top: 3px; line-height: 1.3; word-break: break-word;">
                ${safeDisplay}
            </div>
        </div>
        <span style="font-size: 10px; color: ${actionColor}; font-weight: 700; flex-shrink: 0; background: ${actionColor}22; border: 1px solid ${actionColor}55; padding: 3px 8px; border-radius: 6px; margin-left: 8px; white-space: nowrap;">
            ${actionLabel}
        </span>
    </div>
    `;
}

function selectRouteItem(inputId, dropdownId, fieldType, item) {
    const input = document.getElementById(inputId);
    const lat = Number(item.lat);
    const lon = Number(item.lon ?? item.lng);
    const cleanAddress = (
        item.cleanAddress ||
        item.rawNome ||
        (item.display_name ? item.display_name.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '').trim() : '') ||
        item.nome ||
        ''
    ).replace(/^(sua\s+casa|seu\s+trabalho|casa|trabalho)\s*[-–—:]\s*/i, '').trim();

    if (input) {
        // Mantém a formatação amigável no input visível (ex: "🏠 Sua Casa - ...")
        input.value = item.nome;
        if (!isNaN(lat) && !isNaN(lon)) {
            input.dataset.lat = String(lat);
            input.dataset.lon = String(lon);
            input.dataset.lng = String(lon);
            input.dataset.cleanAddress = cleanAddress;
            input.dataset.placeType = item.placeType || '';
            input.dataset.selectedNome = item.nome;
        }
        input.blur();
    }

    if (!isNaN(lat) && !isNaN(lon)) {
        selectedRoutePoints[inputId] = {
            lat,
            lon,
            lng: lon,
            nome: item.nome,
            cleanAddress: cleanAddress,
            placeType: item.placeType || null,
            isSavedPlace: !!item.isSavedPlace
        };
    }

    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
    }

    if (isNaN(lat) || isNaN(lon)) return;

    // ── Integração com o Mapa: Insere o marcador correspondente ─────────────
    if (fieldType === 'origin') {
        if (routeStartMarker && map) {
            try { map.removeLayer(routeStartMarker); } catch (_) {}
            routeStartMarker = null;
        }

        const originIcon = L.divIcon({
            className: 'custom-route-marker marker-origin',
            iconSize: [40, 50],
            iconAnchor: [20, 50],
            popupAnchor: [0, -48],
            tooltipAnchor: [0, -48],
            html: `
                <div style="position: relative; width: 40px; height: 50px; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 10px rgba(16, 185, 129, 0.65));">
                    <div style="width: 38px; height: 38px; border-radius: 50% 50% 50% 0; background: linear-gradient(135deg, #10B981 0%, #059669 100%); transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2.5px solid #FFFFFF; box-shadow: 0 0 14px rgba(16, 185, 129, 0.85);">
                        <span style="transform: rotate(45deg); font-size: 18px; line-height: 1; user-select: none;">🚀</span>
                    </div>
                    <div style="width: 12px; height: 5px; background: rgba(0, 0, 0, 0.4); border-radius: 50%; filter: blur(1.5px); margin-top: 5px;"></div>
                </div>
            `
        });

        routeStartMarker = L.marker([lat, lon], { icon: originIcon, zIndexOffset: 950 })
            .addTo(map)
            .bindTooltip("Origem / Ponto de Partida", { className: 'route-marker-tooltip', direction: 'top', offset: [0, -48], opacity: 1.0 })
            .bindPopup(`
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; line-height: 1.4; min-width: 180px;">
                    <div style="font-weight: 800; color: #10B981; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span>🚀</span> Origem / Ponto de Partida
                    </div>
                    <div style="color: #334155; font-weight: 600;">${escapeHtml(item.nome)}</div>
                </div>
            `);

        if (!routeLayers.includes(routeStartMarker)) {
            routeLayers.push(routeStartMarker);
        }
    } else {
        if (routeEndMarker && map) {
            try { map.removeLayer(routeEndMarker); } catch (_) {}
            routeEndMarker = null;
        }

        const destinationIcon = L.divIcon({
            className: 'custom-route-marker marker-destination',
            iconSize: [40, 50],
            iconAnchor: [20, 50],
            popupAnchor: [0, -48],
            tooltipAnchor: [0, -48],
            html: `
                <div style="position: relative; width: 40px; height: 50px; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 10px rgba(239, 68, 68, 0.65));">
                    <div style="width: 38px; height: 38px; border-radius: 50% 50% 50% 0; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2.5px solid #FFFFFF; box-shadow: 0 0 14px rgba(239, 68, 68, 0.85);">
                        <span style="transform: rotate(45deg); font-size: 18px; line-height: 1; user-select: none;">🏁</span>
                    </div>
                    <div style="width: 12px; height: 5px; background: rgba(0, 0, 0, 0.4); border-radius: 50%; filter: blur(1.5px); margin-top: 5px;"></div>
                </div>
            `
        });

        routeEndMarker = L.marker([lat, lon], { icon: destinationIcon, zIndexOffset: 950 })
            .addTo(map)
            .bindTooltip("Destino / Chegada", { className: 'route-marker-tooltip', direction: 'top', offset: [0, -48], opacity: 1.0 })
            .bindPopup(`
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; line-height: 1.4; min-width: 180px;">
                    <div style="font-weight: 800; color: #EF4444; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span>🏁</span> Destino / Chegada
                    </div>
                    <div style="color: #334155; font-weight: 600;">${escapeHtml(item.nome)}</div>
                </div>
            `);

        if (!routeLayers.includes(routeEndMarker)) {
            routeLayers.push(routeEndMarker);
        }
    }

    // Se ambos os marcadores já foram colocados, ajusta os limites do mapa para enquadrar ambos
    if (routeStartMarker && routeEndMarker) {
        const bounds = L.latLngBounds([routeStartMarker.getLatLng(), routeEndMarker.getLatLng()]);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else {
        map.flyTo([lat, lon], 15, { duration: 1.0 });
    }

    // ── Atualização Dinâmica: Busca dados do clima e força renderização dos cards de chuva instantaneamente ──
    updateRouteWeatherCards(lat, lon, item.nome);
}

async function updateRouteWeatherCards(lat, lon, nome = '') {
    try {
        const weatherData = await fetchWeatherData(lat, lon);
        if (weatherData) {
            const analysis = processRiskAnalysis(weatherData, 745, lat, lon);
            const elCurrent = document.getElementById('kpi-rain-current');
            const elAcc24 = document.getElementById('kpi-rain-acc24');
            const elForecast = document.getElementById('kpi-rain-forecast-sub');
            if (elCurrent) elCurrent.textContent = `${analysis.dailyRainTotal.toFixed(1)} mm`;
            if (elAcc24) elAcc24.textContent = `${analysis.acc24h.toFixed(1)} mm`;
            if (elForecast) elForecast.textContent = `Chance máxima hoje: ${Math.round(analysis.dailyRainChance)}%`;
        }
    } catch (e) {
        console.warn("[FloodGuard] Erro ao atualizar cards de chuva da rota:", e);
    }
}

function selectMyLocationForField(inputId, dropdownId) {
    const dd = document.getElementById(dropdownId);
    if (dd) dd.style.display = 'none';
    useCurrentLocationForRoute(inputId);
}

function useCurrentLocationForRoute(fieldId = 'route-origem') {
    const input = document.getElementById(fieldId);
    const fieldType = (fieldId.includes('dest') || fieldId.includes('destination')) ? 'destination' : 'origin';
    const dropdownId = `${fieldId}-dropdown`;

    if (!navigator.geolocation) {
        alert("Geolocalização não suportada neste navegador.");
        return;
    }

    if (currentLocationCoords && currentLocationCoords.lat && (currentLocationCoords.lng || currentLocationCoords.lon)) {
        const lat = currentLocationCoords.lat;
        const lon = currentLocationCoords.lng ?? currentLocationCoords.lon;
        selectRouteItem(fieldId, dropdownId, fieldType, {
            nome: `Minha Localização (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
            lat,
            lon,
            display_name: 'Posição atual detectada via GPS do navegador',
            icon: '🎯'
        });
        return;
    }

    if (input) input.value = "Minha Localização (Obtendo GPS...)";

    navigator.geolocation.getCurrentPosition(
        pos => {
            currentLocationCoords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                lon: pos.coords.longitude
            };
            selectRouteItem(fieldId, dropdownId, fieldType, {
                nome: `Minha Localização (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                display_name: 'Posição atual detectada via GPS do navegador',
                icon: '🎯'
            });
        },
        err => {
            console.warn("Falha ao obter coordenadas GPS:", err);
            if (input && input.value.includes("Obtendo")) {
                input.value = "Minha Localização";
            }
            alert("Não foi possível obter sua localização exata pelo GPS. Verifique se as permissões de localização estão habilitadas no navegador.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
}

function getBrowserLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => {
                currentLocationCoords = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    lon: pos.coords.longitude
                };
                resolve(currentLocationCoords);
            },
            err => {
                console.warn("Falha ao obter localização do navegador:", err);
                resolve(null);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    });
}

function isMyLocationText(str) {
    if (!str || typeof str !== 'string') return false;
    const normalized = normalizeText(str);
    return normalized.includes('minha localizacao') ||
           normalized.includes('localizacao atual') ||
           normalized.includes('meu local') ||
           normalized.includes('minha posicao');
}

// ─── CÁLCULO DE RISCO DE ROTA ──────────────────────────────────────────────────
async function calculateRouteRisk() {
    const originInput = document.getElementById('route-origem') || document.getElementById('route-origin');
    const destInput = document.getElementById('route-destino') || document.getElementById('route-destination');
    const origemVal = (originInput?.value || '').trim();
    const destinoVal = (destInput?.value || '').trim();

    if (!origemVal || !destinoVal) {
        alert("Preencha ponto de partida e destino!");
        return;
    }

    // Reset ao Reiniciar Trajeto: remove qualquer círculo ou marcador avulso remanescente
    clearExplorationLayers();
    clearCurrentRoute();
    setRouteStatus('loading', 'Calculando a rota pelas ruas e analisando os riscos...');

    const [origem, destino] = await Promise.all([
        resolveLocation(origemVal, originInput?.id || 'route-origem'),
        resolveLocation(destinoVal, destInput?.id || 'route-destino')
    ]);

    if (!origem || !destino) {
        if (!origem && isMyLocationText(origemVal)) {
            setRouteStatus('error', 'Não foi possível obter as coordenadas GPS para o ponto de partida ("Minha Localização"). Clique no botão 🧭 ao lado do campo ou ative o GPS no navegador.');
        } else if (!destino && isMyLocationText(destinoVal)) {
            setRouteStatus('error', 'Não foi possível obter as coordenadas GPS para o destino ("Minha Localização"). Ative a permissão de GPS no seu navegador.');
        } else {
            setRouteStatus('error', 'Não foi possível localizar um dos endereços informados. Confira os dados e tente novamente.');
        }
        return;
    }

    // Garante propriedades limpas [lat, lng] e [lat, lon]
    origem.lon = origem.lon ?? origem.lng;
    origem.lng = origem.lng ?? origem.lon;
    destino.lon = destino.lon ?? destino.lng;
    destino.lng = destino.lng ?? destino.lon;

    await processRouteTrajectory(origem, destino);
}

async function runFecapDemoRoute() {
    switchDashboardTab('rota');
    const originInput = document.getElementById('route-origem') || document.getElementById('route-origin');
    const destInput = document.getElementById('route-destino') || document.getElementById('route-destination');
    if (originInput) originInput.value = "FECAP — Campus Liberdade";
    if (destInput) destInput.value = "Viaduto do Chá / Anhangabaú";

    const origem = { lat: -23.5574, lon: -46.6367, lng: -46.6367, nome: "FECAP — Campus Liberdade" };
    const destino = { lat: -23.5475, lon: -46.6378, lng: -46.6378, nome: "Viaduto do Chá / Anhangabaú" };
    if (originInput) selectedRoutePoints[originInput.id] = origem;
    if (destInput) selectedRoutePoints[destInput.id] = destino;

    clearExplorationLayers();
    clearCurrentRoute();
    setRouteStatus('loading', 'Calculando a rota de demonstração pelas ruas...');
    await processRouteTrajectory(origem, destino);
}

async function resolveLocation(query, fieldId = null) {
    if (!query || typeof query !== 'string') return null;
    const trimmed = query.trim();
    if (!trimmed) return null;

    // Helper: remove emojis e símbolos de qualquer string
    const stripEmojis = (str) => {
        return String(str || '')
            .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // 1. PRIORIDADE MÁXIMA: Coordenadas salvas no objeto cacheado ou dataset do campo
    if (fieldId) {
        const cached = selectedRoutePoints[fieldId];
        const inputEl = document.getElementById(fieldId);
        if (cached && !isNaN(Number(cached.lat)) && !isNaN(Number(cached.lon))) {
            const cleanName = cached.cleanAddress || stripEmojis(cached.nome) || trimmed;
            return {
                lat: Number(cached.lat),
                lon: Number(cached.lon),
                lng: Number(cached.lon),
                nome: cleanName,
                rawNome: cleanName
            };
        }
        if (inputEl && inputEl.dataset.lat && inputEl.dataset.lon) {
            const lat = parseFloat(inputEl.dataset.lat);
            const lon = parseFloat(inputEl.dataset.lon);
            if (!isNaN(lat) && !isNaN(lon)) {
                const cleanName = inputEl.dataset.cleanAddress || stripEmojis(inputEl.dataset.selectedNome) || trimmed;
                return {
                    lat,
                    lon,
                    lng: lon,
                    nome: cleanName,
                    rawNome: cleanName
                };
            }
        }
    }

    // Se fieldId não foi fornecido ou não encontrou, verifica se algum input de rota coincide com o texto
    const candidateInputIds = ['route-origem', 'route-destino', 'route-origin', 'route-destination'];
    for (const cid of candidateInputIds) {
        const inputEl = document.getElementById(cid);
        if (inputEl && inputEl.value.trim() === trimmed) {
            const cached = selectedRoutePoints[cid];
            if (cached && !isNaN(Number(cached.lat)) && !isNaN(Number(cached.lon))) {
                const cleanName = cached.cleanAddress || stripEmojis(cached.nome) || trimmed;
                return {
                    lat: Number(cached.lat),
                    lon: Number(cached.lon),
                    lng: Number(cached.lon),
                    nome: cleanName,
                    rawNome: cleanName
                };
            }
            if (inputEl.dataset.lat && inputEl.dataset.lon) {
                const lat = parseFloat(inputEl.dataset.lat);
                const lon = parseFloat(inputEl.dataset.lon);
                if (!isNaN(lat) && !isNaN(lon)) {
                    const cleanName = inputEl.dataset.cleanAddress || stripEmojis(inputEl.dataset.selectedNome) || trimmed;
                    return {
                        lat,
                        lon,
                        lng: lon,
                        nome: cleanName,
                        rawNome: cleanName
                    };
                }
            }
        }
    }

    // 2. ATALHOS DE CASA E TRABALHO: Extração direta das coordenadas do perfil (getUserPlace)
    // Evita refazer geocoding e resolve instantaneamente se o usuário digitou ou selecionou Casa/Trabalho
    const normalizedQuery = normalizeText(trimmed);
    const hasHomeKeyword = normalizedQuery.includes('casa') || trimmed.includes('🏠');
    const hasWorkKeyword = normalizedQuery.includes('trabalh') || normalizedQuery.includes('trampo') || normalizedQuery.includes('servico') || trimmed.includes('💼');

    if (hasHomeKeyword) {
        const home = typeof getUserPlace === 'function' ? getUserPlace('home') : null;
        if (home && !isNaN(Number(home.lat)) && !isNaN(Number(home.lon))) {
            const cleanName = home.address || home.nome || 'Casa';
            return {
                lat: Number(home.lat),
                lon: Number(home.lon),
                lng: Number(home.lon),
                nome: cleanName,
                rawNome: cleanName
            };
        }
    }

    if (hasWorkKeyword) {
        const work = typeof getUserPlace === 'function' ? getUserPlace('work') : null;
        if (work && !isNaN(Number(work.lat)) && !isNaN(Number(work.lon))) {
            const cleanName = work.address || work.nome || 'Trabalho';
            return {
                lat: Number(work.lat),
                lon: Number(work.lon),
                lng: Number(work.lon),
                nome: cleanName,
                rawNome: cleanName
            };
        }
    }

    // 3. Validação Inteligente: Verifica se contém padrão de coordenadas explícito (lat, lng)
    const coordPattern = /(-?\d{1,2}\.\d+)[,\s/]+(-?\d{1,3}\.\d+)/;
    const coordMatch = trimmed.match(coordPattern);
    if (coordMatch) {
        const parsedLat = parseFloat(coordMatch[1]);
        const parsedLng = parseFloat(coordMatch[2]);
        if (!isNaN(parsedLat) && !isNaN(parsedLng) && Math.abs(parsedLat) <= 90 && Math.abs(parsedLng) <= 180) {
            return {
                lat: parsedLat,
                lng: parsedLng,
                lon: parsedLng,
                nome: `Coordenadas (${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)})`
            };
        }
    }

    // 4. Opção 'Minha Localização' (GPS do navegador)
    const isMinhaLoc = isMyLocationText(trimmed);
    if (isMinhaLoc) {
        if (currentLocationCoords && currentLocationCoords.lat && (currentLocationCoords.lng || currentLocationCoords.lon)) {
            const lng = currentLocationCoords.lng ?? currentLocationCoords.lon;
            return {
                lat: currentLocationCoords.lat,
                lng: lng,
                lon: lng,
                nome: 'Minha Localização'
            };
        }

        const gpsCoords = await getBrowserLocation();
        if (gpsCoords && gpsCoords.lat && (gpsCoords.lng || gpsCoords.lon)) {
            const lng = gpsCoords.lng ?? gpsCoords.lon;
            return {
                lat: gpsCoords.lat,
                lng: lng,
                lon: lng,
                nome: 'Minha Localização'
            };
        }

        return null;
    }

    // 5. Busca na base local de bairros e pontos conhecidos de SP (com query limpa)
    const cleanSearchText = stripEmojis(trimmed)
        .replace(/^(sua\s+casa|seu\s+trabalho|casa|trabalho)\s*[-–—:]\s*/i, '')
        .trim();
    const cleanNormalized = normalizeText(cleanSearchText || trimmed);

    const local = SP_NEIGHBORHOODS.find(n => normalizeText(n.nome).includes(cleanNormalized) || cleanNormalized.includes(normalizeText(n.nome)));
    if (local) {
        return {
            lat: local.lat,
            lng: local.lon,
            lon: local.lon,
            nome: local.nome,
            bairro: local.bairro
        };
    }

    // 6. Geocoding no Nominatim sem emojis e com endereço real limpo
    if (!cleanSearchText || cleanSearchText.length < 2) {
        return null;
    }

    try {
        const queryTerm = `${cleanSearchText}, Sao Paulo, SP, Brasil`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryTerm)}&bounded=1&viewbox=-46.826,-23.383,-46.365,-23.723&limit=1&countrycodes=br`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        const data = await res.json();
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            return {
                lat: lat,
                lng: lon,
                lon: lon,
                nome: data[0].display_name.split(',')[0] || cleanSearchText
            };
        }
    } catch (err) {
        console.warn('Erro ao consultar Nominatim:', err);
    }

    return null;
}

function clearCurrentRoute() {
    routeRequestId++;
    if (routeStartMarker && map) {
        try { map.removeLayer(routeStartMarker); } catch (_) {}
        routeStartMarker = null;
    }
    if (routeEndMarker && map) {
        try { map.removeLayer(routeEndMarker); } catch (_) {}
        routeEndMarker = null;
    }
    if (routeMaxRiskMarker && map) {
        try { map.removeLayer(routeMaxRiskMarker); } catch (_) {}
        routeMaxRiskMarker = null;
    }
    if (currentRoutePolyline && map) {
        try { map.removeLayer(currentRoutePolyline); } catch (_) {}
        currentRoutePolyline = null;
    }
    if (Array.isArray(routeLayers)) {
        routeLayers.forEach(l => {
            try {
                if (map && l) map.removeLayer(l);
            } catch (_) {}
        });
        routeLayers = [];
    }
    // Limpar também a rota alternativa e resetar painel
    clearAltRouteLayers();
    altRouteData = null;
    mainRouteVisible = true;
    updateAltRoutePanel('hide');
}

function setRouteStatus(type, message) {
    const alertBox = document.getElementById('route-alert-box');
    if (!alertBox) return;

    const styles = {
        loading: ['rgba(56, 189, 248, 0.14)', 'rgba(56, 189, 248, 0.4)', '#7DD3FC', '⏳'],
        safe: ['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.4)', '#6EE7B7', '✅'],
        moderate: ['rgba(234, 179, 8, 0.15)', 'rgba(234, 179, 8, 0.45)', '#FDE047', '⚠️'],
        danger: ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.45)', '#FCA5A5', '🚨'],
        error: ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.45)', '#FCA5A5', '❌']
    };
    const [background, border, color, icon] = styles[type] || styles.loading;
    alertBox.innerHTML = `
        <div style="background:${background};border:1px solid ${border};border-radius:10px;padding:12px;font-size:12px;color:${color};line-height:1.5;">
            ${icon} ${message}
        </div>
    `;
    alertBox.style.display = 'block';
}

function getRouteRiskStyle(risk) {
    if (risk <= 30) return { level: 'Baixo', color: '#10B981' };
    if (risk <= 50) return { level: 'Moderado', color: '#EAB308' };
    if (risk <= 75) return { level: 'Alto', color: '#F97316' };
    return { level: 'Crítico', color: '#EF4444' };
}

async function fetchOsrmRoute(origem, destino) {
    const origLon = Number(origem.lon ?? origem.lng);
    const origLat = Number(origem.lat);
    const destLon = Number(destino.lon ?? destino.lng);
    const destLat = Number(destino.lat);

    if (isNaN(origLon) || isNaN(origLat) || isNaN(destLon) || isNaN(destLat)) {
        throw new Error('Coordenadas de origem ou destino inválidas para o OSRM.');
    }

    const coordinates = `${origLon.toFixed(6)},${origLat.toFixed(6)};${destLon.toFixed(6)},${destLat.toFixed(6)}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OSRM respondeu com status ${response.status}`);

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates?.length) {
        throw new Error('O OSRM não encontrou uma rota dirigível entre os pontos.');
    }

    return data.routes[0];
}

/**
 * Busca a rota principal + até 3 alternativas via OSRM.
 * Retorna array de routes (a principal é [0]).
 */
async function fetchOsrmRouteWithAlternatives(origem, destino) {
    const origLon = Number(origem.lon ?? origem.lng);
    const origLat = Number(origem.lat);
    const destLon = Number(destino.lon ?? destino.lng);
    const destLat = Number(destino.lat);

    const coordinates = `${origLon.toFixed(6)},${origLat.toFixed(6)};${destLon.toFixed(6)},${destLat.toFixed(6)}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&alternatives=3`;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        if (data.code !== 'Ok' || !data.routes?.length) return null;
        return data.routes; // array com principal + alternativas
    } catch {
        return null;
    }
}

/**
 * Gera uma rota DIFERENTE forçando um waypoint perpendicular ao eixo origem-destino.
 * Tenta os dois lados (esquerdo e direito) e retorna o que tiver melhor risco.
 * offsetKm: distância do desvio lateral em km (padrão 0.6 km).
 */
async function fetchOsrmRouteViaOffset(origem, destino, offsetKm = 0.6) {
    const origLon = Number(origem.lon ?? origem.lng);
    const origLat = Number(origem.lat);
    const destLon = Number(destino.lon ?? destino.lng);
    const destLat = Number(destino.lat);

    // Vetor direcional
    const dLat = destLat - origLat;
    const dLon = destLon - origLon;
    const dist = Math.sqrt(dLat * dLat + dLon * dLon) || 0.001;

    // Vetor perpendicular normalizado (ambos lados)
    const perpLatN =  -dLon / dist;
    const perpLonN =   dLat / dist;

    // 1 grau ≈ 111 km; converter offsetKm para graus
    const offsetDeg = offsetKm / 111;

    // Ponto de desvio no terço do trajeto (não no meio exato — mais natural)
    const fracLat = origLat + dLat * 0.40;
    const fracLon = origLon + dLon * 0.40;

    const routeResults = await Promise.all([+1, -1].map(async (side) => {
        const wLat = fracLat + perpLatN * offsetDeg * side;
        const wLon = fracLon + perpLonN * offsetDeg * side;
        const coords = [
            `${origLon.toFixed(6)},${origLat.toFixed(6)}`,
            `${wLon.toFixed(6)},${wLat.toFixed(6)}`,
            `${destLon.toFixed(6)},${destLat.toFixed(6)}`
        ].join(';');
        try {
            const res = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
            );
            if (!res.ok) return null;
            const data = await res.json();
            if (data.code !== 'Ok' || !data.routes?.[0]) return null;
            return data.routes[0];
        } catch { return null; }
    }));

    // Retorna ambas (filtradas de nulas) para avaliação de risco posterior
    return routeResults.filter(Boolean);
}

/**
 * Avalia uma rota alternativa e retorna {maxRisk, avgRisk, avgElevation, samples, environments, elevations, sampleRisks}.
 * Reutiliza as mesmas funções de análise da rota principal.
 */
async function scoreAltRoute(routeGeometry) {
    const coordinates = routeGeometry.coordinates;
    const samples = selectRouteSamples(coordinates);
    if (!samples.length) return null;

    try {
        const environments = await fetchRouteEnvironment(samples);
        if (environments.length !== samples.length) return null;

        const elevations = environments.map(w =>
            Number.isFinite(Number(w?.elevation)) ? Number(w.elevation) : 745
        );
        const terrainContexts = samples.map((_, i) => getRouteTerrainContext(samples, elevations, i));
        const sampleRisks = samples.map((point, i) => {
            const analysis = processRiskAnalysis(environments[i], elevations[i], point.lat, point.lon);
            const adjusted = baseRouteRiskWithTerrainCap(analysis, terrainContexts[i].adjustment);
            return Math.round(clamp(adjusted, 0, 100));
        });

        const maxRisk = Math.max(...sampleRisks);
        const avgRisk = Math.round(sampleRisks.reduce((a, b) => a + b, 0) / sampleRisks.length);
        const avgElevation = Math.round(elevations.reduce((a, b) => a + b, 0) / elevations.length);

        return { maxRisk, avgRisk, avgElevation, samples, environments, elevations, sampleRisks, coordinates };
    } catch {
        return null;
    }
}

function baseRouteRiskWithTerrainCap(analysis, terrainAdjustment) {
    const relevantRain = Math.max(analysis.currentRain || 0, analysis.maxForecastRain || 0);
    const relevantAccumulated = (analysis.acc24h || 0) + (analysis.forecastRainTotal || 0);
    return applyRainRiskCap(analysis.maxForecastRisk + terrainAdjustment, relevantRain, relevantAccumulated);
}

// Estado global da rota alternativa
let altRouteData = null;       // { coordinates, maxRisk, avgRisk, avgElevation, distanceKm, durationSec }
let altRouteLayers = [];       // polylines desenhadas da rota alternativa
let mainRouteVisible = true;   // controla comparação

function clearAltRouteLayers() {
    altRouteLayers.forEach(l => { try { map.removeLayer(l); } catch {} });
    altRouteLayers = [];
}

/**
 * Seleciona a melhor alternativa: menor maxRisk, desempate por maior altitudemédia.
 */
function pickBestAltRoute(scored) {
    return scored
        .filter(s => s !== null)
        .sort((a, b) => {
            if (a.maxRisk !== b.maxRisk) return a.maxRisk - b.maxRisk;
            return b.avgElevation - a.avgElevation; // altitude maior = mais seguro
        })[0] || null;
}

/**
 * Atualiza o painel de rota alternativa segura no sidebar.
 */
function updateAltRoutePanel(state, data) {
    const panel = document.getElementById('alt-route-panel');
    const subtitle = document.getElementById('alt-route-subtitle');
    const badge = document.getElementById('alt-route-badge');
    const details = document.getElementById('alt-route-details');
    const warning = document.getElementById('alt-route-warning');

    if (!panel) return;

    if (state === 'hide') {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';

    if (state === 'loading') {
        subtitle.textContent = 'Calculando rota alternativa segura...';
        badge.textContent = '⏳';
        details.textContent = 'Analisando riscos nas rotas alternativas disponíveis...';
        warning.style.display = 'none';
        return;
    }

    if (state === 'found') {
        const { maxRisk, avgElevation, distanceKm, durationSec, mainMaxRisk, isFallback } = data;
        const style = getRouteRiskStyle(maxRisk);
        const savings = mainMaxRisk - maxRisk;
        const durationMin = Math.max(1, Math.round((durationSec || 0) / 60));
        subtitle.textContent = isFallback
            ? `Rota estimada: risco reduzido de ${mainMaxRisk}% → ${maxRisk}% (${style.level})`
            : `Risco reduzido de ${mainMaxRisk}% → ${maxRisk}% (${style.level})`;
        badge.textContent = `${maxRisk}%`;
        badge.style.color = style.color;
        badge.style.background = `${style.color}22`;
        details.innerHTML = `
            <span style="display:block;">📏 <strong>Distância:</strong> ${distanceKm} km</span>
            <span style="display:block;">⏱️ <strong>Tempo estimado:</strong> ~${durationMin} min</span>
            <span style="display:block;">⛰️ <strong>Altitude média:</strong> ${avgElevation} m (terreno mais elevado)</span>
            <span style="display:block; margin-top:4px; color:#34D399;">✅ Risco estimado reduzido em <strong>${savings}%</strong> vs. rota principal</span>
            ${isFallback ? '<span style="display:block; margin-top:4px; font-size:10px; color:#94A3B8;">⚠ Rota baseada na geometria principal com cálculo de desvio estimado</span>' : ''}
        `;
        if (maxRisk > 50) {
            warning.style.display = 'block';
            warning.textContent = `⚠️ Mesmo a rota alternativa apresenta risco ${style.level.toLowerCase()} (${maxRisk}%). Considere aguardar a chuva passar.`;
        } else {
            warning.style.display = 'none';
        }
        return;
    }

    if (state === 'none') {
        subtitle.textContent = 'Nenhuma alternativa segura encontrada';
        badge.textContent = '⚠️';
        badge.style.color = '#FCD34D';
        badge.style.background = 'rgba(234,179,8,0.2)';
        details.textContent = 'O OSRM não retornou alternativas para este percurso, ou todas apresentam risco similar. Considere aguardar ou usar transporte público.';
        warning.style.display = 'none';
    }
}

/**
 * Desenha a rota alternativa no mapa (em verde/azul tracejado).
 */
function showAltRouteOnMap() {
    if (!altRouteData) return;
    clearAltRouteLayers();

    const latlngs = altRouteData.coordinates.map(([lon, lat]) => [lat, lon]);

    const outline = L.polyline(latlngs, {
        color: '#0F172A', weight: 10, opacity: 0.7,
        lineJoin: 'round', lineCap: 'round', dashArray: '1, 1'
    }).addTo(map);

    const line = L.polyline(latlngs, {
        color: '#10B981', weight: 7, opacity: 0.95,
        lineJoin: 'round', lineCap: 'round',
        dashArray: '14, 8'
    }).addTo(map).bindTooltip(
        `🛡️ Rota Alternativa Segura — Risco Máx: ${altRouteData.maxRisk}%`,
        { sticky: true }
    );

    altRouteLayers.push(outline, line);

    // Ajusta o mapa para incluir ambas as rotas
    if (currentRoutePolyline) {
        const bounds = L.polyline([...latlngs]).getBounds();
        map.fitBounds(bounds.extend(currentRoutePolyline.getBounds()), { padding: [50, 50] });
    } else {
        map.fitBounds(L.polyline(latlngs).getBounds(), { padding: [50, 50] });
    }
}

/**
 * Alterna entre mostrar apenas a rota principal ou ambas (comparação).
 */
function compareRoutes() {
    if (altRouteLayers.length === 0) {
        showAltRouteOnMap();
        return;
    }
    // Alterna visibilidade
    mainRouteVisible = !mainRouteVisible;
    routeLayers.forEach(l => {
        try {
            if (mainRouteVisible) map.addLayer(l); else map.removeLayer(l);
        } catch {}
    });
}



function routeDistanceMeters(a, b) {
    const earthRadius = 6371000;
    const toRadians = degrees => degrees * Math.PI / 180;
    const lat1 = toRadians(a[1]);
    const lat2 = toRadians(b[1]);
    const deltaLat = lat2 - lat1;
    const deltaLon = toRadians(b[0] - a[0]);
    const haversine = Math.sin(deltaLat / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getRouteCumulativeDistances(coordinates) {
    const distances = [0];
    for (let index = 1; index < coordinates.length; index++) {
        distances.push(distances[index - 1] + routeDistanceMeters(coordinates[index - 1], coordinates[index]));
    }
    return distances;
}

function selectRouteSamples(coordinates, intervalMeters = 200) {
    if (!coordinates.length) return [];
    const cumulative = getRouteCumulativeDistances(coordinates);
    const totalDistance = cumulative[cumulative.length - 1];
    const targetDistances = [];
    for (let distance = 0; distance < totalDistance; distance += intervalMeters) targetDistances.push(distance);
    if (!targetDistances.length || totalDistance - targetDistances[targetDistances.length - 1] > 1) {
        targetDistances.push(totalDistance);
    }

    let segmentIndex = 0;
    return targetDistances.map(distance => {
        while (segmentIndex < cumulative.length - 2 && cumulative[segmentIndex + 1] < distance) segmentIndex++;
        const startDistance = cumulative[segmentIndex];
        const endDistance = cumulative[segmentIndex + 1] ?? startDistance;
        const progress = endDistance === startDistance ? 0 : (distance - startDistance) / (endDistance - startDistance);
        const start = coordinates[segmentIndex];
        const end = coordinates[segmentIndex + 1] || start;
        return {
            distance,
            lon: start[0] + (end[0] - start[0]) * progress,
            lat: start[1] + (end[1] - start[1]) * progress
        };
    });
}

async function fetchRouteEnvironment(samples) {
    const chunkSize = 35;
    const chunks = [];
    for (let start = 0; start < samples.length; start += chunkSize) {
        chunks.push(samples.slice(start, start + chunkSize));
    }

    const responses = [];
    for (let batchStart = 0; batchStart < chunks.length; batchStart += 3) {
        const batch = chunks.slice(batchStart, batchStart + 3);
        const batchResponses = await Promise.all(batch.map(async chunk => {
            const latitudes = chunk.map(point => point.lat).join(',');
            const longitudes = chunk.map(point => point.lon).join(',');
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&hourly=rain,precipitation_probability,soil_moisture_0_to_1cm&past_days=2&forecast_days=2&timezone=America%2FSao_Paulo`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Open-Meteo respondeu com status ${response.status}`);
            const data = await response.json();
            return Array.isArray(data) ? data : [data];
        }));
        responses.push(...batchResponses);
    }

    return responses.flat();
}

function interpolateRouteRisks(coordinates, samples, sampleRisks) {
    const cumulative = getRouteCumulativeDistances(coordinates);
    let sampleIndex = 0;
    return cumulative.map(distance => {
        while (sampleIndex < samples.length - 2 && samples[sampleIndex + 1].distance < distance) sampleIndex++;
        const start = samples[sampleIndex];
        const end = samples[sampleIndex + 1] || start;
        const progress = end.distance === start.distance ? 0 : (distance - start.distance) / (end.distance - start.distance);
        return Math.round(sampleRisks[sampleIndex] + ((sampleRisks[sampleIndex + 1] ?? sampleRisks[sampleIndex]) - sampleRisks[sampleIndex]) * clamp(progress, 0, 1));
    });
}

function getRouteTerrainContext(samples, elevations, index) {
    const currentElevation = elevations[index];
    const previousIndex = Math.max(0, index - 1);
    const nextIndex = Math.min(samples.length - 1, index + 1);
    const previousElevation = elevations[previousIndex];
    const nextElevation = elevations[nextIndex];
    const horizontalDistance = Math.max(1, samples[nextIndex].distance - samples[previousIndex].distance);
    const gradePercent = ((nextElevation - previousElevation) / horizontalDistance) * 100;
    const neighborAverage = (previousElevation + nextElevation) / 2;
    const relativeHeight = currentElevation - neighborAverage;

    // Depressões acumulam escoamento; cristas favorecem a dispersão. O ajuste é
    // limitado para que uma leitura isolada de elevação não domine clima e histórico.
    const valleyAdjustment = clamp(-relativeHeight * 1.2, -8, 10);
    const slopeAdjustment = clamp(Math.abs(gradePercent) * 0.7, 0, 5);
    const adjustment = clamp(valleyAdjustment + slopeAdjustment, -8, 12);
    const type = relativeHeight <= -2 ? 'vale/depressão'
        : (Math.abs(gradePercent) >= 2 ? (gradePercent > 0 ? 'aclive' : 'declive') : 'relevo estável');

    return { gradePercent, relativeHeight, adjustment, type };
}

function groupRouteSegments(coordinates, risks) {
    const groups = [];
    let current = null;
    for (let index = 0; index < coordinates.length - 1; index++) {
        const segmentRisk = Math.round((risks[index] + risks[index + 1]) / 2);
        const style = getRouteRiskStyle(segmentRisk);
        const start = [coordinates[index][1], coordinates[index][0]];
        const end = [coordinates[index + 1][1], coordinates[index + 1][0]];

        if (!current || current.level !== style.level) {
            current = { ...style, maxRisk: segmentRisk, latlngs: [start, end] };
            groups.push(current);
        } else {
            current.latlngs.push(end);
            current.maxRisk = Math.max(current.maxRisk, segmentRisk);
        }
    }
    return groups;
}

function formatRouteDuration(durationSeconds) {
    const totalMinutes = Math.max(1, Math.round((Number(durationSeconds) || 0) / 60));
    if (totalMinutes < 60) return `${totalMinutes} min`;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes} min` : `${hours}h`;
}

function buildRouteMetrics(distanceKm) {
    return `
        <span style="display:block;color:#E2E8F0;margin-top:7px;line-height:1.65;">
            <span style="display:block;"><strong>Distância Total:</strong> ${distanceKm} km</span>
        </span>
    `;
}

async function processRouteTrajectory(origem, destino) {
    clearExplorationLayers();
    clearCurrentRoute();
    const requestId = routeRequestId;

    try {
        const osrmRoute = await fetchOsrmRoute(origem, destino);
        if (requestId !== routeRequestId) return;

        const coordinates = osrmRoute.geometry.coordinates;
        const samples = selectRouteSamples(coordinates);
        setRouteStatus('loading', `Rota encontrada. Analisando clima e relevo em ${samples.length} pontos do trajeto...`);

        const environments = await fetchRouteEnvironment(samples);
        if (requestId !== routeRequestId) return;
        if (environments.length !== samples.length) throw new Error('Dados ambientais incompletos para a rota.');

        const elevations = environments.map(weather =>
            Number.isFinite(Number(weather?.elevation)) ? Number(weather.elevation) : 745
        );
        const terrainContexts = samples.map((_, index) => getRouteTerrainContext(samples, elevations, index));
        const sampleRisks = samples.map((point, index) => {
            const analysis = processRiskAnalysis(environments[index], elevations[index], point.lat, point.lon);
            return Math.round(clamp(baseRouteRiskWithTerrainCap(analysis, terrainContexts[index].adjustment), 0, 100));
        });
        const vertexRisks = interpolateRouteRisks(coordinates, samples, sampleRisks);
        const groups = groupRouteSegments(coordinates, vertexRisks);

        groups.forEach(group => {
            const outline = L.polyline(group.latlngs, {
                color: '#0F172A',
                weight: group.level === 'Alto' || group.level === 'Crítico' ? 11 : 9,
                opacity: 0.78,
                lineJoin: 'round',
                lineCap: 'round'
            }).addTo(map);
            const segment = L.polyline(group.latlngs, {
                color: group.color,
                weight: group.level === 'Alto' || group.level === 'Crítico' ? 8 : 6,
                opacity: 0.98,
                lineJoin: 'round',
                lineCap: 'round'
            }).addTo(map).bindTooltip(`${group.level}: até ${group.maxRisk}% de risco`);
            routeLayers.push(outline, segment);
        });

        // ─── 1. MARCADOR DE ORIGEM (VERDE) ───
        const originIcon = L.divIcon({
            className: 'custom-route-marker marker-origin',
            iconSize: [40, 50],
            iconAnchor: [20, 50],
            popupAnchor: [0, -48],
            tooltipAnchor: [0, -48],
            html: `
                <div style="position: relative; width: 40px; height: 50px; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 10px rgba(16, 185, 129, 0.65));">
                    <div style="width: 38px; height: 38px; border-radius: 50% 50% 50% 0; background: linear-gradient(135deg, #10B981 0%, #059669 100%); transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2.5px solid #FFFFFF; box-shadow: 0 0 14px rgba(16, 185, 129, 0.85);">
                        <span style="transform: rotate(45deg); font-size: 18px; line-height: 1; user-select: none;">🚀</span>
                    </div>
                    <div style="width: 12px; height: 5px; background: rgba(0, 0, 0, 0.4); border-radius: 50%; filter: blur(1.5px); margin-top: 5px;"></div>
                </div>
            `
        });

        routeStartMarker = L.marker([origem.lat, origem.lon], { icon: originIcon, zIndexOffset: 950 })
            .addTo(map)
            .bindTooltip("Origem / Ponto de Partida", { className: 'route-marker-tooltip', direction: 'top', offset: [0, -48], opacity: 1.0 })
            .bindPopup(`
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; line-height: 1.4; min-width: 180px;">
                    <div style="font-weight: 800; color: #10B981; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span>🚀</span> Origem / Ponto de Partida
                    </div>
                    <div style="color: #334155; font-weight: 600;">${escapeHtml(origem.nome)}</div>
                </div>
            `);

        // ─── 2. MARCADOR DE DESTINO (VERMELHO) ───
        const destinationIcon = L.divIcon({
            className: 'custom-route-marker marker-destination',
            iconSize: [40, 50],
            iconAnchor: [20, 50],
            popupAnchor: [0, -48],
            tooltipAnchor: [0, -48],
            html: `
                <div style="position: relative; width: 40px; height: 50px; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 10px rgba(239, 68, 68, 0.65));">
                    <div style="width: 38px; height: 38px; border-radius: 50% 50% 50% 0; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2.5px solid #FFFFFF; box-shadow: 0 0 14px rgba(239, 68, 68, 0.85);">
                        <span style="transform: rotate(45deg); font-size: 18px; line-height: 1; user-select: none;">🏁</span>
                    </div>
                    <div style="width: 12px; height: 5px; background: rgba(0, 0, 0, 0.4); border-radius: 50%; filter: blur(1.5px); margin-top: 5px;"></div>
                </div>
            `
        });

        routeEndMarker = L.marker([destino.lat, destino.lon], { icon: destinationIcon, zIndexOffset: 950 })
            .addTo(map)
            .bindTooltip("Destino / Chegada", { className: 'route-marker-tooltip', direction: 'top', offset: [0, -48], opacity: 1.0 })
            .bindPopup(`
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; line-height: 1.4; min-width: 180px;">
                    <div style="font-weight: 800; color: #EF4444; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span>🏁</span> Destino / Chegada
                    </div>
                    <div style="color: #334155; font-weight: 600;">${escapeHtml(destino.nome)}</div>
                </div>
            `);

        routeLayers.push(routeStartMarker, routeEndMarker);

        // ─── 3. AJUSTE DE TELA (FIT BOUNDS) ───
        const routeLatLngs = coordinates.map(([lon, lat]) => [lat, lon]);
        const rotaPolyline = L.polyline(routeLatLngs);
        currentRoutePolyline = rotaPolyline;
        map.fitBounds(rotaPolyline.getBounds(), { padding: [50, 50] });

        const maxRisk = Math.max(...sampleRisks);
        const worstSampleIndex = sampleRisks.indexOf(maxRisk);
        const worstPoint = samples[worstSampleIndex];
        const worstStyle = getRouteRiskStyle(maxRisk);
        const worstTerrain = terrainContexts[worstSampleIndex];
        const chronic = checkChronicFloodZone(worstPoint.lat, worstPoint.lon);
        const drainage = getDrainageInfluence(worstPoint.lat, worstPoint.lon);
        const reverseLocation = await reverseGeocode(worstPoint.lat, worstPoint.lon);
        if (requestId !== routeRequestId) return;
        const locationLabel = reverseLocation?.nome
            || (chronic.hasRecordsWithinRadius ? chronic.zoneName : getMinDistanceToRivers(worstPoint.lat, worstPoint.lon).river);
        const dangerousGroups = groups.filter(group => group.level === 'Alto' || group.level === 'Crítico');
        const distanceKm = (osrmRoute.distance / 1000).toFixed(1);
        const routeMetrics = buildRouteMetrics(distanceKm, osrmRoute.duration, maxRisk);
        const drainageText = drainage.influence > 0.1
            ? ` • Macrodrenagem: ${escapeHtml(drainage.name)}`
            : '';
        const terrainText = `Relevo: ${worstTerrain.type} (${elevations[worstSampleIndex]} m)`;
        const historicalText = chronic.hasRecordsWithinRadius
            ? ` • Defesa Civil: 🚨 ${escapeHtml(chronic.zoneName)} (${chronic.dist}m)`
            : ` • Bacia: 🌐 ${escapeHtml(chronic.bacia || chronic.zoneName)}`;

        const maxRiskIcon = L.divIcon({
            className: '',
            iconSize: [52, 58],
            iconAnchor: [26, 54],
            html: `
                <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 5px 8px rgba(0,0,0,.55));">
                    <div style="min-width:48px;padding:7px 8px;border:3px solid #fff;border-radius:14px;background:${worstStyle.color};color:#fff;font:900 12px 'Plus Jakarta Sans',sans-serif;text-align:center;">⚠ ${maxRisk}%</div>
                    <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:11px solid ${worstStyle.color};margin-top:-1px;"></div>
                </div>`
        });
        routeMaxRiskMarker = L.marker([worstPoint.lat, worstPoint.lon], { icon: maxRiskIcon, zIndexOffset: 1000 })
            .addTo(map)
            .bindPopup(`<b>Ponto de Risco Máximo: ${maxRisk}%</b><br>${escapeHtml(locationLabel)}<br>Nível ${worstStyle.level}<br><small>${historicalText}</small>`);
        routeLayers.push(routeMaxRiskMarker);

        if (maxRisk < 30) {
            // ─── RISCO BAIXO: trajeto seguro, sem alternativa ───────────────────
            setRouteStatus('safe', `<strong>Trajeto Limpo e Seguro.</strong> Nenhuma área de risco crítico identificada nos trechos analisados. <span style="display:block;color:#E2E8F0;margin-top:4px;"><strong>Risco Máximo: ${maxRisk}%</strong> em ${escapeHtml(locationLabel)} • ${terrainText}${historicalText}${drainageText}</span>${routeMetrics}`);
            updateAltRoutePanel('hide');
        } else {
            // ─── RISCO MODERADO / ALTO / CRÍTICO: sugerir rota alternativa ────────
            if (maxRisk <= 50) {
                setRouteStatus('moderate', `<strong>⚠️ Atenção moderada.</strong> <strong>Risco Máximo: ${maxRisk}%</strong> no trecho de ${escapeHtml(locationLabel)}. Dirija com atenção. <span style="display:block;color:#E2E8F0;margin-top:4px;">${terrainText}${historicalText}${drainageText}</span>${routeMetrics}`);
            } else {
                const trechoLabel = dangerousGroups.length === 1 ? '1 trecho' : `${dangerousGroups.length} trechos`;
                setRouteStatus('danger', `<strong>🚨 Perigo:</strong> Seu trajeto passa por ${trechoLabel} com risco elevado de alagamento. <strong>Risco Máximo: ${maxRisk}%</strong> em ${escapeHtml(locationLabel)} (${worstStyle.level}). <span style="display:block;color:#E2E8F0;margin-top:4px;">${terrainText}${historicalText}${drainageText}</span>${routeMetrics}`);
            }

            // Mostrar painel em modo "carregando"
            altRouteData = null;
            clearAltRouteLayers();
            mainRouteVisible = true;
            updateAltRoutePanel('loading');

            (async () => {
                if (requestId !== routeRequestId) return;
                try {
                    // 1ª tentativa: alternativas nativas do OSRM
                    const allRoutes = await fetchOsrmRouteWithAlternatives(origem, destino);
                    if (requestId !== routeRequestId) return;

                    const altRoutes = allRoutes ? allRoutes.slice(1) : [];

                    if (!altRoutes.length) {
                        updateAltRoutePanel('none');
                        return;
                    }

                    // Avaliar cada alternativa com o motor de risco completo
                    const scored = await Promise.all(
                        altRoutes.map(r => scoreAltRoute(r.geometry))
                    );

                    // Associar distância/duração de cada rota alternativa ao score
                    scored.forEach((s, i) => {
                        if (s && altRoutes[i]) {
                            s.distanceKm = (altRoutes[i].distance / 1000).toFixed(1);
                            s.durationSec = altRoutes[i].duration;
                        }
                    });

                    if (requestId !== routeRequestId) return;

                    const best = pickBestAltRoute(scored);

                    // ── Se OSRM não retornou nada melhor, gerar rota via desvio perpendicular ──
                    if (!best || best.maxRisk >= maxRisk) {
                        if (requestId !== routeRequestId) return;
                        setRouteStatus(maxRisk <= 50 ? 'moderate' : 'danger',
                            document.getElementById('route-alert-box')?.querySelector('div')?.textContent || '');
                        updateAltRoutePanel('loading');

                        // Buscar rota via waypoint perpendicular (geometria diferente)
                        const offsetRoutes = await fetchOsrmRouteViaOffset(origem, destino);
                        if (requestId !== routeRequestId) return;

                        if (!offsetRoutes.length) {
                            updateAltRoutePanel('none');
                            return;
                        }

                        // Avaliar as duas rotas offset (esquerda e direita)
                        const offsetScored = await Promise.all(
                            offsetRoutes.map(async r => {
                                const s = await scoreAltRoute(r.geometry);
                                if (s) {
                                    s.distanceKm = (r.distance / 1000).toFixed(1);
                                    s.durationSec = r.duration;
                                }
                                return s;
                            })
                        );
                        if (requestId !== routeRequestId) return;

                        const bestOffset = pickBestAltRoute(offsetScored);
                        if (!bestOffset || bestOffset.maxRisk >= maxRisk) {
                            updateAltRoutePanel('none');
                            return;
                        }

                        altRouteData = {
                            coordinates: bestOffset.coordinates,
                            maxRisk: bestOffset.maxRisk,
                            avgRisk: bestOffset.avgRisk,
                            avgElevation: bestOffset.avgElevation,
                            distanceKm: bestOffset.distanceKm,
                            durationSec: bestOffset.durationSec
                        };
                        updateAltRoutePanel('found', {
                            maxRisk: bestOffset.maxRisk,
                            avgElevation: bestOffset.avgElevation,
                            distanceKm: bestOffset.distanceKm,
                            durationSec: bestOffset.durationSec,
                            mainMaxRisk: maxRisk
                        });
                        showAltRouteOnMap();
                        return;
                    }

                    // Salvar para uso pelos botões "Ver no Mapa" e "Comparar"
                    altRouteData = {
                        coordinates: best.coordinates,
                        maxRisk: best.maxRisk,
                        avgRisk: best.avgRisk,
                        avgElevation: best.avgElevation,
                        distanceKm: best.distanceKm,
                        durationSec: best.durationSec
                    };

                    updateAltRoutePanel('found', {
                        maxRisk: best.maxRisk,
                        avgElevation: best.avgElevation,
                        distanceKm: best.distanceKm,
                        durationSec: best.durationSec,
                        mainMaxRisk: maxRisk
                    });

                    // Desenhar automaticamente a alternativa no mapa sempre que for melhor
                    showAltRouteOnMap();
                } catch (altErr) {
                    console.warn('[FloodGuard] Falha ao calcular rota alternativa:', altErr.message);
                    updateAltRoutePanel('none');
                }
            })();
        }
    } catch (error) {
        if (requestId !== routeRequestId) return;
        console.error('Falha ao calcular rota real:', error);
        setRouteStatus('error', 'Não foi possível calcular a rota pelas ruas agora. Verifique sua conexão e tente novamente.');
        updateAltRoutePanel('hide');
    }
}

// ─── BOTÕES DE CONTROLE RÁPIDO DO MAPA ────────────────────────────────────────
function flyToSaoPauloCenter() {
    if (map) map.flyTo([-23.5505, -46.6333], 13, { duration: 1.2 });
}

function flyToFECAP() {
    selectSearchResult(-23.5574, -46.6367, "FECAP — Campus Liberdade", "Liberdade", 735);
}




function focusSearchInput() {
    const input = document.getElementById('universal-search-input');
    if (input) {
        setTimeout(() => {
            input.focus();
            input.classList.add('highlight-pulse');
            setTimeout(() => input.classList.remove('highlight-pulse'), 3000);
        }, 300);
    }
}

function showGeoToast(type, message, durationMs = 6000) {
    const toast = document.getElementById('geo-alert-toast');
    if (!toast) return;

    const iconEl = document.getElementById('geo-toast-icon');
    const msgEl = document.getElementById('geo-toast-msg');

    if (type === 'error' || type === 'warning') {
        toast.className = 'geo-toast geo-toast-error';
        if (iconEl) iconEl.innerHTML = '⚠️';
    } else if (type === 'success') {
        toast.className = 'geo-toast geo-toast-success';
        if (iconEl) iconEl.innerHTML = '✅';
    } else {
        toast.className = 'geo-toast geo-toast-info';
        if (iconEl) iconEl.innerHTML = '🛰️';
    }

    if (msgEl) msgEl.innerHTML = message;
    toast.style.display = 'flex';

    clearTimeout(geoToastTimeout);
    if (durationMs > 0) {
        geoToastTimeout = setTimeout(() => {
            hideGeoToast();
        }, durationMs);
    }
}

function hideGeoToast() {
    const toast = document.getElementById('geo-alert-toast');
    if (toast) {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
            toast.style.display = 'none';
            toast.style.animation = '';
        }, 300);
    }
}

// ─── HELPERS E CORES ─────────────────────────────────────────────────────────
function getRiskColor(risk) {
    if (risk >= 75) return '#EF4444'; // Vermelho Crítico
    if (risk >= 50) return '#F97316'; // Laranja Alto
    if (risk >= 30) return '#F59E0B'; // Amarelo Moderado
    return '#10B981';                 // Verde Baixo
}

function getRiskLabel(risk) {
    if (risk >= 75) return 'CRÍTICO';
    if (risk >= 50) return 'ALTO';
    if (risk >= 30) return 'MODERADO';
    return 'BAIXO';
}

function escapeHtml(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function getFallbackAnalysis() {
    return {
        currentRain: 0.0,
        acc24h: 2.0,
        dailyRainTotal: 0.0,
        dailyRainChance: 0,
        forecastRainTotal: 0.0,
        currentRisk: 0,
        maxForecastRisk: 0,
        labels: ["-24h", "-18h", "-12h", "-6h", "Agora", "+1h", "+2h", "+3h"],
        historyRisks: [8, 10, 12, 11, 12, null, null, null],
        forecastRisks: [null, null, null, null, 12, 12, 12, 12]
    };
}
