xquery version "3.1";

declare namespace exist="http://exist.sourceforge.net/NS/exist";
declare namespace request="http://exist-db.org/xquery/request";

declare variable $exist:path external;
declare variable $exist:resource external;
declare variable $exist:controller external;
declare variable $exist:prefix external;

if (matches($exist:path, '^/?$')) then
    (: redirect both simple slash and missing slash to index.html :)
    <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
        <redirect url="{request:get-context-path()}{$exist:prefix}{$exist:controller}/index.html{if(string-length(request:get-query-string()) gt 0) then '?' else ''}{request:get-query-string()}"/>
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
