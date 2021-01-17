import os
import sys
import json
import utils
import shutil
import re
from utils import c, has_dir
from shutil import copy2


verbose = True

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
    utils.rmdir(f'DecompilerMC/src/{version}/')
    utils.rmdir(f'DecompilerMC/src/{version}_mcp/')
    utils.rmdir(f'DecompilerMC/src/{version}_mojang/')
    return True

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
def decompile_version(version, client=True, ignoreMappings=False):
    print("\n-------")

    print(c.BOLD, "Decompiling", version, "this will take a while", c.RESET)

    failedBecauseNoMappings = False

    # If you crash here, you set an invalid version to decompile
    if version == "latest" or version == "snapshot":
        version = utils.get_latest_version(typ)
    else:
        dn = utils.get_date_for_version(version)


    # We have Mojang mappings since 1.14.4
    # For both 1.14.4 and 1.15, we include both MCP and Mojang mappings (this just makes it easier to diff)
    
    D = "./DecompilerMC"

    # DecompilerMC spits out alot of input()s which are annoying, --quiet removes them. Unfortuantely this
    # also removes some useful debugging info, so run this script with --verbose to get all the messages.
    quiet = '' if verbose else '--quiet'

    # uses MCP mappings
    isLegacy = False

    if utils.mc_version_cmp(version, '1.14.4') < 0:
        print(f"{version} < 1.14.4 -- legacy version so using MCP mappings")
        isLegacy = True

    if isLegacy:
        mapping = get_mcp_mappings_for(version)
        if not mapping:
            print("No MCP mappings for", version)
            failedBecauseNoMappings = True

    if failedBecauseNoMappings or (utils.mc_version_cmp(version, '1.7.10') < 0):
        if not ignoreMappings:
            print(c.FAIL, f"{version}: no mapping data! Skipping because ignoreMappings is false.", c.RESET)
            return
        print(f"{version}: no mapping data! JAR will only be decompiled. Abort now if you expected deobfuscation.")
        input("Press enter to continue.")
        # do not remap and basically just run fernflower
        s = '' if client else '--side server'
        l = f"python3 {D}/main.py -mcv {version} -na -rmap false --download_mapping false -dj true -rjar false -dec true -dd false -d fernflower {s}"
        print("> ", l)
        os.system(l)
        return

    # MCP mappings
    if isLegacy or (utils.mc_version_cmp(version, '1.15') == 0) or (utils.mc_version_cmp(version, '1.14.4') == 0):
        mapping = get_mcp_mappings_for(version)
        print(f'{version}: Using MCP mappings at', mapping)

        os.chdir(D)
        s = '' if client else '--side server'
        l = f"python3 main.py -mcv {version} -na -rmap false --download_mapping false -dj true -rjar true -dec true -dd false -d fernflower {s} -m ../{mapping} {quiet}"
        print(c.WARNING, ">", l, c.RESET)
        ret = os.system(l)
        if ret:
            raise "Decompile failed - non-zero exit code"

        print(c.WARNING, f"> move {D}/src/{version} {D}/src/{version}_mcp/", c.RESET)
        os.rename(f"src/{version}/", f"src/{version}_mcp/")
        print(c.OKGREEN, f"{version} was successfully decompiled to {D}/src/{version}_mcp/", c.RESET)
        os.chdir('..')

    # Mojang mappings
    if not isLegacy:
        print(f"{version}: Using Mojang mappings")
        os.chdir(D)
        s = '' if client else '--side server'
        l = f"python3 main.py -mcv {version} -d fernflower {quiet} {s}"
        print(c.WARNING, "> ", l, c.RESET)
        os.system(l)
        os.rename(f"src/{version}/", f"src/{version}_mojang/")
        print(c.OKGREEN, f"{version} was successfully decompiled to {D}/src/{version}_mojang/", c.RESET)
        os.chdir('..')


# PATCHING

def get_forge_patches(version):
    d1 = f'./MCPConfig/versions/release/{version}'
    d2 = f'./legacy_mappings/{version}'

    if os.path.isdir(d1):
        dp = d1
    elif os.path.isdir(d2):
        if not os.path.isdir(d2 + '/patches/'):
            os.chdir(d1)
            l = f"python3 fetch_mcp.py {version}"
            print(">", l)
            os.system(l)
            os.chdir('../../../')
        dp = d2
    else:
        raise ValueError("No mapping data found for " + version)

    patches_dir = dp + '/patches'

    patch_files = [os.path.join(dp, f) for dp, dn, filenames in os.walk(patches_dir) for f in filenames if os.path.splitext(f)[-1] == '.patch']

    patch_lines = []

    for patch_file in patch_files:
        lines = [line.rstrip() for line in open(patch_file)]
        patch_lines += lines

    tsrg_path = dp + '/joined.tsrg'
    mapping_lines = [line.rstrip() for line in open(tsrg_path)]

    return mapping_lines, patch_lines

    # print(patch_files)
    # with open('out-patches.patch', 'w') as f:
    #     f.write('\n'.join(patch_lines))

def get_patches(version):
    forge_mappings, forge_patches = get_forge_patches(version)

    mojang_path = f'./DecompilerMC/mappings/{version}/client.tsrg'
    mojang_mappings = [line.rstrip() for line in open(mojang_path)]

    def make_data_struct(mappings):
        fm = {}
        last_class = None
        for line in mappings:
            s = line.strip().split(' ')
            # print(s,line.startswith('\t'))
            if line.startswith('\t'):
                last_class_name = last_class.split(' ')[0]
                if len(s) > 2:
                    fm[last_class_name + '.' + s[0] + '.' + s[1]] = s[2]
                else:
                    fm[last_class_name + '.' + s[0]] = s[1]
            else:
                class_name = line.split(' ')[0]
                fm[s[0]] = s[1]
                last_class = line

        return fm

    # Convert forge mapping -> mojang mapping
    forge_map, mojang_map = make_data_struct(forge_mappings), make_data_struct(mojang_mappings)

    # with open('output-m.json', 'w') as f:
    #     f.write(json.dumps(forge_map))

    f2m_map = {}
    fcm = {}
    for key,val in forge_map.items():
        s = key.split('.')
        i = s[0].split('$')[0] # lambda mappings -> base class namespace
        if len(s) == 1:
            # print (key,val,i, mojang_map[key])
            fcm[val] = i
        if i not in f2m_map:
            f2m_map[i] = []
        if [val, mojang_map[key]] not in f2m_map[i]:
            f2m_map[i].append([val, mojang_map[key]]) 

    with open('output-m.json', 'w') as f:
        f.write(json.dumps(f2m_map))

    print(fcm)
    # sys.exit()

    cp = ''
    new_forge_patches = []
    for line in forge_patches:
        # print("LINE>", line)
        if line.startswith('---'):
            # print (line)
            _, path = line.split(' ')
            cp = path.replace('a/', '').replace('.java', '')

        if cp not in fcm:
            print("Ignoring ", cp, ": don't know mapping")
            continue
        cpi = fcm[cp]
        # print(cpi)
        rw_rules = f2m_map[cpi]
        # rw_rules.append([cp, cpi])

        for rw_rule in rw_rules:
            # print("rule>",rw_rule)
            orig,repl = rw_rule
            x = f"({re.escape(orig)})"
            # print(x)
            matches = [(x.start(),x.end()) for x in re.finditer(x, line)]
            # print(matches)
            if len(matches):
                print (rw_rule,line)
                line = line.replace(orig,repl)
                # print(line)

        new_forge_patches.append(line)
        with open('out-patches-mojang.patch', 'w') as f:
            f.write('\n'.join(new_forge_patches))

            # for match in matches:
                # print(match)

def apply_patches(version):

    # mcp_patch_dir = 

    pass

# end patching

def already_decompiled(version, client=True):
    s = 'client' if client else 'server'
    return has_dir(f'DecompilerMC/src/{version}/{s}') or has_dir(f'DecompilerMC/src/{version}_mcp/{s}') or has_dir(f'DecompilerMC/src/{version}_mojang/{s}')

def run(versions=[], client=True, actionOnExists='skip', ignoreMappings=False):
    utils.fetch_manifest()

    install_minecraft_decompiler()

    _vers = utils.extrapolate_versions(versions)

    print(c.BOLD, "Decompiling", _vers, c.RESET)

    for _ver in _vers:
        if already_decompiled(_ver, client):
            if actionOnExists == 'skip':
                print(c.WARNING, f"Skipping {_ver} because already exists. If you didn't expect this, run `python3 run.py --version {_ver} --clean`", c.RESET)
                continue
            elif actionOnExists == 'delete':
                cleanup_version(_ver)
        
        decompile_version(_ver, client, ignoreMappings)

# set_verbose(False)
# run([])
# cleanup_all()

# get_patches('1.16.2')