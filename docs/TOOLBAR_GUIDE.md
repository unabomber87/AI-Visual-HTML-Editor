# Guide de la Toolbar - AI Visual HTML Editor

Ce guide explique comment modifier et étendre la toolbar injectée dans le webview.

## Emplacement du code

La toolbar est définie dans [`src/extension/webview/webviewManager.ts`](src/extension/webview/webviewManager.ts), dans la méthode `getInspectorScript()` (lignes ~40-90).

## Structure de la toolbar

```javascript
var toolbar = document.createElement('div');
toolbar.id = 'ai-toolbar';
toolbar.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; height: 50px; z-index: 999999; ...';
```

## Comment ajouter un nouveau bouton

### 1. Créer le bouton

```javascript
var nouveauBouton = document.createElement('button');
nouveauBouton.id = 'ai-nouveau-btn';
nouveauBouton.textContent = '📝 Nouveau';
nouveauBouton.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
```

### 2. Ajouter l'événement clic

```javascript
nouveauBouton.onclick = function(e) {
    e.stopPropagation();  // Empêche le clic de passer au document
    // Votre logique ici
    sendMessage({ type: 'nouveau-action', payload: { ... } });
};
```

### 3. Ajouter au toolbar

```javascript
toolbar.appendChild(nouveauBouton);
```

## Liste des boutons actuels

| ID | Texte | Couleur | Fonction |
|----|-------|---------|----------|
| `ai-picker-btn` | 🎯 Pick / ✕ Stop | Vert (#28a745) / Rouge (#dc3545) | Active/désactive le mode sélection d'éléments |
| `ai-refresh-btn` | 🔄 Refresh | Bleu (#007acc) | Recharge la prévisualisation |

## Communication avec l'extension

### Envoyer un message vers l'extension

```javascript
sendMessage({ type: 'nom-du-type', payload: { ... } });
```

Types de messages disponibles :
- `element-clicked` - Élément cliqué (payload: ElementData)
- `picker-enabled` - Mode pick activé
- `picker-disabled` - Mode pick désactivé
- `refresh-requested` - Demande de rafraîchissement

### Recevoir des messages de l'extension

```javascript
window.addEventListener('message', function(event) {
    var message = event.data;
    if (message.type === 'enable-picker') {
        // Faire quelque chose
    }
});
```

## Styles CSS disponibles

Couleurs VSCode (thème sombre) :
- Fond toolbar: `#252526`
- Bordure accent: `#007acc`
- Bouton succès: `#28a745`
- Bouton danger: `#dc3545`
- Bouton info: `#007acc`
- Bouton secondaire: `#6c757d`

Polices :
- `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`

## Fonctionnalités de surlignage

Le système de surlignage utilise `highlightOverlay` :

```javascript
// Afficher le surlignage
var rect = target.getBoundingClientRect();
highlightOverlay.style.top = rect.top + 'px';
highlightOverlay.style.left = rect.left + 'px';
highlightOverlay.style.width = rect.width + 'px';
highlightOverlay.style.height = rect.height + 'px';
highlightOverlay.style.display = 'block';

// Masquer le surlignage
highlightOverlay.style.display = 'none';
```

Style par défaut :
```css
border: 2px solid #007acc;
background-color: rgba(0, 122, 204, 0.1);
pointer-events: none;  /* Permet de cliquer au travers */
z-index: 99999;
```

## Variables d'état

```javascript
var isPickerEnabled = false;  // Mode sélection actif
var highlightedElement = null; // Élément survolé
var highlightOverlay = null;   // Élément de surlignage
```

## Exemple : Ajouter un bouton "Highlight"

```javascript
// Créer le bouton
var highlightBtn = document.createElement('button');
highlightBtn.id = 'ai-highlight-btn';
highlightBtn.textContent = '💡 Highlight';
highlightBtn.style.cssText = 'padding: 8px 16px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';

highlightBtn.onclick = function(e) {
    e.stopPropagation();
    // Activer le surlignage pour tous les éléments
    document.querySelectorAll('*').forEach(function(el) {
        el.addEventListener('mouseenter', function() {
            if (highlightOverlay) {
                var rect = el.getBoundingClientRect();
                highlightOverlay.style.top = rect.top + 'px';
                highlightOverlay.style.left = rect.left + 'px';
                highlightOverlay.style.width = rect.width + 'px';
                highlightOverlay.style.height = rect.height + 'px';
                highlightOverlay.style.display = 'block';
            }
        });
    });
    sendMessage({ type: 'highlight-mode-enabled' });
};

toolbar.appendChild(highlightBtn);
```

## Points d'entrée dans l'extension

Pour traiter les messages du webview, voir :
- [`src/extension/commands/index.ts`](src/extension/commands/index.ts) - Commandes et handlers
- [`src/extension/webview/sidebarManager.ts`](src/extension/webview/sidebarManager.ts) - Gestionnaire de la sidebar

## Notes importantes

1. Toujours utiliser `e.stopPropagation()` dans les gestionnaires de clic
2. Utiliser `e.preventDefault()` si nécessaire
3. Le `z-index` doit être très élevé (999999) pour être au-dessus de tout
4. Tester avec `document.body.style.cursor` pour le feedback visuel
5. La toolbar ajoute `padding-top: 60px` au body pour éviter que le contenu ne soit caché
