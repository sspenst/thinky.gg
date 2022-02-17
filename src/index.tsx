import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import App from './App';
import CreatorPage from './CreatorPage';
import Data from './Data';
import Editor from './Editor';
import ForgotPassword from './ForgotPassword';
import LevelPage from './LevelPage';
import Login from './Login';
import PackPage from './PackPage';
import ResetPassword from './ResetPassword';
import SignUp from './SignUp';
import Catalog from './Catalog';

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<App />} />
        <Route path='/catalog' element={<Catalog />} />
        <Route path='/creator' element={<CreatorPage />} />
        <Route path='/data' element={<Data />} />
        <Route path='/editor' element={<Editor />} />
        <Route path='/forgotpassword' element={<ForgotPassword />} />
        <Route path='/level' element={<LevelPage />} />
        <Route path='/login' element={<Login />} />
        <Route path='/pack' element={<PackPage />} />
        <Route path='/resetpassword' element={<ResetPassword />} />
        <Route path='/signup' element={<SignUp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);
