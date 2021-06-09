const fs = require('fs')
const stringify = require("json-stringify-pretty-compact")
const assert = require('assert')

module.exports = async (version, outputPath) => {
  const mcData = require('./deps/minecraft-data/data/dataPaths.json')
  const bedrockBlockStates = require(`./${outputPath}/blocks/BlockStates.json`)
  const java2Bedrock = require(`./${outputPath}/blocks/Java2Bedrock.json`)
  const bedrock2Java = require(`./${outputPath}/blocks/Bedrock2Java.json`)
  const [[latestVer, latest]] = Object.entries(mcData.pc).slice(-1)
  console.log('latest', latestVer, latest)

  const javaBlocks = require(`./deps/minecraft-data/data/${latest.blocks}/blocks.json`)

  const strip = k => k.replace('minecraft:', '').split('[')[0]

  const mapJ2B = Object.entries(java2Bedrock).reduce((acc, [k, v]) => { acc[strip(k)] = strip(v); return acc; }, {})
  const mapB2J = Object.entries(bedrock2Java).reduce((acc, [k, v]) => { acc[strip(k)] = strip(v); return acc; }, {})
  const out = {}

  // console.log(mapB2J)

  for (let i = 0; i < bedrockBlockStates.length; i++) {
    const state = bedrockBlockStates[i]
    const name = strip(state.name)
    // console.log('state', state)
    out[name] ??= { name: name, states: [] }
    out[name].states.push(i)

    const javaName = mapB2J[name]
    // console.log(javaName, name)
    if (javaName) {
      let found
      for (const javaBlock of javaBlocks) {
        if (javaBlock.name === javaName) {
          found = true
          const e = { ...javaBlock }
          out[name] = Object.assign(e, out[name])
        }
      }
      // if (!found) throw Error('unfound ' + name)
    }
  }

  const fin = Object.values(out).sort((a,b) => a.id - b.id)
  
  const sequential = data => data.every((num, i) => i === data.length - 1 || num < data[i + 1])
  
  for (const entry of fin) {
    // Audit and make sure all of the states are sequential, then update minStateId and maxStateId
    assert(sequential(entry.states), JSON.stringify(entry))
    entry.minStateId = entry.states[0]
    entry.maxStateId = entry.states[entry.states.length - 1]
    delete entry.states
  }

  fs.writeFileSync('blocks.json', stringify(fin, { indent: 2, maxLength: 200 }))
}

if (!module.parent) module.exports(null, 'output')