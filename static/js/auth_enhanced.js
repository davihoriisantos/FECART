/**
 * auth_enhanced.js — FloodGuard AI
 * Lógica completa de autenticação via Supabase Auth (client-side).
 * Inclui: validações client-side, máscara de celular, força de senha,
 * gerenciamento de sessão Supabase, detecção de dispositivo e redirect inteligente.
 *
 * Dependências (carregadas antes deste ficheiro):
 *   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
 *   2. /static/js/supabaseClient.js  (expõe _supabase, syncSupabaseTokenToLocal)
 */

'use strict';

// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ══════════════════════════════════════════════════════════════════
const AUTH_CONFIG = {
    TOKEN_KEY:               'fg_token',
    USER_KEY:                'fg_user',
    REDIRECT_AFTER_LOGIN:    '/map',
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

if (Device.isMobile) document.documentElement.classList.add('is-mobile');
if (Device.isIOS)    document.documentElement.classList.add('is-ios');

// ══════════════════════════════════════════════════════════════════
// GERENCIAMENTO DE SESSÃO
// ══════════════════════════════════════════════════════════════════
function saveSession(token, _user) {
    // O Supabase persiste a sessão automaticamente.
    // Apenas sincronizamos o access_token para compatibilidade com api.js.
    if (token) {
        localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
        localStorage.setItem('floodguard_token', token);
    }
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
async function logout() {
    try {
        await _supabase.auth.signOut();
    } catch (_) {}
    clearSession();
    window.location.href = AUTH_CONFIG.REDIRECT_AFTER_LOGOUT;
}

// ══════════════════════════════════════════════════════════════════
// FORMULÁRIO DE LOGIN — Supabase Auth
// ══════════════════════════════════════════════════════════════════
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    // Se já logado → redireciona
    if (isLoggedIn()) {
        window.location.href = AUTH_CONFIG.REDIRECT_AFTER_LOGIN;
        return;
    }

    // Limpa autocomplete do navegador
    setTimeout(() => {
        const emailInput = document.getElementById('login-email');
        const passInput  = document.getElementById('login-senha');
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
            const { data, error } = await _supabase.auth.signInWithPassword({
                email,
                password: senha,
            });

            if (error) {
                // Traduz mensagens comuns do Supabase
                const msg = error.message.toLowerCase().includes('invalid')
                    ? '❌ E-mail ou senha incorretos.'
                    : `❌ ${error.message}`;
                showMsg('loginMsg', msg);
                return;
            }

            // Sincroniza token para compatibilidade com api.js (FastAPI Render)
            syncSupabaseTokenToLocal(data.session.access_token);
            showMsg('loginMsg', '✅ Login realizado! Redirecionando...', 'success');
            setTimeout(() => { window.location.href = AUTH_CONFIG.REDIRECT_AFTER_LOGIN; }, 900);

        } catch (err) {
            showMsg('loginMsg', '❌ Erro de conexão. Tente novamente.');
            console.error('[FloodGuard Auth] Login error:', err);
        } finally {
            setLoading('btn-submit-login', false, '🔐 Entrar no Sistema');
        }
    });
}

// ══════════════════════════════════════════════════════════════════
// FORMULÁRIO DE CADASTRO — Supabase Auth + tabela profiles
// ══════════════════════════════════════════════════════════════════
function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

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

        // Validações client-side
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
            // 1. Criar conta no Supabase Auth
            const { data: signUpData, error: signUpError } = await _supabase.auth.signUp({
                email,
                password: senha,
                options: {
                    data: { nome }, // Armazenado em raw_user_meta_data (usado pelo trigger)
                }
            });

            if (signUpError) {
                let errMsg = signUpError.message;
                if (errMsg.toLowerCase().includes('already registered')) {
                    errMsg = 'Este e-mail já está cadastrado. Faça login.';
                }
                showMsg('registerMsg', `❌ ${errMsg}`);
                return;
            }

            const userId = signUpData.user?.id;

            // 2. Salvar dados extras na tabela profiles (celular, data_nascimento)
            if (userId) {
                const profilePayload = { id: userId, nome };
                if (celular) profilePayload.celular = celular.replace(/\D/g, '');
                if (nasc)    profilePayload.data_nascimento = nasc;

                await _supabase.from('profiles').upsert(profilePayload);
            }

            // 3. Auto-login após cadastro
            if (signUpData.session) {
                // Supabase retornou sessão imediata (confirm email desabilitado)
                syncSupabaseTokenToLocal(signUpData.session.access_token);
                showMsg('registerMsg', '🎉 Conta criada! Redirecionando...', 'success');
                setTimeout(() => { window.location.href = AUTH_CONFIG.REDIRECT_AFTER_LOGIN; }, 1000);
            } else {
                // Email de confirmação ativado — orientar o utilizador
                showMsg('registerMsg', '✅ Conta criada! Verifique seu e-mail para confirmar o cadastro.', 'success');
                setTimeout(() => switchAuthTab('login'), 3000);
            }

        } catch (err) {
            showMsg('registerMsg', '❌ Erro de conexão. Tente novamente.');
            console.error('[FloodGuard Auth] Register error:', err);
        } finally {
            setLoading('btn-submit-reg', false, '✨ Criar Conta e Acessar');
        }
    });
}

// ══════════════════════════════════════════════════════════════════
// PÁGINA DE PERFIL — TABS
// ══════════════════════════════════════════════════════════════════
function switchProfileTab(tab) {
    ['dados', 'atividade', 'historico'].forEach(t => {
        document.getElementById(`panel-${t}`)?.classList.toggle('active', t === tab);
        document.getElementById(`ptab-${t}`)?.classList.toggle('active', t === tab);
    });

    if (tab === 'historico' && typeof renderProfileHistory === 'function') {
        renderProfileHistory();
    }
}

// ══════════════════════════════════════════════════════════════════
// PÁGINA DE PERFIL — INIT (Supabase profiles)
// ══════════════════════════════════════════════════════════════════
async function initProfilePage() {
    if (!isLoggedIn()) {
        window.location.href = AUTH_CONFIG.REDIRECT_TO_LOGIN;
        return;
    }

    try {
        // Obtém o utilizador autenticado do Supabase
        const { data: { user }, error: userError } = await _supabase.auth.getUser();
        if (userError || !user) { logout(); return; }

        // Busca dados da tabela profiles
        const { data: profile, error: profileError } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // Mescla dados do auth com o profile
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

        fillProfileUI(merged);
    } catch (err) {
        console.error('[FloodGuard Auth] initProfilePage error:', err);
        if (!isLoggedIn()) logout();
    }

    initProfileForm();
    applyPhoneMask(document.getElementById('pf-celular'));
    setupPasswordStrength('pw-nova', 'pw2-strength-fill', 'pw2-strength-label', 'pw2-strength-container');
}

function fillProfileUI(user) {
    const initial = (user.nome || '?')[0].toUpperCase();
    const avatar  = document.getElementById('hero-avatar');
    const name    = document.getElementById('hero-name');
    const email   = document.getElementById('hero-email');
    const roleEl  = document.getElementById('hero-role');
    if (avatar) avatar.textContent = initial;
    if (name)   name.textContent  = user.nome || '—';
    if (email)  email.textContent = user.email || '—';
    if (roleEl) roleEl.innerHTML  = `<span class="role-badge">⚙️ ${user.role || 'cidadão'}</span>`;

    setVal('pf-nome',    user.nome);
    setVal('pf-email',   user.email);
    setVal('pf-celular', user.celular || '');
    setVal('pf-nasc',    user.data_nascimento || '');
    setVal('pf-role',    user.role || 'cidadão');

    setTxt('act-id',         '#' + (user.id?.toString().slice(0, 8) || '—'));
    setTxt('act-created',    formatDate(user.created_at));
    setTxt('act-last-login', formatDate(user.last_login));
    setTxt('act-nasc',       formatDateBR(user.data_nascimento));
    setTxt('act-celular',    user.celular || 'Não cadastrado');
    setTxt('act-role',       user.role || 'cidadão');

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
// FORMULÁRIO DE EDIÇÃO DE PERFIL (Supabase profiles)
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
            const { data: { user } } = await _supabase.auth.getUser();
            if (!user) { showMsg('profileMsg', '❌ Sessão expirada. Faça login novamente.'); return; }

            const payload = { id: user.id, nome };
            if (celular !== null) payload.celular = celular.replace(/\D/g, '');
            if (nasc !== null)    payload.data_nascimento = nasc;

            const { error } = await _supabase.from('profiles').upsert(payload);

            if (error) {
                showMsg('profileMsg', `❌ ${error.message || 'Erro ao salvar.'}`);
                return;
            }

            showMsg('profileMsg', '✅ Perfil atualizado com sucesso!', 'success');

            // Atualiza a UI com os novos dados
            fillProfileUI({
                id:              user.id,
                email:           user.email,
                nome,
                celular:         payload.celular || null,
                data_nascimento: nasc || null,
                role:            user.user_metadata?.role || 'cidadão',
                ativo:           true,
                created_at:      user.created_at,
                last_login:      user.last_sign_in_at,
            });
        } catch (err) {
            showMsg('profileMsg', '❌ Erro de conexão.');
            console.error('[FloodGuard Auth] Profile update error:', err);
        } finally {
            setLoading('btn-save-profile', false, '💾 Salvar Alterações');
        }
    });
}

// ══════════════════════════════════════════════════════════════════
// initPasswordForm — mantido como stub seguro (pwForm foi removido do HTML)
// ══════════════════════════════════════════════════════════════════
function initPasswordForm() {
    // O formulário pwForm foi descontinuado. Esta função existe por compatibilidade.
}

// ══════════════════════════════════════════════════════════════════
// AUTO-INIT ao carregar DOM
// ══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('login')) {
        initLoginForm();
        initRegisterForm();
        if (new URLSearchParams(window.location.search).get('tab') === 'register') {
            switchAuthTab('register');
        }
    }
    // profile.html é inicializado via <script> inline na própria página
});
