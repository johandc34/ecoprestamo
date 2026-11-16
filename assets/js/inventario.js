import { categorias, disponible, eliminarEquipo, guardarEquipo, textoNormalizado } from "./modelo.js";
import { dialogo, escapar, opciones, tabla } from "./ui.js";

export function inventario(contenedor, datos, filtros) {
    const consulta = textoNormalizado(filtros.q || "");
    const filas = datos.equipos.filter(equipo => {
        const stock = disponible(datos, equipo);
        return textoNormalizado(equipo.nombre).includes(consulta)
            && (!filtros.categoria || filtros.categoria === equipo.categoria)
            && (!filtros.stock || filtros.stock === (stock > 0 ? "Disponible" : "Agotado"));
    }).map(equipo => {
        const stock = disponible(datos, equipo);
        return [
            '<div class="equipo"><img src="assets/images/equipos.jpg" alt="" width="35" height="35"><strong>' + escapar(equipo.nombre) + '</strong></div>',
            escapar(equipo.categoria), equipo.total, stock, equipo.total - stock,
            '<button class="texto" data-editar="' + escapar(equipo.id) + '">Editar</button> ' +
            '<button class="texto peligro" data-eliminar="' + escapar(equipo.id) + '">Eliminar</button>'
        ];
    });
    contenedor.innerHTML = tabla(["Equipo", "Categoría", "Total", "Disponibles", "Prestadas", "Acciones"],
        filas, "No hay equipos que coincidan con la consulta.");
}

export function accionesInventario(evento, datos, guardar) {
    const boton = evento.target.closest("button");
    if (!boton) return;
    const equipo = datos.equipos.find(fila => fila.id === (boton.dataset.editar || boton.dataset.eliminar));
    if (boton.id === "nuevo" || boton.dataset.editar && equipo) {
        dialogo(equipo ? "Editar equipo" : "Registrar equipo",
            '<label>Nombre<input name="nombre" required maxlength="80" value="' + escapar(equipo?.nombre) + '"></label>' +
            '<label>Categoría<select name="categoria" required>' + opciones(categorias.map(c => [c, c])) + '</select></label>' +
            '<label>Unidades totales<input name="total" type="number" min="0" step="1" required value="' +
            escapar(equipo?.total) + '"></label>',
            campos => guardar(datos => guardarEquipo(datos, { ...campos, id: equipo?.id }), "Equipo guardado."),
            "Guardar equipo");
        if (equipo) document.querySelector("#dialogo select").value = equipo.categoria;
    }
    if (boton.dataset.eliminar && equipo) {
        dialogo("Eliminar equipo", '<p>¿Quieres eliminar <strong>' + escapar(equipo.nombre) +
            '</strong> del inventario? Sus préstamos finalizados seguirán en el historial.</p>',
        () => guardar(datos => eliminarEquipo(datos, equipo.id), "Equipo eliminado."), "Eliminar equipo");
    }
}

