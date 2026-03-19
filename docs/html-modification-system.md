# Système de Modification HTML + UNDO - Documentation Technique

## Vue d'ensemble

Le système permet de:
1. Modifier le contenu HTML (ajouter des éléments, du texte, des images)
2. Annuler les changements via un bouton UNDO dans la toolbar

## Architecture

### Principes de sécurité

1. **Jamais de remplacement complet** - On modifie seulement l'élément ciblé
2. **Sauvegarde pour undo** - Tout changement est sauvegardé avant modification
3. **Regex précis** - On utilise le sélecteur exact pour trouver l'élément

### Fichier: htmlApplier.ts

```typescript
import * as fs from 'fs';
import { UndoEntry } from '../../shared/types';

export class HTMLApplier {
    private undoStack: UndoEntry[] = [];
    private maxUndoSize = 50;

    /**
     * Apply HTML changes to an element
     */
    async applyHTML(
        htmlFilePath: string,
        selector: string,
        htmlChanges: string,
        changeType: 'replace' | 'append' | 'prepend' | 'setAttribute'
    ): Promise<boolean> {
        try {
            let content = fs.readFileSync(htmlFilePath, 'utf-8');

            // Save for undo
            this.pushUndo({
                filePath: htmlFilePath,
                oldContent: content,
                newContent: '',
                timestamp: Date.now()
            });

            // Find and modify the element
            content = this.modifyElement(content, selector, htmlChanges, changeType);

            // Save changes
            fs.writeFileSync(htmlFilePath, content, 'utf-8');

            // Update undo entry
            const lastEntry = this.undoStack[this.undoStack.length - 1];
            if (lastEntry) {
                lastEntry.newContent = content;
            }

            return true;
        } catch (error) {
            console.error('Failed to apply HTML:', error);
            return false;
        }
    }

    /**
     * Modify element based on selector and change type
     */
    private modifyElement(
        htmlContent: string,
        selector: string,
        htmlChanges: string,
        changeType: string
    ): string {
        // Escape special regex characters in selector
        const escapedSelector = this.escapeRegex(selector);

        switch (changeType) {
            case 'replace':
                // Replace the element's innerHTML
                return htmlContent.replace(
                    new RegExp(`(<${escapedSelector}[^>]*>)([\\s\\S]*?)(</${escapedSelector}>)`, 'i'),
                    (match, openTag, inner, closeTag) => {
                        return openTag + htmlChanges + closeTag;
                    }
                );

            case 'append':
                // Add inside the element, at the end
                return htmlContent.replace(
                    new RegExp(`(<${escapedSelector}[^>]*>)([\\s\\S]*?)(</${escapedSelector}>)`, 'i'),
                    (match, openTag, inner, closeTag) => {
                        return openTag + inner + htmlChanges + closeTag;
                    }
                );

            case 'prepend':
                // Add inside the element, at the beginning
                return htmlContent.replace(
                    new RegExp(`(<${escapedSelector}[^>]*>)([\\s\\S]*?)(</${escapedSelector}>)`, 'i'),
                    (match, openTag, inner, closeTag) => {
                        return openTag + htmlChanges + inner + closeTag;
                    }
                );

            case 'setAttribute':
                // Set or modify an attribute
                const [attrName, attrValue] = htmlChanges.split('=');
                return htmlContent.replace(
                    new RegExp(`(<${escapedSelector})([^>]*>)`, 'i'),
                    (match, openTag, attrs) => {
                        // Check if attribute exists
                        if (attrs.includes(attrName)) {
                            // Replace existing attribute
                            return match.replace(
                                new RegExp(`${attrName}=["'][^"']*["']`),
                                `${attrName}="${attrValue}"`
                            );
                        } else {
                            // Add new attribute
                            return `${openTag} ${attrName}="${attrValue}"${attrs}>`;
                        }
                    }
                );

            default:
                return htmlContent;
        }
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Push undo entry
     */
    private pushUndo(entry: UndoEntry): void {
        this.undoStack.push(entry);
        if (this.undoStack.length > this.maxUndoSize) {
            this.undoStack.shift();
        }
    }

    /**
     * Undo last change
     */
    async undo(): Promise<boolean> {
        const entry = this.undoStack.pop();
        if (!entry) return false;

        try {
            fs.writeFileSync(entry.filePath, entry.oldContent, 'utf-8');
            return true;
        } catch (error) {
            return false;
        }
    }
}
```

## Intégration avec le flux existant

### commands/index.ts

```typescript
// Dans handleApplyConfirmed:
if (changeSet.changes.html) {
    const htmlApplier = new HTMLApplier();
    // Déterminer le type de changement basé sur l'instruction
    const changeType = determineChangeType(instruction);
    await htmlApplier.applyHTML(htmlFile, changeSet.selector, changeSet.changes.html, changeType);
}
```

## Types de modifications supportées

| Instruction | Type de changement | Exemple |
|-------------|-------------------|---------|
| "ajouter logo amazon" | append | `<img src="...">` ajouté à la fin |
| "ajouter au début" | prepend | `<img src="...">` ajouté au début |
| "remplacer le contenu" | replace | Contenu remplacé |
| "ajouter src=..." | setAttribute | Attribut ajouté/modifié |

## Note de sécurité

Le système doit:
1. **NE JAMAIS** remplacer le document entier
2. **TOUJOURS** utiliser le sélecteur exact pour cibler l'élément
3. **TOUJOURS** sauvegarder pour undo avant modification
4. **VALIDER** le sélecteur avant de l'utiliser dans le regex

---

## Bouton UNDO dans la Toolbar

### Fonctionnalité
- Le bouton UNDO apparaît dans la toolbar après un changement appliqué
- Il permet à l'utilisateur d'annuler le dernier changement s'il n'est pas satisfait
- Un seul clic suffit pour restaurer le fichier précédent

### UI - Ajout dans la toolbar

```typescript
// Dans webviewManager.ts - dans createUI():
const undoBtn = document.createElement('button');
undoBtn.textContent = '↶ Undo';
undoBtn.style.cssText = 'padding: 6px 12px; background: #d9534f; color: white; border: none; border-radius: 4px; cursor: pointer; display: none;';
undoBtn.onclick = function() {
    vscode.postMessage({ type: 'undo-request' });
};
toolbar.appendChild(undoBtn);
```

### Message à l'extension

```typescript
// Dans le webview:
window.addEventListener('message', function(event) {
    if (message.type === 'show-undo') {
        undoBtn.style.display = 'block';
    } else if (message.type === 'hide-undo') {
        undoBtn.style.display = 'none';
    }
});
```

### Commande dans l'extension

```typescript
// Dans commands/index.ts - après applyConfirmed:
webviewManager.postMessage({ type: 'show-undo' as any });

// Ajouter commande undo:
vscode.commands.registerCommand('aiVisualEditor.undo', async () => {
    const success = await cssApplier.undo();
    if (success) {
        webviewManager.refreshPreview();
        webviewManager.postMessage({ type: 'hide-undo' as any });
    }
});
```

### Flux utilisateur

```
1. User clicks element → AI modifies → Apply
2. Changes applied successfully → "Undo" button appears in toolbar
3. User is not satisfied → Clicks "Undo"
4. File is restored → Preview refreshes → Button disappears
```

---

## Limitations et Cas Non Couverts

### Problèmes Connus avec les Sélecteurs

Le système de modification HTML repose sur des sélecteurs CSS générés par le webview. Certains sélecteurs peuvent ne pas fonctionner correctement :

#### 1. Sélecteurs avec Pseudo-classes
- **Problème** : Les sélecteurs contenant `:nth-child()`, `:first-child`, `:last-child`, `:hover`, etc. ne correspondent pas au HTML
- **Exemple** : `div:nth-child(1) > span.class`
- **Solution** : Le système tente maintenant de supprimer les pseudo-classes, mais cela peut échouer dans certains cas

#### 2. Sélecteurs Très Longs avec Chemins Relatifs
- **Problème** : Les sélecteurs qui descendent profondément dans le DOM peuvent échouer
- **Exemple** : `section > div > div > button` avec plusieurs classes
- **Solution** : Le système essaie d'extraire la dernière classe pour trouver l'élément

#### 3. Éléments avec IDs Uniques
- **Solution recommandée** : Utilisez des éléments avec un `id` unique pour de meilleurs résultats
- **Exemple** : `<button id="cta-button">` avec sélecteur `#cta-button`

### Limitations de l'API AI

#### 1. Réponses Tronquées
- **Problème** : L'IA peut tronquer le texte de remplacement
- **Exemple** : "Connect Gaming Account" devient "Connecte"
- **Solution** : Utilisez des instructions plus courtes ou augmentez `max_tokens`

#### 2. Sélecteurs Incorrects
- **Problème** : L'IA peut générer un sélecteur incorrect
- **Solution** : Vérifiez le sélecteur dans les logs de débogage

### Recommandations pour les Utilisateurs

1. **Utilisez des IDs uniques** : Ajoutez des `id` à vos éléments pour un ciblage précis
2. **Instructions claires** : "change text to [texte exact]" au lieu de "change text"
3. **Vérifiez les logs** : Ouvrez la console de débogage pour voir les réponses de l'IA
4. **Utilisez le mode mock** : Pour tester sans API, configurez `aiProvider: "mock"`

### Dépannage

Si la modification HTML échoue :

1. Ouvrez la console de débogage (View → Debug Console)
2. Cherchez les messages `[AI Service] Raw AI response:`
3. Vérifiez que le sélecteur correspond à un élément dans votre HTML
4. Essayez avec un élément plus simple
5. Utilisez le bouton UNDO pour restaurer si le fichier a été modifié incorrectement
