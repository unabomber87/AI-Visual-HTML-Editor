# Documentation - Integration AI

## 1. Objectif

Permettre a l'extension de comprendre les instructions en langage naturel de l'utilisateur et de generer du CSS approprie pour modifier les elements HTML.

## 2. Connecteurs AI Supportes

### 2.1 Connecteurs Gratuits (Prioritaires)

| Service | Type | Limite | Qualite | UI/UX Oriented |
|---------|------|--------|---------|----------------|
| **Groq** | Cloud | 500 req/min | Excellente | Oui |
| **Ollama** | Local | Illimite | Bonne | - |
| **LM Studio** | Local | Illimite | Bonne | - |
| **OpenAI Free** | Cloud | $5 credit/mois | Excellente | Oui |
| **Claude Free** | Cloud | 5 req/min | Excellente | Oui |

### 2.2 Connecteurs Payants (Optionnels)

| Service | Prix | Qualite |
|---------|------|---------|
| OpenAI GPT-4 | $0.03/1K tokens | Excellente |
| Claude 3 Opus | $0.015/1K tokens | Excellente |
| Gemini Pro | $0.00125/1K tokens | Bonne |

## 3. Architecture des Connecteurs

```
+-------------------------------------------------------------+
|                    AIService (Factory)                       |
+-------------------------------------------------------------+
|  createProvider(config: AIConfig): AIProvider                |
+----------------------------+--------------------------------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
+---------------+   +---------------+   +---------------+
| OllamaProvider|   | GroqProvider  |   |OpenAIProvider |
|   (Local)     |   |   (Free)      |   |   (Free)      |
+---------------+   +---------------+   +---------------+
         |                   |                   |
         +-------------------+-------------------+
                             |
                             v
              +---------------------------+
              |   Unified Response        |
              |   {                       |
              |     selector: "...",      |
              |     changes: {            |
              |       css: "...",         |
              |       html: "..."         |
              |     }                     |
              |   }                       |
              +---------------------------+
```

## 4. Format des Prompts

### 4.1 Prompt systeme

```
Tu es un expert en developpement web et design UI/UX.
Tu genères du CSS pour modifier des elements HTML.

Regles:
1. Prefere CSS sur HTML quand possible
2. Utilise des proprietes CSS modernes (flex, grid)
3. Genere du code propre et maintenable
4. Responds UNIQUEMENT en JSON
```

### 4.2 Prompt utilisateur

```
Element selectionne:
- Tag: {tagName}
- ID: {id}
- Classes: {classList}
- Selecteur CSS: {cssSelector}
- Styles actuels: {styles}

Instruction: "{instruction}"

Reponds en JSON avec ce format:
{
  "selector": "selecteur CSS",
  "changes": {
    "css": "proprietes CSS a ajouter",
    "html": "optionnel, modifications HTML"
  }
}
```

### 4.3 Exemples d'instructions

| Instruction Utilisateur | CSS Genere |
|------------------------|------------|
| "center this element" | display: flex; justify-content: center; align-items: center; |
| "make it bigger" | width: 200px; height: 200px; |
| "add margin" | margin: 20px; |
| "change color to blue" | background-color: #007bff; |
| "make it rounded" | border-radius: 8px; |
| "add shadow" | box-shadow: 0 4px 6px rgba(0,0,0,0.1); |
| "center text" | text-align: center; |
| "hide it" | display: none; |

## 5. Integration Gratuite Recommandee

### 5.1 Groq (Recommande)

**Pourquoi Groq?**
- Gratuit et genereux (500 req/min)
- Temps de response tres rapide (< 500ms)
- Supporte Llama, Mixtral
- Pas de carte de credit requise

**Configuration:**
```json
{
  "provider": "groq",
  "model": "llama-3.1-70b-versatile",
  "apiKey": "CLE_API"
}
```

### 5.2 Ollama (Local)

**Pourquoi Ollama?**
- Entierement gratuit (pas de limite)
- Local (pas de donnees envoyees)
- Configurable

**Configuration:**
```json
{
  "provider": "ollama",
  "model": "llama3.2",
  "baseUrl": "http://localhost:11434"
}
```

## 6. Flux de Communication

```
User Click
    |
    v
+---------------+
| Webview       |
| (Pick element)|
+-------+-------+
        | element-clicked
        v
+---------------+
| Extension     |
| (Handle click)|
+-------+-------+
        | Show sidebar
        v
+---------------+
| Sidebar       |
| (User enters  |
|  instruction)  |
+-------+-------+
        | prompt-submitted
        v
+---------------+
| Extension     |
| (Call AI)    |
+-------+-------+
        | getSuggestion()
        v
+---------------+
| AI Provider   |
| (Groq/Ollama/ |
|  OpenAI/Claude)|
+-------+-------+
        | JSON response
        v
+---------------+
| CSS Applier   |
| (Apply changes)|
+-------+-------+
        | Refresh preview
        v
+---------------+
| Webview       |
| (Show result) |
+---------------+
```

## 7. Structure de Reponse AI

### 7.1 Reponse JSON

```json
{
  "selector": "body > div#main > section.hero:nth-child(1) > button.btn-primary:nth-child(2)",
  "changes": {
    "css": "display: flex; justify-content: center; align-items: center; margin: 20px auto; padding: 15px 30px; border-radius: 8px;",
    "html": ""
  }
}
```

### 7.2 Gestion des Erreurs

```json
{
  "type": "error",
  "message": "Erreur de connexion",
  "retryable": true
}
```

## 8. Implementation par Etape

### Etape 1: Interface Commune
- Definir AIProvider interface
- Creer factory AIService.createProvider()

### Etape 2: Groq (Prioritaire)
- Implementer GroqProvider
- Configurer modele Llama 3.1
- Tester avec instructions UI/UX

### Etape 3: Ollama (Optionnel)
- Implementer OllamaProvider
- Configurable via settings
- Fallback si Ollama pas lance

### Etape 4: Configuration UI
- Page de configuration VSCode
- Choix du provider
- Saisie de la cle API

## 9. Prochaines Etapes d'Implementation

1. Modifier src/extension/ai/aiService.ts
2. Ajouter src/extension/ai/providers/groqProvider.ts
3. Ajouter src/extension/ai/providers/ollamaProvider.ts
4. Mettre a jour package.json (groq-sdk)
5. Creer page de configuration

## 10. Securite

- Cles API stockees dans VSCode secrets
- Pas de logs des cles
- Validation des entrees utilisateur
- Timeout sur les requetes (30s)
