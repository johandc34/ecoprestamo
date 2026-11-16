import { categorias, disponible, estado, pendiente } from "./modelo.js";
import { barras, escapar, fechaVisible, insignia, tabla } from "./ui.js";
import { listaDevoluciones } from "./prestamos.js";

export function dibujarPanel(datos) {
    const unidades = datos.equipos.reduce((total, equipo) => total + equipo.total, 0);
    const libres = datos.equipos.reduce((total, equipo) => total + disponible(datos, equipo), 0);
    const vencidos = datos.prestamos.filter(p => estado(datos, p) === "Vencido");
    const abiertos = datos.prestamos.filter(p => pendiente(datos, p) > 0);
    const indicadores = [
        ["▧", "Equipos registrados", datos.equipos.length], ["▤", "Unidades totales", unidades],
        ["✓", "Unidades disponibles", libres], ["↗", "Unidades prestadas", unidades - libres],
        ["◷", "Préstamos activos", abiertos.length], ["!", "Préstamos vencidos", vencidos.length],
        ["↙", "Devoluciones (últimos 7 días)", devolucionesRecientes(datos)]
    ];
    document.querySelector("#indicadores").innerHTML = indicadores.map(([icono, nombre, valor]) =>
        '<article class="indicador"><span class="icono" aria-hidden="true">' + icono +
        '</span><strong>' + valor + '</strong><span>' + nombre + '</span></article>').join("");
    document.querySelector("#grafico").innerHTML = barras([["Disponibles", libres], ["Prestadas", unidades - libres]], "ud.", unidades);
    document.querySelector("#alertas").innerHTML = vencidos.length
        ? '<p><strong>' + vencidos.length + '</strong> ' + (vencidos.length === 1 ? "préstamo superó" : "préstamos superaron") +
            ' la fecha de devolución.</p><a href="devoluciones.html?estado=Vencido">Ver préstamos vencidos →</a>'
        : '<p class="vacio">No hay préstamos vencidos.</p>';
    document.querySelector("#movimientos").innerHTML = movimientos(datos);
    document.querySelector("#devoluciones-recientes").innerHTML = listaDevoluciones(datos, 5);
}

function devolucionesRecientes(datos) {
    const desde = new Date();
    desde.setDate(desde.getDate() - 6);
    desde.setHours(0, 0, 0, 0);
    return datos.devoluciones.filter(d => new Date(d.fecha + "T00:00:00") >= desde).length;
}

function movimientos(datos) {
    const filas = [
        ...datos.prestamos.map(p => [p.salida, "Préstamo", p, p.cantidad]),
        ...datos.devoluciones.map(d => [d.fecha, "Devolución", datos.prestamos.find(p => p.id === d.prestamoId), d.cantidad])
    ];
    filas.reverse().sort((a, b) => b[0].localeCompare(a[0]));
    return tabla(["Fecha", "Movimiento", "Persona", "Equipo", "Unidades", "Estado del préstamo"],
        filas.slice(0, 8).map(([fecha, tipo, p, cantidad]) =>
            [fechaVisible(fecha), tipo, escapar(p.persona), escapar(p.equipo), cantidad, insignia(estado(datos, p))]),
        "Todavía no hay movimientos.");
}

export function dibujarReportes(datos) {
    const equipos = new Map();
    for (const p of datos.prestamos) {
        const fila = equipos.get(p.equipoId) || { nombre: p.equipo, unidades: 0 };
        fila.unidades += p.cantidad;
        equipos.set(p.equipoId, fila);
    }
    const top = [...equipos.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 8);
    const porCategoria = categorias.map(nombre => [nombre, datos.prestamos
        .filter(p => p.categoria === nombre).reduce((total, p) => total + p.cantidad, 0)]);
    document.querySelector("#equipos").innerHTML = barras(top.map(e => [e.nombre, e.unidades]), "ud.");
    document.querySelector("#categorias").innerHTML = barras(porCategoria, "ud.");
}

export function generarCSV(datos, prestamos) {
    const encabezados = ["Persona", "Equipo", "Categoría", "Fecha de salida", "Fecha prevista", "Unidades", "Devueltas", "Pendientes", "Estado"];
    const filas = prestamos.map(p => [
        p.persona, p.equipo, p.categoria, p.salida, p.vence,
        p.cantidad, p.cantidad - pendiente(datos, p), pendiente(datos, p), estado(datos, p)
    ]);

    // Protege los textos que Excel podría interpretar como fórmulas.
    return "\uFEFF" + [encabezados, ...filas].map(fila => fila.map(valor => {
        const texto = String(valor);
        const seguro = /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(texto) ? "'" + texto : texto;
        return '"' + seguro.replaceAll('"', '""') + '"';
    }).join(";")).join("\r\n");
}

export function descargarCSV(datos, prestamos) {
    const url = URL.createObjectURL(new Blob([generarCSV(datos, prestamos)], { type: "text/csv;charset=utf-8" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "ecoprestamo-historial.csv";
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

