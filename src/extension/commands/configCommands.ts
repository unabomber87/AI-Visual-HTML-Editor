// Configuration commands for API keys
import * as vscode from 'vscode';
import { ConfigService } from '../utils/config';

/**
 * Validate Groq API key by making a test request
 */
async function validateGroqKey(apiKey: string): Promise<boolean> {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Validate OpenAI API key
 */
async function validateOpenAIKey(apiKey: string): Promise<boolean> {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Validate Anthropic API key
 */
async function validateAnthropicKey(apiKey: string): Promise<boolean> {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'test' }]
            })
        });
        // Anthropic returns 400 for this test, but if we get any response, the key is valid
        return response.status !== 401;
    } catch {
        return false;
    }
}

/**
 * Register configuration commands
 */
export function registerConfigCommands(
    context: vscode.ExtensionContext,
    configService: ConfigService
): void {

    // ========== Groq API Key ==========
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiVisualEditor.setGroqApiKey',
            async () => {
                const apiKey = await vscode.window.showInputBox({
                    title: 'Groq API Key',
                    prompt: 'Enter your Groq API key (get it at groq.com)'
                });

                if (!apiKey) return;

                // Validate immediately
                const isValid = await validateGroqKey(apiKey);
                
                if (isValid) {
                    await configService.setApiKey('groq', apiKey);
                    await configService.setProvider('groq');
                    vscode.window.showInformationMessage('Groq API key validated and saved!');
                } else {
                    const retry = await vscode.window.showErrorMessage(
                        'Invalid API key. Please check and try again.',
                        'Retry'
                    );
                    if (retry === 'Retry') {
                        vscode.commands.executeCommand('aiVisualEditor.setGroqApiKey');
                    }
                }
            }
        )
    );

    // ========== OpenAI API Key ==========
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiVisualEditor.setOpenAiApiKey',
            async () => {
                const apiKey = await vscode.window.showInputBox({
                    title: 'OpenAI API Key',
                    prompt: 'Enter your OpenAI API key (get it at platform.openai.com)'
                });

                if (!apiKey) return;

                // Validate immediately
                const isValid = await validateOpenAIKey(apiKey);
                
                if (isValid) {
                    await configService.setApiKey('openai', apiKey);
                    await configService.setProvider('openai');
                    vscode.window.showInformationMessage('OpenAI API key validated and saved!');
                } else {
                    const retry = await vscode.window.showErrorMessage(
                        'Invalid API key. Please check and try again.',
                        'Retry'
                    );
                    if (retry === 'Retry') {
                        vscode.commands.executeCommand('aiVisualEditor.setOpenAiApiKey');
                    }
                }
            }
        )
    );

    // ========== Anthropic API Key ==========
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiVisualEditor.setAnthropicApiKey',
            async () => {
                const apiKey = await vscode.window.showInputBox({
                    title: 'Anthropic API Key',
                    prompt: 'Enter your Anthropic API key (get it at console.anthropic.com)'
                });

                if (!apiKey) return;

                // Validate immediately
                const isValid = await validateAnthropicKey(apiKey);
                
                if (isValid) {
                    await configService.setApiKey('anthropic', apiKey);
                    await configService.setProvider('anthropic');
                    vscode.window.showInformationMessage('Anthropic API key validated and saved!');
                } else {
                    const retry = await vscode.window.showErrorMessage(
                        'Invalid API key. Please check and try again.',
                        'Retry'
                    );
                    if (retry === 'Retry') {
                        vscode.commands.executeCommand('aiVisualEditor.setAnthropicApiKey');
                    }
                }
            }
        )
    );

    // ========== Ollama Configuration ==========
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiVisualEditor.setOllamaUrl',
            async () => {
                const url = await vscode.window.showInputBox({
                    title: 'Ollama URL',
                    prompt: 'Enter Ollama server URL',
                    value: 'http://localhost:11434',
                    validateInput: (value) => {
                        if (!value.startsWith('http')) {
                            return 'URL must start with http:// or https://';
                        }
                        return null;
                    }
                });

                if (url) {
                    await configService.setOllamaUrl(url);
                    await configService.setProvider('ollama');
                    vscode.window.showInformationMessage('Ollama URL configured!');
                }
            }
        )
    );

    // ========== Show Current Configuration ==========
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiVisualEditor.showConfig',
            async () => {
                const provider = configService.getProvider();
                const groqKey = await configService.getApiKey('groq');
                const openaiKey = await configService.getApiKey('openai');
                const anthropicKey = await configService.getApiKey('anthropic');
                const ollamaUrl = configService.getOllamaUrl();
                
                const groqConfigured = groqKey ? 'Configured' : 'Not set';
                const openaiConfigured = openaiKey ? 'Configured' : 'Not set';
                const anthropicConfigured = anthropicKey ? 'Configured' : 'Not set';

                const message = `Current Provider: ${provider}\n` +
                    `Groq: ${groqConfigured}\n` +
                    `OpenAI: ${openaiConfigured}\n` +
                    `Anthropic: ${anthropicConfigured}\n` +
                    `Ollama URL: ${ollamaUrl}`;

                vscode.window.showInformationMessage(message);
            }
        )
    );

    // ========== Reset Configuration ==========
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiVisualEditor.resetConfig',
            async () => {
                const confirm = await vscode.window.showWarningMessage(
                    'Reset all API keys?',
                    { modal: true },
                    'Reset',
                    'Cancel'
                );

                if (confirm === 'Reset') {
                    await configService.deleteApiKey('groq');
                    await configService.deleteApiKey('openai');
                    await configService.deleteApiKey('anthropic');
                    await configService.setProvider('mock');
                    vscode.window.showInformationMessage('Configuration reset to defaults');
                }
            }
        )
    );
}
