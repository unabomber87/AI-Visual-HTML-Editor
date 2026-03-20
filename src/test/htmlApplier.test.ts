import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { HTMLApplier } from '../extension/editor/htmlApplier';

vi.mock('fs');

describe('HTMLApplier', () => {
    let htmlApplier: HTMLApplier;
    let tempDir: string;
    let tempFile: string;

    beforeEach(() => {
        htmlApplier = new HTMLApplier();
        tempDir = '/tmp/test-html-applier';
        tempFile = path.join(tempDir, 'test.html');
        vi.spyOn(fs, 'readFileSync').mockImplementation((filePath: any) => {
            if (filePath === tempFile) {
                return '<html><body><div id="test-id" class="test-class">Hello</div></body></html>';
            }
            throw new Error('File not found');
        });
        vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('determineChangeType', () => {
        it('should return "replace" for "remplacer" instruction', () => {
            expect(htmlApplier.determineChangeType('remplacer le contenu')).toBe('replace');
        });

        it('should return "replace" for "replace" instruction', () => {
            expect(htmlApplier.determineChangeType('replace the text')).toBe('replace');
        });

        it('should return "prepend" for "ajouter au début" instruction', () => {
            expect(htmlApplier.determineChangeType('ajouter au début')).toBe('prepend');
        });

        it('should return "prepend" for "prepend" instruction', () => {
            expect(htmlApplier.determineChangeType('prepend content')).toBe('prepend');
        });

        it('should return "prepend" for "ajouter avant" instruction', () => {
            expect(htmlApplier.determineChangeType('ajouter avant')).toBe('prepend');
        });

        it('should return "append" for "ajouter" instruction', () => {
            expect(htmlApplier.determineChangeType('ajouter du texte')).toBe('append');
        });

        it('should return "append" for "append" instruction', () => {
            expect(htmlApplier.determineChangeType('append content')).toBe('append');
        });

        it('should return "append" for "ajouter après" instruction', () => {
            expect(htmlApplier.determineChangeType('ajouter après')).toBe('append');
        });

        it('should return "setAttribute" for "attribut" instruction', () => {
            expect(htmlApplier.determineChangeType('changer attribut')).toBe('setAttribute');
        });

        it('should return "setAttribute" for "src=" instruction', () => {
            expect(htmlApplier.determineChangeType('change src= to something')).toBe('setAttribute');
        });

        it('should return "setAttribute" for "class=" instruction', () => {
            expect(htmlApplier.determineChangeType('change class= to something')).toBe('setAttribute');
        });

        it('should return "setAttribute" for "id=" instruction', () => {
            expect(htmlApplier.determineChangeType('change id= to something')).toBe('setAttribute');
        });

        it('should return default "replace" for unknown instruction', () => {
            expect(htmlApplier.determineChangeType('unknown action')).toBe('replace');
        });
    });

    describe('applyHTML', () => {
        it('should apply HTML changes successfully', async () => {
            const result = await htmlApplier.applyHTML(
                tempFile,
                'div#test-id',
                '<span>New Content</span>',
                'replace'
            );

            expect(result).toBe(true);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('should handle file read error', async () => {
            vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
                throw new Error('Read error');
            });

            const result = await htmlApplier.applyHTML(
                tempFile,
                'div#test-id',
                '<span>New Content</span>',
                'replace'
            );

            expect(result).toBe(false);
        });

        it('should handle file write error', async () => {
            vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
                throw new Error('Write error');
            });

            const result = await htmlApplier.applyHTML(
                tempFile,
                'div#test-id',
                '<span>New Content</span>',
                'replace'
            );

            expect(result).toBe(false);
        });
    });

    describe('canUndo', () => {
        it('should return false initially', () => {
            expect(htmlApplier.canUndo()).toBe(false);
        });

        it('should return true after applying changes', async () => {
            await htmlApplier.applyHTML(
                tempFile,
                'div#test-id',
                '<span>New Content</span>',
                'replace'
            );

            expect(htmlApplier.canUndo()).toBe(true);
        });
    });

    describe('undo', () => {
        it('should return false when no changes to undo', async () => {
            const result = await htmlApplier.undo();
            expect(result).toBe(false);
        });

        it('should return true after successful undo', async () => {
            await htmlApplier.applyHTML(
                tempFile,
                'div#test-id',
                '<span>New Content</span>',
                'replace'
            );

            const result = await htmlApplier.undo();
            expect(result).toBe(true);
        });

        it('should handle undo write error', async () => {
            await htmlApplier.applyHTML(
                tempFile,
                'div#test-id',
                '<span>New Content</span>',
                'replace'
            );

            vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
                throw new Error('Write error');
            });

            const result = await htmlApplier.undo();
            expect(result).toBe(false);
        });
    });

    describe('clearUndoStack', () => {
        it('should clear the undo stack', async () => {
            await htmlApplier.applyHTML(
                tempFile,
                'div#test-id',
                '<span>New Content</span>',
                'replace'
            );

            expect(htmlApplier.canUndo()).toBe(true);

            htmlApplier.clearUndoStack();

            expect(htmlApplier.canUndo()).toBe(false);
        });
    });

    describe('determineChangeType - additional attribute tests', () => {
        it('should detect setAttribute for src attribute', () => {
            expect(htmlApplier.determineChangeType('change src= to /image.png')).toBe('setAttribute');
        });

        it('should detect setAttribute for class attribute', () => {
            expect(htmlApplier.determineChangeType('change class= to new-class')).toBe('setAttribute');
        });

        it('should detect setAttribute for id attribute', () => {
            expect(htmlApplier.determineChangeType('change id= to new-id')).toBe('setAttribute');
        });

        it('should return replace for href attribute instruction', () => {
            expect(htmlApplier.determineChangeType('change href= to /page')).toBe('replace');
        });

        it('should return replace for alt attribute instruction', () => {
            expect(htmlApplier.determineChangeType('add alt= to image')).toBe('replace');
        });
    });

    describe('applyHTML - prepend and append operations', () => {
        it('should prepend HTML content to existing element', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue('<html><body><div id="test-id">Existing</div></body></html>');

            const result = await htmlApplier.applyHTML(
                tempFile,
                'div#test-id',
                '<span>Prepended</span>',
                'prepend'
            );

            expect(result).toBe(true);
            const writtenContent = (fs.writeFileSync as any).mock.calls[0][1];
            expect(writtenContent).toContain('<span>Prepended</span>');
            expect(writtenContent).toContain('Existing');
        });

        it('should append HTML content to existing element', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue('<html><body><div id="test-id">Existing</div></body></html>');

            const result = await htmlApplier.applyHTML(
                tempFile,
                'div#test-id',
                '<span>Appended</span>',
                'append'
            );

            expect(result).toBe(true);
            const writtenContent = (fs.writeFileSync as any).mock.calls[0][1];
            expect(writtenContent).toContain('Existing');
            expect(writtenContent).toContain('<span>Appended</span>');
        });
    });

    describe('applyHTML - edge cases', () => {
        it('should handle element with class selector', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue('<html><body><div class="test-class">Content</div></body></html>');

            const result = await htmlApplier.applyHTML(
                tempFile,
                '.test-class',
                '<span>Updated</span>',
                'replace'
            );

            expect(result).toBe(true);
        });

        it('should handle element with special chars in selector', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue('<html><body><div class="class-1" id="id-1">Content</div></body></html>');

            const result = await htmlApplier.applyHTML(
                tempFile,
                '.class-1#id-1',
                '<span>Updated</span>',
                'replace'
            );

            expect(result).toBe(true);
        });

        it('should not crash on malformed HTML', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue('<html><body><div id="test-id">Content</body></html>');

            const result = await htmlApplier.applyHTML(
                tempFile,
                'div#test-id',
                '<span>Updated</span>',
                'replace'
            );

            expect(result).toBe(true);
        });

        it('should handle deeply nested elements', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(
                '<html><body><div><div><div><div><div id="test-id">Deep</div></div></div></div></div></body></html>'
            );

            const result = await htmlApplier.applyHTML(
                tempFile,
                'div#test-id',
                '<span>Updated</span>',
                'replace'
            );

            expect(result).toBe(true);
            const writtenContent = (fs.writeFileSync as any).mock.calls[0][1];
            expect(writtenContent).toContain('<span>Updated</span>');
        });
    });
});
