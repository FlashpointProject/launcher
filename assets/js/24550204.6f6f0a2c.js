/*! For license information please see 24550204.6f6f0a2c.js.LICENSE.txt */
"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[745],{1664:e=>{var t=Object.getOwnPropertySymbols,n=Object.prototype.hasOwnProperty,r=Object.prototype.propertyIsEnumerable;e.exports=function(){try{if(!Object.assign)return!1;var e=new String("abc");if(e[5]="de","5"===Object.getOwnPropertyNames(e)[0])return!1;for(var t={},n=0;n<10;n++)t["_"+String.fromCharCode(n)]=n;if("0123456789"!==Object.getOwnPropertyNames(t).map((function(e){return t[e]})).join(""))return!1;var r={};return"abcdefghijklmnopqrst".split("").forEach((function(e){r[e]=e})),"abcdefghijklmnopqrst"===Object.keys(Object.assign({},r)).join("")}catch(o){return!1}}()?Object.assign:function(e,o){for(var a,s,i=function(e){if(null==e)throw new TypeError("Object.assign cannot be called with null or undefined");return Object(e)}(e),c=1;c<arguments.length;c++){for(var u in a=Object(arguments[c]))n.call(a,u)&&(i[u]=a[u]);if(t){s=t(a);for(var l=0;l<s.length;l++)r.call(a,s[l])&&(i[s[l]]=a[s[l]])}}return i}},2192:(e,t,n)=>{n(1664);var r=n(3696),o=60103;if(t.Fragment=60107,"function"==typeof Symbol&&Symbol.for){var a=Symbol.for;o=a("react.element"),t.Fragment=a("react.fragment")}var s=r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,i=Object.prototype.hasOwnProperty,c={key:!0,ref:!0,__self:!0,__source:!0};function u(e,t,n){var r,a={},u=null,l=null;for(r in void 0!==n&&(u=""+n),void 0!==t.key&&(u=""+t.key),void 0!==t.ref&&(l=t.ref),t)i.call(t,r)&&!c.hasOwnProperty(r)&&(a[r]=t[r]);if(e&&e.defaultProps)for(r in t=e.defaultProps)void 0===a[r]&&(a[r]=t[r]);return{$$typeof:o,type:e,key:u,ref:l,props:a,_owner:s.current}}t.jsx=u,t.jsxs=u},4403:(e,t,n)=>{var r=n(1664),o=60103,a=60106;t.Fragment=60107,t.StrictMode=60108,t.Profiler=60114;var s=60109,i=60110,c=60112;t.Suspense=60113;var u=60115,l=60116;if("function"==typeof Symbol&&Symbol.for){var d=Symbol.for;o=d("react.element"),a=d("react.portal"),t.Fragment=d("react.fragment"),t.StrictMode=d("react.strict_mode"),t.Profiler=d("react.profiler"),s=d("react.provider"),i=d("react.context"),c=d("react.forward_ref"),t.Suspense=d("react.suspense"),u=d("react.memo"),l=d("react.lazy")}var f="function"==typeof Symbol&&Symbol.iterator;function p(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,n=1;n<arguments.length;n++)t+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var h={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},m={};function y(e,t,n){this.props=e,this.context=t,this.refs=m,this.updater=n||h}function b(){}function v(e,t,n){this.props=e,this.context=t,this.refs=m,this.updater=n||h}y.prototype.isReactComponent={},y.prototype.setState=function(e,t){if("object"!=typeof e&&"function"!=typeof e&&null!=e)throw Error(p(85));this.updater.enqueueSetState(this,e,t,"setState")},y.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")},b.prototype=y.prototype;var g=v.prototype=new b;g.constructor=v,r(g,y.prototype),g.isPureReactComponent=!0;var w={current:null},x=Object.prototype.hasOwnProperty,j={key:!0,ref:!0,__self:!0,__source:!0};function k(e,t,n){var r,a={},s=null,i=null;if(null!=t)for(r in void 0!==t.ref&&(i=t.ref),void 0!==t.key&&(s=""+t.key),t)x.call(t,r)&&!j.hasOwnProperty(r)&&(a[r]=t[r]);var c=arguments.length-2;if(1===c)a.children=n;else if(1<c){for(var u=Array(c),l=0;l<c;l++)u[l]=arguments[l+2];a.children=u}if(e&&e.defaultProps)for(r in c=e.defaultProps)void 0===a[r]&&(a[r]=c[r]);return{$$typeof:o,type:e,key:s,ref:i,props:a,_owner:w.current}}function _(e){return"object"==typeof e&&null!==e&&e.$$typeof===o}var S=/\/+/g;function R(e,t){return"object"==typeof e&&null!==e&&null!=e.key?function(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,(function(e){return t[e]}))}(""+e.key):t.toString(36)}function O(e,t,n,r,s){var i=typeof e;"undefined"!==i&&"boolean"!==i||(e=null);var c=!1;if(null===e)c=!0;else switch(i){case"string":case"number":c=!0;break;case"object":switch(e.$$typeof){case o:case a:c=!0}}if(c)return s=s(c=e),e=""===r?"."+R(c,0):r,Array.isArray(s)?(n="",null!=e&&(n=e.replace(S,"$&/")+"/"),O(s,t,n,"",(function(e){return e}))):null!=s&&(_(s)&&(s=function(e,t){return{$$typeof:o,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}(s,n+(!s.key||c&&c.key===s.key?"":(""+s.key).replace(S,"$&/")+"/")+e)),t.push(s)),1;if(c=0,r=""===r?".":r+":",Array.isArray(e))for(var u=0;u<e.length;u++){var l=r+R(i=e[u],u);c+=O(i,t,n,l,s)}else if(l=function(e){return null===e||"object"!=typeof e?null:"function"==typeof(e=f&&e[f]||e["@@iterator"])?e:null}(e),"function"==typeof l)for(e=l.call(e),u=0;!(i=e.next()).done;)c+=O(i=i.value,t,n,l=r+R(i,u++),s);else if("object"===i)throw t=""+e,Error(p(31,"[object Object]"===t?"object with keys {"+Object.keys(e).join(", ")+"}":t));return c}function E(e,t,n){if(null==e)return e;var r=[],o=0;return O(e,r,"","",(function(e){return t.call(n,e,o++)})),r}function N(e){if(-1===e._status){var t=e._result;t=t(),e._status=0,e._result=t,t.then((function(t){0===e._status&&(t=t.default,e._status=1,e._result=t)}),(function(t){0===e._status&&(e._status=2,e._result=t)}))}if(1===e._status)return e._result;throw e._result}var q={current:null};function C(){var e=q.current;if(null===e)throw Error(p(321));return e}var P={ReactCurrentDispatcher:q,ReactCurrentBatchConfig:{transition:0},ReactCurrentOwner:w,IsSomeRendererActing:{current:!1},assign:r};t.Children={map:E,forEach:function(e,t,n){E(e,(function(){t.apply(this,arguments)}),n)},count:function(e){var t=0;return E(e,(function(){t++})),t},toArray:function(e){return E(e,(function(e){return e}))||[]},only:function(e){if(!_(e))throw Error(p(143));return e}},t.Component=y,t.PureComponent=v,t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=P,t.cloneElement=function(e,t,n){if(null==e)throw Error(p(267,e));var a=r({},e.props),s=e.key,i=e.ref,c=e._owner;if(null!=t){if(void 0!==t.ref&&(i=t.ref,c=w.current),void 0!==t.key&&(s=""+t.key),e.type&&e.type.defaultProps)var u=e.type.defaultProps;for(l in t)x.call(t,l)&&!j.hasOwnProperty(l)&&(a[l]=void 0===t[l]&&void 0!==u?u[l]:t[l])}var l=arguments.length-2;if(1===l)a.children=n;else if(1<l){u=Array(l);for(var d=0;d<l;d++)u[d]=arguments[d+2];a.children=u}return{$$typeof:o,type:e.type,key:s,ref:i,props:a,_owner:c}},t.createContext=function(e,t){return void 0===t&&(t=null),(e={$$typeof:i,_calculateChangedBits:t,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null}).Provider={$$typeof:s,_context:e},e.Consumer=e},t.createElement=k,t.createFactory=function(e){var t=k.bind(null,e);return t.type=e,t},t.createRef=function(){return{current:null}},t.forwardRef=function(e){return{$$typeof:c,render:e}},t.isValidElement=_,t.lazy=function(e){return{$$typeof:l,_payload:{_status:-1,_result:e},_init:N}},t.memo=function(e,t){return{$$typeof:u,type:e,compare:void 0===t?null:t}},t.useCallback=function(e,t){return C().useCallback(e,t)},t.useContext=function(e,t){return C().useContext(e,t)},t.useDebugValue=function(){},t.useEffect=function(e,t){return C().useEffect(e,t)},t.useImperativeHandle=function(e,t,n){return C().useImperativeHandle(e,t,n)},t.useLayoutEffect=function(e,t){return C().useLayoutEffect(e,t)},t.useMemo=function(e,t){return C().useMemo(e,t)},t.useReducer=function(e,t,n){return C().useReducer(e,t,n)},t.useRef=function(e){return C().useRef(e)},t.useState=function(e){return C().useState(e)},t.version="17.0.2"},3696:(e,t,n)=>{e.exports=n(4403)},2540:(e,t,n)=>{e.exports=n(2192)},2774:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>s,default:()=>d,frontMatter:()=>a,metadata:()=>i,toc:()=>u});var r=n(2540),o=n(8453);const a={},s="Front / Back Communication",i={id:"development/communication",title:"Front / Back Communication",description:"Overview",source:"@site/../docs/development/communication.md",sourceDirName:"development",slug:"/development/communication",permalink:"/launcher/docs/development/communication",draft:!1,unlisted:!1,editUrl:"https://github.com/FlashpointProject/launcher/edit/develop/website/../docs/development/communication.md",tags:[],version:"current",lastUpdatedAt:1712305071e3,frontMatter:{},sidebar:"docs",previous:{title:"Git Workflow",permalink:"/launcher/docs/development/gitworkflow"},next:{title:"Database API",permalink:"/launcher/docs/development/database"}},c={},u=[{value:"Overview",id:"overview",level:2},{value:"Adding a new type of request",id:"adding-a-new-type-of-request",level:2},{value:"Practical Example",id:"practical-example",level:2}];function l(e){const t={code:"code",em:"em",h1:"h1",h2:"h2",p:"p",pre:"pre",strong:"strong",...(0,o.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.h1,{id:"front--back-communication",children:"Front / Back Communication"}),"\n",(0,r.jsx)(t.h2,{id:"overview",children:"Overview"}),"\n",(0,r.jsxs)(t.p,{children:["FPL has a Nodejs process running as the 'backend' of the application, and an Electron window running as the 'frontend' of the application. The logic for these is seperated between ",(0,r.jsx)(t.code,{children:"src/back/"})," and ",(0,r.jsx)(t.code,{children:"src/renderer/"})]}),"\n",(0,r.jsx)(t.p,{children:"When the frontend needs something, for example the information for a game associated with an ID, it makes a structured request which the backend will fulfill. All requests are asynchronous. A list of these request types, their arguments and their return values can be found in ``src/shared/back/types.ts`."}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Note:"})," For the frontend, the socket client used to send/receive messages is a global object at ",(0,r.jsx)(t.code,{children:"window.Shared.back"})," so can be requested anywhere."]}),"\n",(0,r.jsx)(t.p,{children:"Frontend basic request example to fetch a game's info:"}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-tsx",children:"const game = await window.Shared.back.request(BackIn.GET_GAME, 'abcd-1234');\n"})}),"\n",(0,r.jsx)(t.p,{children:"Backend basic request example to open an alert dialog on all clients:"}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-ts",children:"state.socketServer.broadcast(BackOut.OPEN_ALERT, 'Hello, I am the backend!');\n"})}),"\n",(0,r.jsx)(t.h2,{id:"adding-a-new-type-of-request",children:"Adding a new type of request"}),"\n",(0,r.jsx)(t.p,{children:"Adding a new type of request is fairly straightforward. For this example let's create an event that returns a random number up to a maximum defined by the user"}),"\n",(0,r.jsxs)(t.p,{children:["All the definitions are in ",(0,r.jsx)(t.code,{children:"src/shared/back/types.ts"})," so let's open that up first."]}),"\n",(0,r.jsxs)(t.p,{children:["Next, since we're sending a request ",(0,r.jsx)(t.em,{children:"in"})," to the backend, we should find ",(0,r.jsx)(t.code,{children:"BackIn"}),". If we were broadcasting from the backend to all clients, we'd use ",(0,r.jsx)(t.code,{children:"BackOut"}),"."]}),"\n",(0,r.jsxs)(t.p,{children:["Then we're going to add a new name for our request type at the bottom, ",(0,r.jsx)(t.code,{children:"RANDOM_NUMBER"})]}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-ts",metastring:'title="src/shared/back/types.ts"',children:"export enum BackIn {\n  ...\n  RANDOM_NUMBER,\n}\n"})}),"\n",(0,r.jsxs)(t.p,{children:["Next, we need to define the shape of request. We'll let the user decide the maximum size of the number returned. We can do this in ",(0,r.jsx)(t.code,{children:"BackInTemplate"})," slightly further down the file."]}),"\n",(0,r.jsxs)(t.p,{children:["We want to be able to give a ",(0,r.jsx)(t.code,{children:"maxSize"})," value to decide how big the generated number can be, then we want to get a ",(0,r.jsx)(t.code,{children:"number"})," returned back to us. We can define this a function type like ",(0,r.jsx)(t.code,{children:"(maxSize: number) => number"})]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Note:"})," Since all communication is asynchronous you do not need to wrap the response type in ",(0,r.jsx)(t.code,{children:"Promise<>"})," even if the function that will be responding to it from the backend later is async, as this will be inferred automatically."]}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-ts",metastring:'title="src/shared/back/types.ts"',children:"export type BackInTemplate = SocketTemplate<BackIn, {\n  ...\n  [BackIn.RANDOM_NUMBER]: (maxSize: number) => number;\n}>\n"})}),"\n",(0,r.jsx)(t.p,{children:"With this done, you should be all set to make the request for a random number up to 10 from the frontend like so."}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-ts",children:"const randomNum = await window.Shared.back.request(BackIn.RANDOM_NUMBER, 10);\n"})}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"However, The backend doesn't know how to respond to this request yet"}),", so it'll return an error. For this we'll have to head to ",(0,r.jsx)(t.code,{children:"src/back/responses.ts"})]}),"\n",(0,r.jsxs)(t.p,{children:["Here we'll register a new funtion to respond to this request inside the ",(0,r.jsx)(t.code,{children:"registerRequestCallbacks"})," function. It will automatically infer the argument types and return type."]}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-ts",metastring:'title="src/back/responses.ts"',children:"export function registerRequestCallbacks(state: BackState, init: () => Promise<void>): void {\n  ...\n\n  state.socketServer.register(BackIn.RANDOM_NUMBER, (event, maxSize) => {\n    // Generate a whole number between 0 and maxSize (inclusive)\n    return Math.floor(\n      Math.random() * (maxSize + 1)\n    );\n  });\n}\n"})}),"\n",(0,r.jsx)(t.p,{children:"Now the backend will register this callback at startup, and it will run and return in response to requests made by the frontend with your newly defined request type."}),"\n",(0,r.jsxs)(t.p,{children:["The function can be considered ",(0,r.jsx)(t.code,{children:"(event, ...args) => ReturnType"})," where ",(0,r.jsx)(t.code,{children:"event"})," is information about the client that sent it, and the rest is inferred from\n",(0,r.jsx)(t.code,{children:"event"})," is always the first argument and contains information about the client that sent it, whilst the rest of the arguments and return type are taken from the ",(0,r.jsx)(t.code,{children:"BackInTemplate"})," entry defined earlier. (In this case, ",(0,r.jsx)(t.code,{children:"(maxSize: number) => number"}),")"]}),"\n",(0,r.jsx)(t.h2,{id:"practical-example",children:"Practical Example"}),"\n",(0,r.jsx)(t.p,{children:"When writing a new page, you may need to request a set of random games to list. You could request these just once when the page appears."}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-tsx",children:"export function RandomGameNames() {\n  // Have the useState hook to keep the games list stateful\n  const [setGames, games] = React.useState<Game[]>([]);\n  // useEffect runs only once when the page mounts since it has no dependencies `[]`\n  React.useEffect(() => {\n    // Using the defined BackIn.RANDOM_GAMES type, request some games from the backend\n    window.Shared.back.request(BackIn.RANDOM_GAMES, {\n      count: 10,\n      excludedLibraries: ['theatre']\n    })\n    .then(games => {\n      // Use the returned Game[] object\n      setGames(games)\n    });\n  }, [])\n\n  return (\n    <div>\n      {games.map((game, idx) => {\n        /** Render all the games in a row. \n          * Remember that you must have a unique `key` prop when rendering lists \n          * We can use the index number here\n          * Sometimes you may want to use something else, like the game ID\n          */\n        return (\n          <div key={idx}>Random Game: {game.title}</div>\n        )\n      })}\n    </div>\n  )\n}\n"})})]})}function d(e={}){const{wrapper:t}={...(0,o.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(l,{...e})}):l(e)}},8453:(e,t,n)=>{n.d(t,{R:()=>s,x:()=>i});var r=n(6540);const o={},a=r.createContext(o);function s(e){const t=r.useContext(a);return r.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function i(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:s(e.components),r.createElement(a.Provider,{value:t},e.children)}}}]);