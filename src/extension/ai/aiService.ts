// AI Service - Handles AI integration
import { ElementData, AIResponse } from '../../shared/types';
import { ConfigService } from '../utils/config';
import { AILogger } from './aiLogger';
import { AIProviders } from './aiProviders';

export class AIService {
    private configService: ConfigService;
    private providers: AIProviders;
    private logger: AILogger | null = null;

    constructor(configService: ConfigService, logger?: AILogger) {
        this.configService = configService;
        this.providers = new AIProviders(configService);
        this.logger = logger || null;
    }

    /**
     * Get AI suggestion for element modification
     */
    async getSuggestion(elementData: ElementData, instruction: string): Promise<AIResponse | { type: 'error'; message: string; retryable: boolean }> {
        const startTime = Date.now();
        const provider = this.configService.getProvider();
        const prompt = this.buildPrompt(elementData, instruction);
        
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
            
            if (provider === 'mock') {
                response = this.getMockResponse(elementData, instruction);
            } else {
                response = await this.providers.callProvider(provider, prompt);
            }

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
        let parentStylesContext = '';
        if (elementData.parentStyles && Object.keys(elementData.parentStyles).length > 0) {
            parentStylesContext = '\n### Parent Container Styles (for layout context)\n' + 
                JSON.stringify(elementData.parentStyles, null, 2);
        }

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

        const hasBackgroundImage = /\b(background\s*image|image\s*de\s*fond)\b/i.test(inst) || 
                                   (/\b(background|fond)\b/i.test(inst) && /\b(image)\b/i.test(inst));

        if (hasBackgroundImage) {
            css = "background-image: url('https://via.placeholder.com/400x200'); background-size: cover; background-position: center;";
        } else {
            for (const { pattern, css: cssValue } of cssPatterns) {
                if (pattern instanceof RegExp && pattern.test(inst)) {
                    css = cssValue;
                    break;
                }
            }
        }

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
}
