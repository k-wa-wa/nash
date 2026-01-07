import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { TerminalPage } from "./pages/TerminalPage";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/terminal" element={<TerminalPage />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
