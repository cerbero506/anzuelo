# Uso de GitHub Copilot en Anzuelo

Este documento cumple dos funciones:

1. **Guía:** cómo se siguió el workshop [GitHub Copilot app tour](https://github-samples.github.io/copilot-workshops/first-steps/copilot-app/) adaptado a Anzuelo, con los prompts usados.
2. **Evidencia:** bitácora de cada interacción con Copilot, qué propuso y qué se decidió.

Plan utilizado: **GitHub Copilot Free**.

> Regla de esta bitácora: solo se registran interacciones que realmente ocurrieron, con su captura, commit, issue o PR como respaldo. Las filas sin evidencia se eliminan antes de entregar.

---

## 1. Ajustes por usar Copilot Free

| Lección del workshop | Estado | Motivo |
|---|---|---|
| 0 a 4, 6 y 7 | Realizadas, adaptadas a Anzuelo | Disponibles en Free |
| 5. Publicar el repositorio | **Sin Copilot** | El repositorio y su primer commit se crearon fuera de Copilot, con otro asistente de IA. En esta lección solo se clona y se vincula en la app de Copilot. |
| 8. Revisión de PR | **Parcial** | Copilot Free no incluye Copilot code review en pull requests. Se hicieron los pasos 1-4 (crear el PR) y la revisión del diff fue manual, como indica el propio workshop. |
| 9. Automatizaciones | Omitida si no está disponible | No es necesaria para la solución |
| 10. Sesión remota | Omitida | Opcional en el workshop |
| 11. Canvas | Omitida si no está disponible | No es necesaria para la solución |
| 12. GitHub Pages | Realizada | Workflow `pages.yml` revisado y verificado |
| 13. Cierre | Realizada | Resumen en esta bitácora |

## 2. Paso a paso adaptado

El workshop parte de una carpeta vacía y construye un quiz. En Anzuelo se partió del código base de este repositorio y Copilot se usó para explicar, extender, corregir, refactorizar, documentar y desplegar.

### Lección 0. Chat rápido (explicación)
En **New > Chat**:
```
Explica con ejemplos qué es el typosquatting, el uso de punycode y el truco de la "@" en una URL para ocultar el destino real en correos de phishing.
```
Evidencia: captura de la respuesta. Úsala para validar que las reglas de `analyzer.js` cubren esos casos.

### Lección 1. Crear la sesión
Clona el repositorio y ábrelo en una sesión **Interactive**:
```bash
git clone https://github.com/cerbero506/anzuelo.git
```
Verifica en el menú del título que la ruta es la correcta y que el proyecto aparece vinculado a `cerbero506/anzuelo`.

### Lección 2. Entender y pulir
1. Explicación del código:
   ```
   Explica cómo analyzer.js calcula el puntaje y el nivel de riesgo. Incluye la regla de señal crítica y cómo se detecta un dominio que imita a una marca. No modifiques archivos.
   ```
2. Pulido visual con el selector de elementos: selecciona la tarjeta de **Resultado** y envía:
   ```
   Mejora la jerarquía visual del elemento seleccionado para que el nivel de riesgo se entienda en un segundo. Mantén la accesibilidad, los temas claro y oscuro y no agregues dependencias.
   ```

### Lección 3. Prueba de humo (corrección de errores)
```
Ejecuta una prueba de humo de Anzuelo en el navegador integrado: carga el ejemplo, marca y desmarca señales, prueba "Copiar reporte", "Descargar reporte", "Guardar en el historial", "Eliminar" y "Nueva evaluación", y navega solo con teclado. Ejecuta también npm test. Corrige cualquier fallo y reporta qué pasó y qué corregiste.
```
Prueba adicional de casos borde:
```
Agrega pruebas en tests/analyzer.test.js para enlaces en mayúsculas, con punto final en el dominio, con espacios al inicio y con IPv6. Si alguna falla, corrige analyzer.js sin romper las pruebas existentes.
```

### Lección 4. Instrucciones del proyecto
```
/init create simple rules for the project
```
Revisa el archivo generado y deja solo reglas reales de este proyecto, por ejemplo:
- Sitio estático: HTML, CSS y JS sin dependencias ni CDN.
- Insertar texto del usuario solo con `textContent`, nunca `innerHTML`.
- Interfaz en español, en tono claro para personas no técnicas.
- Pesos y listas en `criteria.js`; lógica pura en `analyzer.js`; DOM solo en `app.js`.
- Todo cambio en `analyzer.js` lleva pruebas y `npm test` en verde.

### Lección 5. Publicar el repositorio
El repositorio público ya existe (https://github.com/cerbero506/anzuelo), así que no se usa el prompt de publicación del workshop. Haz commit y push de los cambios de las lecciones 2 a 4 desde la sesión:
```
Crea un commit con los cambios de esta sesión con un mensaje descriptivo en español y súbelo a main.
```

### Lección 6. Backlog e implementación (generación de código)
```
Revisa Anzuelo y crea tres issues de GitHub, cada uno con título claro, descripción centrada en el usuario y criterios de aceptación: 1) exportar el historial a CSV, 2) detectar señales de phishing en el texto pegado del correo, 3) una idea tuya que se pueda completar en una sesión corta. No los implementes todavía.
```
Abre el issue de **exportar a CSV** > **New session** > **new worktree** > **Interactive**:
```
Implementa este issue por completo. Mantén el diseño sin dependencias y la separación criteria/analyzer/storage/app, prueba el comportamiento en el navegador integrado y resume los cambios al terminar.
```
Revisa el diff en **Changes** antes de aceptar.

### Lección 7. Plan mode
Abre el issue de **detectar señales en el texto pegado** > **New session** > modo **Plan**:
```
Planifica cómo implementar este issue. Investiga el código actual, lista los archivos que cambiarías, señala riesgos de falsos positivos, de accesibilidad y de privacidad (el texto no debe salir del navegador) y detente antes de editar.
```
Pide cambios al plan si falta algo, apruébalo y continúa en **Interactive**.

### Lección 8. Pull request con revisión manual
1. Revisa **Changes**, usa **Create PR** y crea el pull request.
2. Como Free no incluye Copilot code review, revisa el diff tú mismo. Opcionalmente, en la sesión:
   ```
   Revisa el diff de esta rama contra main y lista posibles errores, problemas de accesibilidad o usos de innerHTML. No hagas cambios; solo lista hallazgos con su archivo y línea.
   ```
3. Aplica o descarta cada hallazgo, deja un comentario en el PR con la decisión y haz merge cuando el workflow de pruebas esté en verde.

### Refactorización y documentación
```
Refactoriza renderResult en app.js en funciones más pequeñas con nombres claros, sin cambiar el comportamiento. Verifica en el navegador que el resultado se ve igual.
```
```
Revisa los comentarios JSDoc de analyzer.js y la sección "Estructura del proyecto" del README; corrige lo que no coincida con el código actual.
```

### Lección 12. Despliegue en GitHub Pages
Pages ya está activado (Source: GitHub Actions) y publicado en https://cerbero506.github.io/anzuelo/. Después de integrar los PR de las lecciones 6 a 8, usa Copilot para verificar el nuevo despliegue:
```
Revisa .github/workflows/pages.yml y confirma que ejecuta npm test antes de publicar y que solo publica index.html y assets. Sigue el despliegue en Actions hasta que termine con éxito y dame la URL final. Si no tienes permisos para algo, dime exactamente qué debo hacer yo.
```
Abre la URL en una ventana privada y verifica que la app carga.

---

## 3. Bitácora de evidencia

Completa una fila por interacción real. **Decisión** debe decir si aceptaste, modificaste o rechazaste la sugerencia y por qué.

| # | Lección | Tipo de apoyo | Prompt (resumen) | Qué propuso Copilot | Decisión y motivo | Evidencia |
|---|---|---|---|---|---|---|
| 1 | 0 | Explicación | Typosquatting, punycode, "@" | | | `docs/capturas/01-chat.png` |
| 2 | 2 | Explicación | Cómo se calcula el puntaje | | | |
| 3 | 2 | Diseño | Pulir tarjeta de resultado | | | |
| 4 | 3 | Corrección de errores | Prueba de humo + casos borde | | | commit |
| 5 | 4 | Instrucciones | `/init` | | | archivo de instrucciones |
| 6 | 6 | Implementación | Issue exportar CSV | | | issue #, PR # |
| 7 | 7 | Planificación | Issue texto pegado | | | captura del plan |
| 8 | 8 | Revisión | Revisión del diff | | | comentario en PR |
| 9 | - | Refactorización | `renderResult` | | | commit |
| 10 | - | Documentación | JSDoc + README | | | commit |
| 11 | 12 | Despliegue | Revisión de workflow y Pages | | | ejecución en Actions |

### Sugerencias rechazadas o modificadas
Registra aquí al menos dos casos concretos. Criterios usados para decidir:

- ¿Agrega dependencias, CDN o peticiones de red? Se rechaza: rompe la privacidad y el requisito de sitio estático.
- ¿Usa `innerHTML` con datos del usuario? Se modifica a `textContent`.
- ¿Cambia pesos o umbrales sin justificación? Se rechaza o se documenta el motivo.
- ¿Rompe `npm test` o la navegación por teclado? Se corrige antes de integrar.

| Sugerencia de Copilot | Qué se hizo | Por qué |
|---|---|---|
| | | |
| | | |
