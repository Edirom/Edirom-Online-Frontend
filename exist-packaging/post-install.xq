xquery version "3.1";

(:~
 : Post-install script for the Edirom Online Frontend app.
 :
 : Allows the backend connection details ("backendURL" and "backendPath") of
 : the deployed config.json to be overridden at installation/container-start
 : time without having to rebuild or repackage the .xar file.
 :
 : The values are resolved in the following order (first match wins):
 :   1. the environment variables BACKEND_URL / BACKEND_PATH
 :   2. a JSON file (see BACKEND_CONFIG_FILE / $default-config-file below)
 :      with the shape { "backendURL": "...", "backendPath": "..." }
 :   3. the values that were baked into config.json at build time
 :)

import module namespace xmldb = "http://exist-db.org/xquery/xmldb";
import module namespace file = "http://exist-db.org/xquery/file";

(: the following external variables are provided by repo:deploy() :)
declare variable $home external;
declare variable $dir external;
declare variable $target external;

(: values injected at build time from build.xml, used as a fallback :)
declare variable $local:build-backend-url := "@backend.url@";
declare variable $local:build-backend-path := "@backend.path@";

(: default location of an optional JSON file providing override values,
   e.g. mounted as a Docker volume; can be changed via BACKEND_CONFIG_FILE :)
declare variable $local:default-config-file := "/exist-config/config.json";

declare function local:env($name as xs:string) as xs:string? {
    let $value :=
        try {
            environment-variable($name)
        } catch * {
            ()
        }
    return
        if (exists($value) and string-length($value) gt 0) then $value else ()
};

declare function local:file-config() as map(*) {
    let $config-file := (local:env("BACKEND_CONFIG_FILE"), $local:default-config-file)[1]
    return
        if (file:exists($config-file)) then
            try {
                parse-json(file:read($config-file))
            } catch * {
                map {}
            }
        else
            map {}
};

let $file-config := local:file-config()
let $backend-url := (local:env("BACKEND_URL"), $file-config?backendURL, $local:build-backend-url)[1]
let $backend-path := (local:env("BACKEND_PATH"), $file-config?backendPath, $local:build-backend-path)[1]
let $config := serialize(
    map { "backendURL": $backend-url, "backendPath": $backend-path },
    map { "method": "json" }
)
return
    xmldb:store($target, "config.json", $config, "application/json")
