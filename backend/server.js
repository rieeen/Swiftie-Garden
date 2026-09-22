require("dotenv").config();

const { ClientSecretCredential } = require("@azure/identity");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.get("/", (req, res) => {
    res.sendFile("indexr.html", { root: ".." });
});

app.use(express.static("..", { index: false }));

const credential = new ClientSecretCredential(
    process.env.TENANT_ID,
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
);

async function probarDataverse() {
    try {
        const token = await credential.getToken(
            `${process.env.DATAVERSE_URL}/.default`
        );

        console.log("✅ Conexión con Microsoft Entra exitosa");
        console.log("✅ Token obtenido correctamente");
    } catch (error) {
        console.error("❌ Error de autenticación:");
        console.error(error.message);
    }
}

probarDataverse();

async function consultarTeams() {
    try {
        const token = await credential.getToken(
            `${process.env.DATAVERSE_URL}/.default`
        );

        const respuesta = await fetch(
            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_teams?$select=crca6_usuario,crca6_contrasena,crca6_activo,crca6_tipousuario`,
            {
                headers: {
                    Authorization: `Bearer ${token.token}`,
                    Accept: "application/json"
                }
            }
        );

        if (!respuesta.ok) {
            throw new Error(`Dataverse respondió ${respuesta.status}: ${await respuesta.text()}`);
        }

        const datos = await respuesta.json();

        console.log("✅ Conexión con la tabla Teams exitosa");
        console.log("Teams encontrados:", datos.value);
    } catch (error) {
        console.error("❌ Error al consultar Teams:");
        console.error(error.message);
    }
}

consultarTeams();

app.post("/api/login", async (req, res) => {
    console.log("🔥 LOGIN RECIBIDO");

    const { usuario, contrasena } = req.body;
    

    if (!usuario || !contrasena) {
        return res.status(400).json({
            success: false,
            mensaje: "Faltan usuario o contraseña"
        });
    }

    try {
        const token = await credential.getToken(
            `${process.env.DATAVERSE_URL}/.default`
        );

        const filtro = `crca6_usuario eq '${usuario.replace(/'/g, "''")}'`;

        const respuesta = await fetch(
            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_teams?$select=crca6_usuario,crca6_contrasena,crca6_activo,crca6_tipousuario,crca6_teamid&$filter=${encodeURIComponent(filtro)}`,
            {
                headers: {
                    Authorization: `Bearer ${token.token}`,
                    Accept: "application/json"
                }
            }
        );

        if (!respuesta.ok) {
            throw new Error(
                `Dataverse respondió ${respuesta.status}: ${await respuesta.text()}`
            );
        }

        const datos = await respuesta.json();

        if (datos.value.length === 0) {
            return res.status(401).json({
                success: false,
                mensaje: "Usuario o contraseña incorrectos"
            });
        }

        const team = datos.value[0];

        if (!team.crca6_activo) {
            return res.status(403).json({
                success: false,
                mensaje: "Este usuario está inactivo"
            });
        }

        if (team.crca6_contrasena !== contrasena) {
            return res.status(401).json({
                success: false,
                mensaje: "Usuario o contraseña incorrectos"
            });
        }

       res.json({
    success: true,
    mensaje: "Inicio de sesión correcto",
    usuario: team.crca6_usuario,
    tipoUsuario: team.crca6_tipousuario,
    teamId: team.crca6_teamid
});

    } catch (error) {
        console.error("❌ Error en login:");
        console.error(error.message);

        res.status(500).json({
            success: false,
            mensaje: "Error del servidor"
        });
    }
});

// ========================================
// GENERAR CÓDIGO PARA RULETA
// ========================================

app.post("/api/codigos", async (req, res) => {

    console.log("🎰 PETICIÓN PARA GENERAR CÓDIGO");

    const { ruleta, giros } = req.body;


    // ================================
    // VALIDAR DATOS
    // ================================

    const ruletasPermitidas = [
        "normal",
        "raro",
        "legendario"
    ];

    const cantidadGiros = Number(giros);


    if (!ruletasPermitidas.includes(ruleta)) {

        return res.status(400).json({
            success: false,
            mensaje: "Ruleta no válida"
        });

    }


    if (!Number.isInteger(cantidadGiros) || cantidadGiros <= 0) {

        return res.status(400).json({
            success: false,
            mensaje: "Cantidad de giros no válida"
        });

    }


    try {

        // ================================
        // OBTENER TOKEN
        // ================================

        const token = await credential.getToken(
            `${process.env.DATAVERSE_URL}/.default`
        );


        // ================================
        // GENERAR CÓDIGO
        // ================================

        const caracteres =
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let parte1 = "";
        let parte2 = "";


        for (let i = 0; i < 4; i++) {

            parte1 += caracteres.charAt(
                Math.floor(Math.random() * caracteres.length)
            );

        }


        for (let i = 0; i < 4; i++) {

            parte2 += caracteres.charAt(
                Math.floor(Math.random() * caracteres.length)
            );

        }


        const codigo = `SG-${parte1}-${parte2}`;


        // ================================
        // GUARDAR EN DATAVERSE
        // ================================

        const registro = {

            crca6_codigo: codigo,

            crca6_estado: "Disponible",

            crca6_girostotales: cantidadGiros,

            crca6_girosusados: 0,

            crca6_ruleta: ruleta,

            crca6_teamid: null,

            crca6_fechacreacion:
                new Date().toISOString(),

            crca6_fechacanjeo: null

        };


        const respuesta = await fetch(

            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_codigoses`,

            {
                method: "POST",
                headers: {
                    Authorization:
                        `Bearer ${token.token}`,
                    Accept: "application/json",
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify(registro)
            }
        );

        // ================================
        // ERROR DE DATAVERSE
        // ================================

        if (!respuesta.ok) {
            const errorTexto =
                await respuesta.text();

            console.error(
                "❌ Error al guardar código:",
                errorTexto
            );
            throw new Error(
                `Dataverse respondió ${respuesta.status}`
            );
        }

        // ================================
        // RESPUESTA EXITOSA
        // ================================

        console.log(
            `✅ Código generado: ${codigo}`
        );

        res.status(201).json({
            success: true,
            mensaje: "Código generado correctamente",
            codigo: codigo,
            ruleta: ruleta,
            giros: cantidadGiros
        });

    } catch (error) {
        console.error(
            "❌ Error al generar código:"
        );

        console.error(error.message);
        res.status(500).json({
            success: false,
            mensaje:
                "No se pudo generar el código"
        });
    }
});

// ========================================
// OBTENER CÓDIGOS GENERADOS
// ========================================

app.get("/api/codigos", async (req, res) => {

    console.log("📋 PETICIÓN PARA CARGAR CÓDIGOS");

    try {

        const token = await credential.getToken(
            `${process.env.DATAVERSE_URL}/.default`
        );

        const respuesta = await fetch(
            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_codigoses?$select=crca6_codigo,crca6_ruleta,crca6_girostotales,crca6_girosusados,crca6_estado,crca6_fechacreacion&$orderby=crca6_fechacreacion desc`,
            {
                headers: {
                    Authorization: `Bearer ${token.token}`,
                    Accept: "application/json"
                }
            }
        );

        if (!respuesta.ok) {

            const errorTexto = await respuesta.text();

            console.error(
                "❌ Error al consultar códigos:",
                errorTexto
            );

            throw new Error(
                `Dataverse respondió ${respuesta.status}`
            );

        }

        const datos = await respuesta.json();

        const codigos = datos.value.map(codigo => ({

            codigo: codigo.crca6_codigo,

            ruleta: codigo.crca6_ruleta,

            girosTotales: codigo.crca6_girostotales,

            girosUsados: codigo.crca6_girosusados,

            estado: codigo.crca6_estado,

            fechaCreacion: codigo.crca6_fechacreacion

        }));

        console.log(
            `✅ ${codigos.length} códigos encontrados`
        );

        res.json({

            success: true,

            codigos: codigos

        });

    } catch (error) {

        console.error(
            "❌ Error al cargar códigos:"
        );

        console.error(error.message);

        res.status(500).json({

            success: false,

            mensaje: "No se pudieron cargar los códigos"

        });

    }

});

// ========================================
// CANJEAR CÓDIGO
// ========================================

app.post("/api/codigos/canjear", async (req, res) => {

    console.log("🎟️ PETICIÓN PARA CANJEAR CÓDIGO");

    const { codigo, teamId, ruleta } = req.body;

    // ========================================
    // VALIDAR DATOS
    // ========================================

    if (!codigo || !teamId || !ruleta) {

        return res.status(400).json({
            success: false,
            mensaje: "Faltan datos para canjear el código"
        });

    }

    const ruletasPermitidas = [
        "normal",
        "raro",
        "legendario"
    ];

    if (!ruletasPermitidas.includes(ruleta)) {

        return res.status(400).json({
            success: false,
            mensaje: "Ruleta no válida"
        });

    }

    try {

        // ========================================
        // OBTENER TOKEN
        // ========================================

        const token = await credential.getToken(
            `${process.env.DATAVERSE_URL}/.default`
        );

        // ========================================
        // BUSCAR CÓDIGO
        // ========================================

        const filtro =
            `crca6_codigo eq '${codigo.replace(/'/g, "''")}'`;

        const respuesta = await fetch(

            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_codigoses?$select=crca6_codigo,crca6_ruleta,crca6_girostotales,crca6_girosusados,crca6_estado,crca6_teamid&$filter=${encodeURIComponent(filtro)}`,

            {
                headers: {
                    Authorization:
                        `Bearer ${token.token}`,

                    Accept:
                        "application/json"
                }
            }
        );

        if (!respuesta.ok) {

            throw new Error(
                `Dataverse respondió ${respuesta.status}: ${await respuesta.text()}`
            );

        }

        const datos = await respuesta.json();

        // ========================================
        // CÓDIGO NO EXISTE
        // ========================================

        if (datos.value.length === 0) {

            return res.status(404).json({

                success: false,

                mensaje: "El código no existe."

            });

        }

        const codigoDataverse = datos.value[0];

        // ========================================
        // COMPROBAR RULETA
        // ========================================

        if (codigoDataverse.crca6_ruleta !== ruleta) {

            return res.status(400).json({

                success: false,

                mensaje:
                    "Este código no corresponde a esta ruleta."

            });

        }

        // ========================================
        // COMPROBAR SI YA FUE CANJEADO
        // ========================================

        if (codigoDataverse.crca6_teamid) {

            return res.status(400).json({

                success: false,

                mensaje:
                    "Este código ya fue canjeado."

            });

        }

        // ========================================
        // COMPROBAR GIROS
        // ========================================

        const girosTotales =
            Number(codigoDataverse.crca6_girostotales);

        const girosUsados =
            Number(codigoDataverse.crca6_girosusados || 0);

        const girosDisponibles =
            girosTotales - girosUsados;

        if (girosDisponibles <= 0) {

            return res.status(400).json({

                success: false,

                mensaje:
                    "Este código ya no tiene giros disponibles."

            });

        }

       // ========================================
// OBTENER ID DEL REGISTRO
// ========================================

const respuestaId = await fetch(

    `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_codigoses?$select=crca6_codigosid&$filter=${encodeURIComponent(filtro)}`,

    {
        headers: {

            Authorization:
                `Bearer ${token.token}`,

            Accept:
                "application/json"

        }

    }

);

if (!respuestaId.ok) {

    const errorTexto =
        await respuestaId.text();

    console.error(
        "❌ Error al obtener ID:",
        errorTexto
    );

    throw new Error(
        "No se pudo obtener el identificador del código"
    );

}

const datosId =
    await respuestaId.json();

const registro =
    datosId.value[0];

if (!registro || !registro.crca6_codigosid) {

    console.log(
        "Respuesta de Dataverse:",
        registro
    );

    throw new Error(
        "Dataverse no devolvió el ID del código"
    );

}

const registroId =
    registro.crca6_codigosid;

console.log(
    "🆔 ID del código:",
    registroId
);
        // ========================================
        // ACTUALIZAR CÓDIGO
        // ========================================

        const actualizar = await fetch(

            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_codigoses(${registroId})`,

            {
                method: "PATCH",

                headers: {

                    Authorization:
                        `Bearer ${token.token}`,

                    Accept:
                        "application/json",

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    crca6_teamid:
                        teamId,

                    crca6_estado:
                        "Canjeado",

                    crca6_fechacanjeo:
                        new Date().toISOString()

                })

            }

        );

        if (!actualizar.ok) {

            const errorTexto =
                await actualizar.text();

            console.error(
                "❌ Error al actualizar código:",
                errorTexto
            );

            throw new Error(
                `Dataverse respondió ${actualizar.status}`
            );

        }

        // ========================================
        // CANJE EXITOSO
        // ========================================

        console.log(
            `✅ Código ${codigo} canjeado por Team ${teamId}`
        );

        res.json({

            success: true,

            mensaje:
                "Código canjeado correctamente",

            girosDisponibles:
                girosDisponibles

        });

    } catch (error) {

        console.error(
            "❌ Error al canjear código:"
        );

        console.error(error.message);

        res.status(500).json({

            success: false,

            mensaje:
                "No se pudo canjear el código"

        });

    }

});

// ========================================
// OBTENER GIROS DEL TEAM
// ========================================

app.get("/api/giros/:teamId", async (req, res) => {

    console.log("🎰 PETICIÓN PARA OBTENER GIROS DEL TEAM");

    const { teamId } = req.params;

    if (!teamId) {
        return res.status(400).json({
            success: false,
            mensaje: "Falta el Team ID"
        });
    }

    try {

        // ========================================
        // OBTENER TOKEN
        // ========================================

        const token = await credential.getToken(
            `${process.env.DATAVERSE_URL}/.default`
        );

        // ========================================
        // BUSCAR CÓDIGOS DEL TEAM
        // ========================================

        const filtro =
            `crca6_teamid eq '${teamId.replace(/'/g, "''")}'`;

        const respuesta = await fetch(

            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_codigoses?$select=crca6_codigo,crca6_ruleta,crca6_girostotales,crca6_girosusados,crca6_estado&$filter=${encodeURIComponent(filtro)}`,

            {
                headers: {
                    Authorization:
                        `Bearer ${token.token}`,

                    Accept:
                        "application/json"
                }
            }

        );

        if (!respuesta.ok) {

            const errorTexto =
                await respuesta.text();

            console.error(
                "❌ Error al obtener giros:",
                errorTexto
            );

            throw new Error(
                `Dataverse respondió ${respuesta.status}`
            );

        }

        const datos =
            await respuesta.json();

        // ========================================
        // CALCULAR GIROS DISPONIBLES
        // ========================================

        const giros = {

            normal: 0,

            raro: 0,

            legendario: 0

        };

        datos.value.forEach(codigo => {

            const totales =
                Number(codigo.crca6_girostotales || 0);

            const usados =
                Number(codigo.crca6_girosusados || 0);

            const disponibles =
                Math.max(0, totales - usados);

            if (codigo.crca6_ruleta === "normal") {

                giros.normal += disponibles;

            }

            if (codigo.crca6_ruleta === "raro") {

                giros.raro += disponibles;

            }

            if (codigo.crca6_ruleta === "legendario") {

                giros.legendario += disponibles;

            }

        });

        console.log(
            "✅ Giros del Team:",
            giros
        );

        res.json({

            success: true,

            giros: giros

        });

    } catch (error) {

        console.error(
            "❌ Error al obtener giros:"
        );

        console.error(error.message);

        res.status(500).json({

            success: false,

            mensaje:
                "No se pudieron obtener los giros"

        });

    }

});

// =========================================
// OBTENER TEAMS PARA EL PANEL DE ADMIN
// =========================================

app.get("/api/teams", async (req, res) => {

    console.log("👥 PETICIÓN PARA OBTENER TEAMS");

    try {

        const token = await credential.getToken(
            `${process.env.DATAVERSE_URL}/.default`
        );

        const respuesta = await fetch(
            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_teams` +
            `?$select=crca6_usuario,crca6_teamid,crca6_tipousuario,crca6_activo`,
            {
                headers: {
                    Authorization: `Bearer ${token.token}`,
                    Accept: "application/json"
                }
            }
        );

        if (!respuesta.ok) {

            const errorTexto = await respuesta.text();

            console.error(
                "❌ Error al obtener Teams:",
                errorTexto
            );

            throw new Error(
                `Dataverse respondió ${respuesta.status}`
            );
        }

        const datos = await respuesta.json();

        const teams = datos.value.map(team => ({
            usuario: team.crca6_usuario,
            teamId: team.crca6_teamid,
            tipoUsuario: team.crca6_tipousuario,
            activo: team.crca6_activo
        }));

        console.log(
            `👥 Teams encontrados: ${teams.length}`
        );

        res.json({
            success: true,
            teams: teams
        });

    } catch (error) {

        console.error(
            "❌ Error al obtener Teams:",
            error.message
        );

        res.status(500).json({
            success: false,
            mensaje: "No se pudieron obtener los Teams."
        });
    }
});

// ========================================
// OBTENER PODERES DE UN TEAM
// ========================================

app.get("/api/poderes/:teamId", async (req, res) => {

    const { teamId } = req.params;

    if (!teamId) {
        return res.status(400).json({
            success: false,
            mensaje: "Falta el Team ID."
        });
    }

    try {

        const token = await credential.getToken(
            `${process.env.DATAVERSE_URL}/.default`
        );

        const filtro =
            `crca6_crca6_teamid eq '${teamId.replace(/'/g, "''")}'`;

        const respuesta = await fetch(
            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_poderesteams` +
            `?$select=crca6_poderesteamid,crca6_crca6_codigo,crca6_crca6_fechageneracion,crca6_crca6_poder,crca6_crca6_ruleta,crca6_crca6_teamid` +
            `&$filter=${encodeURIComponent(filtro)}` +
            `&$orderby=crca6_crca6_fechageneracion desc`,
            {
                headers: {
                    Authorization: `Bearer ${token.token}`,
                    Accept: "application/json"
                }
            }
        );

        if (!respuesta.ok) {

            const errorTexto =
                await respuesta.text();

            console.error(
                "❌ Error al obtener poderes:",
                errorTexto
            );

            throw new Error(
                `Dataverse respondió ${respuesta.status}`
            );
        }

        const datos = await respuesta.json();

        const poderes = datos.value.map(poder => ({
            id: poder.crca6_poderesteamid,
            codigo: poder.crca6_crca6_codigo,
            fecha: poder.crca6_crca6_fechageneracion,
            poder: poder.crca6_crca6_poder,
            ruleta: poder.crca6_crca6_ruleta
        }));

        console.log(
            `💎 Poderes encontrados para Team ${teamId}:`,
            poderes.length
        );

        res.json({
            success: true,
            poderes: poderes
        });

    } catch (error) {

        console.error(
            "❌ Error al obtener poderes del Team:",
            error
        );

        res.status(500).json({
            success: false,
            mensaje: "No se pudieron obtener los poderes."
        });
    }
});


// ========================================
// REVOCAR PODER DE UN TEAM
// ========================================

app.delete("/api/poderes/:id", async (req, res) => {

    console.log("🗑️ PETICIÓN PARA REVOCAR PODER");

    const { id } = req.params;

    if (!id) {
        return res.status(400).json({
            success: false,
            mensaje: "Falta el ID del poder."
        });
    }

    try {

        const token = await credential.getToken(
            `${process.env.DATAVERSE_URL}/.default`
        );

        const respuesta = await fetch(
            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_poderesteams(${id})`,
            {
                method: "DELETE",

                headers: {
                    Authorization: `Bearer ${token.token}`,
                    Accept: "application/json"
                }
            }
        );

        if (!respuesta.ok) {

            const errorTexto =
                await respuesta.text();

            console.error(
                "❌ Error al revocar poder:",
                errorTexto
            );

            throw new Error(
                `Dataverse respondió ${respuesta.status}`
            );
        }

        console.log(
            `🗑️ Poder ${id} revocado correctamente`
        );

        res.json({
            success: true,
            mensaje: "Poder revocado correctamente."
        });

    } catch (error) {

        console.error(
            "❌ Error al revocar poder:",
            error.message
        );

        res.status(500).json({
            success: false,
            mensaje: "No se pudo revocar el poder."
        });
    }
});


// ========================================
// AGREGAR PODER MANUALMENTE A UN TEAM
// ========================================

app.post("/api/poderes/manual", async (req, res) => {

    console.log("✨ PETICIÓN PARA AGREGAR PODER MANUAL");

    const {
        teamId,
        poder,
        ruleta
    } = req.body;


    // ========================================
    // VALIDAR DATOS
    // ========================================

    if (!teamId || !poder || !ruleta) {

        return res.status(400).json({
            success: false,
            mensaje: "Faltan datos para agregar el poder."
        });
    }


    const ruletasPermitidas = [
        "normal",
        "raro",
        "legendario"
    ];

    if (!ruletasPermitidas.includes(ruleta)) {

        return res.status(400).json({
            success: false,
            mensaje: "Ruleta no válida."
        });
    }


    try {

        const token = await credential.getToken(
            `${process.env.DATAVERSE_URL}/.default`
        );


        // ========================================
        // GUARDAR PODER
        // ========================================

        const respuesta = await fetch(
            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_poderesteams`,
            {
                method: "POST",

                headers: {
                    Authorization: `Bearer ${token.token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    // Indicamos que fue agregado por administrador
                    crca6_crca6_codigo: "ADMIN-MANUAL",

                    crca6_crca6_fechageneracion:
                        new Date().toISOString(),

                    crca6_crca6_poder:
                        poder,

                    crca6_crca6_ruleta:
                        ruleta,

                    crca6_crca6_teamid:
                        teamId

                })
            }
        );


        if (!respuesta.ok) {

            const errorTexto =
                await respuesta.text();

            console.error(
                "❌ Error al agregar poder manual:",
                errorTexto
            );

            throw new Error(
                `Dataverse respondió ${respuesta.status}`
            );
        }


        console.log(
            `✨ Poder ${poder} agregado manualmente al Team ${teamId}`
        );


        res.status(201).json({

            success: true,

            mensaje:
                "Poder agregado correctamente.",

            poder: poder,

            ruleta: ruleta,

            teamId: teamId

        });

    } catch (error) {

        console.error(
            "❌ Error al agregar poder manual:",
            error.message
        );

        res.status(500).json({

            success: false,

            mensaje:
                "No se pudo agregar el poder."

        });
    }

});

// ========================================
// HACER GIRO DE RULETA
// ========================================

app.post("/api/ruleta/girar", async (req, res) => {

    console.log("🎰 PETICIÓN PARA HACER GIRO");

    const { teamId, ruleta } = req.body;

    if (!teamId || !ruleta) {
        return res.status(400).json({
            success: false,
            mensaje: "Faltan datos para realizar el giro"
        });
    }

    const ruletasPermitidas = [
        "normal",
        "raro",
        "legendario"
    ];

    if (!ruletasPermitidas.includes(ruleta)) {
        return res.status(400).json({
            success: false,
            mensaje: "Ruleta no válida"
        });
    }

    try {

        const token = await credential.getToken(
            `${process.env.DATAVERSE_URL}/.default`
        );

        // Buscar códigos del Team que todavía tengan giros
     const filtro =
    `crca6_teamid eq '${teamId.replace(/'/g, "''")}' and ` +
    `crca6_ruleta eq '${ruleta}'`;

        const respuesta = await fetch(
            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_codigoses` +
            `?$select=crca6_codigosid,crca6_codigo,crca6_girostotales,crca6_girosusados` +
            `&$filter=${encodeURIComponent(filtro)}` +
            `&$orderby=crca6_fechacreacion asc`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token.token}`,
                    Accept:
                        "application/json"
                }
            }
        );

        if (!respuesta.ok) {

            const errorTexto =
                await respuesta.text();

            console.error(
                "❌ Error al buscar códigos:",
                errorTexto
            );

            throw new Error(
                `Dataverse respondió ${respuesta.status}`
            );
        }

        const datos =
            await respuesta.json();

        if (datos.value.length === 0) {

            return res.status(400).json({
                success: false,
                mensaje:
                    "No tienes giros disponibles para esta ruleta."
            });
        }

const codigo = datos.value.find(codigo => {
    const girosTotales =
        Number(codigo.crca6_girostotales || 0);

    const girosUsados =
        Number(codigo.crca6_girosusados || 0);

    return (girosTotales - girosUsados) > 0;
});

if (!codigo) {
    return res.status(400).json({
        success: false,
        mensaje:
            "No tienes giros disponibles para esta ruleta."
    });
}

const girosTotales =
    Number(codigo.crca6_girostotales || 0);

const girosUsados =
    Number(codigo.crca6_girosusados || 0);

const girosDisponibles =
    girosTotales - girosUsados;

        // ========================================
        // RESULTADO DE LA RULETA
        // ========================================
        //
        // POR AHORA ES UN RESULTADO DE PRUEBA.
        // Las probabilidades reales las pondremos
        // después en el backend.
        //

        const poderes = {

    // 🟢 PODERES NORMALES
    normal: [
        { nombre: "Double card", probabilidad: 3.7037037037 },
        { nombre: "Future vision", probabilidad: 3.7037037037 },
        { nombre: "Time machine", probabilidad: 3.7037037037 },
        { nombre: "The other side of the door", probabilidad: 3.7037037037 },
        { nombre: "Blank space", probabilidad: 3.7037037037 },
        { nombre: "Cruel summer", probabilidad: 3.7037037037 },
        { nombre: "Mine", probabilidad: 3.7037037037 },
        { nombre: "Midnights extension", probabilidad: 3.7037037037 },
        { nombre: "Bad blood", probabilidad: 3.7037037037 },
        { nombre: "New romantics", probabilidad: 3.7037037037 },
        { nombre: "Long live", probabilidad: 3.7037037037 },
        { nombre: "Shield", probabilidad: 3.7037037037 },
        { nombre: "Copy garden", probabilidad: 3.7037037037 },
        { nombre: "Me!", probabilidad: 3.7037037037 },
        { nombre: "Nobody, no crime", probabilidad: 3.7037037037 },
        { nombre: "Mirrorball", probabilidad: 3.7037037037 },
        { nombre: "Look what you made me do", probabilidad: 3.7037037037 },
        { nombre: "Bejeweled", probabilidad: 3.7037037037 },
        { nombre: "Chisme", probabilidad: 3.7037037037 },
        { nombre: "The prophecy", probabilidad: 3.7037037037 },
        { nombre: "thanK you aIMee", probabilidad: 3.7037037037 },
        { nombre: "Vigilante shit", probabilidad: 3.7037037037 },
        { nombre: "So it goes...", probabilidad: 3.7037037037 },
        { nombre: "Alianza", probabilidad: 3.7037037037 },
        { nombre: "The joker", probabilidad: 3.7037037037 },
        { nombre: "Anti-hero", probabilidad: 3.7037037037 },
        { nombre: "It's nice to have a friend", probabilidad: 3.7037037037 }
    ],

    // 🟣 PODERES RAROS
    raro: [
        { nombre: "Wildest dreams", probabilidad: 3 },
        { nombre: "Double or nothing", probabilidad: 11.7142857143 },
        { nombre: "High infidelity", probabilidad: 5 },
        { nombre: "You belong with me", probabilidad: 11.7142857143 },
        { nombre: "¡A tiempo!", probabilidad: 11.7142857143 },
        { nombre: "Enchanted", probabilidad: 11.7142857143 },
        { nombre: "Better than revenge", probabilidad: 5 },
        { nombre: "The great war", probabilidad: 11.7142857143 },
        { nombre: "The story about us", probabilidad: 11.7142857143 },
        { nombre: "I did something bad", probabilidad: 11.7142857143 },
        { nombre: "A dormir", probabilidad: 5 }
    ],

    // 🟡 PODERES LEGENDARIOS
    legendario: [
        { nombre: "Good bye", probabilidad: 18 },
        { nombre: "Everybody agrees", probabilidad: 7 },
        { nombre: "Karma", probabilidad: 18 },
        { nombre: "Shake it off", probabilidad: 18 },
        { nombre: "Destierro", probabilidad: 18 },
        { nombre: "Together now", probabilidad: 18 },
        { nombre: "Fortnight leader", probabilidad: 3 }
    ]
};

const listaPoderes = poderes[ruleta];

const numeroAleatorio = Math.random() * 100;

let acumulado = 0;
let poderSeleccionado = null;

for (const poder of listaPoderes) {
    acumulado += poder.probabilidad;

    if (numeroAleatorio < acumulado) {
        poderSeleccionado = poder;
        break;
    }
}

const resultado = poderSeleccionado.nombre;

// ========================================
// GUARDAR PODER GANADO POR EL TEAM
// ========================================

const guardarPoder = await fetch(
    `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_poderesteams`,
    {
        method: "POST",

        headers: {
            Authorization: `Bearer ${token.token}`,
            Accept: "application/json",
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            crca6_crca6_codigo:
                codigo.crca6_codigo,

            crca6_crca6_fechageneracion:
                new Date().toISOString(),

            crca6_crca6_poder:
                resultado,

            crca6_crca6_ruleta:
                ruleta,

            crca6_crca6_teamid:
                teamId
        })
    }
);

if (!guardarPoder.ok) {

    const errorTexto =
        await guardarPoder.text();

    console.error(
        "❌ Error al guardar poder:",
        errorTexto
    );

    throw new Error(
        `No se pudo guardar el poder en Dataverse. ` +
        `Dataverse respondió ${guardarPoder.status}`
    );
}

console.log(
    `💎 Poder guardado: ${resultado} → Team ${teamId}`
);

        // ========================================
        // ACTUALIZAR GIRO USADO
        // ========================================

        const nuevosGirosUsados =
            girosUsados + 1;

        const nuevoEstado =
            nuevosGirosUsados >= girosTotales
                ? "Agotado"
                : "Canjeado";

        const actualizar = await fetch(
            `${process.env.DATAVERSE_URL}/api/data/v9.2/crca6_codigoses(${codigo.crca6_codigosid})`,
            {
                method: "PATCH",

                headers: {
                    Authorization:
                        `Bearer ${token.token}`,
                    Accept:
                        "application/json",
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    crca6_girosusados:
                        nuevosGirosUsados,

                    crca6_estado:
                        nuevoEstado

                })
            }
        );

        if (!actualizar.ok) {

            const errorTexto =
                await actualizar.text();

            console.error(
                "❌ Error al actualizar giro:",
                errorTexto
            );

            throw new Error(
                `Dataverse respondió ${actualizar.status}`
            );
        }

        console.log(
            `✅ Giro realizado por Team ${teamId}`
        );

        console.log(
            `🎁 Resultado: ${resultado}`
        );

        res.json({

            success: true,

            resultado: resultado,

            girosDisponibles:
                girosDisponibles - 1,

            codigo:
                codigo.crca6_codigo,

            ruleta:
                ruleta

        });

    } catch (error) {

        console.error(
            "❌ Error al realizar giro:"
        );

        console.error(
            error.message
        );

        res.status(500).json({

            success: false,

            mensaje:
                "No se pudo realizar el giro"

        });

    }

});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor funcionando en el puerto ${PORT}`);
});