import './App.css';
import React from 'react';
import { Classes, Colors } from "@blueprintjs/core";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Projects from "./pages/Projects";
import Subjects from "./pages/Subjects";
import Downloads from './pages/Downloads';

function App() {
  return (
    <div className={Classes.DARK} style={{backgroundColor: Colors.DARK_GRAY3}}>
      <BrowserRouter basename='/cnda'> 
        <Routes>
          <Route exact path="/" element={<Projects />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/download" element={<Downloads />} />
        </Routes>
      </BrowserRouter>
    </div>
  );

}

export default App;