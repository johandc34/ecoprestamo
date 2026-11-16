import { actualizar, leer } from "./storage.js";
import { cargarDemostracion, categorias } from "./modelo.js";
import { accionesInventario, inventario } from "./inventario.js";
import { abrirDevolucion, abrirPrestamo, filtrarPrestamos, listaDevoluciones, listaPrestamos } from "./prestamos.js";
import { descargarCSV, dibujarPanel, dibujarReportes } from "./reportes.js";
import { opciones } from "./ui.js";

const pagina = document.body.dataset.pagina;
const formulario = document.querySelector("#filtros");
const resultados = document.querySelector("#resultados");
const categoria = formulario?.elements.categoria;
const estadoInicial = new URLSearchParams(location.search).get("estado");
let datos;

if (categoria) categoria.insertAdjacentHTML("beforeend", opciones(categorias.map(c => [c, c])));
if (formulario?.elements.estado && estadoInicial === "Vencido") formulario.elements.estado.value = estadoInicial;

function filtros() {
    return formulario ? Object.fromEntries(new FormData(formulario)) : {};
}

function cargarVista() {
    if (pagina === "dashboard") dibujarPanel(datos);
    if (pagina === "inventario") inventario(resultados, datos, filtros());
    if (["prestamos", "devoluciones", "historial"].includes(pagina)) {
        const abiertos = pagina !== "historial";
        resultados.innerHTML = listaPrestamos(datos, filtrarPrestamos(datos, filtros(), abiertos), pagina === "devoluciones");
    }
    if (pagina === "devoluciones") document.querySelector("#registro").innerHTML = listaDevoluciones(datos);
    if (pagina === "reportes") dibujarReportes(datos);
}

let temporizador;
function avisar(mensaje, error = false) {
    const aviso = document.querySelector("#aviso");
    aviso.classList.toggle("error", error);
    aviso.textContent = mensaje;
    clearTimeout(temporizador);
    if (!error) temporizador = setTimeout(() => { aviso.textContent = ""; }, 4200);
}

function refrescar() {
    try {
        datos = leer();
        cargarVista();
    } catch (error) {
        datos = undefined;
        avisar("No se pudieron leer los datos locales. " + error.message, true);
    }
}

async function guardar(operacion, mensaje) {
    datos = await actualizar(operacion);
    cargarVista();
    avisar(mensaje);
}

formulario?.addEventListener("input", () => {
    if (datos) cargarVista();
});
formulario?.addEventListener("submit", evento => evento.preventDefault());
document.querySelector("#cancelar").addEventListener("click", () => document.querySelector("#dialogo").close());
document.addEventListener("click", async evento => {
    const boton = evento.target.closest("button");
    if (!boton || !datos) return;
    try {
        if (pagina === "inventario") accionesInventario(evento, datos, guardar);
        if (boton.id === "nuevo-prestamo") abrirPrestamo(datos, guardar);
        if (boton.dataset.devolver) abrirDevolucion(datos, boton.dataset.devolver, guardar);
        if (boton.id === "exportar") descargarCSV(datos, filtrarPrestamos(datos, filtros()));
        if (boton.id === "demo") await guardar(cargarDemostracion, "Datos demostrativos cargados.");
    } catch (error) {
        avisar(error.message, true);
    }
});
window.addEventListener("storage", refrescar);
window.addEventListener("pageshow", refrescar);
refrescar();
