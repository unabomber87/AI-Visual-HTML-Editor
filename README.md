# AI Visual HTML Editor

Une extension VSCode qui permet de modifier visuellement le HTML/CSS en utilisant l'IA directement depuis un aperçu en direct.

## Fonctionnalités

- **Aperçu en direct** - Affiche votre fichier HTML dans un webview VSCode
- **Sélecteur d'éléments** - Cliquez sur n'importe quel élément pour le sélectionner
- **Highlight au survol** - Les éléments sont mis en évidence au survol de la souris
- **Modification IA** - Décrivez les changements souhaités et l'IA génère le code CSS
- **Undo/Redo** - Annulez les modifications facilement

## Installation

1. Clonez le projet
2. Installez les dépendances: `npm install`
3. Compilez le projet: `npm run compile`
4. Appuyez sur F5 pour lancer l'extension dans VSCode

## Développement

### Commandes disponibles

```bash
npm run compile    # Compile le projet TypeScript
npm run watch      # Compile en mode watch (auto-compilation)
```

### Raccourcis clavier

| Commande | Raccourci |
|----------|-----------|
| Démarrer l'aperçu | `Ctrl+Alt+E` |
| Activer le sélecteur | `Ctrl+Shift+P` |
| Annuler la dernière modification | `Ctrl+Shift+Z` |

## Utilisation

### 1. Démarrer l'aperçu

1. Ouvrez un fichier HTML dans VSCode
2. Appuyez sur `Ctrl+Alt+E` ou cliquez sur le bouton "AI Preview" dans la barre de status
3. L'aperçu s'ouvre dans un onglet

### 2. Sélectionner un élément

1. Dans l'aperçu, cliquez sur le bouton **"🎯 Pick"** pour activer le sélecteur
2. Le curseur devient une croix
3. Survolez les éléments - ils sont mis en évidence
4. Cliquez sur l'élément souhaité

### 3. Modifier avec l'IA

1. Une sidebar s'ouvre avec les infos de l'élément
2. Dans le champ de texte, décrivez le changement souhaité
   - Exemple: "centrer cet élément"
   - Exemple: "ajouter une marge de 20px"
   - Exemple: "changer la couleur en bleu"
3. Appuyez sur "Apply Changes" ou `Ctrl+Enter`
4. L'IA génère les modifications CSS
5. Cliquez sur "Confirm" pour appliquer ou "Cancel" pour annuler

### 4. Annuler une modification

Appuyez sur `Ctrl+Shift+Z` ou exécutez la commande "AI Visual Editor: Undo Last Change"

## Architecture

```
src/
├── extension/
│   ├── main.ts                 # Point d'entrée de l'extension
│   ├── commands/
│   │   └── index.ts            # Enregistrement des commandes
│   ├── webview/
│   │   ├── webviewManager.ts   # Gestion du webview d'aperçu
│   │   └── sidebarManager.ts  # Gestion de la sidebar de prompt
│   ├── ai/
│   │   └── aiService.ts        # Service pour les appels IA
│   └── editor/
│       └── cssApplier.ts       # Application des modifications CSS
└── shared/
    └── types.ts                # Types partagés
```

### Flux de données

1. L'utilisateur clique sur un élément dans l'aperçu
2. Le webview envoie un message `element-clicked` à l'extension
3. L'extension affiche la sidebar avec les infos de l'élément
4. L'utilisateur saisit une instruction
5. L'instruction + données de l'élément sont envoyées à l'IA
6. L'IA retourne les modifications CSS
7. L'extension applique les modifications via WorkspaceEdit API
8. L'aperçu est rafraîchi

## Configuration

L'extension propose les options suivantes dans les paramètres VSCode:

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `aiVisualEditor.aiProvider` | Provider IA (openai, anthropic, mock) | mock |
| `aiVisualEditor.openAIApiKey` | Clé API OpenAI | - |
| `aiVisualEditor.previewPort` | Port du serveur d'aperçu | 3000 |

## Mode Mock (défaut)

Par défaut, l'extension utilise un provider "mock" qui simule les réponses IA. Pour utiliser une vraie IA:

1. Configurez `aiVisualEditor.aiProvider` sur `openai`
2. Entrez votre clé API dans `aiVisualEditor.openAIApiKey`

## Dépannage

### L'aperçu ne s'affiche pas
- Assurez-vous d'avoir un fichier HTML ouvert
- Vérifiez la console de débogage (Help > Toggle Developer Tools)

### Le sélecteur ne fonctionne pas
- Cliquez sur le bouton "🎯 Pick" pour activer le sélecteur
- Le bouton doit afficher "✕ Stop" et le curseur doit être une croix

### Les modifications ne sont pas appliquées
- Vérifiez que le fichier CSS est accessible en écriture
- Essayez d'annuler et de réappliquer la modification

## License

MIT
