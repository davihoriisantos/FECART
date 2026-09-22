/**
 * auth_enhanced.js — FloodGuard AI
 * Lógica completa de autenticação e gerenciamento de perfil.
 * Inclui: validações client-side, máscara de celular, força de senha,
 * gerenciamento de token JWT, detecção de dispositivo e redirect inteligente.
 */

'use strict';

// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ══════════════════════════════════════════════════════════════════
const AUTH_CONFIG = {
    API_BASE:    '/api/auth',
    TOKEN_KEY:   'fg_token',
    USER_KEY:    'fg_user',
    REDIRECT_AFTER_LOGIN:    '/static/map.html',
    REDIRECT_AFTER_LOGOUT:   '/login',
    REDIRECT_TO_LOGIN:       '/login',
};

// ══════════════════════════════════════════════════════════════════
// DETECÇÃO DE DISPOSITIVO
// ══════════════════════════════════════════════════════════════════
const Device = (() => {
    const ua       = navigator.userAgent || '';
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(ua)
                     || window.matchMedia('(max-width: 768px)').matches;
    const isTouch  = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    const isIOS    = /iPhone|iPad|iPod/.test(ua);
    return { isMobile, isTouch, isIOS };
})();

// Adiciona classe ao <html> para uso via CSS
if (Device.isMobile) document.documentElement.classList.add('is-mobile');
if (Device.isIOS)    document.documentElement.classList.add('is-ios');

// ══════════════════════════════════════════════════════════════════
// GERENCIAMENTO DE TOKEN / SESSÃO
// ══════════════════════════════════════════════════════════════════
function saveSession(token, user) {
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
    // Mantém compatibilidade com módulos antigos que ainda usam esta chave.
    localStorage.setItem('floodguard_token', token);
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
}

function clearSession() {
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem('floodguard_token');
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
}

function getToken() {
    return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY) || null;
}

function getCurrentUser() {
    return null;
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

// ══════════════════════════════════════════════════════════════════
// REQUISIÇÕES AUTENTICADAS
// ══════════════════════════════════════════════════════════════════
async function authFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };
    const res = await fetch(AUTH_CONFIG.API_BASE + endpoint, { ...options, headers });
    if (res.status === 401) {
        // Preservação de Dados: Não desloga automaticamente até clique em Sair
        return null;
    }
    return res;
}

// ══════════════════════════════════════════════════════════════════
// VALIDAÇÕES CLIENT-SIDE
// ══════════════════════════════════════════════════════════════════
const PHONE_RE  = /^\d{10,11}$/;
const STRONG_PW = /^(?=.*[A-Za-z])(?=.*\d)[\s\S]{8,}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(v)    { return EMAIL_RE.test((v || '').trim()); }
function validatePhone(v)    { return !v || v.trim() === '' || PHONE_RE.test(v.replace(/\D/g, '')); }
function validatePassword(v) { return STRONG_PW.test(v || ''); }

function showFieldError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
}

function clearFieldErrors(...ids) {
    ids.forEach(id => showFieldError(id, ''));
}

function markInput(inputId, isValid) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.classList.toggle('valid',   isValid);
    el.classList.toggle('invalid', !isValid);
}

// ══════════════════════════════════════════════════════════════════
// MÁSCARA DE CELULAR  (XX) XXXXX-XXXX
// ══════════════════════════════════════════════════════════════════
function phoneMask(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2)  return digits.length ? `(${digits}` : '';
    if (digits.length <= 6)  return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}

function applyPhoneMask(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener('input', () => {
        const pos   = inputEl.selectionStart;
        const prev  = inputEl.value.length;
        inputEl.value = phoneMask(inputEl.value);
        const delta = inputEl.value.length - prev;
        inputEl.setSelectionRange(pos + delta, pos + delta);
    });
}

// ══════════════════════════════════════════════════════════════════
// INDICADOR DE FORÇA DE SENHA
// ══════════════════════════════════════════════════════════════════
function passwordStrength(v) {
    if (!v) return { score: 0, label: '', color: '' };
    let score = 0;
    if (v.length >= 8)  score++;
    if (v.length >= 12) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    if (score <= 1) return { score, label: '🔴 Senha fraca',    color: '#EF4444', pct: 20 };
    if (score <= 2) return { score, label: '🟠 Senha razoável', color: '#F97316', pct: 45 };
    if (score <= 3) return { score, label: '🟡 Senha média',    color: '#EAB308', pct: 65 };
    if (score <= 4) return { score, label: '🟢 Senha forte',    color: '#10B981', pct: 85 };
    return { score, label: '✅ Senha muito forte', color: '#06B6D4', pct: 100 };
}

function setupPasswordStrength(inputId, fillId, labelId, containerId) {
    const input     = document.getElementById(inputId);
    const fill      = document.getElementById(fillId);
    const label     = document.getElementById(labelId);
    const container = document.getElementById(containerId);
    if (!input || !fill || !label) return;

    input.addEventListener('input', () => {
        const v = input.value;
        if (!v) { if (container) container.style.display = 'none'; return; }
        if (container) container.style.display = 'block';
        const { pct, color, label: lbl } = passwordStrength(v);
        fill.style.width      = pct + '%';
        fill.style.background = color;
        label.textContent     = lbl;
        label.style.color     = color;
    });
}

// ══════════════════════════════════════════════════════════════════
// TOGGLE OLHO (MOSTRAR/OCULTAR SENHA)
// ══════════════════════════════════════════════════════════════════
function toggleEye(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

// ══════════════════════════════════════════════════════════════════
// ALTERNÂNCIA DE ABAS (LOGIN / CADASTRO)
// ══════════════════════════════════════════════════════════════════
function switchAuthTab(tab) {
    ['login', 'register'].forEach(t => {
        document.getElementById(`panel-${t}`)?.classList.toggle('active', t === tab);
        document.getElementById(`tab-btn-${t}`)?.classList.toggle('active', t === tab);
    });
}

// ══════════════════════════════════════════════════════════════════
// EXIBIR MENSAGEM NOS FORMULÁRIOS
// ══════════════════════════════════════════════════════════════════
function showMsg(id, msg, type = 'error') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className   = `msg-box msg-${type}`;
    el.style.display = 'block';
    if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function hideMsg(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

function setLoading(btnId, loading, originalText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled     = loading;
    btn.textContent  = loading ? '⏳ Aguarde...' : originalText;
}

// ══════════════════════════════════════════════════════════════════
// LOGOUT
// ══════════════════════════════════════════════════════════════════
function logout() {
    clearSession();
    window.location.href = AUTH_CONFIG.REDIRECT_AFTER_LOGOUT;
}

// ══════════════════════════════════════════════════════════════════
// FORMULÁRIO DE LOGIN
// ══════════════════════════════════════════════════════════════════
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    // Se já logado → redireciona
    if (isLoggedIn()) {
        window.location.href = AUTH_CONFIG.REDIRECT_AFTER_LOGIN;
        return;
    }

    // Evita que o navegador preencha automaticamente o último email cadastrado na tela
    setTimeout(() => {
        const emailInput = document.getElementById('login-email');
        const passInput = document.getElementById('login-senha');
        if (emailInput && document.activeElement !== emailInput) emailInput.value = '';
        if (passInput) passInput.value = '';
    }, 50);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMsg('loginMsg');
        const email = document.getElementById('login-email')?.value.trim();
        const senha = document.getElementById('login-senha')?.value;

        if (!validateEmail(email)) {
            showMsg('loginMsg', '⚠️ Digite um e-mail válido.');
            return;
        }

        setLoading('btn-submit-login', true, '🔐 Entrar no Sistema');
        try {
            const res  = await fetch(AUTH_CONFIG.API_BASE + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha }),
            });
            const data = await res.json();
            if (!res.ok) {
                showMsg('loginMsg', '❌ ' + extractApiError(data, 'Erro ao fazer login.'));
                return;
            }
            saveSession(data.access_token, data.user);
            showMsg('loginMsg', '✅ Login realizado! Redirecionando...', 'success');
            setTimeout(() => { window.location.href = AUTH_CONFIG.REDIRECT_AFTER_LOGIN; }, 900);
        } catch {
            showMsg('loginMsg', '❌ Erro de conexão. Tente novamente.');
        } finally {
            setLoading('btn-submit-login', false, '🔐 Entrar no Sistema');
        }
    });
}

// ══════════════════════════════════════════════════════════════════
// FORMULÁRIO DE CADASTRO
// ══════════════════════════════════════════════════════════════════
function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    // Máscara e força de senha
    applyPhoneMask(document.getElementById('reg-celular'));
    setupPasswordStrength('reg-senha', 'pw-strength-fill', 'pw-strength-label', 'pw-strength-container');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors('err-nome', 'err-email', 'err-celular', 'err-senha', 'err-confirm');
        hideMsg('registerMsg');

        const nome    = document.getElementById('reg-nome')?.value.trim();
        const email   = document.getElementById('reg-email')?.value.trim();
        const celular = document.getElementById('reg-celular')?.value.trim() || null;
        const nasc    = document.getElementById('reg-nasc')?.value || null;
        const senha   = document.getElementById('reg-senha')?.value;
        const confirm = document.getElementById('reg-confirm')?.value;

        // Validações
        let hasError = false;
        if (!nome || nome.length < 2) {
            showFieldError('err-nome', 'Nome muito curto.');
            markInput('reg-nome', false); hasError = true;
        }
        if (!validateEmail(email)) {
            showFieldError('err-email', 'E-mail inválido.');
            markInput('reg-email', false); hasError = true;
        }
        if (celular && !validatePhone(celular)) {
            showFieldError('err-celular', 'Formato: (XX) XXXXX-XXXX');
            markInput('reg-celular', false); hasError = true;
        }
        if (!validatePassword(senha)) {
            showFieldError('err-senha', 'Mínimo 8 caracteres com letra e número.');
            markInput('reg-senha', false); hasError = true;
        }
        if (senha !== confirm) {
            showFieldError('err-confirm', 'As senhas não coincidem.');
            markInput('reg-confirm', false); hasError = true;
        }
        if (hasError) return;

        setLoading('btn-submit-reg', true, '✨ Criar Conta e Acessar');
        try {
            const payload = { nome, email, senha };
            if (celular) payload.celular = celular;
            if (nasc)    payload.data_nascimento = nasc;

            const res  = await fetch(AUTH_CONFIG.API_BASE + '/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                showMsg('registerMsg', '❌ ' + extractApiError(data, 'Erro ao criar conta.'));
                return;
            }
            // Auto-login após cadastro
            const loginRes  = await fetch(AUTH_CONFIG.API_BASE + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha }),
            });
            const loginData = await loginRes.json();
            if (loginRes.ok) {
                saveSession(loginData.access_token, loginData.user);
                showMsg('registerMsg', '🎉 Conta criada! Redirecionando...', 'success');
                setTimeout(() => { window.location.href = AUTH_CONFIG.REDIRECT_AFTER_LOGIN; }, 1000);
            } else {
                showMsg('registerMsg', '✅ Conta criada! Faça login.', 'success');
                setTimeout(() => switchAuthTab('login'), 1500);
            }
        } catch {
            showMsg('registerMsg', '❌ Erro de conexão. Tente novamente.');
        } finally {
            setLoading('btn-submit-reg', false, '✨ Criar Conta e Acessar');
        }
    });
}

// ══════════════════════════════════════════════════════════════════
// PÁGINA DE PERFIL — TABS
// ══════════════════════════════════════════════════════════════════
function switchProfileTab(tab) {
    ['dados', 'seguranca', 'atividade', 'historico'].forEach(t => {
        document.getElementById(`panel-${t}`)?.classList.toggle('active', t === tab);
        document.getElementById(`ptab-${t}`)?.classList.toggle('active', t === tab);
    });

    if (tab === 'historico' && typeof renderProfileHistory === 'function') {
        renderProfileHistory();
    }
}

// ══════════════════════════════════════════════════════════════════
// PÁGINA DE PERFIL — INIT
// ══════════════════════════════════════════════════════════════════
async function initProfilePage() {
    // Proteção: redireciona se não logado
    if (!isLoggedIn()) {
        window.location.href = AUTH_CONFIG.REDIRECT_TO_LOGIN;
        return;
    }

    // Preencher com dados do cache enquanto carrega
    const cached = getCurrentUser();
    if (cached) fillProfileUI(cached);

    // Buscar dados frescos da API
    try {
        const res  = await authFetch('/me');
        if (!res) return;
        const user = await res.json();
        if (!res.ok) { logout(); return; }
        saveSession(getToken(), user);
        fillProfileUI(user);
    } catch {
        if (!cached) logout();
    }

    // Inicializar formulários da página de perfil
    initProfileForm();
    initPasswordForm();

    // Máscara de celular no perfil
    applyPhoneMask(document.getElementById('pf-celular'));
    setupPasswordStrength('pw-nova', 'pw2-strength-fill', 'pw2-strength-label', 'pw2-strength-container');
}

function fillProfileUI(user) {
    // Hero
    const initial = (user.nome || '?')[0].toUpperCase();
    const avatar  = document.getElementById('hero-avatar');
    const name    = document.getElementById('hero-name');
    const email   = document.getElementById('hero-email');
    const roleEl  = document.getElementById('hero-role');
    if (avatar) avatar.textContent = initial;
    if (name)   name.textContent  = user.nome || '—';
    if (email)  email.textContent = user.email || '—';
    if (roleEl) roleEl.innerHTML  = `<span class="role-badge">⚙️ ${user.role || 'cidadao'}</span>`;

    // Formulário dados
    setVal('pf-nome',    user.nome);
    setVal('pf-email',   user.email);
    setVal('pf-celular', user.celular || '');
    setVal('pf-nasc',    user.data_nascimento || '');
    setVal('pf-role',    user.role || 'cidadao');

    // Atividade
    setTxt('act-id',         '#' + (user.id || '—'));
    setTxt('act-created',    formatDate(user.created_at));
    setTxt('act-last-login', formatDate(user.last_login));
    setTxt('act-nasc',       formatDateBR(user.data_nascimento));
    setTxt('act-celular',    user.celular || 'Não cadastrado');
    setTxt('act-role',       user.role || 'cidadao');

    const statusEl = document.getElementById('act-status');
    if (statusEl) {
        statusEl.innerHTML = user.ativo
            ? '<span class="status-pill ativo">🟢 Ativa</span>'
            : '<span class="status-pill inativo">🔴 Inativa</span>';
    }
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}
function setTxt(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
}
function formatDate(iso) {
    if (!iso) return 'Nunca';
    try {
        return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch { return iso; }
}
function formatDateBR(dateStr) {
    if (!dateStr) return 'Não informado';
    try {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    } catch { return dateStr; }
}

// ══════════════════════════════════════════════════════════════════
// FORMULÁRIO DE EDIÇÃO DE PERFIL
// ══════════════════════════════════════════════════════════════════
function initProfileForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors('err-pf-nome', 'err-pf-celular');
        hideMsg('profileMsg');

        const nome    = document.getElementById('pf-nome')?.value.trim();
        const celular = document.getElementById('pf-celular')?.value.trim() || null;
        const nasc    = document.getElementById('pf-nasc')?.value || null;

        let hasError = false;
        if (!nome || nome.length < 2) {
            showFieldError('err-pf-nome', 'Nome muito curto.');
            markInput('pf-nome', false); hasError = true;
        }
        if (celular && !validatePhone(celular)) {
            showFieldError('err-pf-celular', 'Formato: (XX) XXXXX-XXXX');
            markInput('pf-celular', false); hasError = true;
        }
        if (hasError) return;

        setLoading('btn-save-profile', true, '💾 Salvar Alterações');
        try {
            const payload = { nome };
            if (celular !== null) payload.celular = celular;
            if (nasc !== null)    payload.data_nascimento = nasc;

            const res  = await authFetch('/me', {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            if (!res) return;
            const data = await res.json();
            if (!res.ok) {
                showMsg('profileMsg', '❌ ' + extractApiError(data, 'Erro ao salvar.'));
                return;
            }
            saveSession(getToken(), data);
            fillProfileUI(data);
            showMsg('profileMsg', '✅ Perfil atualizado com sucesso!', 'success');
        } catch {
            showMsg('profileMsg', '❌ Erro de conexão.');
        } finally {
            setLoading('btn-save-profile', false, '💾 Salvar Alterações');
        }
    });
}

// ══════════════════════════════════════════════════════════════════
// FORMULÁRIO DE TROCA DE SENHA
// ══════════════════════════════════════════════════════════════════
function initPasswordForm() {
    const form = document.getElementById('pwForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors('err-pw-atual', 'err-pw-nova', 'err-pw-confirm');
        hideMsg('pwMsg');

        const atual   = document.getElementById('pw-atual')?.value;
        const nova    = document.getElementById('pw-nova')?.value;
        const confirm = document.getElementById('pw-confirm')?.value;

        let hasError = false;
        if (!atual) {
            showFieldError('err-pw-atual', 'Informe a senha atual.');
            hasError = true;
        }
        if (!validatePassword(nova)) {
            showFieldError('err-pw-nova', 'Mínimo 8 caracteres com letra e número.');
            markInput('pw-nova', false); hasError = true;
        }
        if (nova !== confirm) {
            showFieldError('err-pw-confirm', 'As senhas não coincidem.');
            markInput('pw-confirm', false); hasError = true;
        }
        if (hasError) return;

        setLoading('btn-save-pw', true, '🔐 Alterar Senha');
        try {
            const res  = await authFetch('/me/password', {
                method: 'PUT',
                body: JSON.stringify({ senha_atual: atual, nova_senha: nova }),
            });
            if (!res) return;
            const data = await res.json();
            if (!res.ok) {
                showMsg('pwMsg', '❌ ' + extractApiError(data, 'Erro ao alterar senha.'));
                return;
            }
            showMsg('pwMsg', '✅ Senha alterada! Faça login novamente.', 'success');
            setTimeout(() => logout(), 2500);
        } catch {
            showMsg('pwMsg', '❌ Erro de conexão.');
        } finally {
            setLoading('btn-save-pw', false, '🔐 Alterar Senha');
        }
    });
}

// ══════════════════════════════════════════════════════════════════
// DESATIVAR CONTA
// ══════════════════════════════════════════════════════════════════
function confirmDeactivate() {
    if (!confirm('⚠️ Tem certeza que deseja desativar sua conta?\n\nVocê perderá o acesso ao sistema.')) return;
    authFetch('/me', { method: 'DELETE' }).then(res => {
        if (res && res.ok) {
            alert('Conta desativada. Até logo!');
            logout();
        } else {
            alert('Erro ao desativar conta. Tente novamente.');
        }
    }).catch(() => alert('Erro de conexão.'));
}

// ══════════════════════════════════════════════════════════════════
// AUTO-INIT ao carregar DOM
// ══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // Detectar qual página estamos
    const path = window.location.pathname;

    if (path.includes('login')) {
        initLoginForm();
        initRegisterForm();
        // Verificar se deve abrir aba de cadastro
        if (new URLSearchParams(window.location.search).get('tab') === 'register') {
            switchAuthTab('register');
        }
    }
    // profile.html é inicializado via <script> inline na própria página
});
