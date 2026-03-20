import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CSSApplier } from '../extension/editor/cssApplier';

vi.mock('fs');

describe('CSSApplier', () => {
    let cssApplier: CSSApplier;
    let tempDir: string;
    let tempFile: string;

    beforeEach(() => {
        cssApplier = new CSSApplier();
        tempDir = '/tmp/test-css-applier';
        tempFile = path.join(tempDir, 'test.html');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('applyCSS - with existing style block', () => {
        const htmlWithStyle = `
<!DOCTYPE html>
<html>
<head>
    <style>
        .existing { color: red; }
    </style>
</head>
<body>
    <div id="test" class="test-class">Content</div>
</body>
</html>`;

        beforeEach(() => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(htmlWithStyle);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
        });

        it('should add new CSS rule to existing style block', async () => {
            const result = await cssApplier.applyCSS(tempFile, '.test-class', 'background-color: blue;');

            expect(result).toBe(true);
            expect(fs.writeFileSync).toHaveBeenCalled();
            const writtenContent = (fs.writeFileSync as any).mock.calls[0][1];
            expect(writtenContent).toContain('.test-class');
            expect(writtenContent).toContain('background-color: blue');
        });

        it('should update existing CSS rule', async () => {
            const result = await cssApplier.applyCSS(tempFile, '.existing', 'color: blue;');

            expect(result).toBe(true);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('should merge styles for same selector', async () => {
            await cssApplier.applyCSS(tempFile, '.existing', 'font-size: 20px;');

            expect(fs.writeFileSync).toHaveBeenCalled();
            const writtenContent = (fs.writeFileSync as any).mock.calls[0][1];
            expect(writtenContent).toContain('font-size: 20px');
        });
    });

    describe('applyCSS - without existing style block', () => {
        const htmlWithoutStyle = `
<!DOCTYPE html>
<html>
<head></head>
<body>
    <div id="test" class="test-class">Content</div>
</body>
</html>`;

        beforeEach(() => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(htmlWithoutStyle);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
        });

        it('should create new style block when none exists', async () => {
            const result = await cssApplier.applyCSS(tempFile, '.test-class', 'color: green;');

            expect(result).toBe(true);
            expect(fs.writeFileSync).toHaveBeenCalled();
            const writtenContent = (fs.writeFileSync as any).mock.calls[0][1];
            expect(writtenContent).toContain('<style>');
            expect(writtenContent).toContain('.test-class');
            expect(writtenContent).toContain('color: green');
        });

        it('should insert style block before </head>', async () => {
            await cssApplier.applyCSS(tempFile, '.test-class', 'color: green;');

            const writtenContent = (fs.writeFileSync as any).mock.calls[0][1];
            expect(writtenContent).toContain('</head>');
            expect(writtenContent.indexOf('<style>')).toBeLessThan(writtenContent.indexOf('</head>'));
        });
    });

    describe('applyCSS - with </body> but no </head>', () => {
        const htmlWithBodyOnly = `
<!DOCTYPE html>
<html>
<body>
    <div id="test" class="test-class">Content</div>
</body>
</html>`;

        beforeEach(() => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(htmlWithBodyOnly);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
        });

        it('should insert style block before </body>', async () => {
            await cssApplier.applyCSS(tempFile, '.test-class', 'color: green;');

            const writtenContent = (fs.writeFileSync as any).mock.calls[0][1];
            expect(writtenContent).toContain('</body>');
            expect(writtenContent.indexOf('<style>')).toBeLessThan(writtenContent.indexOf('</body>'));
        });
    });

    describe('applyCSS - error handling', () => {
        it('should return false on file read error', async () => {
            vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
                throw new Error('Read error');
            });

            const result = await cssApplier.applyCSS(tempFile, '.test-class', 'color: green;');

            expect(result).toBe(false);
        });

        it('should return false on file write error', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue('<html><body></body></html>');
            vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
                throw new Error('Write error');
            });

            const result = await cssApplier.applyCSS(tempFile, '.test-class', 'color: green;');

            expect(result).toBe(false);
        });
    });

    describe('mergeStyles', () => {
        it('should merge existing and new styles', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red; font-size: 14px; }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            await cssApplier.applyCSS(tempFile, '.test', 'background-color: blue;');

            const writtenContent = (fs.writeFileSync as any).mock.calls[0][1];
            expect(writtenContent).toContain('color: red');
            expect(writtenContent).toContain('background-color: blue');
        });

        it('should override existing properties with new ones', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red; }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            await cssApplier.applyCSS(tempFile, '.test', 'color: blue;');

            const writtenContent = (fs.writeFileSync as any).mock.calls[0][1];
            expect(writtenContent).toContain('color: blue');
        });
    });

    describe('undo functionality', () => {
        it('should return false initially when no changes to undo', () => {
            expect(cssApplier.canUndo()).toBe(false);
        });

        it('should return true after applying changes', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red; }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            await cssApplier.applyCSS(tempFile, '.test', 'color: blue;');

            expect(cssApplier.canUndo()).toBe(true);
        });

        it('should successfully undo changes', async () => {
            const originalContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red; }
    </style>
</head>
<body></body>
</html>`;

            vi.spyOn(fs, 'readFileSync').mockReturnValue(originalContent);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            await cssApplier.applyCSS(tempFile, '.test', 'color: blue;');
            const undoResult = await cssApplier.undo();

            expect(undoResult).toBe(true);
            expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
        });

        it('should return false when undo fails', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red; }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            await cssApplier.applyCSS(tempFile, '.test', 'color: blue;');

            vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
                throw new Error('Write error');
            });

            const undoResult = await cssApplier.undo();
            expect(undoResult).toBe(false);
        });
    });

    describe('clearUndoStack', () => {
        it('should clear the undo stack', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red; }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            await cssApplier.applyCSS(tempFile, '.test', 'color: blue;');
            expect(cssApplier.canUndo()).toBe(true);

            cssApplier.clearUndoStack();
            expect(cssApplier.canUndo()).toBe(false);
        });
    });

    describe('applyCSS with special characters in selector', () => {
        it('should escape special regex characters in selector', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red; }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            const result = await cssApplier.applyCSS(tempFile, '.test.class', 'color: green;');

            expect(result).toBe(true);
        });
    });

    describe('applyCSS - CSS features', () => {
        it('should handle pseudo-class selectors', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red; }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            const result = await cssApplier.applyCSS(tempFile, '.test:hover', 'color: blue;');

            expect(result).toBe(true);
        });

        it('should handle pseudo-class :focus selector', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red; }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            const result = await cssApplier.applyCSS(tempFile, '.test:focus', 'outline: none;');

            expect(result).toBe(true);
        });

        it('should handle media queries in file', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red; }
        @media (min-width: 768px) {
            .test { font-size: 16px; }
        }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            const result = await cssApplier.applyCSS(tempFile, '.test', 'background: white;');

            expect(result).toBe(true);
        });

        it('should handle !important properties', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red !important; }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            const result = await cssApplier.applyCSS(tempFile, '.test', 'color: blue !important;');

            expect(result).toBe(true);
        });

        it('should handle CSS variables', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { --primary-color: red; }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            const result = await cssApplier.applyCSS(tempFile, '.test', '--primary-color: blue;');

            expect(result).toBe(true);
        });

        it('should insert style without </head> or </body> in minimal HTML', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue('<html><head></head></html>');
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            const result = await cssApplier.applyCSS(tempFile, '.test', 'color: green;');

            expect(result).toBe(true);
            const writtenContent = (fs.writeFileSync as any).mock.calls[0][1];
            expect(writtenContent).toContain('<style>');
        });

        it('should override existing property correctly', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red; font-size: 14px; }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            await cssApplier.applyCSS(tempFile, '.test', 'color: blue; font-size: 16px;');

            const writtenContent = (fs.writeFileSync as any).mock.calls[0][1];
            expect(writtenContent).toContain('color: blue');
            expect(writtenContent).toContain('font-size: 16px');
        });

        it('should handle empty CSS content', async () => {
            vi.spyOn(fs, 'readFileSync').mockReturnValue(`
<!DOCTYPE html>
<html>
<head>
    <style>
        .test { color: red; }
    </style>
</head>
<body></body>
</html>`);
            vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

            const result = await cssApplier.applyCSS(tempFile, '.test', '');

            expect(result).toBe(true);
        });
    });
});
