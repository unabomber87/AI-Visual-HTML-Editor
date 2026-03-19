// AI Service - Handles AI integration
import * as vscode from 'vscode';
import { ElementData, AIResponse, AIProvider } from '../../shared/types';
import { ConfigService } from '../utils/config';

export class AIService {
    private configService: ConfigService;

    constructor(configService: ConfigService) {
        this.configService = configService;
    }

    /**
     * Get AI suggestion for element modification
     */
    async getSuggestion(elementData: ElementData, instruction: string): Promise<AIResponse | { type: 'error'; message: string; retryable: boolean }> {
        try {
            const provider = this.configService.getProvider();
            const prompt = this.buildPrompt(elementData, instruction);
            
            switch (provider) {
                case 'mock':
                    return this.getMockResponse(elementData, instruction);
                    
                case 'groq':
                    return await this.callGroq(prompt);
                    
                case 'openai':
                    return await this.callOpenAI(prompt);
                    
                case 'anthropic':
                    return await this.callAnthropic(prompt);
                    
                case 'ollama':
                    return await this.callOllama(prompt);
                    
                default:
                    return this.getMockResponse(elementData, instruction);
            }
        } catch (error) {
            return {
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
                retryable: true
            };
        }
    }

    /**
     * Build prompt for AI
     */
    private buildPrompt(elementData: ElementData, instruction: string): string {
        return `You are a web developer assistant. Modify ONLY the specified HTML element based on the user's instruction.

IMPORTANT: You MUST use EXACTLY this CSS selector in your response - do NOT use body, *, html, or any parent selector:
${elementData.cssSelector}

CRITICAL RULES:
1. Only modify the specified element with the exact selector above
2. Do NOT modify any other elements
3. Do NOT replace or remove existing styles
4. For CSS changes: Add CSS properties to changes.css
5. For HTML content changes: Add the new HTML content to changes.html
6. NEVER return full HTML or replace the entire page

Element Information:
- Tag: ${elementData.tagName}
- ID: ${elementData.id || 'none'}
- Classes: ${elementData.classList.join(' ') || 'none'}
- Current CSS: ${JSON.stringify(elementData.styles)}
- Outer HTML: ${elementData.outerHTML.substring(0, 200)}

Instruction: "${instruction}"

Respond with ONLY a JSON object in this exact format:
{
    "selector": "${elementData.cssSelector}",
    "changes": {
        "css": "css properties to add/modify (ONLY this specific element)",
        "html": "NEW HTML CONTENT to replace/add inside the element (leave empty if no HTML change needed)"
    }
}

IMPORTANT - When to use each field:
- Use changes.css for: colors, sizes, margins, padding, fonts, display, position, animations, etc.
- Use changes.html for: changing text content, adding images, adding links, adding buttons, structural changes

Example responses:

For instruction "make it bigger":
{
    "selector": "${elementData.cssSelector}",
    "changes": {
        "css": "width: 200px; height: 200px;",
        "html": ""
    }
}

For instruction "change text to Hello World":
{
    "selector": "${elementData.cssSelector}",
    "changes": {
        "css": "",
        "html": "Hello World"
    }
}

For instruction "add a button after this text":
{
    "selector": "${elementData.cssSelector}",
    "changes": {
        "css": "",
        "html": "Existing text <button>Click Me</button>"
    }
}

For instruction "center this element":
{
    "selector": "${elementData.cssSelector}",
    "changes": {
        "css": "display: flex; justify-content: center; align-items: center;",
        "html": ""
    }
}

For instruction "change background to blue":
{
    "selector": "${elementData.cssSelector}",
    "changes": {
        "css": "background-color: #007bff;",
        "html": ""
    }
}

Now respond with the appropriate JSON for the instruction: "${instruction}"`;
    }

    /**
     * Mock response for testing
     */
    private getMockResponse(elementData: ElementData, instruction: string): AIResponse {
        // Simple mock that responds based on keywords
        let css = '';
        let html = '';
        const lowerInstruction = instruction.toLowerCase();
        
        if (lowerInstruction.includes('center')) {
            css = 'display: flex; justify-content: center; align-items: center;';
        } else if (lowerInstruction.includes('margin')) {
            css = 'margin: 20px;';
        } else if (lowerInstruction.includes('color') || lowerInstruction.includes('blue') || lowerInstruction.includes('red')) {
            const color = lowerInstruction.includes('blue') ? '#007bff' : 
                         lowerInstruction.includes('red') ? '#dc3545' : '#000000';
            css = `color: ${color};`;
        } else if (lowerInstruction.includes('bigger') || lowerInstruction.includes('size')) {
            css = 'width: 200px; height: 200px;';
        } else if (lowerInstruction.includes('rounded')) {
            css = 'border-radius: 8px;';
        } else if (lowerInstruction.includes('shadow')) {
            css = 'box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        } else if (lowerInstruction.includes('hide')) {
            css = 'display: none;';
        }
        
        // Handle HTML changes
        if (lowerInstruction.includes('zouba') || lowerInstruction.includes('text') || lowerInstruction.includes('remplacer') || lowerInstruction.includes('change') || lowerInstruction.includes('modify')) {
            // Extract the text to use (everything after keywords)
            html = instruction.replace(/^(zouba|text|remplacer|change|modify)\s*/i, '').trim() || 'Modified Text';
        } else if (lowerInstruction.includes('ajouter') && !lowerInstruction.includes('style')) {
            html = '<span>New Content</span>';
        } else if (lowerInstruction.includes('image') || lowerInstruction.includes('img')) {
            html = '<img src="https://via.placeholder.com/150" alt="New Image" />';
        }

        return {
            selector: elementData.cssSelector,
            changes: {
                css: css,
                html: html
            }
        };
    }

    /**
     * Call Groq API
     */
    private async callGroq(prompt: string): Promise<AIResponse | { type: 'error'; message: string; retryable: boolean }> {
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

    /**
     * Call OpenAI API
     */
    private async callOpenAI(prompt: string): Promise<AIResponse | { type: 'error'; message: string; retryable: boolean }> {
        try {
            const apiKey = await this.configService.getApiKey('openai');
            if (!apiKey) {
                return {
                    type: 'error',
                    message: 'OpenAI API key not configured. Run "AI Visual Editor: Set OpenAI API Key"',
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

    /**
     * Call Anthropic API
     */
    private async callAnthropic(prompt: string): Promise<AIResponse | { type: 'error'; message: string; retryable: boolean }> {
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

    /**
     * Call Ollama (local)
     */
    private async callOllama(prompt: string): Promise<AIResponse | { type: 'error'; message: string; retryable: boolean }> {
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

    /**
     * Parse AI response to extract JSON
     */
    private parseAIResponse(content: string): AIResponse {
        console.log('[AI Service] Raw AI response:', content);
        
        // Try to extract JSON from the response
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
                // Fall through to default
            }
        }

        // Return a default response if parsing fails
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
