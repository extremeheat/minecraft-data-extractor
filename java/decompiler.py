import os
import sys
import json
import utils
import shutil
from utils import c, has_dir
from shutil import copy2


verbose = False

def set_verbose(val):
    global verbose
    verbose = val

def install_minecraft_decompiler():
    if not has_dir('DecompilerMC'):
        raise 'You need to run `git submodule init` and `git submodule update`'

def cleanup_all():
    shutil.rmtree('DecompilerMC/src')
    shutil.rmtree('DecompilerMC/tmp')
    return


def cleanup_version(version):
    shutil.rmtree(f'DecompilerMC/src/{version}/')
    shutil.rmtree(f'DecompilerMC/src/{version}_mcp/')
    shutil.rmtree(f'DecompilerMC/src/{version}_mojang/')
    return True

# def get_versions_since(versionId, includeSnapshots):
#     assert type(versionId) == int
#     # open manifest

#     # maybe instead of passing an int versionId we could just pass in a version,
#     # convert it to a unix ts and then get all the versions after it?
#     do = get_date_for_version('1.%d' % versionId)

#     versions = []

#     j = utils.get_manifest()

#     for version in j['versions']:
#         v = version['id']
#         if '.' not in v:
#             if includeSnapshots and version['type'] != 'release':
#                 versions.append(version)
#         else:
#             dn = utils.get_unix_from_iso8601(version['date'])
#             if do < dn: # Version is older that versionId
#                 continue

#             s = v.split('.')
#             print (s)
#             minor = reads[1])

#             if minor > versionId:
#                 if version['type'] == 'release' or includeSnapshots:
#                     versions.append(version)

# returns path to tsrg / srg (legacy) for md_5's SpecialSource remapper
def get_mcp_mappings_for(version):
    p = f'./MCPConfig/versions/release/{version}/joined.tsrg'
    if os.path.isfile(p):
        return p
    else:
        with open('legacy_mappings/versions.json', 'r') as f:
            j = json.loads(f.read())

            if version in j:
                return f"legacy_mappings/{version}/joined.srg"

    return None


# if we don't have mappings for this version (mcp/mojang), do not decompile without ignoreMappings=True
def decompile_version(version, ignoreMappings=False):
    # version id
    vid = 0

    print(c.BOLD, "Decompiling", version, "this will take a while", c.RESET)

    failedBecauseNoMappings = False

    # If you crash here, you set an invalid version to decompile
    # if it looks complicated, its pretty simple: if normal dot release: 
    #   1.16.2-pre2 --> [1, 16], plus a way to compare greater/less than versions
    # else if snapshot:
    #   check date of snapshot, if older than 1.15 we don't have mappings, ignore
    if version == "latest" or version == "snapshot":
        version = utils.get_latest_version(typ)
    elif '.' not in version:
        dn = utils.get_date_for_version(version)
        if utils.mc_version_cmp(version, '1.15') < 0: # Snapshot is older than 1.15, we don't have mappings
            failedBecauseNoMappings = True
        else:
            # it works ¯\_(ツ)_/¯
            vid = dn

    if '.' in version:
        s = version.split('.')
        minor = int(s[1])
        try:
            patch = utils.read_int(s[2])
        except:
            patch = 0

        assert patch < 100

        vid = (minor << 8) + patch

    MC_7_10 = (7 << 8) + 10
    # We have Mojang mappings since 1.14.4
    # For both 1.14.4 and 1.15, we include both MCP and Mojang mappings (this just makes it easier to diff)
    MC_14_4 = (14 << 8) + 4
    MC_15_0 = (15 << 8) + 0
    D = "./DecompilerMC"

    # DecompilerMC spits out alot of input()s which are annoying, --quiet removes them. Unfortuantely this
    # also removes some useful debugging info, so run this script with --verbose to get all the messages.
    quiet = '' if verbose else '--quiet'

    # uses MCP mappings
    isLegacy = False

    if vid < MC_14_4:
        print(f"{version} < 1.14.4 -- legacy version so using MCP mappings", vid, MC_14_4)
        isLegacy = True

    if isLegacy:
        mapping = get_mcp_mappings_for(version)
        if not mapping:
            failedBecauseNoMappings = True

    if failedBecauseNoMappings or (vid < MC_7_10):
        if not ignoreMappings:
            print(c.FAIL, f"{version}: no mapping data! Skipping because ignoreMappings is false.", c.RESET)
            return
        print(f"{version}: no mapping data! JAR will only be decompiled. Abort now if you expected deobfuscation.", failedBecauseNoMappings, vid, MC_7_10)
        input("Press enter to continue.")
        # do not remap and basically just run fernflower
        l = f"python3 {D}/main.py -mcv {version} -na -rmap false --download_mapping false -dj true -rjar false -dec true -dd false -d fernflower"
        print("> ", l)
        return

    # MCP mappings
    if isLegacy or (vid == MC_15_0) or (vid == MC_14_4):
        mapping = get_mcp_mappings_for(version)
        print(f'{version}: Using MCP mappings at', mapping)
        # print(mapping)
        # vdir = f"{D}/mappings/"
        # if not has_dir(vdir):
        #     os.mkdir(vdir)
        # if not has_dir(vdir + version):
        #     os.mkdir(vdir + version)
        # print(f'{vdir + version}/client.tsrg')
        # if os.path.isfile(f'{vdir + version}/client.tsrg'):
        #     os.remove(f'{vdir + version}/client.tsrg')

        # srg = f'{D}/mappings/{version}/'
        # print(f'> copy {mapping} {srg}')
        # copy2(mapping, srg)

        os.chdir(D)
        l = f"python3 main.py -mcv {version} -na -rmap false --download_mapping false -dj true -rjar true -dec true -dd false -d fernflower -m ../{mapping} {quiet}"
        print(c.WARNING, ">", l, c.RESET)
        os.system(l)

        print(c.WARNING, f"> move {D}/src/{version} {D}/src/{version}_mcp/", c.RESET)
        os.rename(f"src/{version}/", f"src/{version}_mcp/")
        print(c.OKGREEN, f"{version} was successfully decompiled to {D}/src/{version}_mcp/", c.RESET)
        os.chdir('..')

    # Mojang mappings
    if not isLegacy:
        print(f"{version}: Using Mojang mappings")
        os.chdir(D)
        l = f"python3 main.py -mcv {version} -d fernflower {quiet}"
        print(c.WARNING, "> ", l, c.RESET)
        os.system(l)
        os.rename(f"src/{version}/", f"src/{version}_mojang/")
        print(c.OKGREEN, f"{version} was successfully decompiled to {D}/src/{version}_mojang/", c.RESET)
        os.chdir('..')


def already_decompiled(version):
    return has_dir(f'DecompilerMC/src/{version}') or has_dir(f'DecompilerMC/src/{version}_mcp') or has_dir(f'DecompilerMC/src/{version}_mojang')

def run(versions=[], actionOnExists='skip', ignoreMappings=False):
    utils.fetch_manifest()

    install_minecraft_decompiler()

    _vers = utils.extrapolate_versions(versions)

    print(c.BOLD, "Decompiling", _vers, c.RESET)

    for _ver in _vers:
        if already_decompiled(_ver):
            if actionOnExists == 'skip':
                print(c.WARNING, f"Skipping {_ver} because already exists. If you didn't expect this, run `python3 run.py --clean {_ver}`", c.RESET)
                continue
            elif actionOnExists == 'delete':
                cleanup_version(_ver)
        
        decompile_version(_ver, ignoreMappings)

# set_verbose(False)
# run([])
# cleanup_all()