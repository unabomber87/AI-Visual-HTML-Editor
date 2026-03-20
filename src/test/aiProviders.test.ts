import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { AIProviders } from '../extension/ai/aiProviders';
import { ConfigService } from '../extension/utils/config';

vi.mock('vscode');

describe('AIProviders', () => {
    let aiProviders: AIProviders;
    let mockConfigService: Partial<ConfigService>;

    beforeEach(() => {
        mockConfigService = {
            getApiKey: vi.fn(),
            getGroqModel: vi.fn().mockReturnValue('llama-3.3-70b-versatile'),
            getOllamaModel: vi.fn().mockReturnValue('llama3.2'),
            getOllamaUrl: vi.fn().mockReturnValue('http://localhost:11434'),
        };

        aiProviders = new AIProviders(mockConfigService as ConfigService);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('callProvider', () => {
        it('should call callGroq for groq provider', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: '{"selector": "div", "changes": {"css": "color: red", "html": ""}}' } }]
                })
            }) as any;

            const result = await aiProviders.callProvider('groq', 'test prompt');

            expect(result).toHaveProperty('selector', 'div');
        });

        it('should call callOpenAI for openai provider', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: '{"selector": "div", "changes": {"css": "color: blue", "html": ""}}' } }]
                })
            }) as any;

            const result = await aiProviders.callProvider('openai', 'test prompt');

            expect(result).toHaveProperty('selector', 'div');
        });

        it('should call callAnthropic for anthropic provider', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    content: [{ text: '{"selector": "div", "changes": {"css": "color: green", "html": ""}}' }]
                })
            }) as any;

            const result = await aiProviders.callProvider('anthropic', 'test prompt');

            expect(result).toHaveProperty('selector', 'div');
        });

        it('should call callOllama for ollama provider', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue(undefined);
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    response: '{"selector": "div", "changes": {"css": "color: yellow", "html": ""}}'
                })
            }) as any;

            const result = await aiProviders.callProvider('ollama', 'test prompt');

            expect(result).toHaveProperty('selector', 'div');
        });

        it('should throw error for unknown provider', async () => {
            await expect(aiProviders.callProvider('unknown', 'test prompt'))
                .rejects.toThrow('Unknown provider: unknown');
        });
    });

    describe('callGroq', () => {
        it('should return error when API key not configured', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue(undefined);

            const result = await aiProviders.callGroq('test prompt');

            expect(result).toEqual({
                type: 'error',
                message: 'Groq API key not configured. Run "AI Visual Editor: Set Groq API Key"',
                retryable: false
            });
        });

        it('should return error when API call fails', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500
            }) as any;

            const result = await aiProviders.callGroq('test prompt');

            expect(result).toHaveProperty('type', 'error');
            if ('type' in result) {
                expect(result.retryable).toBe(true);
            }
        });

        it('should return error for 401 status', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            vi.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401
            }) as any;

            const result = await aiProviders.callGroq('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('retryable', false);
        });

        it('should return error when fetch throws', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

            const result = await aiProviders.callGroq('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('message', 'Network error');
        });

        it('should parse valid JSON response', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            vi.mocked(mockConfigService.getGroqModel).mockReturnValue('mixtral-8x7b');
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: '{"selector": ".test", "changes": {"css": "display: flex;", "html": ""}}' } }]
                })
            }) as any;

            const result = await aiProviders.callGroq('center the element');

            expect(result).toHaveProperty('selector', '.test');
            expect(result).toHaveProperty('changes');
            if ('selector' in result) {
                expect(result.changes.css).toBe('display: flex;');
            }
        });
    });

    describe('callOpenAI', () => {
        it('should return error when API key not configured', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue(undefined);

            const result = await aiProviders.callOpenAI('test prompt');

            expect(result).toEqual({
                type: 'error',
                message: 'OpenAI API key not configured. Run "AI Visual Editor: Set Openai API Key"',
                retryable: false
            });
        });

        it('should return error when API call fails', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500
            }) as any;

            const result = await aiProviders.callOpenAI('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('retryable', true);
        });

        it('should return error for 401 status', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            vi.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401
            }) as any;

            const result = await aiProviders.callOpenAI('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('retryable', false);
        });

        it('should return error when fetch throws', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused')) as any;

            const result = await aiProviders.callOpenAI('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('message', 'Connection refused');
        });
    });

    describe('callAnthropic', () => {
        it('should return error when API key not configured', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue(undefined);

            const result = await aiProviders.callAnthropic('test prompt');

            expect(result).toEqual({
                type: 'error',
                message: 'Anthropic API key not configured. Run "AI Visual Editor: Set Anthropic API Key"',
                retryable: false
            });
        });

        it('should return error when API call fails', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500
            }) as any;

            const result = await aiProviders.callAnthropic('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('retryable', true);
        });

        it('should return error for 401 status', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            vi.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401
            }) as any;

            const result = await aiProviders.callAnthropic('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('retryable', false);
        });

        it('should return error when fetch throws', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockRejectedValue(new Error('Timeout')) as any;

            const result = await aiProviders.callAnthropic('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('message', 'Timeout');
        });
    });

    describe('callOllama', () => {
        it('should return error when API call fails', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404
            }) as any;

            const result = await aiProviders.callOllama('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('retryable', true);
        });

        it('should return error when fetch throws', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Ollama not running')) as any;

            const result = await aiProviders.callOllama('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('message', 'Ollama not running');
        });

        it('should parse valid JSON response', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    response: '{"selector": ".container", "changes": {"css": "margin: 10px;", "html": ""}}'
                })
            }) as any;

            const result = await aiProviders.callOllama('add margin');

            expect(result).toHaveProperty('selector', '.container');
            if ('selector' in result) {
                expect(result.changes.css).toBe('margin: 10px;');
            }
        });
    });

    describe('parseAIResponse', () => {
        it('should parse valid JSON response', () => {
            const content = '{"selector": ".test", "changes": {"css": "color: red", "html": ""}}';

            const result = aiProviders.parseAIResponse(content);

            expect(result).toEqual({
                selector: '.test',
                changes: { css: 'color: red', html: '' }
            });
        });

        it('should extract JSON from markdown code block', () => {
            const content = '```json\n{"selector": ".box", "changes": {"css": "padding: 20px", "html": ""}}\n```';

            const result = aiProviders.parseAIResponse(content);

            expect(result).toHaveProperty('selector', '.box');
            if ('selector' in result) {
                expect(result.changes.css).toBe('padding: 20px');
            }
        });

        it('should extract JSON from text with extra content', () => {
            const content = 'Here is the JSON response: {"selector": "#main", "changes": {"css": "display: block", "html": ""}} - Let me know if you need anything else!';

            const result = aiProviders.parseAIResponse(content);

            expect(result).toHaveProperty('selector', '#main');
        });

        it('should return default when no JSON found', () => {
            const content = 'This is not JSON at all';

            const result = aiProviders.parseAIResponse(content);

            expect(result).toEqual({
                selector: '',
                changes: { css: '/* Could not parse AI response */', html: '' }
            });
        });

        it('should handle invalid JSON', () => {
            const content = '{"selector": ".test", "changes": invalid}';

            const result = aiProviders.parseAIResponse(content);

            expect(result).toEqual({
                selector: '',
                changes: { css: '/* Could not parse AI response */', html: '' }
            });
        });

        it('should handle empty content', () => {
            const result = aiProviders.parseAIResponse('');

            expect(result).toHaveProperty('selector', '');
        });

        it('should handle content with only opening brace', () => {
            const content = '{';

            const result = aiProviders.parseAIResponse(content);

            expect(result).toHaveProperty('selector', '');
        });

        it('should handle partial JSON match', () => {
            const content = '```json\n{"incomplete"\n```';

            const result = aiProviders.parseAIResponse(content);

            expect(result).toHaveProperty('selector', '');
        });

        it('should use provided selector in response', () => {
            const content = '{"selector": ".custom-class", "changes": {"css": "width: 100%", "html": "<div>Test</div>"}}';

            const result = aiProviders.parseAIResponse(content);

            expect(result.selector).toBe('.custom-class');
        });

        it('should use empty string when selector not provided', () => {
            const content = '{"changes": {"css": "color: blue"}}';

            const result = aiProviders.parseAIResponse(content);

            expect(result.selector).toBe('');
        });

        it('should use empty string when css not provided', () => {
            const content = '{"selector": ".test"}';

            const result = aiProviders.parseAIResponse(content);

            if ('selector' in result) {
                expect(result.changes.css).toBe('');
            }
        });

        it('should use empty string when html not provided', () => {
            const content = '{"selector": ".test", "changes": {"css": "color: red"}}';

            const result = aiProviders.parseAIResponse(content);

            if ('selector' in result) {
                expect(result.changes.html).toBe('');
            }
        });
    });

    describe('API Error Handling', () => {
        it('should handle Groq 429 rate limit error', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429
            }) as any;

            const result = await aiProviders.callGroq('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('retryable', true);
        });

        it('should handle OpenAI 429 rate limit error', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429
            }) as any;

            const result = await aiProviders.callOpenAI('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('retryable', true);
        });

        it('should handle Anthropic 429 rate limit error', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429
            }) as any;

            const result = await aiProviders.callAnthropic('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('retryable', true);
        });

        it('should handle network timeout', async () => {
            vi.mocked(mockConfigService.getApiKey).mockResolvedValue('test-key');
            global.fetch = vi.fn().mockRejectedValue(new Error('Request timeout')) as any;

            const result = await aiProviders.callGroq('test prompt');

            expect(result).toHaveProperty('type', 'error');
            expect(result).toHaveProperty('message', 'Request timeout');
            expect(result).toHaveProperty('retryable', true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty JSON object', () => {
            const content = '{}';

            const result = aiProviders.parseAIResponse(content);

            expect(result).toEqual({
                selector: '',
                changes: { css: '', html: '' }
            });
        });

        it('should handle JSON with null values', () => {
            const content = '{"selector": null, "changes": null}';

            const result = aiProviders.parseAIResponse(content);

            expect(result).toHaveProperty('selector', '');
        });

        it('should handle JSON with extra whitespace', () => {
            const content = '  {"selector": ".spaced", "changes": {"css": " ", "html": " "}}  ';

            const result = aiProviders.parseAIResponse(content);

            expect(result).toHaveProperty('selector', '.spaced');
        });

        it('should handle multiple JSON blocks and take first valid match', () => {
            const content = '{"first": true} and then {"selector": ".second", "changes": {"css": "", "html": ""}}';

            const result = aiProviders.parseAIResponse(content);

            expect(result.selector).toBe('');
        });
    });
});
