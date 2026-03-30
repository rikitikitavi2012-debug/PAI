import { describe, it, expect } from 'bun:test';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Brigade Dashboard Scripts', () => {
  const scriptsDir = join(process.cwd(), 'config', 'kitty', 'scripts');
  const brigadeWatchPath = join(scriptsDir, 'brigade-watch.sh');
  const a0ChatTailPath = join(scriptsDir, 'a0-chat-tail.sh');
  const libUiPath = join(scriptsDir, 'lib', 'ui.sh');

  it('verifies config/kitty/scripts/lib/ui.sh exists', () => {
    expect(existsSync(libUiPath)).toBe(true);
  });

  it('passes bash -n syntax validation for brigade-watch.sh', async () => {
    const proc = Bun.spawn(['bash', '-n', brigadeWatchPath], { stdout: 'pipe', stderr: 'pipe' });
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;
    expect(proc.exitCode).toBe(0);
    expect(stderr).toBe('');
  });

  it('passes bash -n syntax validation for a0-chat-tail.sh', async () => {
    const proc = Bun.spawn(['bash', '-n', a0ChatTailPath], { stdout: 'pipe', stderr: 'pipe' });
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;
    expect(proc.exitCode).toBe(0);
    expect(stderr).toBe('');
  });

  it('passes shellcheck -S warning (if available)', async () => {
    const whichProc = Bun.spawn(['which', 'shellcheck'], { stdout: 'pipe', stderr: 'pipe' });
    await whichProc.exited;
    if (whichProc.exitCode !== 0) {
      console.log('shellcheck not found, skipping shellcheck tests');
      return;
    }

    const procWatch = Bun.spawn(['shellcheck', '-S', 'warning', brigadeWatchPath], { stdout: 'pipe', stderr: 'pipe' });
    const stdoutWatch = await new Response(procWatch.stdout).text();
    await procWatch.exited;
    expect(procWatch.exitCode).toBe(0);
    expect(stdoutWatch).toBe('');

    const procTail = Bun.spawn(['shellcheck', '-S', 'warning', a0ChatTailPath], { stdout: 'pipe', stderr: 'pipe' });
    const stdoutTail = await new Response(procTail.stdout).text();
    await procTail.exited;
    expect(procTail.exitCode).toBe(0);
    expect(stdoutTail).toBe('');
  });

  describe('a0-chat-tail.sh functions', () => {
    const executeFunction = async (funcCall: string) => {
      // To test isolated functions without running the main loop or exiting early from setup errors,
      // we extract just the functions and source them in a subshell.
      const extractorScript = `
        cat "${a0ChatTailPath}" | awk '
          /^[a-zA-Z_0-9]+[ \t]*\\(\\)[ \t]*\\{/ { in_func=1; print; next }
          in_func && /^\\}/ { print; in_func=0; next }
          in_func { print }
        ' > /tmp/a0-funcs.sh
        source /tmp/a0-funcs.sh
        ${funcCall}
      `;
      const proc = Bun.spawn(['bash', '-c', extractorScript], { stdout: 'pipe', stderr: 'pipe' });
      const stdout = await new Response(proc.stdout).text();
      await proc.exited;
      return stdout.trim();
    };

    it("strip_icon 'icon://chat text' should output 'text'", async () => {
      const output = await executeFunction('strip_icon "icon://chat text"');
      expect(output).toBe('text');
    });

    it("strip_agent_prefix 'A0: text' should output 'text'", async () => {
      const output = await executeFunction('strip_agent_prefix "A0: text"');
      expect(output).toBe('text');
    });

    it("to_local_time with empty string should output '??:??'", async () => {
      const output = await executeFunction('to_local_time ""');
      expect(output).toBe('??:??');
    });
  });
});
