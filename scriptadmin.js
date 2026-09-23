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
    PANEL DE ADMINISTRACIÓN
 ========================================= */

 // Elementos del HTML
 const botonGenerar = document.getElementById("generarCodigo");
 const codigoGeneradoContainer = document.getElementById("codigoGeneradoContainer");
 const codigoGenerado = document.getElementById("codigoGenerado");
 const codigoInfo = document.getElementById("codigoInfo");
 const botonCopiar = document.getElementById("copiarCodigo");
 const tablaCodigos = document.getElementById("codesTableBody");


 // =========================================
 // NOMBRE DE LA RULETA
 // =========================================

 function obtenerNombreRuleta(ruleta) {

     if (ruleta === "normal") {
         return "Poderes normales";
     }

     if (ruleta === "raro") {
         return "Poderes raros";
     }

     if (ruleta === "legendario") {
         return "Poderes legendarios";
     }

     return "Desconocida";
 }


 // =========================================
 // GENERAR CÓDIGO
 // =========================================

 if (botonGenerar) {

     botonGenerar.addEventListener("click", async function () {

         const ruleta =
             document.getElementById("rarezaCodigo").value;

         const giros =
             document.getElementById("cantidadGiros").value;


         // Evitar múltiples clics mientras se genera
         botonGenerar.disabled = true;
         botonGenerar.textContent = "GENERANDO...";


         try {

             // =========================================
             // ENVIAR DATOS AL BACKEND
             // =========================================

             const respuesta = await fetch(
                 "/api/codigos",
                 {
                     method: "POST",

                     headers: {
                         "Content-Type": "application/json"
                     },

                     body: JSON.stringify({
                         ruleta: ruleta,
                         giros: giros
                     })
                 }
             );


             const datos = await respuesta.json();


             // =========================================
             // ERROR DEL BACKEND
             // =========================================

             if (!respuesta.ok || !datos.success) {

                 throw new Error(
                     datos.mensaje || "No se pudo generar el código"
                 );

             }


             // =========================================
             // MOSTRAR CÓDIGO GENERADO
             // =========================================

             codigoGenerado.textContent =
                 datos.codigo;


             codigoInfo.textContent =
                 `${obtenerNombreRuleta(datos.ruleta)} · ${datos.giros} ${datos.giros == 1 ? "giro" : "giros"}`;


             codigoGeneradoContainer.style.display =
                 "block";


             // =========================================
             // AGREGAR A LA TABLA
             // =========================================

             agregarCodigoTabla(
                 datos.codigo,
                 datos.ruleta,
                 datos.giros
             );


         } catch (error) {

             console.error(
                 "❌ Error al generar código:",
                 error
             );

             alert(
                 error.message ||
                 "No se pudo conectar con el servidor."
             );

         } finally {

             // Volver a activar botón
             botonGenerar.disabled = false;
             botonGenerar.textContent = "GENERAR CÓDIGO";

         }

     });

 }


 // =========================================
 // AGREGAR CÓDIGO A LA TABLA
 // =========================================

 function agregarCodigoTabla(codigo, ruleta, giros) {

     // Eliminar mensaje de "No hay códigos"
     const mensajeVacio =
         tablaCodigos.querySelector(".empty-codes");

     if (mensajeVacio) {
         mensajeVacio.parentElement.remove();
     }


     // Crear fila
     const fila = document.createElement("tr");


     // Código
     const celdaCodigo =
         document.createElement("td");

     celdaCodigo.textContent =
         codigo;


     // Ruleta
     const celdaRuleta =
         document.createElement("td");

     celdaRuleta.textContent =
         obtenerNombreRuleta(ruleta);


     // Giros
     const celdaGiros =
         document.createElement("td");

     celdaGiros.textContent =
         giros;


     // Estado
     const celdaEstado =
         document.createElement("td");

     celdaEstado.textContent =
         "Disponible";


     // Agregar celdas
     fila.appendChild(celdaCodigo);
     fila.appendChild(celdaRuleta);
     fila.appendChild(celdaGiros);
     fila.appendChild(celdaEstado);


     // Agregar fila
     tablaCodigos.appendChild(fila);
 }


 // =========================================
 // COPIAR CÓDIGO
 // =========================================

 if (botonCopiar) {

     botonCopiar.addEventListener(
         "click",
         async function () {

             const codigo =
                 codigoGenerado.textContent;


             if (!codigo || codigo === "—") {
                 return;
             }


             try {

                 await navigator.clipboard.writeText(
                     codigo
                 );


                 botonCopiar.innerHTML =
                     '<ion-icon name="checkmark-outline"></ion-icon>';


                 setTimeout(() => {

                     botonCopiar.innerHTML =
                         '<ion-icon name="copy-outline"></ion-icon>';

                 }, 1500);


             } catch (error) {

                 console.error(
                     "No se pudo copiar el código:",
                     error
                 );

             }

         }
     );

 }
// =========================================
// CARGAR CÓDIGOS DESDE DATAVERSE
// =========================================

async function cargarCodigos() {

    try {

        const respuesta = await fetch(
            "/api/codigos"
        );

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.success) {
            throw new Error(
                datos.mensaje || "No se pudieron cargar los códigos"
            );
        }

        tablaCodigos.innerHTML = "";

        if (datos.codigos.length === 0) {

            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td colspan="4" class="empty-codes">
                    No hay códigos generados.
                </td>
            `;

            tablaCodigos.appendChild(fila);

            return;
        }

        datos.codigos.forEach(codigo => {

            const fila = document.createElement("tr");

            const celdaCodigo =
                document.createElement("td");

            celdaCodigo.textContent =
                codigo.codigo;


            const celdaRuleta =
                document.createElement("td");

            celdaRuleta.textContent =
                obtenerNombreRuleta(codigo.ruleta);


            const celdaGiros =
                document.createElement("td");

            celdaGiros.textContent =
                `${codigo.girosUsados}/${codigo.girosTotales}`;


            const celdaEstado =
                document.createElement("td");

            celdaEstado.textContent =
                codigo.estado;


            fila.appendChild(celdaCodigo);
            fila.appendChild(celdaRuleta);
            fila.appendChild(celdaGiros);
            fila.appendChild(celdaEstado);

            tablaCodigos.appendChild(fila);

        });

    } catch (error) {

        console.error(
            "❌ Error al cargar códigos:",
            error
        );

    }

}

cargarCodigos();