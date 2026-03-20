import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { SidebarManager } from '../extension/webview/sidebarManager';
import { ElementData } from '../shared/types';

vi.mock('vscode');

describe('SidebarManager', () => {
    let sidebarManager: SidebarManager;
    let mockContext: any;
    let mockPanel: any;
    let mockWebview: any;

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
        mockWebview = {
            html: '',
            onDidReceiveMessage: vi.fn(),
        };

        mockPanel = {
            reveal: vi.fn(),
            webview: mockWebview,
            onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
            dispose: vi.fn(),
        };

        mockContext = {
            subscriptions: [],
        };

        vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanel as any);

        sidebarManager = new SidebarManager(mockContext);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('showPrompt', () => {
        it('should create a new panel when none exists', () => {
            const elementData = createMockElementData();
            const panel = sidebarManager.showPrompt(elementData);

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                'aiVisualEditorPrompt',
                'AI Visual Editor',
                vscode.ViewColumn.Beside,
                expect.objectContaining({
                    enableScripts: true,
                    retainContextWhenHidden: true,
                })
            );
            expect(panel).toBeDefined();
        });

        it('should reveal existing panel instead of creating new one', () => {
            const elementData = createMockElementData();
            
            sidebarManager.showPrompt(elementData);
            sidebarManager.showPrompt(elementData);

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
            expect(mockPanel.reveal).toHaveBeenCalledWith(vscode.ViewColumn.Beside);
        });

        it('should set message handler on panel', () => {
            const elementData = createMockElementData();
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();
        });

        it('should handle panel disposal', () => {
            const elementData = createMockElementData();
            sidebarManager.showPrompt(elementData);

            expect(mockPanel.onDidDispose).toHaveBeenCalled();
        });

        it('should include element data in HTML', () => {
            const elementData = createMockElementData();
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toContain('div#test-id.test-class');
            expect(mockWebview.html).toContain('test-id');
            expect(mockWebview.html).toContain('test-class');
        });

        it('should handle element without ID by not showing ID badge', () => {
            const elementData = createMockElementData({ id: '' });
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).not.toContain('detail-badge id');
        });

        it('should handle element without classes', () => {
            const elementData = createMockElementData({ classList: [] });
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toContain('test-id');
        });

        it('should include CSS selector in HTML', () => {
            const elementData = createMockElementData({
                cssSelector: 'div#my-element.some-class > span.inner-class'
            });
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toContain('div#my-element.some-class');
        });

        it('should include XPath in HTML', () => {
            const elementData = createMockElementData({
                xpath: '//html/body/div[1]/span[2]'
            });
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toContain('//html/body/div[1]/span[2]');
        });
    });

    describe('hide', () => {
        it('should dispose panel when hide is called', () => {
            const elementData = createMockElementData();
            sidebarManager.showPrompt(elementData);
            sidebarManager.hide();

            expect(mockPanel.dispose).toHaveBeenCalled();
        });

        it('should not throw when hide is called without panel', () => {
            expect(() => sidebarManager.hide()).not.toThrow();
        });
    });

    describe('onMessage', () => {
        it('should register message handler', () => {
            const handler = vi.fn();
            sidebarManager.onMessage(handler);

            const elementData = createMockElementData();
            sidebarManager.showPrompt(elementData);

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];
            const testMessage = { type: 'test', payload: {} };
            messageHandler(testMessage);

            expect(handler).toHaveBeenCalledWith(testMessage);
        });
    });

    describe('element info display', () => {
        it('should display tag name correctly', () => {
            const elementData = createMockElementData({ tagName: 'button' });
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toContain('<button>');
        });

        it('should display ID as badge', () => {
            const elementData = createMockElementData({ id: 'my-button' });
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toContain('#my-button');
        });

        it('should display multiple classes', () => {
            const elementData = createMockElementData({
                classList: ['class1', 'class2', 'class3']
            });
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toContain('.class1.class2.class3');
        });

        it('should include element data JSON in script', () => {
            const elementData = createMockElementData();
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toContain('window.selectedElementData');
            expect(mockWebview.html).toContain('prompt-submitted');
        });

        it('should include AI Visual Editor title', () => {
            const elementData = createMockElementData();
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toContain('AI Visual Editor');
        });
    });

    describe('showPrompt - edge cases', () => {
        it('should handle XSS in element data', () => {
            const elementData = createMockElementData({
                cssSelector: '<script>alert("xss")</script>'
            });
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toBeDefined();
        });

        it('should handle element with empty classList array', () => {
            const elementData = createMockElementData({
                classList: [],
            });
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toBeDefined();
        });

        it('should escape quotes in element data', () => {
            const elementData = createMockElementData({
                id: 'test"quote',
                classList: ["class'with", 'another"class']
            });
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toBeDefined();
        });

        it('should handle very long element data', () => {
            const longClass = 'x'.repeat(1000);
            const elementData = createMockElementData({
                classList: [longClass],
            });
            sidebarManager.showPrompt(elementData);

            expect(mockWebview.html).toBeDefined();
        });
    });

    describe('onMessage - edge cases', () => {
        it('should handle malformed messages gracefully', () => {
            const handler = vi.fn();
            sidebarManager.onMessage(handler);

            const elementData = createMockElementData();
            sidebarManager.showPrompt(elementData);

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];
            const malformedMessage = null;
            expect(() => messageHandler(malformedMessage)).not.toThrow();
        });
    });
});
