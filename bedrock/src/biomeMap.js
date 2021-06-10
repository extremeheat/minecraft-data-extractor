const fs = require('fs')

module.exports = (version, outDir) => {
  const javaData = require('./deps/PyMCTranslate/PyMCTranslate/json/versions/java_1_17_0/__biome_data__.json')
  const bedrockData = require('./deps/PyMCTranslate/PyMCTranslate/json/versions/bedrock_1_17_0/__biome_data__.json')

  const b = {}
  const j = {}
  const j2b = {}
  const b2j = {}

  for (const biomeName in javaData.int_map) {
    const biomeId = javaData.int_map[biomeName]
    j[biomeName] = biomeId
    const bedrockName = bedrockData.universal2version[javaData.version2universal[biomeName]]
    console.log('j2b', biomeName, bedrockName)
    j2b[biomeName] = bedrockName
  }

  for (const biomeName in bedrockData.int_map) {
    const biomeId = bedrockData.int_map[biomeName]
    b[biomeName] = biomeId
    const javaName = javaData.universal2version[bedrockData.version2universal[biomeName]]
    console.log('b2j', biomeName, javaName)
    b2j[biomeName] = javaName
  }

  fs.mkdirSync(outDir + '/biome/', { recursive: true })
  fs.writeFileSync(outDir + '/biome/Biomes.json', JSON.stringify(b, null, 2))
  fs.writeFileSync(outDir + '/biome/Java2Bedrock.json', JSON.stringify(j2b, null, 2))
  fs.writeFileSync(outDir + '/biome/Bedrock2Java.json', JSON.stringify(b2j, null, 2))

}

if (!module.parent) module.exports(null, process.argv[2] || './output')