/**
 * Cambia la vista activa en la aplicación SPA (Single Page Application).
 * Oculta o muestra las secciones correspondientes y actualiza los botones de navegación.
 *
 * @param {string} view - La vista a activar: "assignments", "grades", "deliveries-summary", o "graphics".
 */
function switchView(view) {
    // Ocultar todas las vistas excepto la activa
    document.getElementById("view-assignments").classList.toggle("hidden", view !== "assignments");
    document.getElementById("view-grades").classList.toggle("hidden", view !== "grades");
    document.getElementById("view-deliveries-summary").classList.toggle("hidden", view !== "deliveries-summary");
    document.getElementById("view-graphics").classList.toggle("hidden", view !== "graphics");

    // Actualizar el estado 'aria-current' para el estilo del botón activo
    document.getElementById("nav-create").setAttribute("aria-current", view === "assignments" ? "page" : "");
    document.getElementById("nav-deliveries").setAttribute("aria-current", view === "grades" ? "page" : "");
    document.getElementById("nav-deliveries-summary").setAttribute("aria-current", view === "deliveries-summary" ? "page" : "");
    document.getElementById("nav-graphics").setAttribute("aria-current", view === "graphics" ? "page" : "");

    // --- CAMBIO 1: CERRAR LA BARRA LATERAL EN MÓVIL DESPUÉS DE LA SELECCIÓN ---
    // Si la barra lateral está visible en pantallas pequeñas, la ocultamos.
    const sidebar = document.getElementById("sidebar");
    if (!sidebar.classList.contains("lg:flex")) { // Una forma de detectar si estamos en vista móvil
        sidebar.classList.add("-translate-x-full");
    }
}

// Asigna eventos de clic a los botones de navegación
document.getElementById("nav-create").onclick = () => switchView("assignments");
document.getElementById("nav-deliveries").onclick = () => switchView("grades");
document.getElementById("nav-deliveries-summary").onclick = () => switchView("deliveries-summary");
document.getElementById("nav-graphics").onclick = () => switchView("graphics");

/**
 * Inicializa las vistas principales de la aplicación al cargar el DOM.
 * Esta función SOLO se ejecuta si el token de sesión existe.
 */
window.addEventListener("DOMContentLoaded", () => {
    // --- CAMBIO 2: COMPROBAR AUTENTICACIÓN ANTES DE RENDERIZAR ---
    // El script "guardia" en index.html ya redirige, pero esta es una capa extra de seguridad
    // y evita errores si este script se carga antes de la redirección.
    const token = sessionStorage.getItem('github_token');
    if (token) {
        // Solo renderizamos las vistas si el usuario está autenticado.
        renderCreateAssignmentsView(document.getElementById("view-assignments"));
        renderViewGrades(document.getElementById("view-grades"));
        renderViewDeliveriesSummary(document.getElementById("view-deliveries-summary"));
        renderViewGraphics(document.getElementById("view-graphics"));
        
        // También inicializamos la lógica del botón de cerrar sesión aquí,
        // ya que este script se ejecuta en la página principal.
        const logoutBtn = document.getElementById('logout-btn');
        if(logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('github_token');
                window.location.replace('/login.html');
            });
        }
    }
});

/**
 * Alterna la visibilidad de la barra lateral en dispositivos móviles.
 */
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menu-toggle");
// Nos aseguramos de que los elementos existen antes de añadir el listener
if (sidebar && menuToggle) {
    menuToggle.addEventListener("click", () => {
        // El sidebar en móvil deja de ser 'hidden' y se controla con 'translate'
        sidebar.classList.remove("hidden");
        sidebar.classList.toggle("-translate-x-full");
    });
}