/**
 * historico_buscas.js — FloodGuard AI
 * Gerencia persistência, consulta e renderização das buscas recentes por utilizador.
 * Utiliza Supabase (tabela `search_history`) em vez do backend FastAPI.
 *
 * Dependências (carregadas antes deste ficheiro):
 *   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
 *   2. /static/js/supabaseClient.js  (expõe _supabase)
 */

// ─── Helpers de Autenticação ─────────────────────────────────────────────────
function getAuthToken() {
    return localStorage.getItem('fg_token') || localStorage.getItem('floodguard_token') || null;
}

function isUserAuthenticated() {
    return !!getAuthToken();
}

/**
 * Retorna o UUID do utilizador autenticado no Supabase.
 * Usa a sessão em cache do SDK (síncrono via localStorage interno).
 * @returns {string|null}
 */
function _getSupabaseUID() {
    try {
        const sbKey = Object.keys(localStorage).find(
            k => k.startsWith('sb-') && k.endsWith('-auth-token')
        );
        if (!sbKey) return null;
        const session = JSON.parse(localStorage.getItem(sbKey));
        return session?.user?.id || null;
    } catch (_) {
        return null;
    }
}

async function _resolveSupabaseUID() {
    let uid = _getSupabaseUID();
    if (!uid && typeof _supabase !== 'undefined' && _supabase?.auth) {
        try {
            const { data: { user } } = await _supabase.auth.getUser();
            uid = user?.id || null;
        } catch (_) {}
    }
    return uid;
}

// ─── Formatação de Data Relativa ─────────────────────────────────────────────
function formatRelativeTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const now     = new Date();
    const diffMs  = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHrs / 24);

    if (diffSec < 60)  return 'agora mesmo';
    if (diffMin < 60)  return `há ${diffMin} min`;
    if (diffHrs < 24)  return `hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDay === 1) return `ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── 1. Salvar Busca no Histórico (Supabase) ─────────────────────────────────
async function salvarBuscaHistorico(item) {
    if (!isUserAuthenticated() || !item || !item.nome) return null;

    const userId = await _resolveSupabaseUID();
    if (!userId) return null;

    const payload = {
        user_id:          userId,
        termo_busca:      item.nome,
        lat:              item.lat  !== undefined ? Number(item.lat)  : null,
        lon:              item.lon  !== undefined ? Number(item.lon)  : (item.lng !== undefined ? Number(item.lng) : null),
        bairro:           item.bairro || null,
        dados_adicionais: item.display_name || item.address || null,
    };

    try {
        // Anti-duplicata: não salvar se o mesmo termo foi buscado nas últimas 2 horas
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        const { data: existing } = await _supabase
            .from('search_history')
            .select('id')
            .eq('user_id', userId)
            .eq('termo_busca', payload.termo_busca)
            .gte('criado_em', twoHoursAgo)
            .limit(1);

        if (existing && existing.length > 0) return existing[0]; // já existe, não duplica

        const { data, error } = await _supabase
            .from('search_history')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.debug('[Histórico] Falha ao registrar busca:', error.message);
            return null;
        }
        return data;
    } catch (e) {
        console.debug('[Histórico] Erro inesperado ao salvar:', e.message);
        return null;
    }
}

// ─── 2. Carregar Histórico do Utilizador (Supabase) ──────────────────────────
async function carregarHistorico(limit = 10) {
    if (!isUserAuthenticated()) return [];

    const userId = await _resolveSupabaseUID();
    if (!userId) return [];

    try {
        const { data, error } = await _supabase
            .from('search_history')
            .select('id, termo_busca, lat, lon, bairro, dados_adicionais, criado_em')
            .eq('user_id', userId)
            .order('criado_em', { ascending: false })
            .limit(limit);

        if (error) {
            console.debug('[Histórico] Erro ao carregar buscas:', error.message);
            return [];
        }
        return data || [];
    } catch (e) {
        console.debug('[Histórico] Erro inesperado ao carregar:', e.message);
        return [];
    }
}

// ─── 3. Remover Busca Individual (Supabase) ───────────────────────────────────
async function removerBuscaHistorico(id) {
    if (!isUserAuthenticated() || !id) return false;

    const userId = await _resolveSupabaseUID();
    if (!userId) return false;

    try {
        const { error } = await _supabase
            .from('search_history')
            .delete()
            .eq('id', id)
            .eq('user_id', userId); // garante que só apaga o próprio registo

        if (error) {
            console.debug('[Histórico] Erro ao remover item:', error.message);
            return false;
        }
        return true;
    } catch (e) {
        console.debug('[Histórico] Erro inesperado ao remover:', e.message);
        return false;
    }
}

// ─── 4. Limpar Todo o Histórico (Supabase) ───────────────────────────────────
async function limparTodoHistorico() {
    if (!isUserAuthenticated()) return false;

    const userId = await _resolveSupabaseUID();
    if (!userId) return false;

    try {
        const { error } = await _supabase
            .from('search_history')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.debug('[Histórico] Erro ao limpar histórico:', error.message);
            return false;
        }
        return true;
    } catch (e) {
        console.debug('[Histórico] Erro inesperado ao limpar:', e.message);
        return false;
    }
}

// ─── 5. Exibir Buscas Recentes no Dropdown de Pesquisa do Mapa ───────────────
async function showRecentSearches() {
    const input    = document.getElementById('universal-search-input');
    const dropdown = document.getElementById('universal-search-dropdown');
    if (!input || !dropdown) return;

    if (input.value.trim().length > 0) return;

    if (!isUserAuthenticated()) {
        dropdown.style.display = 'none';
        return;
    }

    const historico = await carregarHistorico(6);
    if (!historico || historico.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    if (input.value.trim().length > 0) return;

    let html = `
        <div class="search-status-bar" style="display: flex; justify-content: space-between; align-items: center;">
            <span>🕒 Buscas Recentes</span>
            <button type="button" id="btn-clear-recent-dropdown" style="background: transparent; border: none; color: #64748B; font-size: 11px; cursor: pointer; padding: 2px 6px; border-radius: 4px;" title="Limpar histórico recente">
                Limpar
            </button>
        </div>
    `;

    html += historico.map((item) => {
        const safeNome   = (item.termo_busca || '').replace(/"/g, '&quot;');
        const safeBairro = (item.bairro || '').replace(/"/g, '&quot;');
        const timeAgo    = formatRelativeTime(item.criado_em || item.created_at);

        return `
        <div class="search-item search-item-recent" data-recent-id="${item.id}" role="button" tabindex="0" style="display: flex; align-items: center; justify-content: space-between;">
            <div class="recent-item-click-area" data-lat="${item.lat || ''}" data-lon="${item.lon || ''}" data-nome="${safeNome}" data-bairro="${safeBairro}" style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; cursor: pointer;">
                <span style="font-size: 15px; color: #38BDF8; flex-shrink: 0;">🕒</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 13px; color: #FFFFFF; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${safeNome}
                    </div>
                    <div style="font-size: 10px; color: #94A3B8; margin-top: 2px;">
                        ${safeBairro ? `${safeBairro} • ` : ''}${timeAgo}
                    </div>
                </div>
            </div>
            <button type="button" class="btn-remove-recent-item" data-id="${item.id}" title="Remover esta busca" style="background: transparent; border: none; color: #64748B; font-size: 14px; cursor: pointer; padding: 4px 8px; border-radius: 4px; margin-left: 6px; line-height: 1;">
                ✕
            </button>
        </div>
        `;
    }).join('');

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';

    // Handler: clicar num item recente e refazer a busca
    dropdown.querySelectorAll('.recent-item-click-area').forEach(el => {
        el.addEventListener('click', () => {
            const lat    = Number(el.dataset.lat);
            const lon    = Number(el.dataset.lon);
            const nome   = el.dataset.nome;
            const bairro = el.dataset.bairro;

            if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
                if (typeof selectSearchResult === 'function') {
                    selectSearchResult(lat, lon, nome, bairro);
                }
            } else {
                input.value = nome;
                input.dispatchEvent(new Event('input'));
            }
        });
    });

    // Handler: remover item individual
    dropdown.querySelectorAll('.btn-remove-recent-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = Number(btn.dataset.id);
            if (id) {
                await removerBuscaHistorico(id);
                if (document.activeElement === input && input.value.trim().length === 0) {
                    showRecentSearches();
                } else {
                    dropdown.style.display = 'none';
                }
            }
        });
    });

    // Handler: limpar tudo
    const btnClearAll = document.getElementById('btn-clear-recent-dropdown');
    if (btnClearAll) {
        btnClearAll.addEventListener('click', async (e) => {
            e.stopPropagation();
            await limparTodoHistorico();
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
        });
    }
}

// ─── 6. Exibir Histórico Completo no Painel de Perfil (profile.html) ──────────
async function renderProfileHistory(preloadedItems = null) {
    const container = document.getElementById('profile-history-list');
    if (!container) return;

    container.innerHTML = `
        <div class="skeleton" style="height: 52px; border-radius: 10px; margin-bottom: 8px;"></div>
        <div class="skeleton" style="height: 52px; border-radius: 10px; margin-bottom: 8px;"></div>
        <div class="skeleton" style="height: 52px; border-radius: 10px;"></div>
    `;

    const items = Array.isArray(preloadedItems) ? preloadedItems.slice(0, 30) : await carregarHistorico(30);

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 48px 20px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.12); border-radius: 14px;">
                <div style="font-size: 36px; margin-bottom: 10px;">🗺️</div>
                <div style="font-weight: 700; color: #FFFFFF; font-size: 16px;">Nenhuma busca registrada ainda</div>
                <div style="font-size: 13px; color: #94A3B8; margin-top: 6px; margin-bottom: 20px;">
                    Explore bairros, regiões ou trajetos no mapa interativo para ver seu histórico salvo aqui.
                </div>
                <a href="/map" class="btn-save" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; padding: 10px 22px; font-size: 13px;">
                    🗺️ Acessar o Mapa de Risco
                </a>
            </div>
        `;
        const btnClear = document.getElementById('btn-clear-all-history');
        if (btnClear) btnClear.style.display = 'none';
        return;
    }

    const btnClear = document.getElementById('btn-clear-all-history');
    if (btnClear) btnClear.style.display = 'inline-flex';

    container.innerHTML = items.map(item => {
        const timeAgo    = formatRelativeTime(item.criado_em || item.created_at);
        const safeNome   = (item.termo_busca || '').replace(/"/g, '&quot;');
        const safeBairro = (item.bairro || '').replace(/"/g, '&quot;');
        const targetData = JSON.stringify({
            lat: item.lat,
            lon: item.lon,
            nome: item.termo_busca,
            bairro: item.bairro
        }).replace(/"/g, '&quot;');

        return `
            <div class="info-card" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; flex-wrap: wrap; gap: 12px;" id="hist-row-${item.id}">
                <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 220px;">
                    <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.25); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                        📍
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 700; font-size: 14px; color: #FFFFFF; line-height: 1.3;">
                            ${safeNome}
                        </div>
                        <div style="font-size: 11px; color: #94A3B8; margin-top: 3px;">
                            ${safeBairro ? `<b>${safeBairro}</b> • ` : ''}<span>${timeAgo}</span>
                        </div>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                    <a href="/map" onclick="sessionStorage.setItem('fg_target_search', '${targetData}')" style="background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); color: #38BDF8; font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;">
                        🗺️ Ver no Mapa
                    </a>
                    <button type="button" onclick="deletarItemHistoricoPerfil(${item.id})" title="Remover do histórico" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); color: #FCA5A5; font-size: 13px; padding: 8px 12px; border-radius: 8px; cursor: pointer; line-height: 1;">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function deletarItemHistoricoPerfil(id) {
    if (!confirm('Deseja remover esta busca do histórico?')) return;
    const ok = await removerBuscaHistorico(id);
    if (ok) {
        const row = document.getElementById(`hist-row-${id}`);
        if (row) row.remove();
        const container = document.getElementById('profile-history-list');
        if (container && container.children.length === 0) {
            renderProfileHistory();
        }
    }
}

async function limparHistoricoPerfil() {
    if (!confirm('Deseja limpar TODO o seu histórico de buscas?')) return;
    const ok = await limparTodoHistorico();
    if (ok) {
        renderProfileHistory();
    }
}
