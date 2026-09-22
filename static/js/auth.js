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
    // Re-renderiza a página de perfil imediatamente no estado de visitante
    if (typeof initProfileView === 'function') {
        initProfileView();
    } else {
        window.location.href = '/login';
    }
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
    const hasHome = !!places.home;
    const hasWork = !!places.work;

    if (!hasHome && !hasWork) {
        container.innerHTML = `
            <div style="text-align: center; padding: 32px 18px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.12); border-radius: 12px;">
                <div style="font-size: 28px; margin-bottom: 6px;">📍</div>
                <div style="font-weight: 700; color: #F1F5F9; font-size: 14px;">Nenhum local salvo ainda</div>
                <div style="font-size: 12px; color: #94A3B8; margin-top: 4px; margin-bottom: 14px;">
                    No mapa, você pode favoritar os botões <b>🏠 Casa</b> e <b>💼 Trabalho</b> para monitoramento rápido de enchentes.
                </div>
                <a href="/static/map.html" class="btn-save" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; padding: 8px 18px; font-size: 12px;">
                    🗺️ Abrir Mapa e Salvar Locais
                </a>
            </div>
        `;
        return;
    }

    let html = '<div class="info-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">';

    if (hasHome) {
        const p = places.home;
        const targetData = JSON.stringify({ lat: p.lat, lon: p.lon, nome: p.nome || 'Casa', bairro: p.bairro || 'São Paulo - SP' }).replace(/"/g, '&quot;');
        html += `
            <div class="info-card" style="display:flex; justify-content:space-between; align-items:center; padding:16px;">
                <div>
                    <div style="font-weight:800; font-size:15px; color:#FFFFFF; display:flex; align-items:center; gap:6px;">
                        <span>🏠</span> Casa
                    </div>
                    <div style="font-size:12px; color:#38BDF8; margin-top:4px; font-weight:600;">${p.nome || 'Local Definido'}</div>
                    <div style="font-size:11px; color:#94A3B8; margin-top:2px;">${p.bairro || 'São Paulo - SP'}</div>
                </div>
                <a href="/static/map.html" onclick="sessionStorage.setItem('fg_target_search', '${targetData}')" class="btn-save" style="text-decoration:none; padding:8px 14px; font-size:12px; display:inline-flex; align-items:center; gap:4px;">
                    🗺️ Ver no Mapa
                </a>
            </div>
        `;
    }

    if (hasWork) {
        const p = places.work;
        const targetData = JSON.stringify({ lat: p.lat, lon: p.lon, nome: p.nome || 'Trabalho', bairro: p.bairro || 'São Paulo - SP' }).replace(/"/g, '&quot;');
        html += `
            <div class="info-card" style="display:flex; justify-content:space-between; align-items:center; padding:16px;">
                <div>
                    <div style="font-weight:800; font-size:15px; color:#FFFFFF; display:flex; align-items:center; gap:6px;">
                        <span>💼</span> Trabalho
                    </div>
                    <div style="font-size:12px; color:#38BDF8; margin-top:4px; font-weight:600;">${p.nome || 'Local Definido'}</div>
                    <div style="font-size:11px; color:#94A3B8; margin-top:2px;">${p.bairro || 'São Paulo - SP'}</div>
                </div>
                <a href="/static/map.html" onclick="sessionStorage.setItem('fg_target_search', '${targetData}')" class="btn-save" style="text-decoration:none; padding:8px 14px; font-size:12px; display:inline-flex; align-items:center; gap:4px;">
                    🗺️ Ver no Mapa
                </a>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
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
    ['dados', 'locais', 'historico', 'atividade', 'seguranca'].forEach(t => {
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
    const loggedInView = document.getElementById('profile-logged-view');
    const guestView = document.getElementById('profile-guest-view');
    const btnLogoutHeader = document.getElementById('btn-header-logout');

    if (!loggedInView || !guestView) return;

    // 1. VERIFICA SE HÁ SESSÃO ATIVA NO LOCALSTORAGE
    if (isLoggedIn()) {
        // Exibe DIRETO o Painel do Usuário sem mostrar tela de login
        loggedInView.style.display = 'block';
        guestView.style.display = 'none';
        if (btnLogoutHeader) btnLogoutHeader.style.display = 'inline-block';

        // Preenche imediatamente com os dados salvos em cache
        const cachedUser = getCurrentUser();
        if (cachedUser) {
            fillProfileUI(cachedUser);
        }

        // Tenta buscar dados atualizados da API em background (sem deslogar em caso de erro)
        try {
            const res = await authFetch('/api/user/profile');
            if (res && res.ok) {
                const profile = await res.json();
                const updatedUser = profile.user;
                currentProfileState = profile;
                saveSession(getToken(), updatedUser);
                fillProfileUI(updatedUser);
                if (typeof renderProfileHistory === 'function') renderProfileHistory(profile.history || []);
            }
            // NOTA: Se res for 401 ou erro de rede, NÃO deslogamos o usuário automaticamente.
            // Mantemos a conta e o histórico salvos até o clique explícito em Sair.
        } catch (e) {
            console.debug('[Profile] Mantendo sessão local cached:', e);
        }

    } else {
        // 2. USUÁRIO NÃO LOGADO: Exibe formulário com campos vazios por padrão
        loggedInView.style.display = 'none';
        guestView.style.display = 'block';
        if (btnLogoutHeader) btnLogoutHeader.style.display = 'none';

        // Limpa explicitamente os campos por segurança
        ['guest-login-email', 'guest-login-senha', 'guest-reg-nome', 'guest-reg-email', 'guest-reg-senha'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
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
                    msgEl.textContent = '❌ ' + (data.detail || 'E-mail ou senha incorretos.');
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
                    msgEl.textContent = '❌ ' + (data.detail || 'Erro ao registrar conta.');
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

// ─── ALTERAR SENHA (LOGADO) ─────────────────────────────────────────────────
function setupPasswordChangeForm() {
    const form = document.getElementById('pwForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('pwMsg');
        const senha_atual = document.getElementById('pw-atual')?.value;
        const nova_senha = document.getElementById('pw-nova')?.value;
        const confirm = document.getElementById('pw-confirm')?.value;
        const btn = document.getElementById('btn-save-pw');

        if (msg) msg.style.display = 'none';

        if (!senha_atual || !nova_senha) {
            if (msg) {
                msg.textContent = '⚠️ Preencha a senha atual e a nova senha.';
                msg.className = 'msg-box msg-error';
                msg.style.display = 'block';
            }
            return;
        }

        if (nova_senha !== confirm) {
            if (msg) {
                msg.textContent = '⚠️ A confirmação da nova senha não confere.';
                msg.className = 'msg-box msg-error';
                msg.style.display = 'block';
            }
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = '⏳ Alterando...'; }

        try {
            const res = await authFetch('/me/password', {
                method: 'PUT',
                body: JSON.stringify({ senha_atual, nova_senha })
            });

            if (res && res.ok) {
                if (msg) {
                    msg.textContent = '✅ Senha alterada com sucesso!';
                    msg.className = 'msg-box msg-success';
                    msg.style.display = 'block';
                }
                form.reset();
            } else {
                const data = await res.json();
                if (msg) {
                    msg.textContent = '❌ ' + (data.detail || 'Senha atual incorreta.');
                    msg.className = 'msg-box msg-error';
                    msg.style.display = 'block';
                }
            }
        } catch (_) {
            if (msg) {
                msg.textContent = '❌ Erro de conexão ao alterar senha.';
                msg.className = 'msg-box msg-error';
                msg.style.display = 'block';
            }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '🔐 Alterar Senha'; }
        }
    });
}

// ─── AUTO-INICIALIZAÇÃO NO DOM ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initProfileView();
    setupGuestLoginForm();
    setupGuestRegisterForm();
    setupProfileUpdateForm();
    setupPasswordChangeForm();
});
