import { useState } from "preact/compat";
import React from "react";
import styles from "./ProjectCard.module.scss";
import { Icon } from "@/components/Icons/IconProvider";
import { TechIcon } from "@/components/Icons/TechIcon";
import { techNames, type TechName } from "@/constants/techNames";

interface ProjectCardProps {
    project: {
        title: string;
        description: string;
        tech: TechName[];
        link: string;
        image?: string;
    };
    index: number;
    copiedIndex: number | null;
    handleCardClick: (_link: string) => void;
    handleCopyLink: (_e: React.MouseEvent<HTMLButtonElement>, _link: string, _index: number) => void;

    translations: {
        aria: {
            project_link: string;
        };
    };
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
                                                            project,
                                                            index,
                                                            copiedIndex,
                                                            handleCardClick,
                                                            handleCopyLink,
                                                            translations,
                                                        }) => {
    const [localImage] = useState(project.image ?? "/");

    return (
        <div
            className={styles["project-card"]}
            onClick={() => { handleCardClick(project.link); }}
            role="button"
            tabIndex={0}
        >
            <div className={styles["project-image"]}>
                <img
                    src={localImage}
                    alt={project.title}
                    className={styles["project-preview"]}
                    draggable={false}
                    onContextMenu={(e) => { e.preventDefault(); }}
                />
            </div>

            <div className={styles["project-content"]}>
                <div className={styles["project-header"]}>
                    <Icon name="Code" className={styles["project-icon"]} />
                    <h3 className={styles["project-title"]}>{project.title}</h3>
                    <button
                        className={styles["project-link"]}
                        onClick={(e) => { handleCopyLink(e, project.link, index); }}
                        aria-label={translations.aria.project_link}
                    >
                        <Icon name="Link" />
                        {copiedIndex === index && (
                            <span className={styles["tooltip"]}>Copied!</span>
                        )}
                    </button>
                </div>

                <p className={styles["project-description"]}>{project.description}</p>

                <div className={styles["tech-stack"]}>
                    {project.tech.map((tech) => (
                        <TechIcon
                            key={tech}
                            name={tech}
                            className={styles["tech-icon"]}
                            title={techNames[tech]}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};