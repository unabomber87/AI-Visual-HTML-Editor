# Configuration de la Cle API - Recommandation

## Approche: Settings VSCode avec SecretStorage

### Pourquoi cette approche?

1. **Securite**: Utilise `SecretStorage` VSCode pour chiffrer la cle
2. **UX Naturelle**: Les parametres VSCode sont familiers aux utilisateurs
3. **Validation**: Verification de la cle des l'entree
4. **Consistance**: S'integre avec les autres parametres de l'extension

### Architecture

```
+------------------+     +-------------------+     +------------------+
|  package.json    | --> |  Configuration    | --> |  SecretStorage  |
|  (contributes)  |     |  (TypeScript)     |     |  (Chiffre)     |
+------------------+     +-------------------+     +------------------+
         |                        |                        |
         v                        v                        v
+------------------+     +-------------------+     +------------------+
| Settings UI     |     | Extension         |     | Groq API        |
| (Ctrl+,)        |     | (Lit la cle)      |     | (Requetes)      |
+------------------+     +-------------------+     +------------------+
```

## Implementation

### 1. Configuration dans package.json

```json
{
  "contributes": {
    "configuration": {
      "title": "AI Visual Editor",
      "properties": {
        "aiVisualEditor.aiProvider": {
          "type": "string",
          "enum": ["mock", "groq", "ollama", "openai", "anthropic"],
          "default": "mock",
          "description": "AI provider to use"
        },
        "aiVisualEditor.groqModel": {
          "type": "string",
          "default": "llama-3.1-70b-versatile",
          "description": "Groq model to use"
        },
        "aiVisualEditor.ollamaModel": {
          "type": "string", 
          "default": "llama3.2",
          "description": "Ollama model to use"
        },
        "aiVisualEditor.ollamaUrl": {
          "type": "string",
          "default": "http://localhost:11434",
          "description": "Ollama server URL"
        }
      }
    }
  }
}
```

**Note**: La cle API n'est PAS dans package.json - elle est stockee separatement dans SecretStorage.

### 2. Service de Configuration (config.ts)

```typescript
// src/extension/utils/config.ts
import * as vscode from 'vscode';

const API_KEY_PREFIX = 'aiVisualEditor.apiKey.';

export class ConfigService {
    private secrets: vscode.SecretStorage;

    constructor(secrets: vscode.SecretStorage) {
        this.secrets = secrets;
    }

    // ========== API Keys (Secure) ==========

    /**
     * Sauvegarde la cle API de maniere securisee
     */
    async setApiKey(provider: string, apiKey: string): Promise<void> {
        await this.secrets.store(`${API_KEY_PREFIX}${provider}`, apiKey);
        vscode.window.showInformationMessage(`Cle API ${provider} enregistree`);
    }

    /**
     * Recupere la cle API (retourne undefined si non definie)
     */
    async getApiKey(provider: string): Promise<string | undefined> {
        return await this.secrets.get(`${API_KEY_PREFIX}${provider}`);
    }

    /**
     * Supprime la cle API
     */
    async deleteApiKey(provider: string): Promise<void> {
        await this.secrets.delete(`${API_KEY_PREFIX}${provider}`);
    }

    // ========== Settings (Non-sensitive) ==========

    getProvider(): string {
        return vscode.workspace.getConfiguration('aiVisualEditor')
            .get<string>('aiProvider', 'mock');
    }

    getGroqModel(): string {
        return vscode.workspace.getConfiguration('aiVisualEditor')
            .get<string>('groqModel', 'llama-3.1-70b-versatile');
    }

    getOllamaModel(): string {
        return vscode.workspace.getConfiguration('aiVisualEditor')
            .get<string>('ollamaModel', 'llama3.2');
    }

    getOllamaUrl(): string {
        return vscode.workspace.getConfiguration('aiVisualEditor')
            .get<string>('ollamaUrl', 'http://localhost:11434');
    }
}
```

### 3. Commandes de Configuration

```typescript
// src/extension/commands/configCommands.ts
import * as vscode from 'vscode';
import { ConfigService } from '../utils/config';

export function registerConfigCommands(
    context: vscode.ExtensionContext,
    configService: ConfigService
): void {

    // Commande: Configurer Groq
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiVisualEditor.setGroqApiKey',
            async () => {
                const apiKey = await vscode.window.showInputBox({
                    title: 'Cle API Groq',
                    prompt: 'Entrez votre cle API Groq (obtenez-la sur groq.com)',
                    password: true,
                    validateInput: (value) => {
                        if (!value || value.length < 10) {
                            return 'Cle API invalide';
                        }
                        return null;
                    }
                });

                if (apiKey) {
                    await configService.setApiKey('groq', apiKey);
                }
            }
        )
    );

    // Commande: Configurer Ollama
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiVisualEditor.setOllamaUrl',
            async () => {
                const url = await vscode.window.showInputBox({
                    title: 'URL Ollama',
                    prompt: 'Entrez l\'URL du serveur Ollama',
                    value: 'http://localhost:11434',
                    validateInput: (value) => {
                        if (!value.startsWith('http')) {
                            return 'URL invalide';
                        }
                        return null;
                    }
                });

                if (url) {
                    const config = vscode.workspace.getConfiguration('aiVisualEditor');
                    await config.update('ollamaUrl', url, true);
                    vscode.window.showInformationMessage('URL Ollama mise a jour');
                }
            }
        )
    );

    // Commande: Configurer OpenAI
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiVisualEditor.setOpenAiApiKey',
            async () => {
                const apiKey = await vscode.window.showInputBox({
                    title: 'Cle API OpenAI',
                    prompt: 'Entrez votre cle API OpenAI',
                    password: true
                });

                if (apiKey) {
                    await configService.setApiKey('openai', apiKey);
                }
            }
        )
    );

    // Commande: Voir la configuration actuelle
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiVisualEditor.showConfig',
            async () => {
                const provider = configService.getProvider();
                const groqKey = await configService.getApiKey('groq');
                const openaiKey = await configService.getApiKey('openai');
                
                vscode.window.showInformationMessage(
                    `Provider: ${provider} | Groq: ${groqKey ? 'Configure' : 'Non'} | OpenAI: ${openaiKey ? 'Configure' : 'Non'}`
                );
            }
        )
    );
}
```

### 4. Initialisation dans main.ts

```typescript
// src/extension/main.ts
import * as vscode from 'vscode';
import { ConfigService } from './utils/config';
import { registerConfigCommands } from './commands/configCommands';

export function activate(context: vscode.ExtensionContext) {
    
    // Initialiser le service de configuration
    const configService = new ConfigService(context.secrets);
    
    // Enregistrer les commandes de configuration
    registerConfigCommands(context, configService);
    
    // Passer configService aux autres services
    const aiService = new AIService(configService);
    // ...
}
```

### 5. Ajout au menu contextuel (package.json)

```json
{
  "menus": {
    "commandPalette": [
      {
        "command": "aiVisualEditor.setGroqApiKey",
        "when": "true",
        "title": "AI Visual Editor: Configurer Groq"
      }
    ]
  }
}
```

## Flux Utilisateur

### Premiere utilisation

```
1. L'utilisateur installe l'extension
2. Il appuie sur Ctrl+Alt+E (start preview)
3. Si pas de cle API configuree + provider != mock:
   - Message: "Veuillez configurer votre cle API"
   - Suggestion: Executer la commande "AI Visual Editor: Configurer Groq"
4. L'utilisateur execute la commande
5. Il saisit sa cle (masquee ***)
6. La cle est chiffree et enregistree
```

### Verification de la configuration

```
1. File > Preferences > Settings (Ctrl+,)
2. Chercher "aiVisualEditor"
3. Voir les parametres disponibles
4. La cle API n'apparait PAS (securite)
```

## Resume des fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| `package.json` | Ajouter configuration + commandes |
| `src/extension/utils/config.ts` | Creer ConfigService |
| `src/extension/commands/configCommands.ts` | Creer commandes |
| `src/extension/main.ts` | Integrer ConfigService |
| `src/extension/ai/aiService.ts` | Utiliser ConfigService |

## Avantages de cette approche

| Aspect | Benefit |
|--------|---------|
| Securite | SecretStorage chiffre automatiquement |
| UX | InputBox natif VSCode |
| Validation | Verification en temps reel |
| Persistence | Sauvegarde entre les sessions |
| Multi-provider | Supporte Groq, OpenAI, Anthropic |
| Debug | Commande pour voir la config |
