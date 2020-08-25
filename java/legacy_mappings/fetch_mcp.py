import json
import urllib.request
import zipfile
import os
import shutil


## **The data here is already pre-generated. If you want the patches stuff, delete the directories
## and run this script and comment out the code below that deletes the patches dir

m = """
1.12.2	09/18/17 08:47 PM
1.12.1	08/03/17 10:52 PM
1.12	06/20/17 09:06 AM
1.11.2	12/24/16 03:01 AM
1.11.1	12/24/16 02:50 AM
1.11	12/06/16 11:43 PM
1.10.2	06/28/16 04:09 AM
1.10	06/28/16 04:02 AM
1.9.4	05/17/16 12:22 AM
1.9.2	05/01/16 07:47 PM
1.9	05/01/16 07:47 PM	
1.8.9	03/01/16 03:45 PM	
1.8.8	11/28/15 01:19 PM
1.8	11/19/15 01:33 PM	
1.7.10	11/19/15 01:33 PM
"""

# 

versions = []

for line in m.split('\n'):
    s = line.split('\t')
    if len(s) < 2:
        continue
    version = s[0]

    print(version)

    url = f"http://files.minecraftforge.net/maven/de/oceanlabs/mcp/mcp/{version}/mcp-{version}-srg.zip"
    z = f"{version}.zip"

    if not os.path.isdir(version):
        with urllib.request.urlopen(url) as f:
            with open(z, 'wb') as f2:
                f2.write(f.read())

        with zipfile.ZipFile(z, 'r') as f:
            f.extractall(version)
            shutil.rmtree(f'./{version}/patches/')
            # try:
                # os.rmdir(f'./{version}/patches/')
            # except Exception:
                # pass

    versions.append(version)
    try:
        os.remove(z)
    except Exception:
        pass


with open('versions.json', 'w') as f:
    f.write(json.dumps(versions))