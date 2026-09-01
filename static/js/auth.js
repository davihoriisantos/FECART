document.addEventListener('DOMContentLoaded', () => {
    // 1. Suporte a parâmetro na URL para abrir direto em 'register' (ex: /static/login.html?tab=register)
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab');
    if (initialTab === 'register') {
        switchAuthTab('register');
    }

    // 2. Formulário de Login (Entrar)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const senha = document.getElementById('login-senha').value;
            const msgBox = document.getElementById('loginMsg');
            const submitBtn = document.getElementById('btn-submit-login');

            hideMsg(msgBox);
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Conectando...';

            try {
                const res = await API.post('/api/auth/login', { email, senha });
                localStorage.setItem('floodguard_token', res.access_token);
                
                showMsg(msgBox, 'success', '✅ Login realizado! Acessando sistema...');
                setTimeout(() => {
                    window.location.href = '/static/map.html';
                }, 700);
            } catch (err) {
                showMsg(msgBox, 'error', err.message || 'Erro ao realizar login. Verifique seu e-mail e senha.');
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Entrar no Sistema';
            }
        });
    }

    // 3. Formulário de Cadastro (Criar Conta no Banco de Dados)
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('reg-nome').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const senha = document.getElementById('reg-senha').value;
            const confirmSenha = document.getElementById('reg-confirm-senha').value;
            const msgBox = document.getElementById('registerMsg');
            const submitBtn = document.getElementById('btn-submit-reg');

            hideMsg(msgBox);

            // Validações no cliente
            if (senha.length < 6) {
                showMsg(msgBox, 'error', '⚠️ A senha deve ter no mínimo 6 caracteres.');
                return;
            }

            if (senha !== confirmSenha) {
                showMsg(msgBox, 'error', '⚠️ As senhas digitadas não coincidem. Por favor, confira.');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = '💾 Gravando no banco de dados...';

            try {
                // 1º Passo: Cria a conta no banco de dados SQLite através da API
                await API.post('/api/auth/register', { nome, email, senha });

                showMsg(msgBox, 'success', '🎉 Conta gravada com sucesso no banco de dados! Autenticando...');

                // 2º Passo: Realiza o login automático do novo usuário cadastrado
                const loginRes = await API.post('/api/auth/login', { email, senha });
                localStorage.setItem('floodguard_token', loginRes.access_token);

                setTimeout(() => {
                    window.location.href = '/static/map.html';
                }, 900);
            } catch (err) {
                showMsg(msgBox, 'error', err.message || 'Não foi possível cadastrar a conta. Verifique os dados.');
                submitBtn.disabled = false;
                submitBtn.textContent = '✨ Criar Conta e Acessar';
            }
        });
    }

    // 4. Proteção de páginas restritas (Dashboard / Mapa)
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) {
        if (!API.getToken()) {
            window.location.href = '/static/login.html';
        }
    }
});

// ─── FUNÇÃO PARA ALTERNAR ENTRE AS ABAS ───────────────────────────────────────
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
    localStorage.removeItem('floodguard_token');
    window.location.href = '/static/login.html';
}
