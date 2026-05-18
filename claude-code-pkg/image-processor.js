// @bun @bytecode @bun-cjs
(function(exports, require, module, __filename, __dirname) {// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.143
var r=Object.create;var{getPrototypeOf:e,defineProperty:f,getOwnPropertyNames:B,getOwnPropertyDescriptor:p}=Object,t=Object.prototype.hasOwnProperty;function M(H){return this[H]}var d=(H,$,L)=>{var I=B($);for(let A of I)if(!t.call(H,A)&&A!=="default")f(H,A,{get:M.bind($,A),enumerable:!0});if(L){for(let A of I)if(!t.call(L,A)&&A!=="default")f(L,A,{get:M.bind($,A),enumerable:!0});return L}},T,C,a=(H,$,L)=>{var I=H!=null&&typeof H==="object";if(I){var A=$?T??=new WeakMap:C??=new WeakMap,u=A.get(H);if(u)return u}L=H!=null?r(e(H)):{};let D=$||!H||!H.__esModule?f(L,"default",{value:H,enumerable:!0}):L;for(let E of B(H))if(!t.call(D,E))f(D,E,{get:M.bind(H,E),enumerable:!0});if(I)A.set(H,D);return D},F=(H)=>{var $=(o??=new WeakMap).get(H),L;if($)return $;if($=f({},"__esModule",{value:!0}),H&&typeof H==="object"||typeof H==="function"){for(var I of B(H))if(!t.call($,I))f($,I,{get:M.bind(H,I),enumerable:!(L=p(H,I))||L.enumerable})}return o.set(H,$),$},o,s=(H,$)=>()=>($||H(($={exports:{}}).exports,$),$.exports);var l=(H)=>H;function P(H,$){this[H]=l.bind(null,$)}var h=(H,$)=>{for(var L in $)f(H,L,{get:$[L],enumerable:!0,configurable:!0,set:P.bind($,L)})};var U=(H,$)=>()=>(H&&($=H(H=0)),$);var i=s((c,n)=>{n.exports=require("/$bunfs/root/image-processor.node")});module.exports=i();})
