import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom";
import Inspector from './components/Inspector'


function App() {
  return (
    <div id='App'>
      <Router>
        <Routes>
          <Route path="/" element={<Inspector/>} />
          <Route path="/problems" element={<Inspector/>} />
          <Route path="/problems/:problemId" element={<Inspector/>} />
        </Routes>
      </Router>
    </div>
  )
}

export default App
