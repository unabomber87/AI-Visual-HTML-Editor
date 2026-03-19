// Command handlers registration
import * as vscode from 'vscode';
import { WebviewManager } from '../webview/webviewManager';
import { SidebarManager } from '../webview/sidebarManager';
import { AIService } from '../ai/aiService';
import { CSSApplier } from '../editor/cssApplier';
import { HTMLApplier } from '../editor/htmlApplier';
import { ConfigService } from '../utils/config';
import { WebviewToExtensionMessage, ElementData, ChangeSet } from '../../shared/types';

export function registerCommands(
    context: vscode.ExtensionContext,
    webviewManager: WebviewManager,
    sidebarManager: SidebarManager,
    aiService: AIService,
    cssApplier: CSSApplier,
    htmlApplier: HTMLApplier,
    configService: ConfigService
): void {
    
    // Command: Start Preview
    const startPreviewCommand = vscode.commands.registerCommand(
        'aiVisualEditor.startPreview',
        async () => {
            // Get the active HTML file
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('Please open an HTML file first');
                return;
            }

            const document = editor.document;
            if (document.languageId !== 'html') {
                vscode.window.showInformationMessage('Please open an HTML file');
                return;
            }

            const filePath = document.uri.fsPath;
            console.log('[AI Visual Editor] Starting preview for:', filePath);

            try {
                await webviewManager.createPreview(filePath);
                vscode.window.showInformationMessage('AI Visual Editor preview started');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to start preview: ${error}`);
            }
        }
    );

    // Command: Stop Preview
    const stopPreviewCommand = vscode.commands.registerCommand(
        'aiVisualEditor.stopPreview',
        () => {
            webviewManager.dispose();
            vscode.window.showInformationMessage('AI Visual Editor preview stopped');
        }
    );

    // Command: Toggle Picker
    const togglePickerCommand = vscode.commands.registerCommand(
        'aiVisualEditor.togglePicker',
        () => {
            if (!webviewManager.isActive()) {
                vscode.window.showInformationMessage('Start the preview first: Press Ctrl+Alt+E');
                return;
            }
            
            // Toggle picker state - we'll track this in the webview
            webviewManager.postMessage({ type: 'enable-picker' as any });
            vscode.window.showInformationMessage('Element picker enabled - click any element in the preview');
        }
    );

    // Command: Refresh Preview
    const refreshPreviewCommand = vscode.commands.registerCommand(
        'aiVisualEditor.refreshPreview',
        () => {
            if (!webviewManager.isActive()) {
                vscode.window.showInformationMessage('Start the preview first: Press Ctrl+Alt+E');
                return;
            }
            
            webviewManager.refreshPreview();
            vscode.window.showInformationMessage('Preview refreshed');
        }
    );

    // Command: Undo Last Change
    const undoCommand = vscode.commands.registerCommand(
        'aiVisualEditor.undo',
        async () => {
            // Try CSS undo first, then HTML undo
            const cssSuccess = await cssApplier.undo();
            const htmlSuccess = await htmlApplier.undo();
            
            if (cssSuccess || htmlSuccess) {
                webviewManager.refreshPreview();
                webviewManager.postMessage({ type: 'hide-undo' as any });
                vscode.window.showInformationMessage('Undo successful - changes reverted');
            } else {
                vscode.window.showWarningMessage('Nothing to undo');
            }
        }
    );

    // Set up message handler from webview
    webviewManager.onMessage(async (message: WebviewToExtensionMessage) => {
        switch (message.type) {
            case 'element-clicked':
                // Show sidebar with element info
                // Keep the highlight visible so user knows which element is selected
                sidebarManager.showPrompt(message.payload);
                break;
                
            case 'apply-confirmed':
                // Apply the changes
                await handleApplyConfirmed(message.payload, cssApplier, htmlApplier, webviewManager);
                break;
                
            case 'apply-cancelled':
                // Hide diff preview
                webviewManager.postMessage({ type: 'hide-diff' as any });
                break;
                
            case 'prompt-submitted':
                // Handle prompt submitted from sidebar
                await handlePromptSubmitted(message.payload, webviewManager, aiService, cssApplier, htmlApplier);
                break;
                
            case 'picker-enabled':
                // Picker was enabled in webview
                break;
                
            case 'picker-disabled':
                // Picker was disabled in webview
                break;
                
            case 'refresh-requested':
                // Handle refresh requested from webview
                webviewManager.refreshPreview();
                break;
            
            case 'undo-request':
                // Handle undo requested from webview
                const cssUndoSuccess = await cssApplier.undo();
                const htmlUndoSuccess = await htmlApplier.undo();
                
                if (cssUndoSuccess || htmlUndoSuccess) {
                    webviewManager.refreshPreview();
                    webviewManager.postMessage({ type: 'hide-undo' as any });
                    vscode.window.showInformationMessage('Undo successful - changes reverted');
                } else {
                    vscode.window.showWarningMessage('Nothing to undo');
                }
                break;
                
            case 'close-sidebar':
                // Close the sidebar when picker is disabled
                sidebarManager.hide();
                break;
                
            case 'open-settings':
                // Show settings quick pick
                showSettingsQuickPick();
                break;
        }
    });

    // Set up message handler from sidebar
    sidebarManager.onMessage(async (message: any) => {
        switch (message.type) {
            case 'prompt-submitted':
                await handlePromptSubmitted(message.payload, webviewManager, aiService, cssApplier, htmlApplier);
                break;
            case 'cancel-prompt':
                // Just close the sidebar
                sidebarManager.hide();
                break;
        }
    });

    // Add commands to context
    context.subscriptions.push(
        startPreviewCommand,
        stopPreviewCommand,
        togglePickerCommand,
        refreshPreviewCommand,
        undoCommand
    );
}

/**
 * Handle element click - show prompt and get AI suggestion
 */
async function handleElementClicked(
    elementData: ElementData,
    webviewManager: WebviewManager,
    aiService: AIService,
    cssApplier: CSSApplier,
    htmlApplier: HTMLApplier
): Promise<void> {
    // Show prompt in webview
    webviewManager.postMessage({ 
        type: 'show-prompt' as any, 
        payload: elementData 
    });

    // Wait for user instruction - this would normally be captured by the webview
    // For MVP, we'll show a quick pick input
    const instruction = await vscode.window.showInputBox({
        prompt: `Modify <${elementData.tagName}#${elementData.id || ''}>`,
        placeHolder: 'e.g., center this element, add margin, make it bigger'
    });

    if (!instruction) {
        webviewManager.postMessage({ type: 'hide-prompt' as any });
        return;
    }

    // Call AI service
    vscode.window.showInformationMessage('Getting AI suggestion...');
    
    const response = await aiService.getSuggestion(elementData, instruction);
    
    if ('type' in response && response.type === 'error') {
        vscode.window.showErrorMessage(`AI Error: ${response.message}`);
        webviewManager.postMessage({ type: 'hide-prompt' as any });
        return;
    }

    const changeSet = response as ChangeSet;

    // Show diff preview
    webviewManager.postMessage({ 
        type: 'show-diff' as any, 
        payload: changeSet 
    });

    // Apply changes
    const apply = await vscode.window.showInformationMessage(
        'Apply these changes?',
        'Yes',
        'No'
    );

    if (apply === 'Yes') {
        await handleApplyConfirmed(changeSet, cssApplier, htmlApplier, webviewManager);
    } else {
        webviewManager.postMessage({ type: 'hide-diff' as any });
    }

    webviewManager.postMessage({ type: 'hide-prompt' as any });
}

/**
 * Handle apply confirmed - write changes to file
 */
async function handleApplyConfirmed(
    changeSet: ChangeSet,
    cssApplier: CSSApplier,
    htmlApplier: HTMLApplier,
    webviewManager: WebviewManager,
    instruction?: string
): Promise<void> {
    const htmlFile = webviewManager.getCurrentHtmlFile();
    if (!htmlFile) {
        vscode.window.showErrorMessage('No HTML file open');
        return;
    }

    try {
        if (changeSet.changes.css) {
            await cssApplier.applyCSS(htmlFile, changeSet.selector, changeSet.changes.css);
        }
        
        if (changeSet.changes.html) {
            // Determine change type based on the instruction (not the HTML content)
            const changeType = htmlApplier.determineChangeType(instruction || changeSet.changes.html);
            await htmlApplier.applyHTML(htmlFile, changeSet.selector, changeSet.changes.html, changeType);
        }

        // Refresh preview
        webviewManager.refreshPreview();
        webviewManager.postMessage({ type: 'show-undo' as any });
        vscode.window.showInformationMessage('Changes applied successfully');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to apply changes: ${error}`);
    }
}

/**
 * Handle prompt submitted from webview - send to AI
 */
async function handlePromptSubmitted(
    payload: { instruction: string; element: ElementData },
    webviewManager: WebviewManager,
    aiService: AIService,
    cssApplier: CSSApplier,
    htmlApplier: HTMLApplier
): Promise<void> {
    const { instruction, element } = payload;
    
    // Call AI service
    vscode.window.showInformationMessage('Getting AI suggestion...');
    
    const response = await aiService.getSuggestion(element, instruction);
    
    if ('type' in response && response.type === 'error') {
        vscode.window.showErrorMessage(`AI Error: ${response.message}`);
        return;
    }

    const changeSet = response as ChangeSet;

    // Apply changes directly (user already confirmed in webview)
    await handleApplyConfirmed(changeSet, cssApplier, htmlApplier, webviewManager, instruction);
}

/**
 * Show settings quick pick menu
 */
function showSettingsQuickPick(): void {
    const items: vscode.QuickPickItem[] = [
        {
            label: '🔑 Groq API Key',
            description: 'Configure Groq API key for AI'
        },
        {
            label: '🔑 OpenAI API Key',
            description: 'Configure OpenAI API key for AI'
        },
        {
            label: '🔑 Anthropic API Key',
            description: 'Configure Anthropic API key for AI'
        },
        {
            label: '⚙️ Ollama Configuration',
            description: 'Configure local Ollama server'
        },
        {
            label: '📋 Show Current Config',
            description: 'View current configuration'
        },
        {
            label: '🔄 Reset All Configuration',
            description: 'Reset all API keys to default'
        }
    ];

    vscode.window.showQuickPick(items, {
        placeHolder: 'Select a setting to configure...'
    }).then(async (selected) => {
        if (!selected) return;

        switch (selected.label) {
            case '🔑 Groq API Key':
                vscode.commands.executeCommand('aiVisualEditor.setGroqApiKey');
                break;
            case '🔑 OpenAI API Key':
                vscode.commands.executeCommand('aiVisualEditor.setOpenAiApiKey');
                break;
            case '🔑 Anthropic API Key':
                vscode.commands.executeCommand('aiVisualEditor.setAnthropicApiKey');
                break;
            case '⚙️ Ollama Configuration':
                vscode.commands.executeCommand('aiVisualEditor.setOllamaUrl');
                break;
            case '📋 Show Current Config':
                vscode.commands.executeCommand('aiVisualEditor.showConfig');
                break;
            case '🔄 Reset All Configuration':
                vscode.commands.executeCommand('aiVisualEditor.resetConfig');
                break;
        }
    });
}
