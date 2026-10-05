const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const stamp = () => new Date().toLocaleTimeString('fa-IR', { hour12: false });

const write = (color: string, label: string, args: unknown[]) => {
  // eslint-disable-next-line no-console
  console.log(`${colors.gray}[${stamp()}]${colors.reset} ${color}${label}${colors.reset}`, ...args);
};

export const logger = {
  info: (...args: unknown[]) => write(colors.cyan, 'INFO ', args),
  success: (...args: unknown[]) => write(colors.green, 'OK   ', args),
  warn: (...args: unknown[]) => write(colors.yellow, 'WARN ', args),
  error: (...args: unknown[]) => write(colors.red, 'ERROR', args),
};