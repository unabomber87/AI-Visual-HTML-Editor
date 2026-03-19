// AI Visual HTML Editor - Main Extension Entry Point
import * as vscode from 'vscode';
import { WebviewManager } from './webview/webviewManager';
import { SidebarManager } from './webview/sidebarManager';
import { AIService } from './ai/aiService';
import { CSSApplier } from './editor/cssApplier';
import { HTMLApplier } from './editor/htmlApplier';
import { registerCommands } from './commands';
import { registerConfigCommands } from './commands/configCommands';
import { ConfigService } from './utils/config';

// Global state
let webviewManager: WebviewManager | undefined;
let sidebarManager: SidebarManager | undefined;
let aiService: AIService | undefined;
let cssApplier: CSSApplier | undefined;
let htmlApplier: HTMLApplier | undefined;
let configService: ConfigService | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Extension activation entry point
 * Called when the extension is first activated
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log('[AI Visual Editor] Extension activating...');

    try {
        // Initialize ConfigService with SecretStorage
        configService = new ConfigService(context.secrets);
        
        // Initialize services
        const provider = configService.getProvider();
        aiService = new AIService(configService);
        cssApplier = new CSSApplier();
        htmlApplier = new HTMLApplier();
        webviewManager = new WebviewManager(context);
        sidebarManager = new SidebarManager(context);

        // Register VSCode commands
        registerCommands(context, webviewManager, sidebarManager, aiService, cssApplier, htmlApplier, configService);
        
        // Register configuration commands
        registerConfigCommands(context, configService);

        // Create status bar item
        statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        statusBarItem.text = '$(eye) AI Preview';
        statusBarItem.tooltip = 'Start AI Visual HTML Preview';
        statusBarItem.command = 'aiVisualEditor.startPreview';
        statusBarItem.show();

        // Show welcome message (only if no API key configured)
        showWelcomeMessage();

        console.log('[AI Visual Editor] Extension activated successfully');
    } catch (error) {
        console.error('[AI Visual Editor] Activation error:', error);
        vscode.window.showErrorMessage(`Failed to activate extension: ${error}`);
    }
}

/**
 * Extension deactivation
 * Called when VSCode shuts down or the extension is disabled
 */
export function deactivate(): void {
    console.log('[AI Visual Editor] Extension deactivated');

    // Cleanup
    webviewManager?.dispose();
    webviewManager = undefined;
    aiService = undefined;
    cssApplier = undefined;
        htmlApplier = undefined;
    configService = undefined;
}

/**
 * Show welcome message on first activation
 */
async function showWelcomeMessage(): Promise<void> {
    // Check if any API key is already configured
    const hasGroqKey = await configService?.getApiKey('groq');
    const hasOpenAIKey = await configService?.getApiKey('openai');
    const hasAnthropicKey = await configService?.getApiKey('anthropic');
    
    if (hasGroqKey || hasOpenAIKey || hasAnthropicKey) {
        // API keys are already configured, skip welcome message
        return;
    }
    
    const action = vscode.window.showInformationMessage(
        '🎨 AI Visual Editor installed! Click here to configure AI or press Ctrl+Alt+E to start.',
        'Configure AI'
    );

    action.then((selected) => {
        if (selected === 'Configure AI') {
            vscode.commands.executeCommand('aiVisualEditor.setGroqApiKey');
        }
    });
}
