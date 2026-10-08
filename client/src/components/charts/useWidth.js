import { useEffect, useRef, useState } from 'react';

/** Tracks an element's rendered width so a chart can lay itself out in real pixels (crisp text at any size). */
const useWidth = (initial = 560) => {
    const ref = useRef(null);
    const [width, setWidth] = useState(initial);
    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;
        const update = () => setWidth(Math.max(200, Math.floor(node.getBoundingClientRect().width)));
        update();
        const observer = new ResizeObserver(update);
        observer.observe(node);
        return () => observer.disconnect();
    }, []);
    return [ref, width];
};

export default useWidth;
