#!/usr/bin/env node
const cp = require('child_process')

const command = process.argv[2]
if (!command) {
  console.error('usage: bedrock-provider <generate-maps> [output directory]')
  process.exit(1)
}
if (command == 'generate-maps') {
  require('./src/blockMap.js')(process.argv[3])
}



// run()