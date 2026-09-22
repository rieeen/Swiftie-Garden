var TrandingSlider = new Swiper('.tranding-slider', {
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    loop: true,
    slidesPerView: 'auto',
    coverflowEffect: {
      rotate: 0,
      stretch: 0,
      depth: 100,
      modifier: 2.5,
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    autoplay: {
        delay: 2000,
        disableOnInteraction: false,
    }
  });

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

// ========================================
// CANJEAR CÓDIGO
// ========================================

async function canjearCodigo(tipo) {

    const config = configuracionRuletas[tipo];

    if (!config) {
        return;
    }

    const input = document.getElementById(config.input);
    const giros = document.getElementById(config.giros);

    const codigo = input.value.trim().toUpperCase();

    const teamId = localStorage.getItem("teamId");

    if (codigo === "") {
        alert("Introduce un código.");
        return;
    }

    if (!teamId) {
        alert(
            "No se encontró el equipo que inició sesión. " +
            "Vuelve a iniciar sesión."
        );
        return;
    }

    try {

        const respuesta = await fetch(
            "/api/codigos/canjear",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    codigo: codigo,
                    teamId: teamId,
                    ruleta: tipo
                })
            }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.success) {

            alert("❌ " + datos.mensaje);

            return;
        }

        alert(
            `✅ Código canjeado correctamente.\n\n` +
            `Giros disponibles: ${datos.girosDisponibles}`
        );

        giros.textContent =
            `Giros disponibles: ${datos.girosDisponibles}`;

        input.value = "";

    } catch (error) {

        console.error(
            "❌ Error al canjear código:",
            error
        );

        alert(
            "❌ No se pudo conectar con el servidor."
        );
    }
}

// ========================================
// GIRAR RULETA
// ========================================

async function girarRuleta(tipo) {

    const config = configuracionRuletas[tipo];

    if (!config) {
        return;
    }

    const reel = document.getElementById(config.reel);
    const resultado = document.getElementById(config.resultado);
    const giros = document.getElementById(config.giros);
    const boton = document.getElementById(config.boton);

    const ventana = reel.closest(".slot-window");

    const teamId = localStorage.getItem("teamId");

    if (!teamId) {
        alert("❌ No se encontró el equipo que inició sesión.");
        return;
    }

    // Evitar que esta misma ruleta se pueda pulsar dos veces
    // mientras está girando.
    boton.disabled = true;

    resultado.textContent = "🎰 Girando...";

    ventana.classList.add("spinning");

    try {

        // ========================================
        // PEDIR RESULTADO AL BACKEND
        // ========================================

        const respuesta = await fetch(
            "/api/ruleta/girar",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    teamId: teamId,
                    ruleta: tipo
                })
            }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.success) {

            ventana.classList.remove("spinning");

            boton.disabled = false;

            alert(
                "❌ " +
                (datos.mensaje ||
                "No se pudo realizar el giro.")
            );

            return;
        }

        // ========================================
        // RESULTADO DEL BACKEND
        // ========================================
        const nombreGanador = datos.resultado;
        console.log(
            `🎁 Resultado ${tipo}:`,
            nombreGanador
        );
        // ========================================
        // BUSCAR EL PODER EN EL CARRETE
        // ========================================
        const todosLosItems = Array.from(
            reel.querySelectorAll(".slot-item")
        );
        const candidatosGanadores =
            todosLosItems.filter(item => {
                const span =
                    item.querySelector("span");
                return (
                    span &&
                    span.textContent.trim() ===
                    nombreGanador
                );
            });
        if (candidatosGanadores.length === 0) {
            console.error(
                `❌ No se encontró "${nombreGanador}" en la ruleta ${tipo}.`
            );
            ventana.classList.remove("spinning");
            resultado.textContent =
                `✨ ¡Te salió: ${nombreGanador}! ✨`;
            giros.textContent =
                `Giros disponibles: ${datos.girosDisponibles}`;
            boton.disabled =
                datos.girosDisponibles <= 0;
            return;
        }
        // Elegimos una copia del poder que esté
        // suficientemente abajo en el carrete.
        const posicionGanador = Math.min(
            10,
            candidatosGanadores.length - 1
        );
        const itemGanador =
            candidatosGanadores[posicionGanador];
        // ========================================
        // ANIMACIÓN
        // ========================================
        const alturaItem =
            itemGanador.offsetHeight;
        const posicionItem =
            itemGanador.offsetTop;
        const alturaVentana =
            ventana.clientHeight;
        const centroVentana =
            (alturaVentana / 2) -
            (alturaItem / 2);
        const posicionFinal =
            centroVentana -
            posicionItem;
        // Reiniciar solamente ESTE carrete
        reel.style.transition = "none";
        reel.style.transform =
            "translateY(0px)";
        // Forzar actualización
        reel.offsetHeight;
        // Animación
        reel.style.transition =
            "transform 3.2s cubic-bezier(0.12, 0.72, 0.18, 1)";
        reel.style.transform =
            `translateY(${posicionFinal}px)`;
        // ========================================
        // TERMINAR ANIMACIÓN
        // ========================================
        setTimeout(() => {
            // Quitar ganador anterior
            todosLosItems.forEach(item => {
                item.classList.remove("active");
            });
            // Marcar nuevo ganador
            itemGanador.classList.add("active");
            // Mostrar resultado
            resultado.textContent =
                `✨ ¡Te salió: ${nombreGanador}! ✨`;
            // Actualizar giros
            giros.textContent =
                `Giros disponibles: ${datos.girosDisponibles}`;
            // Quitar estado de giro
            ventana.classList.remove("spinning");
            // Permitir otro giro si quedan
            boton.disabled =
                datos.girosDisponibles <= 0;
        }, 3250);
    } catch (error) {
        console.error(
            `❌ Error al realizar giro ${tipo}:`,
            error
        );
        ventana.classList.remove("spinning");
        boton.disabled = false;
        alert(
            "❌ No se pudo conectar con el servidor."
        );
    }
}

/* =========================================
   USUARIO ACTUAL
========================================= */

const teamId = localStorage.getItem("teamId");
const usuarioActual = localStorage.getItem("usuario");

console.log("👤 Usuario actual:", usuarioActual);
console.log("🏷️ Team ID:", teamId);

// =========================================
// CARGAR GIROS DEL TEAM
// =========================================

async function cargarGirosTeam() {

    const teamId =
        localStorage.getItem("teamId");

    if (!teamId) {

        console.warn(
            "⚠️ No hay Team ID guardado."
        );

        return;

    }

    try {

        const respuesta = await fetch(
            `/api/giros/${teamId}`
        );

        const datos =
            await respuesta.json();

        if (!respuesta.ok || !datos.success) {

            console.error(
                "❌ No se pudieron cargar los giros:",
                datos.mensaje
            );

            return;

        }

        console.log(
            "🎰 Giros disponibles:",
            datos.giros
        );

        document.getElementById(
            "girosNormal"
        ).textContent =
            `Giros disponibles: ${datos.giros.normal}`;

        document.getElementById(
            "girosRaro"
        ).textContent =
            `Giros disponibles: ${datos.giros.raro}`;

        document.getElementById(
            "girosLegendario"
        ).textContent =
            `Giros disponibles: ${datos.giros.legendario}`;

    } catch (error) {

        console.error(
            "❌ Error al cargar los giros:",
            error
        );

    }

}

cargarGirosTeam();

// poderes //

// =========================================
// MIS PODERES - FILTROS
// =========================================

const filtrosPoderes = document.querySelectorAll(".mis-poderes .filtro");
const tarjetasPoderes = document.querySelectorAll(".mis-poderes .poder-card");

filtrosPoderes.forEach(filtro => {

    filtro.addEventListener("click", () => {

        // Quitar active de todos los botones
        filtrosPoderes.forEach(btn => {
            btn.classList.remove("active");
        });

        // Activar el botón seleccionado
        filtro.classList.add("active");

        // Saber qué categoría seleccionó
        const tipoSeleccionado = filtro.dataset.filtro;

        // Mostrar u ocultar tarjetas
        tarjetasPoderes.forEach(tarjeta => {

            const tipoPoder = tarjeta.dataset.tipo;

            if (
                tipoSeleccionado === "todos" ||
                tipoPoder === tipoSeleccionado
            ) {
                tarjeta.style.display = "block";
            } else {
                tarjeta.style.display = "none";
            }

        });

    });

});


// =========================================
// CONTADOR DE PODERES
// =========================================

function actualizarContadoresPoderes() {

    const total = tarjetasPoderes.length;

    const normales = document.querySelectorAll(
        ".mis-poderes .poder-card[data-tipo='normal']"
    ).length;

    const raros = document.querySelectorAll(
        ".mis-poderes .poder-card[data-tipo='raro']"
    ).length;

    const legendarios = document.querySelectorAll(
        ".mis-poderes .poder-card[data-tipo='legendario']"
    ).length;


    document.getElementById("totalPoderes").textContent = total;
    document.getElementById("totalNormales").textContent = normales;
    document.getElementById("totalRaros").textContent = raros;
    document.getElementById("totalLegendarios").textContent = legendarios;
}


// Ejecutar al cargar la página
actualizarContadoresPoderes();