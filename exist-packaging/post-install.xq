xquery version "3.1";

(:~
 : Post-install script for the Edirom Online Frontend app.
 :
 : Allows the backend connection details ("backendURL" and "backendPath") of
 : the deployed config.json to be overridden at installation/container-start
 : time without having to rebuild or repackage the .xar file.
 :
 : Only the values that are actually provided at run time are changed; all
 : other keys of the deployed config.json are left untouched. The override
 : values are resolved in the following order (first match wins):
 :   1. the environment variables BACKEND_URL / BACKEND_PATH
 :   2. a JSON file (see BACKEND_CONFIG_FILE / $local:default-config-file below)
 :      with the shape { "backendURL": "...", "backendPath": "..." }
 : If neither is set for a given key, the value already present in the
 : deployed config.json (baked in at build time) is kept.
 :)

import module namespace xmldb = "http://exist-db.org/xquery/xmldb";
import module namespace file = "http://exist-db.org/xquery/file";

(: the following external variables are provided by repo:deploy() :)
declare variable $home external;
declare variable $dir external;
declare variable $target external;

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

declare function local:deployed-config() as map(*) {
    try {
        parse-json(util:binary-to-string(util:binary-doc($target || "/config.json")))
    } catch * {
        map {}
    }
};

let $file-config := local:file-config()
let $backend-url := (local:env("BACKEND_URL"), $file-config?backendURL)[1]
let $backend-path := (local:env("BACKEND_PATH"), $file-config?backendPath)[1]
let $overrides := map:merge((
    if (exists($backend-url)) then map { "backendURL": $backend-url } else map {},
    if (exists($backend-path)) then map { "backendPath": $backend-path } else map {}
))
return
    (: only touch config.json if there actually is something to override :)
    if (map:size($overrides) eq 0) then
        ()
    else
        let $config := serialize(
            map:merge((local:deployed-config(), $overrides), map { "duplicates": "use-last" }),
            map { "method": "json" }
        )
        return
            xmldb:store($target, "config.json", $config, "application/json")
