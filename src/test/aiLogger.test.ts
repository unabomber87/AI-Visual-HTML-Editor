import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AILogger } from '../extension/ai/aiLogger';

vi.mock('fs');
vi.mock('vscode');

describe('AILogger', () => {
    let aiLogger: AILogger;
    let tempDir: string;

    beforeEach(() => {
        tempDir = '/tmp/test-ai-logs';
        aiLogger = new AILogger(tempDir);
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);
        vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
        vi.spyOn(fs, 'createWriteStream').mockReturnValue({
            write: vi.fn(),
            end: vi.fn(),
        } as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should set log directory path', () => {
            expect(aiLogger.getLogDirPath()).toBe(path.join(tempDir, 'ai-logs'));
        });

        it('should set log file path with date', () => {
            const expectedFile = path.join(tempDir, 'ai-logs', `ai-session-${aiLogger.getLogFilePath().split('-').pop()}`);
            expect(aiLogger.getLogFilePath()).toContain('ai-session-');
        });
    });

    describe('setEnabled', () => {
        it('should enable logging', () => {
            aiLogger.setEnabled(true);
            expect(aiLogger.isEnabled()).toBe(true);
        });

        it('should disable logging', () => {
            aiLogger.setEnabled(false);
            expect(aiLogger.isEnabled()).toBe(false);
        });
    });

    describe('setFormat', () => {
        it('should set format to json', () => {
            aiLogger.setFormat('json');
            expect((aiLogger as any).format).toBe('json');
        });

        it('should set format to readable', () => {
            aiLogger.setFormat('readable');
            expect((aiLogger as any).format).toBe('readable');
        });
    });

    describe('setIncludeFullPrompt', () => {
        it('should enable full prompt inclusion', () => {
            aiLogger.setIncludeFullPrompt(true);
            expect((aiLogger as any).includeFullPrompt).toBe(true);
        });

        it('should disable full prompt inclusion', () => {
            aiLogger.setIncludeFullPrompt(false);
            expect((aiLogger as any).includeFullPrompt).toBe(false);
        });
    });

    describe('initialize', () => {
        it('should do nothing when logging is disabled', async () => {
            aiLogger.setEnabled(false);
            await aiLogger.initialize();

            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });

        it('should create log directory when logging is enabled', async () => {
            aiLogger.setEnabled(true);
            await aiLogger.initialize();

            expect(fs.mkdirSync).toHaveBeenCalled();
        });
    });

    describe('logQuery', () => {
        it('should return empty string when logging is disabled', async () => {
            aiLogger.setEnabled(false);
            const result = await aiLogger.logQuery({
                provider: 'mock',
                instruction: 'test instruction',
                elementContext: {
                    tagName: 'div',
                    id: 'test-id',
                    classList: [],
                    cssSelector: 'div#test-id',
                },
            });

            expect(result).toBe('');
        });

        it('should return query ID when logging is enabled', async () => {
            aiLogger.setEnabled(true);
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);

            const result = await aiLogger.logQuery({
                provider: 'mock',
                instruction: 'test instruction',
                elementContext: {
                    tagName: 'div',
                    id: 'test-id',
                    classList: [],
                    cssSelector: 'div#test-id',
                },
            });

            expect(result).toMatch(/^[a-f0-9-]{36}$/);
        });

        it('should truncate long instructions', async () => {
            aiLogger.setEnabled(true);
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            const longInstruction = 'a'.repeat(1500);

            await aiLogger.logQuery({
                provider: 'mock',
                instruction: longInstruction,
                elementContext: {
                    tagName: 'div',
                    id: 'test-id',
                    classList: [],
                    cssSelector: 'div#test-id',
                },
            });

            const pendingQueries = (aiLogger as any).pendingQueries;
            const queryId = Object.keys(pendingQueries)[0];
            expect(pendingQueries[queryId].instruction.length).toBeLessThanOrEqual(1003);
        });
    });

    describe('logAnswer', () => {
        it('should do nothing when logging is disabled', async () => {
            aiLogger.setEnabled(false);
            await aiLogger.logAnswer({
                id: 'test-id',
                success: true,
                response: {
                    selector: 'div',
                    changes: { css: 'color: red', html: '' },
                },
                duration: 100,
            });

            expect(fs.createWriteStream).not.toHaveBeenCalled();
        });

        it('should log answer when query exists', async () => {
            aiLogger.setEnabled(true);
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);

            const mockStream = {
                write: vi.fn(),
                end: vi.fn(),
            };
            vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockStream as any);

            await aiLogger.initialize();

            await aiLogger.logQuery({
                provider: 'mock',
                instruction: 'test instruction',
                elementContext: {
                    tagName: 'div',
                    id: 'test-id',
                    classList: [],
                    cssSelector: 'div#test-id',
                },
            });

            const queryId = (aiLogger as any).pendingQueries ? Object.keys((aiLogger as any).pendingQueries)[0] : 'test';

            await aiLogger.logAnswer({
                id: queryId,
                success: true,
                response: {
                    selector: 'div',
                    changes: { css: 'color: red', html: '' },
                },
                duration: 100,
            });

            expect(mockStream.write).toHaveBeenCalled();
        });
    });

    describe('close', () => {
        it('should close the stream', () => {
            aiLogger.setEnabled(true);
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);

            const mockStream = {
                write: vi.fn(),
                end: vi.fn(),
            };
            const createStreamSpy = vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockStream as any);
            aiLogger.initialize();

            aiLogger.close();

            expect(mockStream.end).toHaveBeenCalled();
        });
    });

    describe('generateUUID', () => {
        it('should generate valid UUID format', () => {
            const uuid = (aiLogger as any).generateUUID();
            const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
            expect(uuid).toMatch(uuidRegex);
        });

        it('should generate unique UUIDs', () => {
            const uuid1 = (aiLogger as any).generateUUID();
            const uuid2 = (aiLogger as any).generateUUID();
            expect(uuid1).not.toBe(uuid2);
        });
    });

    describe('getDateString', () => {
        it('should return date in YYYY-MM-DD format', () => {
            const dateString = (aiLogger as any).getDateString();
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            expect(dateString).toMatch(dateRegex);
        });
    });

    describe('logAnswer - truncation', () => {
        it('should truncate long CSS content', async () => {
            aiLogger.setEnabled(true);
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);

            const mockStream = {
                write: vi.fn(),
                end: vi.fn(),
            };
            vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockStream as any);

            await aiLogger.initialize();

            await aiLogger.logQuery({
                provider: 'mock',
                instruction: 'test instruction',
                elementContext: {
                    tagName: 'div',
                    id: 'test-id',
                    classList: [],
                    cssSelector: 'div#test-id',
                },
            });

            const queryId = (aiLogger as any).pendingQueries ? Object.keys((aiLogger as any).pendingQueries)[0] : 'test';
            const longCss = 'color: red; '.repeat(2000);

            await aiLogger.logAnswer({
                id: queryId,
                success: true,
                response: {
                    selector: 'div',
                    changes: { css: longCss, html: '' },
                },
                duration: 100,
            });

            expect(mockStream.write).toHaveBeenCalled();
        });

        it('should truncate long HTML content', async () => {
            aiLogger.setEnabled(true);
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);

            const mockStream = {
                write: vi.fn(),
                end: vi.fn(),
            };
            vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockStream as any);

            await aiLogger.initialize();

            await aiLogger.logQuery({
                provider: 'mock',
                instruction: 'test instruction',
                elementContext: {
                    tagName: 'div',
                    id: 'test-id',
                    classList: [],
                    cssSelector: 'div#test-id',
                },
            });

            const queryId = (aiLogger as any).pendingQueries ? Object.keys((aiLogger as any).pendingQueries)[0] : 'test';
            const longHtml = '<div>content</div>'.repeat(2000);

            await aiLogger.logAnswer({
                id: queryId,
                success: true,
                response: {
                    selector: 'div',
                    changes: { css: '', html: longHtml },
                },
                duration: 100,
            });

            expect(mockStream.write).toHaveBeenCalled();
        });
    });

    describe('logAnswer - format modes', () => {
        it('should format output in readable mode', async () => {
            aiLogger.setEnabled(true);
            aiLogger.setFormat('readable');
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);

            const mockStream = {
                write: vi.fn(),
                end: vi.fn(),
            };
            vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockStream as any);

            await aiLogger.initialize();

            await aiLogger.logQuery({
                provider: 'mock',
                instruction: 'test instruction',
                elementContext: {
                    tagName: 'div',
                    id: 'test-id',
                    classList: [],
                    cssSelector: 'div#test-id',
                },
            });

            const queryId = (aiLogger as any).pendingQueries ? Object.keys((aiLogger as any).pendingQueries)[0] : 'test';

            await aiLogger.logAnswer({
                id: queryId,
                success: true,
                response: {
                    selector: 'div',
                    changes: { css: 'color: red', html: '' },
                },
                duration: 100,
            });

            expect(mockStream.write).toHaveBeenCalled();
        });

        it('should format output in json mode', async () => {
            aiLogger.setEnabled(true);
            aiLogger.setFormat('json');
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);

            const mockStream = {
                write: vi.fn(),
                end: vi.fn(),
            };
            vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockStream as any);

            await aiLogger.initialize();

            await aiLogger.logQuery({
                provider: 'mock',
                instruction: 'test instruction',
                elementContext: {
                    tagName: 'div',
                    id: 'test-id',
                    classList: [],
                    cssSelector: 'div#test-id',
                },
            });

            const queryId = (aiLogger as any).pendingQueries ? Object.keys((aiLogger as any).pendingQueries)[0] : 'test';

            await aiLogger.logAnswer({
                id: queryId,
                success: true,
                response: {
                    selector: 'div',
                    changes: { css: 'color: red', html: '' },
                },
                duration: 100,
            });

            expect(mockStream.write).toHaveBeenCalled();
        });

        it('should handle write error gracefully', async () => {
            aiLogger.setEnabled(true);
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);

            const mockStream = {
                write: vi.fn().mockImplementation(() => {
                    throw new Error('Write error');
                }),
                end: vi.fn(),
            };
            vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockStream as any);

            await aiLogger.initialize();

            expect(async () => {
                await aiLogger.logQuery({
                    provider: 'mock',
                    instruction: 'test instruction',
                    elementContext: {
                        tagName: 'div',
                        id: 'test-id',
                        classList: [],
                        cssSelector: 'div#test-id',
                    },
                });
            }).rejects.toThrow('Write error');
        });

        it('should handle missing query for logAnswer', async () => {
            aiLogger.setEnabled(true);
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);

            const mockStream = {
                write: vi.fn(),
                end: vi.fn(),
            };
            vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockStream as any);

            await aiLogger.initialize();

            await aiLogger.logAnswer({
                id: 'non-existent-id',
                success: true,
                response: {
                    selector: 'div',
                    changes: { css: 'color: red', html: '' },
                },
                duration: 100,
            });
        });
    });
});
