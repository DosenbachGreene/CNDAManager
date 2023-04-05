import './App.css';
import React from 'react';
import { BrowserRouter, Route, Routes} from "react-router-dom";
import Projects from "./pages/Projects";
import Subjects from "./pages/Subjects";
import Downloads from './pages/Downloads';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/" element={<Projects />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/download" element={<Downloads />} />
      </Routes>
    </BrowserRouter>
  );

}

export default App;