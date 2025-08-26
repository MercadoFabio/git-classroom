// --- Renderizar la vista principal ---
function renderViewGraphics(container) {
    // --- Plantilla principal con estilo v2.0 ---
    container.innerHTML = `
        <div class="glass-panel rounded-xl p-6 md:p-8 w-full">
            <h2 class="text-2xl md:text-3xl font-bold mb-6 text-cyan-300 text-center tracking-wider">Visualización de Datos</h2>
            <form id="graphics-form" class="space-y-5">
                ${renderTokenInput({ inputId: "graphics-token", btnId: "help-token-btn-graphics" })}
                <div>
                    <label class="block text-sm font-semibold text-cyan-200 mb-2">Classroom:</label>
                    <select id="graphics-classroom" class="glass-panel w-full px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none" required>
                        <option disabled selected value="">--- Selecciona un classroom ---</option>
                    </select>
                </div>
                <button type="submit" class="w-full bg-cyan-600 text-slate-900 font-bold py-3 px-4 rounded-md transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400">Generar Gráficos</button>
            </form>
            
            <div id="graphics-results" class="mt-8 hidden">
                <div class="glass-panel p-4 rounded-lg border border-slate-700/50 mb-6">
                    <h3 class="font-semibold text-lg text-slate-300 mb-4 border-b border-slate-700 pb-2">Controles de Gráfico</h3>
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-cyan-200 mb-2">Buscar alumnos:</label>
                        <input id="student-search" type="text" placeholder="Filtrar alumnos por nombre..." class="glass-panel w-full px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none placeholder-slate-500">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-cyan-200 mb-2">Selecciona alumnos (1-10):</label>
                        <div id="student-group"></div>
                    </div>
                </div>

                <div class="space-y-8">
                    <div class="glass-panel p-4 rounded-lg">
                        <canvas id="stackedBarChart" style="height: 400px; width: 100%;"></canvas>
                    </div>
                    <div class="glass-panel p-4 rounded-lg">
                        <canvas id="averageGradesChart" style="height: 400px; width: 100%;"></canvas>
                    </div>
                </div>
            </div>
            <div id="graphics-error" class="text-red-400 font-medium mt-4 text-center"></div>
        </div>
    `;

    setupHelpTokenModal("help-token-btn-graphics");

    // --- Referencias (sin cambios en lógica) ---
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

    // --- Lógica de carga y fetch (sin cambios) ---
    summaryToken.addEventListener("change", async () => { await loadClassrooms(summaryToken.value.trim()); });
    async function loadClassrooms(token) { summaryClassroom.innerHTML = `<option disabled selected value="">Cargando...</option>`; summaryError.textContent = ""; if (!token) return; try { showSpinner(); const res = await fetch('https://api.github.com/classrooms', { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': "2022-11-28" } }); hideSpinner(); if (!res.ok) throw new Error("Token inválido o sin acceso."); const classrooms = await res.json(); summaryClassroom.innerHTML = `<option disabled selected value="">--- Selecciona un classroom ---</option>`; classrooms.forEach(cls => { summaryClassroom.innerHTML += `<option value="${cls.id}">${cls.name}</option>`; }); } catch (e) { hideSpinner(); summaryError.textContent = e.message; summaryClassroom.innerHTML = '<option disabled selected value="">Error</option>'; } }
    summaryForm.onsubmit = async (ev) => { ev.preventDefault(); summaryResults.classList.add("hidden"); summaryError.textContent = ''; const classroomId = summaryClassroom.value; const token = summaryToken.value.trim(); if (!classroomId) { summaryError.textContent = 'Selecciona un classroom.'; return; } try { showSpinner(); assignments = await getAssignments(classroomId, token); allGrades = await getAllGrades(assignments, token); studentsSummary = buildStudentSummary(allGrades, assignments.length); setupStudentGroups(Object.keys(studentsSummary)); renderCharts(studentsSummary, assignments.length, Object.keys(studentsSummary).slice(0, 10)); summaryResults.classList.remove("hidden"); hideSpinner(); } catch (e) { hideSpinner(); summaryError.textContent = "Error al obtener las notas: " + e.message; } };
    async function getAssignments(classroomId, token) { const res = await fetch(`https://api.github.com/classrooms/${classroomId}/assignments?page=1&per_page=100`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': "2022-11-28" } }); const assignments = await res.json(); if (!Array.isArray(assignments) || assignments.length === 0) { throw new Error('No se encontraron assignments.'); } return assignments; }
    async function getAllGrades(assignments, token) { const gradePromises = assignments.map(asg => fetch(`https://api.github.com/assignments/${asg.id}/grades`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': "2022-11-28" } }).then(resp => resp.json())); return Promise.all(gradePromises); }
    function buildStudentSummary(allGrades) { const summary = {}; allGrades.forEach(grades => { grades.forEach(student => { const username = student.github_username; if (!summary[username]) { summary[username] = { email: student.roster_identifier, entregas: 0, notaTotal: 0, notaCount: 0 }; } if (student.submission_timestamp) { summary[username].entregas++; } if (student.points_awarded !== null && !isNaN(student.points_awarded)) { summary[username].notaTotal += Number(student.points_awarded); summary[username].notaCount++; } }); }); return summary; }

    // --- Configurar grupos de alumnos (sin cambios en lógica) ---
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
        studentSearchInput.addEventListener("input", () => { const searchValue = studentSearchInput.value.toLowerCase(); Array.from(studentGroupSelect.children).forEach(container => { const label = container.querySelector('label'); container.style.display = label.textContent.toLowerCase().includes(searchValue) ? '' : 'none'; }); });
        studentGroupSelect.addEventListener("change", () => { const selectedStudents = Array.from(studentGroupSelect.querySelectorAll('input:checked')).map(input => input.value); if (selectedStudents.length < 1 || selectedStudents.length > 10) { summaryError.textContent = "Selecciona entre 1 y 10 alumnos."; return; } summaryError.textContent = ""; renderCharts(studentsSummary, assignments.length, selectedStudents); });
    }

    // --- Renderizar gráficos con estilo v2.0 ---
    function renderCharts(studentsSummary, totalAssignments, selectedStudents) {
        // Colores futuristas para los gráficos
        const futuristicCyan = '#22d3ee';
        const futuristicMagenta = '#f472b6';
        const futuristicGreen = '#34d399';
        const gridColor = 'rgba(56, 189, 248, 0.1)';
        const fontColor = '#cbd5e1'; // slate-300

        // Opciones por defecto para ambos gráficos
        const chartJsDefaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: fontColor, font: { family: "'Rajdhani', sans-serif" } }
                },
                title: {
                    display: true,
                    color: fontColor,
                    font: { size: 16, weight: 'bold', family: "'Rajdhani', sans-serif" }
                },
                tooltip: {
                    backgroundColor: 'rgba(2, 6, 23, 0.8)', // slate-950
                    titleColor: futuristicCyan,
                    bodyColor: fontColor,
                    borderColor: 'rgba(56, 189, 248, 0.2)',
                    borderWidth: 1,
                }
            },
            scales: {
                x: {
                    ticks: { color: fontColor },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: { color: fontColor },
                    grid: { color: gridColor },
                    beginAtZero: true
                }
            }
        };

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
                    { label: 'Entregas Completadas', data: entregasData, backgroundColor: futuristicCyan },
                    { label: 'Entregas No Completadas', data: noEntregasData, backgroundColor: futuristicMagenta }
                ]
            },
            options: {
                ...chartJsDefaultOptions,
                plugins: { ...chartJsDefaultOptions.plugins, title: { ...chartJsDefaultOptions.plugins.title, text: 'Estado de Entregas por Alumno' } },
                scales: { ...chartJsDefaultOptions.scales, x: { ...chartJsDefaultOptions.scales.x, stacked: true }, y: { ...chartJsDefaultOptions.scales.y, stacked: true } }
            }
        });

        const avgCtx = document.getElementById('averageGradesChart').getContext('2d');
        avgChartInstance = new Chart(avgCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: 'Nota Promedio', data: avgNotasData, backgroundColor: futuristicGreen }]
            },
            options: {
                ...chartJsDefaultOptions,
                plugins: { ...chartJsDefaultOptions.plugins, title: { ...chartJsDefaultOptions.plugins.title, text: 'Nota Promedio por Alumno (escala 0-100)' } },
                scales: { ...chartJsDefaultOptions.scales, y: { ...chartJsDefaultOptions.scales.y, max: 100 } }
            }
        });
    }
}