# serve-favicon [![Build Status](https://travis-ci.org/expressjs/serve-favicon.svg)](https://travis-ci.org/expressjs/serve-favicon) [![NPM version](https://badge.fury.io/js/serve-favicon.svg)](http://badge.fury.io/js/serve-favicon)

Node.js middleware for serving a favicon.

```js
var express = require('express')
var favicon = require('serve-favicon')

var app = express()
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
