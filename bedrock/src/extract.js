async function run(version, outputDir = 'output') {
  console.log('🔻 Downloading dependencies...')
  await require('./deps')(version, outputDir)
  console.log('🔁 Generating block map')
  await require('./blockMap')(version, outputDir)
  console.log('🧱 Generating block list')
  await require('./blocks')(version, outputDir)
}

module.exports = run
if (!module.parent) run()