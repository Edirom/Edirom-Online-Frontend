#!/bin/sh

while getopts "d" flag; do
 case $flag in
   d) # Handle the -d flag
   # run docker
   echo "Running in Docker..."
    # remove -d from the list of input arguments
    shift $((OPTIND-1))
    # set a variable OPTIONS with the remaining input arguments to pass to the build command
    OPTIONS=${@}
    # run docker
    docker run --rm -it -v `pwd`:/app --name sencha ghcr.io/bwbohl/sencha-cmd:2.1.0 "./build.sh $OPTIONS"
   exit
   ;;
   \?)
   # Handle invalid options
   ;;
 esac
done

# Welcome
echo "******************************************************"
echo "* Welcome to the Edirom-Online Frontend build script *"
echo "******************************************************"
echo ""


# set shell to exit if any command fails
set -e

# check dependencies
echo ""
echo "Checking dependencies…"
echo "----------------------"
type sencha ant ruby >&2
xargs=$(which gxargs || which xargs)
echo ""

# cleaning the build dir
echo ""
echo "Cleaning…"
echo "---------"
sencha ant clean

# building the app
echo ""
echo "Building Edirom-Online Frontend…"
echo "-----------------"
sencha app build ${@}

# download euryanthe font
echo ""
echo "Downloading Euryanthe Font…"
echo "------------------------------------------------"
ant download-euryanthe

# inject build properties
echo ""
echo "Injecting build properties…"
echo "------------------------------------------------"
ant inject-properties

# build xar
echo ""
echo "Packaging Edirom-Online Frontend as XAR archive…"
echo "---------------------------------------"
ant xar
