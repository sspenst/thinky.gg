import { ReactNode, CSSProperties, MouseEvent, PointerEvent } from 'react';
import { StarIconProps } from './StarIcon';
export interface RatingProps extends StarIconProps {
    /** Handles the returned rating value */
    onClick?: (value: number, index: number, event?: MouseEvent<HTMLSpanElement>) => void;
    /** onPointerMove callback function with `hover`, `index` alongside `event` values passed */
    onPointerMove?: (value: number, index: number, event: PointerEvent<HTMLSpanElement>) => void;
    /** onPointerEnter callback function */
    onPointerEnter?: (event: PointerEvent<HTMLSpanElement>) => void;
    /** onPointerLeave callback function */
    onPointerLeave?: (event: PointerEvent<HTMLSpanElement>) => void;
    /** Set initial value */
    initialValue?: number;
    /** Number of the icons */
    iconsCount?: number;
    /** Read only mode */
    readonly?: boolean;
    /** Add a group of icons */
    customIcons?: {
        icon: ReactNode;
    }[];
    /** RTL mode */
    rtl?: boolean;
    /** Enable a fractional rate (half icon) */
    allowFraction?: boolean;
    /** Enable / Disable hover effect on empty icons */
    allowHover?: boolean;
    /** Enable / Disable hover effect on filled icons */
    disableFillHover?: boolean;
    /** Enable / Disable transition effect on mouse hover */
    transition?: boolean;
    /** Applied to the `main` span */
    className?: string;
    /** Inline style applied to the `main` span */
    style?: CSSProperties;
    /** Custom fill icon SVG */
    fillIcon?: ReactNode | null;
    /** Filled icons color */
    fillColor?: string;
    /** Array of string to add color range */
    fillColorArray?: string[];
    /** Inline style applied to `filled-icons` icon span  */
    fillStyle?: CSSProperties;
    /** Filled icons `span` className */
    fillClassName?: string;
    /** Custom empty icon SVG */
    emptyIcon?: ReactNode | null;
    /** Empty icons color */
    emptyColor?: string;
    /** Inline style applied to `empty-icons` span  */
    emptyStyle?: CSSProperties;
    /** ٌُEmpty icons `span` className */
    emptyClassName?: string;
    /** Enable / Disable HTML`title` Tag */
    allowTitleTag?: boolean;
    /** Show a tooltip with live values */
    showTooltip?: boolean;
    /** Initial tooltip text if there is no rating value */
    tooltipDefaultText?: string;
    /** Array of strings that will show inside the tooltip */
    tooltipArray?: string[];
    /** Inline style applied to the `tooltip` span */
    tooltipStyle?: CSSProperties;
    /** Tooltip CSS className */
    tooltipClassName?: string;
    /** Separator word in a title of a rating star `(1 out of 5)` */
    titleSeparator?: string;
}
export declare function Rating({ onClick, onPointerMove, onPointerEnter, onPointerLeave, initialValue, iconsCount, size, readonly, rtl, customIcons, allowFraction, style, className, transition, allowHover, disableFillHover, fillIcon, fillColor, fillColorArray, fillStyle, fillClassName, emptyIcon, emptyColor, emptyStyle, emptyClassName, allowTitleTag, showTooltip, tooltipDefaultText, tooltipArray, tooltipStyle, tooltipClassName, SVGclassName, titleSeparator, SVGstyle, SVGstorkeWidth, SVGstrokeColor }: RatingProps): JSX.Element;
