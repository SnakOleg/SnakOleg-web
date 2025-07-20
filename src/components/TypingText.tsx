import { useEffect, useRef } from "preact/compat";
import TypeIt from "typeit";

interface TypewriterProps {
    text: string;
    options?: Partial<{
        speed: number;
        deleteSpeed: number;
        loop: boolean;
        startDelay: number;
        nextStringDelay: number;
        cursor: boolean;
        breakLines: boolean;
    }>;
}

export const Typewriter = ({ text, options = {} }: TypewriterProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const instance = new TypeIt(containerRef.current, {
            strings: [text],
            speed: options.speed ?? 400,
            deleteSpeed: options.deleteSpeed ?? 100,
            startDelay: options.startDelay ?? 500,
            nextStringDelay: options.nextStringDelay ?? 2000,
            loop: false,
            cursor: options.cursor ?? true,
            breakLines: options.breakLines ?? false,
            waitUntilVisible: true,
        }).go();

        return () => {
            instance.destroy();
        };
    }, [text, options]);

    return <div ref={containerRef} />;
};
