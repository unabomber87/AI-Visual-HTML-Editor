// Configuration utility for extension settings
import * as vscode from 'vscode';
import { AIProvider } from '../../shared/types';

const API_KEY_PREFIX = 'aiVisualEditor.apiKey.';

export class ConfigService {
    private secrets: vscode.SecretStorage;

    constructor(secrets: vscode.SecretStorage) {
        this.secrets = secrets;
    }

    // ========== API Keys (Secure - using SecretStorage) ==========

    /**
     * Save API key securely
     */
    async setApiKey(provider: string, apiKey: string): Promise<void> {
        await this.secrets.store(`${API_KEY_PREFIX}${provider}`, apiKey);
    }

    /**
     * Get API key (returns undefined if not set)
     */
    async getApiKey(provider: string): Promise<string | undefined> {
        return await this.secrets.get(`${API_KEY_PREFIX}${provider}`);
    }

    /**
     * Delete API key
     */
    async deleteApiKey(provider: string): Promise<void> {
        await this.secrets.delete(`${API_KEY_PREFIX}${provider}`);
    }

    // ========== Settings (Non-sensitive) ==========

    /**
     * Get current AI provider
     */
    getProvider(): AIProvider {
        return vscode.workspace.getConfiguration('aiVisualEditor')
            .get<AIProvider>('aiProvider', 'mock');
    }

    /**
     * Set AI provider
     */
    async setProvider(provider: AIProvider): Promise<void> {
        const config = vscode.workspace.getConfiguration('aiVisualEditor');
        await config.update('aiProvider', provider, true);
    }

    /**
     * Get Groq model
     */
    getGroqModel(): string {
        return vscode.workspace.getConfiguration('aiVisualEditor')
            .get<string>('groqModel', 'llama-3.3-70b-versatile');
    }

    /**
     * Get Ollama model
     */
    getOllamaModel(): string {
        return vscode.workspace.getConfiguration('aiVisualEditor')
            .get<string>('ollamaModel', 'llama3.2');
    }

    /**
     * Get Ollama URL
     */
    getOllamaUrl(): string {
        return vscode.workspace.getConfiguration('aiVisualEditor')
            .get<string>('ollamaUrl', 'http://localhost:11434');
    }

    /**
     * Set Ollama URL
     */
    async setOllamaUrl(url: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('aiVisualEditor');
        await config.update('ollamaUrl', url, true);
    }

    /**
     * Get preview port
     */
    getPreviewPort(): number {
        return vscode.workspace.getConfiguration('aiVisualEditor')
            .get<number>('previewPort', 3000);
    }
}

/**
 * Legacy function for backward compatibility
 */
export function getExtensionConfig() {
    const config = vscode.workspace.getConfiguration('aiVisualEditor');
    
    return {
        aiProvider: config.get<AIProvider>('aiProvider', 'mock'),
        openAIApiKey: '',
        previewPort: config.get<number>('previewPort', 3000)
    };
}
