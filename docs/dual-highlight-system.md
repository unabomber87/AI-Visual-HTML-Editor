# Système de Double Highlight - Documentation Technique

## Vue d'ensemble

Le système utilise deux overlays de highlight avec des rôles distincts:

| Highlight | Couleur | Rôle | Comportement |
|-----------|---------|------|--------------|
| **Sélectionné (Selected)** | Bleu (#007acc) | Élément actuellement modifié | Verrouillé, ne bouge qu'au click ou scroll |
| **Sélecteur (Picker)** | Vert (#28a745) | Prévisualisation au survol | Suit la souris, permet la sélection |

## Flux utilisateur

```
1. L'utilisateur clique sur "Select Element" dans la toolbar
   → Le picker (vert) devient actif

2. L'utilisateur survole un élément
   → Le highlight vert suit la souris

3. L'utilisateur clique sur un élément
   → Le highlight bleu se déplace vers cet élément
   → La sidebar s'ouvre pour permettre la modification
   → Le picker (vert) reste actif pour permettre une nouvelle sélection

4. L'utilisateur peut:
   a) Modifier l'élément sélectionné (bleu) via la sidebar
   b) Cliquer sur un autre élément avec le picker (vert) pour changer la sélection
```

## Architecture technique

### Variables d'état

```typescript
var pickerOverlay = null;      // Overlay vert (picker)
var selectedOverlay = null;   // Overlay bleu (sélectionné)
var pickerElement = null;     // Élément sous le curseur (pour le picker)
var selectedElement = null;   // Élément actuellement sélectionné
var isPickerActive = false;   // Le picker est-il actif?
```

### Création des overlays

```typescript
// Picker (vert) - pour la sélection au survol
pickerOverlay = document.createElement('div');
pickerOverlay.id = 'ai-picker-overlay';
pickerOverlay.style.cssText = 'position: fixed; border: 2px solid #28a745; background-color: rgba(40, 167, 69, 0.1); pointer-events: none; z-index: 99998; display: none;';
document.body.appendChild(pickerOverlay);

// Selected (bleu) - pour l'élément sélectionné
selectedOverlay = document.createElement('div');
selectedOverlay.id = 'ai-selected-overlay';
selectedOverlay.style.cssText = 'position: fixed; border: 2px solid #007acc; background-color: rgba(0, 122, 204, 0.2); pointer-events: none; z-index: 99999; display: none;';
document.body.appendChild(selectedOverlay);
```

### Événements

#### MouseMove (picker)
```typescript
document.addEventListener('mousemove', function(e) {
    if (!isPickerActive) return;
    
    var target = e.target;
    if (target && target !== document.body && target !== document.documentElement) {
        pickerElement = target;
        
        var rect = target.getBoundingClientRect();
        pickerOverlay.style.top = rect.top + 'px';
        pickerOverlay.style.left = rect.left + 'px';
        pickerOverlay.style.width = rect.width + 'px';
        pickerOverlay.style.height = rect.height + 'px';
        pickerOverlay.style.display = 'block';
    }
});
```

#### Click (sélection)
```typescript
document.addEventListener('click', function(e) {
    if (!isPickerActive) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    var target = e.target;
    if (target && target !== document.body && target !== document.documentElement) {
        // Déplacer le highlight bleu vers le nouvel élément
        selectedElement = target;
        
        var rect = target.getBoundingClientRect();
        selectedOverlay.style.top = rect.top + 'px';
        selectedOverlay.style.left = rect.left + 'px';
        selectedOverlay.style.width = rect.width + 'px';
        selectedOverlay.style.height = rect.height + 'px';
        selectedOverlay.style.display = 'block';
        
        // Envoyer les données à l'extension
        var elementData = extractElementData(target);
        sendMessage({
            type: 'element-clicked',
            payload: elementData
        });
        
        // NOTA: Le picker reste actif pour permettre une nouvelle sélection
    }
});
```

#### Scroll (mise à jour des deux overlays)
```typescript
document.addEventListener('scroll', function() {
    // Mettre à jour le picker
    if (pickerElement && pickerOverlay) {
        var pickerRect = pickerElement.getBoundingClientRect();
        pickerOverlay.style.top = pickerRect.top + 'px';
        pickerOverlay.style.left = pickerRect.left + 'px';
        pickerOverlay.style.width = pickerRect.width + 'px';
        pickerOverlay.style.height = pickerRect.height + 'px';
    }
    
    // Mettre à jour la sélection
    if (selectedElement && selectedOverlay) {
        var selectedRect = selectedElement.getBoundingClientRect();
        selectedOverlay.style.top = selectedRect.top + 'px';
        selectedOverlay.style.left = selectedRect.left + 'px';
        selectedOverlay.style.width = selectedRect.width + 'px';
        selectedOverlay.style.height = selectedRect.height + 'px';
    }
}, true);
```

### Messages depuis l'extension

| Message | Action |
|---------|--------|
| `enable-picker` | Activer le picker (afficher le highlight vert) |
| `disable-picker` | Désactiver le picker (cacher le highlight vert) |
| `clear-selection` | Effacer le highlight bleu |

## Intégration avec la Sidebar

La sidebar doit pouvoir être ouverte sans désactiver le picker:
- L'utilisateur peut avoir la sidebar ouverte (élément bleu)
- Tout en pouvant sélectionner un nouvel élément (avec le picker vert)
- Cliquer sur un nouvel élément déplace le bleu et met à jour la sidebar

## Cas d'usage

1. **Sélection initiale**: L'utilisateur clique sur "Select Element", puis clique sur un élément → highlight bleu apparaît
2. **Changement de sélection**: L'utilisateur garde le picker actif, survole un autre élément (vert), clique → le bleu se déplace
3. **Modification**: L'utilisateur modifie l'élément bleu via la sidebar
4. **Nouvelle sélection pendant modification**: L'utilisateur peut sélectionner un nouvel élément sans fermer la sidebar

## Notes de performance

- Les overlays utilisent `position: fixed` pour éviter les problèmes de positionnement
- Le scroll event utilise `capture: true` pour intercepter le scroll sur les éléments parents
- `pointer-events: none` permet de cliquer au travers des overlays
