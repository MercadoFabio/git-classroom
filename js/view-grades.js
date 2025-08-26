/**
 * Renderiza la vista para mostrar las notas y entregas. (Estilo v2.0 Futurist)
 * Utiliza el token guardado en sessionStorage.
 * @param {HTMLElement} container - El elemento HTML donde se renderizará la vista.
 */
function renderViewGrades(container) {
    // Renderiza la plantilla HTML base con los nuevos estilos
    container.innerHTML = getGradesHTMLTemplate();
    
    // --- Referencias DOM (se elimina gToken) ---
    const $ = sel => container.querySelector(sel);
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

    // --- Variables de estado ---
    const API_VERSION = "2022-11-28";
    const PAGE_SIZE = 10;
    let assignmentsCache = [];
    let gradesAll = [];
    let gradesFiltered = [];
    let currentPage = 1;
    let currentSortColumn = "points_awarded";
    let isAscending = false;

    // --- Lógica de eventos y fetch ---
    gClassroom.addEventListener("focus", handleLoadClassrooms, { once: true });
    gStep1.onsubmit = handleLoadAssignments;
    gStep2.onsubmit = handleLoadGrades;
    gGradeFilter.oninput = handleFilter;
    gPrev.onclick = () => changePage(-1);
    gNext.onclick = () => changePage(1);

    async function handleLoadClassrooms() {
        const token = getToken(); 
        if (!token) return;

        gClassroom.innerHTML = `<option disabled selected value="">Cargando...</option>`;
        gLoading.textContent = "Cargando classrooms...";
        gError.textContent = "";
        try {
            showSpinner();
            const res = await fetch("https://api.github.com/classrooms", { headers: githubHeaders(token) });
            hideSpinner();
            if (!res.ok) throw new Error("Token inválido o sin acceso.");
            const classrooms = await res.json();
            gClassroom.innerHTML = `<option disabled selected value="">--- Selecciona un classroom ---</option>`;
            classrooms.forEach(cl => { gClassroom.innerHTML += `<option value="${cl.id}">${cl.name}</option>`; });
            if (classrooms.length === 0) gError.textContent = "No se encontraron classrooms.";
        } catch (e) {
            hideSpinner();
            gClassroom.innerHTML = `<option disabled selected value="">Error</option>`;
            gError.textContent = e.message;
        } finally {
            gLoading.textContent = "";
        }
    }

    async function handleLoadAssignments(ev) {
        ev.preventDefault();
        const token = getToken();
        if (!token) return;

        gAssignment.innerHTML = `<option disabled selected value="">Cargando...</option>`;
        gError.textContent = "";
        gLoading.textContent = "Cargando assignments...";
        gGradesView.classList.add('hidden');
        gStep2.classList.add('hidden');
        try {
            const classId = gClassroom.value;
            if (!classId) throw new Error("Selecciona un classroom");
            showSpinner();
            const res = await fetch(`https://api.github.com/classrooms/${classId}/assignments`, { headers: githubHeaders(token) });
            hideSpinner();
            if (!res.ok) throw new Error("No se pueden obtener assignments.");
            const assignments = await res.json();
            assignmentsCache = assignments;
            gAssignment.innerHTML = `<option disabled selected value="">--- Selecciona un assignment ---</option>`;
            assignments.forEach(a => gAssignment.innerHTML += `<option value="${a.id}">${a.title}</option>`);
            if (assignments.length > 0) gStep2.classList.remove('hidden');
            else gError.textContent = "Este classroom no tiene assignments.";
        } catch (e) {
            hideSpinner();
            gError.textContent = e.message;
        } finally {
            gLoading.textContent = "";
        }
    }

    async function handleLoadGrades(ev) {
        ev.preventDefault();
        const token = getToken();
        if (!token) return;

        gGradesView.classList.add('hidden');
        gError.textContent = '';
        gLoading.textContent = "Cargando notas...";
        try {
            const assignmentId = gAssignment.value;
            if (!assignmentId) throw new Error("Selecciona un assignment");
            const selectedAssignment = assignmentsCache.find(a => a.id == assignmentId);
            showSpinner();
            const res = await fetch(`https://api.github.com/assignments/${assignmentId}/grades`, { headers: githubHeaders(token) });
            hideSpinner();
            if (!res.ok) throw new Error("No se pueden obtener notas.");
            gradesAll = await res.json();
            gradesAll.forEach(grade => { grade.deadline = selectedAssignment.deadline; });
            gradesFiltered = gradesAll;
            currentPage = 1;
            sortGrades();
            renderGradesTable();
            gGradesView.classList.remove('hidden');
        } catch (e) {
            hideSpinner();
            gError.textContent = e.message;
        } finally {
            gLoading.textContent = '';
        }
    }

    function handleFilter() {
        const q = gGradeFilter.value.toLowerCase();
        gradesFiltered = gradesAll.filter(g => (g.github_username + " " + (g.roster_identifier || "")).toLowerCase().includes(q));
        currentPage = 1;
        renderGradesTable();
    }
    
    function changePage(delta) {
        currentPage += delta;
        renderGradesTable();
    }

    function githubHeaders(token) {
        return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": API_VERSION };
    }

 

    function sortGrades() { gradesFiltered.sort((a, b) => { const valA = getSortValue(a, currentSortColumn); const valB = getSortValue(b, currentSortColumn); if (valA < valB) return isAscending ? -1 : 1; if (valA > valB) return isAscending ? 1 : -1; return 0; }); }
    function getSortValue(item, column) { if (column === "points_awarded") return item.points_awarded != null ? item.points_awarded / 10 : -1; if (column === "submission_timestamp") return item.submission_timestamp ? new Date(item.submission_timestamp) : new Date(0); return item[column] || ""; }
    function renderGradesTable() {
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const grades = gradesFiltered.slice(start, end);
        gGradesTbody.innerHTML = grades.map(renderGradeRow).join("") || `<tr><td colspan="6" class="text-center p-6 text-slate-400">No hay datos para mostrar.</td></tr>`;
        updatePagination();
        const headers = container.querySelectorAll("th[data-column]");
        updateSortIcons(headers);
        headers.forEach(header => {
            header.onclick = () => {
                const col = header.getAttribute("data-column");
                if (currentSortColumn === col) isAscending = !isAscending;
                else { currentSortColumn = col; isAscending = true; }
                sortGrades();
                renderGradesTable();
            };
        });
    }
    function renderGradeRow(grade) {
        const repoLink = grade.student_repository_name ? `<a href="${grade.student_repository_url}" target="_blank" class="font-semibold text-cyan-400 hover:underline hover:text-cyan-300">${grade.student_repository_name}</a>` : "N/A";
        const fechaEntrega = grade.submission_timestamp;
        const fechaLimite = grade.deadline;
        let entregaTardia = false;
        if (fechaEntrega && fechaLimite) { entregaTardia = new Date(fechaEntrega) > new Date(fechaLimite); }
        const fechaEntregaClass = entregaTardia ? 'text-red-400 font-semibold' : 'text-slate-300';
        return `
            <tr class="border-b border-slate-700/50 transition-colors duration-200 hover:bg-slate-800/50">
                <td class="p-3 text-slate-300 font-medium">${grade.github_username}</td>
                <td class="p-3 text-slate-400">${grade.roster_identifier || "—"}</td>
                <td class="p-3 text-slate-400 break-all">${repoLink}</td>
                <td class="p-3 ${fechaEntregaClass}">${formatDate(fechaEntrega)}</td>
                <td class="p-3 text-slate-400">${formatDate(fechaLimite)}</td>
                <td class="p-3 text-center text-xl font-bold text-cyan-300">${formatGrade(grade.points_awarded)}</td>
            </tr>`;
    }
    function formatDate(timestamp) { if (!timestamp) return "—"; const d = new Date(timestamp); return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`; }
    function formatGrade(points) { return points != null ? (points / 10).toFixed(1) : "—"; }
    function updatePagination() { const total = gradesFiltered.length; const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE)); gGradesCount.textContent = `Mostrando ${Math.min(PAGE_SIZE, gradesFiltered.slice((currentPage - 1) * PAGE_SIZE).length)} de ${total} registros`; gPageInfo.textContent = `Página ${currentPage} de ${totalPages}`; gPrev.disabled = currentPage <= 1; gNext.disabled = currentPage >= totalPages; }
    function updateSortIcons(headers) { headers.forEach(header => { const col = header.getAttribute("data-column"); let sortIcon = header.querySelector(".sort-icon"); if (!sortIcon) { sortIcon = document.createElement("span"); sortIcon.className = "sort-icon ml-1 text-cyan-400"; header.appendChild(sortIcon); } sortIcon.textContent = col === currentSortColumn ? (isAscending ? "▲" : "▼") : ""; }); }

    /**
     * Devuelve la plantilla HTML base de la vista con el estilo v2.0
     */
    function getGradesHTMLTemplate() {
        return `
            <div class="glass-panel rounded-xl p-6 md:p-8 w-full space-y-6">
                <h2 class="text-2xl md:text-3xl font-bold text-cyan-300 text-center tracking-wider">📊 Notas y Entregas</h2>
                
                <!-- PASO 1: SELECCIONAR CLASSROOM -->
                <div class="border border-slate-700/50 p-5 rounded-lg">
                    <h3 class="font-semibold text-lg text-slate-300 mb-4 border-b border-slate-700 pb-2">Paso 1: Seleccionar Classroom</h3>
                    <form id="gstep1-form" class="space-y-5">
                        <!-- El input de token se ha eliminado -->
                        <div>
                            <label class="block text-sm font-semibold text-cyan-200 mb-2">Classroom:</label>
                            <select id="g-classroom" class="glass-panel w-full px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none" required>
                                <option disabled selected hidden value="">--- Selecciona un classroom ---</option>
                            </select>
                        </div>
                        <button type="submit" class="w-full bg-cyan-600 text-slate-900 font-bold py-3 px-4 rounded-md transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400">Listar Assignments</button>
                    </form>
                </div>

                <!-- PASO 2: SELECCIONAR ASSIGNMENT -->
                <div id="gstep2-form" class="border border-slate-700/50 p-5 rounded-lg hidden">
                     <h3 class="font-semibold text-lg text-slate-300 mb-4 border-b border-slate-700 pb-2">Paso 2: Seleccionar Assignment</h3>
                    <form class="space-y-5">
                        <div>
                            <label class="block text-sm font-semibold text-cyan-200 mb-2">Assignment:</label>
                            <select id="g-assignment" class="glass-panel w-full px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none" required></select>
                        </div>
                        <button type="submit" class="w-full bg-emerald-600 text-white font-semibold py-3 px-4 rounded-md transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500">Ver Entregas y Notas</button>
                    </form>
                </div>

                <div id="g-error" class="text-red-400 font-medium mt-2 text-center"></div>
                <div id="g-loading" class="text-cyan-300 font-medium mt-2 text-center"></div>

                <!-- VISTA DE NOTAS -->
                <div id="g-gradesview" class="hidden mt-6">
                    <div class="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <input type="text" id="g-gradefilter" placeholder="Filtrar por usuario o email..." class="glass-panel w-full sm:w-auto px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none placeholder-slate-500"/>
                        <span id="g-grades-count" class="text-xs text-slate-400 flex-shrink-0"></span>
                    </div>
                    <div class="w-full overflow-x-auto border border-slate-700/50 rounded-lg">
                        <table id="g-grades-table" class="w-full min-w-full text-sm">
                            <thead class="border-b-2 border-cyan-400/30">
                                <tr>
                                    <th class="p-3 text-left font-semibold text-slate-300 tracking-wider">Usuario</th>
                                    <th class="p-3 text-left font-semibold text-slate-300 tracking-wider">Email</th>
                                    <th class="p-3 text-left font-semibold text-slate-300 tracking-wider">Repo</th>
                                    <th class="p-3 text-left font-semibold text-slate-300 tracking-wider cursor-pointer" data-column="submission_timestamp">Fecha Entrega</th>
                                    <th class="p-3 text-left font-semibold text-slate-300 tracking-wider">Fecha Límite</th>
                                    <th class="p-3 text-center font-semibold text-slate-300 tracking-wider cursor-pointer" data-column="points_awarded">Nota</th>                 
                                </tr>
                            </thead>
                            <tbody id="g-grades-tbody"></tbody>
                        </table>
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <button id="g-prev-page" class="border border-cyan-600 text-cyan-400 px-4 py-2 rounded-md text-sm transition hover:bg-cyan-600/20 disabled:opacity-40 disabled:border-slate-600 disabled:text-slate-500 disabled:cursor-not-allowed">Anterior</button>
                        <span id="g-grades-page" class="text-sm text-slate-400 font-medium"></span>
                        <button id="g-next-page" class="border border-cyan-600 text-cyan-400 px-4 py-2 rounded-md text-sm transition hover:bg-cyan-600/20 disabled:opacity-40 disabled:border-slate-600 disabled:text-slate-500 disabled:cursor-not-allowed">Siguiente</button>
                    </div>
                </div>
            </div>
        `;
    }
}