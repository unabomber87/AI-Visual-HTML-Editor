// AI Providers - Handles external AI API calls
import * as vscode from 'vscode';
import { ConfigService } from '../utils/config';

export interface AIResponse {
    selector: string;
    changes: {
        css: string;
        html: string;
    };
}

export type AIErrorResponse = { type: 'error'; message: string; retryable: boolean };

export class AIProviders {
    constructor(private configService: ConfigService) {}

    async callProvider(provider: string, prompt: string): Promise<AIResponse | AIErrorResponse> {
        switch (provider) {
            case 'groq':
                return await this.callGroq(prompt);
            case 'openai':
                return await this.callOpenAI(prompt);
            case 'anthropic':
                return await this.callAnthropic(prompt);
            case 'ollama':
                return await this.callOllama(prompt);
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    }

    async callGroq(prompt: string): Promise<AIResponse | AIErrorResponse> {
        try {
            const apiKey = await this.configService.getApiKey('groq');
            if (!apiKey) {
                return {
                    type: 'error',
                    message: 'Groq API key not configured. Run "AI Visual Editor: Set Groq API Key"',
                    retryable: false
                };
            }

            const model = this.configService.getGroqModel();
            
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: 'You are a CSS expert. Respond ONLY with valid JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    const action = await vscode.window.showErrorMessage(
                        'Groq API key expired or invalid',
                        'Reconfigure'
                    );
                    if (action === 'Reconfigure') {
                        vscode.commands.executeCommand('aiVisualEditor.setGroqApiKey');
                    }
                    return {
                        type: 'error',
                        message: 'API key expired or invalid',
                        retryable: false
                    };
                }
                throw new Error(`Groq API error: ${response.status}`);
            }

            const data = await response.json() as any;
            const content = data.choices[0]?.message?.content || '';
            
            return this.parseAIResponse(content);
        } catch (error) {
            return {
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to call Groq',
                retryable: true
            };
        }
    }

    async callOpenAI(prompt: string): Promise<AIResponse | AIErrorResponse> {
        try {
            const apiKey = await this.configService.getApiKey('openai');
            if (!apiKey) {
                return {
                    type: 'error',
                    message: 'OpenAI API key not configured. Run "AI Visual Editor: Set Openai API Key"',
                    retryable: false
                };
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: 'You are a CSS expert. Respond ONLY with valid JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    const action = await vscode.window.showErrorMessage(
                        'OpenAI API key expired or invalid',
                        'Reconfigure'
                    );
                    if (action === 'Reconfigure') {
                        vscode.commands.executeCommand('aiVisualEditor.setOpenAiApiKey');
                    }
                    return {
                        type: 'error',
                        message: 'API key expired or invalid',
                        retryable: false
                    };
                }
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json() as any;
            const content = data.choices[0]?.message?.content || '';
            
            return this.parseAIResponse(content);
        } catch (error) {
            return {
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to call OpenAI',
                retryable: true
            };
        }
    }

    async callAnthropic(prompt: string): Promise<AIResponse | AIErrorResponse> {
        try {
            const apiKey = await this.configService.getApiKey('anthropic');
            if (!apiKey) {
                return {
                    type: 'error',
                    message: 'Anthropic API key not configured. Run "AI Visual Editor: Set Anthropic API Key"',
                    retryable: false
                };
            }

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 500,
                    system: 'You are a CSS expert. Respond ONLY with valid JSON.',
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    const action = await vscode.window.showErrorMessage(
                        'Anthropic API key expired or invalid',
                        'Reconfigure'
                    );
                    if (action === 'Reconfigure') {
                        vscode.commands.executeCommand('aiVisualEditor.setAnthropicApiKey');
                    }
                    return {
                        type: 'error',
                        message: 'API key expired or invalid',
                        retryable: false
                    };
                }
                throw new Error(`Anthropic API error: ${response.status}`);
            }

            const data = await response.json() as any;
            const content = data.content[0]?.text || '';
            
            return this.parseAIResponse(content);
        } catch (error) {
            return {
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to call Anthropic',
                retryable: true
            };
        }
    }

    async callOllama(prompt: string): Promise<AIResponse | AIErrorResponse> {
        try {
            const baseUrl = this.configService.getOllamaUrl();
            const model = this.configService.getOllamaModel();

            const response = await fetch(`${baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama error: ${response.status}. Make sure Ollama is running at ${baseUrl}`);
            }

            const data = await response.json() as any;
            const content = data.response || '';
            
            return this.parseAIResponse(content);
        } catch (error) {
            return {
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to call Ollama. Make sure Ollama is running.',
                retryable: true
            };
        }
    }

    parseAIResponse(content: string): AIResponse {
        console.log('[AI Service] Raw AI response:', content);
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log('[AI Service] Parsed JSON:', JSON.stringify(parsed));
                return {
                    selector: parsed.selector || '',
                    changes: {
                        css: parsed.changes?.css || '',
                        html: parsed.changes?.html || ''
                    }
                };
            } catch (e) {
                console.error('[AI Service] JSON parse error:', e);
            }
        }

        console.warn('[AI Service] Could not parse AI response, returning default');
        return {
            selector: '',
            changes: {
                css: '/* Could not parse AI response */',
                html: ''
            }
        };
    }
}
