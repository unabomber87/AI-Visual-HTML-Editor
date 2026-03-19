# AI Logging - Documentation Utilisateur

## Vue d'ensemble

Le système de logging IA permet d'enregistrer toutes les interactions avec les providers IA (Groq, OpenAI, Anthropic, Ollama). Chaque interaction est consignée dans un fichier de log avec la requête (query) et la réponse (answer).

## Activation du logging

### Via les paramètres VSCode

1. Ouvrir les paramètres VSCode : `File > Preferences > Settings` (ou `Ctrl+,`)
2. Rechercher `aiVisualEditor`
3. L'option `AI Logging: Enabled` est **activée par défaut** - vous pouvez la désactiver si besoin

### Via la commande

Exécuter la commande suivante dans la palette de commandes (`Ctrl+Shift+P`) :

```
AI Visual Editor: Enable AI Logging
```

## Emplacement des fichiers de log

Les fichiers de log sont créés dans le répertoire `ai-logs/` à la racine du **premier projet ouvert** dans VSCode :

```
{votre-projet-ouvert}/
└── ai-logs/
    └── ai-session-2026-03-19.log
```

> **Note** : Si aucun projet n'est ouvert, les logs seront écrits dans le répertoire de l'extension.

Un nouveau fichier est créé chaque jour.

## Format des logs

### Format JSON (défaut)

Chaque ligne représente une entrée complète avec query et answer :

```json
{"query":{"id":"550e8400-e29b-41d4-a716-446655440000","timestamp":"2026-03-19T14:30:00.000Z","provider":"groq","instruction":"center this element","elementContext":{"tagName":"div","id":"header","classList":["container"],"cssSelector":"#header","filePath":"/path/to/index.html"}},"answer":{"id":"550e8400-e29b-41d4-a716-446655440000","timestamp":"2026-03-19T14:30:01.500Z","success":true,"response":{"selector":"#header","changes":{"css":"display: flex; justify-content: center; align-items: center;","html":""}},"duration":1500}}
```

Pour formater joliment ce JSON :

```bash
# Linux/Mac
cat ai-logs/ai-session-2026-03-19.log | python3 -m json.tool

# Windows (PowerShell)
Get-Content ai-logs/ai-session-2026-03-19.log | ConvertFrom-Json
```

### Format lisible

Vous pouvez activer le format lisible dans les paramètres :

```
AI Visual Editor > AI Logging: Format: readable
```

Ce qui produira :

```
================================================================================
[2026-03-19 14:30:00] QUERY #550e8400-e29b-41d4-a716-446655440000
================================================================================
Provider:  groq
Instruction: center this element
Element:    div#header.container (#header)
File:       /path/to/index.html

================================================================================
[2026-03-19 14:30:01] ANSWER #550e8400-e29b-41d4-a716-446655440000 (1500ms)
================================================================================
Status:     SUCCESS ✓
Selector:   #header
CSS:        display: flex; justify-content: center; align-items: center;
HTML:       (no changes)

================================================================================
```

## Structure des données

### Query (requête)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant unique de l'interaction |
| `timestamp` | ISO 8601 | Date/heure de la requête |
| `provider` | string | Provider IA utilisé (groq, openai, anthropic, ollama, mock) |
| `instruction` | string | Instruction brute de l'utilisateur |
| `elementContext` | object | Contexte de l'élément modifié |
| `elementContext.tagName` | string | Nom de la balise HTML |
| `elementContext.id` | string | ID de l'élément |
| `elementContext.classList` | string[] | Classes CSS |
| `elementContext.cssSelector` | string | Sélecteur CSS |
| `elementContext.filePath` | string | Chemin du fichier HTML |

### Answer (réponse)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Référence à la query |
| `timestamp` | ISO 8601 | Date/heure de la réponse |
| `success` | boolean | Succès ou échec |
| `response` | object | Réponse de l'IA (si succès) |
| `response.selector` | string | Sélecteur CSS modifié |
| `response.changes.css` | string | CSS appliqué |
| `response.changes.html` | string | HTML appliqué |
| `error` | object | Erreur (si échec) |
| `error.type` | string | Type d'erreur |
| `error.message` | string | Message d'erreur |
| `duration` | number | Temps de réponse en ms |

## Commandes disponibles

| Commande | Description |
|----------|-------------|
| `AI Visual Editor: Enable AI Logging` | Activer le logging |
| `AI Visual Editor: Disable AI Logging` | Désactiver le logging |
| `AI Visual Editor: Open Logs Folder` | Ouvrir le dossier des logs |
| `AI Visual Editor: View Today's Logs` | Voir les logs du jour |

## Configuration

### Paramètres disponibles

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `aiLogging.enabled` | boolean | `false` | Activer le logging |
| `aiLogging.logDir` | string | `ai-logs/` | Répertoire des logs |
| `aiLogging.format` | json/readable | `json` | Format de sortie |
| `aiLogging.includeFullPrompt` | boolean | `true` | Inclure le prompt complet |

### Exemple de configuration

```json
{
    "aiVisualEditor.aiLogging.enabled": true,
    "aiVisualEditor.aiLogging.logDir": "ai-logs/",
    "aiVisualEditor.aiLogging.format": "json",
    "aiVisualEditor.aiLogging.includeFullPrompt": true
}
```

## Cas d'utilisation

### Débogage d'une requête problématique

1. Activer le logging
2. Reproduire le problème
3. Ouvrir le fichier de log du jour
4. Rechercher l'erreur dans les entrées

```bash
# Rechercher les erreurs dans les logs
grep '"success":false' ai-logs/ai-session-2026-03-19.log
```

### Analyser les performances

```bash
# Calculer le temps moyen de réponse
cat ai-logs/ai-session-2026-03-19.log | jq -r '.answer.duration' | awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'
```

### Comparer les providers

```bash
# Compter les requêtes par provider
cat ai-logs/ai-session-2026-03-19.log | jq -r '.query.provider' | sort | uniq -c
```

## Sécurité

### Données NON enregistrées

- ✗ Clés API
- ✗ Contenu complet des fichiers utilisateur
- ✗ Informations personnelles

### Données enregistrées

- ✓ Instructions utilisateur (tronquées à 1000 caractères)
- ✓ Réponses CSS/HTML (tronquées à 5000 caractères)
- ✓ Métadonnées (provider, durée, timestamps)

## Rotation des logs

- Un fichier par jour
- Format : `ai-session-YYYY-MM-DD.log`
- Les logs ne sont pas supprimés automatiquement
- Pour nettoyer, supprimer manuellement les fichiers старов

## Troubleshooting

### Les logs ne s'écrivent pas

1. Vérifier que le logging est activé : `aiVisualEditor.aiLogging.enabled`
2. Vérifier les permissions d'écriture dans le répertoire
3. Vérifier que le répertoire `ai-logs/` existe

### Le fichier de log est vide

1. Faire au moins une requête IA
2. Vérifier le format JSON (utiliser un validateur JSON)
3. Vérifier que le provider IA est configuré correctement
