A wrapper for Minecraft data extractors.

## java


Features:
* Supports all Minecraft versions since 1.7
* Extracts data for use in PrismarineJS/minecraft-data with Burger, burger-extractor, minecraft-jar-extractor
* Decompiles any Minecraft version with DecompilerMC via Fernflower and SpecialSource
* Generates cross version git "diffs" with both MCP and Mojang mappings
* Really slow

TODO:
* Updating -- please update with git pull && git submodule sync --recursive

### Examples

Please note you need Python 3.6+ (make sure your python3 points to proper version), Node.js 14+, and Git. JDK is needed if you intend to decompile.

```sh
git clone --recursive https://github.com/extremeheat/minecraft-data-extractor.git
cd java
# You need to install python3, pip3 and the following for Burger:
pip3 install six>=1.4.0 && pip3 install Jawa>=2.2.0
python3 run.py --help
```

```
usage: minecraft-data-extractor [-h] -v VERSION [--decompile]
                                [--extract [EXTRACT]] [--diffs] [--clean]
                                [--ignoreMappings]

optional arguments:
  -h, --help            show this help message and exit
  -v VERSION, --version VERSION
                        Specify the version(s) you want to work with per
                        syntax Seperate with commas, or use range (<>=-)
                        syntax For example, `-v >=1.13` will select all
                        versions past 1.12 `-v <1.13` will select all versions
                        below 1.13 `-v 1.12.2` will select 1.12, -v 1 `-v
                        1.16,1.16.1` will select 1.16 and 1.16.1... so forth.
                        You can also use "all", "latest" or "snapshot". To get
                        a list of versions, use -v ?
  --decompile           Decompile speicifed version
  --extract [EXTRACT]   Possible extractors: burger, burger-extractor, jar-
                        extractor, builtin. Seperate with commas. If none
                        specified, all will be run.
  --diffs               Generate git diffs from decompiled versions
  --clean               Erase data on completion (dry run).
  --ignoreMappings      Decompile even if mappings are not found

Arg parsing order: run decompile, extract, make diffs, clean The output to
decompiled versions will be in DecompilerMC/src/. The output to extractor data
will be in output/.
```

* Decompile all versions since 1.7 and generate diffs in diffs/

`python3 run.py --version all --decompile`

* Run extractors on 1.16.2

`python3 run.py --version 1.16.2 --extract`

* Decompile, extract, generate diffs between 1.16.1 and 1.16.2

`python3 run.py --version 1.16.1,1.16.2 --diff --decompile --extract`
