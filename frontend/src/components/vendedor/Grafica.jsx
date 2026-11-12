import Icon from "../ui/Icon";

const paths = {
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
  outside: <><path d="M6 18 18 6M7 6h11v11" /></>,
  leaf: <><path d="M20 3c1 12-3 17-10 16C3 18 3 9 9 6c3-2 7-1 11-3Z" /><path d="M4 22 15 10" /></>,
  shop: <><path d="m4 4-2 6c0 3 4 4 5 1 1 3 5 3 6 0 1 3 5 3 6 0 1 2 3 1 3-1l-2-6H4ZM4 13v7h16v-7M8 20v-5h5v5" /></>,
  wallet: <><path d="M19 8V5a1 1 0 0 0-1-1L5 6a2 2 0 0 0-1 2v11a1 1 0 0 0 1 1h15V8H6" /><path d="M21 12h-4a2 2 0 0 0 0 4h4v-4Z" /></>,
  receipt: <><path d="M5 3l2 1.5L9.5 3 12 4.5 14.5 3 17 4.5 19 3v18l-2-1.5-2.5 1.5-2.5-1.5-2.5 1.5L7 19.5 5 21V3Z" /><path d="M8.5 9h7m-7 4h5" /></>,
  medal: <><circle cx="12" cy="9" r="6" /><path d="m7.8 13.5-2 7 3-1 2 2 1-6m4.4-2 2 7-3-1-2 2-1-6" /></>,
};
export function Glyph({ name, size = 18, ...rest }) {
  return paths[name] ? <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true" {...rest}>{paths[name]}</svg> : <Icon name={name} size={size} {...rest} />;
}

// Viñeta vectorial: los surcos siguen la pendiente de cada parcela.
export function Paisaje() {
  const base = "M-15 180Q90 127 210 137T453 109V220H-15Z";
  return <svg className="campo" viewBox="0 0 445 198" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
    <defs>
      <clipPath id="campo-frente"><path d={base} /></clipPath>
      <clipPath id="campo-loma"><path d="M-12 155Q71 96 164 111T330 114Q402 96 455 99V185H-12Z" /></clipPath>
      <pattern id="grano-cielo" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".65" fill="#73835a" opacity=".38"/></pattern>
    </defs>
    <rect width="445" height="198" fill="url(#grano-cielo)" opacity=".47"/>
    <circle cx="303" cy="54" r="30" fill="#edb951"/>
    <g fill="none" stroke="#b59851" strokeWidth="1" opacity=".6">{Array.from({length:13},(_,i)=><path key={i} d="M303 14v-5" transform={'rotate('+i*27.69+' 303 54)'}/>)}</g>
    <g fill="none" stroke="#8f9f78" strokeWidth="1.5" strokeLinecap="round">
      <path d="M51 92q36-9 69-3t73-7q22-6 47-2m-23-9q37 5 67-10m45 9q40-13 83-9m-310-27h30m-16-4h32m202 8h27m-19-4h37"/>
      <path d="M159 53q4-3 8 2 3-5 7-4m15-9q3-2 6 2 2-4 5-3"/>
    </g>
    <path d="M-6 137Q67 92 139 102t149-15q81-24 163-8v79H-6Z" fill="#c0cd91"/>
    <g fill="none" stroke="#839861" strokeWidth="1.4">
      <path d="M-6 134q78-49 162-29t149-14q67-20 149-10M17 130q75-37 139-22t150-12q73-22 148-11M53 128q57-22 101-14t152-11q79-23 148-14"/>
    </g>
    <path d="M-12 155Q71 96 164 111T330 114Q402 96 455 99V185H-12Z" fill="#91aa72"/>
    <g clipPath="url(#campo-loma)" fill="none" stroke="#688554" strokeWidth="1.4">
      {Array.from({length:33},(_,i)=><path key={i} d={'M'+(i*15-35)+' 86q-8 40-81 91'}/>)}
    </g>
    <g fill="#3f6447" stroke="#3f6447" strokeLinejoin="round">
      <path d="m106 103 19-16 22 14-2 2-20-12-16 14ZM132 89l23-1 18 12-27 1Z" />
      <path d="m112 103 13-11 18 11v13h-31Z" fill="#efe7bc"/><path d="m143 103 26-2v12l-26 3Z" fill="#aaba81"/>
      <path d="M121 116v-10h8v9m21-10h5v4h-5Z"/>
      {[198,209,221,363,376,389].map((x,i)=><g key={x} transform={'translate('+x+' '+(i<3?104-i*2:88-(i-3)*2)+')'}><path d="M0 1v-8" strokeWidth="1.8"/><path d="M0-22c-3 6-5 9-4 13s7 5 8 0c0-4-2-9-4-13Z" fill={i%2?'#779265':'#597a50'}/></g>)}
    </g>
    <path d={base} fill="#507653"/>
    <g clipPath="url(#campo-frente)" fill="none" stroke="#bed094" strokeWidth="2">
      {Array.from({length:28},(_,i)=><path key={i} d={'M'+(83+i*11)+' 109Q'+(99+i*13)+' 143 '+(i*26-227)+' 209'}/>)}
    </g>
    <path d="M250 199q71-79 209-65v75Z" fill="#345d45"/>
    <g fill="none" stroke="#90ae79" strokeWidth="1.7">{Array.from({length:9},(_,i)=><path key={i} d={'M'+(255+i*20)+' 201Q'+(336+i*12)+' '+(127+i*3)+' 452 '+(136+i*6)}/>)}</g>
  </svg>;
}
