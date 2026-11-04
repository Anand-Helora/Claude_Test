/**
 * tests.js — Tests de la logique de calcul.
 *
 * Deux façons de les lancer :
 *   - dans le terminal :   node tests.js   (ou npm test)
 *   - dans le navigateur : ouvrir tests.html
 */

import { evaluate, formatResult, CalcError } from "./calculator.js";
import { initialState, press, keyFromKeyboard, formatExpression } from "./input.js";

// [expression, résultat attendu]
const VALID_CASES = [
  // Opérations de base
  ["2 + 3", 5],
  ["10 − 4", 6],
  ["6 × 7", 42],
  ["8 ÷ 2", 4],
  ["7 ÷ 2", 3.5],

  // Priorités
  ["2 + 3 × 4", 14],
  ["10 − 6 ÷ 2", 7],
  ["2 × 3 + 4 × 5", 26],
  ["10 − 4 − 3", 3],     // de gauche à droite
  ["100 ÷ 10 ÷ 2", 5],   // de gauche à droite

  // Parenthèses
  ["(2 + 3) × 4", 20],
  ["((1 + 2) × (3 + 4))", 21],
  ["2(3 + 1)", 8],        // multiplication implicite

  // Nombres décimaux (virgule ou point)
  ["1,5 + 1,5", 3],
  ["0.5 × 4", 2],
  [",5 + 1", 1.5],

  // Signe moins
  ["−5 + 2", -3],
  ["3 × −2", -6],
  ["−(2 + 3)", -5],
  ["5 − −2", 7],

  // Pourcentage
  ["50%", 0.5],
  ["200 × 10%", 20],

  // Symboles du clavier d'ordinateur
  ["2*3-1", 5],
  ["9/3", 3],
];

// [expression, message d'erreur attendu]
const ERROR_CASES = [
  ["", "Expression vide"],
  ["5 +", "Expression incomplète"],
  ["× 3", "Expression incomplète"],
  ["5 ÷ 0", "Division par zéro"],
  ["5 ÷ (2 − 2)", "Division par zéro"],
  ["(2 + 3", "Parenthèse manquante"],
  ["2 + 3)", "Parenthèse en trop"],
  ["1,2,3", "Nombre invalide"],
  ["2 & 3", "Caractère inconnu : &"],
];

// [nombre, texte affiché attendu]
const FORMAT_CASES = [
  [0.1 + 0.2, "0,3"],
  [3.5, "3,5"],
  [-0, "0"],
  [1 / 3, "0,333333333333"],
  [1e20, "1e+20"],
];

// [touches tapées l'une après l'autre, état attendu (seuls les champs indiqués sont vérifiés)]
const INPUT_CASES = [
  // Saisie et aperçu en direct
  [["1", "2", "+", "3"],           { expression: "12+3", display: "15" }],
  [["1", "2", "+"],                { expression: "12+", display: "12" }],   // garde le dernier aperçu valide
  [["2", "+", "3", "×", "4", "="], { history: "2 + 3 × 4 =", display: "14", justEvaluated: true }],

  // Opérateurs
  [["5", "+", "×", "2"],           { expression: "5×2" }],     // le nouvel opérateur remplace l'ancien
  [["×", "3"],                     { expression: "3" }],       // pas de × en début de calcul
  [["−", "3"],                     { expression: "−3", display: "-3" }],
  [["3", "×", "−", "2", "="],      { display: "-6" }],          // nombre négatif après ×

  // Virgule
  [[",", "5"],                     { expression: "0,5" }],
  [["1", ",", "2", ","],           { expression: "1,2" }],     // une seule virgule par nombre

  // Parenthèses et multiplication implicite
  [[")", "2"],                     { expression: "2" }],       // pas de ")" sans "("
  [["(", "2", "+", "1", ")", "3"], { expression: "(2+1)×3", display: "9" }],

  // Après "=" : continuer ou recommencer
  [["2", "+", "3", "=", "×", "2"], { expression: "5×2", display: "10" }],
  [["2", "+", "3", "=", "7"],      { expression: "7", display: "7" }],
  [["1", "÷", "4", "=", "+", "1"], { expression: "0,25+1" }],

  // Erreurs : message en orange, puis on peut corriger
  [["5", "÷", "0", "="],           { display: "Division par zéro", isError: true }],
  [["5", "÷", "0", "=", "backspace", "2"], { expression: "5÷2", display: "2,5", isError: false }],

  // Effacement
  [["1", "2", "backspace"],        { expression: "1", display: "1" }],
  [["1", "2", "clear"],            { expression: "", display: "0" }],
  [["2", "=", "backspace"],        { expression: "", display: "0" }],
];

// [event.key, touche attendue]
const KEYBOARD_CASES = [
  ["7", "7"], ["*", "×"], ["/", "÷"], ["-", "−"], [".", ","],
  ["Enter", "="], ["Backspace", "backspace"], ["Escape", "clear"], ["a", null],
];

/** Lance tous les tests et renvoie la liste des résultats. */
export function runTests() {
  const results = [];
  const record = (name, ok, detail = "") => results.push({ name, ok, detail });

  for (const [expr, expected] of VALID_CASES) {
    try {
      const got = evaluate(expr);
      const ok = Math.abs(got - expected) < 1e-9;
      record(`evaluate("${expr}") = ${expected}`, ok, ok ? "" : `obtenu ${got}`);
    } catch (err) {
      record(`evaluate("${expr}") = ${expected}`, false, `erreur : ${err.message}`);
    }
  }

  for (const [expr, message] of ERROR_CASES) {
    try {
      const got = evaluate(expr);
      record(`evaluate("${expr}") → erreur`, false, `aucune erreur, obtenu ${got}`);
    } catch (err) {
      const ok = err instanceof CalcError && err.message === message;
      record(`evaluate("${expr}") → "${message}"`, ok, ok ? "" : `obtenu "${err.message}"`);
    }
  }

  for (const [value, expected] of FORMAT_CASES) {
    // Les séparateurs de milliers peuvent être des espaces spéciaux : on les normalise
    const got = formatResult(value).replace(/\s/g, " ");
    record(`formatResult(${value}) = "${expected}"`, got === expected, got === expected ? "" : `obtenu "${got}"`);
  }

  for (const [keys, expected] of INPUT_CASES) {
    const state = keys.reduce(press, initialState);
    const wrong = Object.keys(expected).filter((field) => state[field] !== expected[field]);
    const detail = wrong.map((field) => `${field} = ${JSON.stringify(state[field])}`).join(", ");
    record(`touches [${keys.join(" ")}]`, wrong.length === 0, detail && `obtenu ${detail}`);
  }

  for (const [key, expected] of KEYBOARD_CASES) {
    const got = keyFromKeyboard(key);
    record(`clavier "${key}" → ${expected}`, got === expected, got === expected ? "" : `obtenu ${got}`);
  }

  const spaced = formatExpression("−2×−3+(−1)");
  record(`formatExpression("−2×−3+(−1)")`, spaced === "−2 × −3 + (−1)", spaced === "−2 × −3 + (−1)" ? "" : `obtenu "${spaced}"`);

  return results;
}

// Exécution dans le terminal (Node.js)
if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("tests.js")) {
  const results = runTests();
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "✔" : "✘"} ${r.name}${r.detail ? "  — " + r.detail : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} tests réussis`);
  process.exitCode = failed.length ? 1 : 0;
}
