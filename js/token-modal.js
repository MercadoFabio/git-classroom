/**
 * Hace funcional el "¿Cómo obtener el token?".
 * Debes pasarle el ID del botón o el elemento botón.
 * El modal se crea solo una vez en el body.
 */
function setupHelpTokenModal(btnId) {
    let modal = document.getElementById("help-token-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "help-token-modal";
        modal.className = "fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 hidden";
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
                <button id="close-help-token"
                        class="absolute top-3 right-3 text-gray-400 hover:text-blue-700 text-xl font-bold leading-none">
                    &times;
                </button>
                <h2 class="text-xl font-bold text-blue-900 mb-4">¿Cómo obtener el token de GitHub?</h2>
                <ol class="list-decimal list-inside space-y-2 text-gray-700 text-sm">
                    <li>Inicia sesión en <a href="https://github.com" target="_blank" class="text-blue-700 underline">GitHub</a>.</li>
                    <li>Ve a <b>Settings</b> &gt; <b>Developer settings</b> &gt; <b>Personal access tokens</b>.</li>
                    <li>Haz clic en <b>Generate new token</b> (classic).</li>
                    <li>Selecciona permisos: <code>read:org</code>, <code>repo</code>, <code>read:user</code>.</li>
                    <li>Haz clic en <b>Generate token</b> y copia el token.</li>
                </ol>
                <p class="mt-4 text-xs text-gray-500">Guarda tu token en un lugar seguro. No podrás verlo después de cerrar la página.</p>
            </div>
        `;
        document.body.appendChild(modal);
    }


    function openModal() { modal.classList.remove("hidden"); }
    function closeModal() { modal.classList.add("hidden"); }
    const btn = typeof btnId === "string" ? document.getElementById(btnId) : btnId;
    if (btn) {
        btn.removeEventListener("click", openModal); // limpias viejos
        btn.addEventListener("click", openModal);
    }
    // Cerrar por fondo
    modal.onclick = function (ev) {
        if (ev.target === modal) closeModal();
    };
    // Cerrar por X
    const closeBtn = modal.querySelector("#close-help-token");
    if (closeBtn) {
        closeBtn.removeEventListener("click", closeModal);
        closeBtn.addEventListener("click", closeModal);
    }
}

/**
 * Genera el bloque HTML del campo "GitHub Token" reutilizable.
 * @param {Object} opts - Opcional: puedes customizar ids o atributos aquí si necesitas.
 */
function renderTokenInput(opts = {}) {
    const inputId = opts.inputId || "token-input";
    const btnId = opts.btnId || "help-token-btn-unique";
    const inputName = opts.inputName || "";
    return `
        <div>
            <label class="block text-sm font-semibold text-blue-700 mb-1 flex items-center gap-2">
                GitHub Token:
                <button id="${btnId}" type="button"
                    class="ml-1 text-blue-600 underline text-xs hover:text-blue-900 transition focus:outline-none"
                    title="¿Cómo obtener el token?">
                    ¿Cómo obtener el token?
                </button>
            </label>
            <input type="password" id="${inputId}" name="${inputName}" autocomplete="off"
                class="border px-3 py-2 rounded-lg w-full focus:ring" required/>
        </div>
    `;
}