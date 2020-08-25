import os
import utils
import shutil
from utils import c, has_dir, mc_version_cmp

def install_node_jar_extractor():
    if not has_dir('minecraft-jar-extractor'):
        raise 'You need to run `git submodule init` and `git submodule update`'

    os.chdir('minecraft-jar-extractor')
    if not has_dir('node_modules'):
        os.system('npm install')
    os.chdir('..')


def install_node_burger_extractor():
    if not has_dir('burger-extractor'):
        raise 'You need to run `git submodule init` and `git submodule update`'

    os.chdir('burger-extractor')
    if not has_dir('node_modules'):
        os.system('npm install')
    os.chdir('..')


def install_burger():
    if not has_dir('Burger'):
        raise 'You need to run `git submodule init` and `git submodule update`'


def clean_vesrsion(ver):
    utils.rmdir('minecraft-jar-extractor/data')
    pass

# Toppings we want (everything)
BURGER_TOPPINGS = ['biomes', 'blocks', 'blockstates', 'entities', 'entitymetadata', 'identify', 'items', 'language', 'objects', 'packetinstructions', 'packets', 'particletypes', 'recipes', 'sounds', 'stats', 'tags', 'tileentities', 'version']

def run_burger(version, overwrite=False):
    if os.path.isfile(f"output/burger_{version}.json") and not overwrite:
        print(c.BOLD, "Not running Burger on ", version, 'because was already generated.', c.RESET)
        return True
    os.chdir('Burger')
    l = f"python3 munch.py --download {version} -v --output output.json --toppings {','.join(BURGER_TOPPINGS)}"
    print(c.WARNING, ">", l, c.RESET)
    os.system(l)
    print(c.WHITE, f'> move output.json ../output/burger_{version}.json')
    shutil.move("output.json", f"../output/burger_{version}.json")
    os.chdir('..')
    return True

def run_burger_extractor(version, overwrite=False):
    i = f"output/burger_{version}.json"
    if not os.path.isfile(i):
        print(c.BOLD, "First you need to run Burger on ", version, c.RESET)
        return False

    os.chdir('burger-extractor')

    print("Running Burger extractor...")

    version_before = utils.get_version_before(version)
    assert version_before # should never happen

    l = f"node src/index.js ../{i} {version_before}"
    print(c.WARNING, ">", l, c.RESET)
    os.system(l)

    os.makedirs(f"../output/minecraft-data/{version}/", exist_ok=True)
    utils.move("out/*.json", f"../output/minecraft-data/{version}/")

    os.chdir('..')

    return True

def run_prismarine_jar_extractor(version):
    # There could probably be a file in jar-extractor to do all of these steps
    dp = utils.get_decompiled_version(version)

    if not dp or not has_dir(dp + '/client'):
        print(version,dp)
        print(c.WARNING, f"Cannot run jar-extractor on {version} because you didn't decompile it. Run with --decompile.", c.RESET)
        return False

    os.chdir('minecraft-jar-extractor')

    print("Running minecraft-jar-extractor...")

    if utils.mc_version_cmp(version, '1.13') < 0 and utils.mc_version_cmp(version, '1.7') > 0:
        ## image name extractor
        a = f"node image_names.js {version} ../output/minecraft-assets ../{dp}/client"
        print(c.WARNING, '>', a, c.RESET)


    b = f"node lang.js {version} ../output/minecraft-data ../{dp}/client"
    print(c.WARNING, '>', b, c.RESET)

    if utils.mc_version_cmp(version, '1.13') > 0: # 1.14+
        # hacky stuff to make the script happy: move decompiled loot_tables
        # into data dir, js script then outputs to fake minecraft-data dir
        # which we copy over to our output dir.
        os.makedirs(f"data/{version}/data", exist_ok=True)
        os.makedirs(f"data/pc/{version}/", exist_ok=True)
        # shutil.rmtree(f"data/{version}/data")
        # os.symlink(f"../{dp}/client/data/minecraft/", f"data/{version}/data/")
        # print(f"> copy ../{dp}/client/data/minecraft/loot_tables/ data/{version}/data/")
        # shutil.copytree(f"../{dp}/client/data/minecraft/loot_tables/", f"data/{version}/data/")
        utils.move(f"../{dp}/client/data/minecraft/loot_tables", f"data/{version}/data/")
        a = f"node extract_lootTables.js {version} data ."
        print(c.WARNING, '>', a, c.RESET)
        os.system(a)
        # move data back
        utils.move(f"data/{version}/data/loot_tables", f"../{dp}/client/data/minecraft/")
        os.makedirs(f"../output/minecraft-data/{version}/", exist_ok=True)
        utils.move(f"data/pc/{version}/*.json", f"../output/minecraft-data/{version}/")

    os.chdir('..')

    return True



def run(versions=[], runBurger=True, runBE=True, runJarExtractor=True):
    install_node_jar_extractor()
    install_node_burger_extractor()

    utils.fetch_manifest()
    _vers = utils.extrapolate_versions(versions)

    if not has_dir("output/minecraft-data"):
        os.makedirs("output/minecraft-data")

    print("Extracting", _vers)

    for version in _vers:
        if version in ('latest', 'snapshot', 'release'):
            version = utils.get_latest_version(version)
        print(c.BOLD, "Extracting", version, c.RESET)
        good = True
        if runBurger:
            good = good and run_burger(version)
        if runBE:
            good = good and run_burger_extractor(version)
        if runJarExtractor:
            good = good and run_prismarine_jar_extractor(version)

        if good:
            print(c.OKGREEN, f"{version} was successfully extracted", c.RESET)
        else:
            print(c.FAIL, f"{version} failed one or more extractions", c.RESET)

    pass
