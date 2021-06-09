const fs = require('fs')
const cp = require('child_process')
const { join } = require('path')

function updateSubmodules() {
  const cwd = join(__dirname, 'deps')
  if (!fs.existsSync(join(__dirname, 'deps', 'minecraft-data'))) cp.execSync('git clone https://github.com/PrismarineJS/minecraft-data', { cwd })
  if (!fs.existsSync(join(__dirname, 'deps', 'BedrockData'))) cp.execSync('git clone https://github.com/pmmp/BedrockData', { cwd })
  if (!fs.existsSync(join(__dirname, 'deps', 'mappings'))) cp.execSync('git clone https://github.com/GeyserMC/mappings', { cwd })
  if (!fs.existsSync(join(__dirname, 'deps', 'PyMCTCompiler'))) cp.execSync('git clone https://github.com/gentlegiantJGC/PyMCTCompiler', { cwd })
  if (!fs.existsSync(join(__dirname, 'deps', 'mappings-generator'))) cp.execSync('git clone https://github.com/GeyserMC/mappings-generator', { cwd })
  cp.execSync('cd minecraft-data && git pull', { cwd })
  cp.execSync('cd BedrockData && git pull && git log --all --oneline --decorate > log.txt', { cwd })
  cp.execSync('cd mappings && git pull && git log --all --oneline --decorate > log.txt', { cwd })
  cp.execSync('cd PyMCTCompiler && git pull && git log --all --oneline --decorate > log.txt', { cwd })
  cp.execSync('cd mappings-generator && git pull && git log --all --oneline --decorate > log.txt', { cwd })

  for (const dep of ['BedrockData', 'mappings', 'PyMCTCompiler', 'mappings-generator']) {
    const e = fs.readFileSync(join(__dirname, 'deps', dep, 'log.txt'), 'utf-8')
    const [ _, where ] = e.split('\n')[0].match(/....... \((.*)\)/)
    const br = where.split(', ')
    // if (br.includes('origin/HEAD')) continue // no need to switch
    const latestBranch = br[br.length - 1].replace('origin/', '')
    console.log('Checking out branch for', dep, latestBranch, br)
    cp.execSync(`cd ${dep} && git checkout ${latestBranch}`, { cwd })
  }
}

module.exports = version => {
  updateSubmodules()
}