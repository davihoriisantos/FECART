document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;
            const errorMsg = document.getElementById('errorMsg');
            
            try {
                const res = await API.post('/api/auth/login', { email, senha });
                localStorage.setItem('floodguard_token', res.access_token);
                window.location.href = '/static/dashboard.html';
            } catch (err) {
                errorMsg.textContent = err.message;
            }
        });
    }

    // Check auth on protected pages
    const path = window.location.pathname;
    if (path.includes('dashboard') || path.includes('map')) {
        if (!API.getToken()) {
            window.location.href = '/static/login.html';
        }
    }
});

function logout() {
    localStorage.removeItem('floodguard_token');
    window.location.href = '/static/login.html';
}
