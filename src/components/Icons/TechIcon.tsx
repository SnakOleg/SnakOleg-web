import { createPortal, useState, useRef, useEffect, useCallback } from "preact/compat";
import type { JSX } from "preact";
import { techNames, type TechName } from "@/constants/techNames";
import styles from "./Icon.module.scss";
import {
    SiReact, SiTypescript, SiNodedotjs, SiMongodb,
    SiVuedotjs, SiMobx, SiPreact, SiJavascript,
    SiNuxtdotjs, SiNextdotjs, SiNestjs, SiExpress,
    SiPostgresql, SiMysql, SiGo, SiRust, SiDocker,
    SiGraphql, SiWebpack, SiJest, SiGit, SiKubernetes,
    SiPython, SiRedux,
} from "react-icons/si";

const iconComponents: Record<TechName, JSX.Element> = {
    react:     <SiReact />, typescript: <SiTypescript />, node:     <SiNodedotjs />,
    mongodb:   <SiMongodb />, vue:        <SiVuedotjs />, mobx:     <SiMobx />,
    preact:    <SiPreact />, javascript: <SiJavascript />, nuxtjs:   <SiNuxtdotjs />,
    nextjs:    <SiNextdotjs />, nestjs:     <SiNestjs />, express:  <SiExpress />,
    postgresql:<SiPostgresql />,mysql:      <SiMysql />, go:        <SiGo />,
    rust:      <SiRust />, docker:     <SiDocker />, graphql:   <SiGraphql />,
    webpack:   <SiWebpack />, jest:       <SiJest />, git:       <SiGit />,
    kubernetes:<SiKubernetes />,python:     <SiPython />, redux:     <SiRedux />,
};

interface TechIconProps {
    name: TechName;
    size?: number;
    className?: string;
    title?: string;
}

export const TechIcon = ({ name, size = 24, className = "", title }: TechIconProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setPosition({
                x: rect.left + rect.width / 2,
                y: rect.bottom + 10,
            });
        }
    }, []);

    useEffect(() => {
        const update = () => { updatePosition(); };
        update();
        window.addEventListener("scroll", update, true);
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("resize", update);
        };
    }, [isOpen, updatePosition]);

    return (
        <div
            ref={containerRef}
            className={`${styles["tech-icon-container"]} ${className}`}
            onMouseEnter={() => { updatePosition(); setIsOpen(true); }}
            onMouseLeave={() => { setIsOpen(false); }}
        >
            <div className={styles["tech-icon"]} style={{ fontSize: size }}>
                {iconComponents[name]}
            </div>
            {isOpen ? createPortal(
                <div
                    ref={tooltipRef}
                    className={`${styles["tech-tooltip"]} ${styles.open}`}
                    style={{
                        left: `${position.x}px`,
                        top:  `${position.y}px`,
                        transform: "translateX(-50%)",
                    }}
                >
                    {title ?? techNames[name]}
                </div>,
                document.body,
            ) : null}
        </div>
    );
};