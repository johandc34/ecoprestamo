# Pruebas de EcoPréstamo

Ejecución del 15 de noviembre de 2026 en Windows. Se empleó Microsoft Edge sin interfaz gráfica, un perfil temporal y un servidor HTTP de prueba en loopback. La prueba utiliza JavaScript nativo de Node 24 y el protocolo de depuración de Edge. Puedes repetirla desde la raíz del proyecto universitario con:

```powershell
node EcoPrestamo/tests/navegador.mjs
```

## Resultados observados

| Área | Comprobación | Resultado |
| --- | --- | --- |
| Inicio y navegación | Se abrió la portada, se comprobó la carga de la fotografía y los estilos, se ingresó al panel y se navegó al inventario. | Aprobado |
| Inventario | Se creó Cámara de prueba con cuatro unidades, se rechazó un duplicado con espacios y sin tilde, se editó el total a cinco y se comprobaron los filtros de categoría y disponibilidad. El formulario rechazó cantidades negativas y fraccionarias. | Aprobado |
| Préstamos | Se rechazaron seis unidades con cinco disponibles. Se registraron cinco con salida y vencimiento pasados. El sistema mostró el préstamo como vencido y el equipo como agotado. | Aprobado |
| Integridad | Con cinco unidades prestadas se rechazaron la reducción del total a cuatro y la eliminación del equipo. | Aprobado |
| Devoluciones | La devolución de dos unidades dejó tres pendientes y liberó dos en inventario. La devolución final cerró el préstamo y permitió eliminar el equipo conservando su historial. | Aprobado |
| Historial y exportación | Se comprobaron los filtros por persona, estado y fecha de salida. La aplicación generó un CSV filtrado con el nombre esperado, UTF-8 con BOM, separador punto y coma y el préstamo marcado como devuelto. | Aprobado |
| Panel y reportes | Se observaron siete indicadores, movimientos, alertas de vencimiento y cinco unidades históricas prestadas en los gráficos. | Aprobado |
| Almacenamiento | El equipo persistió tras navegar y recargar. La carga de demostración fue voluntaria y se bloqueó en un sistema ocupado. Una devolución huérfana en el almacenamiento de prueba activó un aviso de lectura. | Aprobado |
| Adaptación y recursos | Se abrieron las ocho páginas en anchos de 390, 768 y 1440 px. El documento no presentó desbordamiento horizontal, las imágenes cargaron y Edge no reportó excepciones JavaScript. | Aprobado |

La prueba interceptó el archivo que produce la acción Exportar para inspeccionar su contenido. Queda pendiente abrir físicamente el CSV en Excel. Las medidas de pantalla se emularon en Edge y la publicación en GitHub Pages queda a cargo de quien entregue el proyecto.
