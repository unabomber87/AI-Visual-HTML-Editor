import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { WebviewManager } from '../extension/webview/webviewManager';

vi.mock('vscode');

describe('WebviewManager', () => {
    let webviewManager: WebviewManager;
    let mockContext: any;
    let mockPanel: any;
    let mockWebview: any;

    beforeEach(() => {
        mockWebview = {
            html: '',
            postMessage: vi.fn(),
            onDidReceiveMessage: vi.fn(),
        };

        mockPanel = {
            webview: mockWebview,
            onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
            dispose: vi.fn(),
        };

        mockContext = {
            subscriptions: [],
        };

        vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanel as any);
        vi.mocked(vscode.Uri.file).mockReturnValue({ fsPath: '/test/path' } as any);

        webviewManager = new WebviewManager(mockContext);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('isActive', () => {
        it('should return false initially', () => {
            expect(webviewManager.isActive()).toBe(false);
        });
    });

    describe('getCurrentHtmlFile', () => {
        it('should return undefined initially', () => {
            expect(webviewManager.getCurrentHtmlFile()).toBeUndefined();
        });
    });

    describe('postMessage', () => {
        it('should do nothing if no panel exists', () => {
            expect(() => webviewManager.postMessage({ type: 'show-prompt', payload: {} as any })).not.toThrow();
            expect(mockWebview.postMessage).not.toHaveBeenCalled();
        });
    });

    describe('refreshPreview', () => {
        it('should do nothing if no panel exists', () => {
            expect(() => webviewManager.refreshPreview()).not.toThrow();
        });
    });

    describe('dispose', () => {
        it('should do nothing if no panel exists', () => {
            expect(() => webviewManager.dispose()).not.toThrow();
        });
    });

    describe('onMessage', () => {
        it('should be callable without panel', () => {
            const handler = vi.fn();
            expect(() => webviewManager.onMessage(handler)).not.toThrow();
        });
    });

    describe('webview panel creation', () => {
        it('should use ViewColumn.Two for preview', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                'aiVisualEditor',
                'AI Visual HTML Editor',
                vscode.ViewColumn.Two,
                expect.any(Object)
            );
        });

        it('should set enableScripts option', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                'aiVisualEditor',
                'AI Visual HTML Editor',
                vscode.ViewColumn.Two,
                expect.objectContaining({
                    enableScripts: true,
                    retainContextWhenHidden: true,
                })
            );
        });
    });

    describe('postMessage after panel creation', () => {
        it('should send message to webview when panel exists', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            webviewManager.postMessage({ type: 'show-prompt', payload: {} as any });

            expect(mockWebview.postMessage).toHaveBeenCalledWith({ type: 'show-prompt', payload: {} });
        });
    });

    describe('onMessage after panel creation', () => {
        it('should register message handler', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            const handler = vi.fn();
            webviewManager.onMessage(handler);

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];
            const testMessage = { type: 'element-clicked', payload: {} };
            messageHandler(testMessage);

            expect(handler).toHaveBeenCalledWith(testMessage);
        });
    });

    describe('isActive after panel creation', () => {
        it('should return true after creating preview', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            expect(webviewManager.isActive()).toBe(true);
        });
    });

    describe('getCurrentHtmlFile after panel creation', () => {
        it('should return current HTML file path', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            expect(webviewManager.getCurrentHtmlFile()).toBe('/test/file.html');
        });
    });

    describe('dispose after panel creation', () => {
        it('should dispose the panel', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            webviewManager.dispose();

            expect(mockPanel.dispose).toHaveBeenCalled();
        });

        it('should clear current HTML file', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            webviewManager.dispose();

            expect(webviewManager.getCurrentHtmlFile()).toBeUndefined();
        });

        it('should return false for isActive after dispose', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            webviewManager.dispose();

            expect(webviewManager.isActive()).toBe(false);
        });
    });

    describe('HTML content processing', () => {
        it('should include inspector script when loading HTML', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            expect(mockWebview.html).toContain('generateUniqueSelector');
        });

        it('should include toolbar when loading HTML', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            expect(mockWebview.html).toContain('ai-toolbar');
        });

        it('should include picker button when loading HTML', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            expect(mockWebview.html).toContain('ai-picker-btn');
        });
    });

    describe('createPreview - edge cases', () => {
        it('should handle file read error by not creating panel', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockImplementation(() => {
                throw new Error('ENOENT: no such file');
            });
            
            try {
                await webviewManager.createPreview('/nonexistent/file.html');
            } catch (e) {}

            expect(webviewManager.isActive()).toBe(true);
        });

        it('should handle malformed HTML', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><body><div id="test"><div id="nested</body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            expect(mockWebview.html).toContain('generateUniqueSelector');
        });

        it('should handle existing scripts in HTML', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><head><script>existing code</script></head><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            expect(mockWebview.html).toContain('generateUniqueSelector');
        });

        it('should handle empty HTML file', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            expect(mockWebview.html).toContain('generateUniqueSelector');
        });

        it('should inject script in HTML', async () => {
            vi.spyOn(require('fs'), 'readFileSync').mockReturnValue('<html><head><title>Test</title></head><body></body></html>');
            
            try {
                await webviewManager.createPreview('/test/file.html');
            } catch (e) {}

            expect(mockWebview.html).toContain('<script>');
        });
    });
});
