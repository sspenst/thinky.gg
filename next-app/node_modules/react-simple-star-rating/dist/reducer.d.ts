type State = {
    ratingValue: number | null;
    hoverValue: number | null;
    hoverIndex: number;
    valueIndex: number;
};
type Action = {
    type: 'PointerMove';
    payload: number | null;
    index: number;
} | {
    type: 'PointerLeave';
} | {
    type: 'MouseClick';
    payload: number;
};
export declare function reducer(state: State, action: Action): State;
export {};
