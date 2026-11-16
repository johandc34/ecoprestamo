const CLAVE = "ecoprestamo.v1";

function entero(valor, minimo) {
    return Number.isSafeInteger(valor) && valor >= minimo;
}

function fechaISO(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const fecha = new Date(valor + "T00:00:00Z");
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function registrosValidos(filas, validar) {
    return Array.isArray(filas) && filas.every(fila => fila && typeof fila.id === "string" && validar(fila))
        && new Set(filas.map(fila => fila.id)).size === filas.length;
}

function datosValidos(datos) {
    if (!datos || !registrosValidos(datos.equipos, e =>
        typeof e.nombre === "string" && typeof e.categoria === "string" && entero(e.total, 0))) return false;
    if (!registrosValidos(datos.prestamos, p => [p.equipoId, p.equipo, p.categoria, p.persona]
        .every(valor => typeof valor === "string") && fechaISO(p.salida) && fechaISO(p.vence)
        && p.salida <= p.vence && entero(p.cantidad, 1))) return false;

    const prestamos = new Map(datos.prestamos.map(p => [p.id, p]));
    if (!registrosValidos(datos.devoluciones, d => prestamos.has(d.prestamoId)
        && entero(d.cantidad, 1) && fechaISO(d.fecha) && d.fecha >= prestamos.get(d.prestamoId).salida)) return false;

    // Un equipo eliminado puede aparecer en el historial si su saldo quedó en cero.
    const disponibles = new Map(datos.equipos.map(e => [e.id, e.total]));
    const devueltas = new Map();
    for (const d of datos.devoluciones) {
        devueltas.set(d.prestamoId, (devueltas.get(d.prestamoId) || 0) + d.cantidad);
    }
    for (const p of datos.prestamos) {
        const saldo = p.cantidad - (devueltas.get(p.id) || 0);
        const stock = disponibles.get(p.equipoId) ?? 0;
        if (saldo < 0 || saldo > stock) return false;
        if (saldo > 0) disponibles.set(p.equipoId, stock - saldo);
    }
    return true;
}

export function leer() {
    const texto = localStorage.getItem(CLAVE);
    if (texto === null) return { equipos: [], prestamos: [], devoluciones: [] };

    const datos = JSON.parse(texto);
    if (!datosValidos(datos)) throw new Error("Los datos locales no tienen el formato esperado.");
    return datos;
}

// Cada operación guarda un solo documento para mantener juntas sus relaciones.
export async function actualizar(operacion) {
    const guardar = () => {
        const datos = leer();
        operacion(datos);
        if (!datosValidos(datos)) throw new Error("La operación produciría un registro inconsistente.");
        localStorage.setItem(CLAVE, JSON.stringify(datos));
        return datos;
    };

    // Coordina escrituras de pestañas del mismo origen cuando el navegador lo admite.
    return navigator.locks ? navigator.locks.request(CLAVE, guardar) : guardar();
}
