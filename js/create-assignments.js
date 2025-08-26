/**
 * Renderiza el formulario y gestión de creación de assignments. (Estilo v2.0 Futurist)
 * @param {HTMLElement} container - Contenedor donde renderizar la vista.
 */
function renderCreateAssignmentsView(container) {
    // -- Render principal con estilos v2.0 ---
    container.innerHTML = `
    <div class="glass-panel rounded-xl p-6 md:p-8 w-full">
        <h2 class="text-2xl md:text-3xl font-bold mb-6 text-cyan-300 text-center tracking-wider">🚀 Crear Assignments</h2>
        <form id="ca-form" class="space-y-5">
            ${renderTokenInput({inputId: "ca-token", btnId: "help-token-btn-create"})}
            <div>
                <label class="block text-sm font-semibold text-cyan-200 mb-2">Organización:</label>
                <select id="ca-org" class="glass-panel w-full px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none" required>
                    <option disabled hidden selected value="">--- Seleccione organización ---</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-semibold text-cyan-200 mb-2">Classroom:</label>
                <select id="ca-classroom" class="glass-panel w-full px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none" required>
                    <option disabled hidden selected value="">--- Seleccione classroom ---</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-semibold text-cyan-200 mb-2">Prefijo de Plantillas:</label>
                <select id="ca-prefix" class="glass-panel w-full px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none" required>
                    <option value="ALL">Todas</option>
                    <option value="FE">FE (Frontend)</option>
                    <option value="BE">BE (Backend)</option>
                </select>
            </div>
            <button type="submit" class="w-full bg-cyan-600 text-slate-900 font-bold py-3 px-4 rounded-md transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400">
                Obtener Plantillas
            </button>
        </form>
        <div id="ca-error" class="text-red-400 font-medium mt-4 text-center"></div>
        <div id="ca-templates-section" class="mt-8 hidden">
            <div class="mb-4">
                 <input type="text" id="ca-filter" placeholder="Filtrar por nombre..." class="glass-panel w-full px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none placeholder-slate-500" />
            </div>
            <div id="ca-template-list" class="space-y-3"></div>
            <div class="flex justify-between items-center mt-6">
                <button id="ca-prev" class="border border-cyan-600 text-cyan-400 px-4 py-2 rounded-md text-sm transition hover:bg-cyan-600/20 disabled:opacity-40 disabled:border-slate-600 disabled:text-slate-500 disabled:cursor-not-allowed">Anterior</button>
                <span id="ca-pageinfo" class="text-sm text-slate-400 font-medium"></span>
                <button id="ca-next" class="border border-cyan-600 text-cyan-400 px-4 py-2 rounded-md text-sm transition hover:bg-cyan-600/20 disabled:opacity-40 disabled:border-slate-600 disabled:text-slate-500 disabled:cursor-not-allowed">Siguiente</button>
            </div>
        </div>
    </div>
    `;
    setupHelpTokenModal("help-token-btn-create");

    // -- Constantes / helpers (sin cambios) --
    const PAGE_SIZE = 10;

    // -- Referencias DOM (sin cambios) --
    const $ = sel => container.querySelector(sel);
    const caToken = $("#ca-token");
    const caOrg = $("#ca-org");
    const caClassroom = $("#ca-classroom");
    const caPrefix = $("#ca-prefix");
    const caForm = $("#ca-form");
    const caError = $("#ca-error");
    const caTemplatesSection = $("#ca-templates-section");
    const caFilter = $("#ca-filter");
    const caTemplateList = $("#ca-template-list");
    const caPrev = $("#ca-prev");
    const caNext = $("#ca-next");
    const caPageinfo = $("#ca-pageinfo");

    // -- Estado local (sin cambios) --
    let allTemplates = [];
    let filteredTemplates = [];
    let currentPage = 1;

    // -- Lógica de Eventos y Fetch (sin cambios) --
    caToken.addEventListener('change', loadOrganizations);
    caOrg.addEventListener('change', loadClassrooms);
    caFilter.addEventListener('input', () => { currentPage = 1; renderTemplates(); });
    caPrev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTemplates(); } });
    caNext.addEventListener('click', () => { if (currentPage < getTotalPages()) { currentPage++; renderTemplates(); } });
    caForm.onsubmit = async (e) => { e.preventDefault(); caError.textContent = ""; if (!(caToken.value && caOrg.value && caClassroom.value && caPrefix.value)) { caError.textContent = "Completa todos los campos"; return; } await loadTemplates(); };

    function getToken() { return caToken.value.trim(); }
    function getOrg() { return caOrg.value; }
    function getPrefix() { return caPrefix.value; }
    function getClassroom() { return caClassroom.value; }

    async function loadOrganizations() { caError.textContent = ""; caOrg.innerHTML = `<option disabled selected value="">Cargando...</option>`; showSpinner(); try { const resp = await fetch(`https://api.github.com/user/orgs`, { headers: { "Authorization": `Bearer ${getToken()}` } }); hideSpinner(); if (!resp.ok) throw new Error("Token inválido"); const orgs = await resp.json(); caOrg.innerHTML = `<option disabled selected value="">--- Seleccione organización ---</option>`; orgs.forEach(org => caOrg.innerHTML += `<option value="${org.login}">${org.login}</option>`); } catch (e) { hideSpinner(); caOrg.innerHTML = `<option disabled selected value="">Error</option>`; caError.textContent = e.message; } }
    async function loadClassrooms() { caClassroom.innerHTML = `<option disabled selected value="">Cargando...</option>`; caError.textContent = ""; showSpinner(); try { const resp = await fetch('https://api.github.com/classrooms', { headers: { "Authorization": `Bearer ${getToken()}`, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } }); hideSpinner(); if (!resp.ok) throw new Error("Error obteniendo classrooms."); const classes = await resp.json(); caClassroom.innerHTML = `<option disabled selected value="">--- Seleccione classroom ---</option>`; classes.filter(cl => cl.name?.includes(getOrg())).forEach(cl => { const slug = cl.url.split("/classrooms/")[1]; caClassroom.innerHTML += `<option value="${slug}">${cl.name}</option>`; }); } catch (e) { hideSpinner(); caClassroom.innerHTML = `<option disabled selected value="">Error</option>`; caError.textContent = e.message; } }
    async function loadTemplates() { caTemplatesSection.classList.remove("hidden"); caTemplateList.innerHTML = `<div class="py-4 text-center text-cyan-300">⏳ Buscando plantillas de repositorio...</div>`; allTemplates = []; let page = 1, more = true; showSpinner(); try { while (more) { const url = `https://api.github.com/orgs/${getOrg()}/repos?type=private&per_page=100&page=${page}`; const res = await fetch(url, { headers: { "Authorization": `Bearer ${getToken()}` } }); const data = await res.json(); if (data.length === 0) break; allTemplates.push(...(data.filter(r => r.is_template))); more = data.length === 100; page++; } if (getPrefix() !== "ALL") allTemplates = allTemplates.filter(t => t.name.startsWith(getPrefix())); currentPage = 1; hideSpinner(); renderTemplates(); } catch (e) { hideSpinner(); caError.textContent = e.message; caTemplatesSection.classList.add("hidden"); } }
    function getTotalPages() { return Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE)); }

    // -- Renderizado de tarjetas de plantilla con estilo v2.0 --
    function renderTemplates() {
        const filter = caFilter.value?.toLowerCase() || "";
        filteredTemplates = allTemplates.filter(t => t.name.toLowerCase().includes(filter));
        const totalPages = getTotalPages();

        caTemplateList.innerHTML = "";
        if (!filteredTemplates.length) {
            caTemplateList.innerHTML = `<div class="text-center p-6 text-red-400 font-medium">No se encontraron plantillas con los criterios seleccionados.</div>`;
            caPrev.disabled = caNext.disabled = true;
            caPageinfo.textContent = "";
            return;
        }

        if (currentPage > totalPages) currentPage = totalPages;
        const slice = filteredTemplates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

        slice.forEach(tpl => {
            // Se inyecta la tarjeta con los nuevos estilos
            caTemplateList.innerHTML += `
                <div class="glass-panel p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-700/50 hover:bg-slate-800/50 transition-colors duration-200">
                    <div class="flex-1">
                        <div class="font-bold text-cyan-300">${tpl.name}</div>
                        <div class="text-slate-400 text-xs mt-1">${tpl.description || "Sin descripción."}</div>
                    </div>
                    <button
                        class="create-btn bg-emerald-600 text-white px-4 py-2 rounded-md font-semibold shadow-md shadow-emerald-900/50 hover:bg-emerald-500 transition-all text-sm flex-shrink-0"
                        data-assignment="${tpl.name}"
                        data-classroom="${getClassroom()}">Crear</button>
                </div>
            `;
        });

        caPrev.disabled = currentPage <= 1;
        caNext.disabled = currentPage >= totalPages;
        caPageinfo.textContent = `Página ${currentPage} de ${totalPages}`;

        // La lógica del botón de crear no cambia, solo su apariencia
        caTemplateList.querySelectorAll('.create-btn').forEach(btn => {
            btn.onclick = () => {
                const name = btn.getAttribute('data-assignment');
                const classroomSlug = btn.getAttribute('data-classroom');
                navigator.clipboard.writeText(name);
                window.open(`https://classroom.github.com/classrooms/${classroomSlug}/new_assignments/new`, "_blank");
                // Podríamos considerar un modal de notificación más moderno aquí en el futuro
                alert(`¡Nombre de assignment copiado!\n\n"${name}"\n\nPega este nombre en el formulario de Classroom.`);
            };
        });
    }
}