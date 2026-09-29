/**
 * auth.js — FloodGuard AI
 * Sistema de Autenticação e Perfil de Utilizador para profile.html.
 * Migrado para Supabase Auth + tabela `profiles` (client-side).
 *
 * Dependências (carregadas antes deste ficheiro):
 *   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
 *   2. /static/js/supabaseClient.js  (expõe _supabase, syncSupabaseTokenToLocal)
 *
 * Regras principais:
 * 1. Utilizador Logado: Verifica sessão Supabase. Se ativa, exibe painel do utilizador.
 * 2. Não Logado: Redireciona para /login.
 * 3. Preservação de Dados: Não desloga em erro temporário de rede.
 */

'use strict';

const AUTH_KEYS = {
    TOKEN:        'fg_token',
    TOKEN_LEGACY: 'floodguard_token',
    USER:         'fg_user'
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
    if (typeof data.message === 'string') return data.message;
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
    try { sessionStorage.removeItem('fg_notif_prompt_dismissed'); } catch (_) {}
}

function clearSession() {
    localStorage.removeItem(AUTH_KEYS.TOKEN);
    localStorage.removeItem(AUTH_KEYS.TOKEN_LEGACY);
    localStorage.removeItem(AUTH_KEYS.USER);
    currentUserState = null;
    currentProfileState = { saved_places: { home: null, work: null }, history: [] };
    try { sessionStorage.removeItem('fg_notif_prompt_dismissed'); } catch (_) {}
}

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
async function logout() {
    if (!confirm('Deseja realmente sair da sua conta?')) return;
    try { await _supabase.auth.signOut(); } catch (_) {}
    clearSession();
    window.location.href = '/login';
}

// ─── LOCAIS SALVOS DO UTILIZADOR ─────────────────────────────────────────────
function getSavedPlaces() {
    const places = currentProfileState.saved_places || {};
    const normalize = (place, label) => place ? {
        ...place,
        nome: place.nome || place.address || label,
        bairro: place.bairro || 'São Paulo - SP'
    } : null;
    return {
        home: normalize(places.home, 'Casa'),
        work: normalize(places.work, 'Trabalho')
    };
}

function renderSavedPlaces() {
    const container = document.getElementById('profile-saved-places-list');
    if (!container) return;

    const places = getSavedPlaces();

    const buildPlaceCard = (type, icon, label, place) => {
        const inputId = `pf-input-${type}`;
        const currentVal = place ? (place.nome || place.address || '') : '';
        const hasPlace = !!place;

        return `
            <div class="info-card" style="padding: 20px; border-radius: 14px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="font-weight: 800; font-size: 16px; color: #FFFFFF; display: flex; align-items: center; gap: 8px;">
                        <span>${icon}</span> ${label}
                    </div>
                    ${hasPlace
                        ? '<span style="font-size: 11px; background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.3); padding: 3px 8px; border-radius: 6px; font-weight: 700;">🟢 Ativo</span>'
                        : '<span style="font-size: 11px; background: rgba(255,255,255,0.05); color: #94A3B8; padding: 3px 8px; border-radius: 6px;">Não definido</span>'
                    }
                </div>
                <div style="font-size: 13px; color: ${hasPlace ? '#38BDF8' : '#64748B'}; font-weight: 600; margin-bottom: 4px;">
                    ${hasPlace ? currentVal : `Nenhum endereço de ${label} configurado`}
                </div>
                <div style="font-size: 11px; color: #94A3B8; margin-bottom: 16px;">
                    ${hasPlace ? (place.bairro || 'São Paulo - SP') : `Defina seu endereço de ${label} para monitoramento contínuo`}
                </div>

                <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                    <input type="text" id="${inputId}" placeholder="Ex: ${type === 'home' ? 'Rua Manoel Dutra, 536' : 'Av. Paulista, 1000'}"
                        value="${currentVal.replace(/"/g, '&quot;')}"
                        class="form-input" style="padding: 8px 12px; font-size: 12px; flex: 1;">
                    <button type="button" onclick="salvarLocalPeloPerfil('${type}')" class="btn-save" style="padding: 8px 14px; font-size: 12px; white-space: nowrap;">
                        💾 Salvar
                    </button>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                    ${hasPlace ? `
                        <a href="/map" onclick="sessionStorage.setItem('fg_target_search', '${JSON.stringify({
                            lat: place.lat, lon: place.lon,
                            nome: place.nome || label,
                            bairro: place.bairro
                        }).replace(/"/g, '&quot;')}')" class="btn-save"
                            style="text-decoration:none; padding: 6px 12px; font-size: 11px; display:inline-flex; align-items:center; gap:4px;">
                            🗺️ Ver no Mapa
                        </a>
                        <button type="button" onclick="removerLocalPeloPerfil('${type}')"
                            style="background: transparent; border: 1px solid rgba(239,68,68,0.3); color: #FCA5A5; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 8px; cursor: pointer;">
                            🗑️ Remover
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    };

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 24px;">
            ${buildPlaceCard('home', '🏠', 'Casa',     places.home)}
            ${buildPlaceCard('work', '💼', 'Trabalho', places.work)}
        </div>
    `;
}

// ─── SALVAR LOCAL PELO PERFIL (Supabase profiles) ────────────────────────────
async function salvarLocalPeloPerfil(type) {
    const input = document.getElementById(`pf-input-${type}`);
    const val   = input ? input.value.trim() : '';
    const label = type === 'home' ? 'Casa' : 'Trabalho';

    if (!val) { alert(`Por favor, digite o endereço de ${label}.`); return; }

    // Geocodificação via Nominatim
    let lat = -23.5505, lon = -46.6333;
    const vLower = val.toLowerCase();

    if (vLower.includes('fecart') || vLower.includes('fecap')) {
        lat = -23.5574; lon = -46.6367;
    } else {
        try {
            const nomRes = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val + ' São Paulo')}&limit=1&countrycodes=br`,
                { headers: { 'Accept-Language': 'pt-BR' } }
            );
            if (nomRes.ok) {
                const nomData = await nomRes.json();
                if (nomData?.length > 0 && nomData[0].lat) {
                    lat = Number(nomData[0].lat);
                    lon = Number(nomData[0].lon);
                }
            }
        } catch (_) {}
    }

    const placeData = { lat, lon, nome: val, address: val, bairro: 'São Paulo - SP', alt: null };

    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) { alert('Sessão expirada. Faça login novamente.'); return; }

        const prefix = type;
        const { error } = await _supabase
            .from('profiles')
            .upsert({
                id:                    user.id,
                [`${prefix}_address`]: val,
                [`${prefix}_lat`]:     lat,
                [`${prefix}_lon`]:     lon,
                [`${prefix}_nome`]:    val,
                [`${prefix}_bairro`]:  'São Paulo - SP',
                [`${prefix}_alt`]:     null,
            });

        if (error) {
            alert(`❌ Não foi possível salvar ${label}: ${error.message}`);
            return;
        }

        // Atualiza cache local
        const currentCache = JSON.parse(localStorage.getItem('fg_saved_places') || '{"home":null,"work":null}');
        currentCache[type] = placeData;
        localStorage.setItem('fg_saved_places', JSON.stringify(currentCache));

        // Atualiza estado e re-renderiza
        currentProfileState.saved_places[type] = placeData;
        renderSavedPlaces();
        alert(`✅ ${label} salva com sucesso!`);

    } catch (e) {
        console.error('[Profile] Erro ao salvar local:', e);
        alert('Erro ao conectar. Tente novamente.');
    }
}

// ─── REMOVER LOCAL PELO PERFIL (Supabase profiles) ───────────────────────────
async function removerLocalPeloPerfil(type) {
    const label = type === 'home' ? 'Casa' : 'Trabalho';
    if (!confirm(`Deseja remover ${label} dos seus locais salvos?`)) return;

    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return;

        const prefix = type;
        const { error } = await _supabase
            .from('profiles')
            .update({
                [`${prefix}_address`]: null,
                [`${prefix}_lat`]:     null,
                [`${prefix}_lon`]:     null,
                [`${prefix}_nome`]:    null,
                [`${prefix}_bairro`]:  null,
                [`${prefix}_alt`]:     null,
            })
            .eq('id', user.id);

        if (error) { alert(`❌ Não foi possível remover ${label}.`); return; }

        // Atualiza cache local
        const currentCache = JSON.parse(localStorage.getItem('fg_saved_places') || '{"home":null,"work":null}');
        currentCache[type] = null;
        localStorage.setItem('fg_saved_places', JSON.stringify(currentCache));

        currentProfileState.saved_places[type] = null;
        renderSavedPlaces();
        alert(`🗑️ ${label} removida com sucesso.`);

    } catch (e) {
        console.error('[Profile] Erro ao remover local:', e);
    }
}

// ─── RENDERIZAÇÃO DE DADOS DO PERFIL ─────────────────────────────────────────
function fillProfileUI(user) {
    if (!user) return;

    const initial = (user.nome || user.email || '?')[0].toUpperCase();
    const avatar  = document.getElementById('hero-avatar');
    const name    = document.getElementById('hero-name');
    const email   = document.getElementById('hero-email');
    const roleEl  = document.getElementById('hero-role');

    if (avatar) avatar.textContent = initial;
    if (name)   name.textContent  = user.nome || 'Utilizador FloodGuard';
    if (email)  email.textContent = user.email || '—';
    if (roleEl) roleEl.innerHTML  = `<span class="role-badge">🛡️ ${user.role || 'Cidadão'}</span>`;

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };

    setVal('pf-nome',    user.nome);
    setVal('pf-email',   user.email);
    setVal('pf-celular', user.celular || '');
    setVal('pf-nasc',    user.data_nascimento || '');
    setVal('pf-role',    user.role || 'Cidadão');

    setTxt('act-id',         '#' + (String(user.id || '—').slice(0, 8)));
    setTxt('act-created',    user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—');
    setTxt('act-last-login', user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : 'Hoje');
    setTxt('act-nasc',       user.data_nascimento || 'Não informada');
    setTxt('act-celular',    user.celular || 'Não cadastrado');
    setTxt('act-role',       user.role || 'Cidadão');

    const statusEl = document.getElementById('act-status');
    if (statusEl) {
        statusEl.innerHTML = user.ativo !== false
            ? '<span class="status-pill ativo" style="color:#10B981; font-weight:700;">🟢 Ativa</span>'
            : '<span class="status-pill inativo" style="color:#EF4444; font-weight:700;">🔴 Inativa</span>';
    }

    renderSavedPlaces();

    if (typeof renderProfileHistory === 'function') {
        renderProfileHistory();
    }
}

// ─── ALTERNÂNCIA DE ABAS ──────────────────────────────────────────────────────
function switchProfileTab(tab) {
    ['dados', 'locais', 'historico', 'atividade'].forEach(t => {
        document.getElementById(`panel-${t}`)?.classList.toggle('active', t === tab);
        document.getElementById(`ptab-${t}`)?.classList.toggle('active', t === tab);
    });

    if (tab === 'locais') {
        renderSavedPlaces();
    } else if (tab === 'historico' && typeof renderProfileHistory === 'function') {
        renderProfileHistory();
    }
}

function switchGuestTab(tab) {
    const btnLogin    = document.getElementById('guest-tab-login');
    const btnRegister = document.getElementById('guest-tab-register');
    const panelLogin  = document.getElementById('guest-panel-login');
    const panelReg    = document.getElementById('guest-panel-register');
    if (!btnLogin || !panelLogin) return;

    if (tab === 'register') {
        btnLogin.classList.remove('active');    btnRegister?.classList.add('active');
        panelLogin.style.display = 'none';     if (panelReg) panelReg.style.display = 'block';
    } else {
        btnRegister?.classList.remove('active'); btnLogin.classList.add('active');
        if (panelReg) panelReg.style.display = 'none'; panelLogin.style.display = 'block';
    }
}

function toggleEye(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    if (btn) btn.textContent = isPassword ? '🙈' : '👁️';
}

// ─── INICIALIZADOR PRINCIPAL DA TELA DE PERFIL (Supabase) ────────────────────
async function initProfileView() {
    if (!isLoggedIn()) {
        window.location.replace('/login');
        return;
    }

    const loggedInView   = document.getElementById('profile-logged-view');
    const guestView      = document.getElementById('profile-guest-view');
    const btnLogoutHdr   = document.getElementById('btn-header-logout');

    if (!loggedInView) return;

    try {
        // Obtém o utilizador autenticado do Supabase
        const { data: { user }, error: userErr } = await _supabase.auth.getUser();
        if (userErr || !user) {
            clearSession();
            window.location.replace('/login');
            return;
        }

        // Busca dados da tabela profiles
        const { data: profile } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // Monta o objecto unificado
        const merged = {
            id:              user.id,
            email:           user.email,
            nome:            profile?.nome || user.user_metadata?.nome || user.email,
            celular:         profile?.celular || null,
            data_nascimento: profile?.data_nascimento || null,
            role:            user.user_metadata?.role || 'cidadão',
            ativo:           true,
            created_at:      user.created_at,
            last_login:      user.last_sign_in_at,
        };

        // Carrega locais salvos do profile para o estado local
        currentProfileState.saved_places = {
            home: (profile?.home_lat != null) ? {
                lat:     profile.home_lat,
                lon:     profile.home_lon,
                nome:    profile.home_nome    || profile.home_address || 'Casa',
                address: profile.home_address || profile.home_nome    || 'Casa',
                bairro:  profile.home_bairro  || 'São Paulo - SP',
                alt:     profile.home_alt     || null,
            } : null,
            work: (profile?.work_lat != null) ? {
                lat:     profile.work_lat,
                lon:     profile.work_lon,
                nome:    profile.work_nome    || profile.work_address || 'Trabalho',
                address: profile.work_address || profile.work_nome    || 'Trabalho',
                bairro:  profile.work_bairro  || 'São Paulo - SP',
                alt:     profile.work_alt     || null,
            } : null,
        };

        currentUserState = merged;
        saveSession(getToken(), merged);
        fillProfileUI(merged);

        loggedInView.style.display = 'block';
        if (guestView) guestView.style.display = 'none';
        if (btnLogoutHdr) btnLogoutHdr.style.display = 'inline-block';

    } catch (e) {
        console.error('[Profile] Erro ao carregar perfil:', e);
        clearSession();
        window.location.replace('/login');
    }
}

// ─── FORMULÁRIOS DO MODO VISITANTE (Supabase Auth) ───────────────────────────
function setupGuestLoginForm() {
    const form = document.getElementById('guestLoginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgEl = document.getElementById('guestLoginMsg');
        const email = document.getElementById('guest-login-email')?.value.trim();
        const senha = document.getElementById('guest-login-senha')?.value;
        const btn   = document.getElementById('btn-guest-login');

        if (msgEl) msgEl.style.display = 'none';
        if (!email || !senha) {
            if (msgEl) { msgEl.textContent = '⚠️ Preencha e-mail e senha.'; msgEl.className = 'msg-box msg-error'; msgEl.style.display = 'block'; }
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = '⏳ Entrando...'; }
        try {
            const { data, error } = await _supabase.auth.signInWithPassword({ email, password: senha });
            if (error) {
                if (msgEl) {
                    const msg = error.message.toLowerCase().includes('invalid') ? 'E-mail ou senha incorretos.' : error.message;
                    msgEl.textContent = `❌ ${msg}`; msgEl.className = 'msg-box msg-error'; msgEl.style.display = 'block';
                }
                return;
            }
            syncSupabaseTokenToLocal(data.session.access_token);
            initProfileView();
        } catch {
            if (msgEl) { msgEl.textContent = '❌ Erro de conexão.'; msgEl.className = 'msg-box msg-error'; msgEl.style.display = 'block'; }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '🔐 Entrar no Sistema'; }
        }
    });
}

function setupGuestRegisterForm() {
    const form = document.getElementById('guestRegisterForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgEl  = document.getElementById('guestRegMsg');
        const nome   = document.getElementById('guest-reg-nome')?.value.trim();
        const email  = document.getElementById('guest-reg-email')?.value.trim();
        const celular = document.getElementById('guest-reg-celular')?.value.trim() || null;
        const senha  = document.getElementById('guest-reg-senha')?.value;
        const btn    = document.getElementById('btn-guest-reg');

        if (msgEl) msgEl.style.display = 'none';
        if (!nome || !email || !senha) {
            if (msgEl) { msgEl.textContent = '⚠️ Preencha os campos obrigatórios (*).'; msgEl.className = 'msg-box msg-error'; msgEl.style.display = 'block'; }
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = '⏳ Criando conta...'; }
        try {
            const { data: signUpData, error: signUpErr } = await _supabase.auth.signUp({
                email, password: senha, options: { data: { nome } }
            });
            if (signUpErr) {
                if (msgEl) { msgEl.textContent = `❌ ${signUpErr.message}`; msgEl.className = 'msg-box msg-error'; msgEl.style.display = 'block'; }
                return;
            }
            // Salva dados extras
            if (signUpData.user?.id) {
                const profilePayload = { id: signUpData.user.id, nome };
                if (celular) profilePayload.celular = celular.replace(/\D/g, '');
                await _supabase.from('profiles').upsert(profilePayload);
            }

            if (signUpData.session) {
                syncSupabaseTokenToLocal(signUpData.session.access_token);
                initProfileView();
            } else {
                switchGuestTab('login');
                const loginMsg = document.getElementById('guestLoginMsg');
                if (loginMsg) { loginMsg.textContent = '🎉 Conta criada! Verifique seu e-mail e faça login.'; loginMsg.className = 'msg-box msg-success'; loginMsg.style.display = 'block'; }
            }
        } catch {
            if (msgEl) { msgEl.textContent = '❌ Erro de conexão.'; msgEl.className = 'msg-box msg-error'; msgEl.style.display = 'block'; }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '✨ Criar Conta e Acessar'; }
        }
    });
}

// ─── FORMULÁRIO DE ACTUALIZAÇÃO DE PERFIL (Supabase profiles) ────────────────
function setupProfileUpdateForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg    = document.getElementById('profileMsg');
        const nome   = document.getElementById('pf-nome')?.value.trim();
        const celular = document.getElementById('pf-celular')?.value.trim() || null;
        const nasc   = document.getElementById('pf-nasc')?.value || null;
        const btn    = document.getElementById('btn-save-profile');

        if (msg) msg.style.display = 'none';
        if (!nome || nome.length < 2) {
            if (msg) { msg.textContent = '⚠️ Digite um nome válido.'; msg.className = 'msg-box msg-error'; msg.style.display = 'block'; }
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }
        try {
            const { data: { user } } = await _supabase.auth.getUser();
            if (!user) return;

            const payload = { id: user.id, nome };
            if (celular !== null) payload.celular = celular.replace(/\D/g, '');
            if (nasc !== null)    payload.data_nascimento = nasc;

            const { error } = await _supabase.from('profiles').upsert(payload);
            if (error) {
                if (msg) { msg.textContent = `❌ ${error.message}`; msg.className = 'msg-box msg-error'; msg.style.display = 'block'; }
                return;
            }

            const updatedUser = { ...currentUserState, nome, celular: payload.celular || null, data_nascimento: nasc || null };
            currentUserState = updatedUser;
            fillProfileUI(updatedUser);

            if (msg) {
                msg.textContent = '✅ Dados atualizados com sucesso!';
                msg.className = 'msg-box msg-success';
                msg.style.display = 'block';
                setTimeout(() => { msg.style.display = 'none'; }, 3000);
            }
        } catch {
            if (msg) { msg.textContent = '❌ Erro de conexão ao salvar.'; msg.className = 'msg-box msg-error'; msg.style.display = 'block'; }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar Alterações'; }
        }
    });
}

// ─── AUTO-INICIALIZAÇÃO NO DOM ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initProfileView();
    setupGuestLoginForm();
    setupGuestRegisterForm();
    setupProfileUpdateForm();
});
