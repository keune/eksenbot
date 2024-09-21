A bot that posts radio eksen's now playing song to Bluesky. uses mysql to store data.

## Installation

Copy `.env.example` to `.env`, and fill the values.
Run `node run-schema.js` to create tables.

## Running

You can run `index.js` to perform a single check and post. However, if you need to run it frequently, you're likely to encounter Bluesky's rate limits. In such cases, `looper.js` is more efficient, as it calls the login endpoint only once and reuses the same agent for subsequent post requests. The duration of its operation is determined by the `LOOPER_RUN_TIME_MINUTES` environment variable.
