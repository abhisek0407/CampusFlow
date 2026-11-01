import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

import { aiServiceConfig, callAiService } from './pythonBridge';

export async function runValidator({ scheduleData, disruptionData = null, baselineData = null }) {
  // Production: validate on the AI service (it has Python + the dataset); local dev: spawn python below.
  if (aiServiceConfig()) {
    return callAiService(
      'validate',
      { schedule: scheduleData, disruption: disruptionData, baseline: baselineData },
      120000
    );
  }

  const tmpDir = path.resolve(process.cwd(), '../tmp_validator');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const timestamp = Date.now();
  const schedulePath = path.join(tmpDir, `schedule_${timestamp}.json`);
  const reportPath = path.join(tmpDir, `report_${timestamp}.json`);
  fs.writeFileSync(schedulePath, JSON.stringify(scheduleData, null, 2), 'utf8');

  let dataPath = path.resolve(process.cwd(), '../CrunchWeek_StarterPack/data/cit_public.json');
  if (!fs.existsSync(dataPath)) {
    dataPath = path.resolve(process.cwd(), 'CrunchWeek_StarterPack/data/cit_public.json');
  }

  let validatorPath = path.resolve(process.cwd(), '../CrunchWeek_StarterPack/validator.py');
  if (!fs.existsSync(validatorPath)) {
    validatorPath = path.resolve(process.cwd(), 'CrunchWeek_StarterPack/validator.py');
  }

  const args = [
    validatorPath,
    '--data', dataPath,
    '--schedule', schedulePath,
    '--json', reportPath,
  ];

  let disruptionPath = null;
  if (disruptionData) {
    disruptionPath = path.join(tmpDir, `disruption_${timestamp}.json`);
    fs.writeFileSync(disruptionPath, JSON.stringify(disruptionData, null, 2), 'utf8');
    args.push('--disruption', disruptionPath);
  }

  let baselinePath = null;
  if (baselineData) {
    baselinePath = path.join(tmpDir, `baseline_${timestamp}.json`);
    fs.writeFileSync(baselinePath, JSON.stringify(baselineData, null, 2), 'utf8');
    args.push('--baseline', baselinePath);
  }

  const pythonBin = process.env.PYTHON_BIN || 'python';

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonBin, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      try {
        let report = null;
        if (fs.existsSync(reportPath)) {
          report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        }

        // Clean up temporary files
        try {
          if (fs.existsSync(schedulePath)) fs.unlinkSync(schedulePath);
          if (fs.existsSync(reportPath)) fs.unlinkSync(reportPath);
          if (disruptionPath && fs.existsSync(disruptionPath)) fs.unlinkSync(disruptionPath);
          if (baselinePath && fs.existsSync(baselinePath)) fs.unlinkSync(baselinePath);
        } catch (cleanupErr) {
          // ignore cleanup errors
        }

        resolve({
          exitCode: code,
          stdout,
          stderr,
          report: report || { raw_output: stdout },
        });
      } catch (err) {
        reject(err);
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}
