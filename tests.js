/**
 * tests.js — Tests de la logique de calcul.
 *
 * Deux façons de les lancer :
 *   - dans le terminal :   node tests.js   (ou npm test)
 *   - dans le navigateur : ouvrir tests.html
 */

import { evaluate, formatResult, CalcError } from "./calculator.js";

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
