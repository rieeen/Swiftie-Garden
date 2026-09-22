

  /// NAVBAR ///

const navToggle = document.querySelector(".nav-toggle")
const navMenu = document.querySelector(".nav-menu")

navToggle.addEventListener("click", () => {
    navMenu.classList.toggle("nav-menu_visible");

    if (navMenu.classList.contains("nav-menu_visible")) {
        navToggle.setAttribute("aria-label", "Cerrar menú");
    } else {
        navToggle.setAttribute("aria-label", "Abrir menú");
    }
});



/* =========================================
   CONFIGURACIÓN
   ========================================= */

const configuracionRuletas = {

    normal: {
        input: "codigoNormal",
        reel: "slotReelNormal",
        resultado: "resultadoNormal",
        giros: "girosNormal",
        boton: "spinNormal"
    },

    raro: {
        input: "codigoRaro",
        reel: "slotReelRaro",
        resultado: "resultadoRaro",
        giros: "girosRaro",
        boton: "spinRaro"
    },

    legendario: {
        input: "codigoLegendario",
        reel: "slotReelLegendario",
        resultado: "resultadoLegendario",
        giros: "girosLegendario",
        boton: "spinLegendario"
    }

};


/* =========================================
   PREPARAR LOS CARRETES
   ========================================= */

function prepararCarrete(tipo) {

    const config = configuracionRuletas[tipo];

    const reel = document.getElementById(config.reel);

    if (!reel || reel.dataset.preparado === "true") {
        return;
    }


    /* Guardamos los poderes originales */

    const originales = Array.from(
        reel.querySelectorAll(".slot-item")
    ).map(item => {

        return item
            .querySelector("span")
            .textContent;

    });


    /*
       Creamos muchas repeticiones.

       Esto hace que el carrete tenga suficiente
       contenido para recorrerlo durante el giro.
    */

    const repeticiones = 15;

    reel.innerHTML = "";


    for (let vuelta = 0; vuelta < repeticiones; vuelta++) {

        originales.forEach(nombre => {

            const item = document.createElement("div");

            item.className = "slot-item";

            const span = document.createElement("span");

            span.textContent = nombre;

            item.appendChild(span);

            reel.appendChild(item);

        });

    }


    reel.dataset.preparado = "true";

}


/* =========================================
   PREPARAR LAS 3 RULETAS
   ========================================= */

prepararCarrete("normal");
prepararCarrete("raro");
prepararCarrete("legendario");

// =========================================
// PANEL DE ADMINISTRADOR
// =========================================

let teamsAdminData = [];
let poderesAdminData = [];
const poderesPorRuletaAdmin = {
    normal: [
        "The 1",
        "The archer",
        "The best day",
        "The bolter",
        "Bejeweled",
        "Blank space",
        "Cardigan",
        "Cruel summer",
        "Daylight",
        "Enchanted",
        "Exile",
        "Fearless",
        "Lavender haze",
        "Love story",
        "Mastermind",
        "Midnight rain",
        "Nobody, no crime",
        "Out of the woods",
        "Paper rings",
        "Red",
        "The prophecy",
        "The joker",
        "Willow",
        "You belong with me",
        "August",
        "Anti-hero",
        "Karma"
    ],

    raro: [
        "Wildest dreams",
        "High infidelity",
        "A dormir",
        "Better than revenge",
        "The story about us",
        "Enchanted",
        "You belong with me",
        "Blank space",
        "Love story"
    ],

    legendario: [
        "Fortnight leader",
        "Everybody agrees",
        "Good bye",
        "Karma",
        "Shake it off",
        "Destierro",
        "Together now"
    ]
};

// =========================================
// CARGAR TEAMS
// =========================================

async function cargarTeamsAdmin() {

    const contenedor = document.getElementById("adminTeams");

    if (!contenedor) {
        return;
    }

    try {

        contenedor.innerHTML = `
            <p class="poderes-cargando">
                🌱 Cargando Teams y poderes...
            </p>
        `;

        // Obtener Teams
        const respuestaTeams = await fetch(
            "http://localhost:3000/api/teams"
        );

        const datosTeams = await respuestaTeams.json();

        if (!datosTeams.success) {
            throw new Error(
                datosTeams.mensaje || "No se pudieron obtener los Teams."
            );
        }

        teamsAdminData = datosTeams.teams;

        // Obtener poderes de cada Team
        poderesAdminData = [];

        for (const team of teamsAdminData) {

            const respuestaPoderes = await fetch(
                `http://localhost:3000/api/poderes/${team.teamId}`
            );

            const datosPoderes = await respuestaPoderes.json();

            if (datosPoderes.success) {

                datosPoderes.poderes.forEach(poder => {

                    poderesAdminData.push({
                        ...poder,
                        teamId: team.teamId,
                        usuario: team.usuario
                    });

                });

            }
        }

        console.log("👥 Teams cargados:", teamsAdminData);
        console.log("💎 Poderes cargados:", poderesAdminData);

        renderizarTeamsAdmin();
actualizarResumenAdmin();
cargarTeamsEnSelector();

    } catch (error) {

        console.error(
            "❌ Error cargando panel:",
            error
        );

        contenedor.innerHTML = `
            <p class="poderes-cargando">
                ❌ No se pudieron cargar los Teams.
            </p>
        `;
    }
}

// =========================================
// DAR PODER MANUALMENTE
// =========================================

async function darPoderManual() {

    const teamId = document.getElementById("selectTeamPoder").value;
    const ruleta = document.getElementById("selectRuletaPoder").value;
    const poder = document.getElementById("selectPoder").value;
    const mensaje = document.getElementById("mensajeDarPoder");

    if (!teamId || !ruleta || !poder) {
        mensaje.textContent = "⚠️ Selecciona Team, ruleta y poder.";
        return;
    }

    try {

        mensaje.textContent = "✨ Asignando poder...";

        const respuesta = await fetch(
            "http://localhost:3000/api/poderes/manual",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    teamId: teamId,
                    poder: poder,
                    ruleta: ruleta
                })
            }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.success) {
            throw new Error(
                datos.mensaje || "No se pudo asignar el poder."
            );
        }

        mensaje.textContent = `✨ "${poder}" fue otorgado correctamente.`;

        // Limpiar selección
        document.getElementById("selectTeamPoder").value = "";
        document.getElementById("selectRuletaPoder").value = "";
        document.getElementById("selectPoder").innerHTML =
            `<option value="">Selecciona un poder</option>`;

        // Volver a cargar Teams y poderes
        await cargarTeamsAdmin();

    } catch (error) {

        console.error("❌ Error al dar poder:", error);

        mensaje.textContent =
            `❌ ${error.message}`;
    }
}


// =========================================
// EVENTO DEL BOTÓN
// =========================================

const btnDarPoder = document.getElementById("btnDarPoder");

if (btnDarPoder) {
    btnDarPoder.addEventListener("click", darPoderManual);
}

// =========================================
// CONFIGURAR FORMULARIO DE PODERES
// =========================================

function cargarTeamsEnSelector() {

    const selectTeam = document.getElementById("selectTeamPoder");

    if (!selectTeam) return;

    selectTeam.innerHTML =
        `<option value="">Selecciona un Team</option>`;

    teamsAdminData
        .filter(team => team.tipoUsuario !== 2 && team.activo)
        .forEach(team => {

            const option = document.createElement("option");

            option.value = team.teamId;
            option.textContent = team.usuario;

            selectTeam.appendChild(option);
        });
}


// =========================================
// CARGAR PODERES SEGÚN LA RULETA
// =========================================

function cargarPoderesSelector() {

    const selectRuleta =
        document.getElementById("selectRuletaPoder");

    const selectPoder =
        document.getElementById("selectPoder");

    if (!selectRuleta || !selectPoder) return;

    const ruleta = selectRuleta.value;

    selectPoder.innerHTML =
        `<option value="">Selecciona un poder</option>`;

    if (!ruleta) return;

    const poderesDisponibles =
        poderesPorRuletaAdmin[ruleta] || [];

    poderesDisponibles.forEach(nombrePoder => {

        const option = document.createElement("option");

        option.value = nombrePoder;
        option.textContent = nombrePoder;

        selectPoder.appendChild(option);
    });
}


// =========================================
// EVENTOS DE LOS SELECTORES
// =========================================

const selectRuletaPoder =
    document.getElementById("selectRuletaPoder");

if (selectRuletaPoder) {

    selectRuletaPoder.addEventListener(
        "change",
        cargarPoderesSelector
    );
}


// =========================================
// CARGAR TEAMS DESPUÉS DE OBTENERLOS
// =========================================

const cargarTeamsAdminOriginal =
    cargarTeamsAdmin;

// =========================================
// RENDERIZAR TEAMS
// =========================================

function renderizarTeamsAdmin() {

    const contenedor = document.getElementById("adminTeams");

    contenedor.innerHTML = "";

    teamsAdminData.forEach(team => {

        const poderesTeam = poderesAdminData.filter(
            poder => poder.teamId === team.teamId
        );

        // No mostrar admins como Team
        if (team.tipoUsuario === 2) {
            return;
        }

        const tarjeta = document.createElement("article");

        tarjeta.className = "admin-team-card";

        tarjeta.dataset.teamId = team.teamId;
        tarjeta.dataset.usuario = team.usuario;

        let poderesHTML = "";

        if (poderesTeam.length === 0) {

            poderesHTML = `
                <p class="sin-poderes">
                    Este Team todavía no tiene poderes.
                </p>
            `;

        } else {

            poderesTeam.forEach(poder => {

                let claseRuleta = poder.ruleta;

                let icono = "🌱";
                let nombreRuleta = "Normal";

                if (poder.ruleta === "raro") {
                    icono = "💎";
                    nombreRuleta = "Raro";
                }

                if (poder.ruleta === "legendario") {
                    icono = "👑";
                    nombreRuleta = "Legendario";
                }

                poderesHTML += `
                    <div class="admin-poder">

                        <div>
                            <strong>${poder.poder}</strong>

                            <span class="admin-tipo ${claseRuleta}">
                                ${icono} ${nombreRuleta}
                            </span>
                        </div>

                        <button
                            class="btn-revocar"
                            data-id="${poder.id}"
                            data-poder="${poder.poder}"
                        >
                            Revocar
                        </button>

                    </div>
                `;
            });
        }

        tarjeta.innerHTML = `

            <div class="admin-team-header">

                <div class="admin-team-info">

                    <div class="admin-team-icon">
                        🌿
                    </div>

                    <div>

                        <h2>${team.usuario}</h2>

                        <span>
                            Team ID: ${team.teamId}
                        </span>

                    </div>

                </div>

                <span class="admin-team-count">
                    ${poderesTeam.length} poderes
                </span>

            </div>

            <div class="admin-poderes-list">

                ${poderesHTML}

            </div>

        `;

        contenedor.appendChild(tarjeta);

    });

    agregarEventosRevocar();

    aplicarFiltrosAdmin();
}


// =========================================
// REVOCAR PODER
// =========================================

function agregarEventosRevocar() {

    const botones = document.querySelectorAll(
        ".btn-revocar"
    );

    botones.forEach(boton => {

        boton.addEventListener("click", async () => {

            const id = boton.dataset.id;
            const poder = boton.dataset.poder;

            const confirmar = confirm(
                `¿Seguro que quieres revocar el poder "${poder}"?`
            );

            if (!confirmar) {
                return;
            }

            try {

                boton.disabled = true;
                boton.textContent = "Revocando...";

                const respuesta = await fetch(
                    `http://localhost:3000/api/poderes/${id}`,
                    {
                        method: "DELETE"
                    }
                );

                const datos = await respuesta.json();

                if (!datos.success) {
                    throw new Error(
                        datos.mensaje ||
                        "No se pudo revocar el poder."
                    );
                }

                console.log(
                    `🗑️ Poder revocado: ${poder}`
                );

                // Eliminar SOLO ese registro
                poderesAdminData =
                    poderesAdminData.filter(
                        item => item.id !== id
                    );

                renderizarTeamsAdmin();

                actualizarResumenAdmin();

            } catch (error) {

                console.error(
                    "❌ Error al revocar:",
                    error
                );

                alert(
                    "No se pudo revocar el poder."
                );

                boton.disabled = false;
                boton.textContent = "Revocar";
            }

        });

    });

}


// =========================================
// BUSCAR TEAM
// =========================================

const buscadorTeam =
    document.getElementById("buscarTeam");

if (buscadorTeam) {

    buscadorTeam.addEventListener(
        "input",
        aplicarFiltrosAdmin
    );

}


// =========================================
// FILTRO POR TIPO DE PODER
// =========================================

const filtroAdmin =
    document.getElementById("filtroAdmin");

if (filtroAdmin) {

    filtroAdmin.addEventListener(
        "change",
        aplicarFiltrosAdmin
    );

}


// =========================================
// APLICAR FILTROS
// =========================================

function aplicarFiltrosAdmin() {

    const tarjetas =
        document.querySelectorAll(
            ".admin-team-card"
        );

    const busqueda =
        buscadorTeam
            ? buscadorTeam.value.toLowerCase()
            : "";

    const filtro =
        filtroAdmin
            ? filtroAdmin.value
            : "todos";

    tarjetas.forEach(tarjeta => {

        const texto =
            tarjeta.textContent.toLowerCase();

        const coincideBusqueda =
            texto.includes(busqueda);

        const poderes =
            tarjeta.querySelectorAll(
                ".admin-poder"
            );

        let coincideFiltro =
            filtro === "todos";

        poderes.forEach(poder => {

            const tipo =
                poder.querySelector(
                    ".admin-tipo"
                );

            if (!tipo) {
                return;
            }

            const coincide =
                tipo.classList.contains(
                    filtro
                );

            if (
                filtro === "todos" ||
                coincide
            ) {

                poder.style.display =
                    "flex";

                if (coincide) {
                    coincideFiltro = true;
                }

            } else {

                poder.style.display =
                    "none";

            }

        });

        tarjeta.style.display =
            coincideBusqueda &&
            coincideFiltro
                ? "block"
                : "none";

    });

}


// =========================================
// ACTUALIZAR RESUMEN
// =========================================

function actualizarResumenAdmin() {

    const teamsActivos =
        teamsAdminData.filter(
            team =>
                team.tipoUsuario !== 2 &&
                team.activo === true
        );

    const totalPoderes =
        poderesAdminData.length;

    const totalActivos =
        poderesAdminData.length;

    const elementoTeams =
        document.getElementById(
            "adminTotalTeams"
        );

    const elementoPoderes =
        document.getElementById(
            "adminTotalPoderes"
        );

    const elementoActivos =
        document.getElementById(
            "adminPoderesActivos"
        );

    if (elementoTeams) {
        elementoTeams.textContent =
            teamsActivos.length;
    }

    if (elementoPoderes) {
        elementoPoderes.textContent =
            totalPoderes;
    }

    if (elementoActivos) {
        elementoActivos.textContent =
            totalActivos;
    }

}


// =========================================
// INICIAR PANEL
// =========================================

cargarTeamsAdmin();