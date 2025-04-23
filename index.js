


const orgSelect = document.getElementById('org-select');
const classroomSelect = document.getElementById('classroom-select');
const prefixSelect = document.getElementById('prefix-select');
const templateList = document.getElementById('template-list');
const githubForm = document.getElementById('github-form');
let myToken = '';

// Para paginación
const PAGE_SIZE = 10;
let templatesFullData = [];
let filteredTemplates = [];
let currentPage = 1;
const filterArea = document.getElementById('filter-area');
const templateFilter = document.getElementById('template-filter');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const navCreate = document.getElementById('nav-create');
const navDeliveries = document.getElementById('nav-deliveries');
const viewAssignments = document.getElementById('view-assignments');
const viewDeliveries = document.getElementById('view-deliveries');
navCreate.onclick = () => {
    navCreate.classList.add("underline");
    navDeliveries.classList.remove("underline");
    viewAssignments.classList.remove("hidden");
    viewDeliveries.classList.add("hidden");
};
navDeliveries.onclick = () => {
    navDeliveries.classList.add("underline");
    navCreate.classList.remove("underline");
    viewAssignments.classList.add("hidden");
    viewDeliveries.classList.remove("hidden");
};


/************* VISTA ENTREGAS **************/
const deliveriesForm = document.getElementById('deliveries-form');
const orgSelectDelivery = document.getElementById('org-select-delivery');
const prefixDelivery = document.getElementById('prefix-delivery');
const tokenDeliveryInput = document.getElementById('token-delivery');
const deliveriesResults = document.getElementById('deliveries-results');
const assignmentFilter = document.getElementById('assignment-filter');
const deliveriesFilter = document.getElementById('deliveries-filter');

// -- token para buscar orgs también --
let tokenDelivery = '';
tokenDeliveryInput.addEventListener('change', cargarOrgsDelivery);

async function cargarOrgsDelivery() {
    tokenDelivery = tokenDeliveryInput.value.trim();
    orgSelectDelivery.innerHTML = `<option disabled selected value="">Cargando organizaciones...</option>`;
    try {
        const orgsResp = await fetch(`https://api.github.com/user/orgs`, {
            headers: {
                "Authorization": `Bearer ${tokenDelivery}`,
                "Accept": "application/vnd.github+json"
            }
        });
        if(!orgsResp.ok) throw new Error('Error obteniendo organizaciones');
        const orgs = await orgsResp.json();
        orgSelectDelivery.innerHTML = `<option selected disabled hidden value="">--- Seleccione organización ---</option>`;
        for (const org of orgs) {
            const option = document.createElement('option');
            option.value = org.login;
            option.textContent = org.login;
            orgSelectDelivery.appendChild(option);
        }
    } catch(e) {
        orgSelectDelivery.innerHTML = `<option selected disabled hidden value="">Error obteniendo organizaciones</option>`;
    }
}

deliveriesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    deliveriesResults.innerHTML = `<div class="text-blue-700 font-bold my-6">⏳ Cargando entregas...</div>`;
    deliveriesFilter.classList.add('hidden');
    const org = orgSelectDelivery.value;
    const prefix = prefixDelivery.value;
    const token = tokenDeliveryInput.value.trim();
    if(!org) return;
    let page = 1, keepGoing = true, repos = [];
    try {
        // 1. Traer TODOS los repos privados de la org
        while (keepGoing) {
            const url = `https://api.github.com/orgs/${org}/repos?type=private&per_page=100&page=${page}`;
            const res = await fetch(url, {headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/vnd.github+json"
                }});
            if (!res.ok) throw new Error('Error obteniendo repos de la organización');
            const data = await res.json();
            if (data.length === 0) break;
            repos.push(...data);
            keepGoing = data.length === 100;
            page++;
        }
        // 2. Extraer posibles assignments: todos los repo templates y las entregas por matching nombre
        //      Ejemplo: assignmentName === template.name
        const templates = repos.filter(r => r.is_template);
        // Crea mapping: { assignmentName: [repoAlumno, ...] }
        let prefixFilter = (prefix !== "ALL") ? (tpl => tpl.name.startsWith(prefix)) : (()=>true);
        let assignmentMap = {};
        templates.filter(prefixFilter).forEach(tpl => assignmentMap[tpl.name] = []);
        // Filtra entregas por nombre de repo: "assignmentName-..."
        repos.forEach(repo => {
            Object.keys(assignmentMap).forEach(templName => {
                // Consideramos "entrega" si name empieza con "templName-"
                if (repo.name.startsWith(templName + "-")) assignmentMap[templName].push(repo);
            });
        });

        // 3. Render assignments y gráficos
        deliveriesResults.innerHTML = "";
        let allAssignments = Object.keys(assignmentMap)
            .map(aname => ({name: aname, entregas: assignmentMap[aname]}));
        let currentAssignments = allAssignments;
        // Permite filtrar
        deliveriesFilter.classList.toggle('hidden', allAssignments.length === 0);
        assignmentFilter.value = "";
        assignmentFilter.oninput = () => {
            const fil = assignmentFilter.value.toLowerCase();
            currentAssignments = allAssignments.filter(asg => asg.name.toLowerCase().includes(fil));
            renderEntregas(currentAssignments);
        }

        function renderEntregas(asgs) {
            deliveriesResults.innerHTML = "";
            if(asgs.length === 0) {
                deliveriesResults.innerHTML = `<div class="text-red-600 font-medium">Sin assignments para mostrar.</div>`;
                return;
            }
            asgs.forEach((asg, idx) => {
                // Prepara datos para el gráfico: barras por estado del repo (por defecto 1 valor: cantidad)
                let entregasCount = asg.entregas.length;
                let noEntregado = 0; // --> solo mostramos count de entregados, o si quieres puedes estimar "esperados"
                // prepara mini gráfico
                const chartId = `chart-deliv-${idx}`;
                const container = document.createElement('div');
                container.className = "mb-8 p-3 rounded bg-gray-100 shadow";
                container.innerHTML = `
          <div class="flex justify-between items-center mb-1">
            <div>
              <span class="font-bold text-blue-800">${asg.name}</span>
              <span class="ml-3 text-sm text-gray-500">${entregasCount} entregas</span>
            </div>
          </div>
          <canvas id="${chartId}" height="55"></canvas>
        `;
                deliveriesResults.appendChild(container);
                // Mini gráfico: sólo "entregas" (cantidad)
                setTimeout(() => {
                    new Chart(document.getElementById(chartId), {
                        type: 'bar',
                        data: {
                            labels: ['Entregas'],
                            datasets: [{label: 'Repos entregados', data: [entregasCount], backgroundColor: '#3b82f6'}]
                        },
                        options: {
                            indexAxis: 'y',
                            plugins: { legend: {display: false}, title: {display:false} },
                            scales: { x: {beginAtZero:true, max: Math.max(5, entregasCount)}, y: {beginAtZero:true} },
                            responsive: false,
                            animation: false,
                            events: []
                        }
                    });
                }, 150);
            });
        }
        renderEntregas(currentAssignments);

    } catch(e) {
        deliveriesResults.innerHTML = `<div class="text-red-600 font-semibold">❌ Error: ${e.message}</div>`;
    }
});
// Cargar ORGANIZACIONES al cambiar token
document.getElementById('token').addEventListener('change', async (e) => {
    myToken = e.target.value.trim();
    orgSelect.innerHTML = `<option selected disabled hidden value="">Cargando organizaciones...</option>`;
    try {
        const orgsResp = await fetch(`https://api.github.com/user/orgs`, {
            headers: {
                "Authorization": `Bearer ${myToken}`,
                "Accept": "application/vnd.github+json"
            }
        });
        if(!orgsResp.ok) throw new Error('Error obteniendo organizaciones');
        const orgs = await orgsResp.json();
        orgSelect.innerHTML = `<option selected disabled hidden value="">--- Seleccione organización ---</option>`;
        for (const org of orgs) {
            const option = document.createElement('option');
            option.value = org.login;
            option.textContent = org.login;
            orgSelect.appendChild(option);
        }
    } catch(e) {
        orgSelect.innerHTML = `<option selected disabled hidden value="">Error obteniendo organizaciones</option>`;
    }
});

// Cargar CLASSROOMS al cambiar organización
orgSelect.addEventListener('change', async () => {
    classroomSelect.innerHTML = `<option selected disabled hidden value="">Cargando classrooms...</option>`;
    try {
        const classroomsResp = await fetch(`https://api.github.com/classrooms`, {
            headers: {
                "Authorization": `Bearer ${myToken}`,
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });
        if(!classroomsResp.ok) throw new Error('Error obteniendo classrooms');
        const classrooms = await classroomsResp.json();
        // Filtra solo los classrooms de la organización seleccionada por coincidencia en el nombre (ajusta si tu naming varía)
        const filtered = classrooms.filter(c => c.name?.includes(orgSelect.value));
        classroomSelect.innerHTML = `<option selected disabled hidden value="">--- Seleccione classroom ---</option>`;
        for (const cls of filtered) {
            // Saca el slug de la URL
            let slug = '';
            if (cls.url && cls.url.includes('/classrooms/')) {
                slug = cls.url.split('/classrooms/')[1];
            }
            const option = document.createElement('option');
            option.value = slug;
            option.textContent = cls.name || slug;
            classroomSelect.appendChild(option);
        }
    } catch(e) {
        classroomSelect.innerHTML = `<option selected disabled hidden value="">Error obteniendo classrooms</option>`;
    }
});

githubForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    templateList.classList.add("hidden");
    templateList.replaceChildren();
    filterArea.classList.add('hidden');
    templatesFullData = [];
    filteredTemplates = [];
    currentPage = 1;

    const org = orgSelect.value;
    const prefix = prefixSelect.value;
    const classroomSlug = classroomSelect.value;
    if(!org || !classroomSlug) {
        alert("Faltan datos.");
        return;
    }

    templateList.innerHTML = `<div class="text-blue-700 font-bold">⏳ Cargando templates...</div>`;
    templateList.classList.remove("hidden");

    try {
        let page = 1, keepGoing = true, templates = [];
        while (keepGoing) {
            const url = `https://api.github.com/orgs/${org}/repos?type=private&per_page=100&page=${page}`;
            const res = await fetch(url, {headers: {
                    "Authorization": `Bearer ${myToken}`,
                    "Accept": "application/vnd.github+json"
                }});
            if (!res.ok) throw new Error('Error obteniendo repos de la organización');
            const data = await res.json();
            if (data.length === 0) break;
            templates.push(...(data.filter(repo => repo.is_template)));
            keepGoing = data.length === 100;
            page++;
        }

        // Filtra por prefijo si corresponde
        if (prefix !== "ALL") {
            templates = templates.filter(tpl => tpl.name.startsWith(prefix));
        }

        if (templates.length === 0) {
            templateList.innerHTML = `<div class="text-red-600 font-medium">No hay repos de tipo template con ese prefijo.</div>`;
            return;
        }

        templatesFullData = templates;
        filteredTemplates = templatesFullData;
        currentPage = 1;
        renderTemplatesPage();

        // Mostrar filtro y paginador
        filterArea.classList.remove('hidden');
    } catch(e) {
        templateList.innerHTML = `<div class="text-red-600 font-semibold">❌ Error: ${e.message}</div>`;
    }
});

// Función filtro + paginación
function renderTemplatesPage() {
    templateList.classList.remove("hidden");
    templateList.innerHTML = "";
    // Re-generar por filtro
    const search = templateFilter.value?.toLowerCase() || "";
    filteredTemplates = templatesFullData.filter(tpl =>
        tpl.name.toLowerCase().includes(search)
    );
    const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
    if(currentPage > totalPages) currentPage = totalPages;
    if(currentPage < 1) currentPage = 1;
    const start = (currentPage-1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    // Paginador
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || filteredTemplates.length === 0;
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;

    // Render
    if (filteredTemplates.length === 0) {
        templateList.innerHTML = `<div class="text-red-600 font-medium">No hay repos para mostrar.</div>`;
        return;
    }
    filteredTemplates.slice(start, end).forEach((tpl) => {
        const assignmentName = tpl.name;
        const el = document.createElement('div');
        el.className = "p-3 rounded-xl bg-gray-100 shadow flex flex-wrap items-center justify-between gap-4";
        el.innerHTML = `
                <div>
                  <div class="font-bold text-blue-800">${assignmentName}</div>
                  <div class="text-gray-500 text-xs">${tpl.description || ""}</div>
                </div>
                <button class="create-btn bg-green-600 text-white px-4 py-1.5 rounded font-semibold shadow hover:bg-green-800 transition"
                        data-assignment="${assignmentName}"
                        data-classroom="${classroomSelect.value}"
                        >Crear Assignment</button>
              `;
        templateList.appendChild(el);
    });

    // Botones
    templateList.querySelectorAll('.create-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const assignment = btn.getAttribute('data-assignment');
            const classroomSlug = btn.getAttribute('data-classroom');
            // Copiar nombre del assignment al portapapeles
            try {
                await navigator.clipboard.writeText(assignment);
            } catch {}
            const classroomNewAssignmentURL = `https://classroom.github.com/classrooms/${classroomSlug}/new_assignments/new`;
            window.open(classroomNewAssignmentURL, "_blank");
            alert(
                `¡Nombre del assignment "${assignment}" copiado!\n\n` +
                `Pega ese nombre en el formulario de Classroom como nombre del assignment.\n`
            );
        });
    });
}

// Filtro: reactualiza
templateFilter.addEventListener('input', () => {
    currentPage = 1;
    renderTemplatesPage();
});
// Paginación
prevBtn.addEventListener('click', () => {
    if(currentPage > 1) {
        currentPage--;
        renderTemplatesPage();
    }
});
nextBtn.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
    if(currentPage < totalPages) {
        currentPage++;
        renderTemplatesPage();
    }
});