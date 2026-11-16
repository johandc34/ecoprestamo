// Escapa los valores ingresados antes de insertarlos en plantillas HTML.
export function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[caracter]);
}

export function fechaVisible(fecha) {
    return fecha.split("-").reverse().join("/");
}

export function insignia(estado) {
    return '<span class="estado ' + estado.toLowerCase() + '">' + escapar(estado) + '</span>';
}

export function tabla(encabezados, filas, vacio) {
    if (!filas.length) return '<p class="vacio">' + escapar(vacio) + '</p>';
    return '<div class="tabla-scroll" tabindex="0" role="region" aria-label="Resultados">' +
        '<table><thead><tr>' + encabezados.map(titulo => '<th scope="col">' + titulo + '</th>').join("") +
        '</tr></thead><tbody>' + filas.map(fila => '<tr>' +
            fila.map(celda => '<td>' + celda + '</td>').join("") + '</tr>').join("") +
        '</tbody></table></div>';
}

export function barras(items, unidad, escala) {
    const maximo = escala ?? Math.max(1, ...items.map(item => item[1]));
    if (!items.some(item => item[1])) return '<p class="vacio">Todavía no hay datos para este gráfico.</p>';
    return '<ul class="barras">' + items.map(([nombre, valor]) =>
        '<li><div><span>' + escapar(nombre) + '</span><strong>' + valor + ' ' + unidad + '</strong></div>' +
        '<progress value="' + valor + '" max="' + maximo + '" aria-label="' + escapar(nombre) +
        '"></progress></li>').join("") + '</ul>';
}

export function opciones(items) {
    return items.map(([valor, etiqueta]) =>
        '<option value="' + escapar(valor) + '">' + escapar(etiqueta) + '</option>').join("");
}

export function dialogo(titulo, contenido, accion, etiqueta) {
    const ventana = document.querySelector("#dialogo");
    const formulario = ventana.querySelector("form");
    ventana.querySelector("h2").textContent = titulo;
    ventana.querySelector(".campos").innerHTML = contenido;
    formulario.querySelector("[type=submit]").textContent = etiqueta;
    const error = formulario.querySelector(".error");
    error.textContent = "";

    formulario.onsubmit = async evento => {
        evento.preventDefault();
        const boton = formulario.querySelector("[type=submit]");
        boton.disabled = true;
        error.textContent = "";
        try {
            await accion(Object.fromEntries(new FormData(formulario)));
            ventana.close();
        } catch (fallo) {
            error.textContent = fallo.message;
        } finally {
            boton.disabled = false;
        }
    };
    ventana.showModal();
}


