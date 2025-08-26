/**
 * Renderiza la vista de resumen de entregas en el contenedor proporcionado.
 * @param {HTMLElement} container - Contenedor donde se renderizará la vista.
 */
function renderViewDeliveriesSummary(container) {
    // --- Plantilla principal con estilos v2.0 ---
    container.innerHTML = `
        <div class="glass-panel rounded-xl p-6 md:p-8 w-full">
            <h2 class="text-2xl md:text-3xl font-bold mb-6 text-cyan-300 text-center tracking-wider">Resumen de Notas</h2>
            <form id="summary-form" class="space-y-5">
             ${renderTokenInput({inputId: "summary-token", btnId: "help-token-btn-summary"})} 
                <div>
                    <label class="block text-sm font-semibold text-cyan-200 mb-2">Classroom:</label>
                    <select id="summary-classroom" class="glass-panel w-full px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none placeholder-slate-500" required>
                        <option disabled selected value="">--- Selecciona un classroom ---</option>
                    </select>
                </div>
                <button type="submit" class="w-full bg-cyan-600 text-slate-900 font-bold py-3 px-4 rounded-md transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400">Ver Resumen</button>
            </form>
            <div id="summary-results" class="mt-8"></div>
            <div id="summary-error" class="text-red-400 font-medium mt-4 text-center"></div>
        </div>
    `;

    setupHelpTokenModal("help-token-btn-summary");

    // -- Referencias (sin cambios en la lógica) --
    const summaryToken = container.querySelector("#summary-token");
    const summaryClassroom = container.querySelector("#summary-classroom");
    const summaryForm = container.querySelector("#summary-form");
    const summaryResults = container.querySelector("#summary-results");
    const summaryError = container.querySelector("#summary-error");
    let assignments = [];
    let allGrades = [];
    let studentsSummary = {};

    // --- Lógica de carga y fetch (sin cambios) ---
    summaryToken.addEventListener("change", async () => {
        await loadClassrooms(summaryToken.value.trim());
    });

     async function loadClassrooms(token) {
        summaryClassroom.innerHTML = `<option disabled selected value="">Cargando classrooms...</option>`;
        summaryError.textContent = "";
        if (!token) return;
        try {
            showSpinner();
            const res = await fetch('https://api.github.com/classrooms', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': "2022-11-28"
                }
            });
            hideSpinner();
            if (!res.ok) throw new Error("Token inválido o sin acceso a classrooms.");
            const classrooms = await res.json();
            summaryClassroom.innerHTML = `<option disabled selected value="">--- Selecciona un classroom ---</option>`;
            classrooms.forEach(cls => {
                summaryClassroom.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
            });
        } catch (e) {
            hideSpinner();
            summaryError.textContent = e.message;
            summaryClassroom.innerHTML = '<option disabled selected value="">Error al cargar classrooms</option>';
        }
    }

    summaryForm.onsubmit = async (ev) => {
        ev.preventDefault();
        summaryResults.innerHTML = '';
        summaryError.textContent = '';

        const classroomId = summaryClassroom.value;
        const token = summaryToken.value.trim();

        if (!classroomId) {
            summaryError.textContent = 'Por favor selecciona un classroom.';
            return;
        }

        try {
            showSpinner();
            assignments = await getAssignments(classroomId, token);
            allGrades = await getAllGrades(assignments, token);
            hideSpinner();
            studentsSummary = buildStudentSummary(allGrades);
            renderSummaryTable(assignments.length, studentsSummary);
        } catch (e) {
            hideSpinner();
            summaryError.textContent = "Error al obtener las notas: " + e.message;
        }
    };

    async function getAssignments(classroomId, token) {
        const asgResp = await fetch(`https://api.github.com/classrooms/${classroomId}/assignments?page=1&per_page=100`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': "2022-11-28" } });
        if (!asgResp.ok) throw new Error('Error al obtener los assignments.');
        const assignments = await asgResp.json();
        if (!Array.isArray(assignments) || assignments.length === 0) throw new Error('No se encontraron assignments.');
        assignments.sort((a, b) => a.id - b.id);
        return assignments;
    }

    async function getAllGrades(assignments, token) {
        const gradePromises = assignments.map(asg =>
            fetch(`https://api.github.com/assignments/${asg.id}/grades`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': "2022-11-28" } })
            .then(resp => {
                if (!resp.ok) throw new Error(`Error en notas para assignment ${asg.id}.`);
                return resp.json();
            })
        );
        return Promise.all(gradePromises);
    }

    function buildStudentSummary(allGrades) {
        const summary = {};
        allGrades.forEach(grades => {
            grades.forEach(student => {
                const username = student.github_username;
                if (!summary[username]) {
                    summary[username] = { email: student.roster_identifier, entregas: 0, notaTotal: 0, notaCount: 0 };
                }
                if (student.submission_timestamp) summary[username].entregas++;
                if (student.points_awarded !== null && !isNaN(student.points_awarded)) {
                    summary[username].notaTotal += Number(student.points_awarded);
                    summary[username].notaCount++;
                }
            });
        });
        return summary;
    }

    // --- Render del resumen, tabla y controles con estilos v2.0 ---
    function renderSummaryTable(totalAssignments, studentsSummary) {
        let pageSize = 10;
        let currentPage = 1;
        let filterText = '';
        let currentSortColumn = "avgNota", isAscending = false;

        summaryResults.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 p-4 glass-panel rounded-lg border border-slate-700">
                <span class="font-semibold text-slate-300">Total de Assignments: <span class="text-cyan-400 font-bold">${totalAssignments}</span></span>
                <button id="download-excel" class="flex items-center gap-2 border border-emerald-500 text-emerald-400 px-4 py-2 rounded-md text-sm font-semibold transition hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                    Descargar Excel
                </button>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-semibold text-cyan-200 mb-2">Filtrar por Usuario o Email:</label>
                <input type="text" id="filter-input" class="glass-panel w-full px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none placeholder-slate-500" placeholder="Buscar..."/>
            </div>
            <div id="table-container" class="mt-4 overflow-x-auto"></div>
            <div class="flex justify-between items-center mt-4">
                <button id="prev-page" class="border border-cyan-600 text-cyan-400 px-4 py-2 rounded-md text-sm transition hover:bg-cyan-600/20 disabled:opacity-40 disabled:border-slate-600 disabled:text-slate-500 disabled:cursor-not-allowed">Anterior</button>
                <span id="page-info" class="text-sm text-slate-400 font-medium"></span>
                <button id="next-page" class="border border-cyan-600 text-cyan-400 px-4 py-2 rounded-md text-sm transition hover:bg-cyan-600/20 disabled:opacity-40 disabled:border-slate-600 disabled:text-slate-500 disabled:cursor-not-allowed">Siguiente</button>
            </div>
        `;

        const filterInput = summaryResults.querySelector("#filter-input");
        const tableContainer = summaryResults.querySelector("#table-container");
        const prevPageBtn = summaryResults.querySelector("#prev-page");
        const nextPageBtn = summaryResults.querySelector("#next-page");
        const pageInfo = summaryResults.querySelector("#page-info");
        const downloadExcelBtn = summaryResults.querySelector("#download-excel");

        filterInput.addEventListener("input", () => {
            filterText = filterInput.value.toLowerCase();
            currentPage = 1;
            renderTablePager();
        });

        prevPageBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderTablePager(); } });
        nextPageBtn.addEventListener("click", () => { if (currentPage < getTotalPages()) { currentPage++; renderTablePager(); } });
        downloadExcelBtn.addEventListener("click", () => downloadExcelWithXLSX(studentsSummary, totalAssignments, assignments, allGrades));
        
        function filterSortPaginate() {
            let filtered = Object.keys(studentsSummary)
                .filter(user => (studentsSummary[user].email || '').toLowerCase().includes(filterText) || user.toLowerCase().includes(filterText))
                .reduce((obj, key) => { obj[key] = studentsSummary[key]; return obj; }, {});

            const keysSorted = Object.keys(filtered).sort((a, b) => {
                let vA, vB;
                if (currentSortColumn === "avgNota") { vA = filtered[a].notaCount > 0 ? Math.ceil((filtered[a].notaTotal / filtered[a].notaCount) / 10) : 0; vB = filtered[b].notaCount > 0 ? Math.ceil((filtered[b].notaTotal / filtered[b].notaCount) / 10) : 0; } 
                else if (currentSortColumn === "porcentaje") { vA = totalAssignments ? filtered[a].entregas / totalAssignments : 0; vB = totalAssignments ? filtered[b].entregas / totalAssignments : 0; } 
                else if (currentSortColumn === "username") { vA = a.toLowerCase(); vB = b.toLowerCase(); } 
                else { vA = filtered[a][currentSortColumn] || 0; vB = filtered[b][currentSortColumn] || 0; }
                if (vA < vB) return isAscending ? -1 : 1;
                if (vA > vB) return isAscending ? 1 : -1;
                return 0;
            });
            
            const start = (currentPage - 1) * pageSize;
            const paginatedKeys = keysSorted.slice(start, start + pageSize);
            return { current: paginatedKeys.map(k => [k, filtered[k]]), total: keysSorted.length };
        }

        function getTotalPages() { return Math.max(1, Math.ceil(filterSortPaginate().total / pageSize)); }

        function renderTablePager() {
            const { current } = filterSortPaginate();
            let table = `
                <table class="w-full min-w-full text-sm">
                    <thead class="border-b-2 border-cyan-400/30">
                        <tr>
                            <th class="p-3 text-left font-semibold text-slate-300 tracking-wider cursor-pointer" data-column="username">Usuario <span class="sort-icon text-cyan-400">${currentSortColumn === "username" ? (isAscending ? "▲" : "▼") : ""}</span></th>
                            <th class="p-3 text-left font-semibold text-slate-300 tracking-wider">Email</th>
                            <th class="p-3 text-center font-semibold text-slate-300 tracking-wider cursor-pointer" data-column="entregas">Entregas <span class="sort-icon text-cyan-400">${currentSortColumn === "entregas" ? (isAscending ? "▲" : "▼") : ""}</span></th>
                            <th class="p-3 text-center font-semibold text-slate-300 tracking-wider cursor-pointer" data-column="porcentaje">% Entregadas <span class="sort-icon text-cyan-400">${currentSortColumn === "porcentaje" ? (isAscending ? "▲" : "▼") : ""}</span></th>
                            <th class="p-3 text-center font-semibold text-slate-300 tracking-wider cursor-pointer" data-column="avgNota">Nota Prom. <span class="sort-icon text-cyan-400">${currentSortColumn === "avgNota" ? (isAscending ? "▲" : "▼") : ""}</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${current.map(([user, data]) => {
                            const avgNota = data.notaCount > 0 ? Math.ceil((data.notaTotal / data.notaCount) / 10) : 0;
                            const porcentaje = totalAssignments > 0 ? (data.entregas / totalAssignments * 100).toFixed(1) : '0.0';
                            return `<tr class="border-b border-slate-700/50 transition-colors duration-200 hover:bg-cyan-500/10">
                                        <td class="p-3 text-slate-300 font-medium">${user}</td>
                                        <td class="p-3 text-slate-400">${data.email || '—'}</td>
                                        <td class="p-3 text-center text-slate-300">${data.entregas}/${totalAssignments}</td>
                                        <td class="p-3 text-center text-slate-300">${porcentaje}%</td>
                                        <td class="p-3 text-center font-bold text-cyan-300">${avgNota}</td>
                                    </tr>`;
                        }).join('') || `<tr><td colspan="5" class="text-center p-6 text-slate-400">No hay datos para mostrar.</td></tr>`}
                    </tbody>
                </table>
            `;
            tableContainer.innerHTML = table;
            
            tableContainer.querySelectorAll("th[data-column]").forEach(header => {
                header.addEventListener("click", () => {
                    const col = header.getAttribute("data-column");
                    if (currentSortColumn === col) isAscending = !isAscending;
                    else { currentSortColumn = col; isAscending = true; }
                    renderTablePager();
                });
            });

            pageInfo.textContent = `Página ${currentPage} de ${getTotalPages()}`;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage >= getTotalPages();
        }

        renderTablePager();
    }

    // --- Descarga Excel (sin cambios en la lógica, solo en la presentación) ---
    function downloadExcelWithXLSX(studentsSummary, totalAssignments, assignments, allGrades) {
        // ... La lógica interna de esta función no necesita cambios visuales y puede permanecer igual.
        const summaryData = [["Usuario", "Email", "Entregas", "% Entregadas", "Nota Promedio"]];
        Object.entries(studentsSummary).forEach(([user, data]) => {
            const avgNota = data.notaCount > 0 ? Math.ceil((data.notaTotal / data.notaCount) / 10) : 0;
            const porcentaje = totalAssignments > 0 ? (data.entregas / totalAssignments * 100).toFixed(1) : '0.0';
            summaryData.push([user, data.email || '-', `${data.entregas}/${totalAssignments}`, `${porcentaje}%`, avgNota]);
        });

        const detailData = [["Usuario", "Email", "Tarea", "Nota Obtenida", "Fecha Último Commit", "Fecha Límite", "Estado Entrega"]];
        const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' };

        assignments.forEach((assignment, index) => {
            const grades = allGrades[index];
            grades.forEach(student => {
                const username = student.github_username;
                const email = student.roster_identifier || '-';
                const nota = student.points_awarded !== null ? student.points_awarded : 'Sin Nota';
                const assignmentName = student.assignment_name || 'Sin Nombre';

                const fechaCommit = student.submission_timestamp ? new Date(student.submission_timestamp).toLocaleString('es-AR', dateOptions) : 'Sin Entrega';
                const fechaLimite = assignment.deadline ? new Date(assignment.deadline).toLocaleString('es-AR', dateOptions) : 'Sin Fecha Límite';

                let estadoEntrega = 'Sin Entrega';
                if (student.submission_timestamp) {
                    if (assignment.deadline) {
                        estadoEntrega = new Date(student.submission_timestamp) <= new Date(assignment.deadline) ? 'A Tiempo' : 'Tarde';
                    } else {
                        estadoEntrega = 'Entregado';
                    }
                }
                
                detailData.push([username, email, assignmentName, nota, fechaCommit, fechaLimite, estadoEntrega]);
            });
        });

        const workbook = XLSX.utils.book_new();
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        const detailSheet = XLSX.utils.aoa_to_sheet(detailData);

        detailSheet['!cols'] = [ { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 } ];

        XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");
        XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalle");

        XLSX.writeFile(workbook, "resumen_notas_detallado_v2.xlsx");
    }
}