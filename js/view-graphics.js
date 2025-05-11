// --- Renderizar la vista principal ---
            function renderViewGraphics(container) {
                // --- Plantilla principal ---
                container.innerHTML = `
<style>
 #student-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ccc;
            padding: 10px;
            border-radius: 8px;
            background-color: #f9f9f9;
        }

        .student-checkbox {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .student-checkbox input {
            cursor: pointer;
        }

        .student-checkbox label {
            cursor: pointer;
            font-size: 14px;
            color: #333;
        }
    </style>
                    <div class="bg-white shadow rounded-xl p-7">
                        <h2 class="text-2xl font-extrabold mb-4 text-blue-900 text-center">Gráficos</h2>
                        <form id="graphics-form" class="space-y-4">
                            ${renderTokenInput({ inputId: "graphics-token", btnId: "help-token-btn-graphics" })}
                            <div>
                                <label class="block text-sm font-semibold text-blue-700 mb-1">Classroom:</label>
                                <select id="graphics-classroom" class="border px-3 py-2 rounded-lg w-full focus:ring" required>
                                    <option disabled selected value="">--- Selecciona classroom ---</option>
                                </select>
                            </div>
                            <button type="submit" class="bg-blue-700 text-white font-semibold rounded-lg py-2 shadow hover:bg-blue-900 transition w-full">Ver Resumen</button>
                        </form>
                        <div id="graphics-results" class="mt-4 hidden">
                            <h3 class="text-xl font-bold text-blue-900 mb-4">Resultados</h3>
                            <div class="mb-4">
                                <label class="block text-sm font-semibold text-blue-700 mb-1">Buscar alumnos:</label>
                                <input id="student-search" type="text" placeholder="Filtrar alumnos..." class="border px-3 py-2 rounded-lg w-full focus:ring">
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-semibold text-blue-700 mb-1">Selecciona alumnos (1-10):</label>
                                <select id="student-group"  multiple></select>
                            </div>
                            <div class="space-y-6">
                                <div style="height: 400px; width: 100%;">
                                    <canvas id="stackedBarChart"></canvas>
                                </div>
                                <div style="height: 400px; width: 100%;">
                                    <canvas id="averageGradesChart"></canvas>
                                </div>
                            </div>
                        </div>
                        <div id="graphics-error" class="text-red-600 font-medium mt-2"></div>
                    </div>
                `;

                setupHelpTokenModal("help-token-btn-graphics");

                // --- Referencias ---
                const summaryToken = container.querySelector("#graphics-token");
                const summaryClassroom = container.querySelector("#graphics-classroom");
                const summaryForm = container.querySelector("#graphics-form");
                const summaryResults = container.querySelector("#graphics-results");
                const summaryError = container.querySelector("#graphics-error");
                const studentGroupSelect = container.querySelector("#student-group");
                const studentSearchInput = container.querySelector("#student-search");

                let assignments = [];
                let allGrades = [];
                let studentsSummary = {};
                let stackedChartInstance = null;
                let avgChartInstance = null;

                // --- Carga de classrooms ---
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

                // --- Enviar formulario ---
                summaryForm.onsubmit = async (ev) => {
                    ev.preventDefault();
                    summaryResults.classList.add("hidden");
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
                        studentsSummary = buildStudentSummary(allGrades, assignments.length);
                        setupStudentGroups(Object.keys(studentsSummary));
                        renderCharts(studentsSummary, assignments.length, Object.keys(studentsSummary).slice(0, 10));
                        summaryResults.classList.remove("hidden");
                        hideSpinner();
                    } catch (e) {
                        hideSpinner();
                        summaryError.textContent = "Error al obtener las notas, intente nuevamente por favor.";
                    }
                };

                // --- Obtener assignments ---
                async function getAssignments(classroomId, token) {
                    const res = await fetch(`https://api.github.com/classrooms/${classroomId}/assignments?page=1&per_page=100`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/vnd.github+json',
                            'X-GitHub-Api-Version': "2022-11-28"
                        }
                    });
                    const assignments = await res.json();
                    if (!Array.isArray(assignments) || assignments.length === 0) {
                        throw new Error('No se encontraron assignments para el classroom.');
                    }
                    return assignments;
                }

                // --- Obtener calificaciones ---
                async function getAllGrades(assignments, token) {
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

                // --- Procesar resumen de alumnos ---
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

                // --- Configurar grupos de alumnos ---
// --- Configurar grupos de alumnos ---
                function setupStudentGroups(studentKeys) {
                    studentGroupSelect.innerHTML = '';
                    studentKeys.forEach(key => {
                        const checkboxContainer = document.createElement('div');
                        checkboxContainer.className = 'student-checkbox';

                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = `student-${key}`;
                        checkbox.value = key;

                        const label = document.createElement('label');
                        label.htmlFor = `student-${key}`;
                        label.textContent = key;

                        checkboxContainer.appendChild(checkbox);
                        checkboxContainer.appendChild(label);
                        studentGroupSelect.appendChild(checkboxContainer);
                    });

                    studentSearchInput.addEventListener("input", () => {
                        const searchValue = studentSearchInput.value.toLowerCase();
                        Array.from(studentGroupSelect.children).forEach(container => {
                            const label = container.querySelector('label');
                            container.style.display = label.textContent.toLowerCase().includes(searchValue) ? '' : 'none';
                        });
                    });

                    studentGroupSelect.addEventListener("change", () => {
                        const selectedStudents = Array.from(studentGroupSelect.querySelectorAll('input:checked')).map(input => input.value);
                        if (selectedStudents.length < 1 || selectedStudents.length > 10) {
                            summaryError.textContent = "Selecciona entre 1 y 10 alumnos.";
                            return;
                        }
                        summaryError.textContent = "";
                        renderCharts(studentsSummary, assignments.length, selectedStudents);
                    });
                }
                // --- Renderizar gráficos ---
                function renderCharts(studentsSummary, totalAssignments, selectedStudents) {
                    const labels = selectedStudents;
                    const entregasData = labels.map(user => studentsSummary[user].entregas);
                    const noEntregasData = labels.map(user => totalAssignments - studentsSummary[user].entregas);
                    const avgNotasData = labels.map(user => {
                        const data = studentsSummary[user];
                        return data.notaCount > 0 ? (data.notaTotal / data.notaCount).toFixed(1) : 0;
                    });

                    if (stackedChartInstance) stackedChartInstance.destroy();
                    if (avgChartInstance) avgChartInstance.destroy();

                    const stackedCtx = document.getElementById('stackedBarChart').getContext('2d');
                    stackedChartInstance = new Chart(stackedCtx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [
                                { label: 'Entregas Completadas', data: entregasData, backgroundColor: 'rgba(75, 192, 192, 0.7)' },
                                { label: 'Entregas No Completadas', data: noEntregasData, backgroundColor: 'rgba(255, 99, 132, 0.7)' }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'top' },
                                title: { display: true, text: 'Entregas Completadas vs No Completadas' }
                            },
                            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
                        }
                    });

                    const avgCtx = document.getElementById('averageGradesChart').getContext('2d');
                    avgChartInstance = new Chart(avgCtx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [
                                { label: 'Nota Promedio', data: avgNotasData, backgroundColor: 'rgba(54, 162, 235, 0.7)' }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'top' },
                                title: { display: true, text: 'Notas Promedio por Alumno' }
                            },
                            scales: { y: { beginAtZero: true, max: 100 } }
                        }
                    });
                }
            }