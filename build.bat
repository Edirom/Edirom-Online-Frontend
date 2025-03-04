::
:: cleaning the build dir
sencha ant clean

:: building the app
sencha app build

:: download the Euryanthe Font
call ant download-euryanthe

:: build xar
call ant xar