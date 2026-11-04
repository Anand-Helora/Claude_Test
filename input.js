/**
 * input.js — Gestion de la saisie (aucun lien avec l'affichage).
 *
 * L'état de la calculatrice est un simple objet. press(état, touche) renvoie
 * le nouvel état, sans rien modifier : facile à tester, et app.js n'a plus
 * qu'à afficher le résultat.
 *
 *   let s = initialState;
 *   s = press(s, "1"); s = press(s, "+"); s = press(s, "2");  // s.display === "3"
 *   s = press(s, "=");                                        // s.history === "1 + 2 ="
 */

import { evaluate, formatResult, CalcError } from "./calculator.js";

const BINARY_OPERATORS = ["+", "−", "×", "÷"];
const MAX_LENGTH = 60;

/**
 * @typedef {object} State
 * @property {string}  expression    ce qui est en cours de saisie, ex. "12+3×4"
 * @property {string}  history       calcul précédent affiché après "=", ex. "12 + 3 × 4 ="
 * @property {string}  display       grand affichage : aperçu du résultat ou message d'erreur
 * @property {boolean} isError       display contient un message d'erreur
 * @property {boolean} justEvaluated on vient d'appuyer sur "="
 */

/** @type {State} */
export const initialState = Object.freeze({
  expression: "",
  history: "",
  display: "0",
  isError: false,
  justEvaluated: false,
});

// Touches du clavier d'ordinateur → touches de la calculatrice
const KEYBOARD_MAP = {
  "*": "×", "x": "×", "X": "×",
  "/": "÷", ":": "÷",
  "-": "−",
  ".": ",",
  "Enter": "=", "=": "=",
  "Backspace": "backspace",
  "Escape": "clear", "Delete": "clear",
};

/**
 * Traduit une touche du clavier d'ordinateur.
 * @param {string} key  event.key, le caractère produit (ex. "4", "*", "Enter")
 * @param {string} [code] event.code, la touche physique (ex. "Numpad4")
 * @returns {string | null} la touche correspondante, ou null si elle ne sert pas
 */
export function keyFromKeyboard(key, code = "") {
  // Pavé numérique : reconnu par la touche physique, que Verr. Num soit actif ou non
  // (sinon "4" envoie "ArrowLeft", et "," / "." envoie "Delete")
  const numpadDigit = code.match(/^Numpad([0-9])$/);
  if (numpadDigit) return numpadDigit[1];
  if (code === "NumpadDecimal" || code === "NumpadComma") return ",";

  if (key in KEYBOARD_MAP) return KEYBOARD_MAP[key];
  if (/^[0-9+%(),]$/.test(key)) return key;
  return null;
}

/**
 * Ajoute des espaces autour des opérateurs pour la lisibilité : "12+3×4" → "12 + 3 × 4".
 * Un "−" placé en début d'expression, après "(" ou après un autre opérateur
 * est un signe (nombre négatif) : il reste collé au nombre.
 * @param {string} expression
 */
export function formatExpression(expression) {
  let out = "";
  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    const prev = expression[i - 1];
    const isSign = char === "−" && (i === 0 || prev === "(" || BINARY_OPERATORS.includes(prev));
    out += BINARY_OPERATORS.includes(char) && !isSign ? ` ${char} ` : char;
  }
  return out;
}

/** Aperçu du résultat, ou null si l'expression n'est pas (encore) calculable. */
function preview(expression) {
  try {
    return formatResult(evaluate(expression));
  } catch (err) {
    if (err instanceof CalcError) return null;
    throw err;
  }
}

/**
 * Écrit un nombre de façon à pouvoir le réutiliser dans un nouveau calcul.
 * @returns {string} ex. "−3,5", ou "" si le nombre est trop grand ou trop petit
 */
function toExpression(value) {
  let rounded = Number(value.toPrecision(12));
  if (Object.is(rounded, -0)) rounded = 0;
  const text = String(rounded);
  // Notation scientifique (1e+21) : la calculatrice ne sait pas la relire
  if (text.includes("e")) return "";
  return text.replace(".", ",").replace("-", "−");
}

/**
 * Applique une touche à l'état courant.
 * @param {State} state
 * @param {string} key un chiffre, "," "+" "−" "×" "÷" "%" "(" ")", ou "=" "backspace" "clear"
 * @returns {State} le nouvel état (state n'est jamais modifié)
 */
export function press(state, key) {
  if (key === "clear") return initialState;
  if (key === "=") return pressEquals(state);
  if (key === "backspace") return pressBackspace(state);
  return pressCharacter(state, key);
}

function pressEquals(state) {
  if (state.justEvaluated || state.expression === "") return state;

  try {
    const value = evaluate(state.expression);
    return {
      expression: toExpression(value),
      history: `${formatExpression(state.expression)} =`,
      display: formatResult(value),
      isError: false,
      justEvaluated: true,
    };
  } catch (err) {
    if (!(err instanceof CalcError)) throw err;
    return { ...state, display: err.message, isError: true };
  }
}

function pressBackspace(state) {
  if (state.justEvaluated) return initialState;

  const expression = state.expression.slice(0, -1);
  if (expression === "") return initialState;

  return {
    ...state,
    expression,
    display: preview(expression) ?? (state.isError ? "0" : state.display),
    isError: false,
  };
}

function pressCharacter(state, char) {
  let expression = state.expression;

  // Après "=" : un opérateur continue le calcul avec le résultat,
  // un chiffre ou une parenthèse en commence un nouveau.
  if (state.justEvaluated && !BINARY_OPERATORS.includes(char) && char !== "%") {
    expression = "";
  }

  const next = appendCharacter(expression, char);
  if (next === null || next.length > MAX_LENGTH) return state;

  return {
    expression: next,
    history: "",
    display: preview(next) ?? (state.isError || state.justEvaluated ? "0" : state.display),
    isError: false,
    justEvaluated: false,
  };
}

/**
 * Ajoute un caractère à l'expression en évitant les saisies absurdes.
 * @returns {string | null} la nouvelle expression, ou null si la touche est ignorée
 */
function appendCharacter(expression, char) {
  const last = expression.at(-1);
  const isDigit = /[0-9]/.test(char);

  if (BINARY_OPERATORS.includes(char)) {
    // "−" après "×" ou "÷" : nombre négatif, ex. "3×−2"
    if (char === "−" && (last === "×" || last === "÷")) return expression + char;

    // Deux opérateurs de suite : le nouveau remplace l'ancien ("5+×" → "5×")
    const base = expression.replace(/[+−×÷]+$/, "");

    // En début de calcul ou après "(", seul le signe "−" a un sens
    if (base === "" || base.endsWith("(")) {
      return char === "−" ? base + char : null;
    }
    return base + char;
  }

  if (char === ",") {
    const currentNumber = expression.match(/[0-9,]*$/)[0];
    if (currentNumber.includes(",")) return null;                 // une seule virgule par nombre
    if (currentNumber === "") return withImplicitTimes(expression, "0,");   // ",5" → "0,5"
    return expression + char;
  }

  if (char === "%") {
    return /[0-9)%]/.test(last ?? "") ? expression + char : null;
  }

  if (char === ")") {
    const open = (expression.match(/\(/g) || []).length;
    const closed = (expression.match(/\)/g) || []).length;
    // Pas de ")" sans "(" ouverte, ni juste après un opérateur ou "("
    return open > closed && /[0-9),%]/.test(last ?? "") ? expression + char : null;
  }

  if (isDigit) {
    // Pas de zéros inutiles en tête de nombre : "0" puis "7" donne "7", pas "07"
    const currentNumber = expression.match(/[0-9,]*$/)[0];
    if (currentNumber === "0") return char === "0" ? null : expression.slice(0, -1) + char;
    return withImplicitTimes(expression, char);
  }

  if (char === "(") return withImplicitTimes(expression, char);

  return null;
}

/** Après ")" ou "%", un nombre ou "(" sous-entend une multiplication : "(2+1)3" → "(2+1)×3". */
function withImplicitTimes(expression, text) {
  const last = expression.at(-1);
  return last === ")" || last === "%" ? `${expression}×${text}` : expression + text;
}
