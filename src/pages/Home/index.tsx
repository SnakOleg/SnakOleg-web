import React, { useEffect, useState } from "react";
import styles from "./style.module.scss";
import avatar from "@assets/SnakOleg.png";
import { useLang } from "@/hooks/useLang";
import { useLanguage } from "@/context/LanguageContext";
import { FlyingDotsBackground } from "@/components/FloatingParticles";
import { Icon } from "@/components/Icons/IconProvider";
import Foxogram from "@assets/projects/Foxogram.png";
import MatrixBot from "@assets/projects/MatrixBot.png";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Typewriter } from "@/components/TypingText";
import { TechName } from "@/types/types";

export const Home = () => {
    const { lang } = useLanguage();
    const translations = useLang(lang);
    const [mounted, setMounted] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleCardClick = (link: string) => {
        window.open(link, "_blank");
    };

    const handleCopyLink = async (e: React.MouseEvent<HTMLButtonElement>, link: string, index: number) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(link);
        setCopiedIndex(index);
        setTimeout(() => {
            setCopiedIndex(null);
        }, 2000);
    };

    const projects = [
        {
            title: translations.projects.project1.title,
            description: translations.projects.project1.description,
            tech: ["react", "preact", "typescript", "mobx"] as TechName[],
            link: "https://foxogram.su/",
            image: Foxogram,
        },
        {
            title: translations.projects.project2.title,
            description: translations.projects.project2.description,
            tech: ["node", "javascript", "mongodb"] as TechName[],
            link: "#",
            image: MatrixBot,
        },
    ];

    if (!mounted) return null;

    return (
        <div className={styles["main-container"]}>
            <FlyingDotsBackground />

            <div className={styles["profile-section"]}>
                <div className={styles["avatar-wrapper"]}>
                    <div className={styles["avatar-container"]}>
                        <img
                            className={styles.avatar}
                            src={avatar}
                            alt={translations.alt.avatar}
                        />
                        <div className={styles["avatar-glow"]} />
                    </div>
                </div>

                <div className={styles["profile-content"]}>
                    <h1 className={styles.title}>
                        {translations.greeting}
                        <span className={styles.accent}>{translations.name}</span>
                        <span className={styles.typewriter} >
                            <Typewriter
                                text={translations.position}
                                options={{
                                    speed: 120,
                                    deleteSpeed: 40,
                                    loop: true,
                                    nextStringDelay: 1500,
                                }}
                            />
                        </span>
                    </h1>

                    <a
                        href="https://wakatime.com/@snakoleg"
                        className={styles["waka-link"]}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Icon name="Clock" className={styles["waka-icon"]} />
                        <span>{translations.wakatime}</span>
                    </a>
                </div>
            </div>

            <div className={styles["projects-section"]}>
                <h2 className={styles["projects-title"]}>
                    {translations.recent_projects}
                </h2>

                <div className={styles["projects-grid"]}>
                    {projects.map((project, index) => (
                        <ProjectCard
                            key={`project-${index}`}
                            project={project}
                            index={index}
                            copiedIndex={copiedIndex}
                            handleCardClick={handleCardClick}
                            handleCopyLink={(e) => { void handleCopyLink(e, project.link, index); }}
                            translations={translations}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};