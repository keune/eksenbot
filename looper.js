import './env-config.js';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'child_process';
import { sleep, d } from './helpers.js';
import { checkAndPost } from './eksenbot.js';

const LOCK_FILE = path.join(os.tmpdir(), 'eksenbot-looper.lock');
const PROCESS_TITLE='eksnbt-loopr';
const ONE_MINUTE_AS_MS = 1000 * 60;
const RUN_TIME = process.env.LOOPER_RUN_TIME_MINUTES * ONE_MINUTE_AS_MS; // in milliseconds

const isProcessRunning = () => {
  try {
    const output = execSync('pgrep -f "' + PROCESS_TITLE + '"').toString();
    const processes = output.split('\n').filter(Boolean);
    return processes.length > 1; // More than 1 because the current process is also counted
  } catch (error) {
    return false; // If pgrep fails, assume no process is running
  }
};

const acquireLock = () => {
  try {
    fs.writeFileSync(LOCK_FILE, process.pid.toString(), {flag: 'wx'});
    return true;
  } catch (error) {
    return false;
  }
};

const releaseLock = () => {
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch (error) {
    console.error('Error releasing lock:', error.message);
  }
};

const main = async function() {
  let sigintReceived = false;

  const cleanupAndExit = (reason, shouldReleaseLock = true) => {
    if (reason != 'OK') {
      d(`Cleaning up. Reason: ${reason}`);
    }
    if (shouldReleaseLock) {
      releaseLock();
    }
    d('Cleanup completed. Exiting.');
    process.exit(0);
  };

  process.on('SIGINT', () => {
    d('SIGINT received. Initiating cleanup...');
    sigintReceived = true;
  });

  try {
    if (isProcessRunning()) {
      cleanupAndExit('Another instance is already running', false);
    }

    if (!acquireLock()) {
      cleanupAndExit('Could not acquire lock');
    }

    process.title = PROCESS_TITLE;
    d('Starting looper...');
    const startTime = Date.now();
    let elapsedTime = 0;

    while (elapsedTime < RUN_TIME && !sigintReceived) {
      checkAndPost();

      const totalSleep = ONE_MINUTE_AS_MS;
      const sleepStep = 4 * 1000; // 4 seconds
      for (let si = 0; si < Math.ceil(totalSleep / sleepStep); si++) {
        await sleep(sleepStep);
        if (sigintReceived) {
          throw new Error('SIGINT');
        }
      }

      elapsedTime = Date.now() - startTime;
      d(`Still running... (${Math.floor(elapsedTime / ONE_MINUTE_AS_MS)} minutes elapsed)`);
    }

    if (elapsedTime >= RUN_TIME) {
      d('Finished running.');
    }
  } catch (error) {
    if (error.message != 'SIGINT') {
      console.error('An error occurred:', error.message);
    }
  } finally {
    cleanupAndExit('OK');
  }
};

main().catch((error) => {
  console.error('Unhandled error in main:', error);
  releaseLock();
  process.exit(1);
});
