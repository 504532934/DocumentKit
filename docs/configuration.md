# Configuration

| Variable                                 |    Default | Purpose                                           |
| ---------------------------------------- | ---------: | ------------------------------------------------- |
| `DOCUMENTKIT_HOST`                       |  `0.0.0.0` | Listening address                                 |
| `DOCUMENTKIT_PORT`                       |     `3000` | Listening port                                    |
| `DOCUMENTKIT_API_KEY`                    |      unset | Optional bearer token for authenticating requests |
| `DOCUMENTKIT_MAX_CONCURRENCY`            |        `4` | Active Chromium jobs                              |
| `DOCUMENTKIT_MAX_QUEUE`                  |       `32` | Waiting jobs before load shedding                 |
| `DOCUMENTKIT_RATE_LIMIT_MAX`             |       `60` | Requests per IP per minute                        |
| `DOCUMENTKIT_JOB_TIMEOUT_MS`             |    `45000` | Total job execution timeout                       |
| `DOCUMENTKIT_NAVIGATION_TIMEOUT_MS`      |    `30000` | Page navigation timeout                           |
| `DOCUMENTKIT_MAX_OUTPUT_BYTES`           | `26214400` | Maximum PDF/image output                          |
| `DOCUMENTKIT_MAX_MCP_OUTPUT_BYTES`       |  `5242880` | MCP embedded output limit                         |
| `DOCUMENTKIT_MAX_REQUESTS_PER_JOB`       |      `300` | Page request budget                               |
| `DOCUMENTKIT_MAX_DECLARED_NETWORK_BYTES` | `52428800` | Sum of declared Content-Length values             |
| `DOCUMENTKIT_ALLOW_PRIVATE_NETWORKS`     |    `false` | Permit private destinations (dangerous)           |
| `DOCUMENTKIT_ALLOWED_HOSTS`              |      unset | Comma-separated exact or `*.example.com` patterns |
| `DOCUMENTKIT_LOG_LEVEL`                  |     `info` | Pino log level                                    |

The declared network byte budget is defense in depth, not an exact transfer counter: servers may omit or falsify `Content-Length`. Enforce traffic limits at the container or proxy layer in hostile environments.
