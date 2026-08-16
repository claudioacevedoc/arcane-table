# Arcane Table WEB v0.2 · Beta

Versión PWA para probar Arcane Table desde Android, iPhone, iPad y PC mediante un navegador moderno.

## Qué incluye

- Diseño optimizado para horizontal.
- 1 a 6 jugadores.
- Todos contra todos, Gigante de 2 cabezas y variante Gigante de 3 cabezas.
- Vida y veneno.
- D6, D20 y dado planar.
- Día/Noche opcional.
- Fichas siempre disponibles por jugador: Tesoro, Pista, Comida y criaturas.
- Grupos de criaturas separados por estado (+1/+1, -1/-1, atacantes, nuevas sin contadores).
- Planechase y Mazmorras opcionales.
- Sincronización del banco desde Scryfall.
- Se prioriza la impresión oficial española cuando Scryfall dispone de ella.
- Botón para guardar imágenes del banco para uso offline.
- PWA instalable y service worker para el shell de la app.
- Guardado automático de la partida en el dispositivo.
- Botón de compartir y diagnóstico de beta.

## Probar en un PC sin publicar

No abras `index.html` haciendo doble clic porque los Service Workers requieren HTTP/HTTPS.

Con Node instalado, dentro de esta carpeta:

```bash
npx serve .
```

Luego abre la dirección que indique el terminal.

Alternativa con Python:

```bash
python -m http.server 8080
```

Y abre `http://localhost:8080`.

## Publicarla para tus amigos

Es un sitio 100% estático: puedes subir esta carpeta a GitHub Pages, Cloudflare Pages, Netlify, Vercel u otro hosting HTTPS.

Una vez publicado, compartes una sola URL. Android puede ofrecer "Instalar aplicación". En iPhone se abre en Safari y se usa Compartir > Añadir a pantalla de inicio.

## Banco de cartas

`ACTUALIZAR BANCO` descarga metadatos de Planos/Fenómenos y Mazmorras. La aplicación consulta el catálogo completo en papel y además consulta las impresiones en español para fusionarlas por `oracle_id`.

`IMÁGENES OFFLINE` intenta guardar las imágenes disponibles en Cache Storage para que puedan verse posteriormente sin conexión.

Si no existe `printed_text` español para una carta concreta, la app muestra claramente que el texto mostrado es Oracle en inglés. No inventa traducciones de reglas.

## Datos locales

La configuración, partida y banco se guardan en el navegador mediante almacenamiento local. Borrar datos del navegador puede borrar la partida guardada.

## Versión

0.2.0-web-beta
