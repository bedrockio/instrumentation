const opentelemetry = require("@opentelemetry/api");

const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const { KoaInstrumentation } = require("@opentelemetry/instrumentation-koa");
const { NodeTracerProvider } = require("@opentelemetry/node");
const {
  // ConsoleSpanExporter,
  SimpleSpanProcessor,
} = require("@opentelemetry/tracing");

const { registerInstrumentations } = require("@opentelemetry/instrumentation");
const { logger, createLogger, loggingMiddleware } = require("./logging");

/**
 * Returns a tracer from the global tracer provider
 * @param {string} [name]
 * @returns {opentelemetry.Tracer}
 */
exports.getTracer = function (name = "global") {
  return opentelemetry.trace.getTracer(name);
};

exports.logger = logger;
exports.createLogger = createLogger;
exports.loggingMiddleware = loggingMiddleware;

function setupTelemetry(
  {
    http = {
      ignoreIncomingPaths: ["/"],
      ignoreOutgoingUrls: [],
    },
  } = { http: {} }
) {
  const provider = new NodeTracerProvider();
  provider.register();

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation({
        ...http,
      }),
      new KoaInstrumentation(),
    ],
    tracerProvider: provider,
  });

  const {
    TraceExporter,
  } = require("@google-cloud/opentelemetry-cloud-trace-exporter");

  // Configure the span processor to send spans to the exporter
  provider.addSpanProcessor(new SimpleSpanProcessor(new TraceExporter()));
  // provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

  return provider.register();
}

exports.setupTelemetry = setupTelemetry;

exports.initalize = exports.initialize = function (args) {
  console.warn(
    `@bedrockio/instrumentation "initialize" is deprecated please use "setupTelemetry" instead.`
  );
  setupTelemetry(args);
};
