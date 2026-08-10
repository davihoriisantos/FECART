/**
 * FloodGuard AI — Gerenciador do Splash Screen com Animação Profissional
 */
(function() {
    function createSplash() {
        if (document.getElementById('splash-screen')) return;

        const splashHTML = `
            <div id="splash-screen">
                <div class="splash-background-glow"></div>
                <div class="splash-logo-container">
                    <div class="splash-ripple"></div>
                    <div class="splash-logo-card">
                        <img src="/static/img/logo.jpg" alt="FloodGuard IA Logo" class="splash-logo-img">
                    </div>
                </div>
                <div class="splash-title-box">
                    <div class="splash-brand">FloodGuard <span>IA</span></div>
                    <div class="splash-subtitle">Inteligência Artificial para Prevenção de Enchentes</div>
                </div>
                <div class="splash-loader-container">
                    <div class="splash-progress-track">
                        <div class="splash-progress-bar" id="splash-bar"></div>
                    </div>
                    <div class="splash-status-text" id="splash-status">Iniciando sistema preditivo...</div>
                </div>
            </div>
        `;

        const target = document.body || document.documentElement;
        target.insertAdjacentHTML('afterbegin', splashHTML);

        const splashScreen = document.getElementById('splash-screen');
        const progressBar  = document.getElementById('splash-bar');
        const statusText   = document.getElementById('splash-status');

        const steps = [
            { progress: 25, text: '⚡ Conectando à Inteligência Artificial...' },
            { progress: 50, text: '📡 Carregando dados meteorológicos em tempo real...' },
            { progress: 75, text: '🗺️ Mapeando zonas de risco & Defesa Civil SP...' },
            { progress: 95, text: '🛡️ Ativando matriz de sensibilidade (Recall ≥ 40%)...' },
            { progress: 100, text: '✅ FloodGuard IA pronto!' }
        ];

        let stepIdx = 0;
        const interval = setInterval(() => {
            if (stepIdx < steps.length) {
                const step = steps[stepIdx];
                if (progressBar) progressBar.style.width = step.progress + '%';
                if (statusText) statusText.textContent = step.text;
                stepIdx++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    if (splashScreen) {
                        splashScreen.classList.add('fade-out');
                        setTimeout(() => {
                            if (splashScreen && splashScreen.parentNode) {
                                splashScreen.parentNode.removeChild(splashScreen);
                            }
                        }, 800);
                    }
                }, 300);
            }
        }, 280);
    }

    if (document.body) {
        createSplash();
    } else {
        window.addEventListener('DOMContentLoaded', createSplash);
    }
})();
