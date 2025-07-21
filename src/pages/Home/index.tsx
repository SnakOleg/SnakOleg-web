import React, { useEffect, useState } from "react";
import styles from "./style.module.scss";
import avatar from "@assets/SnakOleg.png";
import { useLang } from "@/hooks/useLang";
import { useLanguage } from "@/context/LanguageContext";
import { FlyingDotsBackground } from "@/components/FloatingParticles";
import { Icon } from "@/components/Icons/IconProvider";
import FoxoChat from "@assets/projects/FoxoChat.png";
import MatrixBot from "@assets/projects/MatrixBot.png";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Typewriter } from "@/components/TypingText";
import { TechName } from "@/types/types";
import { FaTelegramPlane } from "react-icons/fa";

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
            link: "https://foxochat.app/",
            image: FoxoChat,
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
        <div className={styles.mainContainer}>
            <FlyingDotsBackground />

            <div className={styles.profileSection}>
                <div className={styles.avatarWrapper}>
                    <div className={styles.avatarContainer}>
                        <img
                            className={styles.avatar}
                            src={avatar}
                            alt={translations.alt.avatar}
                        />
                        <div className={styles.avatarGlow} />
                    </div>
                </div>

                <div className={styles.profileContent}>
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

                    <div className={styles.buttonsContainer}>
                        <a
                            href="https://wakatime.com/@snakoleg"
                            className={styles.wakaLink}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Icon name="Clock" className={styles.wakaIcon} />
                            <span>{translations.wakatime}</span>
                        </a>

                        <a
                            href="https://t.me/the_nikeri"
                            className={styles.wakaLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ marginLeft: "1rem" }}
                        >
                            <FaTelegramPlane size={20} />
                            <span>@The_Nikeri</span>
                        </a>
                    </div>
                </div>
            </div>

            <div className={styles.projectsSection}>
                <h2 className={styles.projectsTitle}>
                    {translations.recent_projects}
                </h2>

                <div className={styles.projectsGrid}>
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