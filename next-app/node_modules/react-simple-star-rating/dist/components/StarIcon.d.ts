import React from 'react';
export interface StarIconProps {
    /** Icon width / height in `px` */
    size?: number;
    SVGstrokeColor?: string;
    SVGstorkeWidth?: string | number;
    SVGclassName?: string;
    SVGstyle?: React.CSSProperties;
}
export declare function StarIcon({ size, SVGstrokeColor, SVGstorkeWidth, SVGclassName, SVGstyle }: StarIconProps): JSX.Element;
