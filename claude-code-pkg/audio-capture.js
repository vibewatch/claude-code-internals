// @bun @bytecode @bun-cjs
(function(exports, require, module, __filename, __dirname) {// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.143
var s=Object.create;var{getPrototypeOf:o,defineProperty:t,getOwnPropertyNames:u,getOwnPropertyDescriptor:B}=Object,D=Object.prototype.hasOwnProperty;function f(H){return this[H]}var i=(H,L,A)=>{var $=u(L);for(let I of $)if(!D.call(H,I)&&I!=="default")t(H,I,{get:f.bind(L,I),enumerable:!0});if(A){for(let I of $)if(!D.call(A,I)&&I!=="default")t(A,I,{get:f.bind(L,I),enumerable:!0});return A}},n,p,l=(H,L,A)=>{var $=H!=null&&typeof H==="object";if($){var I=L?n??=new WeakMap:p??=new WeakMap,e=I.get(H);if(e)return e}A=H!=null?s(o(H)):{};let E=L||!H||!H.__esModule?t(A,"default",{value:H,enumerable:!0}):A;for(let M of u(H))if(!D.call(E,M))t(E,M,{get:f.bind(H,M),enumerable:!0});if($)I.set(H,E);return E},c=(H)=>{var L=(r??=new WeakMap).get(H),A;if(L)return L;if(L=t({},"__esModule",{value:!0}),H&&typeof H==="object"||typeof H==="function"){for(var $ of u(H))if(!D.call(L,$))t(L,$,{get:f.bind(H,$),enumerable:!(A=B(H,$))||A.enumerable})}return r.set(H,L),L},r,_=(H,L)=>()=>(L||H((L={exports:{}}).exports,L),L.exports);var a=(H)=>H;function C(H,L){this[H]=a.bind(null,L)}var P=(H,L)=>{for(var A in L)t(H,A,{get:L[A],enumerable:!0,configurable:!0,set:C.bind(L,A)})};var F=(H,L)=>()=>(H&&(L=H(H=0)),L);var d=_((G,U)=>{U.exports=require("/$bunfs/root/audio-capture.node")});module.exports=d();})
