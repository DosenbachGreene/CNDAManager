import './App.css';
import React from 'react';
import { Classes, Colors } from "@blueprintjs/core";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import Subjects from "./pages/Subjects";
import Downloads from './pages/Downloads';

function App() {
  return (
    <div className={Classes.DARK} style={{minHeight: "100vh", backgroundColor: Colors.DARK_GRAY3}}>
      <BrowserRouter basename={process.env.PUBLIC_URL}> 
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/download" element={<Downloads />} />
        </Routes>
      </BrowserRouter>
    </div>
  );

}

export default App;
