const fs = require('fs')
const nbt = require('prismarine-nbt')
const extras = require('./extraMappings')
const { join } = require('path')
const assert = require('assert')

const d = ([path]) => join(__dirname, 'deps', path)
const strip = k => k?.replace('minecraft:', '').split('[')[0]

class ItemMapper {
  constructor(version, outDir) {
    this.j2b = {}
    this.b2j = {}

    try {
      this.packet = require(`${outDir}/packets/start_game.json`)
    } catch (e) {
      console.log(e)
      throw Error('You need to dump the packets first, please see the README.md file')
    }

    this.itemstates = {}

    for (const state of this.packet.itemstates) {
      this.itemstates[state.name] = state
    }

    this.outDir = outDir
  }

  buildJ2B() {
    const map = require(d`mappings/items.json`)
    for (const javaItemName in map) {
      const bedrockItem = map[javaItemName]
      const mapped = this.itemstates[bedrockItem.bedrock_identifier]
      this.j2b[strip(javaItemName)] = strip(mapped.name) + ':' + bedrockItem.bedrock_data
    }
  }

  buildB2J() {
    // this.b2j = Object.fromEntries(Object.entries(this.j2b).map(([k,v])=>([v,k])))
    const b2j = this.b2j
    for (const javaId in this.j2b) {
      const bedrockId = this.j2b[javaId]
      const [bedrockName, damage] = bedrockId.split(':')
      b2j[bedrockName] ??= []
      b2j[bedrockName].push([damage, javaId])
    }
  }

  async build() {
    await this.buildJ2B()
    await this.buildB2J()

    fs.mkdirSync(this.outDir + '/items/', { recursive: true })
    fs.writeFileSync(this.outDir + '/items/Java2Bedrock.json', JSON.stringify(this.j2b, null, 2))
    fs.writeFileSync(this.outDir + '/items/Bedrock2Java.json', JSON.stringify(this.b2j, null, 2))
  }
}

module.exports = async (version, path) => {
  let builder = new ItemMapper(version, path)
  await builder.build()
  console.log('✔ ok ->', path)
}

if (!module.parent) module.exports(null, process.argv[2] || './1.17.10')