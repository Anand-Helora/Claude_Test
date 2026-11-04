# Claude_test

Petit projet d'application écrit à deux, Anand & Claude, étape par étape.

Chaque étape du développement fait l'objet d'un commit.

## Calculatrice HELORA

Une calculatrice aux couleurs de la charte HELORA (vert foncé `#044550`,
turquoise `#009e99`, orange `#e16021` réservé aux messages d'erreur).

- Les quatre opérations avec les priorités, les parenthèses, le pourcentage et les nombres décimaux
- Le résultat s'affiche en direct pendant la saisie
- Utilisable à la souris, au doigt ou au clavier :
  chiffres, `+ - * /`, `%`, `( )`, `,` ou `.`, `Entrée` pour =, `Retour arrière`, `Échap` pour tout effacer

### Lancer l'application

Les fichiers JavaScript sont des modules : il faut passer par un petit serveur local
plutôt que d'ouvrir `index.html` directement.

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000.

### Lancer les tests

```bash
npm test
```

Ou ouvrir http://localhost:8000/tests.html dans le navigateur.

### Organisation

| Fichier         | Rôle                                                    |
|-----------------|---------------------------------------------------------|
| `index.html`    | Structure de la page                                    |
| `style.css`     | Thème HELORA                                            |
| `calculator.js` | Calcul d'une expression (sans `eval`)                   |
| `input.js`      | Gestion de la saisie : quelle touche fait quoi          |
| `app.js`        | Relie la page à la logique (clics, clavier, affichage)  |
| `tests.js`      | Tests de `calculator.js` et `input.js`                  |

Les polices de la charte (Gotham Rounded, Belgika) sont payantes : elles sont
utilisées si elles sont installées sur l'ordinateur, sinon la page utilise Nunito,
une police arrondie gratuite très proche.
