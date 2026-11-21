/** Decorative transparent SVG cutouts. No rectangular photo background or external hotlinks.
 * They're deliberately separate from the Hiraeth logo and noninteractive.
 */
export function SummerHibiscusCutout() {
  return <svg viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="summer-hibiscus-petal" cx="0" cy="0" r="1" gradientTransform="translate(159 153) rotate(-78) scale(164 145)" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F8A7AD"/><stop offset=".46" stopColor="#F47F8A"/><stop offset="1" stopColor="#CE465B"/>
      </radialGradient>
      <linearGradient id="summer-hibiscus-leaf" x1="38" y1="192" x2="126" y2="269" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5C9A69"/><stop offset="1" stopColor="#275E50"/>
      </linearGradient>
      <filter id="summer-hibiscus-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="1" dy="8" stdDeviation="7" floodColor="#003B50" floodOpacity=".21"/>
      </filter>
    </defs>
    <g filter="url(#summer-hibiscus-shadow)">
      <path d="M145 210C95 222 69 276 30 271C41 225 77 194 130 190Z" fill="url(#summer-hibiscus-leaf)"/>
      <path d="M156 220C201 227 235 276 281 279C279 231 242 207 183 193Z" fill="url(#summer-hibiscus-leaf)"/>
      <path d="M144 204C108 227 80 240 45 260M166 208C201 226 239 254 266 272" stroke="#BDD6A1" strokeWidth="2.7" strokeLinecap="round"/>
      <g>
        {[0,72,144,216,288].map(angle=><g key={angle} transform={`rotate(${angle} 158 154)`}>
          <path d="M155 148C124 117 100 83 118 47C135 16 184 23 207 45C237 75 207 116 166 157Z"
            fill="url(#summer-hibiscus-petal)" stroke="#CB5869" strokeOpacity=".48" strokeWidth="1.3"/>
          <path d="M162 142C155 117 151 84 158 46M159 135C146 111 129 92 122 68M166 137C179 113 197 88 200 68"
            stroke="#FAD3CB" strokeOpacity=".75" strokeWidth="2.2" strokeLinecap="round"/>
        </g>)}
      </g>
      <circle cx="158" cy="154" r="23" fill="#A92B4A"/>
      <circle cx="158" cy="154" r="16" fill="#C94455"/>
      <path d="M155 159C170 151 182 135 190 115C195 101 198 93 204 81" stroke="#F9D184" strokeWidth="7" strokeLinecap="round"/>
      <path d="M196 93L184 91M199 87L210 93M192 104L181 103M203 83L214 80"
        stroke="#F9D184" strokeWidth="3.5" strokeLinecap="round"/>
      <g fill="#FFE7A0">
        <circle cx="203" cy="80" r="4.3"/><circle cx="214" cy="79" r="3.7"/><circle cx="185" cy="90" r="4"/>
        <circle cx="211" cy="94" r="4"/><circle cx="181" cy="102" r="3.8"/><circle cx="192" cy="103" r="3"/>
      </g>
    </g>
  </svg>;
}

export function SummerParasolCutout() {
  return <svg viewBox="0 0 320 330" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="summer-umbrella-fabric" x1="75" y1="25" x2="241" y2="170" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FBF3D9"/><stop offset="1" stopColor="#E3DDC6"/>
      </linearGradient>
      <linearGradient id="summer-umbrella-teal" x1="62" y1="42" x2="212" y2="184" gradientUnits="userSpaceOnUse">
        <stop stopColor="#80C0C5"/><stop offset="1" stopColor="#267E9A"/>
      </linearGradient>
      <filter id="summer-parasol-shadow" x="-30%" y="-20%" width="160%" height="150%">
        <feDropShadow dx="2" dy="10" stdDeviation="7" floodColor="#003849" floodOpacity=".23"/>
      </filter>
    </defs>
    <g filter="url(#summer-parasol-shadow)" transform="rotate(15 165 165)">
      <path d="M156 142L172 294" stroke="#A5754F" strokeWidth="8" strokeLinecap="round"/>
      <path d="M172 294C174 315 190 309 190 298" stroke="#A5754F" strokeWidth="8" strokeLinecap="round"/>
      <path d="M42 150C56 82 102 39 156 20C218 39 267 92 287 149C273 143 258 142 241 158C226 143 210 143 195 158C179 144 166 146 156 156C143 146 125 143 111 158C94 143 78 142 63 159C56 154 49 151 42 150Z"
        fill="url(#summer-umbrella-fabric)" stroke="#ECE7D8" strokeWidth="3"/>
      <path d="M156 20C120 57 92 106 63 159C78 142 94 142 111 158C118 103 129 57 156 20Z"
        fill="url(#summer-umbrella-teal)"/>
      <path d="M156 20C169 65 184 109 195 158C211 143 226 143 241 158C215 107 186 55 156 20Z"
        fill="url(#summer-umbrella-teal)"/>
      <path d="M156 20L156 156M156 20L111 158M156 20L195 158M156 20L63 159M156 20L241 158"
        stroke="#C3BAA0" strokeOpacity=".68" strokeWidth="2"/>
      <path d="M42 150C56 82 102 39 156 20C218 39 267 92 287 149"
        stroke="#F9F1D7" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="156" cy="21" r="6" fill="#D8B26D"/>
    </g>
  </svg>;
}
