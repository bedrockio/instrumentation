const pino = require("pino");

const hooks = {
  logMethod(inputArgs, method) {
    if (inputArgs.length >= 2) {
      const arg1 = inputArgs.shift();
      const arg2 = inputArgs.shift();

      // logger.error("some helper string", error, { foo: true });
      // need to split them into 2 outputs to ensure that error object gets rendered nicely
      // there can only be one message field!
      if (arg2 instanceof Error) {
        method.apply(this, [
          {
            additionalProps: inputArgs.length ? inputArgs : undefined,
          },
          arg1,
        ]);
        return method.apply(this, [arg2]);
      }

      return method.apply(this, [
        {
          details: arg2,
          additionalProps: inputArgs.length ? inputArgs : undefined,
        },
        arg1,
      ]);
    }
    return method.apply(this, inputArgs);
  },
};

const levelToSeverity = {
  trace: "DEBUG",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
  fatal: "CRITICAL",
};

module.exports = pino({
  messageKey: "message",
  formatters: {
    level(label) {
      return {
        severity: levelToSeverity[label],
      };
    },
    log(object) {
      const { err, ...rest } = object;
      const stackTrace = err && err.stack;
      const stackProp = stackTrace ? { stack_trace: stackTrace } : {};
      return {
        ...rest,
        ...stackProp,
      };
    },
  },

  base: null,
  level: process.env.LOG_LEVEL || "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  hooks,
});
