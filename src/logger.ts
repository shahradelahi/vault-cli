import chalk from 'chalk';

export function error(...args: unknown[]) {
  log(chalk.red(...args));
}

export function warn(...args: unknown[]) {
  log(chalk.yellow(...args));
}

export function info(...args: unknown[]) {
  log(chalk.cyan(...args));
}

export function success(...args: unknown[]) {
  log(chalk.green(...args));
}

export function highlight(...args: unknown[]) {
  return chalk.cyan(...args);
}

export function log(...args: unknown[]) {
  console.log(...args); // eslint-disable-line no-console
}

export default {
  error,
  warn,
  info,
  success,
  highlight,
  log,
  green: chalk.green,
  yellow: chalk.yellow,
  red: chalk.red,
  gray: chalk.gray,
  cyan: chalk.cyan,
  blue: chalk.blue,
  magenta: chalk.magenta,
  white: chalk.white,
  black: chalk.black,
  bgGreen: chalk.bgGreen,
  bgYellow: chalk.bgYellow,
  bgRed: chalk.bgRed,
  bgGray: chalk.bgGray,
  bgCyan: chalk.bgCyan,
  bgBlue: chalk.bgBlue,
  bgMagenta: chalk.bgMagenta,
  bgWhite: chalk.bgWhite,
  bgBlack: chalk.bgBlack,
};
