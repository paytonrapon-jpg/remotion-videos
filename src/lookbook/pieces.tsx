// Illustrations des pièces, seules et à plat (viewBox 400×400).
// Pour utiliser une vraie photo produit à la place, ajoute "photo": "mannequins/pieces/xxx.png" à la pièce dans le JSON.
import React from "react";

const Shadow: React.FC<{ y?: number; w?: number }> = ({ y = 372, w = 120 }) => (
  <ellipse cx={200} cy={y} rx={w} ry={10} fill="rgba(42,30,26,0.12)" />
);

const Brassiere: React.FC = () => (
  <svg viewBox="0 0 400 400">
    <defs>
      <linearGradient id="bra" x1="0" x2="1">
        <stop offset="0" stopColor="#F2CFCB" />
        <stop offset="0.5" stopColor="#FBE3DF" />
        <stop offset="1" stopColor="#EEC6C2" />
      </linearGradient>
    </defs>
    <Shadow y={318} w={110} />
    <path d="M118 62 L162 62 Q168 150 200 162 Q232 150 238 62 L282 62 Q304 165 302 252 L98 252 Q96 165 118 62Z" fill="url(#bra)" />
    <path d="M162 62 Q168 150 200 162 Q232 150 238 62" fill="none" stroke="#E2B3AE" strokeWidth={5} />
    <path d="M98 252 L302 252 L299 302 Q200 312 101 302Z" fill="#EFC3BE" />
    <path d="M98 252 L302 252" stroke="#DDAAA5" strokeWidth={3} />
    <text x={200} y={290} textAnchor="middle" fontFamily="Montserrat" fontWeight={800} fontSize={22} fill="#fff">ola</text>
  </svg>
);

const Legging: React.FC = () => (
  <svg viewBox="0 0 400 400">
    <defs>
      <linearGradient id="leg" x1="0" x2="1">
        <stop offset="0" stopColor="#EFC9C4" />
        <stop offset="0.45" stopColor="#FBE3DF" />
        <stop offset="1" stopColor="#EBC0BB" />
      </linearGradient>
    </defs>
    <Shadow y={382} w={100} />
    <path d="M122 30 L278 30 L284 82 Q302 220 284 375 L226 375 Q214 255 200 178 Q186 255 174 375 L116 375 Q98 220 116 82Z" fill="url(#leg)" />
    <path d="M118 82 L282 82" stroke="#DDAAA5" strokeWidth={4} />
    <path d="M200 120 L200 178" stroke="#E2B3AE" strokeWidth={3} />
    <text x={252} y={350} textAnchor="middle" fontFamily="Montserrat" fontWeight={800} fontSize={16} fill="#fff">ola</text>
  </svg>
);

const Gourde: React.FC = () => (
  <svg viewBox="0 0 400 400">
    <defs>
      <linearGradient id="gou" x1="0" x2="1">
        <stop offset="0" stopColor="#E9BDB8" />
        <stop offset="0.4" stopColor="#F9DCD7" />
        <stop offset="1" stopColor="#E3B2AD" />
      </linearGradient>
    </defs>
    <Shadow y={378} w={70} />
    <rect x={174} y={28} width={52} height={40} rx={12} fill="none" stroke="#E3B2AD" strokeWidth={12} />
    <rect x={158} y={60} width={84} height={50} rx={10} fill="url(#gou)" />
    <rect x={150} y={106} width={100} height={268} rx={22} fill="url(#gou)" />
    <path d="M150 112 L250 112" stroke="#DBA7A2" strokeWidth={4} />
    <text x={0} y={0} transform="translate(210 250) rotate(-90)" textAnchor="middle" fontFamily="Georgia, serif" fontWeight={700} fontSize={54} fill="#fff">ola</text>
  </svg>
);

const Chemise: React.FC = () => (
  <svg viewBox="0 0 400 400">
    <defs>
      <linearGradient id="sat" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#F3E6D3" />
        <stop offset="0.35" stopColor="#FFF8EC" />
        <stop offset="0.6" stopColor="#EADBC4" />
        <stop offset="1" stopColor="#F7EBDA" />
      </linearGradient>
    </defs>
    <Shadow y={376} w={130} />
    <path d="M140 52 L260 52 L304 92 L346 300 L306 312 L278 172 L276 360 L124 360 L122 172 L94 312 L54 300 L96 92Z" fill="url(#sat)" />
    <path d="M160 52 L200 230 L240 52" fill="#E9DAC3" />
    <path d="M160 52 L136 120 L182 160 Z" fill="#F8EEDF" stroke="#E0CFB5" strokeWidth={2} />
    <path d="M240 52 L264 120 L218 160 Z" fill="#F8EEDF" stroke="#E0CFB5" strokeWidth={2} />
    <path d="M200 230 L200 360" stroke="#E0CFB5" strokeWidth={2} />
    <circle cx={200} cy={270} r={5} fill="#D8C5A8" />
    <circle cx={200} cy={318} r={5} fill="#D8C5A8" />
    <path d="M306 312 L346 300 L340 285 L300 296Z M94 312 L54 300 L60 285 L100 296Z" fill="#EADBC4" />
  </svg>
);

const Jupe: React.FC = () => (
  <svg viewBox="0 0 400 400">
    <defs>
      <pattern id="croco" width="26" height="20" patternUnits="userSpaceOnUse">
        <rect width="26" height="20" fill="#8E4A22" />
        <rect x="2" y="2" width="22" height="16" rx="6" fill="#A85A2B" />
        <rect x="6" y="4" width="10" height="5" rx="3" fill="#C27A45" opacity="0.6" />
      </pattern>
      <linearGradient id="shine" x1="0" x2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0.25" />
        <stop offset="0.4" stopColor="#fff" stopOpacity="0.18" />
        <stop offset="1" stopColor="#000" stopOpacity="0.3" />
      </linearGradient>
    </defs>
    <Shadow y={352} w={120} />
    <path d="M128 70 L272 70 L304 330 Q200 346 96 330Z" fill="url(#croco)" />
    <path d="M128 70 L272 70 L304 330 Q200 346 96 330Z" fill="url(#shine)" />
    <path d="M128 70 L272 70 L275 98 L125 98Z" fill="#7A3E1C" />
    <path d="M232 98 Q250 220 236 336" fill="none" stroke="#6E3818" strokeWidth={4} />
  </svg>
);

const Pochette: React.FC = () => (
  <svg viewBox="0 0 400 400">
    <defs>
      <linearGradient id="kaki" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#8E8456" />
        <stop offset="1" stopColor="#6F6640" />
      </linearGradient>
      <linearGradient id="or" x1="0" x2="1">
        <stop offset="0" stopColor="#B88A3A" />
        <stop offset="0.5" stopColor="#F2D58A" />
        <stop offset="1" stopColor="#B88A3A" />
      </linearGradient>
    </defs>
    <Shadow y={330} w={120} />
    <path d="M120 180 Q200 30 280 180" fill="none" stroke="url(#or)" strokeWidth={9} strokeDasharray="10 6" strokeLinecap="round" />
    <rect x={100} y={172} width={200} height={146} rx={14} fill="url(#kaki)" />
    <path d="M100 186 Q100 172 114 172 L286 172 Q300 172 300 186 L300 250 Q200 270 100 250Z" fill="#857B4E" />
    <circle cx={200} cy={250} r={10} fill="url(#or)" />
    <path d="M200 260 L200 300" stroke="url(#or)" strokeWidth={4} />
    <path d="M190 300 L210 300 L216 352 L184 352Z" fill="url(#or)" />
  </svg>
);

const Sandale: React.FC<{ dx?: number; dy?: number; o?: number }> = ({ dx = 0, dy = 0, o = 1 }) => (
  <g transform={`translate(${dx} ${dy})`} opacity={o}>
    <path d="M78 196 L112 204 L118 352 L108 352Z" fill="url(#talon)" />
    <path d="M80 190 Q150 198 228 268 Q278 296 336 298 L338 310 Q280 314 222 284 Q148 216 80 204Z" fill="#141010" />
    <path d="M80 196 Q70 170 84 132 L108 132 Q100 170 112 202Z" fill="#141010" />
    <ellipse cx={104} cy={128} rx={32} ry={12} fill="none" stroke="#141010" strokeWidth={8} />
    <circle cx={132} cy={130} r={5} fill="url(#talon)" />
    <path d="M282 296 Q300 262 330 294" fill="none" stroke="#141010" strokeWidth={10} strokeLinecap="round" />
  </g>
);

const Sandales: React.FC = () => (
  <svg viewBox="0 0 400 400">
    <defs>
      <linearGradient id="talon" x1="0" x2="1">
        <stop offset="0" stopColor="#B88A3A" />
        <stop offset="0.5" stopColor="#F2D58A" />
        <stop offset="1" stopColor="#B88A3A" />
      </linearGradient>
    </defs>
    <Shadow y={358} w={140} />
    <Sandale dx={-6} dy={0} />
  </svg>
);

export const pieceArt: Record<string, React.FC> = {
  brassiere: Brassiere,
  legging: Legging,
  gourde: Gourde,
  chemise: Chemise,
  jupe: Jupe,
  pochette: Pochette,
  sandales: Sandales,
};
