# Uso de GitHub Copilot en Anzuelo

Este documento cumple dos funciones:

1. **Guía:** referencia para adaptar el workshop [GitHub Copilot app tour](https://github-samples.github.io/copilot-workshops/first-steps/copilot-app/) a Anzuelo.
2. **Evidencia:** bitácora de interacciones reales con Copilot, qué propuso y qué se decidió.

Plan utilizado: **GitHub Copilot Free**.

> Regla de esta bitácora: solo se registran interacciones reales. Cuando existe un artefacto versionado, se enlaza el commit, issue o PR; no se usan capturas como evidencia.

---

## 1. Ajustes por usar Copilot Free

Copilot Free no incluye code review automático. Por eso, los PR [#4](https://github.com/cerbero506/anzuelo/pull/4), [#5](https://github.com/cerbero506/anzuelo/pull/5) y [#6](https://github.com/cerbero506/anzuelo/pull/6) recibieron un comentario de revisión manual antes del merge.

## 2. Paso a paso adaptado

Los prompts de esta sección son ejemplos para adaptar el workshop, no evidencia de interacciones adicionales. La bitácora de hechos registrados está en la sección 3.

### Lección 0. Chat rápido (explicación)
Ejemplo para **New > Chat**:
```
Explica con ejemplos qué es el typosquatting, el uso de punycode y el truco de la "@" en una URL para ocultar el destino real en correos de phishing.
```
El tema de la explicación fue typosquatting, punycode y el uso de `@`; se aceptó como referencia.

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
`/init` generó `.github/copilot-instructions.md`; sus reglas se redujeron a seis criterios verificables y se modificaron:
- Sitio estático en HTML, CSS y JavaScript, sin dependencias, CDN ni peticiones de red; se respeta `connect-src 'none'`.
- Insertar texto del usuario solo con `textContent`, nunca `innerHTML`.
- Mantener la interfaz y los mensajes en español, con un tono claro para personas no técnicas.
- Separar pesos y listas en `criteria.js`, lógica pura en `analyzer.js`, historial en `storage.js` y DOM en `app.js`.
- Todo cambio en `analyzer.js` lleva pruebas y debe dejar `npm test` en verde.
- Las pruebas en navegador se hacen con el navegador integrado; no se configuran Playwright ni otras herramientas externas.

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

| # | Tipo de apoyo | Interacción y resultado | Decisión | Evidencia |
|---|---|---|---|---|
| 1 | Explicación | Chat sobre typosquatting, punycode y `@`; explicación de cómo `analyzer.js` calcula el puntaje. | Aceptada como referencia. | — |
| 2 | Diseño y pruebas | Mejora visual de la tarjeta de resultado y nuevas pruebas de casos borde (commit indicado: `5d2d2f9`). | — | No se pudo verificar el hash en el historial local ni en GitHub. |
| 3 | Instrucciones | `/init` generó las instrucciones del repositorio, reducidas a seis reglas verificables. | Modificada. | [`.github/copilot-instructions.md`](.github/copilot-instructions.md) |
| 4 | Implementación | Issue [#1](https://github.com/cerbero506/anzuelo/issues/1), PR [#4](https://github.com/cerbero506/anzuelo/pull/4): exportación CSV con BOM UTF-8. | Modificada durante la revisión: se agregó protección contra inyección de fórmulas (`=`, `+`, `-`, `@`) y pruebas. | [PR #4](https://github.com/cerbero506/anzuelo/pull/4) |
| 5 | Planificación | Issue [#2](https://github.com/cerbero506/anzuelo/issues/2), PR [#5](https://github.com/cerbero506/anzuelo/pull/5), en Plan mode. | Plan modificado con cinco ajustes antes de aprobarlo: límite de 20 000 caracteres para evitar ReDoS, normalización de tildes, pruebas negativas, `aria-live` y `textContent`, y limpieza y ejemplo. | [PR #5](https://github.com/cerbero506/anzuelo/pull/5) |
| 6 | Refactorización y documentación | PR [#6](https://github.com/cerbero506/anzuelo/pull/6): `renderResult` se dividió en siete funciones y se corrigió el JSDoc de la tolerancia de typosquatting. | Aceptada con observación: el JSDoc de `evaluate` quedó en una línea extensa. | [PR #6](https://github.com/cerbero506/anzuelo/pull/6) |
| 7 | Revisión | Revisión manual de cada PR antes del merge. | Revisión manual; Copilot Free no incluye code review. | [PR #4](https://github.com/cerbero506/anzuelo/pull/4), [#5](https://github.com/cerbero506/anzuelo/pull/5) y [#6](https://github.com/cerbero506/anzuelo/pull/6) |

### Sugerencias rechazadas o modificadas

| Sugerencia de Copilot | Qué se hizo | Por qué |
|---|---|---|
| Configurar Playwright MCP. | Rechazada. | El navegador integrado basta y no se agregan herramientas externas. |
| Exportar CSV sin protección contra fórmulas. | Modificada: se protegieron los prefijos `=`, `+`, `-` y `@` y se agregaron pruebas. | Evitar inyección de fórmulas en los datos exportados. |
| Plan del issue #2. | Modificado con cinco ajustes antes de aprobar: límite de 20 000 caracteres para evitar ReDoS, normalización de tildes, pruebas negativas, `aria-live` y `textContent`, y limpieza y ejemplo. | Incorporar los requisitos de seguridad, accesibilidad, pruebas y claridad del plan. |
