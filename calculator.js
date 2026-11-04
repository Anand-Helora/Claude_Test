/**
 * calculator.js — Logique de la calculatrice (aucun lien avec l'affichage).
 *
 * evaluate("12 + 3 × 4")  → 24
 * formatResult(0.1 + 0.2) → "0,3"
 *
 * Fonctionnement en 2 temps, sans eval() :
 *   1. tokenize() découpe le texte en « jetons » : nombres, opérateurs, parenthèses.
 *   2. Un analyseur « à descente récursive » lit ces jetons en respectant les priorités.
 *
 * Grammaire (de la priorité la plus faible à la plus forte) :
 *   expression := terme   (('+' | '-') terme)*
 *   terme      := facteur (('*' | '/') facteur | facteur commençant par '(')*
 *   facteur    := ('+' | '-') facteur | pourcent
 *   pourcent   := primaire '%'*
 *   primaire   := nombre | '(' expression ')'
 */

/** Erreur de calcul avec un message lisible par l'utilisateur. */
export class CalcError extends Error {
  constructor(message) {
    super(message);
    this.name = "CalcError";
  }
}

// Les symboles affichés (× ÷ −) et ceux du clavier (* / -) sont ramenés à une seule forme.
const OPERATOR_ALIASES = {
  "+": "+",
  "-": "-", "−": "-",
  "*": "*", "×": "*", "x": "*",
  "/": "/", "÷": "/", ":": "/",
  "%": "%",
  "(": "(", ")": ")",
};

/**
 * Découpe une expression en jetons.
 * @param {string} input ex. "12,5 × (3 − 1)"
 * @returns {Array<{type: "number", value: number} | {type: "op", value: string}>}
 */
export function tokenize(input) {
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    // Espaces : ignorés
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Nombre : chiffres avec au plus une virgule (ou un point)
    if (/[0-9.,]/.test(char)) {
      let raw = "";
      while (i < input.length && /[0-9.,]/.test(input[i])) {
        raw += input[i] === "," ? "." : input[i];
        i++;
      }
      if (raw === "." || (raw.match(/\./g) || []).length > 1) {
        throw new CalcError("Nombre invalide");
      }
      tokens.push({ type: "number", value: parseFloat(raw) });
      continue;
    }

    // Opérateur ou parenthèse
    if (char in OPERATOR_ALIASES) {
      tokens.push({ type: "op", value: OPERATOR_ALIASES[char] });
      i++;
      continue;
    }

    throw new CalcError(`Caractère inconnu : ${char}`);
  }

  return tokens;
}

/**
 * Calcule une expression et renvoie le résultat numérique.
 * @param {string} input
 * @returns {number}
 * @throws {CalcError} si l'expression est vide, incomplète ou invalide
 */
export function evaluate(input) {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new CalcError("Expression vide");

  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (value) => peek()?.type === "op" && peek().value === value;

  function parseExpression() {
    let value = parseTerm();
    while (isOp("+") || isOp("-")) {
      const op = tokens[pos++].value;
      const right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parseFactor();
    while (true) {
      if (isOp("*")) {
        pos++;
        value *= parseFactor();
      } else if (isOp("/")) {
        pos++;
        const divisor = parseFactor();
        if (divisor === 0) throw new CalcError("Division par zéro");
        value /= divisor;
      } else if (isOp("(")) {
        // Multiplication implicite : 2(3 + 1) = 2 × (3 + 1)
        value *= parseFactor();
      } else {
        return value;
      }
    }
  }

  function parseFactor() {
    if (isOp("-")) {
      pos++;
      return -parseFactor();
    }
    if (isOp("+")) {
      pos++;
      return parseFactor();
    }
    return parsePercent();
  }

  function parsePercent() {
    let value = parsePrimary();
    while (isOp("%")) {
      pos++;
      value /= 100;
    }
    return value;
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new CalcError("Expression incomplète");

    if (token.type === "number") {
      pos++;
      return token.value;
    }
    if (token.value === "(") {
      pos++;
      const value = parseExpression();
      if (!isOp(")")) throw new CalcError("Parenthèse manquante");
      pos++;
      return value;
    }
    throw new CalcError("Expression incomplète");
  }

  const result = parseExpression();

  // Il reste des jetons non lus : ex. "2 3", ou une ")" en trop
  if (pos < tokens.length) {
    throw new CalcError(isOp(")") ? "Parenthèse en trop" : "Expression invalide");
  }
  if (!Number.isFinite(result)) throw new CalcError("Résultat trop grand");

  return result;
}

/**
 * Met en forme un résultat pour l'affichage, à la française.
 * Corrige les erreurs d'arrondi (0,1 + 0,2 → 0,3).
 * @param {number} value
 * @returns {string} ex. "1 234,5"
 */
export function formatResult(value) {
  // 12 chiffres significatifs suffisent et gomment les erreurs de virgule flottante
  let rounded = Number(value.toPrecision(12));
  if (Object.is(rounded, -0)) rounded = 0;

  const abs = Math.abs(rounded);
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) {
    // Très grand ou très petit : notation scientifique, ex. "1,5e+20"
    return rounded.toExponential(6).replace(/\.?0+e/, "e").replace(".", ",");
  }

  return NUMBER_FORMAT.format(rounded);
}

// Créé une seule fois : bien plus rapide que toLocaleString() à chaque appel
const NUMBER_FORMAT = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 12 });
