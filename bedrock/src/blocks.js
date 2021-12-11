const fs = require('fs')
const stringify = require("json-stringify-pretty-compact")
const assert = require('assert')

const strip = k => k.replace('minecraft:', '').split('[')[0]
const sequential = data => data.every((num, i) => i === data.length - 1 || num < data[i + 1])
const titleCase = (str) => str.replace(/\b\S/g, t => t.toUpperCase())

module.exports = async (version, outputPath) => {
  // Load the bedrock block states and mappings
  const mcData = require('./deps/minecraft-data/data/dataPaths.json')
  const bedrockBlockStates = require(`./${outputPath}/blocks/BlockStates.json`)
  const java2Bedrock = require(`./${outputPath}/blocks/Java2Bedrock.json`)
  const bedrock2Java = require(`./${outputPath}/blocks/Bedrock2Java.json`)
  const [[latestVer, latest]] = Object.entries(mcData.pc).slice(-1)
  console.log('latest', latestVer, latest)

  const javaBlocks = require(`./deps/minecraft-data/data/${latest.blocks}/blocks.json`)

  // Mappings between Bedrock/Java
  const mapJ2B = Object.entries(java2Bedrock).reduce((acc, [k, v]) => { acc[strip(k)] = strip(v); return acc; }, {})
  const mapB2J = Object.entries(bedrock2Java).reduce((acc, [k, v]) => { acc[strip(k)] ??= strip(v); return acc; }, {})
  const out = {}

  // console.log(mapB2J)

  let usedIds = new Set()

  // We build blocks.json based on blockStates JSON
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
          // delete javaBlock.id
          const e = { ...javaBlock }
          out[name] = Object.assign(e, out[name])
          // console.log(name)
          break
        }
      }
      if (!found) throw Error(`unfound ${name} ${javaName}`)
    }

  }

  // Sort it based on IDs. The IDs (note, NOT the stateID) are kept the same as PC when possible
  const fin = Object.values(out).sort((a,b) => {
    // console.log('s',a.id, b.id)
    return (a.id ?? 999) - (b.id ?? 9999)
  })
  
  for (const entry of fin) {
    // Audit and make sure all of the states are sequential, then update minStateId and maxStateId
    assert(sequential(entry.states), JSON.stringify(entry))

    entry.id ??= undefined // sorting
    entry.minStateId = entry.states[0]
    entry.maxStateId = entry.states[entry.states.length - 1]
    delete entry.states
    entry.displayName ??= titleCase(entry.name.replace(/_/g, ' '))

    entry.id ??= entry.minStateId
    entry.defaultState = entry.minStateId
    entry.hardness ??= 0
    entry.stackSize ??= 1
    entry.diggable ??= false
    entry.boundingBox ??= 'block'
    entry.drops ??= []
    entry.transparent ??= false
    entry.emitLight ??= 0
    entry.filterLight ??= 0
  }

  // post-process: Fix any dupe IDs
  let di = 8000
  for (const entry of fin) {
    if (usedIds.has(entry.id)) {
      // entry.old = entry.id
      entry.id = di++
    }
    usedIds.add(entry.id)
  }

  fs.writeFileSync(outputPath + '/blocks.json', stringify(fin, { indent: 2, maxLength: 200 }))
}

if (!module.parent) module.exports(null, '1.17.10')