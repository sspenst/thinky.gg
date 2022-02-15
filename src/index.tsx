import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import App from './App';
import CreatorPage from './CreatorPage';
import Data from './Data';
import Editor from './Editor';
import LevelPage from './LevelPage';
import PackPage from './PackPage';

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<App />} />
        <Route path='/creator' element={<CreatorPage />} />
        <Route path='/data' element={<Data />} />
        <Route path='/editor' element={<Editor />} />
        <Route path='/level' element={<LevelPage />} />
        <Route path='/pack' element={<PackPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);
