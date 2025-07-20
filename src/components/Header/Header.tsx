import styles from "./Header.module.scss";
import { ThemeToggle } from "../ThemeToggle";
import { useLanguage } from "@/context/LanguageContext";
import russiaFlag from "@assets/icons/russia.svg";
import usaFlag from "@assets/icons/united-states.svg";

export function Header() {
	const { lang, toggleLang } = useLanguage();

	return (
		<header className={styles["header"]}>
			<div className={styles["container"]}>
				<h1 className={styles["title"]}>
					Snak <span className={styles["accent"]}>/ Oleg</span>
				</h1>
				<div className={styles["controls"]}>
					<ThemeToggle />
					<button className={styles["lang"]} onClick={toggleLang}>
						<img
							src={lang === "ru" ? usaFlag : russiaFlag}
							alt="Language"
							className={styles["flag"]}
						/>
					</button>
				</div>
			</div>
		</header>
	);
}
