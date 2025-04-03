xquery version "3.1";

declare namespace exist="http://exist.sourceforge.net/NS/exist";
declare namespace request="http://exist-db.org/xquery/request";

declare variable $exist:path external;
declare variable $exist:resource external;
declare variable $exist:controller external;
declare variable $exist:prefix external;
declare variable $exist:root external;

if ($exist:path eq "") then
    (: forward missing / to / :)
    <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
        <redirect url="{request:get-uri()}/"/>
    </dispatch>
else if ($exist:path eq "/") then
    (: redirect root path to index.html :)
    <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
        <redirect url="index.html"/>
    </dispatch>
else
    (: everything else is passed through :)
    <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
        <set-attribute name="exist:path" value="{$exist:path}"/>
        <set-attribute name="exist:resource" value="{$exist:resource}"/>
        <set-attribute name="exist:controller" value="{$exist:controller}"/>
        <set-attribute name="exist:prefix" value="{$exist:prefix}"/>
        <cache-control cache="yes"/>
        </dispatch>
