import { render } from "preact";
import { LocationProvider, Router, Route } from "preact-iso";
import { LanguageProvider } from "./context/LanguageContext";
import { Header } from "./components/Header/Header";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/_404";
import "./style.scss";

function App() {
	return (
		<LanguageProvider>
			<LocationProvider>
				<Header />
				<main>
					<Router>
						<Route path="/" component={Home} />
						<Route default component={NotFound} />
					</Router>
				</main>
			</LocationProvider>
		</LanguageProvider>
	);
}

render(<App />, document.getElementById("app")!);
