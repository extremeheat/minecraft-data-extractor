const fs = require('fs')
const nbt = require('prismarine-nbt')
const extras = require('./extraMappings')
const { join } = require('path')
const assert = require('assert')

const d = ([path]) => join(__dirname, 'deps', path)

class BlockMapper {
  constructor(version) {
    this.version = version
    this.j2b = {}
    this.j2brid = {}
    this.b2j = {}
    this.brid2jsid = {}
    this.brid2bs = []
    this.bs2brid = {}
  }

  buildJ2B(geyserMappingDir) {
    var map = {}
    var blocksJson = require(geyserMappingDir)

    for (var key in blocksJson) {
      let val = blocksJson[key]
      // map[key] = { bid: val.bedrock_identifier, bstates: val.bedrock_states }
      let bkey = val.bedrock_identifier + '[' + this._concatStatesJ2B(val.bedrock_states) + ']'
      key += key.includes('[') ? '' : '[]'
      map[key] ??= bkey
    }
    this.j2b = map
  }

  jss2bss(val) {
    val = val.replace(/=true/g, '=1')
    val = val.replace(/=false/g, '=0')
    return val
  }

  buildJ2Bruntimeid() {
    let out = {}
    for (const [key, value] of Object.entries(this.j2b)) {
      // console.log(key, value);
      let val = this.jss2bss(value)
      let brid = this.bs2brid[val]
      if (brid == null) {
        console.log('No BSID for', value, key, val)
      }
      out[key] = brid
    }
    this.j2brid = out
  }

  _concatStatesJ2B(states) {
    let str = ''
    if (!states) return str

    for (var key of Object.keys(states).sort()) {
      let val = states[key]
      if (val == 'true') val = 1
      if (val == 'false') val = 0
      str += key + '=' + val + ','
    }
    return str.endsWith(',') ? str.slice(0, -1) : str
  }

  buildB2J() {
    let map = {}
    // const j2bv = Object.keys(this.j2b)
    for (var key in this.j2b) {
      let val = this.j2b[key].replace(/true/g, '1').replace(/false/g, '0')
      // let bkey = val.bid + '[' + this._concatStates(val.bstates) + ']'
      // map[bkey] = { j: key }
      // console.log(Object.values(this.j2b))
      map[val] = key
    }

    const ex = extras.getPatches()
    for (const key in ex.bedrock2java) {
      let val = ex.bedrock2java[key]
      map[key] = val
    }
    this.b2j = map
  }

  buildBRID(states) {
    const data = states
    let array = new Uint16Array(data.length)
    for (var i = 0; i < data.length; i++) {
      let e = data[i]
      // console.log(e)
      let fname = ''
      let name = e.name
      let states = ''
      for (var stateId in e.states) {
        let stateVal = e.states[stateId].value
        if (typeof stateVal == 'object') stateVal = stateVal[1]
        states += stateId + '=' + stateVal + ','
      }
      states = states.endsWith(',') ? states.slice(0, -1) : states
      fname = name + '[' + states + ']'
      this.brid2bs[i] = { b: fname, j: this.b2j[fname] }
      this.bs2brid[fname] = i
    }
    // console.log(array)
    // this.brid2jsid
  }

  async getBlockStatesPMMP() {
    const data = fs.readFileSync(d`./BedrockData/canonical_block_states.nbt`)
    let results = []
    data.startOffset = 0

    while (data.startOffset !== data.byteLength) {
      const { parsed, metadata } = await nbt.parse(data)
      data.startOffset += metadata.size

      results.push({
        name: parsed.value.name.value.replace('minecraft:', ''),
        states: parsed.value.states.value,
        version: parsed.value.version.value
      })
    }

    return results
  }

  async getBlockStatesGeyser() {
    const data = fs.readFileSync(d`./mappings-generator/palettes/blockpalette.nbt`)

    const { parsed } = await nbt.parse(data)

    const results = []

    for (const block of parsed.value.blocks.value.value) {
      results.push({
        name: block.name.value.replace('minecraft:', ''),
        states: block.states.value,
        version: block.version.value
      })
    }

    return results
  }

  async getBlockStatesAmulet() {

  }

  ppB2J(blockStates) {
    const pp = extras.postProcessB2J(blockStates, this.b2j)
    return pp
  }

  async build(od) {
    assert(od)
    console.log('writing to', od)
    try {
      fs.mkdirSync(od + '/blocks', { recursive: true })
    } catch (e) { console.log(e) }

    // Copy over blockstates
    const states = await this.getBlockStatesPMMP()
    fs.writeFileSync(od + '/blocks/BlockStates.json', JSON.stringify(states, null, '\t'))

    // * Build Java BSS to Bedrock BSS map
    {
      this.buildJ2B(d`./mappings/blocks.json`) // Geyser mappings
      fs.writeFileSync(od + '/blocks/Java2Bedrock.json', JSON.stringify(this.j2b, null, 2))
      // console.log('j2b', this.j2b)
    }

    // * Flip previous map: Bedrock Bss <-> Java Bss
    {
      this.buildB2J()
      fs.writeFileSync(od + '/blocks/Bedrock2Java.json', JSON.stringify(this.b2j, null, 2))
      // console.log(this.b2j)
    }

    // * Map Bedrock block runtime IDs to Block state strings and vice-versa
    {
      this.buildBRID(states)
      // console.log(this.brid2bs)
      fs.writeFileSync(od + '/blocks/BRID.json', JSON.stringify(this.brid2bs))
      // console.log(this.bs2brid)
      fs.writeFileSync(od + '/blocks/BSS.json', JSON.stringify(this.bs2brid))
    }

    // * Map Java BSS to Java Runtime IDs for convenience
    {
      this.buildJ2Bruntimeid()
      fs.writeFileSync(od + '/blocks/J2BRID.json', JSON.stringify(this.j2brid))
    }

    // Post process blocks to add extra data for Bedrock -> Java mappings, making sure
    // that all of the bedrock block states have a Java mapping (schema is a bit different,
    // for easier parsing)
    {
      const pp = this.ppB2J(states)
      fs.writeFileSync(od + '/blocks/blocksB2J.json', JSON.stringify(pp, null, 2))
    }
  }
}

module.exports = async (version, path) => {
  let builder = new BlockMapper(version)
  await builder.build(path)
  console.log('✔ ok ->', path)
}

if (!module.parent) module.exports(null, process.argv[2] || 'output')