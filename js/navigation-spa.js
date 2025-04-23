/**
     * Cambia la vista activa en la aplicación SPA (Single Page Application).
     * Oculta o muestra las secciones correspondientes según la vista seleccionada
     * y actualiza los atributos `aria-current` de los elementos de navegación.
     *
     * @param {string} view - La vista que se desea activar. Puede ser "assignments", "grades" o "deliveries-summary".
     */
    function switchView(view) {
        document.getElementById("view-assignments").classList.toggle("hidden", view !== "assignments");
        document.getElementById("view-grades").classList.toggle("hidden", view !== "grades");
        document.getElementById("view-deliveries-summary").classList.toggle("hidden", view !== "deliveries-summary");
        document.getElementById("nav-create").setAttribute("aria-current", view === "assignments" ? "page" : "");
        document.getElementById("nav-deliveries").setAttribute("aria-current", view === "grades" ? "page" : "");
        document.getElementById("nav-deliveries-summary").setAttribute("aria-current", view === "deliveries-summary" ? "page" : "");
    }

    // Asigna eventos de clic a los elementos de navegación para cambiar la vista activa.
    document.getElementById("nav-create").onclick = () => switchView("assignments");
    document.getElementById("nav-deliveries").onclick = () => switchView("grades");
    document.getElementById("nav-deliveries-summary").onclick = () => switchView("deliveries-summary");

    /**
     * Inicializa las vistas principales de la aplicación al cargar el DOM.
     * Renderiza las vistas de creación de assignments, notas y resumen de entregas.
     */
    window.addEventListener("DOMContentLoaded", () => {
        renderCreateAssignmentsView(document.getElementById("view-assignments"));
        renderViewGrades(document.getElementById("view-grades"));
        renderViewDeliveriesSummary(document.getElementById("view-deliveries-summary"));
    });

    /**
     * Alterna la visibilidad de la barra lateral en dispositivos móviles.
     * Agrega o elimina la clase `-translate-x-full` para mostrar u ocultar el menú lateral.
     */
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menu-toggle");
    menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("-translate-x-full");
    });