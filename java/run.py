import sys
import argparse
import decompiler
import extractor
import utils
import shutil
import os
import itertools
from utils import c

VERSION_HELP = """
Specify the version(s) you want to work with per syntax
	Seperate with commas, or use range (<>=-) syntax
	For example, `-v >=1.13` will select all versions past 1.12
	`-v <1.13` will select all versions below 1.13
	`-v 1.12.2` will select 1.12, -v 1
	`-v 1.16,1.16.1` will select 1.16 and 1.16.1... so forth.
You can also use "all", "latest" or "snapshot".
To get a list of versions, use -v ?
"""

EPILOG = """
Arg parsing order: run decompile, extract, make diffs, clean
The output to decompiled versions will be in DecompilerMC/src/.
The output to extractor data will be in output/.
"""

# [1,2,3,4,5] -> ([1,2], [2,3], [3,4], [4,5])
def make_pairs(l): 
    out = []
    
    for i in range(0, len(l), 2):
        if len(out):
            out.append([out[len(out) - 1][1], l[i]])
        if i + 1 < len(l):
            out.append([ l[i], l[i + 1] ])
    return out

def _gen_diffs(ver1,ver2,mapping,allowOverwrite=False):
    n = f"{ver1}__{ver2}__{mapping}.diff"
    utils.journal_write('../../diffs/' + n)
    if os.path.isfile('../../diffs/' + n) and not allowOverwrite:
        print(utils.c.WARNING, n, "already was generated! Skipping.", utils.c.RESET)
        return
    
    # print('../../diffs/' + n)
    
    print(f"{mapping} diffing {ver1} and {ver2}... Deleting META-INF...")
    utils.rmdir(f"{ver1}_{mapping}/client/META-INF/")
    utils.rmdir(f"{ver2}_{mapping}/client/META-INF/")
    l = f"git diff --no-index {ver1}_{mapping} {ver2}_{mapping} > {n}"
    print(utils.c.WARNING, '>', l, utils.c.RESET)
    os.system(l)

def gen_diffs(ver1=None, ver2=None):
    utils.fetch_manifest()
    if ver1 and ver2:
        print(c.BOLD,"Diffing ", ver1, ver2,c.RESET)
    else:
        print(c.BOLD,"Diffing all versions",c.RESET)

    if not utils.has_dir('DecompilerMC/src/'):
        print("Not decompiled yet, run again with --decompile")
        return False

    os.makedirs('diffs', exist_ok=True)
    os.chdir('DecompilerMC/src/')

    mcp = []
    mojang = []

    for d in os.listdir('.'):
        if d.endswith('_mcp'):
            mcp.append(d.replace('_mcp', ''))
        elif d.endswith('_mojang'):
            mojang.append(d.replace('_mojang', ''))
        else:
            continue

    mcp=sorted(mcp, key=utils.get_date_for_version)
    mojang=sorted(mojang, key=utils.get_date_for_version)
        
    if ver1 and ver2:
        found = False
        if ver1 in mcp and ver2 in mcp:
            _gen_diffs(ver1, ver2, 'mcp')
            found = True

        if ver1 in mojang and ver2 in mojang:
            _gen_diffs(ver1, ver2, 'mojang')
            found = True

        if not found:
            print(utils.c.FAIL, f"Couldn't diff {ver1} and {ver2} because you haven't decompiled them. Run again with --decompile.", utils.c.RESET)
            # print("MCP Sorted: ", mcp)
            # print("Mojang sorted: ", mojang)
            return False
    else:
        mcp_pairs = make_pairs(mcp)
        moj_pairs = make_pairs(mojang)

        for pair in mcp_pairs:
            _gen_diffs(pair[0], pair[1], 'mcp')

        for pair in moj_pairs:
            _gen_diffs(pair[0], pair[1], 'mojang')

    print(c.OKGREEN, f"Successfully diff'ed. See diffs/", c.RESET)

    print("moving temp diffs to diffs/")
    for name in os.listdir('.'):
        if name.endswith('.diff'):
            try:
                os.remove(f"../../diffs/{name}")
            except Exception:
                pass
            utils.move(name, f"../../diffs/{name}")

    os.chdir('..')
    return True

def print_versions():
    utils.fetch_manifest(erase=True)
    manifest = utils.get_manifest()

    latest_release = manifest['latest']['release']
    latest_snapshot = manifest['latest']['snapshot']
    # print(latest_release, latest_snapshot)

    release_data = None
    snapshot_data = None
    
    vs = []
    newest_version = []

    for version in manifest['versions']:
        vid = version['id']
        if vid == latest_release:
            release_data = version
        if vid == latest_snapshot:
            snapshot_data = version

        if version['type'] == 'release':
            vs.append(c.OKGREEN + vid + c.RESET)
        else:
            vs.append(vid)

    latest_rel_time = release_data['releaseTime']
    latest_snap_time = snapshot_data['releaseTime']

    pb = [
        'LATEST:',
        f'\trelease {latest_release} ({latest_rel_time})',
        f'\tsnapshot {latest_snapshot} ({latest_snap_time})',
        'HISTORY:',
        f'\t{", ".join(vs)}'
    ]

    # print(manifest)
    print('\n'.join(pb))

def clean(args, versions=None):
    # user not decompiling/extracting, just erasing
    if not args.decompile and not args.extract:
        print("Erasing data for version",versions)
        for version in versions:
            decompiler.cleanup_version(version)
        # utils.rmdir('DecompilerMC/src/')
        # utils.rmdir('output/')
        return
    else:
        print('Erasing: ')
        print(utils.get_journal_writes())
        i = 0
        for filename in utils.get_journal_writes():
            os.remove(filename)
            i += 1
        print(f"Erased {i} files")


# TODO: update git submodules when run...
# git submodule sync --recursive ?
# or maybe an --update flag?

def main():
    parser = argparse.ArgumentParser('minecraft-data-extractor', epilog=EPILOG)
    parser.add_argument("-v", "--version", help=VERSION_HELP, required=True)
    parser.add_argument("--decompile", help="Decompile speicifed version", action='store_true')
    parser.add_argument("--extract", nargs='?', help="Possible extractors: burger, burger-extractor, jar-extractor, builtin. Seperate with commas. If none specified, all will be run.", const='')
    parser.add_argument("--diffs", help="Generate git diffs from decompiled versions", action='store_true')
    parser.add_argument("--clean", help="Erase data on completion (dry run).", action='store_true')
    parser.add_argument('--server', help="Decompile server instead of client", action='store_true')
    parser.add_argument("--ignoreMappings", help="Decompile even if mappings are not found", action='store_true')

    args = parser.parse_args()

    print("Args", args)

    versions = []
    _versions = args.version

    if '?' in _versions:
        print_versions()
        return

    if _versions == 'all':
        versions = []
    elif ',' in _versions and ('>' in _versions or '<' in _versions):
        parser.print_help()
        print("Invalid versions")
        sys.exit(1)
    else:
        versions = _versions.split(',')

    if args.decompile:
        print("Decompile ",versions,_versions, 'server' if args.server else 'client')
        decompiler.run(versions, client=not args.server, ignoreMappings=args.ignoreMappings)
    
    if args.extract != None:
        toppings_ava = ['burger', 'burger-extractor', 'jar-extractor', 'builtin']
        toppings_req = args.extract.split(',')
        toppings = []
        if not args.extract:
            toppings = toppings_ava
        else:
            for t in toppings_req:
                if t in toppings_ava:
                    toppings.append(t)

        extractor.run(versions, runBurger='burger' in toppings, runBE='burger-extractor' in toppings, runJarExtractor='jar-extractor' in toppings)

    if args.diffs:
        if len(versions)==2:
            gen_diffs(versions[0], versions[1])
        else:
            gen_diffs()

    print(f"Done: {len(utils.get_journal_writes())} files written")

    if args.clean:
        clean(args, versions)
        pass


if __name__ == "__main__":
    main()