/**
 * Renderiza la vista para mostrar las notas y entregas en el contenedor proporcionado.
 *
 * @param {HTMLElement} container - El elemento HTML donde se renderizará la vista.
 */
function renderViewGrades(container) {
    // Renderiza el contenido HTML de la vista
    container.innerHTML = `
            <div class="bg-white shadow rounded-2xl p-7">
              <h2 class="text-2xl font-extrabold mb-4 text-blue-900 text-center">📊 Notas y Entregas</h2>
              <form id="gstep1-form" class="space-y-4 mb-6">
                <div>
                  <label class="block text-sm font-semibold text-blue-700 mb-1">GitHub Token:</label>
                  <input type="password" id="g-token" class="border px-3 py-2 rounded-lg w-full focus:ring" required/>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-blue-700 mb-1">Classroom:</label>
                  <select id="g-classroom" class="border px-3 py-2 rounded-lg w-full focus:ring" required>
                    <option disabled selected hidden value="">--- Selecciona un classroom ---</option>
                  </select>
                </div>
                <button type="submit" class="bg-blue-700 text-white font-semibold rounded-lg py-2 shadow hover:bg-blue-900 transition w-full">Listar assignments</button>
              </form>
              <form id="gstep2-form" class="space-y-4 hidden">
                <div>
                  <label class="block text-sm font-semibold text-blue-700 mb-1">Assignment:</label>
                  <select id="g-assignment" class="border px-3 py-2 rounded-lg w-full focus:ring" required></select>
                </div>
                <button type="submit" class="bg-green-600 text-white font-semibold rounded-lg py-2 shadow hover:bg-green-800 transition w-full">Ver entregas y notas</button>
              </form>
              <div id="g-error" class="text-red-600 font-medium mt-2"></div>
              <div id="g-loading" class="text-blue-700 font-medium mt-2"></div>
              <div id="g-gradesview" class="hidden mt-6">
                <div class="mb-3 flex items-center">
                  <input type="text" id="g-gradefilter" placeholder="Filtrar por usuario/email" class="border px-2 py-1 mr-3 rounded"/>
                  <span id="g-grades-count" class="text-xs text-gray-700"></span>
                </div>
                <div class="w-full overflow-x-auto rounded border shadow">
                  <table id="g-grades-table" class="w-full min-w-full border-collapse text-sm">
                    <thead class="bg-sky-100">
                      <tr>
                        <th class="p-3 border-b text-left">Usuario</th>
                        <th class="p-3 border-b text-left">Email</th>
                        <th class="p-3 border-b text-left">Repo</th>
                        <th class="p-3 border-b text-left">Fecha</th>
                        <th class="p-3 border-b text-left">Nota</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y" id="g-grades-tbody"></tbody>
                  </table>
                </div>
                <div class="flex justify-between items-center mt-4">
                  <button id="g-prev-page" class="bg-blue-700 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-900 transition disabled:opacity-50" disabled>Anterior</button>
                  <span id="g-grades-page" class="text-sm text-gray-700"></span>
                  <button id="g-next-page" class="bg-blue-700 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-900 transition disabled:opacity-50" disabled>Siguiente</button>
                </div>
              </div>
            </div>
          `;

    // Referencias a los elementos del DOM
    const gToken = container.querySelector("#g-token");
    const gClassroom = container.querySelector("#g-classroom");
    const gAssignment = container.querySelector("#g-assignment");
    const gStep1 = container.querySelector("#gstep1-form");
    const gStep2 = container.querySelector("#gstep2-form");
    const gError = container.querySelector("#g-error");
    const gLoading = container.querySelector("#g-loading");
    const gGradesView = container.querySelector("#g-gradesview");
    const gGradesTbody = container.querySelector("#g-grades-tbody");
    const gGradeFilter = container.querySelector("#g-gradefilter");
    const gGradesCount = container.querySelector("#g-grades-count");
    const gPrev = container.querySelector('#g-prev-page');
    const gNext = container.querySelector('#g-next-page');
    const gPageInfo = container.querySelector('#g-grades-page');
    const API_VERSION = "2022-11-28";

    // Variables para almacenar datos de notas y paginación
    let GHTOKEN = '';
    let gradesAll = [];
    let gradesFiltered = [];
    let gradesCurrentPage = 1;
    const GRD_PAGE_SZ = 10;

    /**
     * Evento para cargar los classrooms disponibles al cambiar el token.
     */
    gToken.addEventListener('change', async () => {
        GHTOKEN = gToken.value.trim();
        gClassroom.innerHTML = `<option disabled selected value="">Cargando classrooms...</option>`;
        gLoading.textContent = "Cargando classrooms...";
        try {
            showSpinner();
            const resp = await fetch('https://api.github.com/classrooms', {
                headers: {
                    'Authorization': `Bearer ${GHTOKEN}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': API_VERSION
                }
            }).finally(() => hideSpinner());
            if (!resp.ok) throw new Error("Token inválido o sin acceso a classrooms");
            const data = await resp.json();
            gClassroom.innerHTML = `<option disabled selected value="">--- Selecciona un classroom ---</option>`;
            data.forEach(cls => {
                gClassroom.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
            });
        } catch (e) {
            gClassroom.innerHTML = `<option disabled selected value="">Error</option>`;
            gError.textContent = e.message;
        }
        gLoading.textContent = '';
    });

    /**
     * Evento para listar los assignments de un classroom seleccionado.
     */
    gStep1.onsubmit = async (ev) => {
        ev.preventDefault();
        gAssignment.innerHTML = `<option disabled selected value="">Cargando assignments...</option>`;
        gError.textContent = '';
        gLoading.textContent = "Cargando assignments...";
        gGradesView.classList.add('hidden');
        gStep2.classList.add('hidden');
        try {
            showSpinner();
            const classId = gClassroom.value;
            if (!classId) throw new Error("Selecciona un classroom");
            const resp = await fetch(`https://api.github.com/classrooms/${classId}/assignments`, {
                headers: {
                    'Authorization': `Bearer ${GHTOKEN}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': API_VERSION
                }
            }).finally(() => hideSpinner());
            if (!resp.ok) throw new Error("No se pueden obtener assignments.");
            const data = await resp.json();
            gAssignment.innerHTML = `<option disabled selected value="">--- Selecciona un assignment ---</option>`;
            data.forEach(asg => gAssignment.innerHTML += `<option value="${asg.id}">${asg.title}</option>`);
            if (data.length) gStep2.classList.remove('hidden');
            else gError.textContent = 'Este classroom no tiene assignments.';
        } catch (e) {
            gError.textContent = e.message;
        }
        gLoading.textContent = '';
    };

    /**
     * Evento para obtener las notas de un assignment seleccionado.
     */
    gStep2.onsubmit = async (ev) => {
        ev.preventDefault();
        gGradesView.classList.add('hidden');
        gError.textContent = '';
        gLoading.textContent = "Cargando notas...";
        try {
            const assignmentId = gAssignment.value;
            if (!assignmentId) throw new Error("Selecciona un assignment");
            const resp = await fetch(`https://api.github.com/assignments/${assignmentId}/grades`, {
                headers: {
                    'Authorization': `Bearer ${GHTOKEN}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': API_VERSION
                }
            });
            if (!resp.ok) throw new Error("No se pueden obtener notas.");
            const data = await resp.json();
            gradesAll = data;
            gradesFiltered = data;
            gradesCurrentPage = 1;
            renderGradesTable();
            gGradesView.classList.remove('hidden');
        } catch (e) {
            gError.textContent = e.message;
        }
        gLoading.textContent = '';
    };

    /**
     * Renderiza la tabla de notas con la información filtrada y paginada.
     */
    function renderGradesTable() {
        let start = (gradesCurrentPage - 1) * GRD_PAGE_SZ, end = start + GRD_PAGE_SZ;
        let grades = gradesFiltered.slice(start, end);
        gGradesTbody.innerHTML = grades.map(grade => `
              <tr class="even:bg-sky-50 odd:bg-white">
                <td class="p-3 break-all">${grade.github_username}</td>
                <td class="p-3 break-all">${grade.roster_identifier || ''}</td>
                <td class="p-3 break-all">${grade.student_repository_name ?
            `<a href="${grade.student_repository_url}" target="_blank" class="underline text-blue-700">${grade.student_repository_name}</a>` : ""}</td>
                <td class="p-3 break-all">${grade.submission_timestamp || ''}</td>
                <td class="p-3 break-all ${grade.points_awarded === grade.points_available ? "font-bold text-green-700" : grade.points_awarded === 0 ? "text-red-700" : ""}">${grade.points_awarded ?? ''}</td>
              </tr>
            `).join('');

        // Actualiza la información de paginación
        let total = gradesFiltered.length, pages = Math.max(1, Math.ceil(total / GRD_PAGE_SZ));
        gGradesCount.textContent = `Mostrando ${Math.min(GRD_PAGE_SZ, total)} de ${total}`;
        gPageInfo.textContent = `Página ${gradesCurrentPage} de ${pages}`;
        gPrev.disabled = gradesCurrentPage === 1;
        gNext.disabled = gradesCurrentPage === pages;
    }

    /**
     * Filtra las notas según el texto ingresado en el campo de búsqueda.
     */
    gGradeFilter.oninput = () => {
        const search = gGradeFilter.value.toLowerCase();
        gradesFiltered = gradesAll.filter(g =>
            (g.github_username + " " + (g.roster_identifier || "")).toLowerCase().includes(search)
        );
        gradesCurrentPage = 1;
        renderGradesTable();
    };

    /**
     * Evento para ir a la página anterior de la tabla de notas.
     */
    gPrev.onclick = () => {
        if (gradesCurrentPage > 1) {
            gradesCurrentPage--;
            renderGradesTable();
        }
    };

    /**
     * Evento para ir a la página siguiente de la tabla de notas.
     */
    gNext.onclick = () => {
        const pages = Math.ceil(gradesFiltered.length / GRD_PAGE_SZ);
        if (gradesCurrentPage < pages) {
            gradesCurrentPage++;
            renderGradesTable();
        }
    };
}