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

            // 1. Cargar assignments
            assignments = await getAssignments(classroomId, token);

            // 2. Cargar calificaciones
            allGrades = await getAllGrades(assignments, token);
            hideSpinner();

            // 3. Procesar resultados
            const studentsSummary = buildStudentSummary(allGrades, assignments.length);

            // 4. Renderizar resumen y tabla + controles
            renderSummaryTable(assignments.length, studentsSummary);

        } catch (e) {
            hideSpinner();
            summaryError.textContent = "Error al obtener las notas, intente nuevamente por favor.";
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
        const assignments = await asgResp.json();
        if (!Array.isArray(assignments) || assignments.length === 0) throw new Error('No se encontraron assignments para el classroom.');
        return assignments;
    }

    async function getAllGrades(assignments, token) {
        // Limitamos a una sola petición simultánea para no sobrecargar el API (alternativamente, Promise.allSettled o throttling)
        const gradePromises = assignments.map(asg =>
            fetch(`https://api.github.com/assignments/${asg.id}/grades`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': "2022-11-28"
                }
            }).then(resp => resp.json())
        );
        return Promise.all(gradePromises);
    }

    // --- Procesamiento de resultados ---
    function buildStudentSummary(allGrades, totalAssignments) {
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
                if (student.points_awarded !== null && !isNaN(student.points_awarded)) {
                    summary[username].entregas++;
                    summary[username].notaTotal += Number(student.points_awarded);
                    summary[username].notaCount++;
                }
            });
        });
        return summary;
    }

    // --- Render del resumen, tabla y controles ---
    function renderSummaryTable(totalAssignments, studentsSummary) {
        // Var para paginar y ordenar:
        let pageSize = 10;
        let currentPage = 1;
        let filterText = '';
        let currentSortColumn = "avgNota", isAscending = false;

        // -- Plantilla superior: resumen, filtro, "descargar CSV" (arriba) --
        summaryResults.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <span><strong>Total de Assignments:</strong> ${totalAssignments}</span>
                <button id="download-csv" class="bg-green-50 text-green-800 border border-green-400 px-3 py-1 rounded-md text-xs hover:bg-green-100 focus:ring-2 focus:ring-green-200">
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
        const downloadCsvBtn = summaryResults.querySelector("#download-csv");

        // --- Eventos de filtro y paginación ---
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
        downloadCsvBtn.addEventListener("click", () => downloadCSV(studentsSummary, totalAssignments, assignments, allGrades));
        // --- Tabla + controles (renderizado) ---
        function filterSortPaginate() {
            // Filtrar
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

            // Ordenar
            const keysSorted = Object.keys(filtered).sort((a, b) => {
                const val = col => {
                    if (col === "avgNota") {
                        let data = filtered[col === "avgNota" ? a : b];
                        return data.notaCount > 0 ? Math.ceil((data.notaTotal / data.notaCount) / 10) : 0;
                    }
                    if (col === "porcentaje") {
                        let data = filtered[col === "porcentaje" ? a : b];
                        return totalAssignments ? (data.entregas / totalAssignments) * 100 : 0;
                    }
                    return filtered[col === "entregas" ? a : b][col] || '';
                };
                let vA, vB;
                if (currentSortColumn === "avgNota") {
                    vA = filtered[a].notaCount > 0 ? Math.ceil((filtered[a].notaTotal / filtered[a].notaCount) / 10) : 0;
                    vB = filtered[b].notaCount > 0 ? Math.ceil((filtered[b].notaTotal / filtered[b].notaCount) / 10) : 0;
                } else if (currentSortColumn === "porcentaje") {
                    vA = totalAssignments ? filtered[a].entregas / totalAssignments : 0;
                    vB = totalAssignments ? filtered[b].entregas / totalAssignments : 0;
                } else if (currentSortColumn === "username") {
                    vA = a, vB = b;
                } else {
                    vA = filtered[a][currentSortColumn] || '';
                    vB = filtered[b][currentSortColumn] || '';
                }
                if (vA < vB) return isAscending ? -1 : 1;
                if (vA > vB) return isAscending ? 1 : -1;
                return 0;
            });
            // Paginar
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
                            <th class="p-3 border-b cursor-pointer" data-column="username">Usuario</th>
                            <th class="p-3 border-b cursor-pointer" data-column="email">Email</th>
                            <th class="p-3 border-b cursor-pointer" data-column="entregas">
                              Entregas <span class="sort-icon">${currentSortColumn === "entregas" ? (isAscending ? "▲" : "▼") : ""}</span>
                            </th>
                            <th class="p-3 border-b cursor-pointer" data-column="porcentaje">
                              % Entregadas <span class="sort-icon">${currentSortColumn === "porcentaje" ? (isAscending ? "▲" : "▼") : ""}</span>
                            </th>
                            <th class="p-3 border-b cursor-pointer" data-column="avgNota">
                              Nota Promedio <span class="sort-icon">${currentSortColumn === "avgNota" ? (isAscending ? "▲" : "▼") : ""}</span>
                            </th>
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

            // Eventos de sorting
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

            // Actualiza controles de paginación
            pageInfo.textContent = `Página ${currentPage} de ${getTotalPages()}`;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage >= getTotalPages();
        }

        renderTablePager();
    }

    // --- Descarga CSV (simple, clean) ---
    function downloadCSV(studentsSummary, totalAssignments, assignments, allGrades) {
        // Crear contenido para la hoja "Resumen"
        let summarySheet = `
        <Worksheet ss:Name="Resumen">
            <Table>
                <Row>
                    <Cell><Data ss:Type="String">Usuario</Data></Cell>
                    <Cell><Data ss:Type="String">Email</Data></Cell>
                    <Cell><Data ss:Type="String">Entregas</Data></Cell>
                    <Cell><Data ss:Type="String">% Entregadas</Data></Cell>
                    <Cell><Data ss:Type="String">Nota Promedio</Data></Cell>
                </Row>
    `;
        Object.entries(studentsSummary).forEach(([user, data]) => {
            const avgNota = data.notaCount > 0 ? Math.ceil((data.notaTotal / data.notaCount) / 10) : 0;
            const porcentaje = totalAssignments > 0 ? (data.entregas / totalAssignments * 100).toFixed(1) : '0.0';
            summarySheet += `
            <Row>
                <Cell><Data ss:Type="String">${user}</Data></Cell>
                <Cell><Data ss:Type="String">${data.email || '-'}</Data></Cell>
<Cell><Data ss:Type="String">${data.entregas}/${totalAssignments}</Data></Cell>                <Cell><Data ss:Type="String">${porcentaje}%</Data></Cell>
                <Cell><Data ss:Type="Number">${avgNota}</Data></Cell>
            </Row>
        `;
        });
        summarySheet += `</Table></Worksheet>`;

        // Crear contenido para la hoja "Detalle"
        let detailSheet = `
        <Worksheet ss:Name="Detalle">
            <Table>
                <Row>
                    <Cell><Data ss:Type="String">Usuario</Data></Cell>
                    <Cell><Data ss:Type="String">Email</Data></Cell>
                    <Cell><Data ss:Type="String">Tarea</Data></Cell>
                    <Cell><Data ss:Type="String">Nota Obtenida</Data></Cell>
                    <Cell><Data ss:Type="String">Fecha Último Commit</Data></Cell>
                </Row>
    `;
        assignments.forEach((assignment, index) => {
            const grades = allGrades[index];
            grades.forEach(student => {
                const username = student.github_username;
                const email = student.roster_identifier || '-';
                const nota = student.points_awarded !== null ? student.points_awarded : 'Sin Nota';
                const fechaCommit = student.submission_timestamp || 'Sin Entrega';
                const assignmentName = student.assignment_name || 'Sin Nombre';
                detailSheet += `
                <Row>
                    <Cell><Data ss:Type="String">${username}</Data></Cell>
                    <Cell><Data ss:Type="String">${email}</Data></Cell>
                    <Cell><Data ss:Type="String">${assignmentName}</Data></Cell>
                    <Cell><Data ss:Type="String">${nota}</Data></Cell>
                    <Cell><Data ss:Type="String">${fechaCommit}</Data></Cell>
                </Row>
            `;
            });
        });
        detailSheet += `</Table></Worksheet>`;

        // Crear el archivo XML completo
        const excelContent = `
        <xml version="1.0"?>
        <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
                  xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:x="urn:schemas-microsoft-com:office:excel"
                  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
            <Styles>
                <Style ss:ID="Default" ss:Name="Normal">
                    <Alignment ss:Vertical="Bottom"/>
                    <Borders/>
                    <Font/>
                    <Interior/>
                    <NumberFormat/>
                    <Protection/>
                </Style>
            </Styles>
            ${summarySheet}
            ${detailSheet}
        </Workbook>
    `;

        // Crear y descargar el archivo
        const blob = new Blob([excelContent], {type: "application/vnd.ms-excel"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "resumen_notas.xls";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(url);
            a.remove();
        }, 500);
    }}