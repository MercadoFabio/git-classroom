/**
 * Renderiza el formulario y gestión de creación de assignments.
 * @param {HTMLElement} container - Contenedor donde renderizar la vista.
 */
function renderCreateAssignmentsView(container) {
    // -- Render principal --
    container.innerHTML = `
    <div class="bg-white shadow rounded-2xl p-7">
        <h2 class="text-2xl font-extrabold mb-2 text-blue-900 text-center">🚀 Crear Assignments</h2>
        <form id="ca-form" class="space-y-4">
            ${renderTokenInput({inputId: "ca-token", btnId: "help-token-btn-create"})}
            <div>
                <label class="block text-sm font-semibold text-blue-700 mb-1">Organización:</label>
                <select id="ca-org" class="border px-3 py-2 rounded-lg w-full focus:ring" required>
                    <option disabled hidden selected value="">--- Seleccione organización ---</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-semibold text-blue-700 mb-1">Classroom:</label>
                <select id="ca-classroom" class="border px-3 py-2 rounded-lg w-full focus:ring" required>
                    <option disabled hidden selected value="">--- Seleccione classroom ---</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-semibold text-blue-700 mb-1">Prefijo:</label>
                <select id="ca-prefix" class="border px-3 py-2 rounded-lg w-full focus:ring" required>
                    <option value="ALL">Todos</option>
                    <option value="FE">FE (Frontend)</option>
                    <option value="BE">BE (Backend)</option>
                </select>
            </div>
            <button type="submit" class="bg-blue-700 text-white font-semibold rounded-lg py-2 shadow hover:bg-blue-900 transition w-full">Obtener templates</button>
        </form>
        <div id="ca-error" class="text-red-600 font-medium mt-3"></div>
        <div id="ca-templates-section" class="mt-8 hidden">
            <div class="mb-2 flex items-center gap-2">
                <input type="text" id="ca-filter" placeholder="Filtrar por nombre..." class="border px-3 py-2 rounded-lg flex-1" />
            </div>
            <div id="ca-template-list" class="space-y-3"></div>
            <div class="flex gap-4 items-center mt-4">
                <button id="ca-prev" class="bg-gray-200 px-3 py-1 rounded disabled:opacity-50" disabled>Anterior</button>
                <span id="ca-pageinfo" class="text-sm text-gray-700"></span>
                <button id="ca-next" class="bg-gray-200 px-3 py-1 rounded disabled:opacity-50" disabled>Siguiente</button>
            </div>
        </div>
    </div>
    `;
    setupHelpTokenModal("help-token-btn-create");

    // -- Constantes / helpers --
    const PAGE_SIZE = 10;

    // -- Referencias DOM --
    const $ = sel => container.querySelector(sel);
    const caToken     = $("#ca-token");
    const caOrg       = $("#ca-org");
    const caClassroom = $("#ca-classroom");
    const caPrefix    = $("#ca-prefix");
    const caForm      = $("#ca-form");
    const caError     = $("#ca-error");
    const caTemplatesSection = $("#ca-templates-section");
    const caFilter    = $("#ca-filter");
    const caTemplateList = $("#ca-template-list");
    const caPrev      = $("#ca-prev");
    const caNext      = $("#ca-next");
    const caPageinfo  = $("#ca-pageinfo");

    // -- Estado local --
    let allTemplates = [];
    let filteredTemplates = [];
    let currentPage = 1;

    // -- Eventos principales --

    // 1. Cargar organizaciones tras introducir el token
    caToken.addEventListener('change', loadOrganizations);

    // 2. Cargar classrooms al elegir una organización
    caOrg.addEventListener('change', loadClassrooms);

    // 3. Filtro buscador
    caFilter.addEventListener('input', () => {
        currentPage = 1;
        renderTemplates();
    });

    // 4. Paginación
    caPrev.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTemplates();
        }
    });
    caNext.addEventListener('click', () => {
        if (currentPage < getTotalPages()) {
            currentPage++;
            renderTemplates();
        }
    });

    // 5. Submit formulario
    caForm.onsubmit = async (e) => {
        e.preventDefault();
        caError.textContent = "";
        if (!(caToken.value && caOrg.value && caClassroom.value && caPrefix.value)) {
            caError.textContent = "Completa todos los campos";
            return;
        }
        await loadTemplates();
    };

    // -- Funciones auxiliares --

    function getToken() { return caToken.value.trim(); }
    function getOrg()   { return caOrg.value; }
    function getPrefix(){ return caPrefix.value; }
    function getClassroom() { return caClassroom.value; }

    async function loadOrganizations() {
        caError.textContent = "";
        caOrg.innerHTML = `<option disabled selected value="">Cargando...</option>`;
        showSpinner();
        try {
            const resp = await fetch(`https://api.github.com/user/orgs`, {
                headers: { "Authorization": `Bearer ${getToken()}` }
            });
            hideSpinner();
            if (!resp.ok) throw new Error("Token inválido");
            const orgs = await resp.json();
            caOrg.innerHTML = `<option disabled selected value="">--- Seleccione organización ---</option>`;
            orgs.forEach(org =>
                caOrg.innerHTML += `<option value="${org.login}">${org.login}</option>`
            );
        } catch (e) {
            hideSpinner();
            caOrg.innerHTML = `<option disabled selected value="">Error</option>`;
            caError.textContent = e.message;
        }
    }

    async function loadClassrooms() {
        caClassroom.innerHTML = `<option disabled selected value="">Cargando classrooms...</option>`;
        caError.textContent = "";
        showSpinner();
        try {
            const resp = await fetch('https://api.github.com/classrooms', {
                headers: {
                    "Authorization": `Bearer ${getToken()}`,
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28"
                }
            });
            hideSpinner();
            if (!resp.ok) throw new Error("Error obteniendo classrooms.");
            const classes = await resp.json();
            caClassroom.innerHTML = `<option disabled selected value="">--- Seleccione classroom ---</option>`;
            classes
                .filter(cl => cl.name?.includes(getOrg()))
                .forEach(cl => {
                    const slug = cl.url.split("/classrooms/")[1];
                    caClassroom.innerHTML += `<option value="${slug}">${cl.name}</option>`;
                });
        } catch (e) {
            hideSpinner();
            caClassroom.innerHTML = `<option disabled selected value="">Error</option>`;
            caError.textContent = e.message;
        }
    }

    async function loadTemplates() {
        caTemplatesSection.classList.remove("hidden");
        caTemplateList.innerHTML = `<div class="py-4 text-blue-700">⏳ Buscando templates...</div>`;
        allTemplates = [];
        let page = 1, more = true;
        showSpinner();
        try {
            while (more) {
                const url = `https://api.github.com/orgs/${getOrg()}/repos?type=private&per_page=100&page=${page}`;
                const res = await fetch(url, { headers: { "Authorization": `Bearer ${getToken()}` } });
                const data = await res.json();
                if (data.length === 0) break;
                allTemplates.push(...(data.filter(r => r.is_template)));
                more = data.length === 100;
                page++;
            }
            if (getPrefix() !== "ALL")
                allTemplates = allTemplates.filter(t => t.name.startsWith(getPrefix()));
            currentPage = 1;
            hideSpinner();
            renderTemplates();
        } catch (e) {
            hideSpinner();
            caError.textContent = e.message;
            caTemplatesSection.classList.add("hidden");
        }
    }

    function getTotalPages() {
        return Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
    }

    // -- Renderizado & lógica de template cards + paginación --
    function renderTemplates() {
        const filter = caFilter.value?.toLowerCase() || "";
        filteredTemplates = allTemplates.filter(t => t.name.toLowerCase().includes(filter));
        const totalPages = getTotalPages();

        caTemplateList.innerHTML = "";
        if (!filteredTemplates.length) {
            caTemplateList.innerHTML = `<div class="text-red-600 font-medium">No hay templates.</div>`;
            caPrev.disabled = caNext.disabled = true;
            caPageinfo.textContent = "";
            return;
        }

        // Paginación lógica
        if (currentPage > totalPages) currentPage = totalPages;
        const slice = filteredTemplates.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE);

        slice.forEach(tpl => {
            caTemplateList.innerHTML += `
                <div class="p-4 rounded-xl bg-gray-100 shadow flex items-center justify-between gap-4">
                    <div>
                        <div class="font-bold text-blue-800">${tpl.name}</div>
                        <div class="text-gray-500 text-xs">${tpl.description || ""}</div>
                    </div>
                    <button
                        class="create-btn bg-green-600 text-white px-4 py-1.5 rounded font-semibold shadow hover:bg-green-800 transition"
                        data-assignment="${tpl.name}"
                        data-classroom="${getClassroom()}">Crear Assignment</button>
                </div>
            `;
        });

        caPrev.disabled = currentPage <= 1;
        caNext.disabled = currentPage >= totalPages;
        caPageinfo.textContent = `Página ${currentPage} de ${totalPages}`;

        // Asigna eventos a los botones de crear
        caTemplateList.querySelectorAll('.create-btn').forEach(btn => {
            btn.onclick = () => {
                const name = btn.getAttribute('data-assignment');
                const classroomSlug = btn.getAttribute('data-classroom');
                navigator.clipboard.writeText(name);
                window.open(`https://classroom.github.com/classrooms/${classroomSlug}/new_assignments/new`, "_blank");
                alert(`¡Nombre del assignment "${name}" copiado!\n\nPega ese nombre en el formulario de Classroom como nombre del assignment.`);
            };
        });
    }
}