# EcoPréstamo

EcoPréstamo administra un centro comunitario de préstamo de equipos. Está escrito en HTML5, CSS3 y JavaScript nativo. Cada navegador guarda el inventario, los préstamos y las devoluciones en localStorage.

## Ejecutar en Windows

Desde la raíz del proyecto universitario, abre PowerShell y ejecuta:

```powershell
Set-Location .\EcoPrestamo
python -m http.server 8000 --bind 127.0.0.1
```

Abre [EcoPréstamo en el puerto 8000](http://127.0.0.1:8000/). Puedes cargar registros de ejemplo desde **Ayuda → Cargar demostración** si el sistema está vacío. Pulsa **Ctrl+C** en PowerShell para detener el servidor de vista previa. Python sirve archivos durante el desarrollo. La aplicación realiza todas sus operaciones en el navegador.

## Organización

- `index.html` presenta el centro. Las siete páginas administrativas cubren panel, inventario, préstamos, devoluciones, historial, reportes y ayuda.
- `assets/css/` contiene la estructura común, los componentes y los estilos de inicio. Los ajustes responsive están junto a los estilos que adaptan.
- `assets/js/storage.js` lee y valida los datos y guarda cada operación como una sola actualización.
- `assets/js/modelo.js` contiene las reglas de inventario, préstamos, disponibilidad y devoluciones.
- `assets/js/inventario.js`, `prestamos.js` y `reportes.js` dibujan las vistas. `ui.js` comparte componentes y `app.js` conecta las vistas con el almacenamiento.
- `assets/images/` contiene el logotipo propio y la imagen generada de equipos comunitarios.
- `pruebas.md` registra la comprobación funcional. `tests/navegador.mjs` automatiza el recorrido con Edge y un perfil temporal.

## Publicar gratis en GitHub Pages

1. Crea un repositorio público en GitHub y sube el contenido de la carpeta `EcoPrestamo` a la rama `main`. El archivo `index.html` debe quedar en la raíz junto con la carpeta `assets`.
2. En **Settings → Pages → Build and deployment**, elige **Deploy from a branch**, selecciona `main` y `/ (root)`, y pulsa **Save**.
3. Cuando finalice el despliegue, abre la URL que muestra **Settings → Pages**. Verifica la portada y la navegación al panel.

La publicación usa rutas relativas y conserva los registros en el navegador. Cada origen, perfil y navegador tiene su propio almacenamiento. El sitio publicado empieza con su propio historial y GitHub Pages no sincroniza registros entre usuarios.

