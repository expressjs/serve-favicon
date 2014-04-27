# static-favicon [![Build Status](https://travis-ci.org/expressjs/favicon.svg)](https://travis-ci.org/expressjs/favicon) [![NPM version](https://badge.fury.io/js/static-favicon.svg)](http://badge.fury.io/js/static-favicon)

Node.js middleware for serving a favicon.

```js
var express = require('express')
  , favicon = require('static-favicon')
  , app     = express()

app.use(favicon(__dirname + '/public/favicon.ico'))
```

Typically this middleware will come very early in your stack (maybe even first) to avoid processing any other middleware if we already know the request is for `favicon.ico`.

## API

### favicon(path, options)

Create new middleware to serve a favicon from the given `path` to a favicon file.

#### options

  - `maxAge` - cache-control max-age directive in `ms`, defaulting to 1 day.

## License

[MIT](LICENSE)
