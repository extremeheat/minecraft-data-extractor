async function run(version, outputDir = './output') {
  console.log('🔻 Downloading dependencies...')
  // await require('./deps')(version, outputDir)
  console.log('🔁 Generating block map')
  await require('./blockMap')(version, outputDir)
  console.log('🧱 Generating block list')
  await require('./blocks')(version, outputDir)

  console.log('💥 Generating collision data')
  await require('./collision')(version, outputDir)

  console.log('🔨 Generating item map + list')
  await require('./itemMap')(version, outputDir)
  await require('./items')(version, outputDir)

  console.log('🌎 Generating biome map + list')
  await require('./biomeMap')(version, outputDir)
  await require('./biomes')(version, outputDir)

  console.log('👩‍🍳 Generating recipes')
  await require('./recipe')(version, outputDir)

  console.log('🧟‍♂️ Generating entities')
  await require('./entities')(version, outputDir)
}

module.exports = run
if (!module.parent) run('1.17.10', './1.17.10')