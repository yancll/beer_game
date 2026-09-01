# beer_game

Juego web 2D para una sola persona operadora. Desde un panel central se añaden o actualizan participantes; cada participante controla una colonia de 1 a 5 abejas con un nivel de inteligencia de 0 a 5.

## Reglas implementadas

- Cada participante nuevo comienza con **1 abeja** e inteligencia **0**.
- Hay 10 emojis únicos disponibles para identificar las colonias, sin números visibles.
- El emoji aparece encima de todas las abejas del participante.
- En la lista lateral, los emojis asignados muestran el nombre; los libres no muestran ningún nombre.
- Todas las abejas de una persona comparten color, emoji y nivel de inteligencia.
- La cantidad y la inteligencia se pueden actualizar durante la carrera.
- La flor cambia de lugar cada 30–60 segundos, configurable por la persona operadora.
- Llegar a la flor no produce una victoria instantánea: la abeja debe permanecer allí durante **6 segundos** para llenar la barra de néctar.
- Al ganar, aparece un cartel con el emoji y el nombre, se elimina esa colonia y la carrera continúa automáticamente con las restantes.
- La carrera y los participantes se conservan en `localStorage` si se recarga el navegador.

## Inteligencia y evolución

La velocidad máxima es igual para todas las abejas. La inteligencia modifica la calidad de sus decisiones:

- precisión con la que estima dónde está la flor;
- frecuencia con la que actualiza su objetivo;
- exploración aleatoria;
- inercia al corregir la ruta.
- alcance y fuerza de la señal colectiva compartida con las abejas de su colonia.

Cuando una exploradora entra en una zona prometedora se convierte temporalmente en la abeja guía. Sus compañeras reciben su posición y combinan esa señal con su propia ruta; el aro pulsante permite identificar visualmente a la guía. La información solo se comparte dentro de la misma colonia.

Cada abeja tiene un pequeño genoma de navegación. Cuando la flor cambia de lugar, se puntúan proximidad, progreso de néctar y distancia desperdiciada. Las mejores estrategias se conservan y las restantes mutan hacia una nueva generación. Una colonia de una sola abeja también puede mutar gradualmente.

Con el máximo de 50 abejas expertas, la carrera está calibrada para producir una victoria aproximadamente entre 3 y 6 minutos.

## Tecnología

- Phaser 4.2.1
- React 19
- TypeScript
- Vite
- Vitest + cobertura V8
- Playwright
- ESLint
- GitHub Actions

No hay backend ni WebSocket porque toda la partida es administrada desde una sola pantalla.

## Desarrollo local

Requiere Node.js 24 o compatible.

```bash
npm install
npm run dev
```

Vite mostrará la dirección local, normalmente `http://localhost:5173`.

## Verificación

```bash
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

También se puede ejecutar la puerta local completa:

```bash
npm run check
```

El workflow `.github/workflows/ci.yml` repite lint, pruebas unitarias, cobertura, build y pruebas de navegador en cada push a `main` y en cada pull request.

## Estructura

```text
src/
├── components/       Panel, lista de emojis y cartel de victoria
├── domain/           Participantes, validación y algoritmo evolutivo
├── game/             Escena Phaser y puente React–Phaser
├── App.tsx            Estado principal controlado por React
└── styles.css         Diseño adaptable
```
