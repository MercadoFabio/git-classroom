/**
 * Renderiza la vista para crear assignments en el contenedor proporcionado.
 *
 * @param {HTMLElement} container - El elemento HTML donde se renderizará la vista.
 */
function renderCreateAssignmentsView(container) {
    // Renderiza el formulario principal y la estructura de la vista
    container.innerHTML = `
    <div class="bg-white shadow rounded-2xl p-7">
      <h2 class="text-2xl font-extrabold mb-2 text-blue-900 text-center">🚀 Crear Assignments</h2>
      <form id="ca-form" class="space-y-4">
        <div>
            <label class="block text-sm font-semibold text-blue-700 mb-1">GitHub Token:</label>
            <input type="password" id="ca-token" autocomplete="off"
              class="border px-3 py-2 rounded-lg w-full focus:ring" required/>
        </div>
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

    // Referencias a los elementos del DOM
    const caToken = container.querySelector('#ca-token');
    const caOrg = container.querySelector('#ca-org');
    const caClassroom = container.querySelector('#ca-classroom');
    const caPrefix = container.querySelector('#ca-prefix');
    const caForm = container.querySelector('#ca-form');
    const caError = container.querySelector('#ca-error');
    const caTemplatesSection = container.querySelector('#ca-templates-section');
    const caFilter = container.querySelector('#ca-filter');
    const caTemplateList = container.querySelector('#ca-template-list');
    const caPrev = container.querySelector('#ca-prev');
    const caNext = container.querySelector('#ca-next');
    const caPageinfo = container.querySelector('#ca-pageinfo');
    let caTemplatesFull = [], caTemplatesFiltered = [], caCurrentPage = 1;
    const PAGE_SZ = 10;

    // Evento para cargar organizaciones al cambiar el token
    caToken.addEventListener('change', async () => {
        caError.textContent = "";
        caOrg.innerHTML = `<option disabled selected value="">Cargando...</option>`;
        try {
            const resp = await fetch(`https://api.github.com/user/orgs`, {
                headers: { "Authorization": `Bearer ${caToken.value.trim()}` }
            });
            if (!resp.ok) throw new Error("Token inválido");
            const data = await resp.json();
            caOrg.innerHTML = `<option disabled selected value="">--- Seleccione organización ---</option>`;
            data.forEach(org => {
                caOrg.innerHTML += `<option value="${org.login}">${org.login}</option>`;
            });
        } catch (e) {
            caOrg.innerHTML = `<option disabled selected value="">Error</option>`;
            caError.textContent = e.message;
        }
    });

    // Evento para cargar classrooms al cambiar la organización
    caOrg.addEventListener('change', async () => {
        caClassroom.innerHTML = `<option disabled selected value="">Cargando classrooms...</option>`;
        try {
            const resp = await fetch('https://api.github.com/classrooms', {
                headers: {
                    "Authorization": `Bearer ${caToken.value.trim()}`,
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28"
                }
            });
            const classes = await resp.json();
            caClassroom.innerHTML = `<option disabled selected value="">--- Seleccione classroom ---</option>`;
            classes.filter(c => c.name?.includes(caOrg.value)).forEach(cls => {
                let slug = cls.url.split("/classrooms/")[1];
                caClassroom.innerHTML += `<option value="${slug}">${cls.name}</option>`;
            });
        } catch (e) {
            caClassroom.innerHTML = `<option disabled selected value="">Error</option>`;
            caError.textContent = e.message;
        }
    });

    // Evento para manejar el envío del formulario
    caForm.onsubmit = async (e) => {
        e.preventDefault();
        caError.textContent = "";
        const org = caOrg.value, prefix = caPrefix.value, slug = caClassroom.value, token = caToken.value.trim();
        if (!org || !prefix || !slug || !token) {
            caError.textContent = "Completa todos los campos";
            return;
        }
        caTemplatesSection.classList.remove("hidden");
        caTemplateList.innerHTML = `<div class="py-4 text-blue-700">⏳ Buscando templates...</div>`;
        let templates = [];
        try {
            let page = 1, more = true;
            while (more) {
                const url = `https://api.github.com/orgs/${org}/repos?type=private&per_page=100&page=${page}`;
                const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
                const data = await res.json();
                if (data.length === 0) break;
                templates.push(...(data.filter(r => r.is_template)));
                more = data.length === 100;
                page++;
            }
            if (prefix !== "ALL") templates = templates.filter(t => t.name.startsWith(prefix));
            caTemplatesFull = templates;
            caCurrentPage = 1;
            updateTemplateTable();
        } catch (e) {
            caError.textContent = e.message;
            caTemplatesSection.classList.add("hidden");
        }
    };

    // Actualiza la tabla de templates
    function updateTemplateTable() {
        caTemplateList.innerHTML = "";
        const filterText = caFilter.value?.toLowerCase() || "";
        caTemplatesFiltered = caTemplatesFull.filter(t => t.name.toLowerCase().includes(filterText));
        const totalPages = Math.max(1, Math.ceil(caTemplatesFiltered.length / PAGE_SZ));
        if (caCurrentPage > totalPages) caCurrentPage = totalPages;
        const start = (caCurrentPage - 1) * PAGE_SZ, end = start + PAGE_SZ;
        if (caTemplatesFiltered.length === 0) {
            caTemplateList.innerHTML = `<div class="text-red-600 font-medium">No hay templates.</div>`;
            caPrev.disabled = caNext.disabled = true;
            caPageinfo.textContent = "";
            return;
        }
        caTemplatesFiltered.slice(start, end).forEach(tpl => {
            caTemplateList.innerHTML += `
        <div class="p-4 rounded-xl bg-gray-100 shadow flex items-center justify-between gap-4">
          <div>
            <div class="font-bold text-blue-800">${tpl.name}</div>
            <div class="text-gray-500 text-xs">${tpl.description || ""}</div>
          </div>
          <button
            class="create-btn bg-green-600 text-white px-4 py-1.5 rounded font-semibold shadow hover:bg-green-800 transition"
            data-assignment="${tpl.name}"
            data-classroom="${caClassroom.value}">Crear Assignment</button>
        </div>
      `;
        });
        caPrev.disabled = caCurrentPage === 1;
        caNext.disabled = caCurrentPage === totalPages;
        caPageinfo.textContent = `Página ${caCurrentPage} de ${totalPages}`;
        container.querySelectorAll('.create-btn').forEach(btn => {
            btn.onclick = () => {
                const asg = btn.getAttribute('data-assignment'), classroomSlug = btn.getAttribute('data-classroom');
                navigator.clipboard.writeText(asg);
                window.open(`https://classroom.github.com/classrooms/${classroomSlug}/new_assignments/new`, "_blank");
                alert(`¡Nombre del assignment "${asg}" copiado!\n\nPega ese nombre en el formulario de Classroom como nombre del assignment.`);
            };
        });
    }

    // Eventos para la paginación y filtrado
    caFilter.oninput = () => { caCurrentPage = 1; updateTemplateTable(); };
    caPrev.onclick = () => { if (caCurrentPage > 1) { caCurrentPage--; updateTemplateTable(); } };
    caNext.onclick = () => { const tpages = Math.ceil(caTemplatesFiltered.length / PAGE_SZ); if (caCurrentPage < tpages) { caCurrentPage++; updateTemplateTable(); } };
}