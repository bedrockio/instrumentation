const opentelemetry = require("@opentelemetry/api");
const klour = require("kleur");

const bytes = require("bytes");

const NODE_ENV = process.env.NODE_ENV;

const parentLogger =
  NODE_ENV === "production"
    ? require("./loggers/pino")
    : require("./loggers/console");

function getTracerContext() {
  const tracer = opentelemetry.trace.getTracer("http");
  if (!tracer.getCurrentSpan) return null;
  const currentSpan = tracer.getCurrentSpan();
  if (!currentSpan) return null;
  return currentSpan.context();
}

function formatCurrentTrace({ traceId, spanId }) {
  return {
    "logging.googleapis.com/spanId": spanId,
    "logging.googleapis.com/trace": traceId,
    "logging.googleapis.com/trace_sampled": true,
  };
}

/**
 * @returns {import('pino').Logger} Logger
 */
function createLogger(options = {}, tracingEnabled) {
  const globalContext = tracingEnabled && getTracerContext();
  const globalContextFields = globalContext
    ? formatCurrentTrace(globalContext)
    : {};

  return parentLogger.child({
    ...globalContextFields,
    ...options,
  });
}

exports.createLogger = createLogger;

const formatters = {
  // https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
  gcloud: function ({ request, response, latency }) {
    const contentLength = response.getHeader("content-length");
    const formatLength = contentLength ? bytes(Number(contentLength)) : "?KB";

    return {
      message: `${request.method} ${request.url} ${formatLength} - ${latency}ms`,
      httpRequest: {
        requestMethod: request.method.toUpperCase(),
        requestUrl: request.url,
        requestSize: contentLength,
        status: response.statusCode,
        userAgent: request.headers["user-agent"],
        referer: request.headers["referer"],
        remoteIp: request.headers["x-forwarded-for"],
        latency: `${Math.floor(latency / 1e3)}.${Math.floor(latency % 1e3)}s`,
        protocol: request.headers["x-forwarded-proto"],
        responseSize: response.getHeader("content-length"),
      },
    };
  },
  development: function ({ request, response, latency }) {
    const { method, url } = request;
    const { statusCode: status } = response;
    const contentLength = response.getHeader("content-length");
    const formatLength = contentLength ? bytes(Number(contentLength)) : "?KB";
    const meta = `${latency}ms ${formatLength}`;
    return `${klour.white(method)} ${klour.green(status)} ${klour.gray(
      url
    )} ${klour.gray(meta)}`;
  },
};

const levelToHttp = {
  401: "warn",
  400: "warn",
  404: "error",
  500: "error",
};

function onResFinished(
  loggerInstance,
  httpRequestFormat,
  startTime,
  request,
  response
) {
  const latency = Date.now() - startTime;
  const level = levelToHttp[response.statusCode] || "info";

  const payload = httpRequestFormat({
    response,
    request,
    latency: latency,
  });

  if (Array.isArray(payload)) {
    loggerInstance[level](...payload);
  } else {
    loggerInstance[level](payload);
  }
}

exports.loggingMiddleware = function loggingMiddleware(options = {}) {
  const { httpRequestFormat, ignoreUserAgents, tracingEnabled } = {
    ignoreUserAgents: [/GoogleHC\/.*/i, /kube-probe\/.*/i],
    tracingEnabled: NODE_ENV === "production",
    httpRequestFormat:
      NODE_ENV === "production" ? formatters.gcloud : formatters.development,
    ...options,
  };

  async function loggingMiddlewareInner(ctx, next) {
    const { req, res } = ctx;

    const startTime = Date.now();
    const requestLogger = createLogger({}, tracingEnabled);

    ctx.logger = requestLogger;

    if (ignoreUserAgents.some((rx) => rx.test(ctx.request.get("user-agent")))) {
      return next();
    }

    if (NODE_ENV === "test") {
      return next();
    }

    res.once("finish", () =>
      onResFinished(requestLogger, httpRequestFormat, startTime, req, res)
    );
    res.once("error", (err) =>
      onResFinished(requestLogger, httpRequestFormat, startTime, req, res, err)
    );
    return next();
  }

  return loggingMiddlewareInner;
};

exports.logger = parentLogger;
