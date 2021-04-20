const { logger, createLogger, loggingMiddleware } = require("./logging");

/**
 * Returns a tracer from the global tracer provider
 * @param {string} [name]
 * @returns {opentelemetry.Tracer}
 */
exports.getTracer = function (name = "global") {
  return null;
};

exports.logger = logger;
exports.createLogger = createLogger;
exports.loggingMiddleware = loggingMiddleware;

exports.setupTelemetry = () => {};

exports.initalize = exports.initialize = function (args) {};
