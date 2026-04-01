const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
}

export const logger = {
  info:    (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[OK]${colors.reset} ${msg}`),
  warn:    (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error:   (msg) => console.log(`${colors.red}[ERR]${colors.reset} ${msg}`),
  stage:   (name, msg) => console.log(`${colors.gray}[${name.toUpperCase()}]${colors.reset} ${msg}`),
}