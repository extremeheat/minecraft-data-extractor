const fs = require('fs')
const stringify = require("json-stringify-pretty-compact")
const assert = require('assert')

const strip = k => k?.replace('minecraft:', '').split('[')[0]
const titleCase = (str) => str.replace(/\b\S/g, t => t.toUpperCase())

module.exports = async (version, outputPath) => {
  const mcData = require('./deps/minecraft-data/data/dataPaths.json')
  const bedrockBlockStates = require(`./${outputPath}/blocks/BlockStates.json`)
  const java2Bedrock = require(`./${outputPath}/items/Java2Bedrock.json`)
  const bedrock2Java = require(`./${outputPath}/items/Bedrock2Java.json`)

  const [[latestVer, latest]] = Object.entries(mcData.pc).slice(-1)
  console.log('latest', latestVer, latest)

  const javaItems = require(`./deps/minecraft-data/data/${latest.blocks}/items.json`)

  const itemstates = require(`${outputPath}/packets/start_game.json`).itemstates

  console.log(bedrock2Java)

  // Some items are bedrock exclusive and cannot be found in the Java Edition item palette, so we assign our own ID starting
  // at 9000 to not conflict
  let bedrockExIx = 9000

  let ret = []
  for (const item of itemstates) {
    let blockStateId
    if (item.runtime_id < 0) {
      for (let i = 0; i < bedrockBlockStates.length; i++) {
        const entry = bedrockBlockStates[i]
        if (entry.name === item.name) blockStateId = i
      }
    }

    const name = strip(item.name)
    console.log('b2j', name, bedrock2Java[name])
    const mapped = bedrock2Java[name]

    if (mapped?.length > 1) {
      const variations = []
      for (const mappe of mapped) {
        const mcdItem = javaItems.find(e => e.name === strip(mappe[1]))
        variations.push({ metadata: parseInt(mappe[0]), ...mcdItem })
      }
      variations.sort((a,b) => a.metadata - b.metadata)
      const e = variations.shift()

      ret.push({
        // Undefined just to make sure the keys are sorted correctly
        id: undefined,
        displayName: undefined,
        name: undefined,
        stackSize: 1, // schema required
        ...e,
        name: strip(name),
        variations,
        blockStateId
      })
    } else {
      const mcdItem = javaItems.find(e => e.name === strip(mapped?.[0]?.[1]))
      const entry = ret.push({
        id: bedrockExIx++,
        stackSize: 1,
        ...mcdItem,
        name: strip(name),
        blockStateId
      })
    }
  }

  ret = ret.sort((a, b) => (a.id ?? 9999) - (b.id ?? 9999))

  for (const r of ret) {
    r.displayName ??= titleCase(r.name.replace('item.', '').replace(/_/g, ' '))
  }

  console.log(ret)
  fs.writeFileSync('./items.json', JSON.stringify(ret, null, 2))
}

if (!module.parent) module.exports(null, process.argv[2] || './output')