import { useId } from "react";
import { Sun, Waves } from "lucide-react";

/** Elementos editoriais do verão. Vetoriais, sem emojis e sem blocos de fundo. */
export function SummerOrnament({
  kind = "sun",
  light = false,
}: { kind?: "sun" | "hibiscus" | "waves"; light?: boolean }) {
  return <span className={`summer-ornament summer-ornament--${kind}${light ? " summer-ornament--light" : ""}`} aria-hidden="true">
    {kind === "sun" ? <Sun size={36} strokeWidth={1.15} /> : kind === "waves" ?
      <Waves size={38} strokeWidth={1.1} /> :
      <svg viewBox="0 0 54 54" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        {[0,72,144,216,288].map(angle=><g key={angle} transform={`rotate(${angle} 27 27)`}>
          <path d="M27 24C18 19 17 8 23 5C29 2 37 8 35 15C34 19 31 21 27 24Z"/>
        </g>)}
        <circle cx="27" cy="27" r="4"/><path d="M27 27c7-6 13-9 19-11m-1-2 1 2-2 1" />
      </svg>}
  </span>;
}

export type SummerSymbolKind = "flores" | "sol" | "caipirinha" | "sombra" | "aguas" | "brisa";

/** Seis ilustrações originais para as bolinhas das inspirações. */
export function SummerSymbol({ kind }: { kind: SummerSymbolKind }) {
  const id = useId().replace(/:/g, "");
  const gradient = `summer-illustration-${id}`;
  const leaf = `summer-leaf-${id}`;
  if (kind === "flores") return <svg viewBox="0 0 128 128" fill="none" aria-hidden="true" className="summer-sensation-art" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id={gradient}><stop stopColor="#FFB8BD"/><stop offset="1" stopColor="#CD426D"/></radialGradient>
    <linearGradient id={leaf}><stop stopColor="#81AF7C"/><stop offset="1" stopColor="#2D7856"/></linearGradient></defs>
    <path d="M62 87C41 86 22 101 12 117c21-2 36-8 49-25M78 86c17-4 33 9 42 27-21-1-37-11-44-24" fill={`url(#${leaf})`}/>
    {[0,72,144,216,288].map(x=><path key={x} d="M64 61C47 50 39 25 53 13c12-11 30-3 31 14 1 16-11 28-20 34Z" transform={`rotate(${x} 64 64)`} fill={`url(#${gradient})`} stroke="#F6B3B5" strokeWidth="1.6"/>)}
    <circle cx="64" cy="64" r="12" fill="#A13C60"/><circle cx="64" cy="64" r="5" fill="#FFDF84"/>
    <path d="M66 64c11-10 22-21 30-34" stroke="#F9E3AB" strokeWidth="3" strokeLinecap="round"/>
    {[0,1,2,3].map((i)=><circle key={i} cx={95+i%2*5} cy={29+i*4} r="2.4" fill="#FFD777"/>)}
  </svg>;

  if (kind === "sol") return <svg viewBox="0 0 128 128" fill="none" aria-hidden="true" className="summer-sensation-art" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id={gradient} x1="18" y1="17" x2="98" y2="123"><stop stopColor="#FFE282"/><stop offset=".52" stopColor="#F5B94F"/><stop offset="1" stopColor="#D8803B"/></linearGradient>
    <linearGradient id={leaf}><stop stopColor="#A2C87B"/><stop offset="1" stopColor="#357659"/></linearGradient></defs>
    <path d="M63 43C40 31 32 11 30 5c20 5 27 19 34 31C67 14 73 5 83 1c2 14-3 24-9 36 14-13 30-17 41-14-7 16-21 22-41 29" fill={`url(#${leaf})`} stroke="#337657" strokeWidth="1.4"/>
    <path d="M64 42c24 0 39 16 39 43 0 24-13 38-39 38S25 109 25 85c0-27 16-43 39-43Z" fill={`url(#${gradient})`} stroke="#D58D4B" strokeWidth="2.4"/>
    {[-25,-5,15,35].map(i=><path key={i} d={`M36 ${49+i}l55 57M91 ${48+i}l-55 57`} stroke="#FFF0B7" strokeOpacity=".62" strokeWidth="2" strokeLinecap="round"/>)}
    <path d="M37 47c14 7 37 9 54 0" stroke="#D68A47" strokeOpacity=".45" strokeWidth="2"/>
  </svg>;

  if (kind === "caipirinha") return <svg viewBox="0 0 128 128" fill="none" aria-hidden="true" className="summer-sensation-art" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#EAF4B5"/><stop offset="1" stopColor="#A5C66D"/></linearGradient>
      <linearGradient id={leaf}><stop stopColor="#9FC16F"/><stop offset="1" stopColor="#39804B"/></linearGradient></defs>
    <circle cx="63" cy="67" r="47" fill="#3D945A" stroke="#3F8052" strokeWidth="2"/>
    <circle cx="63" cy="67" r="39" fill="#EFF4C4" stroke="#E3F0B6" strokeWidth="3"/>
    <circle cx="63" cy="67" r="33" fill={`url(#${gradient})`} stroke="#FFF8C7" strokeWidth="2"/>
    {Array.from({length:8},(_,i)=><path key={i} d="M63 67L63 34" stroke="#FFFBE2" strokeWidth="3.4" transform={`rotate(${i*45} 63 67)`} />)}
    <circle cx="63" cy="67" r="5" fill="#FFFAE3"/>
    <path d="M96 20c14-13 24-5 20 8-8 12-20 10-20-8Z" fill={`url(#${leaf})`}/>
    <path d="M99 21l16 6" stroke="#DCE9B4" strokeWidth="1.5"/>
  </svg>;

  if (kind === "sombra") return <svg viewBox="0 0 128 128" fill="none" aria-hidden="true" className="summer-sensation-art" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id={leaf} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8BBE83"/><stop offset="1" stopColor="#377A5D"/></linearGradient></defs>
    <path d="M36 109C59 95 67 63 71 19" stroke="#3F7856" strokeWidth="4" strokeLinecap="round"/>
    {[
      [46,75,4,-18],[65,52,15,-18],[45,50,4,-28],[72,26,15,-27],[33,92,5,-30],[83,78,25,-18]
    ].map(([x,y,rx,ry],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${i%2===0?-35:33})`}>
      <path d="M0 0C-23-8-28-29-17-41C-7-35 5-18 0 0Z" fill={`url(#${leaf})`} stroke="#2E7258" strokeWidth="1.4"/>
      <path d="M0 0L-16-33" stroke="#D0E6B3" strokeWidth="1.5" opacity=".8"/>
      </g>)}
  </svg>;

  if (kind === "aguas") return <svg viewBox="0 0 128 128" fill="none" aria-hidden="true" className="summer-sensation-art" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#DAE9AD"/><stop offset=".55" stopColor="#B9D98C"/><stop offset="1" stopColor="#85BB8C"/></linearGradient>
    <linearGradient id={leaf}><stop stopColor="#75B883"/><stop offset="1" stopColor="#3A8268"/></linearGradient></defs>
    <path d="M64 30C58 45 58 56 47 64C37 71 30 83 32 96C35 118 54 124 66 123C90 121 105 112 101 91C99 74 85 62 79 53C71 40 72 34 64 30Z" fill={`url(#${gradient})`} stroke="#79A88D" strokeWidth="2.1"/>
    <path d="M65 31C64 17 66 15 78 9" stroke="#7E7650" strokeWidth="4" strokeLinecap="round"/>
    <path d="M73 19C90 5 109 11 114 27C98 35 83 34 73 19Z" fill={`url(#${leaf})`} stroke="#46896B" strokeWidth="1.3"/>
    <path d="M46 79c-4 11-3 20 4 27" stroke="#F4F8D6" strokeWidth="4" strokeLinecap="round" opacity=".75"/>
    <circle cx="87" cy="103" r="3" fill="#F7F8D9" opacity=".8"/>
  </svg>;

  return <svg viewBox="0 0 128 128" fill="none" aria-hidden="true" className="summer-sensation-art" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FAE9D9"/><stop offset=".5" stopColor="#EDD1BE"/><stop offset="1" stopColor="#D4AFA6"/></linearGradient></defs>
    <path d="M64 24C30 26 16 55 22 94C32 111 47 116 64 115C84 115 96 107 105 92C113 57 99 28 64 24Z" fill={`url(#${gradient})`} stroke="#C29296" strokeWidth="2.4"/>
    <path d="M64 28L64 110M64 28L34 105M64 28L94 105M64 28L20 78M64 28L107 78" stroke="#BD8693" strokeWidth="3" strokeLinecap="round"/>
    <path d="M32 60C48 69 79 71 98 60M26 83C44 96 84 96 104 82" stroke="#FDF0E1" strokeWidth="3" strokeLinecap="round"/>
    <path d="M21 95c28 13 57 13 85-2" stroke="#BF9191" strokeWidth="2.2"/>
  </svg>;
}
