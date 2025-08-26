/**
 * Renderiza la vista de resumen de entregas en el contenedor proporcionado.
 * @param {HTMLElement} container - Contenedor donde se renderizará la vista.
 */
function renderViewDeliveriesSummary(container) {
    // --- Plantilla principal ---
    container.innerHTML = `
        <div class="bg-white shadow rounded-xl p-7">
            <h2 class="text-2xl font-extrabold mb-4 text-blue-900 text-center">Resumen de Notas</h2>
            <form id="summary-form" class="space-y-4">
             ${renderTokenInput({inputId: "summary-token", btnId: "help-token-btn-summary"})} 
                <div>
                    <label class="block text-sm font-semibold text-blue-700 mb-1">Classroom:</label>
                    <select id="summary-classroom" class="border px-3 py-2 rounded-lg w-full focus:ring" required>
                        <option disabled selected value="">--- Selecciona classroom ---</option>
                    </select>
                </div>
                <button type="submit" class="bg-blue-700 text-white font-semibold rounded-lg py-2 shadow hover:bg-blue-900 transition w-full">Ver Resumen</button>
            </form>
            <div id="summary-results" class="mt-4"></div>
            <div id="summary-error" class="text-red-600 font-medium mt-2"></div>
        </div>
    `;

    setupHelpTokenModal("help-token-btn-summary");

    // -- Referencias --
    const summaryToken = container.querySelector("#summary-token");
    const summaryClassroom = container.querySelector("#summary-classroom");
    const summaryForm = container.querySelector("#summary-form");
    const summaryResults = container.querySelector("#summary-results");
    const summaryError = container.querySelector("#summary-error");
    let assignments = [];
    let allGrades = [];
    let studentsSummary = {};

    // --- Carga de classrooms al cambiar el token ---
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

    // --- Form submit (fetch de assignments & calificaciones) ---
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
            summaryError.textContent = "Error al obtener las notas, intente nuevamente por favor: " + e.message;
        }
    };

    // --- Lógica de fetch ---
     async function getAssignments(classroomId, token) {
        const asgResp = await fetch(`https://api.github.com/classrooms/${classroomId}/assignments?page=1&per_page=100`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': "2022-11-28"
            }
        });
        if (!asgResp.ok) throw new Error('Error al obtener los assignments.');
        const assignments = await asgResp.json();
        if (!Array.isArray(assignments) || assignments.length === 0) throw new Error('No se encontraron assignments para el classroom.');
        // Ordenar por ID para tener un orden cronológico de creación
        assignments.sort((a, b) => a.id - b.id);
        return assignments;
    }

    async function getAllGrades(assignments, token) {
        const gradePromises = assignments.map(asg =>
            fetch(`https://api.github.com/assignments/${asg.id}/grades`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': "2022-11-28"
                }
            }).then(resp => {
                if (!resp.ok) throw new Error(`Error al obtener notas para assignment ${asg.id}.`);
                return resp.json();
            })
        );
        return Promise.all(gradePromises);
    }

    // --- Procesamiento de resultados ---
    function buildStudentSummary(allGrades) {
        const summary = {};
        allGrades.forEach(grades => {
            grades.forEach(student => {
                const username = student.github_username;
                if (!summary[username]) {
                    summary[username] = {
                        email: student.roster_identifier,
                        entregas: 0,
                        notaTotal: 0,
                        notaCount: 0
                    };
                }
                if (student.submission_timestamp) {
                    summary[username].entregas++;
                }
                if (student.points_awarded !== null && !isNaN(student.points_awarded)) {
                    summary[username].notaTotal += Number(student.points_awarded);
                    summary[username].notaCount++;
                }
            });
        });
        return summary;
    }

    // --- Render del resumen, tabla y controles ---
    function renderSummaryTable(totalAssignments, studentsSummary) {
        // ... (Esta función no necesita cambios, la dejo por completitud)
        let pageSize = 10;
        let currentPage = 1;
        let filterText = '';
        let currentSortColumn = "avgNota", isAscending = false;

        summaryResults.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <span><strong>Total de Assignments:</strong> ${totalAssignments}</span>
                <button id="download-excel" class="bg-green-50 text-green-800 border border-green-400 px-3 py-1 rounded-md text-xs hover:bg-green-100 focus:ring-2 focus:ring-green-200">
                    📥 Descargar Excel
                </button>
            </div>
            <div>
                <label class="block text-sm font-semibold text-blue-700 mb-1">Filtrar:</label>
                <input type="text" id="filter-input" class="border px-3 py-2 rounded-lg w-full focus:ring" placeholder="Buscar por usuario o email"/>
            </div>
            <div id="table-container" class="mt-4"></div>
            <div class="flex justify-between items-center mt-2">
                <button id="prev-page" class="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Anterior</button>
                <span id="page-info" class="text-sm text-gray-700"></span>
                <button id="next-page" class="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Siguiente</button>
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

        prevPageBtn.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                renderTablePager();
            }
        });
        nextPageBtn.addEventListener("click", () => {
            if ((currentPage) < getTotalPages()) {
                currentPage++;
                renderTablePager();
            }
        });
        downloadExcelBtn.addEventListener("click", () => downloadExcelWithXLSX(studentsSummary, totalAssignments, assignments, allGrades));
        
        function filterSortPaginate() {
            let filtered = Object.keys(studentsSummary)
                .filter(user => {
                    const data = studentsSummary[user];
                    return user.toLowerCase().includes(filterText) ||
                        (data.email || '').toLowerCase().includes(filterText);
                })
                .reduce((obj, key) => {
                    obj[key] = studentsSummary[key];
                    return obj;
                }, {});

            const keysSorted = Object.keys(filtered).sort((a, b) => {
                let vA, vB;
                if (currentSortColumn === "avgNota") {
                    vA = filtered[a].notaCount > 0 ? Math.ceil((filtered[a].notaTotal / filtered[a].notaCount) / 10) : 0;
                    vB = filtered[b].notaCount > 0 ? Math.ceil((filtered[b].notaTotal / filtered[b].notaCount) / 10) : 0;
                } else if (currentSortColumn === "porcentaje") {
                    vA = totalAssignments ? filtered[a].entregas / totalAssignments : 0;
                    vB = totalAssignments ? filtered[b].entregas / totalAssignments : 0;
                } else if (currentSortColumn === "username") {
                    vA = a; vB = b;
                } else {
                    vA = filtered[a][currentSortColumn] || 0;
                    vB = filtered[b][currentSortColumn] || 0;
                }
                if (vA < vB) return isAscending ? -1 : 1;
                if (vA > vB) return isAscending ? 1 : -1;
                return 0;
            });
            
            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;
            const paginatedKeys = keysSorted.slice(start, end);
            return { current: paginatedKeys.map(k => [k, filtered[k]]), total: keysSorted.length };
        }

        function getTotalPages() {
            const totalRows = filterSortPaginate().total;
            return Math.max(1, Math.ceil(totalRows / pageSize));
        }

        function renderTablePager() {
            const { current, total } = filterSortPaginate();
            let table = `
                <table class="w-full min-w-full border-collapse text-sm">
                    <thead class="bg-sky-100">
                        <tr>
                            <th class="p-3 border-b cursor-pointer" data-column="username">Usuario <span class="sort-icon">${currentSortColumn === "username" ? (isAscending ? "▲" : "▼") : ""}</span></th>
                            <th class="p-3 border-b cursor-pointer" data-column="email">Email</th>
                            <th class="p-3 border-b cursor-pointer" data-column="entregas">Entregas <span class="sort-icon">${currentSortColumn === "entregas" ? (isAscending ? "▲" : "▼") : ""}</span></th>
                            <th class="p-3 border-b cursor-pointer" data-column="porcentaje">% Entregadas <span class="sort-icon">${currentSortColumn === "porcentaje" ? (isAscending ? "▲" : "▼") : ""}</span></th>
                            <th class="p-3 border-b cursor-pointer" data-column="avgNota">Nota Promedio <span class="sort-icon">${currentSortColumn === "avgNota" ? (isAscending ? "▲" : "▼") : ""}</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${current.map(([user, data]) => {
                            const avgNota = data.notaCount > 0 ? Math.ceil((data.notaTotal / data.notaCount) / 10) : 0;
                            const porcentaje = totalAssignments > 0 ? (data.entregas / totalAssignments * 100).toFixed(1) : '0.0';
                            return `<tr class="even:bg-sky-50 odd:bg-white">
                                        <td class="p-2">${user}</td>
                                        <td class="p-2">${data.email || '-'}</td>
                                        <td class="p-2 text-center">${data.entregas}/${totalAssignments}</td>
                                        <td class="p-2 text-center">${porcentaje}%</td>
                                        <td class="p-2 text-center">${avgNota}</td>
                                    </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            `;
            tableContainer.innerHTML = table;
            
            tableContainer.querySelectorAll("th[data-column]").forEach(header => {
                header.addEventListener("click", () => {
                    const col = header.getAttribute("data-column");
                    if (currentSortColumn === col) {
                        isAscending = !isAscending;
                    } else {
                        currentSortColumn = col;
                        isAscending = true;
                    }
                    renderTablePager();
                });
            });

            pageInfo.textContent = `Página ${currentPage} de ${getTotalPages()}`;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage >= getTotalPages();
        }

        renderTablePager();
    }

    // --- Descarga Excel ---
    function downloadExcelWithXLSX(studentsSummary, totalAssignments, assignments, allGrades) {
        const summaryData = [["Usuario", "Email", "Entregas", "% Entregadas", "Nota Promedio"]];
        Object.entries(studentsSummary).forEach(([user, data]) => {
            const avgNota = data.notaCount > 0 ? Math.ceil((data.notaTotal / data.notaCount) / 10) : 0;
            const porcentaje = totalAssignments > 0 ? (data.entregas / totalAssignments * 100).toFixed(1) : '0.0';
            summaryData.push([user, data.email || '-', `${data.entregas}/${totalAssignments}`, `${porcentaje}%`, avgNota]);
        });

        // <<< 1. Se añaden las nuevas cabeceras para las columnas >>>
        const detailData = [["Usuario", "Email", "Tarea", "Nota Obtenida", "Fecha Último Commit", "Fecha Límite", "Estado Entrega"]];
        
        // El objeto de opciones para formatear la fecha
        const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' };

        assignments.forEach((assignment, index) => {
            const grades = allGrades[index];
            grades.forEach(student => {
                const username = student.github_username;
                const email = student.roster_identifier || '-';
                const nota = student.points_awarded !== null ? student.points_awarded : 'Sin Nota';
                const assignmentName = student.assignment_name || 'Sin Nombre';

                // <<< 2. Lógica para obtener y formatear las fechas y el estado >>>
                const fechaCommit = student.submission_timestamp
                    ? new Date(student.submission_timestamp).toLocaleString('es-AR', dateOptions)
                    : 'Sin Entrega';

                const fechaLimite = assignment.deadline
                    ? new Date(assignment.deadline).toLocaleString('es-AR', dateOptions)
                    : 'Sin Fecha Límite';

                let estadoEntrega = 'Sin Entrega';
                if (student.submission_timestamp) { // Si hubo entrega
                    if (assignment.deadline) { // Y si había fecha límite
                        // Comparamos las fechas
                        estadoEntrega = new Date(student.submission_timestamp) <= new Date(assignment.deadline)
                            ? 'A Tiempo'
                            : 'Tarde';
                    } else {
                        // Si hubo entrega pero no había fecha límite
                        estadoEntrega = 'Entregado';
                    }
                }
                
                // <<< 3. Se añaden los nuevos datos a la fila del Excel >>>
                detailData.push([username, email, assignmentName, nota, fechaCommit, fechaLimite, estadoEntrega]);
            });
        });

        // Crear libro y hojas (sin cambios)
        const workbook = XLSX.utils.book_new();
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        const detailSheet = XLSX.utils.aoa_to_sheet(detailData);

        // Ajustar anchos de columna para la hoja de detalle (opcional pero recomendado)
        detailSheet['!cols'] = [
            { wch: 20 }, // Usuario
            { wch: 25 }, // Email
            { wch: 30 }, // Tarea
            { wch: 15 }, // Nota Obtenida
            { wch: 20 }, // Fecha Último Commit
            { wch: 20 }, // Fecha Límite
            { wch: 15 }  // Estado Entrega
        ];

        XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");
        XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalle");

        XLSX.writeFile(workbook, "resumen_notas_detallado.xlsx");
    }
}