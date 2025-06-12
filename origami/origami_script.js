(function(Math){var tinycolor=function(color,opts){color=color?color:"";opts=opts||{};if(color instanceof tinycolor){return color}if(!(this instanceof tinycolor)){return new tinycolor(color,opts)}var rgb=inputToRGB(color);this._originalInput=color;this._r=rgb.r;this._g=rgb.g;this._b=rgb.b;this._a=rgb.a;this._roundA=Math.round(100*this._a)/100;this._format=opts.format||rgb.format;this._gradientType=opts.gradientType;if(this._r<1){this._r=Math.round(this._r)}if(this._g<1){this._g=Math.round(this._g)}if(this._b<1){this._b=Math.round(this._b)}this._ok=rgb.ok};tinycolor.prototype={isDark:function(){return this.getBrightness()<128},isLight:function(){return!this.isDark()},getBrightness:function(){var rgb=this.toRgb();return(rgb.r*299+rgb.g*587+rgb.b*114)/1000},getLuminance:function(){var rgb=this.toRgb();var RsRGB,GsRGB,BsRGB,R,G,B;RsRGB=rgb.r/255;GsRGB=rgb.g/255;BsRGB=rgb.b/255;if(RsRGB<=.03928){R=RsRGB/12.92}else{R=Math.pow((RsRGB+.055)/1.055,2.4)}if(GsRGB<=.03928){G=GsRGB/12.92}else{G=Math.pow((GsRGB+.055)/1.055,2.4)}if(BsRGB<=.03928){B=BsRGB/12.92}else{B=Math.pow((BsRGB+.055)/1.055,2.4)}return.2126*R+.7152*G+.0722*B},getAlpha:function(){return this._a},setAlpha:function(value){this._a=boundAlpha(value);this._roundA=Math.round(100*this._a)/100;return this},toHsv:function(){var hsv=rgbToHsv(this._r,this._g,this._b);return{h:hsv.h*360,s:hsv.s,v:hsv.v,a:this._a}},toHsvString:function(){var hsv=rgbToHsv(this._r,this._g,this._b);var h=Math.round(hsv.h*360),s=Math.round(hsv.s*100),v=Math.round(hsv.v*100);return this._a==1?"hsv("+h+", "+s+"%, "+v+"%)":"hsva("+h+", "+s+"%, "+v+"%, "+this._roundA+")"},toHsl:function(){var hsl=rgbToHsl(this._r,this._g,this._b);return{h:hsl.h*360,s:hsl.s,l:hsl.l,a:this._a}},toHslString:function(){var hsl=rgbToHsl(this._r,this._g,this._b);var h=Math.round(hsl.h*360),s=Math.round(hsl.s*100),l=Math.round(hsl.l*100);return this._a==1?"hsl("+h+", "+s+"%, "+l+"%)":"hsla("+h+", "+s+"%, "+l+"%, "+this._roundA+")"},toHex:function(allow3Char){return rgbToHex(this._r,this._g,this._b,allow3Char)},toHexString:function(allow3Char){return"#"+this.toHex(allow3Char)},toHex8:function(allow8Char){return rgbaToHex(this._r,this._g,this._b,this._a,allow8Char)},toHex8String:function(allow8Char){return"#"+this.toHex8(allow8Char)},toRgb:function(){return{r:Math.round(this._r),g:Math.round(this._g),b:Math.round(this._b),a:this._a}},toRgbString:function(){return this._a==1?"rgb("+Math.round(this._r)+", "+Math.round(this._g)+", "+Math.round(this._b)+")":"rgba("+Math.round(this._r)+", "+Math.round(this._g)+", "+Math.round(this._b)+", "+this._roundA+")"},toPercentageRgb:function(){return{r:Math.round(bound01(this._r,255)*100)+"%",g:Math.round(bound01(this._g,255)*100)+"%",b:Math.round(bound01(this._b,255)*100)+"%",a:this._a}},toPercentageRgbString:function(){return this._a==1?"rgb("+Math.round(bound01(this._r,255)*100)+"%, "+Math.round(bound01(this._g,255)*100)+"%, "+Math.round(bound01(this._b,255)*100)+"%)":"rgba("+Math.round(bound01(this._r,255)*100)+"%, "+Math.round(bound01(this._g,255)*100)+"%, "+Math.round(bound01(this._b,255)*100)+"%, "+this._roundA+")"},toName:function(){if(this._a===0){return"transparent"}if(this._a<1){return false}return hexNames[rgbToHex(this._r,this._g,this._b,true)]||false},toString:function(format){var formatSet=!!format;format=format||this._format;var formattedString=false;var hasAlpha=this._a<1&&this._a>=0;var needsAlphaFormat=!formatSet&&hasAlpha&&(format==="hex"||format==="hex6"||format==="hex3"||format==="hex4"||format==="hex8"||format==="name");if(needsAlphaFormat){if(format==="name"&&this._a===0){return this.toName()}return this.toRgbString()}if(format==="rgb"){formattedString=this.toRgbString()}if(format==="prgb"){formattedString=this.toPercentageRgbString()}if(format==="hex"||format==="hex6"){formattedString=this.toHexString()}if(format==="hex3"){formattedString=this.toHexString(true)}if(format==="hex4"){formattedString=this.toHex8String(true)}if(format==="hex8"){formattedString=this.toHex8String()}if(format==="name"){formattedString=this.toName()}if(format==="hsl"){formattedString=this.toHslString()}if(format==="hsv"){formattedString=this.toHsvString()}if(!formattedString){formattedString=this.toHexString()}return formattedString},clone:function(){return new tinycolor(this.toString())},_applyModification:function(fn,args){var color=fn.apply(null,[this].concat([].slice.call(args)));this._r=color._r;this._g=color._g;this._b=color._b;this.setAlpha(color._a);return this},lighten:function(){return this._applyModification(lighten,arguments)},brighten:function(){return this._applyModification(brighten,arguments)},darken:function(){return this._applyModification(darken,arguments)},desaturate:function(){return this._applyModification(desaturate,arguments)},saturate:function(){return this._applyModification(saturate,arguments)},greyscale:function(){return this._applyModification(greyscale,arguments)},spin:function(){return this._applyModification(spin,arguments)},_applyCombination:function(fn,args){return fn.apply(null,[this].concat([].slice.call(args)))},analogous:function(){return this._applyCombination(analogous,arguments)},complement:function(){return this._applyCombination(complement,arguments)},monochromatic:function(){return this._applyCombination(monochromatic,arguments)},splitcomplement:function(){return this._applyCombination(splitcomplement,arguments)},triad:function(){return this._applyCombination(triad,arguments)},tetrad:function(){return this._applyCombination(tetrad,arguments)}};tinycolor.fromRatio=function(color,opts){if(typeof color=="object"){var newColor={};for(var i in color){if(color.hasOwnProperty(i)){if(i==="a"){newColor[i]=color[i]}else{newColor[i]=convertToPercentage(color[i])}}}color=newColor}return new tinycolor(color,opts)};function inputToRGB(color){var rgb={r:0,g:0,b:0};var a=1;var s=null;var v=null;var l=null;var ok=false;var format=false;if(typeof color=="string"){color=stringInputToObject(color)}if(typeof color=="object"){if(isValidCSSUnit(color.r)&&isValidCSSUnit(color.g)&&isValidCSSUnit(color.b)){rgb=rgbToRgb(color.r,color.g,color.b);ok=true;format=String(color.r).substr(-1)==="%"?"prgb":"rgb"}else if(isValidCSSUnit(color.h)&&isValidCSSUnit(color.s)&&isValidCSSUnit(color.v)){s=convertToPercentage(color.s);v=convertToPercentage(color.v);rgb=hsvToRgb(color.h,s,v);ok=true;format="hsv"}else if(isValidCSSUnit(color.h)&&isValidCSSUnit(color.s)&&isValidCSSUnit(color.l)){s=convertToPercentage(color.s);l=convertToPercentage(color.l);rgb=hslToRgb(color.h,s,l);ok=true;format="hsl"}if(color.hasOwnProperty("a")){a=color.a}}a=boundAlpha(a);return{ok:ok,format:color.format||format,r:Math.min(255,Math.max(0,rgb.r)),g:Math.min(255,Math.max(0,rgb.g)),b:Math.min(255,Math.max(0,rgb.b)),a:a}}function rgbToRgb(r,g,b){return{r:bound01(r,255)*255,g:bound01(g,255)*255,b:bound01(b,255)*255}}function rgbToHsl(r,g,b){r=bound01(r,255);g=bound01(g,255);b=bound01(b,255);var max=Math.max(r,g,b),min=Math.min(r,g,b);var h,s,l=(max+min)/2;if(max==min){h=s=0}else{var d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break}h/=6}return{h:h,s:s,l:l}}function hslToRgb(h,s,l){var r,g,b;h=bound01(h,360);s=bound01(s,100);l=bound01(l,100);function hue2rgb(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p}if(s===0){r=g=b=l}else{var q=l<.5?l*(1+s):l+s-l*s;var p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3)}return{r:r*255,g:g*255,b:b*255}}function rgbToHsv(r,g,b){r=bound01(r,255);g=bound01(g,255);b=bound01(b,255);var max=Math.max(r,g,b),min=Math.min(r,g,b);var h,s,v=max;var d=max-min;s=max===0?0:d/max;if(max==min){h=0}else{switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break}h/=6}return{h:h,s:s,v:v}}function hsvToRgb(h,s,v){h=bound01(h,360)*6;s=bound01(s,100);v=bound01(v,100);var i=Math.floor(h),f=h-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s),mod=i%6,r=[v,q,p,p,t,v][mod],g=[t,v,v,q,p,p][mod],b=[p,p,t,v,v,q][mod];return{r:r*255,g:g*255,b:b*255}}function rgbToHex(r,g,b,allow3Char){var hex=[pad2(Math.round(r).toString(16)),pad2(Math.round(g).toString(16)),pad2(Math.round(b).toString(16))];if(allow3Char&&hex[0].charAt(0)==hex[0].charAt(1)&&hex[1].charAt(0)==hex[1].charAt(1)&&hex[2].charAt(0)==hex[2].charAt(1)){return hex[0].charAt(0)+hex[1].charAt(0)+hex[2].charAt(0)}return hex.join("")}function rgbaToHex(r,g,b,a,allow4Char){var hex=[pad2(Math.round(r).toString(16)),pad2(Math.round(g).toString(16)),pad2(Math.round(b).toString(16)),pad2(convertDecimalToHex(a))];if(allow4Char&&hex[0].charAt(0)==hex[0].charAt(1)&&hex[1].charAt(0)==hex[1].charAt(1)&&hex[2].charAt(0)==hex[2].charAt(1)&&hex[3].charAt(0)==hex[3].charAt(1)){return hex[0].charAt(0)+hex[1].charAt(0)+hex[2].charAt(0)+hex[3].charAt(0)}return hex.join("")}tinycolor.equals=function(color1,color2){if(!color1||!color2)return false;return new tinycolor(color1).toRgbString()==new tinycolor(color2).toRgbString()};tinycolor.random=function(){return tinycolor.fromRatio({r:Math.random(),g:Math.random(),b:Math.random()})};function desaturate(color,amount){amount=amount===0?0:amount||10;var hsl=new tinycolor(color).toHsl();hsl.s-=amount/100;hsl.s=clamp01(hsl.s);return new tinycolor(hsl)}function saturate(color,amount){amount=amount===0?0:amount||10;var hsl=new tinycolor(color).toHsl();hsl.s+=amount/100;hsl.s=clamp01(hsl.s);return new tinycolor(hsl)}function greyscale(color){return new tinycolor(color).desaturate(100)}function lighten(color,amount){amount=amount===0?0:amount||10;var hsl=new tinycolor(color).toHsl();hsl.l+=amount/100;hsl.l=clamp01(hsl.l);return new tinycolor(hsl)}function brighten(color,amount){amount=amount===0?0:amount||10;var rgb=new tinycolor(color).toRgb();rgb.r=Math.max(0,Math.min(255,rgb.r-Math.round(255*-(amount/100))));rgb.g=Math.max(0,Math.min(255,rgb.g-Math.round(255*-(amount/100))));rgb.b=Math.max(0,Math.min(255,rgb.b-Math.round(255*-(amount/100))));return new tinycolor(rgb)}function darken(color,amount){amount=amount===0?0:amount||10;var hsl=new tinycolor(color).toHsl();hsl.l-=amount/100;hsl.l=clamp01(hsl.l);return new tinycolor(hsl)}function spin(color,amount){var hsl=new tinycolor(color).toHsl();var hue=(hsl.h+amount)%360;hsl.h=hue<0?360+hue:hue;return new tinycolor(hsl)}function complement(color){var hsl=new tinycolor(color).toHsl();hsl.h=(hsl.h+180)%360;return new tinycolor(hsl)}function triad(color){var hsl=new tinycolor(color).toHsl();var h=hsl.h;return[new tinycolor(color),new tinycolor({h:(h+120)%360,s:hsl.s,l:hsl.l}),new tinycolor({h:(h+240)%360,s:hsl.s,l:hsl.l})]}function tetrad(color){var hsl=new tinycolor(color).toHsl();var h=hsl.h;return[new tinycolor(color),new tinycolor({h:(h+90)%360,s:hsl.s,l:hsl.l}),new tinycolor({h:(h+180)%360,s:hsl.s,l:hsl.l}),new tinycolor({h:(h+270)%360,s:hsl.s,l:hsl.l})]}function splitcomplement(color){var hsl=new tinycolor(color).toHsl();var h=hsl.h;return[new tinycolor(color),new tinycolor({h:(h+72)%360,s:hsl.s,l:hsl.l}),new tinycolor({h:(h+216)%360,s:hsl.s,l:hsl.l})]}function analogous(color,results,slices){results=results||6;slices=slices||30;var hsl=new tinycolor(color).toHsl();var part=360/slices;var ret=[new tinycolor(color)];for(hsl.h=(hsl.h-(part*results>>1)+720)%360;--results;){hsl.h=(hsl.h+part)%360;ret.push(new tinycolor(hsl))}return ret}function monochromatic(color,results){results=results||6;var hsv=new tinycolor(color).toHsv();var h=hsv.h,s=hsv.s,v=hsv.v;var ret=[];var modification=1/results;while(results--){ret.push(new tinycolor({h:h,s:s,v:v}));v=(v+modification)%1}return ret}tinycolor.mix=function(color1,color2,amount){amount=amount===0?0:amount||50;var rgb1=new tinycolor(color1).toRgb();var rgb2=new tinycolor(color2).toRgb();var p=amount/100;var rgba={r:(rgb2.r-rgb1.r)*p+rgb1.r,g:(rgb2.g-rgb1.g)*p+rgb1.g,b:(rgb2.b-rgb1.b)*p+rgb1.b,a:(rgb2.a-rgb1.a)*p+rgb1.a};return new tinycolor(rgba)};tinycolor.readability=function(color1,color2){var c1=new tinycolor(color1);var c2=new tinycolor(color2);return(Math.max(c1.getLuminance(),c2.getLuminance())+.05)/(Math.min(c1.getLuminance(),c2.getLuminance())+.05)};tinycolor.isReadable=function(color1,color2,wcag2){var readability=tinycolor.readability(color1,color2);var wcag2Parms,out=false;wcag2Parms=validateWCAG2Parms(wcag2);switch(wcag2Parms.level+wcag2Parms.size){case"AAsmall":case"AAAlarge":out=readability>=4.5;break;case"AAlarge":out=readability>=3;break;case"AAAsmall":out=readability>=7;break}return out};tinycolor.mostReadable=function(baseColor,colorList,args){var bestColor=null;var bestScore=0;var readability;var includeFallbackColors,level,size;args=args||{};includeFallbackColors=args.includeFallbackColors;level=args.level;size=args.size;for(var i=0;i<colorList.length;i++){readability=tinycolor.readability(baseColor,colorList[i]);if(readability>bestScore){bestScore=readability;bestColor=new tinycolor(colorList[i])}}if(tinycolor.isReadable(baseColor,bestColor,{"level":level,"size":size})||!includeFallbackColors){return bestColor}else{args.includeFallbackColors=false;return tinycolor.mostReadable(baseColor,["#fff","#000"],args)}};var names=tinycolor.names={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"0ff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000",blanchedalmond:"ffebcd",blue:"00f",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",burntsienna:"ea7e5d",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"0ff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"f0f",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"789",lightslategrey:"789",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"0f0",limegreen:"32cd32",linen:"faf0e6",magenta:"f0f",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"663399",red:"f00",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"fff",whitesmoke:"f5f5f5",yellow:"ff0",yellowgreen:"9acd32"};var hexNames=tinycolor.hexNames=flip(names);function flip(o){var flipped={};for(var i in o){if(o.hasOwnProperty(i)){flipped[o[i]]=i}}return flipped}function boundAlpha(a){a=parseFloat(a);if(isNaN(a)||a<0||a>1){a=1}return a}function bound01(n,max){if(isOnePointZero(n)){n="100%"}var processPercent=isPercentage(n);n=Math.min(max,Math.max(0,parseFloat(n)));if(processPercent){n=parseInt(n*max,10)/100}if(Math.abs(n-max)<1e-6){return 1}return n%max/parseFloat(max)}function clamp01(val){return Math.min(1,Math.max(0,val))}function parseIntFromHex(val){return parseInt(val,16)}function isPercentage(n){return typeof n==="string"&&n.indexOf("%")!=-1}function isOnePointZero(n){return typeof n=="string"&&n.indexOf(".")!=-1&&parseFloat(n)===1}function isCSSAngle(n){return typeof n=="string"&&n.indexOf("deg")!=-1||typeof n=="string"&&n.indexOf("grad")!=-1||typeof n=="string"&&n.indexOf("rad")!=-1||typeof n=="string"&&n.indexOf("turn")!=-1}function isScale(n){return typeof n=="string"&&n.indexOf("scale")!=-1}function isValidCSSUnit(color){return typeof color==="string"||typeof color==="number"}function convertToPercentage(n){if(n<=1){n=n*100+"%"}return n}function convertDecimalToHex(d){return Math.round(parseFloat(d)*255).toString(16)}function convertHexToDecimal(h){return parseIntFromHex(h)/255}var matchers={CSS_UNIT:new RegExp("("+["rgb","rgba","hsl","hsla","hsv","hsva","hex","hex3","hex4","hex6","hex8","name"].join("|")+")\\(([\\s\\S]*?)\\)","i"),CSS_angulo:new RegExp("("+["deg","grad","rad","turn"].join("|")+")","i"),CSS_escala:new RegExp("("+["scale"].join("|")+")","i"),hex3:/^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex6:/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,hex4:/^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex8:/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,rgb:/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/,rgba:/^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d+(?:\.\d+)?)\s*\)$/,percentVSRgb:/^rgb\(\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/,percentVSRgba:/^rgba\(\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*,\s*(\d+(?:\.\d+)?)\s*\)$/,hsl:/^hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/,hsla:/^hsla\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)\s*\)$/,hsv:/^hsv\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/,hsva:/^hsva\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)\s*\)$/};function stringInputToObject(color){color=color.replace(/^\s+/,"").replace(/\s+$/,"").toLowerCase();var named=false;if(names[color]){color=names[color];named=true}else if(color=="transparent"){return{r:0,g:0,b:0,a:0,format:"name"}}var match=matchers.CSS_UNIT.exec(color);if(match){var value=match[2];var type=match[1];var values=value.split(",");var alpha;if(values.length>3){alpha=values[3];values.splice(3,1)}if(type==="rgb"||type==="rgba"){if(values[0].indexOf("%")!==-1){return{r:values[0],g:values[1],b:values[2],a:alpha,format:"prgb"}}return{r:values[0],g:values[1],b:values[2],a:alpha,format:"rgb"}}else if(type==="hsl"||type==="hsla"){return{h:values[0],s:values[1],b:values[2],a:alpha,format:"hsl"}}else if(type==="hsv"||type==="hsva"){return{h:values[0],s:values[1],v:values[2],a:alpha,format:"hsv"}}}var match=matchers.hex8.exec(color);if(match){return{r:parseIntFromHex(match[1]),g:parseIntFromHex(match[2]),b:parseIntFromHex(match[3]),a:convertHexToDecimal(match[4]),format:named?"name":"hex8"}}var match=matchers.hex6.exec(color);if(match){return{r:parseIntFromHex(match[1]),g:parseIntFromHex(match[2]),b:parseIntFromHex(match[3]),a:1,format:named?"name":"hex"}}var match=matchers.hex4.exec(color);if(match){return{r:parseIntFromHex(match[1]+""+match[1]),g:parseIntFromHex(match[2]+""+match[2]),b:parseIntFromHex(match[3]+""+match[3]),a:convertHexToDecimal(match[4]+""+match[4]),format:named?"name":"hex8"}}var match=matchers.hex3.exec(color);if(match){return{r:parseIntFromHex(match[1]+""+match[1]),g:parseIntFromHex(match[2]+""+match[2]),b:parseIntFromHex(match[3]+""+match[3]),a:1,format:named?"name":"hex"}}return false}function validateWCAG2Parms(parms){var parms=parms||{"level":"AA","size":"small"};var level=(parms.level||"AA").toUpperCase();var size=(parms.size||"small").toLowerCase();if(level!=="AA"&&level!=="AAA"){level="AA"}if(size!=="small"&&size!=="large"){size="small"}return{"level":level,"size":size}}function pad2(c){return c.length==1?"0"+c:String(c)}if(typeof module!=="undefined"&&module.exports){module.exports=tinycolor}else if(typeof define==="function"&&define.amd){define(function(){return tinycolor})}else{window.tinycolor=tinycolor}})(Math);

        document.addEventListener('DOMContentLoaded', () => {
            const csvFileInput = document.getElementById('csvFileInput');
            const outputDiv = document.getElementById('output');
            const origamiCanvas = document.getElementById('origamiCanvas');
            const origamiNameEl = document.getElementById('origamiName');
            const origamiStoryEl = document.getElementById('origamiStory');
            const dataInfluenceEl = document.getElementById('dataInfluence');
            const loadingMessage = document.getElementById('loading-message');
            
            const colorMap = {
                "赤": "#E74C3C", "青": "#3498DB", "緑": "#2ECC71", "黄": "#F1C40F", "黒": "#2C3E50", 
                "白": "#ECF0F1", "紫": "#9B59B6", "橙": "#E67E22", "茶": "#A0522D", "灰": "#95A5A6",
            };

            csvFileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    loadingMessage.style.display = 'block';
                    outputDiv.style.display = 'none';

                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            loadingMessage.style.display = 'none';
                            try {
                                const analyzedData = analyzeData(results.data);
                                if (analyzedData) {
                                    drawCreasePattern(origamiCanvas, analyzedData);
                                    outputDiv.style.display = 'block';
                                }
                            } catch (error) {
                                console.error("Error processing data:", error);
                                alert("データの処理中にエラーが発生しました: " + error.message);
                            }
                        },
                        error: (error) => {
                            loadingMessage.style.display = 'none';
                            console.error("Error parsing CSV:", error);
                            alert("CSVファイルの解析中にエラーが発生しました: " + error.message);
                        }
                    });
                }
            });

            function analyzeData(rows) {
                if (rows.length === 0) {
                    alert("CSVファイルに有効なデータが含まれていません。");
                    return null;
                }

                const firstRow = rows[0];
                const sessionColor = firstRow.sessionColor;
                const sessionEmotion = firstRow.sessionEmotion;
                const sessionShape = firstRow.sessionShape; 

                let accelMagnitudes = [];
                let gyroMagnitudes = [];
                let decibels = [];
                let steps = 0;
                let temperatures = [];
                let illuminances = [];
                let orientAlphaValues = [];

                rows.forEach(row => {
                    const accelX = parseFloat(row.accelX);
                    const accelY = parseFloat(row.accelY);
                    const accelZ = parseFloat(row.accelZ);
                    if (![accelX, accelY, accelZ].some(isNaN)) {
                        accelMagnitudes.push(Math.sqrt(accelX**2 + accelY**2 + accelZ**2));
                    }

                    const gyroAlpha = parseFloat(row.gyroAlpha);
                    const gyroBeta = parseFloat(row.gyroBeta);
                    const gyroGamma = parseFloat(row.gyroGamma);
                    if (![gyroAlpha, gyroBeta, gyroGamma].some(isNaN)) {
                        gyroMagnitudes.push(Math.sqrt(gyroAlpha**2 + gyroBeta**2 + gyroGamma**2));
                    }
                    
                    const db = parseFloat(row.decibels);
                    if (!isNaN(db)) decibels.push(db);

                    const s = parseInt(row.steps_in_interval);
                    if (!isNaN(s)) steps += s;

                    const temp = parseFloat(row.temperature_celsius);
                    if (!isNaN(temp)) temperatures.push(temp);
                    
                    const illum = parseFloat(row.illuminance);
                    if (!isNaN(illum) && row.illuminance.trim() !== "") illuminances.push(illum);

                    const orientA = parseFloat(row.orientAlpha);
                    if(!isNaN(orientA)) orientAlphaValues.push(orientA);
                });

                const average = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
                const max = (arr) => arr.length > 0 ? Math.max(...arr) : 0;
                
                // Normalize decibels: input range approx -30 to -10 (from data). Let's map -60 (quiet) to 0 (loudest for sensor)
                // Based on new data: -31 to -6. Let's map -40 (quiet) to -5 (loud) for better spread.
                const normalizeDecibels = (dbVal) => {
                    const quietDb = -40; // Assume quiet
                    const loudDb = -5;   // Assume loud
                    return Math.max(0, Math.min(1, (dbVal - quietDb) / (loudDb - quietDb) ));
                };


                return {
                    sessionColor,
                    sessionEmotion,
                    sessionShape,
                    avgAccel: average(accelMagnitudes),
                    maxAccel: max(accelMagnitudes),
                    avgGyro: average(gyroMagnitudes), // Used for line displacement
                    maxGyro: max(gyroMagnitudes),   // Used for corner angle offset
                    avgDecibels: average(decibels),
                    normalizedAvgDecibels: normalizeDecibels(average(decibels)), // 0 (quiet) to 1 (loud)
                    totalSteps: steps,
                    avgTemp: average(temperatures),
                    avgIlluminance: average(illuminances),
                    hasIlluminance: illuminances.length > 0,
                    avgOrientAlpha: average(orientAlphaValues),
                    rowCount: rows.length,
                    dataPoints: rows.length 
                };
            }

            function createLine(x1, y1, x2, y2, color = "black", strokeWidth = 0.5, dashArray = null) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", x1);
                line.setAttribute("y1", y1);
                line.setAttribute("x2", x2);
                line.setAttribute("y2", y2);
                line.setAttribute("stroke", color);
                line.setAttribute("stroke-width", strokeWidth);
                if (dashArray) {
                    line.setAttribute("stroke-dasharray", dashArray);
                }
                return line;
            }
            
            function mapValue(value, inMin, inMax, outMin, outMax) {
                value = Math.max(inMin, Math.min(inMax, value));
                return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
            }

            function getRandomPointOnEdge(W, H) {
                const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
                let x, y;
                switch (edge) {
                    case 0: x = Math.random() * W; y = 0; break; // Top
                    case 1: x = W; y = Math.random() * H; break; // Right
                    case 2: x = Math.random() * W; y = H; break; // Bottom
                    case 3: x = 0; y = Math.random() * H; break; // Left
                }
                return { x, y };
            }


            function drawCreasePattern(svgElement, params) {
                svgElement.innerHTML = ''; 
                
                const W = 100;
                const H = 100;
                const CX = W / 2;
                const CY = H / 2;

                const baseColorObj = tinycolor(colorMap[params.sessionColor] || params.sessionColor.toLowerCase() || "black");
                const mainLineColor = baseColorObj.desaturate(20).darken(5).toString();
                const secondaryLineColor = baseColorObj.desaturate(10).lighten(15).toString();
                
                // --- 線種と太さ (音量に基づく) ---
                // normalizedAvgDecibels: 0 (静か) to 1 (騒がしい)
                let lineStyle = {
                    strokeWidth: 0.3, // default for quiet
                    dashArray: "1,1"  // default dashed for quiet
                };
                const decibelThreshold = 0.4; // この値以上で実線かつ太く
                if (params.normalizedAvgDecibels > decibelThreshold) {
                    lineStyle.strokeWidth = mapValue(params.normalizedAvgDecibels, decibelThreshold, 1, 0.3, 0.8); // 0.3 to 0.8
                    lineStyle.dashArray = null; // 実線
                } else {
                    // 点線の密度を少し変える (値が小さいほど細かい点線)
                    const dashValue = mapValue(params.normalizedAvgDecibels, 0, decibelThreshold, 0.8, 1.5);
                    lineStyle.dashArray = `${dashValue.toFixed(1)},${dashValue.toFixed(1)}`;
                    lineStyle.strokeWidth = 0.25; // 点線は少し細め
                }
                const baseStrokeWidth = lineStyle.strokeWidth;
                const baseDashArray = lineStyle.dashArray;


                // --- 背景色 (気温や照度で変化) ---
                let bgColor = baseColorObj.clone().lighten(45).desaturate(30).toString(); // 基本はセッションカラーの淡い色
                if (params.avgTemp > 25 && params.avgTemp !== 0) { // 暖かい
                    bgColor = tinycolor(bgColor).spin(params.sessionColor === "青" || params.sessionColor === "緑" ? 30 : -15).lighten(5).toString(); 
                } else if (params.avgTemp < 15 && params.avgTemp !== 0) { // 寒い
                    bgColor = tinycolor(bgColor).spin(params.sessionColor === "赤" || params.sessionColor === "黄" ? -30 : 15).darken(5).toString();
                }
                if (params.hasIlluminance && params.avgIlluminance !== 0) {
                     bgColor = tinycolor(bgColor).darken(mapValue(params.avgIlluminance, 0, 1000, 10, -8)).toString(); 
                }
                svgElement.style.backgroundColor = bgColor;


                // --- ジャイロに基づくずれの計算 ---
                // avgGyro: 0 - 1000+ (typical) -> maxDisplacement: 0 - 5 (viewBox units)
                const maxDisplacement = mapValue(params.avgGyro, 0, 800, 0, 4); 
                const getDisplacedCoord = (coord, maxDisp) => coord + (Math.random() - 0.5) * 2 * maxDisp;


                // --- 外枠 (常に実線で少し太め) ---
                const outerStrokeWidth = Math.max(0.4, baseStrokeWidth * 1.2);
                svgElement.appendChild(createLine(0, 0, W, 0, mainLineColor, outerStrokeWidth, null));
                svgElement.appendChild(createLine(W, 0, W, H, mainLineColor, outerStrokeWidth, null));
                svgElement.appendChild(createLine(W, H, 0, H, mainLineColor, outerStrokeWidth, null));
                svgElement.appendChild(createLine(0, H, 0, 0, mainLineColor, outerStrokeWidth, null));

                // --- 基本的な対称線 (十字と対角線) ---
                svgElement.appendChild(createLine(0, CY, W, CY, mainLineColor, baseStrokeWidth, baseDashArray)); 
                svgElement.appendChild(createLine(CX, 0, CX, H, mainLineColor, baseStrokeWidth, baseDashArray)); 
                svgElement.appendChild(createLine(0, 0, W, H, mainLineColor, baseStrokeWidth, baseDashArray));   
                svgElement.appendChild(createLine(W, 0, 0, H, mainLineColor, baseStrokeWidth, baseDashArray));   

                // --- データに基づく線の生成 ---
                
                // 1. 加速度に基づく放射線 (中心から四隅へ)
                let numRadialLinesPerCorner = Math.floor(mapValue(params.avgAccel, 0, 30, 1, 4)); 
                numRadialLinesPerCorner = Math.max(1, Math.min(numRadialLinesPerCorner, 4));

                const corners = [[0,0], [W,0], [W,H], [0,H]];
                corners.forEach(corner => {
                    for (let i = 1; i <= numRadialLinesPerCorner; i++) {
                        const ratio = i / (numRadialLinesPerCorner + 1);
                        let targetX, targetY;
                        if (corner[0] === 0 && corner[1] === 0) { 
                            targetX = CX * ratio; targetY = CY * ratio;
                        } else if (corner[0] === W && corner[1] === 0) { 
                            targetX = CX + (W - CX) * ratio; targetY = CY * ratio;
                        } else if (corner[0] === W && corner[1] === H) { 
                            targetX = CX + (W - CX) * ratio; targetY = CY + (H - CY) * ratio;
                        } else { 
                            targetX = CX * ratio; targetY = CY + (H - CY) * ratio;
                        }
                        svgElement.appendChild(createLine(
                            getDisplacedCoord(corner[0], maxDisplacement / 2), // 少しだけずらす
                            getDisplacedCoord(corner[1], maxDisplacement / 2),
                            getDisplacedCoord(targetX, maxDisplacement / 2), 
                            getDisplacedCoord(targetY, maxDisplacement / 2), 
                            secondaryLineColor, baseStrokeWidth * 0.8, baseDashArray
                        ));
                    }
                });

                // 2. ジャイロスコープに基づく角度のついた線 (四隅の近く)
                let angleOffset = mapValue(params.maxGyro, 0, 1500, 0, Math.PI / 7); // 0 to ~25 degrees
                const lineLength = mapValue(params.avgGyro, 0, 800, W/12, W/5); 

                corners.forEach((corner, index) => {
                    const startAngle = (Math.PI / 4) + (index * Math.PI / 2); 
                    const angle1 = startAngle - angleOffset;
                    const angle2 = startAngle + angleOffset;
                    
                    svgElement.appendChild(createLine(
                        corner[0], corner[1], 
                        getDisplacedCoord(corner[0] + lineLength * Math.cos(angle1), maxDisplacement), 
                        getDisplacedCoord(corner[1] + lineLength * Math.sin(angle1), maxDisplacement), 
                        secondaryLineColor, baseStrokeWidth * 0.7, baseDashArray));

                    svgElement.appendChild(createLine(
                        corner[0], corner[1],
                        getDisplacedCoord(corner[0] + lineLength * Math.cos(angle2), maxDisplacement), 
                        getDisplacedCoord(corner[1] + lineLength * Math.sin(angle2), maxDisplacement),
                        secondaryLineColor, baseStrokeWidth * 0.7, baseDashArray));
                });

                // 3. 歩数に基づく内部のグリッド線または分割線
                let numInnerLines = Math.floor(mapValue(params.totalSteps, 0, 60, 0, 2)); 
                numInnerLines = Math.max(0, Math.min(numInnerLines, 2));

                for (let i = 1; i <= numInnerLines; i++) {
                    const posRatio = i / (numInnerLines + 1);
                    // Horizontal
                    svgElement.appendChild(createLine(
                        getDisplacedCoord(0, maxDisplacement), getDisplacedCoord(H * posRatio, maxDisplacement), 
                        getDisplacedCoord(W, maxDisplacement), getDisplacedCoord(H * posRatio, maxDisplacement), 
                        mainLineColor, baseStrokeWidth * 0.6, baseDashArray
                    )); 
                    // Vertical
                    svgElement.appendChild(createLine(
                        getDisplacedCoord(W * posRatio, maxDisplacement), getDisplacedCoord(0, maxDisplacement), 
                        getDisplacedCoord(W * posRatio, maxDisplacement), getDisplacedCoord(H, maxDisplacement), 
                        mainLineColor, baseStrokeWidth * 0.6, baseDashArray
                    )); 
                }

                // 4. 感情 (sessionEmotion) に基づく特徴的な線の追加
                if (params.sessionEmotion === "驚き") {
                    const numEmotionLines = Math.max(1, Math.floor(mapValue(params.maxAccel, 0, 40, 1, 3))); // 加速度でも本数を少し変える
                    const emotionLineColor = baseColorObj.clone().saturate(20).brighten(10).toString();
                    const emotionStrokeWidth = Math.max(0.4, baseStrokeWidth * 1.3); // 少し太め、実線

                    for (let i = 0; i < numEmotionLines; i++) {
                        const startPoint = getRandomPointOnEdge(W, H);
                        const endPoint = getRandomPointOnEdge(W, H);
                        // 同じ辺や近すぎる点は避ける（簡易的なチェック）
                        if (Math.abs(startPoint.x - endPoint.x) > W/4 || Math.abs(startPoint.y - endPoint.y) > H/4) {
                             svgElement.appendChild(createLine(
                                getDisplacedCoord(startPoint.x, maxDisplacement / 1.5), 
                                getDisplacedCoord(startPoint.y, maxDisplacement / 1.5), 
                                getDisplacedCoord(endPoint.x, maxDisplacement / 1.5), 
                                getDisplacedCoord(endPoint.y, maxDisplacement / 1.5), 
                                emotionLineColor, emotionStrokeWidth, null // 実線
                            ));
                        }
                    }
                }
                // 他の感情の処理もここに追加できます
                // 例: "喜び" なら曲線的な線を少し追加、"悲しみ"なら垂線や波線を少なくなど

                // --- 説明文の更新 ---
                origamiNameEl.textContent = `センサー展開図: ${params.sessionEmotion}の${params.sessionColor}より`;
                origamiStoryEl.innerHTML = `この展開図風デザインは、あなたのセンサーデータが織りなすパターンです。<br>
                    記録された活動や環境が、線のスタイル、数、配置、ずれ具合に影響を与えています。感情<strong>「${params.sessionEmotion}」</strong>と色<strong>「${params.sessionColor}」</strong>がテーマのアクセントになっています。`;
                
                let influenceText = "";
                influenceText += `<div class="parameter-influence"><strong>基本線の色:</strong> セッションカラー「${params.sessionColor}」から派生。</div>`;
                const lineDesc = baseDashArray ? `点線 (パターン: ${baseDashArray})` : "実線";
                influenceText += `<div class="parameter-influence"><strong>線のスタイル (太さ ${baseStrokeWidth.toFixed(2)}, 種類 ${lineDesc}):</strong> 平均音量 (正規化値 ${params.normalizedAvgDecibels.toFixed(2)}) に応じて変化。静かなら点線、騒がしいほど太い実線に。</div>`;
                influenceText += `<div class="parameter-influence"><strong>線のずれ具合 (最大 ${maxDisplacement.toFixed(1)}):</strong> 平均ジャイロ (${params.avgGyro.toFixed(2)}) が大きいほど、線が本来の位置からランダムにずれます。</div>`;
                influenceText += `<div class="parameter-influence"><strong>四隅からの放射線 (各 ${numRadialLinesPerCorner}本):</strong> 平均加速度 (${params.avgAccel.toFixed(2)} m/s²) に応じて数が増加。</div>`;
                influenceText += `<div class="parameter-influence"><strong>四隅の角度線 (オフセット ${angleOffset.toFixed(2)}rad, 長さ ${lineLength.toFixed(1)}):</strong> ジャイロセンサーの最大値 (${params.maxGyro.toFixed(2)}) と平均値 (${params.avgGyro.toFixed(2)}) が影響。</div>`;
                if (params.totalSteps > 0) {
                    influenceText += `<div class="parameter-influence"><strong>内部の分割線 (${numInnerLines}本/軸):</strong> 総歩数 (${params.totalSteps}歩) に応じて増加。</div>`;
                }
                if (params.sessionEmotion === "驚き") {
                    influenceText += `<div class="parameter-influence"><strong>感情「驚き」:</strong> 紙の端から端へ伸びる、強調されたアクセント線を追加。</div>`;
                }
                if (params.avgTemp !== 0) {
                  influenceText += `<div class="parameter-influence"><strong>背景色:</strong> 平均気温 (${params.avgTemp.toFixed(2)} °C) とセッションカラーに応じて変化。</div>`;
                }
                if (params.hasIlluminance && params.avgIlluminance !==0 ) {
                  influenceText += `<div class="parameter-influence"><strong>背景の明度:</strong> 平均照度 (${params.avgIlluminance.toFixed(0)} lx) に応じて変化。</div>`;
                }
                dataInfluenceEl.innerHTML = influenceText;
            }
        });