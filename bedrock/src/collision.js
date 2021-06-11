const fs = require('fs')
const stringify = require("json-stringify-pretty-compact")

const strip = k => k.replace('minecraft:', '').split('[')[0]

module.exports = (version, outputPath) => {

  const geyserMappings = require('./deps/mappings/blocks.json')
  const collisions = require('./deps/mappings/collision.json')
  const bedrockBlockStates = require(`./${outputPath}/blocks/BlockStates.json`)

  const buildBSS = states => {
    let s = []
    for (const k in states) {
      const v = states[k]
      s.push(`${k}=${v}`)
    }
    return s.join(',')
  }

  function getStateIDFor(name, states) {
    if (!states) return ""
    for (const i in bedrockBlockStates) {
      const block = bedrockBlockStates[i]
      // console.log(block.name, name, states)
      if (block.name === name) {
        let failed
        for (const [state, value] of Object.entries(states)) {
          // console.log(block.states.value, state, value)
          if (block.states.value[state]?.value != value) { failed = true; break }
        }
        if (!failed) return i
      }
    }
  }

  const out = {}
  const col = {}
  // console.log(collisions)
// return
  for (const javaId in geyserMappings) {
    const maping = geyserMappings[javaId]
    const ss = buildBSS(maping.bedrock_states)
    out[`${strip(maping.bedrock_identifier)}`] ??= {}
    // console.log(maping)
    out[`${strip(maping.bedrock_identifier)}`][getStateIDFor(maping.bedrock_identifier, maping.bedrock_states)] = maping.collision_index
    col[maping.collision_index] = collisions[maping.collision_index]
  }

  fs.writeFileSync('blockColissionShapes.json', stringify({ blocks: out, shapes: col }, { indent: 2, maxLength: 9000 }))

  // console.log(out)
}

if (!module.parent) module.exports(null, 'output')