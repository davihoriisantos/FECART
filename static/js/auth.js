/**
 * auth.js — FloodGuard AI
 * Sistema Unificado de Autenticação e Perfil de Usuário.
 * 
 * Regras principais:
 * 1. Usuário Logado: Verifica localStorage. Se houver sessão ativa, exibe direto o Painel do Usuário
 *    (dados, histórico e locais salvos), sem mostrar a tela de login.
 * 2. Usuário Não Logado: Exibe formulário com campos vazios por padrão e autocomplete="off".
 * 3. Preservação de Dados: Não desloga automaticamente o usuário em caso de erro temporário de rede.
 *    A sessão permanece salva até que o usuário clique explicitamente em "Sair/Logout".
 */

'use strict';

const AUTH_KEYS = {
    TOKEN: 'fg_token',
    TOKEN_LEGACY: 'floodguard_token',
    USER: 'fg_user'
};

let currentUserState = null;
let currentProfileState = { saved_places: { home: null, work: null }, history: [] };

// ─── VERIFICAÇÃO DE SESSÃO ───────────────────────────────────────────────────
function getToken() {
    return localStorage.getItem(AUTH_KEYS.TOKEN) || localStorage.getItem(AUTH_KEYS.TOKEN_LEGACY) || null;
}

function getCurrentUser() {
    return currentUserState;
}

function isLoggedIn() {
    return !!getToken();
}

function extractApiError(data, fallback = 'Não foi possível concluir a operação.') {
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail) && data.detail.length > 0) {
        return data.detail.map(error => {
            if (typeof error === 'string') return error;
            const location = Array.isArray(error?.loc) && error.loc.length
                ? error.loc[error.loc.length - 1]
                : 'campo';
            return `${location}: ${error?.msg || 'valor inválido'}`;
        }).join(' | ');
    }
    if (data.detail && typeof data.detail.msg === 'string') return data.detail.msg;
    if (typeof data.message === 'string') return data.message;
    return fallback;
}

function saveSession(token, user) {
    if (token) {
        localStorage.setItem(AUTH_KEYS.TOKEN, token);
        localStorage.setItem(AUTH_KEYS.TOKEN_LEGACY, token);
    }
    if (user) {
        currentUserState = user;
    }
    localStorage.removeItem(AUTH_KEYS.USER);
    try {
        sessionStorage.removeItem('fg_notif_prompt_dismissed');
    } catch (_) {}
}

function clearSession() {
    localStorage.removeItem(AUTH_KEYS.TOKEN);
    localStorage.removeItem(AUTH_KEYS.TOKEN_LEGACY);
    localStorage.removeItem(AUTH_KEYS.USER);
    currentUserState = null;
    currentProfileState = { saved_places: { home: null, work: null }, history: [] };
    try {
        sessionStorage.removeItem('fg_notif_prompt_dismissed');
    } catch (_) {}
}

// ─── LOGOUT EXPLÍCITO ────────────────────────────────────────────────────────
function logout() {
    if (!confirm('Deseja realmente sair da sua conta?')) return;
    clearSession();
    window.location.href = '/login';
}

// ─── REQUISIÇÕES AUTENTICADAS COM PRESERVAÇÃO DE SESSÃO ──────────────────────
async function authFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    try {
        const res = await fetch(endpoint.startsWith('/api') ? endpoint : `/api/auth${endpoint}`, {
            ...options,
            headers
        });
        return res;
    } catch (err) {
        console.warn('[authFetch] Falha de conexão na API:', err.message);
        return null;
    }
}

// ─── LOCAIS SALVOS DO USUÁRIO ────────────────────────────────────────────────
function getSavedPlaces(user) {
    if (!user) return {};
    const places = currentProfileState.saved_places || {};
    const normalize = (place, label) => place ? {
        ...place,
        nome: place.address || label,
        bairro: 'São Paulo - SP'
    } : null;
    return { home: normalize(places.home, 'Casa'), work: normalize(places.work, 'Trabalho') };
}

function renderSavedPlaces(user) {
    const container = document.getElementById('profile-saved-places-list');
    if (!container) return;

    const places = getSavedPlaces(user);

    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <!-- CARD CASA -->
            <div class="info-card" style="padding: 20px; border-radius: 14px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="font-weight: 800; font-size: 16px; color: #FFFFFF; display: flex; align-items: center; gap: 8px;">
                        <span>🏠</span> Casa
                    </div>
                    ${places.home ? '<span style="font-size: 11px; background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.3); padding: 3px 8px; border-radius: 6px; font-weight: 700;">🟢 Ativo</span>' : '<span style="font-size: 11px; background: rgba(255,255,255,0.05); color: #94A3B8; padding: 3px 8px; border-radius: 6px;">Não definido</span>'}
                </div>
                <div style="font-size: 13px; color: ${places.home ? '#38BDF8' : '#64748B'}; font-weight: 600; margin-bottom: 4px;">
                    ${places.home ? (places.home.nome || places.home.address) : 'Nenhum endereço de Casa configurado'}
                </div>
                <div style="font-size: 11px; color: #94A3B8; margin-bottom: 16px;">
                    ${places.home ? (places.home.bairro || 'São Paulo - SP') : 'Defina sua casa para monitoramento de risco contínuo'}
                </div>

                <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                    <input type="text" id="pf-input-home" placeholder="Ex: Rua Manoel Dutra, 536" value="${places.home ? (places.home.nome || places.home.address || '') : ''}" class="form-input" style="padding: 8px 12px; font-size: 12px; flex: 1;">
                    <button type="button" onclick="salvarLocalPeloPerfil('home')" class="btn-save" style="padding: 8px 14px; font-size: 12px; white-space: nowrap;">
                        💾 Salvar
                    </button>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                    ${places.home ? `
                        <a href="/map" onclick="sessionStorage.setItem('fg_target_search', '${JSON.stringify({ lat: places.home.lat, lon: places.home.lon, nome: places.home.nome || 'Casa', bairro: places.home.bairro }).replace(/"/g, '&quot;')}')" class="btn-save" style="text-decoration:none; padding: 6px 12px; font-size: 11px; display:inline-flex; align-items:center; gap:4px;">
                            🗺️ Ver no Mapa
                        </a>
                        <button type="button" onclick="removerLocalPeloPerfil('home')" style="background: transparent; border: 1px solid rgba(239,68,68,0.3); color: #FCA5A5; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 8px; cursor: pointer;">
                            🗑️ Remover
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- CARD TRABALHO -->
            <div class="info-card" style="padding: 20px; border-radius: 14px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="font-weight: 800; font-size: 16px; color: #FFFFFF; display: flex; align-items: center; gap: 8px;">
                        <span>💼</span> Trabalho
                    </div>
                    ${places.work ? '<span style="font-size: 11px; background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.3); padding: 3px 8px; border-radius: 6px; font-weight: 700;">🟢 Ativo</span>' : '<span style="font-size: 11px; background: rgba(255,255,255,0.05); color: #94A3B8; padding: 3px 8px; border-radius: 6px;">Não definido</span>'}
                </div>
                <div style="font-size: 13px; color: ${places.work ? '#38BDF8' : '#64748B'}; font-weight: 600; margin-bottom: 4px;">
                    ${places.work ? (places.work.nome || places.work.address) : 'Nenhum endereço de Trabalho configurado'}
                </div>
                <div style="font-size: 11px; color: #94A3B8; margin-bottom: 16px;">
                    ${places.work ? (places.work.bairro || 'São Paulo - SP') : 'Ex: Digite FECART para monitorar o trajeto e local'}
                </div>

                <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                    <input type="text" id="pf-input-work" placeholder="Ex: FECART ou Av. Paulista, 1000" value="${places.work ? (places.work.nome || places.work.address || '') : ''}" class="form-input" style="padding: 8px 12px; font-size: 12px; flex: 1;">
                    <button type="button" onclick="salvarLocalPeloPerfil('work')" class="btn-save" style="padding: 8px 14px; font-size: 12px; white-space: nowrap;">
                        💾 Salvar
                    </button>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                    ${places.work ? `
                        <a href="/map" onclick="sessionStorage.setItem('fg_target_search', '${JSON.stringify({ lat: places.work.lat, lon: places.work.lon, nome: places.work.nome || 'Trabalho', bairro: places.work.bairro }).replace(/"/g, '&quot;')}')" class="btn-save" style="text-decoration:none; padding: 6px 12px; font-size: 11px; display:inline-flex; align-items:center; gap:4px;">
                            🗺️ Ver no Mapa
                        </a>
                        <button type="button" onclick="removerLocalPeloPerfil('work')" style="background: transparent; border: 1px solid rgba(239,68,68,0.3); color: #FCA5A5; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 8px; cursor: pointer;">
                            🗑️ Remover
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ─── SALVAR / REMOVER LOCAIS DIRETAMENTE PELO PERFIL COM PERSISTÊNCIA NO BANCO ─
async function salvarLocalPeloPerfil(type) {
    const input = document.getElementById(`pf-input-${type}`);
    const val = input ? input.value.trim() : '';
    const label = type === 'home' ? 'Casa' : 'Trabalho';

    if (!val) {
        alert(`Por favor, digite o endereço de ${label}.`);
        return;
    }

    let lat = -23.5505;
    let lon = -46.6333;
    const vLower = val.toLowerCase();

    if (vLower.includes('fecart') || vLower.includes('fecap')) {
        lat = -23.5574;
        lon = -46.6367;
    } else {
        // Tenta geocodificação real no Nominatim para o endereço digitado
        try {
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val + ' São Paulo')}&limit=1&countrycodes=br`, {
                headers: { 'Accept-Language': 'pt-BR' }
            });
            if (nomRes.ok) {
                const nomData = await nomRes.json();
                if (nomData && nomData.length > 0 && nomData[0].lat && nomData[0].lon) {
                    lat = Number(nomData[0].lat);
                    lon = Number(nomData[0].lon);
                }
            }
        } catch (_) {}
    }

    try {
        const res = await authFetch('/api/user/saved-places', {
            method: 'PUT',
            body: JSON.stringify({
                type,
                address: val,
                lat,
                lon
            })
        });

        // Atualiza imediatamente o cache no localStorage
        try {
            const currentCache = JSON.parse(localStorage.getItem('fg_saved_places') || '{"home":null,"work":null}');
            currentCache[type] = {
                lat,
                lon,
                nome: val,
                address: val,
                bairro: 'São Paulo - SP'
            };
            localStorage.setItem('fg_saved_places', JSON.stringify(currentCache));
        } catch (_) {}

        if (res && res.ok) {
            // Atualiza o perfil fresco da API
            const profRes = await authFetch('/api/user/profile');
            if (profRes && profRes.ok) {
                const profile = await profRes.json();
                currentProfileState = profile;
                renderSavedPlaces(profile.user);
            }
            alert(`✅ ${label} salva com sucesso no banco de dados!`);
        } else {
            alert(`Não foi possível salvar ${label}.`);
        }
    } catch (e) {
        console.error('Erro ao salvar local pelo perfil:', e);
        alert('Erro ao conectar com o servidor.');
    }
}

async function removerLocalPeloPerfil(type) {
    const label = type === 'home' ? 'Casa' : 'Trabalho';
    if (!confirm(`Deseja remover ${label} dos seus locais salvos?`)) return;

    try {
        const res = await authFetch('/api/user/saved-places', {
            method: 'PUT',
            body: JSON.stringify({
                type,
                address: null,
                lat: null,
                lon: null
            })
        });

        // Atualiza imediatamente o cache no localStorage
        try {
            const currentCache = JSON.parse(localStorage.getItem('fg_saved_places') || '{"home":null,"work":null}');
            currentCache[type] = null;
            localStorage.setItem('fg_saved_places', JSON.stringify(currentCache));
        } catch (_) {}

        if (res && res.ok) {
            const profRes = await authFetch('/api/user/profile');
            if (profRes && profRes.ok) {
                const profile = await profRes.json();
                currentProfileState = profile;
                renderSavedPlaces(profile.user);
            }
            alert(`🗑️ ${label} removida com sucesso.`);
        }
    } catch (e) {
        console.error('Erro ao remover local:', e);
    }
}

// ─── RENDERIZAÇÃO DE DADOS DO PERFIL ─────────────────────────────────────────
function fillProfileUI(user) {
    if (!user) return;

    // Avatar e cabeçalho
    const initial = (user.nome || user.email || '?')[0].toUpperCase();
    const avatar = document.getElementById('hero-avatar');
    const name = document.getElementById('hero-name');
    const email = document.getElementById('hero-email');
    const roleEl = document.getElementById('hero-role');

    if (avatar) avatar.textContent = initial;
    if (name) name.textContent = user.nome || 'Usuário FloodGuard';
    if (email) email.textContent = user.email || '—';
    if (roleEl) roleEl.innerHTML = `<span class="role-badge">🛡️ ${user.role || 'Cidadão'}</span>`;

    // Formulário de dados
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };

    setVal('pf-nome', user.nome);
    setVal('pf-email', user.email);
    setVal('pf-celular', user.celular || '');
    setVal('pf-nasc', user.data_nascimento || '');
    setVal('pf-role', user.role || 'Cidadão');

    // Aba Atividade
    setTxt('act-id', '#' + (user.id || '—'));
    setTxt('act-created', user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—');
    setTxt('act-last-login', user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : 'Hoje');
    setTxt('act-nasc', user.data_nascimento || 'Não informada');
    setTxt('act-celular', user.celular || 'Não cadastrado');
    setTxt('act-role', user.role || 'Cidadão');

    const statusEl = document.getElementById('act-status');
    if (statusEl) {
        statusEl.innerHTML = user.ativo !== false
            ? '<span class="status-pill ativo" style="color:#10B981; font-weight:700;">🟢 Ativa</span>'
            : '<span class="status-pill inativo" style="color:#EF4444; font-weight:700;">🔴 Inativa</span>';
    }

    // Renderizar Locais Salvos
    renderSavedPlaces(user);

    // Renderizar Histórico de Buscas se a função existir
    if (typeof renderProfileHistory === 'function') {
        renderProfileHistory();
    }
}

// ─── ALTERNAR ABAS DO PAINEL DE PERFIL ───────────────────────────────────────
function switchProfileTab(tab) {
    ['dados', 'locais', 'historico', 'atividade'].forEach(t => {
        const panel = document.getElementById(`panel-${t}`);
        const btn = document.getElementById(`ptab-${t}`);
        if (panel) panel.classList.toggle('active', t === tab);
        if (btn) btn.classList.toggle('active', t === tab);
    });

    const user = getCurrentUser();
    if (tab === 'locais' && user) {
        renderSavedPlaces(user);
    } else if (tab === 'historico' && typeof renderProfileHistory === 'function') {
        renderProfileHistory();
    }
}

// ─── ALTERNAR ABAS DO MODO VISITANTE (LOGIN / CADASTRO) ──────────────────────
function switchGuestTab(tab) {
    const btnLogin = document.getElementById('guest-tab-login');
    const btnRegister = document.getElementById('guest-tab-register');
    const panelLogin = document.getElementById('guest-panel-login');
    const panelRegister = document.getElementById('guest-panel-register');

    if (!btnLogin || !btnRegister || !panelLogin || !panelRegister) return;

    if (tab === 'register') {
        btnLogin.classList.remove('active');
        btnRegister.classList.add('active');
        panelLogin.style.display = 'none';
        panelRegister.style.display = 'block';
    } else {
        btnRegister.classList.remove('active');
        btnLogin.classList.add('active');
        panelRegister.style.display = 'none';
        panelLogin.style.display = 'block';
    }
}

// ─── TOGGLE EYE (MOSTRAR/OCULTAR SENHA) ──────────────────────────────────────
function toggleEye(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    if (btn) btn.textContent = isPassword ? '🙈' : '👁️';
}

// ─── INICIALIZADOR PRINCIPAL DA TELA DE PERFIL ──────────────────────────────
async function initProfileView() {
    // 1. Se não houver token no localStorage, redireciona diretamente para fazer login ou criar conta
    if (!isLoggedIn()) {
        window.location.replace('/login');
        return;
    }

    const loggedInView = document.getElementById('profile-logged-view');
    const guestView = document.getElementById('profile-guest-view');
    const btnLogoutHeader = document.getElementById('btn-header-logout');

    if (!loggedInView) return;

    // Preenche com dados locais em cache se existirem
    const cachedUser = getCurrentUser();
    if (cachedUser) {
        fillProfileUI(cachedUser);
    }

    // Tenta validar a sessão e buscar dados da API
    try {
        const res = await authFetch('/api/user/profile');
        if (!res || !res.ok) {
            // Token inválido, expirado ou usuário inexistente: limpa a sessão e vai para login/cadastro
            clearSession();
            window.location.replace('/login');
            return;
        }

        const profile = await res.json();
        if (!profile || !profile.user) {
            clearSession();
            window.location.replace('/login');
            return;
        }

        const updatedUser = profile.user;
        currentProfileState = profile;
        saveSession(getToken(), updatedUser);
        fillProfileUI(updatedUser);
        if (typeof renderProfileHistory === 'function') {
            renderProfileHistory(profile.history || []);
        }

        // Exibe a tela de perfil autenticada
        loggedInView.style.display = 'block';
        if (guestView) guestView.style.display = 'none';
        if (btnLogoutHeader) btnLogoutHeader.style.display = 'inline-block';

    } catch (e) {
        console.error('[Profile] Erro ao validar perfil:', e);
        clearSession();
        window.location.replace('/login');
    }
}

// ─── FORMULÁRIO DE LOGIN DE VISITANTE ────────────────────────────────────────
function setupGuestLoginForm() {
    const form = document.getElementById('guestLoginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgEl = document.getElementById('guestLoginMsg');
        const email = document.getElementById('guest-login-email')?.value.trim();
        const senha = document.getElementById('guest-login-senha')?.value;
        const btn = document.getElementById('btn-guest-login');

        if (msgEl) msgEl.style.display = 'none';

        if (!email || !senha) {
            if (msgEl) {
                msgEl.textContent = '⚠️ Preencha e-mail e senha.';
                msgEl.className = 'msg-box msg-error';
                msgEl.style.display = 'block';
            }
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = '⏳ Entrando...'; }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
            const data = await res.json();

            if (!res.ok) {
                if (msgEl) {
                    msgEl.textContent = '❌ ' + extractApiError(data, 'E-mail ou senha incorretos.');
                    msgEl.className = 'msg-box msg-error';
                    msgEl.style.display = 'block';
                }
                return;
            }

            // Salva a sessão permanentemente
            saveSession(data.access_token, data.user);

            // Transição instantânea para o painel do usuário
            initProfileView();

        } catch (err) {
            if (msgEl) {
                msgEl.textContent = '❌ Erro de conexão com o servidor.';
                msgEl.className = 'msg-box msg-error';
                msgEl.style.display = 'block';
            }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '🔐 Entrar no Sistema'; }
        }
    });
}

// ─── FORMULÁRIO DE CADASTRO DE VISITANTE ─────────────────────────────────────
function setupGuestRegisterForm() {
    const form = document.getElementById('guestRegisterForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgEl = document.getElementById('guestRegMsg');
        const nome = document.getElementById('guest-reg-nome')?.value.trim();
        const email = document.getElementById('guest-reg-email')?.value.trim();
        const celular = document.getElementById('guest-reg-celular')?.value.trim() || null;
        const senha = document.getElementById('guest-reg-senha')?.value;
        const btn = document.getElementById('btn-guest-reg');

        if (msgEl) msgEl.style.display = 'none';

        if (!nome || !email || !senha) {
            if (msgEl) {
                msgEl.textContent = '⚠️ Preencha os campos obrigatórios (*).';
                msgEl.className = 'msg-box msg-error';
                msgEl.style.display = 'block';
            }
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = '⏳ Criando conta...'; }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha, celular })
            });
            const data = await res.json();

            if (!res.ok) {
                if (msgEl) {
                    msgEl.textContent = '❌ ' + extractApiError(data, 'Erro ao registrar conta.');
                    msgEl.className = 'msg-box msg-error';
                    msgEl.style.display = 'block';
                }
                return;
            }

            // Realiza login automático
            const loginRes = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
            const loginData = await loginRes.json();

            if (loginRes.ok) {
                saveSession(loginData.access_token, loginData.user);
                initProfileView();
            } else {
                switchGuestTab('login');
                const loginMsg = document.getElementById('guestLoginMsg');
                if (loginMsg) {
                    loginMsg.textContent = '🎉 Conta criada com sucesso! Faça login.';
                    loginMsg.className = 'msg-box msg-success';
                    loginMsg.style.display = 'block';
                }
            }

        } catch (err) {
            if (msgEl) {
                msgEl.textContent = '❌ Erro de conexão com o servidor.';
                msgEl.className = 'msg-box msg-error';
                msgEl.style.display = 'block';
            }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '✨ Criar Conta e Acessar'; }
        }
    });
}

// ─── ATUALIZAR DADOS DO PERFIL (LOGADO) ──────────────────────────────────────
function setupProfileUpdateForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('profileMsg');
        const nome = document.getElementById('pf-nome')?.value.trim();
        const celular = document.getElementById('pf-celular')?.value.trim() || null;
        const nasc = document.getElementById('pf-nasc')?.value || null;
        const btn = document.getElementById('btn-save-profile');

        if (msg) msg.style.display = 'none';

        if (!nome || nome.length < 2) {
            if (msg) {
                msg.textContent = '⚠️ Digite um nome válido.';
                msg.className = 'msg-box msg-error';
                msg.style.display = 'block';
            }
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

        try {
            const res = await authFetch('/me', {
                method: 'PUT',
                body: JSON.stringify({ nome, celular, data_nascimento: nasc })
            });

            if (res && res.ok) {
                const updatedUser = await res.json();
                saveSession(getToken(), updatedUser);
                fillProfileUI(updatedUser);
                if (msg) {
                    msg.textContent = '✅ Dados atualizados com sucesso!';
                    msg.className = 'msg-box msg-success';
                    msg.style.display = 'block';
                    setTimeout(() => { msg.style.display = 'none'; }, 3000);
                }
            } else {
                if (msg) {
                    msg.textContent = '❌ Não foi possível atualizar os dados.';
                    msg.className = 'msg-box msg-error';
                    msg.style.display = 'block';
                }
            }
        } catch (_) {
            if (msg) {
                msg.textContent = '❌ Erro de conexão ao salvar.';
                msg.className = 'msg-box msg-error';
                msg.style.display = 'block';
            }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar Alterações'; }
        }
    });
}

// ─── AUTO-INICIALIZAÇÃO NO DOM ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initProfileView();
    setupGuestLoginForm();
    setupGuestRegisterForm();
    setupProfileUpdateForm();
});
