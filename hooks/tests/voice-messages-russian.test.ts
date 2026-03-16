import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = readdirSync(dirPath);

    files.forEach((file) => {
        // Skip hidden files/directories, tests, and PAI-Install
        if (file.startsWith('.') || file === 'tests' || file === 'PAI-Install') return;

        const fullPath = join(dirPath, file);
        try {
            if (statSync(fullPath).isDirectory()) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            } else {
                if (fullPath.endsWith('.ts') || fullPath.endsWith('.md')) {
                    arrayOfFiles.push(fullPath);
                }
            }
        } catch (e) {
            // ignore broken symlinks etc
        }
    });

    return arrayOfFiles;
}

describe("Voice notification messages", () => {
    test("verify all voice messages in curl calls are in Russian", () => {
        let files: string[] = [];
        const dirs = ['hooks', 'PAI/Tools', 'skills', 'agents'];
        dirs.forEach(dir => {
            try { files = getAllFiles(dir, files); } catch (e) {}
        });

        const cyrillicRegex = /[а-яА-Я]/;
        const badStartsRegex = /^(Running|Loading|Starting|Checking)/i;

        let failedFiles: { file: string, line: number, message: string, reason: string }[] = [];

        files.forEach((file) => {
            const lines = readFileSync(file, 'utf-8').split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (line.trim().startsWith('//')) continue;
                if (line.includes('console.error')) continue;

                if (line.includes('localhost:8888/notify')) {
                    // Try to match standard fetch or other notification calls too
                    const messageMatch = line.match(/"message"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/) ||
                                         line.match(/"message"\s*:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/) ||
                                         line.match(/message\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/) ||
                                         line.match(/message\s*:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/);

                    if (messageMatch && messageMatch[1]) {
                        processMessage(file, i + 1, messageMatch[1]);
                    }
                }
            }

            // Re-run with the multi-line curl parser
            let inCurl = false;
            let currentLineStr = '';
            let startLineNum = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (line.trim().startsWith('//')) continue;
                if (line.includes('console.error')) continue;

                if (line.includes('curl') && line.includes('localhost:8888/notify')) {
                    if (line.endsWith('\\')) {
                        inCurl = true;
                        currentLineStr = line.slice(0, -1).trim() + ' ';
                        startLineNum = i + 1;
                    } else {
                        processCurlCall(file, i + 1, line);
                    }
                } else if (inCurl) {
                    if (line.endsWith('\\')) {
                        currentLineStr += line.slice(0, -1).trim() + ' ';
                    } else {
                        currentLineStr += line.trim();
                        inCurl = false;
                        processCurlCall(file, startLineNum, currentLineStr);
                        currentLineStr = '';
                    }
                }
            }
        });

        function processMessage(file: string, lineNum: number, message: string) {
            // Check if already in failedFiles
            if (failedFiles.some(f => f.file === file && f.line === lineNum)) return;

            // Skip variables or placeholders
            if (message.includes('${') || message.includes('{{') || message.includes('<your')) return;

            // Exclude some common placeholders in templates
            if (message === 'Test' || message.includes('WORKFLOWNAME') || message.includes('ACTION')) return;

            if (!cyrillicRegex.test(message)) {
                failedFiles.push({ file, line: lineNum, message, reason: 'No Cyrillic characters found' });
            } else if (badStartsRegex.test(message)) {
                failedFiles.push({ file, line: lineNum, message, reason: 'Starts with prohibited English word' });
            }
        }

        function processCurlCall(file: string, lineNum: number, content: string) {
            // Find the JSON payload, usually after -d
            const messageMatch = content.match(/"message"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/) ||
                                 content.match(/"message"\s*:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/);

            if (messageMatch && messageMatch[1]) {
                processMessage(file, lineNum, messageMatch[1]);
            }
        }

        if (failedFiles.length > 0) {
            console.error('Failed voice messages found:', failedFiles);
        }

        expect(failedFiles.length).toBe(0);
    });
});
