const fs = require('fs')
const nbt = require('prismarine-nbt')
const strip = k => k.replace('minecraft:', '').split('[')[0]
const tfi = inp => JSON.stringify(inp);

function flatten(input) {
  let ing = [];
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
      newInpArray.push(ing.indexOf(ingredient) + 1);
    }
    result.push(newInpArray);
  }
  return [ing, result];
}

module.exports = (version, outputPath) => {
  const craftingData = require(`${outputPath}/packets/crafting_data.json`)
  const itemstates = require(`${outputPath}/packets/start_game.json`).itemstates

  let itemRuntimeId2String = {};

  for (const state of itemstates) {
    itemRuntimeId2String[state.runtime_id] = state.name;
  }
  // console.log(itemRuntimeId2String)

  const makeOutputItem = _it => {
    let it = typeof _it === 'string' ? JSON.parse(_it) : _it;
    // console.log(it)
    return {
      name: strip(itemRuntimeId2String[it.network_id] ?? it.network_id),
      metadata: it.metadata,
      count: it.count,
      nbt: it.extra?.nbt
    };
  };

  let ret = [];

  for (const recipe of craftingData.recipes) {
    if (['shapeless', 'shaped', 'shaped_chemistry', 'shapeless_chemistry'].includes(recipe.type)) {
      const [ing, inp] = flatten(recipe.recipe.input)
      ret.push({
        type: recipe.type,
        id: recipe.recipe.recipe_id,
        ingredients: ing.map(makeOutputItem),
        input: inp,
        output: recipe.recipe.output.map(makeOutputItem)
      });
    } else if (recipe.type === 'furnace' || recipe.type === 'furnace_with_metadata') {
      ret.push({
        type: 'furnace',
        id: recipe.recipe.recipe_id,
        ingredients: [
          { name: recipe.recipe.input_id, metadata: recipe.recipe.metadata }
        ],
        output: makeOutputItem(recipe.recipe.output)
      });  
    } else if (recipe.type === 'multi') {

    } else if (recipe.type === 'shulker_box') {
      const [ing, inp] = flatten(recipe.recipe.input);
      ret.push({
        type: 'shulker_box',
        id: recipe.recipe.recipe_id,
        ingredients: ing.map(makeOutputItem),
        input: inp,
        output: recipe.recipe.output.map(makeOutputItem),
        priority: recipe.recipe.priority
      })
    } else {
      throw Error(recipe.type + ' is not support')
    }
  }


  fs.writeFileSync('recipes.json', JSON.stringify(ret, null, 2))
}

if (!module.parent) module.exports(null, process.argv[2] || './output')