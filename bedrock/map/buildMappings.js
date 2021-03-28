const fs = require('fs')
const nbt = require('prismarine-nbt')
const cp = require('child_process')
const { join } = require('path')

class BlockMapper {
  constructor() {
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
      let bkey = val.bedrock_identifier + '[' + this._concatStates(val.bedrock_states) + ']'
      key += key.includes('[') ? '' : '[]'
      map[key] = bkey
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

  _concatStates(states) {
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
    for (var key in this.j2b) {
      let val = this.j2b[key].replace(/true/g, '1').replace(/false/g, '0')
      // let bkey = val.bid + '[' + this._concatStates(val.bstates) + ']'
      // map[bkey] = { j: key }
      map[val] = key
    }
    this.b2j = map
  }

  buildBRID(states) {
    const data = states
    let array = new Uint16Array(data.length)
    for (var i = 0; i < data.length; i++) {
      let e = data[i].value
      // console.log(e)
      let fname = ''
      let name = e.name.value
      let states = ''
      for (var stateId in e.states?.value) {
        let stateVal = e.states.value[stateId].value
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

  async getBlockStates() {
    const data = fs.readFileSync(join(__dirname, './BedrockData/canonical_block_states.nbt'))
    let results = []
    data.startOffset = 0

    while (data.startOffset !== data.length) {
      const { parsed, metadata } = await nbt.parse(data)
      data.startOffset += metadata.size
      results.push(parsed)
    }

    return results
  }

  async build(outDir) {
    const od = outDir || 'output'
    console.log('writing to', od)
    try {
      fs.mkdirSync(od)
      fs.mkdirSync(od + '/blocks')
    } catch (e) { }

    // Copy over blockstates
    const states = await this.getBlockStates()
    fs.writeFileSync(od + '/blocks/BlockStates.json', JSON.stringify(states, null, 2))

    // * Build Java BSS to Bedrock BSS map
    {
      this.buildJ2B(join(__dirname, './mappings/blocks.json')) // Geyser mappings
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
  }
}

function updateSubmodules() {
  if (!fs.existsSync(join(__dirname, 'BedrockData'))) cp.execSync('git clone https://github.com/pmmp/BedrockData', { cwd: __dirname })
  if (!fs.existsSync(join(__dirname, 'mappings'))) cp.execSync('git clone https://github.com/GeyserMC/mappings', { cwd: __dirname })
  cp.execSync('cd BedrockData && git pull', { cwd: __dirname })
  cp.execSync('cd mappings && git pull', { cwd: __dirname })
}

module.exports = (path) => {
  updateSubmodules()
  let builder = new BlockMapper()
  builder.build(path)
  console.log('✔ ok ->', path)
}

if (!module.parent) module.exports(process.argv[2])