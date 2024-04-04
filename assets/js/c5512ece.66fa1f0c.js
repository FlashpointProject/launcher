/*! For license information please see c5512ece.66fa1f0c.js.LICENSE.txt */
"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[878],{1664:e=>{var n=Object.getOwnPropertySymbols,t=Object.prototype.hasOwnProperty,o=Object.prototype.propertyIsEnumerable;e.exports=function(){try{if(!Object.assign)return!1;var e=new String("abc");if(e[5]="de","5"===Object.getOwnPropertyNames(e)[0])return!1;for(var n={},t=0;t<10;t++)n["_"+String.fromCharCode(t)]=t;if("0123456789"!==Object.getOwnPropertyNames(n).map((function(e){return n[e]})).join(""))return!1;var o={};return"abcdefghijklmnopqrst".split("").forEach((function(e){o[e]=e})),"abcdefghijklmnopqrst"===Object.keys(Object.assign({},o)).join("")}catch(r){return!1}}()?Object.assign:function(e,r){for(var i,s,l=function(e){if(null==e)throw new TypeError("Object.assign cannot be called with null or undefined");return Object(e)}(e),a=1;a<arguments.length;a++){for(var c in i=Object(arguments[a]))t.call(i,c)&&(l[c]=i[c]);if(n){s=n(i);for(var d=0;d<s.length;d++)o.call(i,s[d])&&(l[s[d]]=i[s[d]])}}return l}},2192:(e,n,t)=>{t(1664);var o=t(3696),r=60103;if(n.Fragment=60107,"function"==typeof Symbol&&Symbol.for){var i=Symbol.for;r=i("react.element"),n.Fragment=i("react.fragment")}var s=o.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,l=Object.prototype.hasOwnProperty,a={key:!0,ref:!0,__self:!0,__source:!0};function c(e,n,t){var o,i={},c=null,d=null;for(o in void 0!==t&&(c=""+t),void 0!==n.key&&(c=""+n.key),void 0!==n.ref&&(d=n.ref),n)l.call(n,o)&&!a.hasOwnProperty(o)&&(i[o]=n[o]);if(e&&e.defaultProps)for(o in n=e.defaultProps)void 0===i[o]&&(i[o]=n[o]);return{$$typeof:r,type:e,key:c,ref:d,props:i,_owner:s.current}}n.jsx=c,n.jsxs=c},4403:(e,n,t)=>{var o=t(1664),r=60103,i=60106;n.Fragment=60107,n.StrictMode=60108,n.Profiler=60114;var s=60109,l=60110,a=60112;n.Suspense=60113;var c=60115,d=60116;if("function"==typeof Symbol&&Symbol.for){var h=Symbol.for;r=h("react.element"),i=h("react.portal"),n.Fragment=h("react.fragment"),n.StrictMode=h("react.strict_mode"),n.Profiler=h("react.profiler"),s=h("react.provider"),l=h("react.context"),a=h("react.forward_ref"),n.Suspense=h("react.suspense"),c=h("react.memo"),d=h("react.lazy")}var u="function"==typeof Symbol&&Symbol.iterator;function p(e){for(var n="https://reactjs.org/docs/error-decoder.html?invariant="+e,t=1;t<arguments.length;t++)n+="&args[]="+encodeURIComponent(arguments[t]);return"Minified React error #"+e+"; visit "+n+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var f={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},x={};function m(e,n,t){this.props=e,this.context=n,this.refs=x,this.updater=t||f}function j(){}function g(e,n,t){this.props=e,this.context=n,this.refs=x,this.updater=t||f}m.prototype.isReactComponent={},m.prototype.setState=function(e,n){if("object"!=typeof e&&"function"!=typeof e&&null!=e)throw Error(p(85));this.updater.enqueueSetState(this,e,n,"setState")},m.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")},j.prototype=m.prototype;var y=g.prototype=new j;y.constructor=g,o(y,m.prototype),y.isPureReactComponent=!0;var v={current:null},b=Object.prototype.hasOwnProperty,w={key:!0,ref:!0,__self:!0,__source:!0};function _(e,n,t){var o,i={},s=null,l=null;if(null!=n)for(o in void 0!==n.ref&&(l=n.ref),void 0!==n.key&&(s=""+n.key),n)b.call(n,o)&&!w.hasOwnProperty(o)&&(i[o]=n[o]);var a=arguments.length-2;if(1===a)i.children=t;else if(1<a){for(var c=Array(a),d=0;d<a;d++)c[d]=arguments[d+2];i.children=c}if(e&&e.defaultProps)for(o in a=e.defaultProps)void 0===i[o]&&(i[o]=a[o]);return{$$typeof:r,type:e,key:s,ref:l,props:i,_owner:v.current}}function S(e){return"object"==typeof e&&null!==e&&e.$$typeof===r}var k=/\/+/g;function C(e,n){return"object"==typeof e&&null!==e&&null!=e.key?function(e){var n={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,(function(e){return n[e]}))}(""+e.key):n.toString(36)}function E(e,n,t,o,s){var l=typeof e;"undefined"!==l&&"boolean"!==l||(e=null);var a=!1;if(null===e)a=!0;else switch(l){case"string":case"number":a=!0;break;case"object":switch(e.$$typeof){case r:case i:a=!0}}if(a)return s=s(a=e),e=""===o?"."+C(a,0):o,Array.isArray(s)?(t="",null!=e&&(t=e.replace(k,"$&/")+"/"),E(s,n,t,"",(function(e){return e}))):null!=s&&(S(s)&&(s=function(e,n){return{$$typeof:r,type:e.type,key:n,ref:e.ref,props:e.props,_owner:e._owner}}(s,t+(!s.key||a&&a.key===s.key?"":(""+s.key).replace(k,"$&/")+"/")+e)),n.push(s)),1;if(a=0,o=""===o?".":o+":",Array.isArray(e))for(var c=0;c<e.length;c++){var d=o+C(l=e[c],c);a+=E(l,n,t,d,s)}else if(d=function(e){return null===e||"object"!=typeof e?null:"function"==typeof(e=u&&e[u]||e["@@iterator"])?e:null}(e),"function"==typeof d)for(e=d.call(e),c=0;!(l=e.next()).done;)a+=E(l=l.value,n,t,d=o+C(l,c++),s);else if("object"===l)throw n=""+e,Error(p(31,"[object Object]"===n?"object with keys {"+Object.keys(e).join(", ")+"}":n));return a}function O(e,n,t){if(null==e)return e;var o=[],r=0;return E(e,o,"","",(function(e){return n.call(t,e,r++)})),o}function P(e){if(-1===e._status){var n=e._result;n=n(),e._status=0,e._result=n,n.then((function(n){0===e._status&&(n=n.default,e._status=1,e._result=n)}),(function(n){0===e._status&&(e._status=2,e._result=n)}))}if(1===e._status)return e._result;throw e._result}var T={current:null};function A(){var e=T.current;if(null===e)throw Error(p(321));return e}var N={ReactCurrentDispatcher:T,ReactCurrentBatchConfig:{transition:0},ReactCurrentOwner:v,IsSomeRendererActing:{current:!1},assign:o};n.Children={map:O,forEach:function(e,n,t){O(e,(function(){n.apply(this,arguments)}),t)},count:function(e){var n=0;return O(e,(function(){n++})),n},toArray:function(e){return O(e,(function(e){return e}))||[]},only:function(e){if(!S(e))throw Error(p(143));return e}},n.Component=m,n.PureComponent=g,n.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=N,n.cloneElement=function(e,n,t){if(null==e)throw Error(p(267,e));var i=o({},e.props),s=e.key,l=e.ref,a=e._owner;if(null!=n){if(void 0!==n.ref&&(l=n.ref,a=v.current),void 0!==n.key&&(s=""+n.key),e.type&&e.type.defaultProps)var c=e.type.defaultProps;for(d in n)b.call(n,d)&&!w.hasOwnProperty(d)&&(i[d]=void 0===n[d]&&void 0!==c?c[d]:n[d])}var d=arguments.length-2;if(1===d)i.children=t;else if(1<d){c=Array(d);for(var h=0;h<d;h++)c[h]=arguments[h+2];i.children=c}return{$$typeof:r,type:e.type,key:s,ref:l,props:i,_owner:a}},n.createContext=function(e,n){return void 0===n&&(n=null),(e={$$typeof:l,_calculateChangedBits:n,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null}).Provider={$$typeof:s,_context:e},e.Consumer=e},n.createElement=_,n.createFactory=function(e){var n=_.bind(null,e);return n.type=e,n},n.createRef=function(){return{current:null}},n.forwardRef=function(e){return{$$typeof:a,render:e}},n.isValidElement=S,n.lazy=function(e){return{$$typeof:d,_payload:{_status:-1,_result:e},_init:P}},n.memo=function(e,n){return{$$typeof:c,type:e,compare:void 0===n?null:n}},n.useCallback=function(e,n){return A().useCallback(e,n)},n.useContext=function(e,n){return A().useContext(e,n)},n.useDebugValue=function(){},n.useEffect=function(e,n){return A().useEffect(e,n)},n.useImperativeHandle=function(e,n,t){return A().useImperativeHandle(e,n,t)},n.useLayoutEffect=function(e,n){return A().useLayoutEffect(e,n)},n.useMemo=function(e,n){return A().useMemo(e,n)},n.useReducer=function(e,n,t){return A().useReducer(e,n,t)},n.useRef=function(e){return A().useRef(e)},n.useState=function(e){return A().useState(e)},n.version="17.0.2"},3696:(e,n,t)=>{e.exports=t(4403)},2540:(e,n,t)=>{e.exports=t(2192)},8212:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>a,contentTitle:()=>s,default:()=>h,frontMatter:()=>i,metadata:()=>l,toc:()=>c});var o=t(2540),r=t(8453);const i={},s="Overview",l={id:"Extensions/overview",title:"Overview",description:"Installing",source:"@site/../docs/Extensions/overview.md",sourceDirName:"Extensions",slug:"/Extensions/overview",permalink:"/launcher/docs/Extensions/overview",draft:!1,unlisted:!1,editUrl:"https://github.com/FlashpointProject/launcher/edit/develop/website/../docs/Extensions/overview.md",tags:[],version:"current",lastUpdatedAt:1712232716e3,frontMatter:{},sidebar:"mainSidebar",previous:{title:"Keyboard Shortcuts",permalink:"/launcher/docs/Configuration/shortcuts"},next:{title:"Credits",permalink:"/launcher/docs/credits"}},a={},c=[{value:"Installing",id:"installing",level:2},{value:"Running",id:"running",level:2},{value:"Creating",id:"creating",level:2},{value:"Code",id:"code",level:3},{value:"Themes",id:"themes",level:3},{value:"Logo Sets",id:"logo-sets",level:3},{value:"Context Buttons",id:"context-buttons",level:3},{value:"Curation Templates",id:"curation-templates",level:3},{value:"Applications",id:"applications",level:3},{value:"Configuration",id:"configuration",level:3}];function d(e){const n={a:"a",code:"code",em:"em",h1:"h1",h2:"h2",h3:"h3",li:"li",p:"p",pre:"pre",strong:"strong",ul:"ul",...(0,r.R)(),...e.components};return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(n.h1,{id:"overview",children:"Overview"}),"\n",(0,o.jsx)(n.h2,{id:"installing",children:"Installing"}),"\n",(0,o.jsxs)(n.p,{children:["Extensions should be unpacked to ",(0,o.jsx)(n.code,{children:"/Data/Extensions"})," where an example path would be ",(0,o.jsx)(n.code,{children:"/Data/Extensions/MyFirstExtension"}),"."]}),"\n",(0,o.jsx)(n.p,{children:"Developer Note: Try to keep extension folder names unique as to not risk collision with other extensions."}),"\n",(0,o.jsx)(n.h2,{id:"running",children:"Running"}),"\n",(0,o.jsx)(n.p,{children:"Extensions are automatically loaded on Launcher startup with no ability to disable them. If you want to reload an extension you must currently restart the Launcher."}),"\n",(0,o.jsx)(n.h2,{id:"creating",children:"Creating"}),"\n",(0,o.jsxs)(n.p,{children:["All extensions require a ",(0,o.jsx)(n.code,{children:"package.json"})," manifest at the root of their extension path. You'll recognize this if you've written Node JS modules before. An example is below, with explanations beneath."]}),"\n",(0,o.jsxs)(n.p,{children:["An extension should be packed as to be easily installable as described in the ",(0,o.jsx)(n.code,{children:"Installing"})," section above. In the future the Launcher will be able to install them itself."]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-json",children:'{\n  "name": "my-first-extension",\n  "displayName": "My First Extension",\n  "author": "your-name",\n  "version": "0.0.1",\n  "launcherVersion": "9.0.0",\n  "description": "Example of an Extension",\n  "icon": "/path/to/icon",\n  "contributes": {}\n}\n'})}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"name"})," - Name of the extension. Must have no spaces or special characters."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"displayName"})," - ",(0,o.jsx)(n.em,{children:"(Optional)"})," - Name displayed to the user. Will use ",(0,o.jsx)(n.code,{children:"name"})," if missing."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"author"})," - Name of the author. Must have no spaces or special characters."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"version"})," - Version of the extension."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"launcherVersion"})," - Minimum launcher version supported. Use a wildcard if not applicable."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"description"})," - ",(0,o.jsx)(n.em,{children:"(Optional)"})," - Description of the extension displayed to the user."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"icon"})," - ",(0,o.jsx)(n.em,{children:"(Optional)"})," - Icon to display to the user."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"contributes"})," - ",(0,o.jsx)(n.em,{children:"(Optional)"})," - Used to declare contributions. Relevance is explained in other documentation when relevant."]}),"\n",(0,o.jsx)(n.h3,{id:"code",children:"Code"}),"\n",(0,o.jsx)(n.p,{children:"Extensions may have TypeScript / JavaScript which will be dynamically loaded in to register various things with the API. Check the API documentation for specifics, this will cover it broadly."}),"\n",(0,o.jsxs)(n.p,{children:["Live documentation can be found here: ",(0,o.jsx)(n.a,{href:"https://flashpointproject.github.io/launcher_ApiDocs/",children:"https://flashpointproject.github.io/launcher_ApiDocs/"})]}),"\n",(0,o.jsxs)(n.p,{children:["Your entry point must be declared in ",(0,o.jsx)(n.code,{children:"package.json"})," like it would in a Node JS module with ",(0,o.jsx)(n.code,{children:"main"}),". If you're using TypeScript make sure this points to the build output, more details below."]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-json",children:'{\n  "main": "./path/to/extension.js"\n}\n'})}),"\n",(0,o.jsxs)(n.p,{children:["The example below logs ",(0,o.jsx)(n.code,{children:"Hello World!"})," to the Logs page, check it after launch to see its results. TypeScript specific instructions are below it."]}),"\n",(0,o.jsx)(n.p,{children:"JavaScript file example"}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-javascript",children:"const flashpoint = require('flashpoint-launcher');\n\nfunction activate(context) {\n  flashpoint.log.info('Hello World!');\n}\n\nexports.activate = activate;\n"})}),"\n",(0,o.jsxs)(n.p,{children:["If you're using TypeScript then make sure that TypeScript is installed as a dev dependency with ",(0,o.jsx)(n.code,{children:"npm install --save-dev typescript"})," as well. An example tsconfig.json is provided below to build from ",(0,o.jsx)(n.code,{children:"./src"})," into ",(0,o.jsx)(n.code,{children:"./dist"})," (E.G ",(0,o.jsx)(n.code,{children:"./src/extension.ts"})," to ",(0,o.jsx)(n.code,{children:"./dist/extension.js"}),")"]}),"\n",(0,o.jsxs)(n.p,{children:["You should also install the ",(0,o.jsx)(n.code,{children:"@types/flashpoint-launcher"})," package so TypeScript can detect the proper API typings."]}),"\n",(0,o.jsx)(n.p,{children:"Example tsconfig.json"}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-json",children:'{\n  "compilerOptions": {\n    "module": "commonjs",\n    "outDir": "./dist",\n  },\n  "exclude": [\n    "./dist"\n  ],\n  "include": [\n    "./typings",\n    "./src"\n  ]\n}\n'})}),"\n",(0,o.jsxs)(n.p,{children:["A simple build script is below to include in ",(0,o.jsx)(n.code,{children:"package.json"})," to run ",(0,o.jsx)(n.code,{children:"npm run build"})," to rebuild your extension."]}),"\n",(0,o.jsx)(n.p,{children:"Build script"}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-json",children:'{\n  "scripts": {\n    "build": "tsc"\n  }\n}\n'})}),"\n",(0,o.jsx)(n.p,{children:"TypeScript file example"}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-javascript",children:"import * as flashpoint from 'flashpoint-launcher';\n\nexport function activate(context: flashpoint.ExtensionContext) {\n  flashpoint.log.info('Hello World!');\n}\n"})}),"\n",(0,o.jsx)(n.h3,{id:"themes",children:"Themes"}),"\n",(0,o.jsx)(n.p,{children:"You can find information specific to making themes in the Themes documentation, this section will only cover including them in an extension."}),"\n",(0,o.jsxs)(n.p,{children:["Themes are declared as part of the extensions manifest, ",(0,o.jsx)(n.code,{children:"package.json"}),". Multiple themes can be declared, but they should have unique IDs. Be careful not to make them too generic as to collide with other extensions."]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-json",children:'{\n  "contributes": {\n    "themes": [\n      {\n        "id": "my-first-theme",\n        "path": "./themes/MyTheme",\n        "logoSet": "my-first-logoset"\n      }\n    ]\n  }\n}\n'})}),"\n",(0,o.jsxs)(n.p,{children:["The theme path should be the folder in which ",(0,o.jsx)(n.code,{children:"theme.css"})," resides. All files the theme uses should be kept inside this folder. Any attempts to access files outside it will cause an illegal file request warning instead."]}),"\n",(0,o.jsxs)(n.p,{children:["Optionally, a logo set can be applied whenever the theme is. Set the ",(0,o.jsx)(n.code,{children:"logoSet"})," parameter to the ID of a logo set. It is recommended you include the logo set in the same extension with the theme. See more about logo sets below."]}),"\n",(0,o.jsx)(n.h3,{id:"logo-sets",children:"Logo Sets"}),"\n",(0,o.jsx)(n.p,{children:"You can find information specific to making logo sets in the Logo Sets documentation, this section will only cover including them in an extension."}),"\n",(0,o.jsxs)(n.p,{children:["Logo Sets are declared as part of the extensions manifest, ",(0,o.jsx)(n.code,{children:"package.json"}),". Multiple logo sets can be declared, but they should have unique IDs. Be careful not to make them too generic as to collide with other extensions."]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-json",children:'{\n  "contributes": {\n    "logoSets": [\n      {\n        "id": "my-first-logoset",\n        "name": "My Logo Set",\n        "path": "./logoSets/MyLogoSet"\n      }\n    ]\n  }\n}\n'})}),"\n",(0,o.jsxs)(n.p,{children:["Unlike Themes, the name shown in the Config page is declared here as ",(0,o.jsx)(n.code,{children:"name"})," instead."]}),"\n",(0,o.jsxs)(n.p,{children:["Logos for platforms will then be read relative to the folder, e.g ",(0,o.jsx)(n.code,{children:"./logoSets/MyLogoSet/Flash.png"})]}),"\n",(0,o.jsx)(n.h3,{id:"context-buttons",children:"Context Buttons"}),"\n",(0,o.jsx)(n.p,{children:"Extensions can provide context buttons to show when right-clicking Playlists or Games. The registered command is then run with either the Playlist or Game as an argument when clicked. See API documentation on ``commands.registerCommand` and for more details."}),"\n",(0,o.jsx)(n.p,{children:"NOTE: runWithNoCuration will allow Curation context buttons to be pressed without a selected Curation (The curation will still be passed as an argument if selected)"}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-json",children:'{\n  "contributes": {\n    "contextButtons": [\n      {\n        "context": "game" / "playlist" / "curation",\n        "name": "Click Me",\n        "command": "my-first-extension.do-something",\n        "runWithNoCuration": true\n      }\n    ]\n  }\n}\n'})}),"\n",(0,o.jsx)(n.h3,{id:"curation-templates",children:"Curation Templates"}),"\n",(0,o.jsx)(n.p,{children:"Curation templates can be used when creating new curations, selectable in a dropdown. The meta is applied to the empty curation before being saved."}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-json",children:'{\n  "contributes": {\n    "curationTemplates": [\n      {\n        "name": "Example Template",\n        "logo": "Flash",\n        "meta": {\n          "title": "Example Title",\n          "originalDescription": "I\'m a description"\n        }\n      }\n    ]\n  }\n}\n'})}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.code,{children:"name"})," is the name to display on the new curation button."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.code,{children:"logo"})," will choose the Logo to display next to the name in the dropdown, these are the same as defined by the Logo Set."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.code,{children:"meta"})," is a subset of CurationMeta (see typescript docs) with the ommission of the ",(0,o.jsx)(n.code,{children:"tags"})," field. (Will come at a later date)"]}),"\n",(0,o.jsx)(n.h3,{id:"applications",children:"Applications"}),"\n",(0,o.jsxs)(n.p,{children:["Extensions can provide Applications for the launcher to use. Whenever one of the strings in ",(0,o.jsx)(n.code,{children:"provides"})," is used the path, url or command is used to run the application instead of defaulting to a relative path to the Flashpoint folder."]}),"\n",(0,o.jsx)(n.p,{children:"Be sure to read past the example for more important information."}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-json",children:'{\n  "applications": [\n    {\n      "provides": [\n        ":my-application:"\n      ],\n      "name": "My Application",\n      "path": "<extPath>/app.exe"\n    }\n  ]\n}\n'})}),"\n",(0,o.jsxs)(n.p,{children:["In this example, any game run with the ",(0,o.jsx)(n.code,{children:":my-application:"})," application path will use ",(0,o.jsx)(n.code,{children:"<extPath>/app.exe"})," in its place when launching, where ",(0,o.jsx)(n.code,{children:"<extPath>"})," will be replaced with the path of the Extension on disk."]}),"\n",(0,o.jsxs)(n.p,{children:["However, Applications can also provide ",(0,o.jsx)(n.code,{children:"url"})," or ",(0,o.jsx)(n.code,{children:"command"})," instead. The full details of all 3 including ",(0,o.jsx)(n.code,{children:"path"})," are listed below."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.code,{children:"path"})," will launch the application with the launch command as its arguments. You must use the ",(0,o.jsx)(n.code,{children:"<exePath>"})," or ",(0,o.jsx)(n.code,{children:"<fpPath>"})," substitutions to correctly reference the application."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.code,{children:"url"})," will launch that URL in Flashpoints Browser Mode (Electron). The launch command must be substituted since it can not be given as an argument this way. See below for allowed substitutions."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.code,{children:"command"})," will run a registered command that is given the launching Game as an argument and expects a valid response of either a string (",(0,o.jsx)(n.code,{children:"path"}),") or BrowserApplicationOpts (",(0,o.jsx)(n.code,{children:"url"}),") which will then be run accordingly. Substitutions cannot be used on the returned values, although you may find their equivalents in the API, with an exception of os, arch and cwd which you may use Node types for. (",(0,o.jsx)(n.code,{children:"@types/node"}),")"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.code,{children:"url"})," and ",(0,o.jsx)(n.code,{children:"path"})," string substitutes:"]}),"\n",(0,o.jsxs)(n.ul,{children:["\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"<exePath>"})," - Path to the extension."]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"<fpPath>"})," - Path to the Flashpoint folder."]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"<os>"})," - See ",(0,o.jsx)(n.a,{href:"https://nodejs.org/api/process.html#process_process_platform",children:"https://nodejs.org/api/process.html#process_process_platform"})]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"<arch>"})," - See ",(0,o.jsx)(n.a,{href:"https://nodejs.org/api/process.html#process_process_arch",children:"https://nodejs.org/api/process.html#process_process_arch"})]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"<exeDataURL>"})," - URL to the Extensions 'static' folder. Useful for Browser Mode."]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"<launchCommand>"})," - Launch Command of the application. Useful for Browser Mode, ",(0,o.jsx)(n.code,{children:"path"})," applications will have it included as arguments already."]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"<cwd>"})," - Current working directory. This is not guaranteed to be anywhere relative to Flashpoint.exe nor the Flashpoint folder, do not use unless certain."]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsxs)(n.strong,{children:["<extConf",":com",".example.value>"]})," - Extension config value. Place the config id after the semi-colon."]}),"\n"]}),"\n",(0,o.jsx)(n.h3,{id:"configuration",children:"Configuration"}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-json",children:'{\n  "configuration": [\n    {\n      "title": "Test Extension",\n      "properties": {\n        "title": "Test Select",\n        "type": "string",\n        "enum": [\n          "string1",\n          "string2"\n        ],\n        "default": "string1",\n        "description": "Example of an extension config prop",\n      }\n    }\n  ]\n}\n'})}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"title"})," - Title of the Configuration section to display on the Config page."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"properties"})," - Array of various Configuration props to be editable under this section."]}),"\n",(0,o.jsxs)(n.ul,{children:["\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"title"})," - Title of the configuration prop"]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"description"})," - Description of the configuration prop"]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"type"})," - Type of this configuration prop's value (string, boolean or object)"]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"enum"})," - ",(0,o.jsx)(n.em,{children:"(Optional)"})," - Array of enums to use when you want a Select config box instead of an Input config box."]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"default"})," - Default value of this configuration prop"]}),"\n"]})]})}function h(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,o.jsx)(n,{...e,children:(0,o.jsx)(d,{...e})}):d(e)}},8453:(e,n,t)=>{t.d(n,{R:()=>s,x:()=>l});var o=t(6540);const r={},i=o.createContext(r);function s(e){const n=o.useContext(i);return o.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function l(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:s(e.components),o.createElement(i.Provider,{value:n},e.children)}}}]);