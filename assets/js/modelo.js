export const categorias = ["Tecnología", "Audiovisual", "Herramientas", "Otros"];

export function textoNormalizado(texto) {
    return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function fechaLocal(desfase = 0) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + desfase);
    return [fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate()]
        .map(n => String(n).padStart(2, "0")).join("-");
}

function fechaValida(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const fecha = new Date(valor + "T00:00:00Z");
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function cantidadEntera(valor, minimo) {
    const cantidad = valor === "" || valor == null ? NaN : Number(valor);
    if (!Number.isSafeInteger(cantidad) || cantidad < minimo) {
        throw new Error("Ingresa una cantidad entera mayor o igual a " + minimo + ".");
    }
    return cantidad;
}

export function pendiente(datos, prestamo) {
    return datos.devoluciones.filter(fila => fila.prestamoId === prestamo.id)
        .reduce((total, fila) => total - fila.cantidad, prestamo.cantidad);
}

export function prestadas(datos, equipoId) {
    return datos.prestamos.filter(fila => fila.equipoId === equipoId)
        .reduce((total, fila) => total + pendiente(datos, fila), 0);
}

export function disponible(datos, equipo) {
    return equipo.total - prestadas(datos, equipo.id);
}

export function estado(datos, prestamo) {
    if (pendiente(datos, prestamo) === 0) return "Devuelto";
    return prestamo.vence < fechaLocal() ? "Vencido" : "Activo";
}

export function guardarEquipo(datos, campos) {
    const { id, categoria } = campos;
    const nombre = campos.nombre.trim();
    const total = cantidadEntera(campos.total, 0);
    if (!nombre || !categorias.includes(categoria)) throw new Error("Completa el nombre y la categoría.");
    if (datos.equipos.some(e => e.id !== id && textoNormalizado(e.nombre) === textoNormalizado(nombre))) {
        throw new Error("Ya existe un equipo con ese nombre.");
    }

    if (id) {
        const equipo = datos.equipos.find(fila => fila.id === id);
        if (!equipo) throw new Error("El equipo ya no existe.");
        if (total < prestadas(datos, id)) throw new Error("Hay más unidades prestadas que el total ingresado.");
        Object.assign(equipo, { nombre, categoria, total });
        return;
    }
    datos.equipos.push({ id: crypto.randomUUID(), nombre, categoria, total });
}

export function eliminarEquipo(datos, id) {
    if (prestadas(datos, id) > 0) throw new Error("El equipo tiene unidades pendientes de devolución.");
    datos.equipos = datos.equipos.filter(equipo => equipo.id !== id);
}

export function registrarPrestamo(datos, campos) {
    const equipo = datos.equipos.find(fila => fila.id === campos.equipoId);
    const persona = campos.persona.trim();
    const cantidad = cantidadEntera(campos.cantidad, 1);
    const { salida, vence } = campos;
    if (!persona || !equipo) throw new Error("Ingresa la persona y selecciona un equipo.");
    if (!fechaValida(salida) || !fechaValida(vence) || salida > fechaLocal() || vence < salida) {
        throw new Error("Revisa las fechas. La salida debe ser hoy o antes y el vencimiento debe ser igual o posterior.");
    }
    if (cantidad > disponible(datos, equipo)) throw new Error("La cantidad supera las unidades disponibles.");

    // Se conserva el nombre y la categoría que tenía el equipo al prestarse.
    datos.prestamos.push({
        id: crypto.randomUUID(), equipoId: equipo.id, equipo: equipo.nombre,
        categoria: equipo.categoria, persona, cantidad, salida, vence
    });
}

export function registrarDevolucion(datos, campos) {
    const prestamo = datos.prestamos.find(fila => fila.id === campos.prestamoId);
    const cantidad = cantidadEntera(campos.cantidad, 1);
    if (!prestamo || cantidad > pendiente(datos, prestamo)) {
        throw new Error("La cantidad supera las unidades pendientes de ese préstamo.");
    }
    datos.devoluciones.push({ id: crypto.randomUUID(), prestamoId: prestamo.id, cantidad, fecha: fechaLocal() });
}

export function cargarDemostracion(datos) {
    if (datos.equipos.length || datos.prestamos.length || datos.devoluciones.length) {
        throw new Error("La demostración se puede cargar cuando el sistema está vacío.");
    }
    guardarEquipo(datos, { nombre: "Portátil comunitario", categoria: "Tecnología", total: 8 });
    guardarEquipo(datos, { nombre: "Proyector portátil", categoria: "Audiovisual", total: 4 });
    guardarEquipo(datos, { nombre: "Taladro inalámbrico", categoria: "Herramientas", total: 6 });

    registrarPrestamo(datos, {
        equipoId: datos.equipos[0].id, persona: "Ana Torres",
        cantidad: 3, salida: fechaLocal(-6), vence: fechaLocal(-2)
    });
    registrarPrestamo(datos, {
        equipoId: datos.equipos[1].id, persona: "Luis Moreno",
        cantidad: 2, salida: fechaLocal(-1), vence: fechaLocal(4)
    });
    registrarDevolucion(datos, { prestamoId: datos.prestamos[0].id, cantidad: 1 });
}
