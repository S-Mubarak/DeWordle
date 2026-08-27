# Prometheus Metrics and Healthcheck Endpoints

> Resolves #1304

## Overview

DeWordle's backend exposes Prometheus-compatible metrics and healthcheck endpoints for operational monitoring. Metrics are collected using `prom-client` in `backend/src/dewordle/metrics/metrics.service.ts`.

## Prometheus Metrics

### Registered Metrics

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Duration of HTTP requests in seconds |
| `http_requests_total` | Counter | `method`, `route`, `status_code` | Total number of HTTP requests |
| `http_errors_total` | Counter | `method`, `route`, `status_code` | Total 4xx and 5xx error responses |
| `db_query_duration_seconds` | Histogram | `operation`, `table` | Duration of database queries in seconds |

### Default Metrics

`prom-client` `collectDefaultMetrics()` automatically registers:

| Metric | Description |
|--------|-------------|
| `process_cpu_user_seconds_total` | User CPU time |
| `process_cpu_system_seconds_total` | System CPU time |
| `process_resident_memory_bytes` | Resident memory |
| `nodejs_heap_size_total_bytes` | V8 heap size |
| `nodejs_eventloop_lag_seconds` | Event loop lag |

### Histogram Buckets

**HTTP Request Duration:**
```
[0.01, 0.05, 0.1, 0.5, 1, 2, 5] seconds
```

**Database Query Duration:**
```
[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1] seconds
```

## Indexer Health Endpoints

### `GET /api/v1/indexer/health`

Returns liveness/readiness signals for load balancer health probes.

**Response:**

```json
{
  "status": "healthy",
  "queueDepth": 0,
  "secondsSinceLastTick": 2.5,
  "totalEventsProcessed": 15420,
  "totalErrors": 3,
  "workerAlive": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `healthy` or `degraded` |
| `queueDepth` | number | Events waiting in queue |
| `secondsSinceLastTick` | number | Time since last event processed |
| `totalEventsProcessed` | number | Cumulative events processed |
| `totalErrors` | number | Cumulative processing errors |
| `workerAlive` | boolean | Whether the indexer worker is running |

### `GET /api/v1/indexer/lag`

Returns stream cursor position and lag metrics for operational dashboards.

**Response:**

```json
{
  "streamCursor": 12345,
  "latestNetworkLedger": 12400,
  "lag": 55,
  "replaySkips": 2,
  "lastUpdated": "2024-08-01T00:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `streamCursor` | number | Last processed ledger sequence |
| `latestNetworkLedger` | number | Latest known network ledger |
| `lag` | number | Difference (network - cursor) |
| `replaySkips` | number | Events skipped due to deduplication |
| `lastUpdated` | string | ISO timestamp of last update |

## Metrics Interceptor

The `MetricsInterceptor` (`backend/src/common/metrics.interceptor.ts`) automatically records:

- Request duration → `http_request_duration_seconds`
- Request count → `http_requests_total`
- Error count → `http_errors_total` (on 4xx/5xx)

## Exposing Metrics

Metrics are exposed at the Prometheus scrape endpoint (configurable). The `MetricsService.getMetrics()` method returns the Prometheus text format:

```
# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/v1/sessions",status_code="200",le="0.1"} 42
...
```

## Rate Limiting Metrics

The `RateLimitHeadersInterceptor` adds `Retry-After` headers on 429 responses. While not a Prometheus metric, the 429 responses are counted in `http_errors_total` with `status_code="429"`.

## Grafana Dashboard

A pre-built Grafana dashboard configuration is available at `docs/GRAFANA_DASHBOARD.json`. Import it into your Grafana instance for pre-configured panels.

## OpenTelemetry Integration

The backend also supports distributed tracing via OpenTelemetry (`backend/src/telemetry/tracing.ts`). When enabled:

- Spans are exported to the configured OTLP endpoint
- Trace context is propagated through HTTP requests
- Enable via `OTEL_ENABLED=true` environment variable

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_ENABLED` | `false` | Enable OpenTelemetry tracing |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318/v1/traces` | OTLP exporter URL |
| `OTEL_SERVICE_NAME` | `dewordle-backend` | Service name in traces |
