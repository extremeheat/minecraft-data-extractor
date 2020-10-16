import json
import os
import shutil
from datetime import datetime
# if you crash here: You need to run `git submodule init` and `git submodule update`  
from DecompilerMC.main import get_global_manifest

# https://stackoverflow.com/a/27251994/11173996
def get_unix_from_iso8601(string):
    ts = string.split('+')[0]
    utc_dt = datetime.strptime(ts, '%Y-%m-%dT%H:%M:%S')

    # Convert UTC datetime to seconds since the Epoch
    timestamp = (utc_dt - datetime(1970, 1, 1)).total_seconds()
    return timestamp

# https://stackoverflow.com/a/17888234/11173996
def read_int(string):
    return int(''.join(c for c in string if c.isdigit()))


def has_dir(d):
    return os.path.isdir(d)

def rmdir(d):
    try:
        shutil.rmtree(d)
    except FileNotFoundError:
        pass

def move(start,end):
    # try:
    # os.rename(start,end)
    # except Exception:
    #   pass
    # return
    print("> move", start,end)
    # why command line? because python moving (shutil) is a mess that sometimes copies
    # and os.rename() doesn't work on relative paths
    if os.name == "nt":
        start = start.replace('/', '\\')
        end = end.replace('/', '\\')
        os.system(f"move {start} {end}")
    else:
        os.system(f"mv {start} {end}")


fs_writes = []

def journal_write(path):
    fs_writes.append(os.path.abspath(path))

def get_journal_writes():
    return fs_writes

loaded_manifest = None

def fetch_manifest(erase=False):
    global loaded_manifest
    os.chdir('DecompilerMC')
    os.makedirs('versions', exist_ok=True)
    try:
        if erase:
            os.remove('versions/version_manifest.json')
        get_global_manifest(False)
    except Exception as e:
        print("Failed to get global manifest", e)
        pass # manifest probably exists

    with open('versions/version_manifest.json', 'r') as f:
        loaded_manifest = json.loads(f.read())

    print('Loaded manifest')
    os.chdir('..')
    pass

def get_manifest():
    return loaded_manifest

def get_latest_version(typ):
    return loaded_manifest['latest'][typ.replace('latest', 'release')]

def get_date_for_version(version):
    j = get_manifest()

    # print("Get date for", version)

    for data in j['versions']:
        s = data['id']

        if s == version:
            return get_unix_from_iso8601(data['releaseTime'])

    possibles = []
    for data in j['versions']:
        possibles.append(data['id'])
    
    raise Exception(f"Unknown version {version}. Possible versions: {', '.join(possibles)}")

#returns path if we have a decompiled version stored
def get_decompiled_version(version):
    if has_dir(f'DecompilerMC/src/{version}_mojang'):
        return f'DecompilerMC/src/{version}_mojang'
    elif has_dir(f'DecompilerMC/src/{version}_mcp'):
        return f'DecompilerMC/src/{version}_mcp'
    elif has_dir(f'DecompilerMC/src/{version}'):
        return f'DecompilerMC/src/{version}'
    return None

def get_versions(includeSnapshots=False):
    versions = []

    j = get_manifest()

    for version in j['versions']:
        if version['type'] == 'snapshot' and not includeSnapshots:
            continue
        v = version['id']
        versions.append(v)

    return versions

def get_versions_since(version, includeSnapshots=False):
    do = get_date_for_version(version)

    versions = []

    j = get_manifest()

    for version in j['versions']:
        v = version['id']
        # print(version)
        dn = get_unix_from_iso8601(version['releaseTime'])
        if dn < do: # Version is older that versionId
            continue
    
        if version['type'] == 'release' or includeSnapshots:
            versions.append(version)

    return versions

def get_version_before(version, includeSnapshots=False):
    do = get_date_for_version(version)
    versions = []

    j = get_manifest()

    for version in j['versions']:
        v = version['id']
        # print(version)
        dn = get_unix_from_iso8601(version['releaseTime'])
        if dn > do: # Version is older that versionId
            continue
    
        if version['type'] == 'release' or includeSnapshots:
            versions.append(version['id'])
    print(versions,sorted(versions, key=get_date_for_version,reverse=True))
    try:
        return sorted(versions, key=get_date_for_version,reverse=True)[1]
    except Exception:
        return None

def mc_version_cmp(ver1, ver2):
    d1 = get_date_for_version(ver1)
    d2 = get_date_for_version(ver2)

    # why does cmp() not exist in python3??

    if d1 < d2:
        return -1
    elif d1 > d2:
        return 1
    return 0


# ">1.8" -> returns all versions after 1.8
# only extrapolates since 1.7.10 as we don't have mappings prior
def extrapolate_versions(versions):
    _vers = []
    if len(versions) == 0:
        # we get all the versions--we don't actually decompile most snapshots since mappings aren't provided in MCP
        vs = get_versions_since('1.7.10', False)
        for v in vs:
            _vers.append(v['id'])
    elif len(versions) == 1:
        version = versions[0].replace('<', '').replace('>', '').replace('=','')
        if '<' in versions[0]:
            _vers = []
            vs = get_versions_since('1.7.10')
            for v in vs:
                print(v,version)
                if v['id'] == version:
                    if '=' in versions[0]:
                        _vers.append(v['id'])
                    break
                _vers.append(v['id'])
        elif '>' in versions[0]:
            vs = get_versions_since(version)
            _vers = []
            for v in vs:
                _vers.append(v['id'])
            if '=' not in versions[0]:
                _vers.pop()
        else:
            _vers = [version]
    else:
        mversions = get_versions(includeSnapshots=True)

        for version in versions:
            if version not in mversions:
                raise ValueError("Not a valid version: " + version + ", run with --version ?")

        _vers = versions

    return _vers

# pretty colors :)

class c:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    RESET = '\033[0m'
    BOLD = '\033[1m'
    WHITE = '\033[37m'
    YELLOW = '\033[33m'
    UNDERLINE = '\033[4m'

# https://stackoverflow.com/a/1325587/11173996
def enable_win_colors():
    import ctypes

    kernel32 = ctypes.windll.kernel32
    kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)

if os.name == 'nt':
    enable_win_colors()