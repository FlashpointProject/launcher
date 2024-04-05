/*! For license information please see a30b7c4b.7aad3f5a.js.LICENSE.txt */
"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[181],{1664:e=>{var n=Object.getOwnPropertySymbols,t=Object.prototype.hasOwnProperty,r=Object.prototype.propertyIsEnumerable;e.exports=function(){try{if(!Object.assign)return!1;var e=new String("abc");if(e[5]="de","5"===Object.getOwnPropertyNames(e)[0])return!1;for(var n={},t=0;t<10;t++)n["_"+String.fromCharCode(t)]=t;if("0123456789"!==Object.getOwnPropertyNames(n).map((function(e){return n[e]})).join(""))return!1;var r={};return"abcdefghijklmnopqrst".split("").forEach((function(e){r[e]=e})),"abcdefghijklmnopqrst"===Object.keys(Object.assign({},r)).join("")}catch(o){return!1}}()?Object.assign:function(e,o){for(var i,s,a=function(e){if(null==e)throw new TypeError("Object.assign cannot be called with null or undefined");return Object(e)}(e),l=1;l<arguments.length;l++){for(var c in i=Object(arguments[l]))t.call(i,c)&&(a[c]=i[c]);if(n){s=n(i);for(var u=0;u<s.length;u++)r.call(i,s[u])&&(a[s[u]]=i[s[u]])}}return a}},2192:(e,n,t)=>{t(1664);var r=t(3696),o=60103;if(n.Fragment=60107,"function"==typeof Symbol&&Symbol.for){var i=Symbol.for;o=i("react.element"),n.Fragment=i("react.fragment")}var s=r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,a=Object.prototype.hasOwnProperty,l={key:!0,ref:!0,__self:!0,__source:!0};function c(e,n,t){var r,i={},c=null,u=null;for(r in void 0!==t&&(c=""+t),void 0!==n.key&&(c=""+n.key),void 0!==n.ref&&(u=n.ref),n)a.call(n,r)&&!l.hasOwnProperty(r)&&(i[r]=n[r]);if(e&&e.defaultProps)for(r in n=e.defaultProps)void 0===i[r]&&(i[r]=n[r]);return{$$typeof:o,type:e,key:c,ref:u,props:i,_owner:s.current}}n.jsx=c,n.jsxs=c},4403:(e,n,t)=>{var r=t(1664),o=60103,i=60106;n.Fragment=60107,n.StrictMode=60108,n.Profiler=60114;var s=60109,a=60110,l=60112;n.Suspense=60113;var c=60115,u=60116;if("function"==typeof Symbol&&Symbol.for){var d=Symbol.for;o=d("react.element"),i=d("react.portal"),n.Fragment=d("react.fragment"),n.StrictMode=d("react.strict_mode"),n.Profiler=d("react.profiler"),s=d("react.provider"),a=d("react.context"),l=d("react.forward_ref"),n.Suspense=d("react.suspense"),c=d("react.memo"),u=d("react.lazy")}var h="function"==typeof Symbol&&Symbol.iterator;function p(e){for(var n="https://reactjs.org/docs/error-decoder.html?invariant="+e,t=1;t<arguments.length;t++)n+="&args[]="+encodeURIComponent(arguments[t]);return"Minified React error #"+e+"; visit "+n+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var f={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},m={};function y(e,n,t){this.props=e,this.context=n,this.refs=m,this.updater=t||f}function g(){}function v(e,n,t){this.props=e,this.context=n,this.refs=m,this.updater=t||f}y.prototype.isReactComponent={},y.prototype.setState=function(e,n){if("object"!=typeof e&&"function"!=typeof e&&null!=e)throw Error(p(85));this.updater.enqueueSetState(this,e,n,"setState")},y.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")},g.prototype=y.prototype;var j=v.prototype=new g;j.constructor=v,r(j,y.prototype),j.isPureReactComponent=!0;var b={current:null},x=Object.prototype.hasOwnProperty,w={key:!0,ref:!0,__self:!0,__source:!0};function k(e,n,t){var r,i={},s=null,a=null;if(null!=n)for(r in void 0!==n.ref&&(a=n.ref),void 0!==n.key&&(s=""+n.key),n)x.call(n,r)&&!w.hasOwnProperty(r)&&(i[r]=n[r]);var l=arguments.length-2;if(1===l)i.children=t;else if(1<l){for(var c=Array(l),u=0;u<l;u++)c[u]=arguments[u+2];i.children=c}if(e&&e.defaultProps)for(r in l=e.defaultProps)void 0===i[r]&&(i[r]=l[r]);return{$$typeof:o,type:e,key:s,ref:a,props:i,_owner:b.current}}function _(e){return"object"==typeof e&&null!==e&&e.$$typeof===o}var S=/\/+/g;function R(e,n){return"object"==typeof e&&null!==e&&null!=e.key?function(e){var n={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,(function(e){return n[e]}))}(""+e.key):n.toString(36)}function O(e,n,t,r,s){var a=typeof e;"undefined"!==a&&"boolean"!==a||(e=null);var l=!1;if(null===e)l=!0;else switch(a){case"string":case"number":l=!0;break;case"object":switch(e.$$typeof){case o:case i:l=!0}}if(l)return s=s(l=e),e=""===r?"."+R(l,0):r,Array.isArray(s)?(t="",null!=e&&(t=e.replace(S,"$&/")+"/"),O(s,n,t,"",(function(e){return e}))):null!=s&&(_(s)&&(s=function(e,n){return{$$typeof:o,type:e.type,key:n,ref:e.ref,props:e.props,_owner:e._owner}}(s,t+(!s.key||l&&l.key===s.key?"":(""+s.key).replace(S,"$&/")+"/")+e)),n.push(s)),1;if(l=0,r=""===r?".":r+":",Array.isArray(e))for(var c=0;c<e.length;c++){var u=r+R(a=e[c],c);l+=O(a,n,t,u,s)}else if(u=function(e){return null===e||"object"!=typeof e?null:"function"==typeof(e=h&&e[h]||e["@@iterator"])?e:null}(e),"function"==typeof u)for(e=u.call(e),c=0;!(a=e.next()).done;)l+=O(a=a.value,n,t,u=r+R(a,c++),s);else if("object"===a)throw n=""+e,Error(p(31,"[object Object]"===n?"object with keys {"+Object.keys(e).join(", ")+"}":n));return l}function P(e,n,t){if(null==e)return e;var r=[],o=0;return O(e,r,"","",(function(e){return n.call(t,e,o++)})),r}function C(e){if(-1===e._status){var n=e._result;n=n(),e._status=0,e._result=n,n.then((function(n){0===e._status&&(n=n.default,e._status=1,e._result=n)}),(function(n){0===e._status&&(e._status=2,e._result=n)}))}if(1===e._status)return e._result;throw e._result}var E={current:null};function I(){var e=E.current;if(null===e)throw Error(p(321));return e}var N={ReactCurrentDispatcher:E,ReactCurrentBatchConfig:{transition:0},ReactCurrentOwner:b,IsSomeRendererActing:{current:!1},assign:r};n.Children={map:P,forEach:function(e,n,t){P(e,(function(){n.apply(this,arguments)}),t)},count:function(e){var n=0;return P(e,(function(){n++})),n},toArray:function(e){return P(e,(function(e){return e}))||[]},only:function(e){if(!_(e))throw Error(p(143));return e}},n.Component=y,n.PureComponent=v,n.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=N,n.cloneElement=function(e,n,t){if(null==e)throw Error(p(267,e));var i=r({},e.props),s=e.key,a=e.ref,l=e._owner;if(null!=n){if(void 0!==n.ref&&(a=n.ref,l=b.current),void 0!==n.key&&(s=""+n.key),e.type&&e.type.defaultProps)var c=e.type.defaultProps;for(u in n)x.call(n,u)&&!w.hasOwnProperty(u)&&(i[u]=void 0===n[u]&&void 0!==c?c[u]:n[u])}var u=arguments.length-2;if(1===u)i.children=t;else if(1<u){c=Array(u);for(var d=0;d<u;d++)c[d]=arguments[d+2];i.children=c}return{$$typeof:o,type:e.type,key:s,ref:a,props:i,_owner:l}},n.createContext=function(e,n){return void 0===n&&(n=null),(e={$$typeof:a,_calculateChangedBits:n,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null}).Provider={$$typeof:s,_context:e},e.Consumer=e},n.createElement=k,n.createFactory=function(e){var n=k.bind(null,e);return n.type=e,n},n.createRef=function(){return{current:null}},n.forwardRef=function(e){return{$$typeof:l,render:e}},n.isValidElement=_,n.lazy=function(e){return{$$typeof:u,_payload:{_status:-1,_result:e},_init:C}},n.memo=function(e,n){return{$$typeof:c,type:e,compare:void 0===n?null:n}},n.useCallback=function(e,n){return I().useCallback(e,n)},n.useContext=function(e,n){return I().useContext(e,n)},n.useDebugValue=function(){},n.useEffect=function(e,n){return I().useEffect(e,n)},n.useImperativeHandle=function(e,n,t){return I().useImperativeHandle(e,n,t)},n.useLayoutEffect=function(e,n){return I().useLayoutEffect(e,n)},n.useMemo=function(e,n){return I().useMemo(e,n)},n.useReducer=function(e,n,t){return I().useReducer(e,n,t)},n.useRef=function(e){return I().useRef(e)},n.useState=function(e){return I().useState(e)},n.version="17.0.2"},3696:(e,n,t)=>{e.exports=t(4403)},2540:(e,n,t)=>{e.exports=t(2192)},7895:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>s,default:()=>d,frontMatter:()=>i,metadata:()=>a,toc:()=>c});var r=t(2540),o=t(8453);const i={},s="Setup",a={id:"development/setup",title:"Setup",description:"Overview",source:"@site/../docs/development/setup.md",sourceDirName:"development",slug:"/development/setup",permalink:"/launcher/docs/development/setup",draft:!1,unlisted:!1,editUrl:"https://github.com/FlashpointProject/launcher/edit/develop/website/../docs/development/setup.md",tags:[],version:"current",lastUpdatedAt:1712339312e3,frontMatter:{},sidebar:"docs",previous:{title:"Introduction",permalink:"/launcher/docs/development/introduction"},next:{title:"Git Workflow",permalink:"/launcher/docs/development/gitworkflow"}},l={},c=[{value:"Overview",id:"overview",level:2},{value:"Required Setup",id:"required-setup",level:2},{value:"Watching",id:"watching",level:3},{value:"Debugging",id:"debugging",level:3},{value:"Next Steps",id:"next-steps",level:3},{value:"Database API Development",id:"database-api-development",level:2},{value:"Next Steps",id:"next-steps-1",level:3}];function u(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",h3:"h3",li:"li",p:"p",pre:"pre",strong:"strong",ul:"ul",...(0,o.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.h1,{id:"setup",children:"Setup"}),"\n",(0,r.jsx)(n.h2,{id:"overview",children:"Overview"}),"\n",(0,r.jsx)(n.p,{children:"Flashpoint Launcher is built from a few components:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Backend Nodejs process"}),"\n",(0,r.jsx)(n.li,{children:"Database API written in Rust"}),"\n",(0,r.jsx)(n.li,{children:"Frontend Electron renderer w/ ReactJS framework"}),"\n"]}),"\n",(0,r.jsxs)(n.p,{children:["Follow the ",(0,r.jsx)(n.a,{href:"#required-setup",children:"Required Setup"})," first, then follow on to ",(0,r.jsx)(n.a,{href:"#database-api-development",children:"Database API Development"})," only if you need to make changes to Database API."]}),"\n",(0,r.jsxs)(n.p,{children:["If you've already got a cloned repo that builds and runs, please see ",(0,r.jsx)(n.a,{href:"gitworkflow",children:"Git Workflow"})," before starting to make commits."]}),"\n",(0,r.jsx)(n.h2,{id:"required-setup",children:"Required Setup"}),"\n",(0,r.jsx)(n.p,{children:"To work on the launcher, the minimum you'll need is:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:(0,r.jsx)(n.a,{href:"https://nodejs.org/",children:"NodeJS 18 or higher"})}),"\n"]}),"\n",(0,r.jsx)(n.p,{children:"Clone the Launcher repository and its submodules:"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{children:"git clone https://github.com/FlashpointProject/launcher.git launcher --recurse-submodules\n"})}),"\n",(0,r.jsxs)(n.p,{children:["Inside the new ",(0,r.jsx)(n.code,{children:"launcher"})," folder, install the dependencies:"]}),"\n",(0,r.jsxs)(n.p,{children:[(0,r.jsx)(n.strong,{children:"Note:"})," The project is written to be used with npm, if you want to use other package management tools your milage may vary."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"npm install\n"})}),"\n",(0,r.jsx)(n.p,{children:"Make sure it builds and runs"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"npm run build\n"})}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"npm run start\n"})}),"\n",(0,r.jsx)(n.h3,{id:"watching",children:"Watching"}),"\n",(0,r.jsxs)(n.p,{children:["During development, you can run ",(0,r.jsx)(n.code,{children:"watch"})," to automatically recompile any saved changes. Any backend changes will require the software to restart, but frontend only changes can use ",(0,r.jsx)(n.code,{children:"CTRL + SHIFT + R"})," to restart the window."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"npm run watch\n"})}),"\n",(0,r.jsx)(n.h3,{id:"debugging",children:"Debugging"}),"\n",(0,r.jsx)(n.p,{children:"Flashpoint Launcher includes VSCode launch configurations for debugging already, just use the debug tab in the IDE."}),"\n",(0,r.jsxs)(n.p,{children:["If you want to use debugging in other IDEs then use the NodeJS debugging tools for the backend, and the Chrome devtools (automatically enabled during development) for the frontend. You can enable the Chrome debug port by passing ",(0,r.jsx)(n.code,{children:"--remote-debugging-port=9223"})," to the electron process."]}),"\n",(0,r.jsx)(n.h3,{id:"next-steps",children:"Next Steps"}),"\n",(0,r.jsxs)(n.p,{children:["Once you see the window working, you can carry on to Database API Development if you want to make modifications to the Database API, otherwise carry on to ",(0,r.jsx)(n.a,{href:"gitworkflow",children:"Git Workflow"})," to learn how to structure your contributions."]}),"\n",(0,r.jsx)(n.h2,{id:"database-api-development",children:"Database API Development"}),"\n",(0,r.jsxs)(n.p,{children:["If you haven't already, set up your project through ",(0,r.jsx)(n.a,{href:"#required-setup",children:"Required Setup"}),"."]}),"\n",(0,r.jsxs)(n.p,{children:["The Database API is written in Rust for the ",(0,r.jsx)(n.code,{children:"flashpoint-archive"})," Rust crate."]}),"\n",(0,r.jsx)(n.p,{children:"To work on the Database API, the minimum you'll need is:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:(0,r.jsx)(n.a,{href:"https://www.rust-lang.org/",children:"Rust 1.76 or higher"})}),"\n"]}),"\n",(0,r.jsx)(n.p,{children:"Clone the Rust project to a new folder, outside the launcher folder:"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"git clone https://github.com/FlashpointProject/FPA-Rust.git fpa-rust --recurse-submodules\n"})}),"\n",(0,r.jsxs)(n.p,{children:["Inside the new ",(0,r.jsx)(n.code,{children:"fpa-rust"})," folder, run the test command to make sure everything is working:"]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"cargo test -p flashpoint-archive\n"})}),"\n",(0,r.jsxs)(n.p,{children:["If you want to change functionality, then modify the files inside ",(0,r.jsx)(n.code,{children:"crates/flashpoint-archive/"})," and remember to add tests to cover any new functionality."]}),"\n",(0,r.jsxs)(n.p,{children:["To test these changes inside launcher development, first go into ",(0,r.jsx)(n.code,{children:"bindings/binding-node/"})," and build the binding"]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"cd ./bindings/binding-node/\nnpm install\nnpm run build\n"})}),"\n",(0,r.jsx)(n.p,{children:"Then link it to the global packages"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"npm link\n"})}),"\n",(0,r.jsxs)(n.p,{children:["Finally, go into your ",(0,r.jsx)(n.code,{children:"launcher"})," folder and add the linked package"]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{children:"npm link @fparchive/flashpoint-archive\n"})}),"\n",(0,r.jsxs)(n.p,{children:["Now your launcher development environment will use the copy produced from the ",(0,r.jsx)(n.code,{children:"binding-node"})," folder when compiling / running. You will need to run ",(0,r.jsx)(n.code,{children:"npm run build"})," inside ",(0,r.jsx)(n.code,{children:"binding-node"})," again whenever you make changes to the database API in ",(0,r.jsx)(n.code,{children:"crates/flashpoint-archive/"})]}),"\n",(0,r.jsxs)(n.p,{children:["Whenever you run ",(0,r.jsx)(n.code,{children:"npm install"})," you will have to run this link command again to set it back up."]}),"\n",(0,r.jsx)(n.h3,{id:"next-steps-1",children:"Next Steps"}),"\n",(0,r.jsxs)(n.p,{children:["Carry on to ",(0,r.jsx)(n.a,{href:"gitworkflow",children:"Git Workflow"})," to learn how to structure your contributions."]})]})}function d(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(u,{...e})}):u(e)}},8453:(e,n,t)=>{t.d(n,{R:()=>s,x:()=>a});var r=t(6540);const o={},i=r.createContext(o);function s(e){const n=r.useContext(i);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function a(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:s(e.components),r.createElement(i.Provider,{value:n},e.children)}}}]);