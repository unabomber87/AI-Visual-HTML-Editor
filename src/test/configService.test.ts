import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { ConfigService } from '../extension/utils/config';
import { AIProvider } from '../shared/types';

vi.mock('vscode');

describe('ConfigService', () => {
    let configService: ConfigService;
    let mockSecrets: vscode.SecretStorage;
    let mockWorkspace: typeof vscode.workspace;

    beforeEach(() => {
        mockSecrets = {
            store: vi.fn().mockResolvedValue(undefined),
            get: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
        } as unknown as vscode.SecretStorage;

        mockWorkspace = {
            getConfiguration: vi.fn().mockReturnValue({
                get: vi.fn().mockReturnValue('mock'),
                update: vi.fn().mockResolvedValue(undefined),
            }),
        } as unknown as typeof vscode.workspace;

        vi.spyOn(vscode, 'workspace', 'get').mockReturnValue(mockWorkspace);

        configService = new ConfigService(mockSecrets);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('setApiKey', () => {
        it('should store API key securely', async () => {
            await configService.setApiKey('openai', 'test-api-key');

            expect(mockSecrets.store).toHaveBeenCalledWith(
                'aiVisualEditor.apiKey.openai',
                'test-api-key'
            );
        });

        it('should store API key for groq provider', async () => {
            await configService.setApiKey('groq', 'groq-api-key');

            expect(mockSecrets.store).toHaveBeenCalledWith(
                'aiVisualEditor.apiKey.groq',
                'groq-api-key'
            );
        });

        it('should store API key for anthropic provider', async () => {
            await configService.setApiKey('anthropic', 'anthropic-api-key');

            expect(mockSecrets.store).toHaveBeenCalledWith(
                'aiVisualEditor.apiKey.anthropic',
                'anthropic-api-key'
            );
        });
    });

    describe('getApiKey', () => {
        it('should retrieve API key', async () => {
            vi.mocked(mockSecrets.get).mockResolvedValue('test-api-key');

            const result = await configService.getApiKey('openai');

            expect(mockSecrets.get).toHaveBeenCalledWith('aiVisualEditor.apiKey.openai');
            expect(result).toBe('test-api-key');
        });

        it('should return undefined when API key not found', async () => {
            vi.mocked(mockSecrets.get).mockResolvedValue(undefined);

            const result = await configService.getApiKey('openai');

            expect(result).toBeUndefined();
        });
    });

    describe('deleteApiKey', () => {
        it('should delete API key', async () => {
            await configService.deleteApiKey('openai');

            expect(mockSecrets.delete).toHaveBeenCalledWith('aiVisualEditor.apiKey.openai');
        });
    });

    describe('getProvider', () => {
        it('should return configured AI provider', () => {
            const mockConfig = {
                get: vi.fn().mockReturnValue('groq'),
            };
            vi.spyOn(mockWorkspace, 'getConfiguration').mockReturnValue(mockConfig as any);

            const result = configService.getProvider();

            expect(mockConfig.get).toHaveBeenCalledWith('aiProvider', 'mock');
            expect(result).toBe('groq');
        });

        it('should return mock as default provider', () => {
            const mockConfig = {
                get: vi.fn().mockReturnValue('mock'),
            };
            vi.spyOn(mockWorkspace, 'getConfiguration').mockReturnValue(mockConfig as any);

            const result = configService.getProvider();

            expect(result).toBe('mock');
        });
    });

    describe('setProvider', () => {
        it('should update AI provider configuration', async () => {
            const mockConfig = {
                update: vi.fn().mockResolvedValue(undefined),
            };
            vi.spyOn(mockWorkspace, 'getConfiguration').mockReturnValue(mockConfig as any);

            await configService.setProvider('openai');

            expect(mockConfig.update).toHaveBeenCalledWith('aiProvider', 'openai', true);
        });
    });

    describe('getGroqModel', () => {
        it('should return configured Groq model', () => {
            const mockConfig = {
                get: vi.fn().mockReturnValue('mixtral-8x7b-32768'),
            };
            vi.spyOn(mockWorkspace, 'getConfiguration').mockReturnValue(mockConfig as any);

            const result = configService.getGroqModel();

            expect(mockConfig.get).toHaveBeenCalledWith('groqModel', 'llama-3.3-70b-versatile');
            expect(result).toBe('mixtral-8x7b-32768');
        });

        it('should return default Groq model', () => {
            const mockConfig = {
                get: vi.fn().mockReturnValue('llama-3.3-70b-versatile'),
            };
            vi.spyOn(mockWorkspace, 'getConfiguration').mockReturnValue(mockConfig as any);

            const result = configService.getGroqModel();

            expect(result).toBe('llama-3.3-70b-versatile');
        });
    });

    describe('getOllamaModel', () => {
        it('should return configured Ollama model', () => {
            const mockConfig = {
                get: vi.fn().mockReturnValue('codellama'),
            };
            vi.spyOn(mockWorkspace, 'getConfiguration').mockReturnValue(mockConfig as any);

            const result = configService.getOllamaModel();

            expect(mockConfig.get).toHaveBeenCalledWith('ollamaModel', 'llama3.2');
            expect(result).toBe('codellama');
        });

        it('should return default Ollama model', () => {
            const mockConfig = {
                get: vi.fn().mockReturnValue('llama3.2'),
            };
            vi.spyOn(mockWorkspace, 'getConfiguration').mockReturnValue(mockConfig as any);

            const result = configService.getOllamaModel();

            expect(result).toBe('llama3.2');
        });
    });

    describe('getOllamaUrl', () => {
        it('should return configured Ollama URL', () => {
            const mockConfig = {
                get: vi.fn().mockReturnValue('http://custom-ollama:11434'),
            };
            vi.spyOn(mockWorkspace, 'getConfiguration').mockReturnValue(mockConfig as any);

            const result = configService.getOllamaUrl();

            expect(mockConfig.get).toHaveBeenCalledWith('ollamaUrl', 'http://localhost:11434');
            expect(result).toBe('http://custom-ollama:11434');
        });

        it('should return default Ollama URL', () => {
            const mockConfig = {
                get: vi.fn().mockReturnValue('http://localhost:11434'),
            };
            vi.spyOn(mockWorkspace, 'getConfiguration').mockReturnValue(mockConfig as any);

            const result = configService.getOllamaUrl();

            expect(result).toBe('http://localhost:11434');
        });
    });

    describe('setOllamaUrl', () => {
        it('should update Ollama URL configuration', async () => {
            const mockConfig = {
                update: vi.fn().mockResolvedValue(undefined),
            };
            vi.spyOn(mockWorkspace, 'getConfiguration').mockReturnValue(mockConfig as any);

            await configService.setOllamaUrl('http://custom:11434');

            expect(mockConfig.update).toHaveBeenCalledWith('ollamaUrl', 'http://custom:11434', true);
        });
    });

    describe('getPreviewPort', () => {
        it('should return configured preview port', () => {
            const mockConfig = {
                get: vi.fn().mockReturnValue(4000),
            };
            vi.spyOn(mockWorkspace, 'getConfiguration').mockReturnValue(mockConfig as any);

            const result = configService.getPreviewPort();

            expect(mockConfig.get).toHaveBeenCalledWith('previewPort', 3000);
            expect(result).toBe(4000);
        });

        it('should return default preview port', () => {
            const mockConfig = {
                get: vi.fn().mockReturnValue(3000),
            };
            vi.spyOn(mockWorkspace, 'getConfiguration').mockReturnValue(mockConfig as any);

            const result = configService.getPreviewPort();

            expect(result).toBe(3000);
        });
    });
});
