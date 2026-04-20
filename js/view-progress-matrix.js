/**
 * Vista: Matriz de Progreso — UTN Classroom Helper v2.0
 * Genera una matriz alumno × ejercicio con análisis de demora y exportación a Excel.
 */
function renderViewProgressMatrix(container) {
    container.innerHTML = `
    <div class="glass-panel rounded-xl p-6 md:p-8 w-full space-y-6">
        <h2 class="text-2xl md:text-3xl font-bold text-cyan-300 text-center tracking-wider">📈 Matriz de Progreso</h2>

        <!-- Paso 1: Classroom -->
        <div class="border border-slate-700/50 p-5 rounded-lg space-y-4">
            <h3 class="font-semibold text-lg text-slate-300 border-b border-slate-700 pb-2">Paso 1: Classroom</h3>
            <select id="mat-classroom" class="glass-panel w-full px-3 py-2.5 rounded-md border border-cyan-400/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none">
                <option disabled selected value="">--- Selecciona un classroom ---</option>
            </select>
            <button id="mat-load-btn" type="button" class="w-full bg-cyan-600 text-slate-900 font-bold py-3 rounded-md transition-all hover:bg-cyan-500">
                Cargar Assignments
            </button>
        </div>

        <!-- Paso 2: Fechas de liberación (oculto hasta cargar) -->
        <div id="mat-config-panel" class="border border-slate-700/50 p-5 rounded-lg space-y-4 hidden">
            <h3 class="font-semibold text-lg text-slate-300 border-b border-slate-700 pb-2">Paso 2: Fechas de liberación por ejercicio</h3>
            <p class="text-xs text-slate-400">Asigná fecha y nombre de batch a cada ejercicio. Se guarda automáticamente por classroom.</p>
            <div class="flex flex-wrap gap-2 items-center mb-2">
                <input type="date" id="mat-bulk-date" class="glass-panel px-3 py-2 rounded-md border border-cyan-400/20 text-sm text-slate-300 focus:ring-2 focus:ring-cyan-400 focus:outline-none"/>
                <input type="text" id="mat-bulk-label" placeholder="Etiqueta (ej: Batch 1)" class="glass-panel px-3 py-2 rounded-md border border-cyan-400/20 text-sm text-slate-300 focus:ring-2 focus:ring-cyan-400 focus:outline-none w-40"/>
                <button id="mat-bulk-apply" type="button" class="border border-slate-600 text-slate-400 px-3 py-2 rounded-md text-xs transition hover:bg-slate-700">Aplicar a seleccionados</button>
                <button id="mat-save-config" type="button" class="border border-cyan-600 text-cyan-400 px-3 py-2 rounded-md text-xs transition hover:bg-cyan-600/20">💾 Guardar config</button>
                <span id="mat-save-status" class="text-xs text-emerald-400 hidden">✓ Guardado</span>
            </div>
            <div class="overflow-auto max-h-64 border border-slate-700/50 rounded-lg">
                <table class="w-full text-xs">
                    <thead class="sticky top-0 bg-slate-900/95">
                        <tr>
                            <th class="p-2 w-6"><input type="checkbox" id="mat-check-all" class="accent-cyan-400"/></th>
                            <th class="p-2 text-left text-slate-400 font-medium">Assignment</th>
                            <th class="p-2 text-left text-slate-400 font-medium w-40">Fecha liberación</th>
                            <th class="p-2 text-left text-slate-400 font-medium w-32">Batch</th>
                        </tr>
                    </thead>
                    <tbody id="mat-assignments-tbody" class="divide-y divide-slate-700/40"></tbody>
                </table>
            </div>
        </div>

        <!-- Paso 3: CSV participantes Moodle (oculto hasta cargar) -->
        <div id="mat-csv-panel" class="border border-slate-700/50 p-5 rounded-lg space-y-3 hidden">
            <h3 class="font-semibold text-lg text-slate-300 border-b border-slate-700 pb-2">Paso 3: Nombres desde Moodle (opcional)</h3>
            <p class="text-xs text-slate-400">Subí el CSV de participantes de Moodle para mostrar "Apellido, Nombre" en lugar del usuario GitHub. Columnas esperadas: <code class="text-cyan-400">Nombre, Apellido(s), Dirección de correo</code>.</p>
            <div class="flex items-center gap-3">
                <input type="file" id="mat-csv-upload" accept=".csv"
                    class="text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-4 file:rounded file:border-0 file:bg-cyan-600/20 file:text-cyan-400 hover:file:bg-cyan-600/30 cursor-pointer"/>
                <span id="mat-csv-status" class="text-xs text-slate-400"></span>
            </div>
        </div>

        <!-- Paso 4: Generar -->
        <div id="mat-generate-panel" class="hidden space-y-3">
            <label class="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input type="checkbox" id="mat-enrich" class="accent-cyan-400" checked/>
                Verificar commits reales (más preciso pero más lento)
            </label>
            <button id="mat-generate" type="button" class="w-full bg-emerald-600 text-white font-bold py-3 rounded-md transition-all hover:bg-emerald-500">
                ⚡ Generar Matriz de Progreso
            </button>
        </div>

        <!-- Error -->
        <div id="mat-error" class="text-red-400 font-medium text-center hidden"></div>
        <!-- Progress -->
        <div id="mat-progress" class="hidden text-center space-y-2">
            <p id="mat-progress-text" class="text-cyan-300 text-sm font-semibold tracking-wider"></p>
            <div class="w-full bg-slate-700 rounded-full h-2">
                <div id="mat-progress-bar" class="bg-cyan-400 h-2 rounded-full transition-all duration-300" style="width:0%"></div>
            </div>
        </div>

        <!-- Resultados -->
        <div id="mat-results" class="hidden space-y-6">
            <div id="mat-stats" class="glass-panel p-4 rounded-lg border border-slate-700/50 flex flex-wrap gap-6 text-sm"></div>

            <div class="space-y-2">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h3 class="font-semibold text-slate-300">Matriz de Entregas</h3>
                        <p class="text-xs text-slate-500 mt-1">
                            🟢 Entregado ≥80 &nbsp;|&nbsp; 🟡 Entregado &lt;80 &nbsp;|&nbsp; 🔴 No entregado &nbsp;|&nbsp; ⬜ Sin fecha asignada
                        </p>
                    </div>
                    <button id="mat-export" type="button"
                        class="flex-shrink-0 flex items-center gap-2 border border-emerald-500 text-emerald-400 px-4 py-2 rounded-md text-sm font-semibold transition hover:bg-emerald-500/20">
                        📥 Exportar Excel completo
                    </button>
                </div>
                <div id="mat-table-container" class="overflow-x-auto border border-slate-700/50 rounded-lg max-h-[55vh] overflow-y-auto text-xs"></div>
            </div>

            <div id="mat-delay-section" class="hidden space-y-2">
                <h3 class="font-semibold text-slate-300">Análisis de Demora por Ejercicio</h3>
                <div id="mat-delay-table" class="overflow-x-auto border border-slate-700/50 rounded-lg text-xs"></div>
            </div>
        </div>
    </div>`;

    // ── Estado ────────────────────────────────────────────────────────
    const st = {
        assignments: [],
        allGrades: [],        // Array<Array<grade>>
        nameMapping: {},      // email -> "Apellido, Nombre"
        classroomId: null
    };

    // ── Refs ──────────────────────────────────────────────────────────
    const $ = sel => container.querySelector(sel);
    const classroomSel  = $('#mat-classroom');
    const loadBtn       = $('#mat-load-btn');
    const configPanel   = $('#mat-config-panel');
    const csvPanel      = $('#mat-csv-panel');
    const generatePanel = $('#mat-generate-panel');
    const resultsDiv    = $('#mat-results');
    const errDiv        = $('#mat-error');
    const progressDiv   = $('#mat-progress');
    const progressText  = $('#mat-progress-text');
    const progressBar   = $('#mat-progress-bar');
    const tbody         = $('#mat-assignments-tbody');
    const checkAll      = $('#mat-check-all');
    const saveBtn       = $('#mat-save-config');
    const saveStatus    = $('#mat-save-status');
    const bulkApplyBtn  = $('#mat-bulk-apply');
    const csvInput      = $('#mat-csv-upload');
    const csvStatus     = $('#mat-csv-status');
    const generateBtn   = $('#mat-generate');
    const exportBtn     = $('#mat-export');
    const statsDiv      = $('#mat-stats');
    const tableContainer= $('#mat-table-container');
    const delaySection  = $('#mat-delay-section');
    const delayTable    = $('#mat-delay-table');

    function showErr(msg) { errDiv.textContent = msg; errDiv.classList.remove('hidden'); }
    function clearErr()   { errDiv.textContent = ''; errDiv.classList.add('hidden'); }
    function setProgress(text, pct) {
        progressDiv.classList.remove('hidden');
        progressText.textContent = text;
        progressBar.style.width = `${pct}%`;
    }
    function hideProgress() { progressDiv.classList.add('hidden'); }

    // ── Classroom loader ──────────────────────────────────────────────
    classroomSel.addEventListener('focus', async function() {
        const token = getToken(); if (!token) return;
        classroomSel.innerHTML = '<option disabled selected>Cargando...</option>';
        try {
            showSpinner();
            const cls = await GITHUB_API.getClassrooms(token);
            hideSpinner();
            classroomSel.innerHTML = '<option disabled selected value="">--- Selecciona un classroom ---</option>';
            cls.forEach(c => classroomSel.innerHTML += `<option value="${c.id}">${c.name}</option>`);
        } catch(e) { hideSpinner(); classroomSel.innerHTML = '<option disabled selected>Error</option>'; showErr(e.message); }
    }, { once: true });

    // ── Cargar assignments ────────────────────────────────────────────
    loadBtn.addEventListener('click', async () => {
        clearErr();
        const token = getToken(); if (!token) return;
        st.classroomId = classroomSel.value;
        if (!st.classroomId) { showErr('Seleccioná un classroom primero.'); return; }
        try {
            showSpinner();
            st.assignments = await GITHUB_API.getAssignments(st.classroomId, token);
            hideSpinner();
        } catch(e) { hideSpinner(); showErr(e.message); return; }
        populateAssignmentsTable();
        configPanel.classList.remove('hidden');
        csvPanel.classList.remove('hidden');
        generatePanel.classList.remove('hidden');
    });

    // ── Tabla de assignments ──────────────────────────────────────────
    function populateAssignmentsTable() {
        const saved = loadConfig();
        tbody.innerHTML = st.assignments.map((a, i) => {
            const cfg = saved[a.id] || {};
            return `<tr class="hover:bg-slate-800/40">
                <td class="p-2 text-center"><input type="checkbox" class="mat-asg-check accent-cyan-400" data-idx="${i}"/></td>
                <td class="p-2 text-slate-300">${a.title}</td>
                <td class="p-2"><input type="date" class="mat-date bg-slate-800 text-slate-300 border border-slate-600 rounded px-2 py-1 w-full focus:ring-1 focus:ring-cyan-400 focus:outline-none" data-asgid="${a.id}" value="${cfg.date || ''}"/></td>
                <td class="p-2"><input type="text" placeholder="Batch" class="mat-batch bg-slate-800 text-slate-300 border border-slate-600 rounded px-2 py-1 w-full focus:ring-1 focus:ring-cyan-400 focus:outline-none" data-asgid="${a.id}" value="${cfg.batch || ''}"/></td>
            </tr>`;
        }).join('');

        // Auto-save on change
        tbody.addEventListener('change', () => { saveConfig(); flashSave(); });
    }

    function flashSave() {
        saveStatus.classList.remove('hidden');
        setTimeout(() => saveStatus.classList.add('hidden'), 1800);
    }

    checkAll.addEventListener('change', () => {
        tbody.querySelectorAll('.mat-asg-check').forEach(cb => cb.checked = checkAll.checked);
    });

    bulkApplyBtn.addEventListener('click', () => {
        const date  = $('#mat-bulk-date').value;
        const label = $('#mat-bulk-label').value;
        tbody.querySelectorAll('.mat-asg-check:checked').forEach(cb => {
            const row = cb.closest('tr');
            if (date)  row.querySelector('.mat-date').value  = date;
            if (label) row.querySelector('.mat-batch').value = label;
        });
        saveConfig(); flashSave();
    });

    saveBtn.addEventListener('click', () => { saveConfig(); flashSave(); });

    function saveConfig() {
        const cfg = {};
        tbody.querySelectorAll('.mat-date').forEach(inp => {
            const id = inp.dataset.asgid;
            cfg[id] = cfg[id] || {};
            cfg[id].date = inp.value;
        });
        tbody.querySelectorAll('.mat-batch').forEach(inp => {
            const id = inp.dataset.asgid;
            cfg[id] = cfg[id] || {};
            cfg[id].batch = inp.value;
        });
        localStorage.setItem(`matCfg_${st.classroomId}`, JSON.stringify(cfg));
        return cfg;
    }

    function loadConfig() {
        try { return JSON.parse(localStorage.getItem(`matCfg_${st.classroomId}`) || '{}'); }
        catch { return {}; }
    }

    // ── CSV Moodle ────────────────────────────────────────────────────
    csvInput.addEventListener('change', e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const lines = ev.target.result.split('\n');
            const sep = lines[0].includes(';') ? ';' : ',';
            const header = lines[0].split(sep).map(h => h.replace(/"/g,'').trim());
            const iNombre   = header.findIndex(h => h.toLowerCase().startsWith('nombre'));
            const iApellido = header.findIndex(h => h.toLowerCase().startsWith('apellido'));
            const iEmail    = header.findIndex(h => h.toLowerCase().includes('correo') || h.toLowerCase() === 'email');
            if (iEmail === -1) { csvStatus.textContent = '⚠ No se encontró columna de email.'; return; }
            let count = 0;
            st.nameMapping = {};
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(sep).map(c => c.replace(/"/g,'').trim());
                if (!cols[iEmail]) continue;
                try {
                    const leg = parseInt(cols[iEmail].split('@')[0]);
                    const nombre = `${cols[iApellido] || ''}, ${cols[iNombre] || ''}`.trim().replace(/^,\s*|,\s*$/, '');
                    if (leg && nombre) { st.nameMapping[leg] = nombre; count++; }
                } catch {}
            }
            csvStatus.textContent = `✓ ${count} alumnos cargados`;
        };
        reader.readAsText(file);
    });

    // ── Obtener nombre para mostrar ───────────────────────────────────
    function getNombre(email) {
        if (!email) return '—';
        try {
            const leg = parseInt(email.split('@')[0]);
            return st.nameMapping[leg] || email.split('@')[0];
        } catch { return email; }
    }

    // ── Generar matriz ────────────────────────────────────────────────
    generateBtn.addEventListener('click', async () => {
        clearErr();
        const token = getToken(); if (!token) return;
        resultsDiv.classList.add('hidden');
        setProgress('Cargando calificaciones...', 10);
        try {
            const baseGrades = await GITHUB_API.getAllGrades(st.assignments, token);
            setProgress('Calificaciones cargadas. Verificando commits...', 30);

            if ($('#mat-enrich').checked) {
                let done = 0;
                const total = baseGrades.reduce((s, g) => s + g.length, 0);
                st.allGrades = await GITHUB_API.enrichGradesWithCommits(baseGrades, token, (d, t) => {
                    done = d;
                    setProgress(`Verificando commits... ${d}/${t}`, 30 + Math.round(d / t * 65));
                });
            } else {
                st.allGrades = baseGrades;
            }

            hideProgress();
            renderMatrix();
            resultsDiv.classList.remove('hidden');
        } catch(e) {
            hideProgress();
            showErr('Error: ' + e.message);
        }
    });

    // ── Render matrix ─────────────────────────────────────────────────
    function renderMatrix() {
        const cfg = loadConfig();

        // Build per-student data: email -> { name, assignments: {asgId: {nota, fecha}} }
        const students = {};
        st.assignments.forEach((asg, asgIdx) => {
            const grades = st.allGrades[asgIdx] || [];
            grades.forEach(g => {
                const email = g.roster_identifier || g.github_username;
                if (!students[email]) students[email] = { name: getNombre(email), asg: {} };
                if (g.points_awarded !== null && g.points_awarded !== undefined) {
                    students[email].asg[asg.id] = {
                        nota: Number(g.points_awarded),
                        fecha: g.submission_timestamp || null
                    };
                }
            });
        });

        // Sort students by name
        const sortedStudents = Object.entries(students).sort((a, b) => a[1].name.localeCompare(b[1].name));

        // Stats
        const totalStudents = sortedStudents.length;
        const totalExercises = st.assignments.length;
        const avgDelivered = totalStudents ? (sortedStudents.reduce((s, [, d]) => s + Object.keys(d.asg).length, 0) / totalStudents).toFixed(1) : 0;
        const withAllDelivered = sortedStudents.filter(([, d]) => Object.keys(d.asg).length === totalExercises).length;
        statsDiv.innerHTML = `
            <div><span class="text-slate-400">Alumnos:</span> <span class="font-bold text-cyan-300">${totalStudents}</span></div>
            <div><span class="text-slate-400">Ejercicios:</span> <span class="font-bold text-cyan-300">${totalExercises}</span></div>
            <div><span class="text-slate-400">Prom. entregas/alumno:</span> <span class="font-bold text-cyan-300">${avgDelivered}</span></div>
            <div><span class="text-slate-400">Completaron todo:</span> <span class="font-bold text-emerald-400">${withAllDelivered}</span></div>`;

        // Group assignments by batch label for header coloring
        const batchColors = ['1d4ed8','0f766e','7c2d12','4c1d95','134e4a','1e3a5f','3d0f0f','1a2e05'];
        const batchMap = {};
        let batchIdx = 0;
        st.assignments.forEach(a => {
            const label = cfg[a.id]?.batch || '';
            if (label && !batchMap[label]) { batchMap[label] = batchColors[batchIdx++ % batchColors.length]; }
        });

        // Header row
        let headerCols = `<th class="sticky left-0 bg-slate-900 z-10 min-w-[200px] p-2 text-left font-semibold text-slate-300 border-b border-slate-700">Nombre / Email</th>`;
        st.assignments.forEach(a => {
            const bLabel = cfg[a.id]?.batch || '';
            const bColor = bLabel ? batchMap[bLabel] : '334155';
            headerCols += `<th style="background:#${bColor}22;border-bottom:2px solid #${bColor}99" class="min-w-[90px] p-2 text-center font-medium text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[90px]" title="${a.title}">${a.title.length > 12 ? a.title.substring(0,12)+'…' : a.title}</th>`;
        });
        headerCols += `<th class="min-w-[60px] p-2 text-center font-semibold text-slate-300 border-b border-slate-700">Total</th>
                       <th class="min-w-[55px] p-2 text-center font-semibold text-slate-300 border-b border-slate-700">%</th>
                       <th class="min-w-[55px] p-2 text-center font-semibold text-slate-300 border-b border-slate-700">Nota</th>`;

        // Data rows
        let rows = '';
        sortedStudents.forEach(([email, d]) => {
            let rowCells = `<td class="sticky left-0 bg-slate-900 z-10 p-2 text-slate-300 border-b border-slate-700/50 whitespace-nowrap">${d.name}</td>`;
            let delivered = 0, notaSum = 0, notaCount = 0;
            st.assignments.forEach(a => {
                const entry = d.asg[a.id];
                const relDate = cfg[a.id]?.date ? new Date(cfg[a.id].date) : null;
                if (entry !== undefined) {
                    const nota = entry.nota;
                    let delay = '';
                    if (relDate && entry.fecha) {
                        const diff = Math.round((new Date(entry.fecha) - relDate) / 86400000);
                        delay = `<span class="text-[9px] ${diff > 7 ? 'text-orange-400' : 'text-slate-400'}">+${diff}d</span>`;
                    }
                    const bg = nota >= 80 ? '#14532d' : nota >= 50 ? '#451a03' : '#3b0000';
                    const fg = nota >= 80 ? '#86efac' : nota >= 50 ? '#fcd34d' : '#fca5a5';
                    rowCells += `<td style="background:${bg}" class="p-1.5 text-center border-b border-slate-700/40">
                        <div style="color:${fg}" class="font-bold text-[11px]">${nota}</div>${delay}
                    </td>`;
                    delivered++; notaSum += nota; notaCount++;
                } else {
                    rowCells += `<td class="p-1.5 text-center border-b border-slate-700/40 bg-slate-800/30">
                        <span class="text-slate-600 text-[10px]">—</span>
                    </td>`;
                }
            });
            const pct = totalExercises ? ((delivered / totalExercises) * 100).toFixed(0) : 0;
            const avgN = notaCount ? (notaSum / notaCount).toFixed(1) : '—';
            rowCells += `<td class="p-2 text-center font-bold text-cyan-300 border-b border-slate-700/50">${delivered}</td>
                         <td class="p-2 text-center text-slate-300 border-b border-slate-700/50">${pct}%</td>
                         <td class="p-2 text-center font-bold text-cyan-300 border-b border-slate-700/50">${avgN}</td>`;
            rows += `<tr class="hover:bg-slate-800/30 transition-colors">${rowCells}</tr>`;
        });

        tableContainer.innerHTML = `
            <table class="w-full border-collapse">
                <thead class="sticky top-0 bg-slate-900 z-20"><tr>${headerCols}</tr></thead>
                <tbody>${rows}</tbody>
            </table>`;

        // Delay analysis
        renderDelayAnalysis(sortedStudents, cfg);
    }

    function renderDelayAnalysis(sortedStudents, cfg) {
        const hasDates = st.assignments.some(a => cfg[a.id]?.date);
        if (!hasDates) { delaySection.classList.add('hidden'); return; }
        delaySection.classList.remove('hidden');

        let rows = '';
        st.assignments.forEach((a, asgIdx) => {
            if (!cfg[a.id]?.date) return;
            const relDate = new Date(cfg[a.id].date);
            const batch = cfg[a.id]?.batch || '—';
            const diasList = [];
            let entregados = 0;
            sortedStudents.forEach(([, d]) => {
                const entry = d.asg[a.id];
                if (entry !== undefined) {
                    entregados++;
                    if (entry.fecha) {
                        const diff = Math.round((new Date(entry.fecha) - relDate) / 86400000);
                        diasList.push(diff);
                    }
                }
            });
            const prom = diasList.length ? (diasList.reduce((s,v)=>s+v,0)/diasList.length).toFixed(1) : '—';
            const min  = diasList.length ? Math.min(...diasList) : '—';
            const max  = diasList.length ? Math.max(...diasList) : '—';
            const d0   = diasList.filter(d => d <= 0).length;
            rows += `<tr class="border-b border-slate-700/40 hover:bg-slate-800/30">
                <td class="p-2 text-slate-300 font-medium">${a.title}</td>
                <td class="p-2 text-slate-400 text-center">${batch}</td>
                <td class="p-2 text-slate-400 text-center">${cfg[a.id].date}</td>
                <td class="p-2 text-cyan-300 text-center font-bold">${entregados}</td>
                <td class="p-2 text-slate-300 text-center">${prom}</td>
                <td class="p-2 text-emerald-400 text-center">${min}</td>
                <td class="p-2 text-orange-400 text-center">${max}</td>
                <td class="p-2 text-cyan-400 text-center">${d0}</td>
            </tr>`;
        });

        delayTable.innerHTML = `
            <table class="w-full border-collapse">
                <thead class="sticky top-0 bg-slate-900/95">
                    <tr class="border-b-2 border-cyan-400/30">
                        <th class="p-2 text-left text-slate-400 font-medium">Assignment</th>
                        <th class="p-2 text-center text-slate-400 font-medium">Batch</th>
                        <th class="p-2 text-center text-slate-400 font-medium">Fecha lib.</th>
                        <th class="p-2 text-center text-slate-400 font-medium">Entregaron</th>
                        <th class="p-2 text-center text-slate-400 font-medium">Prom. días</th>
                        <th class="p-2 text-center text-slate-400 font-medium">Mín.</th>
                        <th class="p-2 text-center text-slate-400 font-medium">Máx.</th>
                        <th class="p-2 text-center text-slate-400 font-medium">Entregaron día 0</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
    }

    // ── Export Excel (xlsx-js-style) ──────────────────────────────────
    exportBtn.addEventListener('click', () => {
        if (!st.allGrades || !st.assignments.length) return;
        const cfg = loadConfig();

        const WB = XLSX.utils.book_new();

        // ── Colores helpers ─────────────────────────────────────────
        function cellStyle(bgRgb, fgRgb = 'FFFFFF', bold = false, sz = 9, center = true) {
            return {
                fill: { patternType: 'solid', fgColor: { rgb: bgRgb } },
                font: { bold, color: { rgb: fgRgb }, sz },
                alignment: { horizontal: center ? 'center' : 'left', vertical: 'center', wrapText: true },
                border: { top:{style:'thin',color:{rgb:'BBBBBB'}}, bottom:{style:'thin',color:{rgb:'BBBBBB'}},
                          left:{style:'thin',color:{rgb:'BBBBBB'}}, right:{style:'thin',color:{rgb:'BBBBBB'}} }
            };
        }

        // Build student data (same as renderMatrix)
        const students = {};
        st.assignments.forEach((asg, asgIdx) => {
            (st.allGrades[asgIdx] || []).forEach(g => {
                const email = g.roster_identifier || g.github_username;
                if (!students[email]) students[email] = { name: getNombre(email), asg: {} };
                if (g.points_awarded !== null && g.points_awarded !== undefined) {
                    students[email].asg[asg.id] = {
                        nota: Number(g.points_awarded),
                        fecha: g.submission_timestamp || null
                    };
                }
            });
        });
        const sortedStudents = Object.entries(students).sort((a,b) => a[1].name.localeCompare(b[1].name));

        // ── Hoja 1: Matriz ─────────────────────────────────────────
        const matData = [
            // Fila 1: headers
            ['Nombre/Email', ...st.assignments.map(a => a.title), 'Total', '%', 'Nota Prom.']
        ];
        const matStyles = {};
        const HEADER_COL = '2C3E50';
        const batchColors2 = ['1A5276','196F3D','784212','6C3483','134E4A','3D0F0F'];
        const batchMap2 = {};
        let bIdx = 0;
        st.assignments.forEach(a => {
            const lbl = cfg[a.id]?.batch || '';
            if (lbl && !batchMap2[lbl]) batchMap2[lbl] = batchColors2[bIdx++ % batchColors2.length];
        });

        // Header row style
        const R0 = 0;
        matStyles[XLSX.utils.encode_cell({r:R0, c:0})] = cellStyle(HEADER_COL, 'FFFFFF', true, 9, false);
        st.assignments.forEach((a, ci) => {
            const lbl = cfg[a.id]?.batch || '';
            const col = lbl ? batchMap2[lbl] : HEADER_COL;
            matStyles[XLSX.utils.encode_cell({r:R0, c:ci+1})] = cellStyle(col, 'FFFFFF', true, 8);
        });
        matStyles[XLSX.utils.encode_cell({r:R0, c:st.assignments.length+1})] = cellStyle(HEADER_COL,'FFFFFF',true,8);
        matStyles[XLSX.utils.encode_cell({r:R0, c:st.assignments.length+2})] = cellStyle(HEADER_COL,'FFFFFF',true,8);
        matStyles[XLSX.utils.encode_cell({r:R0, c:st.assignments.length+3})] = cellStyle(HEADER_COL,'FFFFFF',true,8);

        sortedStudents.forEach(([email, d], ri) => {
            const row = [d.name];
            let delivered=0, notaSum=0, notaCount=0;
            st.assignments.forEach((a, ci) => {
                const entry = d.asg[a.id];
                if (entry !== undefined) {
                    const relDate = cfg[a.id]?.date ? new Date(cfg[a.id].date) : null;
                    let val = entry.nota.toString();
                    if (relDate && entry.fecha) {
                        const diff = Math.round((new Date(entry.fecha) - relDate) / 86400000);
                        val += ` (+${diff}d)`;
                    }
                    row.push(val);
                    const bg = entry.nota >= 80 ? 'B8DFBC' : entry.nota >= 50 ? 'F4A460' : 'FFCCCC';
                    const fg = entry.nota >= 80 ? '1E3A1E' : entry.nota >= 50 ? '3D1A00' : '3D0000';
                    matStyles[XLSX.utils.encode_cell({r:ri+1, c:ci+1})] = cellStyle(bg, fg, entry.nota===100, 8);
                    delivered++; notaSum += entry.nota; notaCount++;
                } else {
                    row.push('');
                    matStyles[XLSX.utils.encode_cell({r:ri+1, c:ci+1})] = cellStyle('FFCCCC','999999',false,8);
                }
            });
            const pct = st.assignments.length ? ((delivered/st.assignments.length)*100).toFixed(1)+'%' : '0%';
            const avg = notaCount ? (notaSum/notaCount).toFixed(1) : 0;
            row.push(delivered, pct, avg);
            matStyles[XLSX.utils.encode_cell({r:ri+1, c:0})] = cellStyle('F8F8F8','1A1A2E',false,9,false);
            matData.push(row);
        });

        const matWS = XLSX.utils.aoa_to_sheet(matData);
        matWS['!merges'] = [];
        Object.assign(matWS, matStyles); // Apply styles

        // Column widths
        matWS['!cols'] = [{ wch: 30 }, ...st.assignments.map(() => ({ wch: 11 })), { wch: 8 }, { wch: 7 }, { wch: 9 }];
        matWS['!rows'] = [{ hpx: 32 }, ...sortedStudents.map(() => ({ hpx: 22 }))];
        XLSX.utils.book_append_sheet(WB, matWS, 'Matriz de Entregas');

        // ── Hoja 2: Análisis de Demora ─────────────────────────────
        const delayRows = [['Assignment','Batch','Fecha lib.','Entregaron','Días prom.','Mín','Máx','Entregaron día 0']];
        st.assignments.forEach(a => {
            if (!cfg[a.id]?.date) return;
            const relDate = new Date(cfg[a.id].date);
            const batch = cfg[a.id]?.batch || '—';
            const diasList = [];
            let entregados = 0;
            sortedStudents.forEach(([,d]) => {
                const entry = d.asg[a.id];
                if (entry !== undefined) {
                    entregados++;
                    if (entry.fecha) diasList.push(Math.round((new Date(entry.fecha) - relDate) / 86400000));
                }
            });
            const prom = diasList.length ? (diasList.reduce((s,v)=>s+v,0)/diasList.length).toFixed(1) : '—';
            delayRows.push([
                a.title, batch, cfg[a.id].date, entregados,
                prom,
                diasList.length ? Math.min(...diasList) : '—',
                diasList.length ? Math.max(...diasList) : '—',
                diasList.filter(d=>d<=0).length
            ]);
        });
        const delayWS = XLSX.utils.aoa_to_sheet(delayRows);
        delayWS['!cols'] = [{wch:35},{wch:12},{wch:13},{wch:12},{wch:12},{wch:8},{wch:8},{wch:16}];
        XLSX.utils.book_append_sheet(WB, delayWS, 'Análisis Demora');

        // ── Hoja 3: Ranking ────────────────────────────────────────
        const rankRows = [['Pos.','Email','Nombre','Entregados','%','Nota Promedio']];
        const rankData = sortedStudents.map(([email, d]) => {
            const cnt = Object.keys(d.asg).length;
            const notas = Object.values(d.asg).map(e => e.nota);
            const avg = notas.length ? (notas.reduce((s,v)=>s+v,0)/notas.length).toFixed(1) : 0;
            return [email, d.name, cnt, avg];
        }).sort((a,b) => b[2]-a[2] || b[3]-a[3]);
        rankData.forEach(([email,name,cnt,avg], i) => {
            const pct = st.assignments.length ? ((cnt/st.assignments.length)*100).toFixed(1)+'%' : '0%';
            rankRows.push([i+1, email, name, cnt, pct, avg]);
        });
        const rankWS = XLSX.utils.aoa_to_sheet(rankRows);
        rankWS['!cols'] = [{wch:6},{wch:28},{wch:30},{wch:12},{wch:10},{wch:14}];
        XLSX.utils.book_append_sheet(WB, rankWS, 'Ranking');

        // ── Download ───────────────────────────────────────────────
        const classroom = classroomSel.options[classroomSel.selectedIndex]?.text || 'classroom';
        const fname = `Matriz_Progreso_${classroom.replace(/\s+/g,'-')}_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(WB, fname);
    });
}
