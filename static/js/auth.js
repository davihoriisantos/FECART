// FloodGuard AI — auth.js (Sistema Aberto, Sem Autenticação Obrigatória)
// Login/Cadastro removidos. Navegação 100% livre para qualquer visitante.

// ─── ALTERNAR ABAS (mantido para compatibilidade) ─────────────────────────────
function switchAuthTab(tab) {
    const btnLogin = document.getElementById('tab-btn-login');
    const btnRegister = document.getElementById('tab-btn-register');
    const panelLogin = document.getElementById('panel-login');
    const panelRegister = document.getElementById('panel-register');

    if (!btnLogin || !btnRegister) return;

    if (tab === 'register') {
        btnLogin.classList.remove('active');
        btnRegister.classList.add('active');
        panelLogin.classList.remove('active');
        panelRegister.classList.add('active');
    } else {
        btnRegister.classList.remove('active');
        btnLogin.classList.add('active');
        panelRegister.classList.remove('active');
        panelLogin.classList.add('active');
    }
}

// ─── HELPERS DE MENSAGENS VISUAIS ─────────────────────────────────────────────
function showMsg(el, type, text) {
    if (!el) return;
    el.textContent = text;
    el.className = `msg-box ${type === 'success' ? 'msg-success' : 'msg-error'}`;
    el.style.display = 'block';
}

function hideMsg(el) {
    if (!el) return;
    el.style.display = 'none';
    el.textContent = '';
}

function logout() {
    localStorage.removeItem('fg_token');
    localStorage.removeItem('fg_user');
    localStorage.removeItem('floodguard_token');
    window.location.href = '/?skipSplash=1';
}
