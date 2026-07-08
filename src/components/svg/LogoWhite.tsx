import type { SVGProps } from 'react';

const SvgLogoWhite = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 64 64" {...props}>
    <circle cx={21} cy={26} r={6.4} fill="none" stroke="#fff" strokeWidth={3.6} />
    <path fill="#fff" d="M21 36c-7.1 0-12.8 5.7-12.8 12.8V52h25.6v-3.2C33.8 41.7 28.1 36 21 36Z" />
    <path
      d="m29 42 8.5-9.5 8 5L54 26M47 25.5 54 23v7.5M37 52h17"
      fill="none"
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={4.4}
    />
  </svg>
);
export default SvgLogoWhite;
