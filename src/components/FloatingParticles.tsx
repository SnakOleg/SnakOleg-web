import { useEffect, useRef } from "preact/hooks";

export const FlyingDotsBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dots: { x: number; y: number; dx: number; dy: number; size: number }[] = [];
        const count = 100;

        for (let i = 0; i < count; i++) {
            dots.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                dx: (Math.random() - 0.5) * 0.5,
                dy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
            });
        }

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener("resize", resize);
        resize();

        const getThemeColor = () => {
            const isDark = document.documentElement.classList.contains("dark");
            return isDark ? "rgba(122,122,122,0.3)" : "rgba(0,0,0,0.2)";
        };

        let currentColor = getThemeColor();

        const observer = new MutationObserver(() => {
            currentColor = getThemeColor();
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        let animationFrame: number;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const dot of dots) {
                dot.x += dot.dx;
                dot.y += dot.dy;

                if (dot.x < 0 || dot.x > canvas.width) dot.dx *= -1;
                if (dot.y < 0 || dot.y > canvas.height) dot.dy *= -1;

                ctx.beginPath();
                ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
                ctx.fillStyle = currentColor;
                ctx.fill();
            }

            animationFrame = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener("resize", resize);
            observer.disconnect();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                zIndex: -1,
                pointerEvents: "none",
            }}
        />
    );
};
