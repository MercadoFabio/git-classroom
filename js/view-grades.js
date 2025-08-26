/**
 * Renderiza la vista para mostrar las notas y entregas en el contenedor proporcionado.
 * @param {HTMLElement} container - El elemento HTML donde se renderizará la vista.
 */
function renderViewGrades(container) {
    // Render HTML base
    container.innerHTML = getGradesHTMLTemplate();
    setupHelpTokenModal("help-token-btn-grades");

    // --- DOM references ---
    const $ = sel => container.querySelector(sel);
    const gToken = $("#g-token");
    const gClassroom = $("#g-classroom");
    const gAssignment = $("#g-assignment");
    const gStep1 = $("#gstep1-form");
    const gStep2 = $("#gstep2-form");
    const gError = $("#g-error");
    const gLoading = $("#g-loading");
    const gGradesView = $("#g-gradesview");
    const gGradesTbody = $("#g-grades-tbody");
    const gGradeFilter = $("#g-gradefilter");
    const gGradesCount = $("#g-grades-count");
    const gPrev = $("#g-prev-page");
    const gNext = $("#g-next-page");
    const gPageInfo = $("#g-grades-page");

    // --- State variables ---
    const API_VERSION = "2022-11-28";
    const PAGE_SIZE = 10;
    let apiToken = "";
    let assignmentsCache = []; // <<< 1. Guardar la info completa de los assignments
    let gradesAll = [];
    let gradesFiltered = [];
    let currentPage = 1;
    let currentSortColumn = "points_awarded";
    let isAscending = false;

    // --- Event bindings ---
    gToken.addEventListener("change", handleLoadClassrooms);
    gStep1.onsubmit = handleLoadAssignments;
    gStep2.onsubmit = handleLoadGrades;
    gGradeFilter.oninput = handleFilter;
    gPrev.onclick = () => changePage(-1);
    gNext.onclick = () => changePage(1);

    // --- Event Handlers ---

    async function handleLoadClassrooms() {
        apiToken = gToken.value.trim();
        gClassroom.innerHTML = `<option disabled selected value="">Cargando classrooms...</option>`;
        gLoading.textContent = "Cargando classrooms...";
        gError.textContent = "";

        try {
            showSpinner();
            const res = await fetch("https://api.github.com/classrooms", {
                headers: githubHeaders(apiToken)
            });
            hideSpinner();

            if (!res.ok) throw new Error("Token inválido o sin acceso a classrooms.");
            const classrooms = await res.json();

            gClassroom.innerHTML = `<option disabled selected value="">--- Selecciona un classroom ---</option>`;
            classrooms.forEach(cl => {
                gClassroom.innerHTML += `<option value="${cl.id}">${cl.name}</option>`;
            });
            if (classrooms.length === 0) gError.textContent = "No se encontraron classrooms disponibles.";
        } catch (e) {
            gClassroom.innerHTML = `<option disabled selected value="">Error</option>`;
            gError.textContent = e.message;
        } finally {
            gLoading.textContent = "";
        }
    }

    async function handleLoadAssignments(ev) {
        ev.preventDefault();
        gAssignment.innerHTML = `<option disabled selected value="">Cargando assignments...</option>`;
        gError.textContent = "";
        gLoading.textContent = "Cargando assignments...";
        gGradesView.classList.add('hidden');
        gStep2.classList.add('hidden');
        try {
            const classId = gClassroom.value;
            if (!classId) throw new Error("Selecciona un classroom");
            showSpinner();
            const res = await fetch(`https://api.github.com/classrooms/${classId}/assignments`, {
                headers: githubHeaders(apiToken)
            });
            hideSpinner();

            if (!res.ok) throw new Error("No se pueden obtener assignments.");

            const assignments = await res.json();
            assignmentsCache = assignments; // <<< 2. Almacenar los assignments en el caché
            
            gAssignment.innerHTML = `<option disabled selected value="">--- Selecciona un assignment ---</option>`;
            assignments.forEach(a =>
                gAssignment.innerHTML += `<option value="${a.id}">${a.title}</option>`
            );

            if (assignments.length > 0) gStep2.classList.remove('hidden');
            else gError.textContent = "Este classroom no tiene assignments.";
        } catch (e) {
            gError.textContent = e.message;
        } finally {
            gLoading.textContent = "";
        }
    }

    async function handleLoadGrades(ev) {
        ev.preventDefault();
        gGradesView.classList.add('hidden');
        gError.textContent = '';
        gLoading.textContent = "Cargando notas...";
        try {
            const assignmentId = gAssignment.value;
            if (!assignmentId) throw new Error("Selecciona un assignment");

            // <<< 3. Recuperar el assignment seleccionado del caché
            const selectedAssignment = assignmentsCache.find(a => a.id == assignmentId);
            
            showSpinner();
            const res = await fetch(`https://api.github.com/assignments/${assignmentId}/grades`, {
                headers: githubHeaders(apiToken)
            });
            hideSpinner();

            if (!res.ok) throw new Error("No se pueden obtener notas.");
            gradesAll = await res.json();

            // <<< 4. Añadir el deadline a cada objeto 'grade' para facilitar el renderizado
            gradesAll.forEach(grade => {
                grade.deadline = selectedAssignment.deadline;
            });
            console.log(gradesAll,"notas")
            gradesFiltered = gradesAll;
            currentPage = 1;
            sortGrades();
            renderGradesTable();
            gGradesView.classList.remove('hidden');
        } catch (e) {
            gError.textContent = e.message;
        } finally {
            gLoading.textContent = '';
        }
    }

    function handleFilter() {
        const q = gGradeFilter.value.toLowerCase();
        gradesFiltered = gradesAll.filter(g =>
            (g.github_username + " " + (g.roster_identifier || "")).toLowerCase().includes(q)
        );
        currentPage = 1;
        renderGradesTable();
    }

    function changePage(delta) {
        currentPage += delta;
        renderGradesTable();
    }

    // --- Helpers ---
    function githubHeaders(token) {
        return {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": API_VERSION,
        };
    }

    function sortGrades() {
        gradesFiltered.sort((a, b) => {
            const valA = getSortValue(a, currentSortColumn);
            const valB = getSortValue(b, currentSortColumn);
            if (valA < valB) return isAscending ? -1 : 1;
            if (valA > valB) return isAscending ? 1 : -1;
            return 0;
        });
    }

    function getSortValue(item, column) {
        if (column === "points_awarded") return item.points_awarded != null ? item.points_awarded / 10 : -1; // -1 para no calificados
        if (column === "submission_timestamp") return item.submission_timestamp ? new Date(item.submission_timestamp) : new Date(0); // 1970 para no entregados
        return item[column] || "";
    }

    function renderGradesTable() {
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const grades = gradesFiltered.slice(start, end);

        gGradesTbody.innerHTML = grades.map(renderGradeRow).join("");
        updatePagination();

        const headers = container.querySelectorAll("th[data-column]");
        updateSortIcons(headers);
        headers.forEach(header => {
            header.onclick = () => {
                const col = header.getAttribute("data-column");
                if (currentSortColumn === col) isAscending = !isAscending;
                else {
                    currentSortColumn = col;
                    isAscending = true;
                }
                sortGrades();
                renderGradesTable();
            };
        });
    }

    function renderGradeRow(grade) {
        const repoLink = grade.student_repository_name ?
            `<a href="${grade.student_repository_url}" target="_blank" class="underline text-blue-700">${grade.student_repository_name}</a>` : "N/A";

        // <<< 5. Lógica para manejar las fechas y resaltar entregas tardías >>>
        const fechaEntrega = grade.submission_timestamp;
        const fechaLimite = grade.deadline;
        let entregaTardia = false;
        
        if (fechaEntrega && fechaLimite) {
            entregaTardia = new Date(fechaEntrega) > new Date(fechaLimite);
        }

        // Aplicar clase CSS si la entrega es tardía
        const fechaEntregaClass = entregaTardia ? 'text-red-600 font-bold' : '';

        return `
            <tr class="even:bg-sky-50 odd:bg-white">
                <td class="p-3 break-all">${grade.github_username}</td>
                <td class="p-3 break-all">${grade.roster_identifier || ""}</td>
                <td class="p-3 break-all">${repoLink}</td>
                <td class="p-3 break-all ${fechaEntregaClass}">${formatDate(fechaEntrega)}</td>
                <td class="p-3 break-all">${formatDate(fechaLimite)}</td>
                <td class="p-3 break-all text-center">${formatGrade(grade.points_awarded)}</td>
            </tr>`;
    }

    function formatDate(timestamp) {
        if (!timestamp) return "---";
        const d = new Date(timestamp);
        // Formato DD/MM/AAAA HH:MM
        return `${d.getDate().toString().padStart(2, "0")}/${
            (d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${
            d.getHours().toString().padStart(2, "0")}:${
            d.getMinutes().toString().padStart(2, "0")}`;
    }

    function formatGrade(points) {
        return points != null ? (points / 10).toFixed(1) : "---"; // Muestra un decimal
    }

    function updatePagination() {
        const total = gradesFiltered.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        gGradesCount.textContent = `Mostrando ${Math.min(PAGE_SIZE, gradesFiltered.slice((currentPage - 1) * PAGE_SIZE).length)} de ${total}`;
        gPageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        gPrev.disabled = currentPage <= 1;
        gNext.disabled = currentPage >= totalPages;
    }

    function updateSortIcons(headers) {
        headers.forEach(header => {
            const col = header.getAttribute("data-column");
            let sortIcon = header.querySelector(".sort-icon");
            if (!sortIcon) {
                sortIcon = document.createElement("span");
                sortIcon.className = "sort-icon ml-1";
                header.appendChild(sortIcon);
            }
            sortIcon.textContent = col === currentSortColumn ? (isAscending ? "▲" : "▼") : "";
        });
    }

    // --- Plantilla base ---
    function getGradesHTMLTemplate() {
        // <<< 6. Añadir la columna "Fecha Límite" a la plantilla HTML >>>
        return `
            <div class="bg-white shadow rounded-2xl p-7">
                <h2 class="text-2xl font-extrabold mb-4 text-blue-900 text-center">📊 Notas y Entregas</h2>
                <form id="gstep1-form" class="space-y-4 mb-6">
                    ${renderTokenInput({inputId: "g-token", btnId: "help-token-btn-grades"})}
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
                                    <th class="p-3 border-b text-left cursor-pointer" data-column="submission_timestamp">
                                        Fecha Entrega <span class="sort-icon"></span>
                                    </th>
                                    <th class="p-3 border-b text-left">Fecha Límite</th>
                                    <th class="p-3 border-b text-center cursor-pointer" data-column="points_awarded">
                                        Nota <span class="sort-icon"></span>
                                    </th>                 
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
    }
}