import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import {
    ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION
} from "@opentelemetry/semantic-conventions";

export const SERVICE_NAME = "astro-email-worker";

const SERVICE_VERSION = process.env.npm_package_version ?? "1.0.0";
const DEPLOYMENT_ENVIRONMENT =
    process.env.DEPLOYMENT_ENVIRONMENT ??
    process.env.NODE_ENV ??
    (process.env.GITHUB_ACTIONS === "true" ? "production" : "development");

const SEVERITIES = {
    debug: SeverityNumber.DEBUG,
    info: SeverityNumber.INFO,
    warn: SeverityNumber.WARN,
    error: SeverityNumber.ERROR
};

const CONSOLE_METHODS = {
    debug: "debug",
    info: "log",
    warn: "warn",
    error: "error"
};

let loggerProvider;
let otelLogger;
let shutdownPromise;

export function hasOtlpConfiguration(environment = process.env) {
    return Boolean(
        environment.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() &&
        environment.OTEL_EXPORTER_OTLP_HEADERS?.trim()
    );
}

function redactSensitiveText(value) {
    return String(value)
        .replace(
            /\b(Basic|Bearer)\s+[A-Za-z0-9._~+/=-]+/gi,
            "$1 [REDACTED]"
        )
        .replace(
            /([a-z][a-z0-9+.-]*:\/\/)([^\s/@]+(?::[^\s/@]*)?)@/gi,
            "$1[REDACTED]@"
        )
        .replace(
            /\b(password|token|secret|api[_-]?key|authorization)\s*[:=]\s*[^\s,;]+/gi,
            "$1=[REDACTED]"
        );
}

function normalizeAttributeValue(key, value) {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (/password|token|secret|api[_-]?key|authorization/i.test(key)) {
        return "[REDACTED]";
    }

    if (["string", "number", "boolean"].includes(typeof value)) {
        return typeof value === "string" ? redactSensitiveText(value) : value;
    }

    if (Array.isArray(value)) {
        return value
            .filter((item) => ["string", "number", "boolean"].includes(typeof item))
            .map((item) => typeof item === "string" ? redactSensitiveText(item) : item);
    }

    return redactSensitiveText(value);
}

function normalizeAttributes(attributes) {
    return Object.fromEntries(
        Object.entries(attributes)
            .map(([key, value]) => [key, normalizeAttributeValue(key, value)])
            .filter(([, value]) => value !== undefined)
    );
}

function serializeError(error) {
    if (!error) {
        return undefined;
    }

    if (error instanceof Error) {
        return {
            type: error.name,
            message: redactSensitiveText(error.message),
            stack: error.stack ? redactSensitiveText(error.stack) : undefined
        };
    }

    return {
        type: "Error",
        message: redactSensitiveText(error)
    };
}

function initializeOpenTelemetry() {
    const endpointConfigured = Boolean(
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()
    );
    const headersConfigured = Boolean(
        process.env.OTEL_EXPORTER_OTLP_HEADERS?.trim()
    );

    if (!endpointConfigured || !headersConfigured) {
        if (endpointConfigured !== headersConfigured) {
            console.warn(JSON.stringify({
                timestamp: new Date().toISOString(),
                level: "WARN",
                "service.name": SERVICE_NAME,
                message: "Exportação OTLP desabilitada: configuração incompleta"
            }));
        }

        return;
    }

    const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: SERVICE_NAME,
        [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
        [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: DEPLOYMENT_ENVIRONMENT
    });
    const exporter = new OTLPLogExporter();

    loggerProvider = new LoggerProvider({
        resource,
        processors: [new BatchLogRecordProcessor({ exporter })]
    });
    otelLogger = loggerProvider.getLogger(SERVICE_NAME, SERVICE_VERSION);
}

function writeLog(level, message, context, error) {
    const timestamp = new Date();
    const attributes = normalizeAttributes(context);
    const serializedError = serializeError(error);
    const consoleRecord = {
        timestamp: timestamp.toISOString(),
        level: level.toUpperCase(),
        "service.name": SERVICE_NAME,
        "service.version": SERVICE_VERSION,
        environment: DEPLOYMENT_ENVIRONMENT,
        message: redactSensitiveText(message),
        ...attributes
    };

    if (serializedError) {
        consoleRecord.error = serializedError;
    }

    console[CONSOLE_METHODS[level]](JSON.stringify(consoleRecord));

    if (!otelLogger) {
        return;
    }

    const errorAttributes = serializedError
        ? {
            "exception.type": serializedError.type,
            "exception.message": serializedError.message,
            "exception.stacktrace": serializedError.stack
        }
        : {};

    otelLogger.emit({
        timestamp,
        severityNumber: SEVERITIES[level],
        severityText: level.toUpperCase(),
        body: redactSensitiveText(message),
        attributes: normalizeAttributes({
            ...attributes,
            ...errorAttributes
        })
    });
}

export function createLogger(defaultContext = {}) {
    const log = (level, message, context = {}) => {
        const { error, ...attributes } = context;
        writeLog(level, message, { ...defaultContext, ...attributes }, error);
    };

    return {
        debug: (message, context) => log("debug", message, context),
        info: (message, context) => log("info", message, context),
        warn: (message, context) => log("warn", message, context),
        error: (message, context) => log("error", message, context)
    };
}

export async function shutdownObservability() {
    if (!loggerProvider) {
        return;
    }

    if (!shutdownPromise) {
        shutdownPromise = (async () => {
            try {
                await loggerProvider.forceFlush();
            } finally {
                await loggerProvider.shutdown();
            }
        })();
    }

    await shutdownPromise;
}

initializeOpenTelemetry();

export const logger = createLogger();
