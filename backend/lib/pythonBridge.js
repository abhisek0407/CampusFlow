import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// When AI_SERVICE_URL is set (production: AI service on its own Render service) the solver is
// called over HTTP. When it is not set (local dev) the old behaviour is kept: spawn python.
export function aiServiceConfig() {
  const url = (process.env.AI_SERVICE_URL || '').trim().replace(/\/$/, '');
  if (!url) return null;
  return { url, secret: process.env.AI_SERVICE_SECRET || '' };
}

export async function callAiService(route, payload, timeoutMs) {
  const cfg = aiServiceConfig();
  const controller = new AbortController();
  // + 30s grace: a sleeping Render instance needs time to wake up before it starts solving.
  const timer = setTimeout(() => controller.abort(), timeoutMs + 30000);
  try {
    const res = await fetch(`${cfg.url}/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Secret': cfg.secret },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error(`AI service returned non-JSON (HTTP ${res.status}): ${text.slice(0, 120)}`);
    }
    if (!res.ok || parsed.error) {
      throw new Error(parsed.error || parsed.detail || `AI service error (HTTP ${res.status})`);
    }
    return parsed;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`AI service timed out after ${timeoutMs + 30000}ms for '${route}'`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function runPython(command, payload = {}, timeoutMs = 60000) {
  if (aiServiceConfig()) return callAiService(command, payload, timeoutMs);

  const pythonBin = process.env.PYTHON_BIN || 'python';

  let dirName = '';
  try {
    dirName = path.dirname(fileURLToPath(import.meta.url));
  } catch (e) {
    dirName = __dirname || '';
  }

  const possiblePaths = [
    path.resolve(dirName, '../../AI-service/api_entry.py'),
    path.resolve(process.cwd(), '../AI-service/api_entry.py'),
    path.resolve(process.cwd(), 'AI-service/api_entry.py'),
    path.resolve(process.cwd(), '../../AI-service/api_entry.py'),
  ];

  const apiEntryPath = possiblePaths.find((p) => p && fs.existsSync(p));
  if (!apiEntryPath) {
    throw new Error('AI-service/api_entry.py not found');
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonBin, [apiEntryPath, command]);
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
      reject(new Error(`Python bridge timed out after ${timeoutMs}ms for command '${command}'`));
    }, timeoutMs);

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (!stdout.trim()) {
        console.error(`Python bridge '${command}' exited with code ${code}, stderr:`, stderr);
        return reject(new Error(`Python bridge returned empty output (exit code ${code})`));
      }

      try {
        const parsed = JSON.parse(stdout);
        if (code !== 0 || parsed.error) {
          return reject(new Error(parsed.error || `Python command '${command}' failed with exit code ${code}`));
        }
        resolve(parsed);
      } catch (err) {
        console.error(`Python JSON parse error for '${command}':`, stdout, stderr);
        reject(new Error(`Failed to parse Python bridge output: ${err.message}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });

    // Write input payload to stdin
    try {
      proc.stdin.write(JSON.stringify(payload));
      proc.stdin.end();
    } catch (writeErr) {
      clearTimeout(timer);
      reject(new Error(`Failed to write payload to Python stdin: ${writeErr.message}`));
    }
  });
}

export async function checkBooking(draft, schedule) {
  return runPython('check_booking', { draft, schedule }, 25000);
}

export async function repair(disruption, schedule, timeLimit = 30, workers = 4) {
  return runPython('repair', { disruption, schedule, time_limit: timeLimit, workers }, (timeLimit + 15) * 1000);
}

export default {
  runPython,
  checkBooking,
  repair,
};
