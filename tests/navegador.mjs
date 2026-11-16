import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";

const raiz = new URL("../", import.meta.url);
const perfil = await mkdtemp(join(tmpdir(), "eco-pruebas-"));
const tipos = { html: "text/html", js: "text/javascript", css: "text/css", svg: "image/svg+xml", jpg: "image/jpeg" };
const servidor = createServer(async (req, res) => {
    const ruta = new URL(req.url, "http://localhost").pathname.slice(1) || "index.html";
    try {
        const archivo = new URL(ruta, raiz);
        if (!archivo.href.startsWith(raiz.href)) return res.writeHead(404).end();
        const cuerpo = await readFile(archivo);
        res.writeHead(200, { "Content-Type": tipos[ruta.split(".").at(-1)] });
        res.end(cuerpo);
    } catch {
        res.writeHead(404).end();
    }
});
await new Promise(resolve => servidor.listen(0, "127.0.0.1", resolve));
const origen = "http://127.0.0.1:" + servidor.address().port;
const ejecutable = process.argv[2] || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const navegador = spawn(ejecutable, [
    "--headless=new", "--no-first-run", "--disable-gpu", "--remote-debugging-port=0",
    "--user-data-dir=" + perfil, "about:blank"
], { stdio: "ignore", windowsHide: true });

let socket;
try {
    let puerto;
    for (let i = 0; i < 60 && !puerto; i++) {
        try { puerto = (await readFile(join(perfil, "DevToolsActivePort"), "utf8")).split(/\r?\n/)[0]; }
        catch { await esperar(200); }
    }
    assert(puerto, "Edge no abrió el puerto de depuración");
    const pestanas = await (await fetch("http://127.0.0.1:" + puerto + "/json/list")).json();
    socket = new WebSocket(pestanas.find(t => t.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        socket.addEventListener("open", resolve, { once: true });
        socket.addEventListener("error", reject, { once: true });
    });

    const errores = [];
    const mensajes = new Map();
    let secuencia = 0;
    socket.addEventListener("message", evento => {
        const respuesta = JSON.parse(evento.data);
        if (respuesta.method === "Runtime.exceptionThrown") errores.push(respuesta.params.exceptionDetails.text);
        if (!mensajes.has(respuesta.id)) return;
        const { resolve, reject } = mensajes.get(respuesta.id);
        mensajes.delete(respuesta.id);
        if (respuesta.error) reject(new Error(respuesta.error.message));
        else resolve(respuesta.result);
    });

    function cdp(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++secuencia;
            mensajes.set(id, { resolve, reject });
            socket.send(JSON.stringify({ id, method, params }));
        });
    }

    async function ejecutar(expression) {
        const respuesta = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
        if (respuesta.exceptionDetails) throw new Error(respuesta.exceptionDetails.exception?.description);
        return respuesta.result.value;
    }

    async function hasta(expression) {
        for (let i = 0; i < 50; i++) {
            if (await ejecutar(expression)) return;
            await esperar(80);
        }
        throw new Error("No se cumplió la condición: " + expression);
    }

    async function abrir(ruta) {
        await cdp("Page.navigate", { url: origen + "/" + ruta });
        await hasta("location.href === " + JSON.stringify(origen + "/" + ruta) + " && document.readyState === 'complete'");
    }

    const click = selector => ejecutar("document.querySelector(" + JSON.stringify(selector) + ").click()");
    const llenar = (selector, valor) => ejecutar(
        "(() => { const campo = document.querySelector(" + JSON.stringify(selector) + "); campo.value = " +
        JSON.stringify(valor) + "; campo.dispatchEvent(new Event('input', { bubbles: true })); })()"
    );
    const campo = (nombre, valor) => llenar("#dialogo [name=" + nombre + "]", valor);
    const enviar = () => click("#dialogo [type=submit]");
    const cerrado = () => hasta("!document.querySelector('dialog').open");
    const alerta = texto => hasta("document.querySelector('dialog .error').textContent.includes(" + JSON.stringify(texto) + ")");
    const contiene = (selector, texto) => hasta("document.querySelector(" + JSON.stringify(selector) +
        ").textContent.includes(" + JSON.stringify(texto) + ")");

    await cdp("Runtime.enable");
    await abrir("index.html");
    await hasta("document.querySelector('.portada img').naturalWidth > 0 && getComputedStyle(document.querySelector('.portada')).display === 'grid'");
    await click(".acciones-portada .boton");
    await hasta("location.pathname === '/dashboard.html' && document.querySelectorAll('.indicador').length === 7");
    await click(".lateral a[href='inventario.html']");
    await contiene("#resultados", "No hay equipos");

    await click("#nuevo");
    await campo("nombre", "Cámara de prueba");
    for (const cantidad of ["-1", "1.5"]) {
        await campo("total", cantidad);
        assert.equal(await ejecutar("document.querySelector('#dialogo form').checkValidity()"), false);
    }
    await campo("total", "4");
    await enviar();
    await cerrado();
    await contiene("#resultados", "Cámara de prueba");

    await click("#nuevo");
    await campo("nombre", " camara de prueba ");
    await campo("total", "2");
    await enviar();
    await alerta("Ya existe");
    await click("#cancelar");

    await click("[data-editar]");
    await campo("total", "5");
    await enviar();
    await cerrado();
    await contiene("#resultados", "5");
    await llenar("#filtros [name=categoria]", "Herramientas");
    await contiene("#resultados", "No hay equipos");
    await abrir("inventario.html");
    await contiene("#resultados", "Cámara de prueba");
    console.log("OK inicio, carga de imagen y CSS, navegación, creación, duplicados, edición, filtro y persistencia");

    await abrir("prestamos.html");
    await click("#nuevo-prestamo");
    const equipo = await ejecutar("document.querySelector('#dialogo select').options[1].value");
    await campo("equipoId", equipo);
    await campo("persona", "Andrea Pérez");
    await campo("cantidad", "6");
    await enviar();
    await alerta("supera");
    await campo("cantidad", "5");
    await campo("salida", "2020-01-01");
    await campo("vence", "2020-01-02");
    await enviar();
    await cerrado();
    await contiene("#resultados", "Vencido");

    await abrir("inventario.html");
    await llenar("#filtros [name=stock]", "Agotado");
    await contiene("#resultados", "Cámara de prueba");
    await click("[data-editar]");
    for (const cantidad of ["-1", "1.5"]) {
        await campo("total", cantidad);
        assert.equal(await ejecutar("document.querySelector('#dialogo form').checkValidity()"), false);
    }
    await campo("total", "4");
    await enviar();
    await alerta("más unidades prestadas");
    await click("#cancelar");
    await click("[data-eliminar]");
    await enviar();
    await alerta("unidades pendientes");
    await click("#cancelar");
    console.log("OK disponibilidad, préstamo vencido, filtro de agotados y bloqueo de edición y borrado");

    await abrir("devoluciones.html?estado=Vencido");
    await click("[data-devolver]");
    await campo("cantidad", "2");
    await enviar();
    await cerrado();
    await contiene("#registro", "Andrea Pérez");
    await hasta("document.querySelector('#resultados tbody tr td:nth-child(5)').textContent === '3'");
    await abrir("inventario.html");
    await hasta("document.querySelector('#resultados tbody tr td:nth-child(4)').textContent === '2'");
    await abrir("devoluciones.html");
    await click("[data-devolver]");
    await enviar();
    await cerrado();
    await contiene("#resultados", "No hay préstamos");

    await abrir("inventario.html");
    await click("[data-eliminar]");
    await enviar();
    await cerrado();
    await contiene("#resultados", "No hay equipos");

    await abrir("historial.html");
    await llenar("#filtros [name=q]", "perez");
    await llenar("#filtros [name=estado]", "Devuelto");
    await contiene("#resultados", "Cámara de prueba");
    await llenar("#filtros [name=desde]", "2020-01-02");
    await contiene("#resultados", "No hay préstamos");
    await llenar("#filtros [name=desde]", "2020-01-01");
    await ejecutar("window.archivoCSV = null; URL.createObjectURL = blob => { window.archivoCSV = blob; return 'blob:prueba'; }; HTMLAnchorElement.prototype.click = function () { window.nombreCSV = this.download; };");
    await click("#exportar");
    const archivo = await ejecutar("archivoCSV.text()");
    assert.match(archivo, /"Andrea Pérez";"Cámara de prueba".*"Devuelto"/);
    assert.equal(await ejecutar("nombreCSV"), "ecoprestamo-historial.csv");
    assert.deepEqual(await ejecutar("archivoCSV.arrayBuffer().then(b => Array.from(new Uint8Array(b).slice(0, 3)))"), [239, 187, 191]);
    console.log("OK devolución parcial y total, inventario liberado, historial tras borrado, filtros y contenido del CSV");

    await abrir("reportes.html");
    await contiene("#equipos", "Cámara de prueba");
    await contiene("#categorias", "5 ud.");
    await abrir("dashboard.html");
    await contiene("#movimientos", "Andrea Pérez");
    await abrir("ayuda.html");
    await click("#demo");
    await contiene("#aviso", "sistema está vacío");
    await ejecutar("localStorage.clear()");
    await abrir("ayuda.html?prueba=1");
    await click("#demo");
    await contiene("#aviso", "Datos demostrativos cargados");
    await abrir("dashboard.html");
    await contiene("#alertas", "préstamo superó");
    await contiene("#movimientos", "Ana Torres");

    for (const width of [390, 768, 1440]) {
        await cdp("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
        for (const ruta of ["index.html", "dashboard.html", "inventario.html", "prestamos.html", "devoluciones.html", "historial.html", "reportes.html", "ayuda.html"]) {
            await abrir(ruta);
            assert.equal(await ejecutar("document.documentElement.scrollWidth <= innerWidth"), true, ruta + " a " + width);
            assert.equal(await ejecutar("[...document.images].every(img => img.complete && img.naturalWidth > 0)"), true, ruta);
        }
    }
    if (process.env.ECO_CAPTURAS) {
        for (const [ruta, nombre] of [["index.html", "inicio"], ["dashboard.html", "panel"]]) {
            await abrir(ruta);
            const captura = await cdp("Page.captureScreenshot", { format: "png" });
            await writeFile(join(process.env.ECO_CAPTURAS, nombre + ".png"), Buffer.from(captura.data, "base64"));
        }
    }

    await ejecutar("localStorage.setItem('ecoprestamo.v1', JSON.stringify({ equipos: [], prestamos: [], devoluciones: [{ id: 'huérfana' }] }))");
    await abrir("dashboard.html?invalido=1");
    await contiene("#aviso", "No se pudieron leer los datos locales");
    assert.deepEqual(errores, []);
    console.log("OK estadísticas, alertas, demostración voluntaria y ocho páginas a 390, 768 y 1440 px; sin excepciones JavaScript");
} finally {
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ id: -1, method: "Browser.close" }));
        await Promise.race([
            new Promise(resolve => socket.addEventListener("close", resolve, { once: true })),
            esperar(1200)
        ]);
    }
    navegador.kill();
    servidor.closeAllConnections();
    servidor.close();
    await esperar(400);
    await rm(perfil, { recursive: true, force: true, maxRetries: 2 }).catch(() => {});
}



