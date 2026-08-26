const t0 = Date.now();

function stamp() {
  const s = ((Date.now() - t0) / 1000).toFixed(1).padStart(6);
  return `[${s}s]`;
}

export const log = {
  step(name) {
    console.log(`\n=== ${name} ${'='.repeat(Math.max(4, 60 - name.length))}`);
  },
  info(...args) {
    console.log(stamp(), ...args);
  },
  warn(...args) {
    console.warn(stamp(), 'WARN:', ...args);
  },
  error(...args) {
    console.error(stamp(), 'ERROR:', ...args);
  }
};
