export const calculateChange = (e, skip, props, container) => {
    e.preventDefault();
    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const x = typeof e.pageX === "number" ? e.pageX : e.touches[0].pageX;
    const y = typeof e.pageY === "number" ? e.pageY : e.touches[0].pageY;
    let left = x - (container.getBoundingClientRect().left + window.pageXOffset);
    let top = y - (container.getBoundingClientRect().top + window.pageYOffset);

    if (left < 0) {
        left = 0;
    } else if (left > containerWidth) {
        left = containerWidth;
    }
    if (top < 0) {
        top = 0;
    } else if (top > containerHeight) {
        top = containerHeight;
    }

    const saturation = (left * 100) / containerWidth;
    const bright = 100 - (top * 100) / containerHeight;

    return {
        h: props.hsl.h,
        s: Number((saturation / 100).toFixed(2)),
        v: Number((bright / 100).toFixed(2)),
        a: props.hsl.a,
        source: "rgb",
        x: left,
        y: top
    };
};
