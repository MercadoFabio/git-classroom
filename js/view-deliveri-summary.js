/**
 * Renderiza la vista de resumen de entregas en el contenedor proporcionado.
 * @param {HTMLElement} container - Contenedor donde se renderizará la vista.
 */
function renderViewDeliveriesSummary(container) {
    // Estructura HTML inicial de la vista
    container.innerHTML = `
                              <div class="bg-white shadow rounded-xl p-7">
                                  <h2 class="text-2xl font-extrabold mb-4 text-blue-900 text-center">Resumen de Notas</h2>
                                  <form id="summary-form" class="space-y-4">
                                      <div>
                                          <label class="block text-sm font-semibold text-blue-700 mb-1">GitHub Token:</label>
                                          <input type="password" id="summary-token" class="border px-3 py-2 rounded-lg w-full focus:ring" required/>
                                      </div>
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

    // Referencias a los elementos del DOM
    const summaryToken = container.querySelector("#summary-token");
    const summaryClassroom = container.querySelector("#summary-classroom");
    const summaryForm = container.querySelector("#summary-form");
    const summaryResults = container.querySelector("#summary-results");
    const summaryError = container.querySelector("#summary-error");

    /**
     * Evento para cargar los classrooms al cambiar el token.
     */
    summaryToken.addEventListener('change', async () => {
        summaryClassroom.innerHTML = `<option disabled selected value="">Cargando classrooms...</option>`;
        const token = summaryToken.value.trim();
        try {
            showSpinner();
            const res = await fetch('https://api.github.com/classrooms', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': "2022-11-28"
                }
            }).finally(() => hideSpinner());
            if (!res.ok) throw new Error("Token inválido o sin acceso a classrooms.");
            const classrooms = await res.json();
            summaryClassroom.innerHTML = `<option disabled selected value="">--- Selecciona un classroom ---</option>`;
            classrooms.forEach(cls => {
                summaryClassroom.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
            });
        } catch (e) {
            summaryError.textContent = e.message;
            summaryClassroom.innerHTML = '<option disabled selected value="">Error al cargar classrooms</option>';
        }
    });

    /**
     * Evento para manejar el envío del formulario y mostrar el resumen de notas.
     */
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
            const asgResp = await fetch(`https://api.github.com/classrooms/${classroomId}/assignments?page=1&per_page=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': "2022-11-28"
                }
            });
            const assignments = await asgResp.json();
            if (!Array.isArray(assignments)) throw new Error('No se encontraron assignments para el classroom.');

            // Obtener las calificaciones de cada assignment
            const gradePromises = assignments.map(async asg => {
                const gradesResp = await fetch(`https://api.github.com/assignments/${asg.id}/grades`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json',
                        'X-GitHub-Api-Version': "2022-11-28"
                    }
                });
                return await gradesResp.json();
            });

            const allGrades = await Promise.all(gradePromises).finally(() => hideSpinner());

            // Procesar las calificaciones de los estudiantes
            let studentsSummary = {};
            allGrades.forEach(grades => {
                grades.forEach(student => {
                    const username = student.github_username;
                    if (!studentsSummary[username]) {
                        studentsSummary[username] = {
                            email: student.roster_identifier,
                            entregas: 0,
                            notaTotal: 0,
                            notaCount: 0
                        };
                    }
                    if (student.points_awarded !== null && !isNaN(student.points_awarded)) {
                        studentsSummary[username].entregas++;
                        studentsSummary[username].notaTotal += Number(student.points_awarded);
                        studentsSummary[username].notaCount++;
                    }
                });
            });

            // Configuración de la paginación
            const totalAssignments = assignments.length;
            const pageSize = 10;
            let currentPage = 1;
            const totalPages = Math.ceil(Object.keys(studentsSummary).length / pageSize);

            // Renderizar resultados y controles de paginación
            summaryResults.innerHTML += `
                                      <div>
                                          <strong>Total de Assignments:</strong> ${totalAssignments}
                                      </div>
                                      <div class="mt-4">
                                          <label class="block text-sm font-semibold text-blue-700 mb-1">Filtrar:</label>
                                          <input type="text" id="filter-input" class="border px-3 py-2 rounded-lg w-full focus:ring" placeholder="Buscar por usuario o email"/>
                                      </div>
                                      <div id="table-container" class="mt-4"></div>
                                      <div class="flex justify-between items-center mt-4">
                                          <button id="prev-page" class="bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50" disabled>Anterior</button>
                                          <span id="page-info" class="text-sm text-gray-700">Página ${currentPage} de ${totalPages}</span>
                                          <button id="next-page" class="bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">Siguiente</button>
                                      </div>
                                      <div class="mt-4">
                                          <button id="download-csv" class="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-800 transition">Descargar CSV</button>
                                      </div>
                                  `;

            // Referencias a los elementos de la tabla y controles
            const filterInput = summaryResults.querySelector("#filter-input");
            const tableContainer = summaryResults.querySelector("#table-container");
            const prevPageBtn = summaryResults.querySelector("#prev-page");
            const nextPageBtn = summaryResults.querySelector("#next-page");
            const pageInfo = summaryResults.querySelector("#page-info");
            const downloadCsvBtn = summaryResults.querySelector("#download-csv");

            /**
             * Renderiza la tabla de resultados con los datos filtrados y paginados.
             * @param {Object} filteredData - Datos filtrados de los estudiantes.
             * @param {number} page - Página actual.
             */
            const renderTable = (filteredData, page) => {
                const start = (page - 1) * pageSize;
                const end = start + pageSize;
                const paginatedData = Object.keys(filteredData).slice(start, end).reduce((obj, key) => {
                    obj[key] = filteredData[key];
                    return obj;
                }, {});

                let resultRows = Object.keys(paginatedData).map(user => {
                    const {email, entregas, notaTotal, notaCount} = paginatedData[user];
                    const avgNota = notaCount > 0 ? Math.ceil((notaTotal / notaCount) / 10) : 0;
                    const porcentaje = totalAssignments > 0 ? (entregas / totalAssignments * 100).toFixed(1) : '0.0';

                    return `
                                              <tr class="even:bg-sky-50 odd:bg-white">
                                                  <td class="p-2">${user}</td>
                                                  <td class="p-2">${email || '-'}</td>
                                                  <td class="p-2 text-center">${entregas}</td>
                                                  <td class="p-2 text-center">${porcentaje}%</td>
                                                  <td class="p-2 text-center">${avgNota}</td>
                                              </tr>`;
                }).join('');

                tableContainer.innerHTML = `
                                          <table class="w-full min-w-full border-collapse text-sm">
                                              <thead class="bg-sky-100">
                                                  <tr>
                                                      <th class="p-3 border-b">Usuario</th>
                                                      <th class="p-3 border-b">Email</th>
                                                      <th class="p-3 border-b">Entregas</th>
                                                      <th class="p-3 border-b">% Entregadas</th>
                                                      <th class="p-3 border-b">Nota Promedio</th>
                                                  </tr>
                                              </thead>
                                              <tbody>
                                                  ${resultRows}
                                              </tbody>
                                          </table>`;
            };

            /**
             * Actualiza los controles de paginación.
             */
            const updatePagination = () => {
                pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
                prevPageBtn.disabled = currentPage === 1;
                nextPageBtn.disabled = currentPage === totalPages;
            };

            /**
             * Descarga los datos en formato CSV.
             */
            const downloadCSV = () => {
                const csvRows = [
                    ["Usuario", "Email", "Entregas", "% Entregadas", "Nota Promedio"]
                ];

                Object.keys(studentsSummary).forEach(user => {
                    const {email, entregas, notaTotal, notaCount} = studentsSummary[user];
                    const avgNota = notaCount > 0 ? Math.ceil((notaTotal / notaCount) / 10) : 0;
                    const porcentaje = totalAssignments > 0 ? (entregas / totalAssignments * 100).toFixed(1) : '0.0';
                    csvRows.push([user, email || '-', entregas, `${porcentaje}%`, avgNota]);
                });

                const csvContent = csvRows.map(row => row.join(",")).join("\n");
                const blob = new Blob([csvContent], {type: "text/csv"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "resumen_notas.csv";
                a.click();
                URL.revokeObjectURL(url);
            };

            // Inicializar tabla y controles
            renderTable(studentsSummary, currentPage);
            updatePagination();

            // Eventos para filtrar, paginar y descargar CSV
            filterInput.addEventListener("input", () => {
                const search = filterInput.value.toLowerCase();
                const filteredData = Object.keys(studentsSummary)
                    .filter(user => user.toLowerCase().includes(search) || (studentsSummary[user].email || "").toLowerCase().includes(search))
                    .reduce((obj, key) => {
                        obj[key] = studentsSummary[key];
                        return obj;
                    }, {});
                currentPage = 1;
                renderTable(filteredData, currentPage);
                updatePagination();
            });

            prevPageBtn.addEventListener("click", () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderTable(studentsSummary, currentPage);
                    updatePagination();
                }
            });

            nextPageBtn.addEventListener("click", () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderTable(studentsSummary, currentPage);
                    updatePagination();
                }
            });

            downloadCsvBtn.addEventListener("click", downloadCSV);

        } catch (e) {
            summaryError.textContent = "Error al obtener las notas, intente nuevamente por favor.";
        }
    };
}