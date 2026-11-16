import { disponible, estado, fechaLocal, pendiente, registrarDevolucion, registrarPrestamo, textoNormalizado } from "./modelo.js";
import { dialogo, escapar, fechaVisible, insignia, opciones, tabla } from "./ui.js";

export function filtrarPrestamos(datos, filtros, activos = false) {
    const consulta = textoNormalizado(filtros.q || "");
    return datos.prestamos.filter(p => (
        (!activos || pendiente(datos, p) > 0)
        && (!filtros.estado || estado(datos, p) === filtros.estado)
        && (!filtros.desde || p.salida >= filtros.desde)
        && (!filtros.hasta || p.salida <= filtros.hasta)
        && [p.persona, p.equipo].some(valor => textoNormalizado(valor).includes(consulta))
    )).reverse();
}

export function listaPrestamos(datos, prestamos, devuelve = false) {
    const columnas = ["Persona / Equipo", "Salida", "Vencimiento", "Unidades", "Pendientes", "Estado"];
    if (devuelve) columnas.push("Acción");
    return tabla(columnas, prestamos.map(p => {
        const fila = [
            '<strong>' + escapar(p.persona) + '</strong><small>' + escapar(p.equipo) + '</small>',
            fechaVisible(p.salida), fechaVisible(p.vence), p.cantidad, pendiente(datos, p),
            insignia(estado(datos, p))
        ];
        if (devuelve) fila.push('<button class="texto" data-devolver="' + escapar(p.id) + '">Devolver</button>');
        return fila;
    }), "No hay préstamos que coincidan con la consulta.");
}

export function listaDevoluciones(datos, limite = Infinity) {
    return tabla(["Fecha", "Persona", "Equipo", "Unidades"], datos.devoluciones.slice().reverse()
        .slice(0, limite).map(fila => {
            const prestamo = datos.prestamos.find(p => p.id === fila.prestamoId);
            return [fechaVisible(fila.fecha), escapar(prestamo.persona), escapar(prestamo.equipo), fila.cantidad];
        }), "Todavía no hay devoluciones registradas.");
}

export function abrirPrestamo(datos, guardar) {
    const equipos = datos.equipos.filter(equipo => disponible(datos, equipo) > 0);
    if (!equipos.length) throw new Error("Agrega equipos con unidades disponibles en Inventario.");
    dialogo("Registrar préstamo",
        '<label>Persona<input name="persona" required maxlength="100" autocomplete="off"></label>' +
        '<label>Equipo<select name="equipoId" required><option value="">Selecciona un equipo</option>' +
        opciones(equipos.map(equipo => [equipo.id, equipo.nombre + " · " + disponible(datos, equipo) + " disponibles"])) +
        '</select></label><label>Unidades solicitadas<input name="cantidad" type="number" min="1" step="1" value="1" required></label>' +
        '<div class="dos"><label>Fecha de salida<input name="salida" type="date" required max="' + fechaLocal() +
        '" value="' + fechaLocal() + '"></label><label>Fecha prevista de devolución<input name="vence" type="date" required value="' +
        fechaLocal(7) + '"></label></div>',
        campos => guardar(datos => registrarPrestamo(datos, campos), "Préstamo registrado."), "Registrar préstamo");
}

export function abrirDevolucion(datos, id, guardar) {
    const prestamo = datos.prestamos.find(fila => fila.id === id);
    if (!prestamo) return;
    const cantidad = pendiente(datos, prestamo);
    dialogo("Registrar devolución",
        '<p>' + escapar(prestamo.persona) + ' · ' + escapar(prestamo.equipo) + '</p>' +
        '<label>Unidades devueltas (' + cantidad + ' pendientes)<input name="cantidad" type="number" min="1" max="' +
        cantidad + '" value="' + cantidad + '" step="1" required></label>',
        campos => guardar(datos => registrarDevolucion(datos, { ...campos, prestamoId: id }), "Devolución registrada."),
        "Confirmar devolución");
}
