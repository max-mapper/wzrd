#!/usr/bin/env node
var wzrd = require('./')
var argv = require('minimist')(process.argv.slice(2))

var port = argv.port || argv.p || argv.https ? 4443 : 9966

argv.entries = []

argv._.map(function(arg) {
  if (arg.indexOf(':') === -1) {
    argv.entries.push({from: arg, to: arg})
    return
  }
  var parts = arg.split(':')
  argv.entries.push({from: parts[0], to: parts[1]})
})

if (!argv.entries.length) {
  console.error('Usage: wzrd [filename]')
  process.exit(1)
}

if (argv.https) {
  wzrd.https(argv, function(err, server) {
    if (err) {
      console.error('error generating certificate', err)
      process.exit(1)
    }
    server.listen(port, listening)
  })
} else {
  wzrd.http(argv).listen(port, listening)
}

function listening(err) {
  if (err) {
    console.error('error starting server', err)
    process.exit(1)
  }
  console.error('server started at ' + (argv.https ? 'https' : 'http') + '://localhost:' + port)
}
