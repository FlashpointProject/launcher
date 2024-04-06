/*! For license information please see 2e30dc23.1e39917a.js.LICENSE.txt */
"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[2099],{1664:e=>{var n=Object.getOwnPropertySymbols,r=Object.prototype.hasOwnProperty,t=Object.prototype.propertyIsEnumerable;e.exports=function(){try{if(!Object.assign)return!1;var e=new String("abc");if(e[5]="de","5"===Object.getOwnPropertyNames(e)[0])return!1;for(var n={},r=0;r<10;r++)n["_"+String.fromCharCode(r)]=r;if("0123456789"!==Object.getOwnPropertyNames(n).map((function(e){return n[e]})).join(""))return!1;var t={};return"abcdefghijklmnopqrst".split("").forEach((function(e){t[e]=e})),"abcdefghijklmnopqrst"===Object.keys(Object.assign({},t)).join("")}catch(i){return!1}}()?Object.assign:function(e,i){for(var o,l,s=function(e){if(null==e)throw new TypeError("Object.assign cannot be called with null or undefined");return Object(e)}(e),a=1;a<arguments.length;a++){for(var c in o=Object(arguments[a]))r.call(o,c)&&(s[c]=o[c]);if(n){l=n(o);for(var d=0;d<l.length;d++)t.call(o,l[d])&&(s[l[d]]=o[l[d]])}}return s}},2192:(e,n,r)=>{r(1664);var t=r(3696),i=60103;if(n.Fragment=60107,"function"==typeof Symbol&&Symbol.for){var o=Symbol.for;i=o("react.element"),n.Fragment=o("react.fragment")}var l=t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,s=Object.prototype.hasOwnProperty,a={key:!0,ref:!0,__self:!0,__source:!0};function c(e,n,r){var t,o={},c=null,d=null;for(t in void 0!==r&&(c=""+r),void 0!==n.key&&(c=""+n.key),void 0!==n.ref&&(d=n.ref),n)s.call(n,t)&&!a.hasOwnProperty(t)&&(o[t]=n[t]);if(e&&e.defaultProps)for(t in n=e.defaultProps)void 0===o[t]&&(o[t]=n[t]);return{$$typeof:i,type:e,key:c,ref:d,props:o,_owner:l.current}}n.jsx=c,n.jsxs=c},4403:(e,n,r)=>{var t=r(1664),i=60103,o=60106;n.Fragment=60107,n.StrictMode=60108,n.Profiler=60114;var l=60109,s=60110,a=60112;n.Suspense=60113;var c=60115,d=60116;if("function"==typeof Symbol&&Symbol.for){var u=Symbol.for;i=u("react.element"),o=u("react.portal"),n.Fragment=u("react.fragment"),n.StrictMode=u("react.strict_mode"),n.Profiler=u("react.profiler"),l=u("react.provider"),s=u("react.context"),a=u("react.forward_ref"),n.Suspense=u("react.suspense"),c=u("react.memo"),d=u("react.lazy")}var f="function"==typeof Symbol&&Symbol.iterator;function h(e){for(var n="https://reactjs.org/docs/error-decoder.html?invariant="+e,r=1;r<arguments.length;r++)n+="&args[]="+encodeURIComponent(arguments[r]);return"Minified React error #"+e+"; visit "+n+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var p={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},m={};function g(e,n,r){this.props=e,this.context=n,this.refs=m,this.updater=r||p}function x(){}function y(e,n,r){this.props=e,this.context=n,this.refs=m,this.updater=r||p}g.prototype.isReactComponent={},g.prototype.setState=function(e,n){if("object"!=typeof e&&"function"!=typeof e&&null!=e)throw Error(h(85));this.updater.enqueueSetState(this,e,n,"setState")},g.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")},x.prototype=g.prototype;var j=y.prototype=new x;j.constructor=y,t(j,g.prototype),j.isPureReactComponent=!0;var v={current:null},w=Object.prototype.hasOwnProperty,b={key:!0,ref:!0,__self:!0,__source:!0};function _(e,n,r){var t,o={},l=null,s=null;if(null!=n)for(t in void 0!==n.ref&&(s=n.ref),void 0!==n.key&&(l=""+n.key),n)w.call(n,t)&&!b.hasOwnProperty(t)&&(o[t]=n[t]);var a=arguments.length-2;if(1===a)o.children=r;else if(1<a){for(var c=Array(a),d=0;d<a;d++)c[d]=arguments[d+2];o.children=c}if(e&&e.defaultProps)for(t in a=e.defaultProps)void 0===o[t]&&(o[t]=a[t]);return{$$typeof:i,type:e,key:l,ref:s,props:o,_owner:v.current}}function C(e){return"object"==typeof e&&null!==e&&e.$$typeof===i}var S=/\/+/g;function E(e,n){return"object"==typeof e&&null!==e&&null!=e.key?function(e){var n={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,(function(e){return n[e]}))}(""+e.key):n.toString(36)}function O(e,n,r,t,l){var s=typeof e;"undefined"!==s&&"boolean"!==s||(e=null);var a=!1;if(null===e)a=!0;else switch(s){case"string":case"number":a=!0;break;case"object":switch(e.$$typeof){case i:case o:a=!0}}if(a)return l=l(a=e),e=""===t?"."+E(a,0):t,Array.isArray(l)?(r="",null!=e&&(r=e.replace(S,"$&/")+"/"),O(l,n,r,"",(function(e){return e}))):null!=l&&(C(l)&&(l=function(e,n){return{$$typeof:i,type:e.type,key:n,ref:e.ref,props:e.props,_owner:e._owner}}(l,r+(!l.key||a&&a.key===l.key?"":(""+l.key).replace(S,"$&/")+"/")+e)),n.push(l)),1;if(a=0,t=""===t?".":t+":",Array.isArray(e))for(var c=0;c<e.length;c++){var d=t+E(s=e[c],c);a+=O(s,n,r,d,l)}else if(d=function(e){return null===e||"object"!=typeof e?null:"function"==typeof(e=f&&e[f]||e["@@iterator"])?e:null}(e),"function"==typeof d)for(e=d.call(e),c=0;!(s=e.next()).done;)a+=O(s=s.value,n,r,d=t+E(s,c++),l);else if("object"===s)throw n=""+e,Error(h(31,"[object Object]"===n?"object with keys {"+Object.keys(e).join(", ")+"}":n));return a}function R(e,n,r){if(null==e)return e;var t=[],i=0;return O(e,t,"","",(function(e){return n.call(r,e,i++)})),t}function k(e){if(-1===e._status){var n=e._result;n=n(),e._status=0,e._result=n,n.then((function(n){0===e._status&&(n=n.default,e._status=1,e._result=n)}),(function(n){0===e._status&&(e._status=2,e._result=n)}))}if(1===e._status)return e._result;throw e._result}var P={current:null};function $(){var e=P.current;if(null===e)throw Error(h(321));return e}var L={ReactCurrentDispatcher:P,ReactCurrentBatchConfig:{transition:0},ReactCurrentOwner:v,IsSomeRendererActing:{current:!1},assign:t};n.Children={map:R,forEach:function(e,n,r){R(e,(function(){n.apply(this,arguments)}),r)},count:function(e){var n=0;return R(e,(function(){n++})),n},toArray:function(e){return R(e,(function(e){return e}))||[]},only:function(e){if(!C(e))throw Error(h(143));return e}},n.Component=g,n.PureComponent=y,n.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=L,n.cloneElement=function(e,n,r){if(null==e)throw Error(h(267,e));var o=t({},e.props),l=e.key,s=e.ref,a=e._owner;if(null!=n){if(void 0!==n.ref&&(s=n.ref,a=v.current),void 0!==n.key&&(l=""+n.key),e.type&&e.type.defaultProps)var c=e.type.defaultProps;for(d in n)w.call(n,d)&&!b.hasOwnProperty(d)&&(o[d]=void 0===n[d]&&void 0!==c?c[d]:n[d])}var d=arguments.length-2;if(1===d)o.children=r;else if(1<d){c=Array(d);for(var u=0;u<d;u++)c[u]=arguments[u+2];o.children=c}return{$$typeof:i,type:e.type,key:l,ref:s,props:o,_owner:a}},n.createContext=function(e,n){return void 0===n&&(n=null),(e={$$typeof:s,_calculateChangedBits:n,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null}).Provider={$$typeof:l,_context:e},e.Consumer=e},n.createElement=_,n.createFactory=function(e){var n=_.bind(null,e);return n.type=e,n},n.createRef=function(){return{current:null}},n.forwardRef=function(e){return{$$typeof:a,render:e}},n.isValidElement=C,n.lazy=function(e){return{$$typeof:d,_payload:{_status:-1,_result:e},_init:k}},n.memo=function(e,n){return{$$typeof:c,type:e,compare:void 0===n?null:n}},n.useCallback=function(e,n){return $().useCallback(e,n)},n.useContext=function(e,n){return $().useContext(e,n)},n.useDebugValue=function(){},n.useEffect=function(e,n){return $().useEffect(e,n)},n.useImperativeHandle=function(e,n,r){return $().useImperativeHandle(e,n,r)},n.useLayoutEffect=function(e,n){return $().useLayoutEffect(e,n)},n.useMemo=function(e,n){return $().useMemo(e,n)},n.useReducer=function(e,n,r){return $().useReducer(e,n,r)},n.useRef=function(e){return $().useRef(e)},n.useState=function(e){return $().useState(e)},n.version="17.0.2"},3696:(e,n,r)=>{e.exports=r(4403)},2540:(e,n,r)=>{e.exports=r(2192)},6158:(e,n,r)=>{r.r(n),r.d(n,{assets:()=>a,contentTitle:()=>l,default:()=>u,frontMatter:()=>o,metadata:()=>s,toc:()=>c});var t=r(2540),i=r(8453);const o={},l="Middleware (Disabled)",s={id:"middleware",title:"Middleware (Disabled)",description:"Extensions can provide middleware which a user can choose to apply before a game launches. This can be useful for modifying game files, creating new files or modifying launch options before a game starts.",source:"@site/../docs/middleware.md",sourceDirName:".",slug:"/middleware",permalink:"/launcher/docs/middleware",draft:!1,unlisted:!1,editUrl:"https://github.com/FlashpointProject/launcher/edit/develop/website/../docs/middleware.md",tags:[],version:"current",lastUpdatedAt:1712232716e3,frontMatter:{}},a={},c=[{value:"Changing Launch Info",id:"changing-launch-info",level:2},{value:"Replacing Existing Game Files",id:"replacing-existing-game-files",level:2},{value:"Developer Notes",id:"developer-notes",level:2}];function d(e){const n={code:"code",h1:"h1",h2:"h2",li:"li",p:"p",strong:"strong",ul:"ul",...(0,i.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.h1,{id:"middleware-disabled",children:"Middleware (Disabled)"}),"\n",(0,t.jsx)(n.p,{children:"Extensions can provide middleware which a user can choose to apply before a game launches. This can be useful for modifying game files, creating new files or modifying launch options before a game starts."}),"\n",(0,t.jsx)(n.h1,{id:"context---game-configurations",children:"Context - Game Configurations"}),"\n",(0,t.jsx)(n.p,{children:"Each game configuration belongs to a specific game ID, and has a specific owner. It contains a list of configured middleware to apply to a game before launching and these configurations can be swapped per game at will by the user:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Game ID"})," - Either ",(0,t.jsx)(n.code,{children:"template"})," for a template configuration, for the game id."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Owner"})," - Either ",(0,t.jsx)(n.code,{children:"local"})," for a user created configuration, or something else for remote synced configurations."]}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"Template configurations are available to use on any game, provided the game is valid for each used middleware. It is ideal for configurations applicable to a wide array of games."}),"\n",(0,t.jsx)(n.p,{children:"Configurations synced from a remote server are not modifiable by the user, but can be copied into a game specific configuration. This can be made into a local template too."}),"\n",(0,t.jsx)(n.h1,{id:"middleware-structure",children:"Middleware Structure"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"id"})," - Unique identifier for the middleware"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"name"})," - Name of the middleware to display to the user"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"isValid(game)"})," - Returns whether the middleware is valid for the game"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"isValidVersion(version)"})," - Returns whether the version string is valid for this middleware"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"getDefaultConfig(game)"})," - Returns the default middleware configuration for a game"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"getConfigSchema(version)"})," - Returns the configuration schema for the middleware version"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"execute(config)"})," - Executes to apply the middleware when launching game"]}),"\n"]}),"\n",(0,t.jsx)(n.h2,{id:"changing-launch-info",children:"Changing Launch Info"}),"\n",(0,t.jsxs)(n.p,{children:["Whilst this can already be achieved globally via ",(0,t.jsx)(n.code,{children:"onWillLaunchGame"})," and ",(0,t.jsx)(n.code,{children:"onWillLaunchAddApp"}),", a preference should be made to use middleware unless intended to apply to every game without question."]}),"\n",(0,t.jsx)(n.h2,{id:"replacing-existing-game-files",children:"Replacing Existing Game Files"}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.code,{children:"Legacy/htdocs/content/"})," acts a second root directory to ",(0,t.jsx)(n.code,{children:"Legacy/htdocs/"}),"."]}),"\n",(0,t.jsxs)(n.p,{children:["E.G ",(0,t.jsx)(n.code,{children:"http://example.com/game.txt"})," would check in the order:\n",(0,t.jsx)(n.code,{children:"Legacy/htdocs/content/example.com/game.txt"}),", then any loaded gamezips, then ",(0,t.jsx)(n.code,{children:"Legacy/htdocs/example.com/game.txt"})]}),"\n",(0,t.jsx)(n.p,{children:"You can either write these directly yourself, or use the utility functions to create or copy files."}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"writeServedFile"})," - Writes data to a file e.g ",(0,t.jsx)(n.code,{children:"example.com/game.txt"})]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"writeServedFileByUrl"})," - Writes data to a file based on a URL, e.g ",(0,t.jsx)(n.code,{children:"http://example.com/game.txt"})," writes to ",(0,t.jsx)(n.code,{children:"example.com/game.txt"}),". Useful when overriding launch commands."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"copyServedFile"})," - Copies a file to the specified path e.g ",(0,t.jsx)(n.code,{children:"example.com/game.txt"})]}),"\n"]}),"\n",(0,t.jsx)(n.h2,{id:"developer-notes",children:"Developer Notes"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:"Goals"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:["Overview","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Individual game configurations with several applied middleware"}),"\n",(0,t.jsxs)(n.li,{children:["Allow multiple game configurations to be stored","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Store ownership to support easy sync (local, remote server etc)"}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["Extension support to create middleware","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Use system extensions for 'built-in' middleware"}),"\n"]}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["File and launch info modification support","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Support creating new files to serve over proxy"}),"\n",(0,t.jsx)(n.li,{children:"Support overriding existing files to serve over proxy"}),"\n",(0,t.jsxs)(n.li,{children:["Allow modification of launch info (similair to onWillLaunchGame)","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Launch info should be runtime validated by launcher before game launch"}),"\n"]}),"\n"]}),"\n",(0,t.jsx)(n.li,{children:"Allow specific orders of execution for middleware, with individual middleware configs."}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["Detailed middleware configuration","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Create new config schemas (use existing dialog options code)"}),"\n",(0,t.jsxs)(n.li,{children:["Return the correct config schema based on the factors given by the game's configuration","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Chosen middleware version"}),"\n",(0,t.jsx)(n.li,{children:"Launch Command(?)"}),"\n",(0,t.jsx)(n.li,{children:"Platform(?)"}),"\n"]}),"\n"]}),"\n",(0,t.jsx)(n.li,{children:"Support upgrading old configs where older versions are not supported anymore"}),"\n",(0,t.jsxs)(n.li,{children:["User can modify this configuration inside the launcher using simple dialogs","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Raw JSON support? Would this be too difficult to validate?"}),"\n"]}),"\n"]}),"\n",(0,t.jsx)(n.li,{children:"Allow middleware to be enabled or disabled in the game's configuration, without removing anything"}),"\n"]}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:"Middleware shape"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:["Get config schema given parameters e.g","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Version"}),"\n",(0,t.jsx)(n.li,{children:"Platform(?)"}),"\n",(0,t.jsx)(n.li,{children:"Launch Command(?)"}),"\n"]}),"\n"]}),"\n",(0,t.jsx)(n.li,{children:"Validate config(?) (optional)"}),"\n",(0,t.jsx)(n.li,{children:"Check enabled state based on existing game info or config(?)"}),"\n",(0,t.jsxs)(n.li,{children:["Execution method","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Runtime validation of returned launch info"}),"\n"]}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:"Served file overrides any existing file in gamezip or htdocs"}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:"Utility functions"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Write served file by path"}),"\n",(0,t.jsx)(n.li,{children:"Write served file by url"}),"\n",(0,t.jsx)(n.li,{children:"Copy served file by path"}),"\n",(0,t.jsx)(n.li,{children:"Copy served file by url"}),"\n",(0,t.jsx)(n.li,{children:"Extract file from game zip by path"}),"\n",(0,t.jsx)(n.li,{children:"Extract file from game zip by url"}),"\n"]}),"\n"]}),"\n"]})]})}function u(e={}){const{wrapper:n}={...(0,i.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(d,{...e})}):d(e)}},8453:(e,n,r)=>{r.d(n,{R:()=>l,x:()=>s});var t=r(6540);const i={},o=t.createContext(i);function l(e){const n=t.useContext(o);return t.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function s(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(i):e.components||i:l(e.components),t.createElement(o.Provider,{value:n},e.children)}}}]);