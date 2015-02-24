var os = require('os')
var path = require('path')
var test = require('tape')
var kill = require('tree-kill')
var through = require('through2')
var spawn = require('win-spawn')
var npmSpawn = require('npm-execspawn')
var request = require('request')
var concat = require('concat-stream')
var wzrd = require('../')
var noop = function(){}

var cliPath =  path.resolve(__dirname, '..', 'bin.js')

function run(t, opt, cb) {
  var server = 'http://localhost:'+opt.port
  var startMsg = 'server started at '+server

  var entry = opt.entry || opt.args[0]
  var proc = spawn(cliPath, opt.args, { cwd: __dirname, env: process.env })
  waitFor(startMsg, proc.stderr, function(output) {
    t.ok(output.indexOf(startMsg) > -1, startMsg)

    var url = [server, entry].join('/')
    request({url: url }, function(err, resp, bundle) {
      var bfy = npmSpawn(opt.compare, { cwd: __dirname, env: process.env })
      bfy.stdout.pipe(concat(function gotbundle(bundle2) {
        t.equal(bundle.toString(), bundle2.toString(), 'bundles match')
        proc.on('exit', cb||noop)
        kill(proc.pid)
      }))
    })
  })
}

test('single entry', function(t) {
  run(t, { 
      port: 9966,
      args: ['app.js'],
      compare: 'browserify app.js'
  }, 
    function() {
    t.end()
  })
})

test('from dir with entry mapping', function(t) {
  run(t, { 
      port: 9966,
      entry: 'bundle.js',
      args: ['other/test.js:bundle.js', '--dir=other'],
      compare: 'browserify ./other/test.js'
    }, 
    function() {
    t.end()
  })
})

function waitFor(string, stream, cb) {
  var buf = []
  var done = false
  stream.on('data', function(ch) {
    if (done) return
    buf.push(ch)
    var str = Buffer.concat(buf).toString()
    if (str.indexOf(string) > -1) {
      done = true
      cb(str)
    }
  })
  stream.on('end', function() {
    if (!done) cb('')
  })
}
