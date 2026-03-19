// AI Service - Handles AI integration
import * as vscode from 'vscode';
import { ElementData, AIResponse, AIProvider } from '../../shared/types';
import { ConfigService } from '../utils/config';
import { AILogger } from './aiLogger';

export class AIService {
    private configService: ConfigService;
    private logger: AILogger | null = null;

    constructor(configService: ConfigService, logger?: AILogger) {
        this.configService = configService;
        this.logger = logger || null;
    }

    /**
     * Get AI suggestion for element modification
     */
    async getSuggestion(elementData: ElementData, instruction: string): Promise<AIResponse | { type: 'error'; message: string; retryable: boolean }> {
        const startTime = Date.now();
        const provider = this.configService.getProvider();
        const prompt = this.buildPrompt(elementData, instruction);
        
        // Log the query
        const queryId = await this.logger?.logQuery({
            provider,
            instruction,
            elementContext: {
                tagName: elementData.tagName,
                id: elementData.id,
                classList: elementData.classList,
                cssSelector: elementData.cssSelector,
                filePath: elementData.filePath
            },
            fullPrompt: prompt
        });

        try {
            let response: AIResponse | { type: 'error'; message: string; retryable: boolean };
            
            switch (provider) {
                case 'mock':
                    response = this.getMockResponse(elementData, instruction);
                    break;
                    
                case 'groq':
                    response = await this.callGroq(prompt);
                    break;
                    
                case 'openai':
                    response = await this.callOpenAI(prompt);
                    break;
                    
                case 'anthropic':
                    response = await this.callAnthropic(prompt);
                    break;
                    
                case 'ollama':
                    response = await this.callOllama(prompt);
                    break;
                    
                default:
                    response = this.getMockResponse(elementData, instruction);
            }

            // Log the answer
            const duration = Date.now() - startTime;
            if ('type' in response && response.type === 'error') {
                await this.logger?.logAnswer({
                    id: queryId || '',
                    success: false,
                    error: {
                        type: 'ai-error',
                        message: response.message,
                        retryable: response.retryable
                    },
                    duration
                });
            } else {
                const aiResponse = response as AIResponse;
                await this.logger?.logAnswer({
                    id: queryId || '',
                    success: true,
                    response: {
                        selector: aiResponse.selector,
                        changes: {
                            css: aiResponse.changes.css,
                            html: aiResponse.changes.html
                        }
                    },
                    duration
                });
            }

            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            // Log the error
            await this.logger?.logAnswer({
                id: queryId || '',
                success: false,
                error: {
                    type: 'exception',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    retryable: true
                },
                duration
            });

            return {
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
                retryable: true
            };
        }
    }

    /**
     * Build prompt for AI with comprehensive instructions
     */
    private buildPrompt(elementData: ElementData, instruction: string): string {
        // Build parent styles context
        let parentStylesContext = '';
        if (elementData.parentStyles && Object.keys(elementData.parentStyles).length > 0) {
            parentStylesContext = '\n### Parent Container Styles (for layout context)\n' + 
                JSON.stringify(elementData.parentStyles, null, 2);
        }

        // Build dimensions context
        let dimensionsContext = '';
        if (elementData.dimensions) {
            dimensionsContext = '\n### Element Dimensions & Position\n' +
                `- Width: ${elementData.dimensions.width}\n` +
                `- Height: ${elementData.dimensions.height}\n` +
                `- Position: ${elementData.dimensions.position}`;
        }

        return `You are an expert CSS/HTML developer. Your task is to understand the user's natural language instruction and implement it correctly.

## CRITICAL RULES
1. ONLY modify the element with selector: ${elementData.cssSelector}
2. NEVER modify any parent, sibling, or other elements  
3. PRESERVE all existing styles - only ADD or MODIFY what's necessary
4. Use the EXACT selector provided
5. Respond ONLY with valid JSON

## CONTEXT
- Tag: ${elementData.tagName}
- ID: ${elementData.id || 'none'}
- Classes: ${elementData.classList.join(' ') || 'none'}
- Current styles: ${JSON.stringify(elementData.styles)}
- Outer HTML: ${elementData.outerHTML}${parentStylesContext}${dimensionsContext}

## USER REQUEST
"${instruction}"

## HOW TO INTERPRET

### LAYOUT & POSITIONING
- "center" (horizontal/vertically/both) → flexbox with justify-content + align-items, or margin: auto
- "space between/distribute" → justify-content: space-between/space-around/space-evenly
- "align items" → align-items: start/center/end/stretch
- "flex direction" → flex-direction: row/column
- "wrap" → flex-wrap: wrap
- "gap" → gap: Xpx
- "grid" → display: grid
- "position absolute/fixed/relative" → position: absolute/fixed/relative
- "place on top/above" → z-index: higher value
- "bring forward/back" → z-index adjustment

### SIZING
- "make bigger/larger/wider/taller" → increase width/height
- "make smaller/narrow" → decrease width/height
- "full width/height" → width: 100% / height: 100%
- "max/min width" → max-width/min-width
- "fit content" → width: fit-content

### COLORS
- "background/color/foreground" → background-color / color property
- Use specific colors: red, blue, green, #hex, rgb(), hsl()
- "transparent/semi-transparent" → rgba() or opacity

### BORDERS & SHAPES
- "rounded/round/circle" → border-radius: Xpx or 50%
- "border" → border: width style color
- "no border" → border: none
- "border color" → border-color

### SPACING
- "margin" → margin (top/right/bottom/left)
- "padding" → padding
- "spacing/gap" → gap or margin

### TYPOGRAPHY
- "font size" → font-size
- "font weight bold" → font-weight: bold
- "font style italic" → font-style: italic
- "underline" → text-decoration: underline
- "line height" → line-height
- "text align left/center/right" → text-align
- "font family" → font-family

### VISIBILITY & EFFECTS
- "hide/invisible" → display: none or visibility: hidden
- "show/visible" → display: block/flex
- "fade/transparent" → opacity: 0.X
- "shadow" → box-shadow
- "blur" → filter: blur()

### ANIMATIONS
- "animate/transition" → transition or @keyframes
- "hover" → :hover pseudo-class in changes.css
- "smooth" → transition: all 0.3s ease

### BACKGROUND
- "background image" → background-image: url('...')
- "background size cover/contain" → background-size
- "background position" → background-position
- "gradient" → background: linear-gradient(...)

### CONTENT (HTML changes)
- "change text to X" → put X in changes.html
- "add icon/emoji" → include emoji in HTML
- "add image" → <img src="..." />
- "add button" → <button>...</button>
- "add link" → <a href="...">...</a>
- "add input" → <input type="..." />
- "add list" → <ul><li>...</li></ul>

### RESPONSIVE
- "mobile/responsive" → use %, rem, vw/vh units
- "stack vertically" → flex-direction: column on mobile

## OUTPUT FORMAT
{
    "selector": "${elementData.cssSelector}",
    "changes": {
        "css": "CSS properties",
        "html": "HTML content or empty"
    }
}`;
    }

    /**
     * Mock response for testing - simulates AI behavior without API call
     */
    private getMockResponse(elementData: ElementData, instruction: string): AIResponse {
        let css = '';
        let html = '';
        const inst = instruction.toLowerCase().trim();

        // CSS patterns with word boundaries - more precise
        const cssPatterns: { pattern: RegExp; css: string }[] = [
            { pattern: /\b(center|centrer|centrer horizontal|centrer vertical)\b/i, 
              css: 'display: flex; justify-content: center; align-items: center;' },
            { pattern: /\b(margin|padding|espacement|space)\b/i, 
              css: 'margin: 20px; padding: 16px;' },
            { pattern: /\b(blue|bleu)\b/i, 
              css: 'background-color: #007bff; color: white;' },
            { pattern: /\b(red|rouge)\b/i, 
              css: 'background-color: #dc3545; color: white;' },
            { pattern: /\b(green|vert)\b/i, 
              css: 'background-color: #28a745; color: white;' },
            { pattern: /\b(bigger|larger|grand|plus grand|wider|taller)\b/i, 
              css: 'width: 200px; height: 200px;' },
            { pattern: /\b(rounded|rond|arrondir)\b/i, 
              css: 'border-radius: 8px;' },
            { pattern: /\b(shadow|ombre)\b/i, 
              css: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15);' },
            { pattern: /\b(hide|cacher|masquer|disparaitre)\b/i, 
              css: 'display: none;' },
            { pattern: /\b(show|afficher|visible)\b/i, 
              css: 'display: block;' },
            { pattern: /\b(bold|gras)\b/i, 
              css: 'font-weight: bold;' },
            { pattern: /\b(italic|italique)\b/i, 
              css: 'font-style: italic;' },
            { pattern: /\b(underline|souligne)\b/i, 
              css: 'text-decoration: underline;' },
            { pattern: /\b(background|fond)\b/i, 
              css: 'background-color: #f0f0f0;' },
            { pattern: /\b(border|bordure)\b/i, 
              css: 'border: 2px solid #333;' },
            { pattern: /\b(opacity|transparent|transparence)\b/i, 
              css: 'opacity: 0.7;' },
            { pattern: /\b(transition|animate|animation)\b/i, 
              css: 'transition: all 0.3s ease;' },
            { pattern: /\b(cursor|pointeur)\b/i, 
              css: 'cursor: pointer;' },
            { pattern: /\b(overflow|debordement)\b/i, 
              css: 'overflow: hidden;' },
            { pattern: /\b(max-width|maxWidth)\b/i, 
              css: 'max-width: 100%;' },
            { pattern: /\b(absolute|position)\b/i, 
              css: 'position: absolute;' },
            { pattern: /\b(z-index|zindex)\b/i, 
              css: 'z-index: 100;' },
            { pattern: /\b(gradient)\b/i, 
              css: 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' },
            { pattern: /\b(blur|flou)\b/i, 
              css: 'filter: blur(5px);' },
            { pattern: /\b(grid)\b/i, 
              css: 'display: grid; gap: 16px;' },
            { pattern: /\b(flex|flexbox)\b/i, 
              css: 'display: flex; gap: 8px;' }
        ];

        // Check for background image - CSS only
        const hasBackgroundImage = /\b(background\s*image|image\s*de\s*fond)\b/i.test(inst) || 
                                   (/\b(background|fond)\b/i.test(inst) && /\b(image)\b/i.test(inst));

        if (hasBackgroundImage) {
            css = "background-image: url('https://via.placeholder.com/400x200'); background-size: cover; background-position: center;";
        } else {
            // Find matching CSS pattern
            for (const { pattern, css: cssValue } of cssPatterns) {
                if (pattern instanceof RegExp && pattern.test(inst)) {
                    css = cssValue;
                    break;
                }
            }
        }

        // HTML patterns - only trigger for explicit content requests (separate check)
        const isButtonRequest = /\b(button|bouton)\b/i.test(inst);
        const isInputRequest = /\b(input|champ)\b/i.test(inst) && !/\b(email|password|phone)\b/i.test(inst);
        const isLinkRequest = /\b(link|lien)\b/i.test(inst);
        const isImageRequest = /\b(image|img)\b/i.test(inst) && !/\b(background|fond)\b/i.test(inst) && !/\bcss\b/i.test(inst);
        const isListRequest = /\b(list|liste)\b/i.test(inst);
        const isIconRequest = /\b(icon|emoji|etoile)\b/i.test(inst) && /\b(add|insert|ajouter|avec)\b/i.test(inst);

        if (isButtonRequest) {
            html = '<button>Click Me</button>';
        } else if (isInputRequest) {
            html = '<input type="text" placeholder="Enter text..." />';
        } else if (isLinkRequest) {
            html = '<a href="#">Link Text</a>';
        } else if (isImageRequest) {
            html = '<img src="https://via.placeholder.com/150" alt="Image" />';
        } else if (isListRequest) {
            html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
        } else if (isIconRequest) {
            html = '⭐';
        }

        // Default: if instruction explicitly mentions changing text content
        if (!html && !css) {
            const textChangeMatch = inst.match(/(?:change|remplacer|texte)\s+(?:to|in|to be)?\s*[:\-]?\s*(.+)/i);
            if (textChangeMatch && !/\bcss\b/i.test(inst)) {
                html = textChangeMatch[1].trim();
            }
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
