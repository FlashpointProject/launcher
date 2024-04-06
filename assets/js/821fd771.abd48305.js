/*! For license information please see 821fd771.abd48305.js.LICENSE.txt */
"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[7231],{1664:e=>{var n=Object.getOwnPropertySymbols,t=Object.prototype.hasOwnProperty,r=Object.prototype.propertyIsEnumerable;e.exports=function(){try{if(!Object.assign)return!1;var e=new String("abc");if(e[5]="de","5"===Object.getOwnPropertyNames(e)[0])return!1;for(var n={},t=0;t<10;t++)n["_"+String.fromCharCode(t)]=t;if("0123456789"!==Object.getOwnPropertyNames(n).map((function(e){return n[e]})).join(""))return!1;var r={};return"abcdefghijklmnopqrst".split("").forEach((function(e){r[e]=e})),"abcdefghijklmnopqrst"===Object.keys(Object.assign({},r)).join("")}catch(o){return!1}}()?Object.assign:function(e,o){for(var i,s,a=function(e){if(null==e)throw new TypeError("Object.assign cannot be called with null or undefined");return Object(e)}(e),l=1;l<arguments.length;l++){for(var c in i=Object(arguments[l]))t.call(i,c)&&(a[c]=i[c]);if(n){s=n(i);for(var u=0;u<s.length;u++)r.call(i,s[u])&&(a[s[u]]=i[s[u]])}}return a}},2192:(e,n,t)=>{t(1664);var r=t(3696),o=60103;if(n.Fragment=60107,"function"==typeof Symbol&&Symbol.for){var i=Symbol.for;o=i("react.element"),n.Fragment=i("react.fragment")}var s=r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,a=Object.prototype.hasOwnProperty,l={key:!0,ref:!0,__self:!0,__source:!0};function c(e,n,t){var r,i={},c=null,u=null;for(r in void 0!==t&&(c=""+t),void 0!==n.key&&(c=""+n.key),void 0!==n.ref&&(u=n.ref),n)a.call(n,r)&&!l.hasOwnProperty(r)&&(i[r]=n[r]);if(e&&e.defaultProps)for(r in n=e.defaultProps)void 0===i[r]&&(i[r]=n[r]);return{$$typeof:o,type:e,key:c,ref:u,props:i,_owner:s.current}}n.jsx=c,n.jsxs=c},4403:(e,n,t)=>{var r=t(1664),o=60103,i=60106;n.Fragment=60107,n.StrictMode=60108,n.Profiler=60114;var s=60109,a=60110,l=60112;n.Suspense=60113;var c=60115,u=60116;if("function"==typeof Symbol&&Symbol.for){var f=Symbol.for;o=f("react.element"),i=f("react.portal"),n.Fragment=f("react.fragment"),n.StrictMode=f("react.strict_mode"),n.Profiler=f("react.profiler"),s=f("react.provider"),a=f("react.context"),l=f("react.forward_ref"),n.Suspense=f("react.suspense"),c=f("react.memo"),u=f("react.lazy")}var d="function"==typeof Symbol&&Symbol.iterator;function p(e){for(var n="https://reactjs.org/docs/error-decoder.html?invariant="+e,t=1;t<arguments.length;t++)n+="&args[]="+encodeURIComponent(arguments[t]);return"Minified React error #"+e+"; visit "+n+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var h={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},g={};function m(e,n,t){this.props=e,this.context=n,this.refs=g,this.updater=t||h}function y(){}function v(e,n,t){this.props=e,this.context=n,this.refs=g,this.updater=t||h}m.prototype.isReactComponent={},m.prototype.setState=function(e,n){if("object"!=typeof e&&"function"!=typeof e&&null!=e)throw Error(p(85));this.updater.enqueueSetState(this,e,n,"setState")},m.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")},y.prototype=m.prototype;var j=v.prototype=new y;j.constructor=v,r(j,m.prototype),j.isPureReactComponent=!0;var b={current:null},x=Object.prototype.hasOwnProperty,w={key:!0,ref:!0,__self:!0,__source:!0};function _(e,n,t){var r,i={},s=null,a=null;if(null!=n)for(r in void 0!==n.ref&&(a=n.ref),void 0!==n.key&&(s=""+n.key),n)x.call(n,r)&&!w.hasOwnProperty(r)&&(i[r]=n[r]);var l=arguments.length-2;if(1===l)i.children=t;else if(1<l){for(var c=Array(l),u=0;u<l;u++)c[u]=arguments[u+2];i.children=c}if(e&&e.defaultProps)for(r in l=e.defaultProps)void 0===i[r]&&(i[r]=l[r]);return{$$typeof:o,type:e,key:s,ref:a,props:i,_owner:b.current}}function k(e){return"object"==typeof e&&null!==e&&e.$$typeof===o}var S=/\/+/g;function C(e,n){return"object"==typeof e&&null!==e&&null!=e.key?function(e){var n={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,(function(e){return n[e]}))}(""+e.key):n.toString(36)}function O(e,n,t,r,s){var a=typeof e;"undefined"!==a&&"boolean"!==a||(e=null);var l=!1;if(null===e)l=!0;else switch(a){case"string":case"number":l=!0;break;case"object":switch(e.$$typeof){case o:case i:l=!0}}if(l)return s=s(l=e),e=""===r?"."+C(l,0):r,Array.isArray(s)?(t="",null!=e&&(t=e.replace(S,"$&/")+"/"),O(s,n,t,"",(function(e){return e}))):null!=s&&(k(s)&&(s=function(e,n){return{$$typeof:o,type:e.type,key:n,ref:e.ref,props:e.props,_owner:e._owner}}(s,t+(!s.key||l&&l.key===s.key?"":(""+s.key).replace(S,"$&/")+"/")+e)),n.push(s)),1;if(l=0,r=""===r?".":r+":",Array.isArray(e))for(var c=0;c<e.length;c++){var u=r+C(a=e[c],c);l+=O(a,n,t,u,s)}else if(u=function(e){return null===e||"object"!=typeof e?null:"function"==typeof(e=d&&e[d]||e["@@iterator"])?e:null}(e),"function"==typeof u)for(e=u.call(e),c=0;!(a=e.next()).done;)l+=O(a=a.value,n,t,u=r+C(a,c++),s);else if("object"===a)throw n=""+e,Error(p(31,"[object Object]"===n?"object with keys {"+Object.keys(e).join(", ")+"}":n));return l}function E(e,n,t){if(null==e)return e;var r=[],o=0;return O(e,r,"","",(function(e){return n.call(t,e,o++)})),r}function R(e){if(-1===e._status){var n=e._result;n=n(),e._status=0,e._result=n,n.then((function(n){0===e._status&&(n=n.default,e._status=1,e._result=n)}),(function(n){0===e._status&&(e._status=2,e._result=n)}))}if(1===e._status)return e._result;throw e._result}var P={current:null};function $(){var e=P.current;if(null===e)throw Error(p(321));return e}var A={ReactCurrentDispatcher:P,ReactCurrentBatchConfig:{transition:0},ReactCurrentOwner:b,IsSomeRendererActing:{current:!1},assign:r};n.Children={map:E,forEach:function(e,n,t){E(e,(function(){n.apply(this,arguments)}),t)},count:function(e){var n=0;return E(e,(function(){n++})),n},toArray:function(e){return E(e,(function(e){return e}))||[]},only:function(e){if(!k(e))throw Error(p(143));return e}},n.Component=m,n.PureComponent=v,n.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=A,n.cloneElement=function(e,n,t){if(null==e)throw Error(p(267,e));var i=r({},e.props),s=e.key,a=e.ref,l=e._owner;if(null!=n){if(void 0!==n.ref&&(a=n.ref,l=b.current),void 0!==n.key&&(s=""+n.key),e.type&&e.type.defaultProps)var c=e.type.defaultProps;for(u in n)x.call(n,u)&&!w.hasOwnProperty(u)&&(i[u]=void 0===n[u]&&void 0!==c?c[u]:n[u])}var u=arguments.length-2;if(1===u)i.children=t;else if(1<u){c=Array(u);for(var f=0;f<u;f++)c[f]=arguments[f+2];i.children=c}return{$$typeof:o,type:e.type,key:s,ref:a,props:i,_owner:l}},n.createContext=function(e,n){return void 0===n&&(n=null),(e={$$typeof:a,_calculateChangedBits:n,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null}).Provider={$$typeof:s,_context:e},e.Consumer=e},n.createElement=_,n.createFactory=function(e){var n=_.bind(null,e);return n.type=e,n},n.createRef=function(){return{current:null}},n.forwardRef=function(e){return{$$typeof:l,render:e}},n.isValidElement=k,n.lazy=function(e){return{$$typeof:u,_payload:{_status:-1,_result:e},_init:R}},n.memo=function(e,n){return{$$typeof:c,type:e,compare:void 0===n?null:n}},n.useCallback=function(e,n){return $().useCallback(e,n)},n.useContext=function(e,n){return $().useContext(e,n)},n.useDebugValue=function(){},n.useEffect=function(e,n){return $().useEffect(e,n)},n.useImperativeHandle=function(e,n,t){return $().useImperativeHandle(e,n,t)},n.useLayoutEffect=function(e,n){return $().useLayoutEffect(e,n)},n.useMemo=function(e,n){return $().useMemo(e,n)},n.useReducer=function(e,n,t){return $().useReducer(e,n,t)},n.useRef=function(e){return $().useRef(e)},n.useState=function(e){return $().useState(e)},n.version="17.0.2"},3696:(e,n,t)=>{e.exports=t(4403)},2540:(e,n,t)=>{e.exports=t(2192)},2812:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>s,default:()=>f,frontMatter:()=>i,metadata:()=>a,toc:()=>c});var r=t(2540),o=t(8453);const i={},s="Language Support",a={id:"development/lang",title:"Language Support",description:"Support for multiple languages comes built in. The translation files in the repo under /lang are compiled from the Crowdin project, which is based off the develop branch's lang/en.json as a base.",source:"@site/../docs/development/lang.md",sourceDirName:"development",slug:"/development/lang",permalink:"/launcher/docs/development/lang",draft:!1,unlisted:!1,editUrl:"https://github.com/FlashpointProject/launcher/edit/develop/website/../docs/development/lang.md",tags:[],version:"current",lastUpdatedAt:1712339312e3,frontMatter:{},sidebar:"docs",previous:{title:"Adding Pages",permalink:"/launcher/docs/development/addingpages"},next:{title:"Overview",permalink:"/launcher/docs/extensions/overview"}},l={},c=[{value:"Using translations in your components",id:"using-translations-in-your-components",level:2},{value:"Substitutions",id:"substitutions",level:3},{value:"Adding new strings",id:"adding-new-strings",level:2}];function u(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",h3:"h3",li:"li",p:"p",pre:"pre",ul:"ul",...(0,o.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.h1,{id:"language-support",children:"Language Support"}),"\n",(0,r.jsxs)(n.p,{children:["Support for multiple languages comes built in. The translation files in the repo under ",(0,r.jsx)(n.code,{children:"/lang"})," are compiled from the ",(0,r.jsx)(n.a,{href:"https://crowdin.com/project/flashpoint-launcher",children:"Crowdin project"}),", which is based off the ",(0,r.jsx)(n.code,{children:"develop"})," branch's ",(0,r.jsx)(n.code,{children:"lang/en.json"})," as a base."]}),"\n",(0,r.jsx)(n.h2,{id:"using-translations-in-your-components",children:"Using translations in your components"}),"\n",(0,r.jsx)(n.p,{children:"Strings for the current user selected language are available in the context. Just use it via the hook."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-tsx",children:"import { LangContext } from '@renderer/util/lang';\n\nfunction BoringTextBox() {\n  // Load the context\n  const strings = React.useContext(LangContext);\n\n  // Pretend we're loading by returning `Loading` :^)\n  return (\n    <div>\n      { strings.misc.loading }\n    </div>\n  )\n}\n"})}),"\n",(0,r.jsxs)(n.p,{children:["Understanding what strings are available may be a bit confusing. If you want to use existing strings it may be easier to look in ",(0,r.jsx)(n.code,{children:"lang/en.json"})," for the keys and their English text."]}),"\n",(0,r.jsx)(n.h3,{id:"substitutions",children:"Substitutions"}),"\n",(0,r.jsxs)(n.p,{children:["Strings can have text substitutions by adding number placeholders like ",(0,r.jsx)(n.code,{children:"{0}"})," to the text. This can be replaced with either text, or a JSX Element at runtime."]}),"\n",(0,r.jsxs)(n.p,{children:["For example, on the Home page we fill in the placeholder with a link which opens the Games browse page, by passing the ",(0,r.jsx)(n.code,{children:"allGamesInfo"})," string and the ",(0,r.jsx)(n.code,{children:"Link"})," component to the ",(0,r.jsx)(n.code,{children:"formatString"})," function."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",metastring:'title="lang/en.json"',children:'"allGamesInfo": "Looking for something to play? View {0}.",\n'})}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-tsx",metastring:'title="src/renderer/components/pages/HomePage.tsx"',children:"export function HomePage(props: HomePageProps) {\n  // ...\n  const renderedQuickStart = React.useMemo(() => {\n    // ...\n    <QuickStartItem icon='play-circle'>\n        {formatString(strings.allGamesInfo, \n          <Link to={joinLibraryRoute(ARCADE)} onClick={onAllGamesClick}>\n            {strings.allGames}\n          </Link>)}\n      </QuickStartItem>\n  }, [...]);\n}\n"})}),"\n",(0,r.jsx)(n.h2,{id:"adding-new-strings",children:"Adding new strings"}),"\n",(0,r.jsx)(n.p,{children:"To add new strings, we need to do two things:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["Add a key to ",(0,r.jsx)(n.code,{children:"langTemplate"})," in ",(0,r.jsx)(n.code,{children:"src/shared/lang.ts"})]}),"\n",(0,r.jsxs)(n.li,{children:["Add the English translation to ",(0,r.jsx)(n.code,{children:"lang/en.json"})]}),"\n"]}),"\n",(0,r.jsxs)(n.p,{children:["This should be relatively straight forward. All keys must be inside a single level of nesting, where the parent is an arbitrary name usually relating to where the text is used. (e.g ",(0,r.jsx)(n.code,{children:"home"})," is used for most strings that belong on the Home page)"]}),"\n",(0,r.jsxs)(n.p,{children:["Once these have been commited to the ",(0,r.jsx)(n.code,{children:"develop"})," branch they will automatically be available for translators to work on."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-ts",metastring:'title="src/shared/lang.ts"',children:"const langTemplate = {\n  // ...\n  home: [\n    // ...\n    'quickStartHeader'\n  ]\n}\n"})}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",metastring:'title="lang/en.json"',children:'{\n  "name": "English",\n  "home": {\n    "quickStartHeader": "Quick Start"\n  }\n}\n'})})]})}function f(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(u,{...e})}):u(e)}},8453:(e,n,t)=>{t.d(n,{R:()=>s,x:()=>a});var r=t(6540);const o={},i=r.createContext(o);function s(e){const n=r.useContext(i);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function a(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:s(e.components),r.createElement(i.Provider,{value:n},e.children)}}}]);