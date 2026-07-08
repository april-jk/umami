import type { SVGProps } from 'react';

const SvgLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    viewBox="0 0 40 40"
    {...props}
  >
    <rect width={40} height={40} rx={8} fill="currentColor" />
    <path
      d="M10.5 29.5 18.9 10h2.2l8.4 19.5h-5.1l-1.5-3.9h-7.8l-1.5 3.9h-5.1Zm6.2-8.1h4.6L19 15.3l-2.3 6.1Z"
      fill="Canvas"
    />
    <path d="M14.2 31h11.6" stroke="Canvas" strokeLinecap="round" strokeWidth={2.4} />
  </svg>
);
export default SvgLogo;
