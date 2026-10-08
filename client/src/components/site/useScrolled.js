import { useEffect, useState } from 'react';

/** True once the page has been scrolled past `threshold` px (used to give the sticky header a solid backing). */
const useScrolled = (threshold = 8) => {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > threshold);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [threshold]);
    return scrolled;
};

export default useScrolled;
