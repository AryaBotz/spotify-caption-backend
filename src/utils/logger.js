const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || "info"];

function formatTime() {
  return new Date().toISOString();
}

export const logger = {
  error: (msg, err) => {
    if (LOG_LEVELS.error <= currentLevel) {
      console.error(`[${formatTime()}] ERROR: ${msg}`, err ? err : "");
    }
  },
  warn: (msg) => {
    if (LOG_LEVELS.warn <= currentLevel) {
      console.warn(`[${formatTime()}] WARN: ${msg}`);
    }
  },
  info: (msg) => {
    if (LOG_LEVELS.info <= currentLevel) {
      console.log(`[${formatTime()}] INFO: ${msg}`);
    }
  },
  debug: (msg) => {
    if (LOG_LEVELS.debug <= currentLevel) {
      console.debug(`[${formatTime()}] DEBUG: ${msg}`);
    }
  }
};
