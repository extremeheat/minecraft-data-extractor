const fs = require('fs')
const nbt = require('prismarine-nbt')
const strip = k => k.replace('minecraft:', '').split('[')[0]

module.exports = (version, outputPath) => {
  const biomes = nbt.simplify(require(`${outputPath}/packets/biome_definition_list.json`).nbt)
  // console.log('Biomes', biomes)

  const bedrockBiomeIds = require(`${outputPath}/biome/Biomes.json`)
  const java2Bedrock = require(`${outputPath}/biome/Java2Bedrock.json`)
  const bedrock2Java = require(`${outputPath}/biome/Bedrock2Java.json`)
  
  const mcData = require('./deps/minecraft-data/data/dataPaths.json')
  const [[latestVer, latest]] = Object.entries(mcData.pc).slice(-1)
  // console.log('latest', latestVer, latest)
  const javaBiomes = require(`./deps/minecraft-data/data/${latest.biomes}/biomes.json`)

  const javaBiomeMapped = {}
  javaBiomes.forEach(e => javaBiomeMapped[e.name] = e)

  let ret = []
  for (const biomeName in biomes) {
    const biome = biomes[biomeName]
    const javaBiomeName = bedrock2Java['minecraft:' + biomeName]
    if (!javaBiomeName) {
      console.log('fail',javaBiomeName, ', ', biomeName)
      throw Error()
      continue
    }

    const javaBiome = javaBiomeMapped[strip(javaBiomeName)]
    if (!javaBiome) {
      throw Error(`${javaBiomeName} not found in ${latest.biomes}`)
      // console.log('b2j', biomeName, javaBiomeName, javaBiome)
    }

    ret.push({
      id: undefined,
      name: undefined,
      // defaults to not make auditer bitch
      "category": "",
      "precipitation": "rain",
      "depth": 0,
      "dimension": "overworld",
      "displayName": biomeName,
      "color": 0,
      "rainfall": 0,
      ...javaBiome,
      "id": bedrockBiomeIds['minecraft:' + biomeName],
      "name": biomeName,

      // "category": "swamp",
      "temperature": biome.temperature,
      // "depth": -0.2,
      // "dimension": "overworld",
      // "displayName": "Swamp",
      // "color": 522674,
      "rainfall": biome.downfall,
      // "child": 134
    })

    if (bedrockBiomeIds['minecraft:' + biomeName]==null) console.warn(bedrockBiomeIds, biomeName)
  }

  ret = ret.sort((a,b) => a.id - b.id)

  fs.writeFileSync(outputPath + '/biomes.json', JSON.stringify(ret, null, 2))
}

if (!module.parent) module.exports(null, process.argv[2] || './output')