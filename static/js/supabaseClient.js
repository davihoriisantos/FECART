/**
 * supabaseClient.js — FloodGuard AI
 * Inicializa o cliente Supabase para autenticação client-side e
 * acesso às tabelas `profiles` e `search_history`.
 *
 * Este arquivo deve ser carregado APÓS o SDK do Supabase (CDN) e
 * ANTES de qualquer script de autenticação (auth.js / auth_enhanced.js).
 *
 * Dependência no <head>:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="/static/js/supabaseClient.js"></script>
 */

const SUPABASE_URL = 'https://fvfkrhmyqdymqywwlkon.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iF_NuRm9aCAV2C-aCWOqBQ_G44M3Gdg';

// Obtém o construtor do SDK de forma segura (global ou window)
const _sbSdk = (typeof supabase !== 'undefined' && supabase?.createClient) 
    ? supabase 
    : (typeof window !== 'undefined' && window.supabase?.createClient) 
        ? window.supabase 
        : null;

let _supabaseInstance = null;

if (_sbSdk) {
    _supabaseInstance = _sbSdk.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: true,
            detectSessionInUrl: true,
            storageKey: 'sb-fvfkrhmyqdymqywwlkon-auth-token',
        }
    });
} else {
    console.error('[FloodGuard] SDK do Supabase não foi carregado. Verifique a conexão com a CDN.');
}

// _supabase é a instância global utilizada por auth.js, auth_enhanced.js,
// historico_buscas.js e map_dashboard.js
const _supabase = _supabaseInstance;
window._supabase = _supabaseInstance;

/**
 * Retorna o access_token atual da sessão Supabase.
 * Compatível com o padrão fg_token usado pelo api.js.
 * @returns {string|null}
 */
async function getSupabaseToken() {
    try {
        if (!_supabase) return null;
        const { data: { session } } = await _supabase.auth.getSession();
        return session?.access_token || null;
    } catch (_) {
        return null;
    }
}
window.getSupabaseToken = getSupabaseToken;

/**
 * Retorna o user_id (UUID) do usuário logado no Supabase.
 * @returns {string|null}
 */
async function getSupabaseUserId() {
    try {
        if (!_supabase) return null;
        const { data: { user } } = await _supabase.auth.getUser();
        return user?.id || null;
    } catch (_) {
        return null;
    }
}
window.getSupabaseUserId = getSupabaseUserId;

/**
 * Sincroniza o token do Supabase com a chave fg_token no localStorage,
 * garantindo compatibilidade com o api.js (FastAPI Render para zonas/sensores).
 * Deve ser chamado após cada login/signup.
 * @param {string} accessToken
 */
function syncSupabaseTokenToLocal(accessToken) {
    if (!accessToken) return;
    localStorage.setItem('fg_token', accessToken);
    localStorage.setItem('floodguard_token', accessToken);
}
window.syncSupabaseTokenToLocal = syncSupabaseTokenToLocal;

if (_supabase) {
    // Ao carregar, sincroniza a sessão existente (ex: refresh de página)
    _supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
            syncSupabaseTokenToLocal(session.access_token);
        }
    }).catch(() => {});

    // Listener: atualiza fg_token automaticamente quando a sessão mudar (refresh de token)
    _supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.access_token) {
                syncSupabaseTokenToLocal(session.access_token);
            }
        }
        if (event === 'SIGNED_OUT') {
            localStorage.removeItem('fg_token');
            localStorage.removeItem('floodguard_token');
        }
    });
}
