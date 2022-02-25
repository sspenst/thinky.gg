import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import App from './App';
import AuthComponent from './AuthComponent';
import Catalog from './Catalog';
import CreatorPage from './CreatorPage';
// import Data from './Data';
// import Editor from './Editor';
// import ForgotPassword from './ForgotPassword';
import LevelPage from './LevelPage';
import Login from './Login';
import NoAuthComponent from './NoAuthComponent';
import PackPage from './PackPage';
// import ResetPassword from './ResetPassword';
import SignUp from './SignUp';

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<AuthComponent element={<App/>}/>}/>
        <Route path='/catalog' element={<AuthComponent element={<Catalog/>}/>}/>
        <Route path='/creator' element={<AuthComponent element={<CreatorPage/>}/>}/>
        {/* <Route path='/data' element={<Data/>}/> */}
        {/* <Route path='/editor' element={<Editor/>}/> */}
        {/* <Route path='/forgotpassword' element={<ForgotPassword/>}/> */}
        <Route path='/level' element={<AuthComponent element={<LevelPage/>}/>}/>
        <Route path='/login' element={<NoAuthComponent element={<Login/>}/>}/>
        <Route path='/pack' element={<AuthComponent element={<PackPage/>}/>}/>
        {/* <Route path='/resetpassword' element={<ResetPassword/>}/> */}
        <Route path='/signup' element={<NoAuthComponent element={<SignUp/>}/>}/>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);
