import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../extension/ai/aiService';
import { ConfigService } from '../extension/utils/config';
import { ElementData } from '../shared/types';

vi.mock('../extension/utils/config', () => ({
    ConfigService: vi.fn().mockImplementation(() => ({
        getProvider: vi.fn().mockReturnValue('mock'),
        getApiKey: vi.fn().mockResolvedValue(undefined),
        getGroqModel: vi.fn().mockReturnValue('llama-3.3-70b-versatile'),
        getOllamaModel: vi.fn().mockReturnValue('llama3.2'),
        getOllamaUrl: vi.fn().mockReturnValue('http://localhost:11434'),
    })),
}));

describe('AIService', () => {
    let aiService: AIService;
    let mockConfigService: ConfigService;

    const createMockElementData = (overrides: Partial<ElementData> = {}): ElementData => ({
        tagName: 'div',
        id: 'test-id',
        classList: ['test-class', 'another-class'],
        outerHTML: '<div id="test-id" class="test-class another-class">Content</div>',
        innerHTML: 'Content',
        xpath: '//div[@id="test-id"]',
        cssSelector: 'div#test-id.test-class',
        attributes: { id: 'test-id', class: 'test-class another-class' },
        styles: { color: 'red', fontSize: '16px' },
        filePath: '/test/file.html',
        ...overrides,
    });

    beforeEach(() => {
        mockConfigService = new ConfigService({} as any);
        aiService = new AIService(mockConfigService);
    });

    describe('getSuggestion - Mock Provider', () => {
        it('should return mock response for centering instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'center the element');

            expect(result).toHaveProperty('selector', 'div#test-id.test-class');
            expect(result).toHaveProperty('changes');
            expect((result as any).changes.css).toContain('display: flex');
            expect((result as any).changes.css).toContain('justify-content: center');
            expect((result as any).changes.css).toContain('align-items: center');
        });

        it('should return blue color CSS for blue instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'make it blue');

            expect((result as any).changes.css).toContain('background-color: #007bff');
            expect((result as any).changes.css).toContain('color: white');
        });

        it('should return red color CSS for red instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'make it red');

            expect((result as any).changes.css).toContain('background-color: #dc3545');
        });

        it('should return green color CSS for green instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'make it green');

            expect((result as any).changes.css).toContain('background-color: #28a745');
        });

        it('should return larger size CSS for bigger instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'make it bigger');

            expect((result as any).changes.css).toContain('width: 200px');
            expect((result as any).changes.css).toContain('height: 200px');
        });

        it('should return rounded CSS for rounded instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'make it rounded');

            expect((result as any).changes.css).toContain('border-radius: 8px');
        });

        it('should return shadow CSS for shadow instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add shadow');

            expect((result as any).changes.css).toContain('box-shadow');
        });

        it('should return hide CSS for hide instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'hide it');

            expect((result as any).changes.css).toContain('display: none');
        });

        it('should return show CSS for show instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'show it');

            expect((result as any).changes.css).toContain('display: block');
        });

        it('should return bold CSS for bold instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'make it bold');

            expect((result as any).changes.css).toContain('font-weight: bold');
        });

        it('should return italic CSS for italic instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'make it italic');

            expect((result as any).changes.css).toContain('font-style: italic');
        });

        it('should return underline CSS for underline instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add underline');

            expect((result as any).changes.css).toContain('text-decoration: underline');
        });

        it('should return background CSS for background instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add background');

            expect((result as any).changes.css).toContain('background-color: #f0f0f0');
        });

        it('should return border CSS for border instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add border');

            expect((result as any).changes.css).toContain('border: 2px solid #333');
        });

        it('should return opacity CSS for opacity instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'make it transparent');

            expect((result as any).changes.css).toContain('opacity: 0.7');
        });

        it('should return transition CSS for transition instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add transition');

            expect((result as any).changes.css).toContain('transition');
        });

        it('should return cursor CSS for cursor instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'change cursor to pointer');

            expect((result as any).changes.css).toContain('cursor: pointer');
        });

        it('should return overflow CSS for overflow instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add overflow hidden');

            expect((result as any).changes.css).toContain('overflow: hidden');
        });

        it('should return max-width CSS for max-width instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'set max-width 100%');

            expect((result as any).changes.css).toContain('max-width: 100%');
        });

        it('should return position CSS for absolute instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'position absolute');

            expect((result as any).changes.css).toContain('position: absolute');
        });

        it('should return z-index CSS for z-index instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'set z-index to 100');

            expect((result as any).changes.css).toContain('z-index: 100');
        });

        it('should return gradient CSS for gradient instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add gradient');

            expect((result as any).changes.css).toContain('background: linear-gradient');
        });

        it('should return blur CSS for blur instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add blur effect');

            expect((result as any).changes.css).toContain('filter: blur');
        });

        it('should return grid CSS for grid instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'use grid layout');

            expect((result as any).changes.css).toContain('display: grid');
        });

        it('should return flex CSS for flex instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'use flexbox');

            expect((result as any).changes.css).toContain('display: flex');
        });

        it('should add button HTML for button instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add a button');

            expect((result as any).changes.html).toContain('<button');
        });

        it('should add input HTML for input instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add an input field');

            expect((result as any).changes.html).toContain('<input');
        });

        it('should add link HTML for link instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add a link');

            expect((result as any).changes.html).toContain('<a href');
        });

        it('should add image HTML for image instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add an image');

            expect((result as any).changes.html).toContain('<img');
        });

        it('should add list HTML for list instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add a list');

            expect((result as any).changes.html).toContain('<ul>');
        });

        it('should return background image CSS for background image instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add background image');

            expect((result as any).changes.css).toContain('background-image: url');
        });

        it('should handle French instructions (centrer)', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'centrer');

            expect((result as any).changes.css).toContain('display: flex');
        });

        it('should handle French instructions (plus grand)', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'rendre plus grand');

            expect((result as any).changes.css).toContain('width: 200px');
        });

        it('should handle French instructions (arrondir)', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'arrondir les coins');

            expect((result as any).changes.css).toContain('border-radius: 8px');
        });

        it('should handle margin instruction with margin and padding', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add margin');

            expect((result as any).changes.css).toContain('margin: 20px');
            expect((result as any).changes.css).toContain('padding: 16px');
        });
    });

    describe('parseAIResponse', () => {
        it('should parse valid JSON response', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'center') as any;

            expect(result.selector).toBeDefined();
            expect(result.changes).toBeDefined();
            expect(result.changes.css).toBeDefined();
        });

        it('should handle response with selector, css and html', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'add a button') as any;

            expect(result.selector).toBe('div#test-id.test-class');
            expect(result.changes).toHaveProperty('css');
            expect(result.changes).toHaveProperty('html');
        });
    });

    describe('buildPrompt', () => {
        it('should include element context in prompt for AI providers', async () => {
            const elementData = createMockElementData({
                parentStyles: { display: 'flex', gap: '10px' },
                dimensions: { width: '100px', height: '50px', position: 'relative' }
            });

            vi.mocked(mockConfigService.getProvider).mockReturnValue('groq');
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');

            const result = await aiService.getSuggestion(elementData, 'center');

            if ('type' in result && result.type === 'error') {
                expect(result.type).toBe('error');
            } else {
                expect(result).toHaveProperty('selector');
            }
        });

        it('should handle element without ID', async () => {
            const elementData = createMockElementData({ id: '' });
            const result = await aiService.getSuggestion(elementData, 'center');

            expect(result).toHaveProperty('selector');
        });

        it('should handle element without classes', async () => {
            const elementData = createMockElementData({ classList: [] });
            const result = await aiService.getSuggestion(elementData, 'center');

            expect(result).toHaveProperty('selector');
        });

        it('should handle empty instruction gracefully', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, '');

            expect(result).toHaveProperty('selector');
        });

        it('should handle null element data by not crashing', async () => {
            await expect(aiService.getSuggestion(null as any, 'center')).rejects.toThrow();
        });

        it('should handle undefined styles in element', async () => {
            const elementData = createMockElementData({ styles: undefined });
            const result = await aiService.getSuggestion(elementData, 'center');

            expect(result).toHaveProperty('selector');
        });

        it('should handle missing parentStyles', async () => {
            const elementData = createMockElementData({ parentStyles: undefined });
            const result = await aiService.getSuggestion(elementData, 'center');

            expect(result).toHaveProperty('selector');
        });

        it('should handle missing dimensions', async () => {
            const elementData = createMockElementData({ dimensions: undefined });
            const result = await aiService.getSuggestion(elementData, 'center');

            expect(result).toHaveProperty('selector');
        });

        it('should handle very long instruction', async () => {
            const elementData = createMockElementData();
            const longInstruction = 'center the element '.repeat(100);
            const result = await aiService.getSuggestion(elementData, longInstruction);

            expect(result).toHaveProperty('selector');
        });

        it('should handle instruction with special characters', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'center <div> with "quotes" and \'apostrophes\'');

            expect(result).toHaveProperty('selector');
        });

        it('should handle French accents in instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, 'centrer l\'élément avec été');

            expect(result).toHaveProperty('selector');
            expect((result as any).changes.css).toContain('display: flex');
        });

        it('should handle Unicode emoji in instruction', async () => {
            const elementData = createMockElementData();
            const result = await aiService.getSuggestion(elementData, '🔴 make it red');

            expect(result).toHaveProperty('selector');
        });

        it('should handle element with no attributes', async () => {
            const elementData = createMockElementData({
                attributes: {},
                id: '',
                classList: []
            });
            const result = await aiService.getSuggestion(elementData, 'center');

            expect(result).toHaveProperty('selector');
        });
    });
});
