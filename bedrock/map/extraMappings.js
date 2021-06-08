// Adds some extra mappings not already included in GeyserMC's mappings

function getPatches() {
  const patches = {
    "bedrock2java": {
      "minecraft:flowing_water[liquid_depth=0]": "minecraft:water[level=0]",
      "minecraft:flowing_lava[liquid_depth=0]": "minecraft:lava[level=0]",
    }
  }

  for (let i = 1; i <= 15; i++) {
    patches.bedrock2java[`minecraft:water[liquid_depth=${i}]`] = `minecraft:water[level=${i}]`
  }

  for (let i = 1; i <= 15; i++) {
    patches.bedrock2java[`minecraft:lava[liquid_depth=${i}]`] = `minecraft:lava[level=${i}]`
  }

  return patches
}

module.exports = {
  getPatches
}

// console.log(getPatches())