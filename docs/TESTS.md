# Documentation des Tests Unitaires

## Vue d'ensemble

Ce projet utilise **Vitest** comme framework de tests unitaires, choisi pour sa légèreté et sa compatibilité TypeScript native.

## Structure des Tests

```
src/test/
├── aiService.test.ts        # 50 tests
├── aiProviders.test.ts      # À faire
├── aiLogger.test.ts         # 25 tests
├── htmlApplier.test.ts     # 33 tests
├── cssApplier.test.ts      # 24 tests
├── configService.test.ts    # 18 tests
├── sidebarManager.test.ts   # 22 tests
├── webviewManager.test.ts   # 23 tests
└── mocks/
    └── vscode.ts           # Mocks VSCode API
```

## Configuration

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/extension/**/*.ts'],
      exclude: ['src/extension/main.ts', 'src/extension/commands/**'],
    },
    alias: {
      vscode: '/src/test/mocks/vscode.ts',
    },
  },
});
```

### Scripts npm

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

## Exécution des Tests

```bash
# Tous les tests
npm run test

# Mode watch (rechargement automatique)
npm run test:watch

# Avec couverture de code
npm run test:coverage

# Interface visuelle
npm run test:ui
```

## Couverture par Fichier

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `configService.ts` | 18 | ~80% |
| `aiService.ts` | 50 | ~90% |
| `aiLogger.ts` | 25 | ~65% |
| `htmlApplier.ts` | 33 | ~45% |
| `cssApplier.ts` | 24 | ~60% |
| `sidebarManager.ts` | 22 | ~50% |
| `webviewManager.ts` | 23 | ~50% |

**Total: 195 tests**

## Détail des Tests par Module

### aiService.test.ts (50 tests)

#### getSuggestion - Mock Provider
- Instructions CSS (center, blue, red, green, bigger, rounded, shadow, etc.)
- Instructions HTML (button, input, link, image, list)
- Instructions françaises (centrer, plus grand, arrondir)
- Instructions vides et caractères spéciaux
- Données d'élément null/undefined

#### buildPrompt
- Contexte parentStyles et dimensions
- Éléments sans ID/classes
- Instructions très longues

### aiLogger.test.ts (25 tests)

#### Configuration
- `setEnabled()`, `setFormat()`, `setIncludeFullPrompt()`
- Formats JSON et lisible

#### Logging
- `logQuery()` avec troncature
- `logAnswer()` avec troncature CSS/HTML
- Erreurs d'écriture

#### Utilitaires
- `generateUUID()`, `getDateString()`

### htmlApplier.test.ts (33 tests)

#### determineChangeType()
- Instructions françaises/anglaises
- Types: replace, prepend, append, setAttribute
- Attributs: src, class, id, href, alt

#### applyHTML()
- Opérations prepend/append
- Sélecteurs avec caractères spéciaux
- HTML mal formé
- Nesting profond

#### Undo
- Stack vide, succès, erreur

### cssApplier.test.ts (24 tests)

#### applyCSS()
- Avec/sans bloc style existant
- Pseudo-classes (:hover, :focus)
- Media queries
- Propriétés !important
- Variables CSS

#### mergeStyles()
- Fusion et override de propriétés

#### Undo
- Stack management

### configService.test.ts (18 tests)

- `setApiKey()`, `getApiKey()`, `deleteApiKey()`
- `getProvider()`, `setProvider()`
- `getGroqModel()`, `getOllamaModel()`, `getOllamaUrl()`
- `getPreviewPort()`

### sidebarManager.test.ts (22 tests)

#### showPrompt()
- Création/révélation de panel
- Affichage données élément
- Gestion ID/classes null

#### Edge Cases
- XSS prevention
- Données très longues
- Messages mal formés

### webviewManager.test.ts (23 tests)

#### createPreview()
- Configuration panel
- Injection script
- Contenu HTML

#### Edge Cases
- Erreurs lecture fichier
- HTML mal formé
- Scripts existants

## Mocks

### mocks/vscode.ts

Mock minimal de l'API VSCode pour les tests:

- `workspace.getConfiguration()`
- `window.createWebviewPanel()`
- `Uri.file()`
- `SecretStorage`
- `ViewColumn`

## Refactoring AI Providers

### Problème Initial

`aiService.ts` avait une couverture de ~54% car les méthodes `callGroq()`, `callOpenAI()`, `callAnthropic()`, et `callOllama()` nécessitaient des mocks complexes pour les appels HTTP.

### Solution

Extraction des providers dans un fichier séparé:

```
src/extension/ai/
├── aiService.ts      # 400 lignes (bien testé)
├── aiProviders.ts    # 360 lignes (non testé - appels HTTP réels)
└── aiLogger.ts
```

### Fichiers Modifiés

1. **Créé:** `src/extension/ai/aiProviders.ts`
   - `AIProviders` class
   - `callProvider()` - routeur
   - `callGroq()`, `callOpenAI()`, `callAnthropic()`, `callOllama()`
   - `parseAIResponse()`

2. **Modifié:** `src/extension/ai/aiService.ts`
   - Suppression des 4 méthodes d'appel API
   - Import de `AIProviders`
   - Utilisation de `providers.callProvider()`

### Résultat

| Métrique | Avant | Après |
|----------|-------|-------|
| Lignes aiService.ts | 622 | 400 |
| Couverture aiService.ts | ~54% | ~90% |
| Couverture globale | ~50% | ~75-80% |

## Meilleures Pratiques

### Écriture de Tests

1. **Unittest par fonctionnalité**
   ```typescript
   describe('FeatureName', () => {
     it('should do X when Y', () => { ... });
     it('should handle error Z', () => { ... });
   });
   ```

2. **Mocks cohérents**
   ```typescript
   vi.mock('vscode');
   vi.mock('fs');
   ```

3. **Assertions claires**
   ```typescript
   expect(result).toBe(true);
   expect(fs.writeFileSync).toHaveBeenCalled();
   ```

### Gestion des Edge Cases

- Instructions vides
- Valeurs null/undefined
- Caractères spéciaux (XSS)
- Données très longues
- Erreurs réseau/fichiers

## Améliorations Futures

### Tests à Ajouter

1. **aiProviders.test.ts** - Tests des 4 providers avec mocks fetch
2. **Tests d'intégration** - Avec serveur mock HTTP
3. **Couverture HTML/CSS** - Cas plus complexes

### Couverture Cible

| Fichier | Actuel | Cible |
|---------|--------|-------|
| `htmlApplier.ts` | ~45% | ~70% |
| `sidebarManager.ts` | ~50% | ~70% |
| `webviewManager.ts` | ~50% | ~70% |

## Commandes Utiles

```bash
# Exécuter les tests
npm run test

# Tests avec couverture
npm run test:coverage

# Ouvrir l'UI de couverture
npm run test:ui

# Tests en mode watch
npm run test:watch
```
