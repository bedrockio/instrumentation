const klour = require("kleur");

const levels = ["trace", "debug", "info", "warn", "error", "fatal"];

class ConsoleLogger {
  _version = "console";
  _level = process.env.LOG_LEVEL || "trace";

  constructor(props = {}) {
    this.props = props;
  }

  child(props) {
    return new ConsoleLogger({ ...this.props, ...props });
  }

  set level(level) {
    this._level = level.toLowerCase();
  }

  get level() {
    return this._level;
  }

  get version() {
    return this._version;
  }

  write(loggerFn, level, message, ...args) {
    if (levels.indexOf(this._level) > levels.indexOf(level)) {
      return;
    }
    loggerFn(this.wrapMessage(message, level), ...args);
  }

  wrapMessage(message, level) {
    let levelStr = level.toUpperCase().padStart(5, " ");
    if (["warn"].includes(level)) {
      levelStr = klour.yellow(levelStr);
    } else if (["error", "fatal"].includes(level)) {
      levelStr = klour.red(levelStr);
    } else {
      levelStr = klour.gray(levelStr);
    }
    return [
      klour.gray(`[${getLocalDate()}]`),
      levelStr,
      ...Object.keys(this.props).map((key) => {
        return `${key}: ${this.props[key]}`;
      }),
      message,
    ].join(' ');

  }

  trace(...args) {
    this.write(console.trace, "trace", ...args);
  }

  debug(...args) {
    this.write(console.debug, "debug", ...args);
  }

  info(...args) {
    this.write(console.info, "info", ...args);
  }

  warn(...args) {
    this.write(console.warn, "warn", ...args);
  }

  error(...args) {
    this.write(console.error, "error", ...args);
  }

  fatal(...args) {
    this.fatal(console.error, "fatal", ...args);
  }
}

function getLocalDate() {
  // Local date in ISO format, no ms.
  let date = new Date();
  date.setTime(date.getTime() - date.getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, -5);
}

module.exports = new ConsoleLogger();
