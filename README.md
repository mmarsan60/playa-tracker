# Ranking playero · Verano 2026

Web privada por enlace para registrar quién va más a la playa. Suma:

- 1 punto si vas por la mañana.
- 1 punto si vas por la tarde.
- Por defecto, la mañana cuenta hasta las 13:00.
- Rango inicial: 15 de junio de 2026 a 30 de septiembre de 2026.

## Qué incluye

- Ranking en tiempo real.
- Registro por día, jugador y franja: mañana/tarde.
- Ajustes de nombres, fechas y hora límite de mañana.
- Enlace privado por `?liga=...`.
- Exportación a CSV.
- Modo demo local si todavía no está configurado Firebase.

## Importante sobre privacidad

Esto es privacidad por enlace: quien tenga la URL de la liga puede ver y editar. Para algo realmente privado haría falta login con usuarios.

## Configuración rápida con Firebase + GitHub Pages

### 1. Crear Firebase

1. Entra en Firebase Console.
2. Crea un proyecto nuevo.
3. Crea una app web.
4. Copia el objeto `firebaseConfig`.
5. Abre `firebase-config.js` y sustituye los valores `PEGA_AQUI...`.

### 2. Activar Firestore

1. En Firebase, entra en **Firestore Database**.
2. Crea la base de datos en modo producción o prueba.
3. En la pestaña **Rules**, pega el contenido de `firestore.rules` y publica.

### 3. Subir a GitHub

1. Crea un repositorio nuevo, por ejemplo `ranking-playero`.
2. Sube estos archivos:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `firebase-config.js`
   - `firestore.rules`
   - `README.md`
3. En GitHub, ve a **Settings → Pages**.
4. En **Build and deployment**, selecciona la rama `main` y carpeta `/root`.
5. Abre el enlace que te da GitHub Pages.

La primera vez que abras la web, generará una liga con un código en la URL, por ejemplo:

```text
https://tuusuario.github.io/ranking-playero/?liga=abc123...
```

Ese es el enlace que debes compartir con tu amigo.

## Cambios fáciles

En `firebase-config.js` puedes cambiar los valores iniciales:

```js
startDate: "2026-06-15",
endDate: "2026-09-30",
morningCutoff: "13:00"
```

También puedes cambiar los nombres desde el botón **Ajustes** dentro de la web.
