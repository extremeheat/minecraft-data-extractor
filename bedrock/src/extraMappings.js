// Adds some extra mappings not already included in GeyserMC's mappings

function getPatches() {
  const patches = {
    "bedrock2java": {
      "minecraft:flowing_water[liquid_depth=0]": "minecraft:water[level=0]",
      "minecraft:flowing_lava[liquid_depth=0]": "minecraft:lava[level=0]",
      "minecraft:air[]": "minecraft:air[]"
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

const fs = require('fs')

function postProcessB2J(blockStates, b2j) {
  const next = {}
  for (const key in b2j) {
    const name = key.split('[')[0].replace('minecraft:', '')
    const states = key.split('[')[1].split(']')[0]
  
    const valName = b2j[key].split('[')[0].replace('minecraft:', '')
    const valStates = b2j[key].split('[')[1].split(']')[0]
  
    next[name] ??= {}
    next[name][states] = [valName, valStates]
  }

  const acceptableFailures = ['allow', 'deny', 'border_block', 'camera', 'client_request_placeholder_block', 'glowingobsidian', 'info_update', 'underwater_torch', 'invisibleBedrock', 'info_update2']
  acceptableFailures.push('frame', 'glow_frame') // frame is a special case - it's not a block, but it's a entity on PC

  acceptableFailures.push('jigsaw') // don't care about jigsaw for now

  // Stem blocks for mushrooms
  next['brown_mushroom_block']['huge_mushroom_bits=10'] = ['mushroom_stem', 'down=false,east=true,north=true,south=true,up=false,west=true']
  next['brown_mushroom_block']['huge_mushroom_bits=15'] = ['mushroom_stem', 'down=true,east=true,north=true,south=true,up=true,west=true']
  next['red_mushroom_block']['huge_mushroom_bits=10'] = ['mushroom_stem', 'down=false,east=true,north=true,south=true,up=false,west=true']
  next['red_mushroom_block']['huge_mushroom_bits=15'] = ['mushroom_stem', 'down=true,east=true,north=true,south=true,up=true,west=true']

  next['stonebrick']['stone_brick_type=smooth'] = ['stone_bricks', '']

  function runPass(pass) {
    for (const entry of blockStates) {
      const stateString = Object.entries(entry.states).map(([key, value]) => `${key}=${value.value}`).join(',')
      // console.log(entry.name, stateString)
      if (!next[entry.name]?.[stateString]) {
        if (pass === 2) {

          continue
        }

        if (acceptableFailures.includes(entry.name)) {
          continue
        }
        if (entry.name.includes('chemi') || entry.name.includes('colored_torch') || entry.name.includes('element_')) {
          continue
        }

        const misses = stateString.split(',').map(s => s.split('='))

        // MANUAL REMAPS
        if (misses.length) {
          const keys = misses.map(m => m[0])
          const map = Object.fromEntries(misses)
          const valueFor = key => map[key]

          if (misses.length === 1) {
            // Redstone Pressure Plates - on bedrock, they have signals, but not on pc
            if (valueFor('redstone_signal') > 0) {
              next[entry.name][stateString] = next[entry.name]['redstone_signal=15']
            }

            // Terracotta and Signs - on bedrock, they have up and down, but not on pc
            if (['0', '1'].includes(valueFor('facing_direction'))) {
              // console.log(entry.name, next[entry.name])
              next[entry.name][stateString] = next[entry.name]['facing_direction=2']
            }
          }

          // Anvils - on bedrock, they have a 'damage=broken' value, but not on pc
          if (valueFor('damage') === 'broken') {
            next[entry.name][stateString] = next[entry.name][stateString.replace('damage=broken', 'damage=very_damaged')]
          } 
          
          // Comparators - on bedrock, powered/unpowered are same block, but not on pc
          else if (entry.name === 'powered_comparator' && valueFor('output_lit_bit') === '0') {
            // Powered Comparators - on bedrock, they have a 'powered=true' value, but not on pc
            const analog = next[entry.name][stateString.replace('output_lit_bit=0', 'output_lit_bit=1')]
            const newState = ['unpowered_comparator', analog[1].replace('powered=true', 'powered=false')]
            next[entry.name][stateString] = newState
          }
          else if (entry.name === 'unpowered_comparator' && valueFor('output_lit_bit') === '1') {
            const analog = next[entry.name][stateString.replace('output_lit_bit=1', 'output_lit_bit=0')]
            const newState = ['powered_comparator', analog[1].replace('powered=false', 'powered=true')]
            next[entry.name][stateString] = newState
          }

          else if (valueFor('facing_direction') === '1') {
            if (next[entry.name][stateString.replace('facing_direction=1', 'facing_direction=0')]) {
              // console.log('Could fix')
              next[entry.name][stateString] = next[entry.name][stateString.replace('facing_direction=1', 'facing_direction=0')]
            }
          }

          else if (entry.name.endsWith('_stem')) {
            // Melon/Pumpkin stems - Just use direction 1
            next[entry.name][stateString] = next[entry.name][stateString.replace('facing_direction=' + valueFor('facing_direction'), 'facing_direction=1')]
          }

          // Leaves - on bedrock, they have an update bit, but not on pc
          else if (valueFor('update_bit') === '1') {
            next[entry.name][stateString] = next[entry.name][stateString.replace('update_bit=1', 'update_bit=0')]
          }

          // Bamboo
          else if (entry.name === 'bamboo_sapling') {
            next[entry.name][stateString] = next[entry.name]['age_bit=0,sapling_type=oak']
          } else if (valueFor('age_bit') === '1') {
            next[entry.name][stateString] = next[entry.name][stateString.replace('age_bit=1', 'age_bit=0')]
          }

          // Bedrock
          else if (valueFor('infiniburn_bit') === '1') {
            next[entry.name][stateString] = next[entry.name][stateString.replace('infiniburn_bit=1', 'infiniburn_bit=0')]
          }

          // blackstone_double_slab
          else if (valueFor('top_slot_bit') === '1') {
            next[entry.name][stateString] = next[entry.name][stateString.replace('top_slot_bit=1', 'top_slot_bit=0')]
          }

          else if (valueFor('suspended_bit') === '0') {
            next[entry.name][stateString] = next[entry.name][stateString.replace('suspended_bit=0', 'suspended_bit=1')]
          }

          // bone_block
          else if (valueFor('deprecated') > 0) {
            next[entry.name][stateString] = next[entry.name][stateString.replace('deprecated=' + valueFor('deprecated'), 'deprecated=0')]
          }

          if (next[entry.name]?.[stateString]) continue

          // Parity - on bedrock, scale is a bit different
          switch (valueFor('growth')) {
            case '1': next[entry.name][stateString] = next[entry.name][stateString.replace('growth=1', 'growth=0')]; break
            case '2': next[entry.name][stateString] = next[entry.name][stateString.replace('growth=2', 'growth=0')]; break
            case '5': next[entry.name][stateString] = next[entry.name][stateString.replace('growth=5', 'growth=4')] || next[entry.name][stateString.replace('growth=5', 'growth=3')]; break
            case '6': next[entry.name][stateString] = next[entry.name][stateString.replace('growth=6', 'growth=4')] || next[entry.name][stateString.replace('growth=6', 'growth=3')]; break
            case '7': next[entry.name][stateString] = next[entry.name][stateString.replace('growth=7', 'growth=4')] || next[entry.name][stateString.replace('growth=7', 'growth=3')]; break
          }

          if (next[entry.name]?.[stateString]) continue

          else if (['11', '12', '13'].includes(valueFor('huge_mushroom_bits'))) {
            next[entry.name][stateString] = next[entry.name]['huge_mushroom_bits=0']
          }

          // Dripleaf - the stems on bedrock have extra data, but not on pc
          else if (valueFor('big_dripleaf_head') === '0') {
            next[entry.name][stateString] = next[entry.name][stateString.replace('big_dripleaf_tilt=' + valueFor('big_dripleaf_tilt'), 'big_dripleaf_tilt=none')]
          }

          // Cauldrons - bedrock supports lava cauldrons with levels, but not on pc
          if (valueFor('fill_level') > 0 && valueFor('cauldron_liquid') === 'lava') {
            next[entry.name][stateString] = ['lava_cauldron', ''] // map to full lava cauldron
          } else switch (valueFor('fill_level')) {
            case '0': (next[entry.name] ??= {})[stateString] = ['cauldron', '']; break
            case '1': next[entry.name][stateString] = next[entry.name][stateString.replace('fill_level=1', 'fill_level=3')]; break
            case '2': next[entry.name][stateString] = next[entry.name][stateString.replace('fill_level=2', 'fill_level=3')]; break
            case '5': next[entry.name][stateString] = next[entry.name][stateString.replace('fill_level=5', 'fill_level=4')]; break
          }

          if (next[entry.name]?.[stateString]) continue

          // Berries
          if (valueFor('growing_plant_age') > 0) {
            next[entry.name][stateString] = next[entry.name][stateString.replace('growing_plant_age=' + valueFor('growing_plant_age'), 'growing_plant_age=0')]
          }

          // Coral fans
          if (valueFor('coral_fan_direction') > 0) {
            next[entry.name][stateString] = next[entry.name][stateString.replace('coral_fan_direction=' + valueFor('coral_fan_direction'), 'coral_fan_direction=0')]
          } else if (valueFor('coral_hang_type_bit') > 0) {
            next[entry.name][stateString] = next[entry.name][stateString.replace('coral_hang_type_bit=' + valueFor('coral_hang_type_bit'), 'coral_hang_type_bit=0')]
          } else if (valueFor('attachment') === 'multiple') {
            next[entry.name][stateString] = next[entry.name][stateString.replace('attachment=multiple', 'attachment=side')]
          }

          // Snow layers
          else if (valueFor('covered_bit') === '1') {
            next[entry.name][stateString] = next[entry.name][stateString.replace('covered_bit=1', 'covered_bit=0')]
          }

          else if (valueFor('explode_bit') === '1') {
            next[entry.name][stateString] = next[entry.name][stateString.replace('explode_bit=1', 'explode_bit=0')]
          }

          else if (valueFor('torch_facing_direction') === 'unknown') {
            ; (next[entry.name] ??= {})[stateString] = next[entry.name][stateString.replace('torch_facing_direction=unknown', 'torch_facing_direction=top')]
          }

          // Hardened Glass (chemistry) - just treat it as glass
          else if (entry.name.includes('hard_') && entry.name.includes('glass')) {
            ; (next[entry.name] ??= {})[stateString] = ['glass', '']
          }

          // If we were able to fix it and assign this state combo an entry, we can remove it from the list of misses
          if (next[entry.name]?.[stateString]) continue
          else {
            console.log(`Failed to correct ${entry.name}[${stateString}]`, next[entry.name])
          }
        }

        console.log('Block Miss', entry.name, stateString, next[entry.name], misses)
      }
    }
  }

  runPass(1)

  // fs.writeFileSync('./NewblocksB2J.json', JSON.stringify(next, null, 2))
  return next
}

module.exports = {
  getPatches,
  postProcessB2J
}

// console.log(getPatches())