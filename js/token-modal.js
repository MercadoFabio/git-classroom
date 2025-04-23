/**
 * Referencia al botón que abre el modal de ayuda para obtener el token.
 * @type {HTMLElement}
 */
const helpTokenBtn = document.getElementById("help-token-btn");

/**
 * Referencia al modal que contiene las instrucciones para obtener el token.
 * @type {HTMLElement}
 */
const helpTokenModal = document.getElementById("help-token-modal");

/**
 * Referencia al botón que cierra el modal de ayuda.
 * @type {HTMLElement}
 */
const closeHelpToken = document.getElementById("close-help-token");

/**
 * Evento para mostrar el modal de ayuda al hacer clic en el botón.
 */
helpTokenBtn.addEventListener("click", () => {
    helpTokenModal.classList.remove("hidden");
});

/**
 * Evento para ocultar el modal de ayuda al hacer clic en el botón de cerrar.
 */
closeHelpToken.addEventListener("click", () => {
    helpTokenModal.classList.add("hidden");
});

/**
 * Evento para cerrar el modal al hacer clic fuera del contenido del modal.
 * @param {MouseEvent} e - El evento de clic.
 */
helpTokenModal.addEventListener("click", (e) => {
    if (e.target === helpTokenModal) {
        helpTokenModal.classList.add("hidden");
    }
});