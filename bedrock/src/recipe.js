const fs = require('fs')
const nbt = require('prismarine-nbt')
const strip = k => k.replace('minecraft:', '').split('[')[0]
const tfi = inp => JSON.stringify(inp);
const stringify = require("json-stringify-pretty-compact")

function flatten(input) {
  const ing = [];
  const counts = {}
  let result = [];
  if (Array.isArray(input[0])) {
    for (let i = 0; i < input.length; i++) {
      let inp1 = input[i];
      let newInpArray = [];
      for (let j = 0; j < inp1.length; j++) {
        let inp2 = inp1[j];
        if (inp2.network_id == 0) {
          newInpArray.push(0);
          continue;
        }
        const ingredient = tfi(inp2);
        if (!ing.includes(ingredient)) ing.push(ingredient);
        counts[ingredient] ??= 0
        counts[ingredient]++
        newInpArray.push(ing.indexOf(ingredient) + 1);
      }
      result.push(newInpArray);
    }
  } else {
    let newInpArray = [];
    for (let j = 0; j < input.length; j++) {
      let inp2 = input[j];
      if (inp2.network_id == 0) {
        newInpArray.push(0);
        continue;
      }
      const ingredient = tfi(inp2);
      if (!ing.includes(ingredient)) ing.push(ingredient);
      counts[ingredient] ??= 0
      counts[ingredient]++
      newInpArray.push(ing.indexOf(ingredient) + 1);
    }
    result.push(newInpArray);
  }
  const ing2 = ing.map(e => {
    const x = JSON.parse(e);
    x.count = counts[e] || x.count;
    return x;
  })
  return [ing2, result];
}

module.exports = (version, outputPath) => {
  const craftingData = require(`${outputPath}/packets/crafting_data.json`)
  const itemstates = require(`${outputPath}/packets/start_game.json`).itemstates
  const uniqueTypes = new Set()

  let itemRuntimeId2String = {};

  for (const state of itemstates) {
    itemRuntimeId2String[state.runtime_id] = state.name;
  }
  // console.log(itemRuntimeId2String)

  const makeOutputItem = _it => {
    let it = typeof _it === 'string' ? JSON.parse(_it) : _it;
    // console.log(it)
    const name = itemRuntimeId2String[it.network_id]
    if (!name) throw Error(it.network_id)
    console.log('count', it.count)
    return {
      name: strip(name ?? it.network_id),
      metadata: it.metadata,
      count: it.count ?? 1,
      nbt: it.extra?.nbt
    };
  };

  let ret = [];

  for (let id in craftingData.recipes) {
    const recipe = craftingData.recipes[id]
    id = parseInt(id)
    uniqueTypes.add(recipe.recipe.block)
    uniqueTypes.add(recipe.type)
    const name = recipe.recipe.recipe_id
    if (['shapeless', 'shaped', 'shaped_chemistry', 'shapeless_chemistry'].includes(recipe.type)) {
      const [ing, inp] = flatten(recipe.recipe.input)
      ret.push({
        type: recipe.recipe.block || recipe.type,
        id,
        // block: recipe.recipe.block,
        name,
        ingredients: ing.map(makeOutputItem),
        input: inp,
        output: recipe.recipe.output.map(makeOutputItem)
      });
    } else if (recipe.type === 'furnace' || recipe.type === 'furnace_with_metadata') {
      // console.log('INPI', recipe.recipe.input_id)
      const name = itemRuntimeId2String[recipe.recipe.input_id]
      ret.push({
        type: recipe.recipe.block || 'furnace',
        id,
        // block: recipe.recipe.block,
        name,
        ingredients: [
          { name: strip(name), metadata: recipe.recipe.metadata, count: 1 }
        ],
        output: [makeOutputItem(recipe.recipe.output)]
      });
    } else if (recipe.type === 'multi') {

    } else if (recipe.type === 'shulker_box') {
      const [ing, inp] = flatten(recipe.recipe.input);
      ret.push({
        type: 'shulker_box',
        id,
        name,
        ingredients: ing.map(makeOutputItem),
        input: inp,
        output: recipe.recipe.output.map(makeOutputItem),
        priority: recipe.recipe.priority
      })
    } else {
      throw Error(recipe.type + ' is not support')
    }
  }

  const final = {}
  for (const r of ret) {
    final[r.id] = r
    delete r.id
  }

  console.log(uniqueTypes)
  fs.writeFileSync('recipes.json', stringify(final, { indent: 2, maxLength: 200 }))
}

if (!module.parent) module.exports(null, process.argv[2] || './output')