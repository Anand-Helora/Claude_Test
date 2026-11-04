/**
 * app.js — Relie la page HTML à la logique (input.js).
 * Écoute les clics et le clavier, puis met l'écran à jour.
 */

import { initialState, press, keyFromKeyboard, formatExpression } from "./input.js";

const calculator = document.querySelector(".calculator");
const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");

// data-action du HTML → touche comprise par press()
const ACTIONS = { clear: "clear", backspace: "backspace", equals: "=" };

let state = initialState;

function render() {
  expressionEl.textContent = state.justEvaluated ? state.history : formatExpression(state.expression);
  resultEl.textContent = state.display;
  resultEl.classList.toggle("is-error", state.isError);

  // Réduit la taille du texte pour les longs nombres
  const length = state.display.length;
  resultEl.classList.toggle("is-long", !state.isError && length > 9 && length <= 13);
  resultEl.classList.toggle("is-very-long", !state.isError && length > 13);
}

function handle(key) {
  state = press(state, key);
  render();
}

/** Retrouve le bouton correspondant à une touche (pour l'animer). */
function buttonFor(key) {
  const action = Object.keys(ACTIONS).find((name) => ACTIONS[name] === key);
  const selector = action ? `[data-action="${action}"]` : `[data-value="${CSS.escape(key)}"]`;
  return calculator.querySelector(selector);
}

// Clics (souris ou écran tactile)
calculator.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  handle(button.dataset.value ?? ACTIONS[button.dataset.action]);
});

// Clavier d'ordinateur
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;   // laisse passer Ctrl+C, etc.

  const key = keyFromKeyboard(event.key, event.code);
  if (!key) return;

  // Évite qu'Entrée « clique » aussi sur le bouton qui a le focus
  event.preventDefault();
  handle(key);

  const button = buttonFor(key);
  if (button) {
    button.classList.add("is-pressed");
    setTimeout(() => button.classList.remove("is-pressed"), 120);
  }
});

render();
