/**
 * Hace funcional el "¿Cómo obtener el token?". (Estilo v2.0 Futurist)
 * Debes pasarle el ID del botón o el elemento botón.
 * El modal se crea solo una vez en el body.
 */
function setupHelpTokenModal(btnId) {
    let modal = document.getElementById("help-token-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "help-token-modal";
        // Fondo con desenfoque para un efecto más moderno
        modal.className = "fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 hidden";
        modal.innerHTML = `
            <div class="glass-panel rounded-xl shadow-lg shadow-cyan-500/10 max-w-lg w-full p-6 m-4 relative border border-cyan-400/20">
                <button id="close-help-token"
                        class="absolute top-4 right-4 text-slate-400 hover:text-cyan-300 transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h2 class="text-xl font-bold text-cyan-300 mb-4 tracking-wide">¿Cómo Obtener el Token de GitHub?</h2>
                <ol class="list-decimal list-inside space-y-3 text-slate-300 text-sm">
                    <li>Inicia sesión en <a href="https://github.com" target="_blank" class="font-semibold text-cyan-400 hover:underline hover:text-cyan-300">GitHub</a>.</li>
                    <li>Ve a <b class="text-slate-200">Settings</b> &gt; <b class="text-slate-200">Developer settings</b> &gt; <b class="text-slate-200">Personal access tokens</b> &gt; <b class="text-slate-200">Tokens (classic)</b>.</li>
                    <li>Haz clic en <b class="text-slate-200">Generate new token</b> y selecciona <b class="text-slate-200">Generate new token (classic)</b>.</li>
                    <li>En <i class="text-slate-400">Select scopes</i>, marca los siguientes permisos: <br>
                        <code class="bg-slate-700 text-cyan-300 font-mono px-2 py-1 rounded-md text-xs">read:org</code>, 
                        <code class="bg-slate-700 text-cyan-300 font-mono px-2 py-1 rounded-md text-xs">repo</code>, 
                        <code class="bg-slate-700 text-cyan-300 font-mono px-2 py-1 rounded-md text-xs">user:email</code>
                    </li>
                    <li>Haz clic en <b class="text-slate-200">Generate token</b> al final de la página y copia el token generado.</li>
                </ol>
                <p class="mt-5 text-xs text-slate-500 border-t border-slate-700 pt-3">
                    Guarda tu token en un lugar seguro. No podrás volver a verlo después de cerrar la página de GitHub.
                </p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // La lógica de apertura y cierre no cambia
    function openModal() { modal.classList.remove("hidden"); }
    function closeModal() { modal.classList.add("hidden"); }
    const btn = typeof btnId === "string" ? document.getElementById(btnId) : btnId;
    if (btn) {
        btn.removeEventListener("click", openModal); // Limpia oyentes antiguos
        btn.addEventListener("click", openModal);
    }
    
    // Cerrar al hacer clic en el fondo
    modal.onclick = function (ev) {
        if (ev.target === modal) closeModal();
    };
    
    // Cerrar al hacer clic en el botón 'X'
    const closeBtn = modal.querySelector("#close-help-token");
    if (closeBtn) {
        closeBtn.removeEventListener("click", closeModal);
        closeBtn.addEventListener("click", closeModal);
    }
}

/**
 * Genera el bloque HTML del campo "GitHub Token" reutilizable. (Estilo v2.0 Futurist)
 * @param {Object} opts - Opcional: puedes customizar ids o atributos aquí si necesitas.
 */
function renderTokenInput(opts = {}) {
    const inputId = opts.inputId || "token-input";
    const btnId = opts.btnId || "help-token-btn-unique";
    const inputName = opts.inputName || "";
    return `
        <div>
            <div class="flex items-center justify-between mb-2">
                <label for="${inputId}" class="block text-sm font-semibold text-cyan-200">
                    GitHub Token
                </label>
                <button id="${btnId}" type="button"
                    class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors duration-200 focus:outline-none"
                    title="¿Cómo obtener el token?">
                    ¿Necesitas ayuda?
                </button>
            </div>
            <input type="password" id="${inputId}" name="${inputName}" autocomplete="off"
                placeholder="ghp_..."
                class="glass-panel w-full px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none placeholder-slate-500" required/>
        </div>
    `;
}